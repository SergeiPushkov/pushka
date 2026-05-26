// ============================================================================
//  PushkaFactory — real-network Cancel happy-path test
//
//  Usage (TonConnect, ANY wallet that has ≥ 0.4 testnet TON):
//      acton script contracts/scripts/cancel-test.tolk --net testnet --tonconnect
//
//  Flow:
//    1. Create a small deal (give 0.05 TON, want 0.1 TON, deadline 1h).
//    2. Wait for the deploy tx to land.
//    3. Cancel it — escrow self-destructs, balance flows back.
//
//  This validates the on-chain Cancel branch that unit tests already cover.
//  Two TonConnect approvals are required (CreateDeal + Cancel).
// ============================================================================

import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"

import "@contracts/types"
import "@wrappers/PushkaFactory.gen"
import "@wrappers/PushkaEscrow.gen"

const FACTORY_ADDR: address =
    address("kQChkfX-V0mnEPW7SiUu-mcKpiJsWNbLs4WlqztMpvC1mJAm");

const GIVE_AMOUNT: coins = 50000000;    // 0.05 TON
const WANT_AMOUNT: coins = 100000000;   // 0.10 TON

fun main() {
    val maker = scripts.wallet("deployer");
    val factory = PushkaFactory.fromAddress(FACTORY_ADDR);

    val dealId = factory.nextDealId();
    val deadline: uint32 = blockchain.now() + 3600 as uint32;

    println("");
    println("Maker:    {}", maker.address);
    println("Factory:  {}", factory.address);
    println("Deal #{}, give 0.05 TON, want 0.10 TON, deadline {}", dealId, deadline);

    // 1) Predict the escrow address using the factory's get-method.
    val escrowAddr = factory.escrowAddressOf(
        dealId, maker.address, null, GIVE_AMOUNT, WANT_AMOUNT, deadline,
    );
    println("Predicted escrow address: {}", escrowAddr);

    // 2) Send CreateDeal.
    val createRes = factory.sendCreateDeal(
        maker.address, null, GIVE_AMOUNT, WANT_AMOUNT, deadline,
        { value: ton("0.25") },
    );
    if (createRes.waitForFirstTransaction() == null) {
        println("CreateDeal tx not observed.");
        return;
    }
    println("✓ Deal created. Escrow funded with {} nanoTON.", GIVE_AMOUNT);

    // 3) Send Cancel from the same wallet (maker).
    val escrow = PushkaEscrow.fromAddress(escrowAddr);
    val cancelRes = escrow.sendCancel(maker.address, { value: ton("0.05") });
    if (cancelRes.waitForFirstTransaction() == null) {
        println("Cancel tx not observed.");
        return;
    }
    println("✓ Cancel sent. Funds returning to maker, escrow self-destructing.");
}
