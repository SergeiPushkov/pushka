// ============================================================================
//  PUSHKA — Escrow contract (one per deal)
//
//  Lifecycle:
//
//      Factory --[deploy, value = giveAmount, body = empty]--> Escrow (Funded)
//                                                                |
//          maker                                                 |    deadline
//          ─── Cancel ──────────────────────────────────────────▶|◀── Reclaim ──
//                                                                |
//          taker --[Accept, value = wantAmount + gas]────────────▶ Settled
//
//  Settled payouts (atomic, single transaction):
//      taker   ← giveAmount         (mode: PAY_FEES_SEPARATELY,    bounce: no)
//      factory ← fee + FeePayout    (mode: PAY_FEES_SEPARATELY,    bounce: no)
//      maker   ← whatever is left   (mode: CARRY_ALL_BALANCE + DESTROY)
//
//  Cancel / Reclaim payout:
//      maker   ← whole balance      (mode: CARRY_ALL_BALANCE + DESTROY)
// ============================================================================

import "types"

contract PushkaEscrow {
    author: "PUSHKA"
    version: "0.1.0"
    description: "P2P trust-less TON escrow with deadline and optional pinned counterparty"
    storage: EscrowStorage
    incomingMessages: EscrowMessage
}

fun onInternalMessage(in: InMessage) {
    // First case: deploy-funding ping from the Factory. The body is empty and
    // the message value covers giveAmount + gas reserve. We require the sender
    // to be the registered factory; otherwise reject so that stray top-ups can
    // never accidentally count as "fund this deal".
    if (in.body.isEmpty()) {
        val storage = lazy EscrowStorage.load();
        val terms = storage.terms.load();
        assert (storage.state == DealState.Funded as uint8) throw Errors.WrongState;
        assert (in.senderAddress == storage.factory) throw Errors.NotFactory;
        assert (in.valueCoins >= terms.giveAmount) throw Errors.Underfunded;
        return;
    }

    val msg = lazy EscrowMessage.fromSlice(in.body);

    match (msg) {
        Accept => {
            var storage = lazy EscrowStorage.load();
            val terms = storage.terms.load();
            assert (storage.state == DealState.Funded as uint8) throw Errors.WrongState;
            assert (blockchain.now() < terms.deadline) throw Errors.DeadlinePassed;
            assert (in.valueCoins >= terms.wantAmount) throw Errors.Underfunded;

            // Optional whitelist: if takerPinned was set, only that address can settle.
            if (terms.takerPinned != null) {
                assert (in.senderAddress == terms.takerPinned!) throw Errors.NotTaker;
            }

            val fee: coins = terms.wantAmount * terms.feeBps / 10000;
            val makerProceeds: coins = terms.wantAmount - fee;
            val giveOut: coins = terms.giveAmount;

            // Mark settled FIRST — defensive even though TVM has no reentrancy.
            storage.state = DealState.Settled as uint8;
            storage.save();

            // 1) Send the giveAmount to the taker. The recipient is a wallet
            //    (or arbitrary account), so we use NoBounce: a wallet always
            //    accepts coins. Forward fee is paid from contract balance.
            val toTaker = createMessage({
                bounce: BounceMode.NoBounce,
                value: giveOut,
                dest: in.senderAddress,
            });
            toTaker.send(SEND_MODE_PAY_FEES_SEPARATELY);

            // 2) Forward the protocol fee back to the factory with a typed body.
            val toFactory = createMessage({
                bounce: BounceMode.NoBounce,
                value: fee,
                dest: storage.factory,
                body: FeePayout { dealId: storage.dealId },
            });
            toFactory.send(SEND_MODE_PAY_FEES_SEPARATELY);

            // 3) Pay the maker the rest and destroy the escrow.
            //    CARRY_ALL_BALANCE makes sure even unspent gas is returned, so
            //    the maker effectively receives `wantAmount - fee + leftover`.
            val toMaker = createMessage({
                bounce: BounceMode.NoBounce,
                value: makerProceeds, // ignored under CARRY_ALL_BALANCE but kept for clarity
                dest: storage.maker,
            });
            // SAFETY: contract is in terminal Settled state, no further messages
            // will ever be processed; sending the whole balance and destroying
            // is the correct lifecycle exit for this deal.
            toMaker.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY);
        }

        Cancel => {
            val storage = lazy EscrowStorage.load();
            val terms = storage.terms.load();
            assert (storage.state == DealState.Funded as uint8) throw Errors.WrongState;
            assert (in.senderAddress == storage.maker) throw Errors.NotMaker;
            assert (blockchain.now() < terms.deadline) throw Errors.DeadlinePassed;

            payOutAndDestroy(storage.maker);
        }

        Reclaim => {
            val storage = lazy EscrowStorage.load();
            val terms = storage.terms.load();
            assert (storage.state == DealState.Funded as uint8) throw Errors.WrongState;
            assert (in.senderAddress == storage.maker) throw Errors.NotMaker;
            assert (blockchain.now() >= terms.deadline) throw Errors.DeadlineNotReached;

            payOutAndDestroy(storage.maker);
        }

        else => {
            assert (false) throw Errors.InvalidMessage;
        }
    }
}

fun onBouncedMessage(_in: InMessageBounced) {
    // Outgoing payouts are sent with BounceMode.NoBounce, so we never see a
    // bounce back in normal operation. If one does arrive (e.g. a malicious
    // wallet refuses funds) we simply swallow it: funds stay on the contract
    // and the maker can Reclaim after the deadline.
}

// Sends the entire contract balance to `to` and destroys the escrow.
fun payOutAndDestroy(to: address) {
    val refundMessage = createMessage({
        bounce: BounceMode.NoBounce,
        value: 0, // ignored under CARRY_ALL_BALANCE
        dest: to,
    });
    // SAFETY: only invoked from Cancel / Reclaim flows, where the deal has
    // been validated and we want to evacuate the entire balance to the maker
    // and self-destruct. There is no further state that needs preserving.
    refundMessage.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY);
}

// ---------------------------------------------------------------------------
//  Get methods
// ---------------------------------------------------------------------------

get fun details(): EscrowStorage {
    return EscrowStorage.load();
}

get fun terms(): EscrowTerms {
    return EscrowStorage.load().terms.load();
}

get fun state(): uint8 {
    return EscrowStorage.load().state;
}
