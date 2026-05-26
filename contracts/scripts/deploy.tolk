// ============================================================================
//  PushkaFactory deployment script
//
//  Usage (TonConnect — recommended, no seed phrase ever leaves your wallet):
//
//      acton script contracts/scripts/deploy.tolk --tonconnect            # emulate
//      acton script contracts/scripts/deploy.tolk --net testnet --tonconnect
//      acton script contracts/scripts/deploy.tolk --net mainnet --tonconnect
//
//  Usage (mnemonic-based development wallet stored via `acton wallet`):
//
//      acton wallet new deployer            # creates a local testnet wallet
//      acton wallet airdrop deployer        # tops it up from the faucet
//      acton script contracts/scripts/deploy.tolk --net testnet
//
//  The script prints the deployed Factory address and a snippet you can paste
//  into your Mini App `.env.local`.
// ============================================================================

import "@acton/build"
import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"

import "@contracts/types"
import "@wrappers/PushkaFactory.gen"

// Initial protocol fee, in basis points (30 = 0.30 %).
const INITIAL_FEE_BPS: uint16 = 30

fun main() {
    val deployer = scripts.wallet("deployer");

    val factory = PushkaFactory.fromStorage({
        owner: deployer.address,
        feeBps: INITIAL_FEE_BPS,
        nextDealId: 0,
        accumulatedFees: 0,
        escrowCode: build("PushkaEscrow"),
    });

    println("");
    println("───────────────────────────────────────────────");
    println("  PUSHKA Factory deployment");
    println("───────────────────────────────────────────────");
    println("  owner:         {}", deployer.address);
    println("  feeBps:        {} bps", INITIAL_FEE_BPS);
    println("  factory addr:  {}", factory.address);
    println("───────────────────────────────────────────────");
    println("");

    val res = factory.deploy(deployer.address, { value: ton("0.2") });
    if (res.waitForFirstTransaction() == null) {
        println("Deployment transaction not observed yet — check the explorer.");
        return;
    }

    println("✓ Deployment broadcast.");
    println("");
    println("Now add this to .env.local in the repo root (NOT under app/):");
    println("  VITE_PUSHKA_FACTORY_TESTNET={}", factory.address);
    println("  VITE_PUSHKA_FACTORY_MAINNET={}", factory.address);
    println("");
    println("Sanity-check (after the network confirms the deploy):");
    println("  feeBps:          {} (expected {})", factory.feeBps(), INITIAL_FEE_BPS);
    println("  owner:           {}", factory.owner());
    println("  nextDealId:      {}", factory.nextDealId());
    println("  accumulatedFees: {}", factory.accumulatedFees());
}
