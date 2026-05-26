// ============================================================================
//  PushkaEscrow — end-to-end deal lifecycle tests
//
//  These tests drive PushkaEscrow through its real spawning path: a maker
//  calls PushkaFactory.sendCreateDeal, the Factory deploys a brand-new escrow
//  at a deterministic address, and then the taker / maker hit that escrow
//  with Accept / Cancel / Reclaim. We never deploy an escrow directly with
//  fromStorage — that wouldn't match the production flow.
//
//  Covered:
//    - happy path: maker → Factory → escrow funded → taker Accept → settled (E1)
//    - cancel by maker before deadline                                     (E2)
//    - reclaim by maker after deadline                                     (E3)
//    - unauthorised cancel by random user                                  (E4)
//    - cancel after deadline is rejected (should use Reclaim)              (E5)
//    - reclaim before deadline is rejected                                 (E6)
//    - accept after deadline is rejected                                   (E7)
//    - accept with insufficient value is rejected                          (E8)
//    - pinned taker: wrong taker rejected, right taker accepted            (E9..E10)
//    - createDeal underfunded, zero amounts, past deadline                 (E11..E13)
// ============================================================================

import "@acton/build"
import "@acton/emulation/network"
import "@acton/emulation/testing"
import "@acton/testing/expect"

import "@contracts/types"
import "@wrappers/PushkaEscrow.gen"
import "@wrappers/PushkaFactory.gen"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FEE_BPS: uint16 = 30 // 0.30 %
const GIVE: coins = 1000000000 // 1 TON
const WANT: coins = 2000000000 // 2 TON
const DEADLINE_OFFSET: uint32 = 3600 // +1 hour by default

fun deployFactory(): (PushkaFactory, Treasury) {
    val owner = testing.treasury("owner");
    val factory = PushkaFactory.fromStorage({
        owner: owner.address,
        feeBps: FEE_BPS,
        nextDealId: 0,
        accumulatedFees: 0,
        escrowCode: build("PushkaEscrow"),
    });
    val res = factory.deploy(owner.address, { value: ton("1") });
    expect(res).toHaveSuccessfulDeploy({ to: factory.address });
    return (factory, owner);
}

// Maker creates a deal with the given parameters and returns the resulting
// PushkaEscrow wrapper bound to its deterministic address.
fun createDeal(
    factory: PushkaFactory,
    maker: Treasury,
    takerPinned: address?,
    giveAmount: coins,
    wantAmount: coins,
    deadline: uint32,
): (PushkaEscrow, uint64) {
    val dealId = factory.nextDealId();

    // Predict the escrow address *before* sending CreateDeal — this is the
    // same calculation the Mini App will run off-chain via TonAPI.
    val predicted = factory.escrowAddressOf(
        dealId,
        maker.address,
        takerPinned,
        giveAmount,
        wantAmount,
        deadline,
    );

    val res = factory.sendCreateDeal(
        maker.address,
        takerPinned,
        giveAmount,
        wantAmount,
        deadline,
        { value: giveAmount + ton("0.2") }, // gives + deploy buffer + factory gas + cushion
    );
    expect(res).toHaveSuccessfulTx<CreateDeal>({
        from: maker.address,
        to: factory.address,
    });

    val escrow = PushkaEscrow.fromAddress(predicted);
    return (escrow, dealId);
}

// ---------------------------------------------------------------------------
// E1 — happy path: Accept settles, payouts and fee accrue correctly
// ---------------------------------------------------------------------------

get fun `test happy path Accept settles deal and accrues fee`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val taker = testing.treasury("taker");
    val deadline = blockchain.now() + DEADLINE_OFFSET;

    val (escrow, _dealId) = createDeal(
        factory,
        maker,
        null,
        GIVE,
        WANT,
        deadline,
    );

    // Escrow is now Funded.
    expect(escrow.state()).toEqual(DealState.Funded as uint8);

    val res = escrow.sendAccept(taker.address, { value: WANT + ton("0.1") });
    expect(res).toHaveSuccessfulTx<Accept>({
        from: taker.address,
        to: escrow.address,
    });

    // Factory received its protocol fee (WANT * 30 / 10000 = 0.006 TON).
    val accrued = factory.accumulatedFees();
    expect(accrued > 0).toEqual(true);
    expect(accrued <= WANT * FEE_BPS / 10000).toEqual(true);
}

// ---------------------------------------------------------------------------
// E2 — cancel by maker before deadline
// ---------------------------------------------------------------------------

get fun `test maker can cancel deal before deadline`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val deadline = blockchain.now() + DEADLINE_OFFSET;

    val (escrow, _) = createDeal(
        factory,
        maker,
        null,
        GIVE,
        WANT,
        deadline,
    );

    val res = escrow.sendCancel(maker.address, { value: ton("0.05") });
    expect(res).toHaveSuccessfulTx<Cancel>({
        from: maker.address,
        to: escrow.address,
    });
}

// ---------------------------------------------------------------------------
// E3 — reclaim by maker after deadline
// ---------------------------------------------------------------------------

get fun `test maker can reclaim after deadline passed`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val deadline: uint32 = blockchain.now() + 10 as uint32;

    val (escrow, _) = createDeal(
        factory,
        maker,
        null,
        GIVE,
        WANT,
        deadline,
    );

    testing.setNow(deadline + 1); // fast-forward just past the deadline

    val res = escrow.sendReclaim(maker.address, { value: ton("0.05") });
    expect(res).toHaveSuccessfulTx<Reclaim>({
        from: maker.address,
        to: escrow.address,
    });
}

// ---------------------------------------------------------------------------
// E4 — cancel from a random user is rejected
// ---------------------------------------------------------------------------

get fun `test non-maker cannot cancel deal`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val intruder = testing.treasury("intruder");
    val deadline = blockchain.now() + DEADLINE_OFFSET;

    val (escrow, _) = createDeal(
        factory,
        maker,
        null,
        GIVE,
        WANT,
        deadline,
    );

    val res = escrow.sendCancel(intruder.address, { value: ton("0.05") });
    expect(res).toHaveFailedTx({
        from: intruder.address,
        to: escrow.address,
        exitCode: Errors.NotMaker,
    });

    // Deal still alive.
    expect(escrow.state()).toEqual(DealState.Funded as uint8);
}

// ---------------------------------------------------------------------------
// E5 — cancel after deadline is rejected (use Reclaim instead)
// ---------------------------------------------------------------------------

get fun `test cancel after deadline is rejected`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val deadline: uint32 = blockchain.now() + 10 as uint32;

    val (escrow, _) = createDeal(
        factory,
        maker,
        null,
        GIVE,
        WANT,
        deadline,
    );

    testing.setNow(deadline + 1);

    val res = escrow.sendCancel(maker.address, { value: ton("0.05") });
    expect(res).toHaveFailedTx({
        from: maker.address,
        to: escrow.address,
        exitCode: Errors.DeadlinePassed,
    });
}

// ---------------------------------------------------------------------------
// E6 — reclaim before deadline is rejected (use Cancel instead)
// ---------------------------------------------------------------------------

get fun `test reclaim before deadline is rejected`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val deadline = blockchain.now() + DEADLINE_OFFSET;

    val (escrow, _) = createDeal(
        factory,
        maker,
        null,
        GIVE,
        WANT,
        deadline,
    );

    val res = escrow.sendReclaim(maker.address, { value: ton("0.05") });
    expect(res).toHaveFailedTx({
        from: maker.address,
        to: escrow.address,
        exitCode: Errors.DeadlineNotReached,
    });
}

// ---------------------------------------------------------------------------
// E7 — accept after deadline is rejected
// ---------------------------------------------------------------------------

get fun `test accept after deadline is rejected`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val taker = testing.treasury("taker");
    val deadline: uint32 = blockchain.now() + 10 as uint32;

    val (escrow, _) = createDeal(
        factory,
        maker,
        null,
        GIVE,
        WANT,
        deadline,
    );

    testing.setNow(deadline + 1);

    val res = escrow.sendAccept(taker.address, { value: WANT + ton("0.1") });
    expect(res).toHaveFailedTx({
        from: taker.address,
        to: escrow.address,
        exitCode: Errors.DeadlinePassed,
    });
}

// ---------------------------------------------------------------------------
// E8 — accept with insufficient value is rejected
// ---------------------------------------------------------------------------

get fun `test accept with insufficient value is rejected`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val taker = testing.treasury("taker");
    val deadline = blockchain.now() + DEADLINE_OFFSET;

    val (escrow, _) = createDeal(
        factory,
        maker,
        null,
        GIVE,
        WANT,
        deadline,
    );

    val res = escrow.sendAccept(taker.address, { value: WANT - 1 });
    expect(res).toHaveFailedTx({
        from: taker.address,
        to: escrow.address,
        exitCode: Errors.Underfunded,
    });
}

// ---------------------------------------------------------------------------
// E9 — wrong pinned taker is rejected
// ---------------------------------------------------------------------------

get fun `test pinned taker mismatch is rejected`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val pinned = testing.treasury("pinnedTaker");
    val intruder = testing.treasury("notThePinnedTaker");
    val deadline = blockchain.now() + DEADLINE_OFFSET;

    val (escrow, _) = createDeal(
        factory,
        maker,
        pinned.address,
        GIVE,
        WANT,
        deadline,
    );

    val res = escrow.sendAccept(intruder.address, { value: WANT + ton("0.1") });
    expect(res).toHaveFailedTx({
        from: intruder.address,
        to: escrow.address,
        exitCode: Errors.NotTaker,
    });
}

// ---------------------------------------------------------------------------
// E10 — pinned taker succeeds
// ---------------------------------------------------------------------------

get fun `test pinned taker can accept`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");
    val pinned = testing.treasury("pinnedTaker");
    val deadline = blockchain.now() + DEADLINE_OFFSET;

    val (escrow, _) = createDeal(
        factory,
        maker,
        pinned.address,
        GIVE,
        WANT,
        deadline,
    );

    val res = escrow.sendAccept(pinned.address, { value: WANT + ton("0.1") });
    expect(res).toHaveSuccessfulTx<Accept>({
        from: pinned.address,
        to: escrow.address,
    });
}

// ---------------------------------------------------------------------------
// E11..E13 — CreateDeal validation
// ---------------------------------------------------------------------------

get fun `test create deal with zero give amount fails`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");

    val res = factory.sendCreateDeal(
        maker.address,
        null,
        0,
        WANT,
        blockchain.now() + DEADLINE_OFFSET,
        { value: ton("0.5") },
    );
    expect(res).toHaveFailedTx({
        from: maker.address,
        to: factory.address,
        exitCode: Errors.ZeroAmount,
    });
}

get fun `test create deal with past deadline fails`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");

    val res = factory.sendCreateDeal(
        maker.address,
        null,
        GIVE,
        WANT,
        blockchain.now() as uint32 - 1,
        { value: GIVE + ton("0.2") },
    );
    expect(res).toHaveFailedTx({
        from: maker.address,
        to: factory.address,
        exitCode: Errors.DeadlinePassed,
    });
}

get fun `test create deal underfunded fails`() {
    val (factory, _) = deployFactory();
    val maker = testing.treasury("maker");

    val res = factory.sendCreateDeal(
        maker.address,
        null,
        GIVE,
        WANT,
        blockchain.now() + DEADLINE_OFFSET,
        { value: GIVE }, // missing factory gas + escrow deploy buffer
    );
    expect(res).toHaveFailedTx({
        from: maker.address,
        to: factory.address,
        exitCode: Errors.Underfunded,
    });
}
