// ============================================================================
//  PushkaFactory — withdraw accumulated fees
//
//  Usage (TonConnect, with the OWNER wallet):
//      acton script contracts/scripts/withdraw.tolk --net testnet --tonconnect
//
//  Prints the pre/post accumulatedFees value and broadcasts a single
//  WithdrawFees{amount:0} message (0 = "all available").
// ============================================================================

import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"

import "@contracts/types"
import "@wrappers/PushkaFactory.gen"

// Edit if you redeploy. The default value points at the testnet factory used
// in this repo's end-to-end run.
const FACTORY_ADDR: address =
    address("kQChkfX-V0mnEPW7SiUu-mcKpiJsWNbLs4WlqztMpvC1mJAm");

fun main() {
    val owner = scripts.wallet("deployer");
    val factory = PushkaFactory.fromAddress(FACTORY_ADDR);

    val before = factory.accumulatedFees();
    println("");
    println("Factory:               {}", factory.address);
    println("Owner (you):           {}", owner.address);
    println("accumulatedFees BEFORE: {} nanoTON", before);

    if (before == 0) {
        println("Nothing to withdraw — aborting.");
        return;
    }

    val res = factory.sendWithdrawFees(owner.address, 0, { value: ton("0.05") });
    if (res.waitForFirstTransaction() == null) {
        println("Transaction not observed yet — check the explorer.");
        return;
    }

    val after = factory.accumulatedFees();
    println("accumulatedFees AFTER:  {} nanoTON", after);
    println("");
    println("✓ Withdrawal complete. {} nanoTON sent back to owner.", before - after);
}
