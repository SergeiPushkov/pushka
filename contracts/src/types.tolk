// ============================================================================
//  PUSHKA — shared types, errors and message opcodes
// ============================================================================
// ---------------------------------------------------------------------------
//  Errors
// ---------------------------------------------------------------------------

enum Errors {
    // Generic
    InvalidMessage = 0xFFFF
    Unauthorized = 100

    // Factory
    FeeBpsTooHigh = 200
    NothingToWithdraw = 201

    // Escrow
    WrongState = 300
    Underfunded = 301
    DeadlinePassed = 302
    DeadlineNotReached = 303
    NotTaker = 304
    NotMaker = 305
    NotFactory = 306
    ZeroAmount = 307
}

// ---------------------------------------------------------------------------
//  Deal lifecycle
// ---------------------------------------------------------------------------
//
//  CREATED → maker funds the deal in the same message that creates it.
//  FUNDED  → waiting for taker.accept() or maker.cancel() / reclaim().
//  Terminal states (SETTLED / CANCELLED) live only as a get-method response
//  during the same transaction — after payouts the contract self-destructs
//  by sending its remaining balance away (mode 128 + 32).
//
enum DealState {
    Funded = 1
    Settled = 2
    Cancelled = 3
}

// Maximum protocol fee the owner can ever set: 1.00 %.
const FEE_BPS_HARD_CAP: int = 100

// ---------------------------------------------------------------------------
//  FACTORY
// ---------------------------------------------------------------------------

struct FactoryStorage {
    owner: address
    feeBps: uint16         // current protocol fee (0..FEE_BPS_HARD_CAP)
    nextDealId: uint64     // monotonic counter for deal ids
    accumulatedFees: coins // nanotons available for owner to withdraw
    escrowCode: cell       // code cell used to spawn PushkaEscrow contracts
}

fun FactoryStorage.load(): FactoryStorage {
    return FactoryStorage.fromCell(contract.getData());
}

fun FactoryStorage.save(self) {
    contract.setData(self.toCell());
}

// ---- Factory inbound messages ----------------------------------------------

// Maker -> Factory: create a new deal.
// Maker MUST attach: giveAmount (TON) + gas + escrow storage fee.
// The Factory will deploy an Escrow at a deterministic address derived from
// (factory, dealId) and forward `giveAmount` into it.
struct (0x70757300) CreateDeal {
    // 'pus\0'
    takerPinned: address? // optional whitelisted counterparty
    giveAmount: coins     // TON the maker is putting up
    wantAmount: coins     // TON the taker has to send to settle
    deadline: uint32      // unix seconds; reclaim after this
}

// Escrow -> Factory: forward collected protocol fee on settlement.
// Carries the dealId so the factory can emit an indexed event in the future.
struct (0x70757301) FeePayout {
    // 'pus\1'
    dealId: uint64
}

// Owner -> Factory: withdraw accumulated fees to the owner address.
struct (0x70757302) WithdrawFees {
    // 'pus\2'
    amount: coins // 0 means "all available"
}

// Owner -> Factory: change the protocol fee (capped at FEE_BPS_HARD_CAP).
struct (0x70757303) SetFeeBps {
    // 'pus\3'
    feeBps: uint16
}

// Owner -> Factory: transfer admin ownership.
struct (0x70757304) SetOwner {
    // 'pus\4'
    newOwner: address
}

// Owner -> Factory: hot-swap the escrow code (no effect on already-deployed
// escrows — their code is baked into their addresses).  Useful only for
// fixing bugs in newly minted escrows; we still ship without it on day one
// and add a flag-test for it.
struct (0x70757305) SetEscrowCode {
    // 'pus\5'
    code: cell
}

type FactoryMessage =
    | CreateDeal
    | FeePayout
    | WithdrawFees
    | SetFeeBps
    | SetOwner
    | SetEscrowCode

// ---------------------------------------------------------------------------
//  ESCROW
// ---------------------------------------------------------------------------

// Terms of the deal — immutable after creation, lives in a referenced cell
// so that the root EscrowStorage stays well under the 1023-bit cell limit.
struct EscrowTerms {
    takerPinned: address? // null => anyone can accept
    giveAmount: coins
    wantAmount: coins
    deadline: uint32
    feeBps: uint16        // snapshot from factory at creation
}

struct EscrowStorage {
    factory: address
    dealId: uint64
    maker: address
    state: uint8 // see DealState
    terms: Cell<EscrowTerms>
}

fun EscrowStorage.load(): EscrowStorage {
    return EscrowStorage.fromCell(contract.getData());
}

fun EscrowStorage.save(self) {
    contract.setData(self.toCell());
}

// ---- Escrow inbound messages ----------------------------------------------
//
//  The escrow is born already funded: its storage is composed by the Factory
//  with `state = Funded` and the deploy message itself carries giveAmount as
//  message value with an EMPTY body. The escrow's `onInternalMessage` simply
//  verifies on the first call that funding is sufficient and then ignores
//  empty-body messages forever after. The three real operations are:

// Taker -> Escrow: settle the deal by paying wantAmount + gas.
struct (0x70757311) Accept {
    // 'pus\11
}

// Maker -> Escrow: cancel before any taker accepted.
// Available only while deadline has NOT passed; after deadline use Reclaim.
struct (0x70757312) Cancel {
    // 'pus\12
}

// Maker -> Escrow: reclaim funds after deadline passed.
struct (0x70757313) Reclaim {
    // 'pus\13
}

type EscrowMessage =
    | Accept
    | Cancel
    | Reclaim
