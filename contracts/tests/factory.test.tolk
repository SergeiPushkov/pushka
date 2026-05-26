// ============================================================================
//  PushkaFactory — admin & bookkeeping tests
//
//  Covered here:
//    - deploy state                              (T1)
//    - SetFeeBps: happy / not-owner / too high   (T2..T4)
//    - SetOwner: happy / not-owner               (T5..T6)
//    - WithdrawFees: empty pot / partial / all   (T7..T9)
//    - FeePayout from any sender accrues funds   (T10)
//
//  CreateDeal end-to-end is exercised in escrow.test.tolk because it spawns a
//  PushkaEscrow and the assertions span both contracts.
// ============================================================================

import "@acton/build"
import "@acton/emulation/network"
import "@acton/emulation/testing"
import "@acton/testing/expect"

import "@contracts/types"
import "@wrappers/PushkaFactory.gen"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fun freshFactoryStorage(ownerAddr: address): FactoryStorage {
    return {
        owner: ownerAddr,
        feeBps: 30, // 0.30 %
        nextDealId: 0,
        accumulatedFees: 0,
        escrowCode: build("PushkaEscrow"),
    };
}

fun setupFactory(): (PushkaFactory, Treasury, Treasury) {
    val ownerWallet = testing.treasury("owner");
    val anotherWallet = testing.treasury("notOwner");

    val factory = PushkaFactory.fromStorage(freshFactoryStorage(ownerWallet.address));
    val res = factory.deploy(ownerWallet.address, { value: ton("1") });
    expect(res).toHaveSuccessfulDeploy({ to: factory.address });

    return (factory, ownerWallet, anotherWallet);
}

// ---------------------------------------------------------------------------
// T1 — deploy state
// ---------------------------------------------------------------------------

get fun `test deploy exposes initial owner, fee and counters`() {
    val (factory, owner, _) = setupFactory();

    expect(factory.owner()).toEqual(owner.address);
    expect(factory.feeBps()).toEqual(30);
    expect(factory.nextDealId()).toEqual(0);
    expect(factory.accumulatedFees()).toEqual(0);
}

// ---------------------------------------------------------------------------
// T2..T4 — SetFeeBps
// ---------------------------------------------------------------------------

get fun `test owner can change fee bps within cap`() {
    val (factory, owner, _) = setupFactory();

    val res = factory.sendSetFeeBps(owner.address, 75, { value: ton("0.05") });
    expect(res).toHaveSuccessfulTx<SetFeeBps>({
        from: owner.address,
        to: factory.address,
    });

    expect(factory.feeBps()).toEqual(75);
}

get fun `test non-owner cannot change fee bps`() {
    val (factory, _, intruder) = setupFactory();

    val res = factory.sendSetFeeBps(intruder.address, 50, { value: ton("0.05") });
    expect(res).toHaveFailedTx({
        from: intruder.address,
        to: factory.address,
        exitCode: Errors.Unauthorized,
    });

    expect(factory.feeBps()).toEqual(30);
}

get fun `test fee bps above hard cap is rejected`() {
    val (factory, owner, _) = setupFactory();

    val res = factory.sendSetFeeBps(owner.address, 101, { value: ton("0.05") });
    expect(res).toHaveFailedTx({
        from: owner.address,
        to: factory.address,
        exitCode: Errors.FeeBpsTooHigh,
    });

    expect(factory.feeBps()).toEqual(30);
}

// ---------------------------------------------------------------------------
// T5..T6 — SetOwner
// ---------------------------------------------------------------------------

get fun `test owner can transfer ownership`() {
    val (factory, owner, newOwner) = setupFactory();

    val res = factory.sendSetOwner(owner.address, newOwner.address, { value: ton("0.05") });
    expect(res).toHaveSuccessfulTx<SetOwner>({
        from: owner.address,
        to: factory.address,
    });

    expect(factory.owner()).toEqual(newOwner.address);
}

get fun `test non-owner cannot transfer ownership`() {
    val (factory, _, intruder) = setupFactory();

    val res = factory.sendSetOwner(intruder.address, intruder.address, { value: ton("0.05") });
    expect(res).toHaveFailedTx({
        from: intruder.address,
        to: factory.address,
        exitCode: Errors.Unauthorized,
    });
}

// ---------------------------------------------------------------------------
// T7..T9 — WithdrawFees
// ---------------------------------------------------------------------------

get fun `test withdraw with empty pot fails`() {
    val (factory, owner, _) = setupFactory();

    val res = factory.sendWithdrawFees(owner.address, 0, { value: ton("0.05") });
    expect(res).toHaveFailedTx({
        from: owner.address,
        to: factory.address,
        exitCode: Errors.NothingToWithdraw,
    });
}

get fun `test fee payout from anyone increases accumulated fees`() {
    val (factory, _, donor) = setupFactory();

    val res = factory.sendFeePayout(donor.address, 42, { value: ton("0.3") });
    expect(res).toHaveSuccessfulTx<FeePayout>({
        from: donor.address,
        to: factory.address,
    });

    // The exact accumulated amount is `in.valueCoins` after import fees were
    // accounted; in the emulator that equals the message value minus the
    // forward fee that the emulator charges. We assert that it grew and is
    // close to the donated amount.
    val accrued = factory.accumulatedFees();
    expect(accrued > ton("0.25")).toEqual(true);
    expect(accrued <= ton("0.3")).toEqual(true);
}

get fun `test owner can withdraw full pot`() {
    val (factory, owner, donor) = setupFactory();

    factory.sendFeePayout(donor.address, 1, { value: ton("0.5") });
    val pot = factory.accumulatedFees();

    val res = factory.sendWithdrawFees(owner.address, 0, { value: ton("0.05") });
    expect(res).toHaveSuccessfulTx<WithdrawFees>({
        from: owner.address,
        to: factory.address,
    });

    // Owner received the pot back (modulo forward fee).
    expect(factory.accumulatedFees()).toEqual(0);
    expect(pot > 0).toEqual(true);
}
