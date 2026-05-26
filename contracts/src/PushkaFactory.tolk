// ============================================================================
//  PUSHKA — Factory contract (singleton)
//
//  Responsibilities:
//    1. Deploy a fresh PushkaEscrow contract per deal at a deterministic
//       address (derived from the escrow code + a storage cell that includes
//       the dealId, so each escrow has its own address).
//    2. Collect protocol fees from escrows that settled successfully.
//    3. Allow the owner to withdraw accumulated fees and to update params
//       (feeBps, owner, escrow code for *future* deals only).
// ============================================================================

import "types"

contract PushkaFactory {
    author: "PUSHKA"
    version: "0.1.0"
    description: "PUSHKA Factory: deploys deal escrows and accrues protocol fees"
    storage: FactoryStorage
    incomingMessages: FactoryMessage
}

// Minimum extra value the Factory keeps in the escrow message on top of
// giveAmount to cover initial storage fees and the deploy gas.
const ESCROW_DEPLOY_BUFFER: coins = 50000000 // 0.05 TON

// Minimum total value the maker must attach to CreateDeal: gives + buffer.
const FACTORY_GAS_BUFFER: coins = 20000000 // 0.02 TON

fun onInternalMessage(in: InMessage) {
    val msg = lazy FactoryMessage.fromSlice(in.body);

    match (msg) {
        CreateDeal => {
            var factoryStorage = lazy FactoryStorage.load();

            assert (msg.giveAmount > 0) throw Errors.ZeroAmount;
            assert (msg.wantAmount > 0) throw Errors.ZeroAmount;
            assert (msg.deadline > blockchain.now()) throw Errors.DeadlinePassed;

            val requiredValue: coins = msg.giveAmount + ESCROW_DEPLOY_BUFFER + FACTORY_GAS_BUFFER;
            assert (in.valueCoins >= requiredValue) throw Errors.Underfunded;

            val dealId: uint64 = factoryStorage.nextDealId;

            val terms: EscrowTerms = {
                takerPinned: msg.takerPinned,
                giveAmount: msg.giveAmount,
                wantAmount: msg.wantAmount,
                deadline: msg.deadline,
                feeBps: factoryStorage.feeBps,
            };
            val escrowStorage: EscrowStorage = {
                factory: contract.getAddress(),
                dealId,
                maker: in.senderAddress,
                state: DealState.Funded as uint8,
                terms: terms.toCell(),
            };

            val deployMsg = createMessage({
                bounce: BounceMode.Only256BitsOfBody,
                value: msg.giveAmount + ESCROW_DEPLOY_BUFFER,
                dest: AutoDeployAddress {
                    stateInit: ContractState {
                        code: factoryStorage.escrowCode,
                        data: escrowStorage.toCell(),
                    },
                },
            });
            deployMsg.send(SEND_MODE_PAY_FEES_SEPARATELY);

            factoryStorage.nextDealId = dealId + 1;
            factoryStorage.save();
        }

        FeePayout => {
            var factoryStorage = lazy FactoryStorage.load();
            // Anyone could *attempt* a FeePayout, but the bookkeeping is honest:
            // accumulatedFees is only ever increased by the nanotons that
            // actually arrived in the message value. A bogus sender therefore
            // donates real coins to the protocol — not an attack.
            factoryStorage.accumulatedFees = factoryStorage.accumulatedFees + in.valueCoins;
            factoryStorage.save();
        }

        WithdrawFees => {
            var factoryStorage = lazy FactoryStorage.load();
            assert (in.senderAddress == factoryStorage.owner) throw Errors.Unauthorized;

            val available: coins = factoryStorage.accumulatedFees;
            assert (available > 0) throw Errors.NothingToWithdraw;

            val amount: coins = msg.amount == 0 ? available : msg.amount;
            assert (amount <= available) throw Errors.NothingToWithdraw;

            factoryStorage.accumulatedFees = available - amount;
            factoryStorage.save();

            val payoutMsg = createMessage({
                bounce: BounceMode.NoBounce,
                value: amount,
                dest: factoryStorage.owner,
            });
            payoutMsg.send(SEND_MODE_PAY_FEES_SEPARATELY);
        }

        SetFeeBps => {
            var factoryStorage = lazy FactoryStorage.load();
            assert (in.senderAddress == factoryStorage.owner) throw Errors.Unauthorized;
            assert (msg.feeBps <= FEE_BPS_HARD_CAP) throw Errors.FeeBpsTooHigh;

            factoryStorage.feeBps = msg.feeBps;
            factoryStorage.save();
        }

        SetOwner => {
            var factoryStorage = lazy FactoryStorage.load();
            assert (in.senderAddress == factoryStorage.owner) throw Errors.Unauthorized;

            factoryStorage.owner = msg.newOwner;
            factoryStorage.save();
        }

        SetEscrowCode => {
            var factoryStorage = lazy FactoryStorage.load();
            assert (in.senderAddress == factoryStorage.owner) throw Errors.Unauthorized;

            factoryStorage.escrowCode = msg.code;
            factoryStorage.save();
        }

        else => {
            assert (in.body.isEmpty()) throw Errors.InvalidMessage;
        }
    }
}

fun onBouncedMessage(_in: InMessageBounced) {
    // Bounced deploys would leave the Factory consistent: the unspent value
    // returns and nextDealId is already incremented (the id is now skipped).
    // We do not roll back nextDealId on bounce — skipping an id is safe and
    // cheaper than reasoning about partial bounce parsing.
}

// ---------------------------------------------------------------------------
//  Get methods
// ---------------------------------------------------------------------------

get fun details(): FactoryStorage {
    return FactoryStorage.load();
}

get fun owner(): address {
    return FactoryStorage.load().owner;
}

get fun feeBps(): uint16 {
    return FactoryStorage.load().feeBps;
}

get fun nextDealId(): uint64 {
    return FactoryStorage.load().nextDealId;
}

get fun accumulatedFees(): coins {
    return FactoryStorage.load().accumulatedFees;
}

// Returns the deterministic address of a deal escrow before deployment.
// The Mini App calls this off-chain via TonAPI to know where to "watch".
get fun escrowAddressOf(
    dealId: uint64,
    maker: address,
    takerPinned: address?,
    giveAmount: coins,
    wantAmount: coins,
    deadline: uint32,
): address {
    val factoryStorage = lazy FactoryStorage.load();
    val terms: EscrowTerms = {
        takerPinned,
        giveAmount,
        wantAmount,
        deadline,
        feeBps: factoryStorage.feeBps,
    };
    val escrowStorage: EscrowStorage = {
        factory: contract.getAddress(),
        dealId,
        maker,
        state: DealState.Funded as uint8,
        terms: terms.toCell(),
    };
    return AutoDeployAddress {
        stateInit: ContractState {
            code: factoryStorage.escrowCode,
            data: escrowStorage.toCell(),
        },
    }.calculateAddress();
}
