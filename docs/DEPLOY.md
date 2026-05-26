# PUSHKA — Deployment Guide

This guide takes you from a clean clone to a live PUSHKA deployment on
TON **testnet** (recommended for a first run) or **mainnet**.

> 🚨 **Security first.** You never need to give anyone — including this
> guide, AI tools, or "support" people — your wallet seed phrase. The
> safest deploy path below uses **TON Connect**: your existing Tonkeeper
> signs the deploy transaction; the secret never leaves your phone.

---

## 0. One-time prerequisites

These are already done in this repo, but listed for full reproducibility:

```bash
# Node.js 22+
node --version

# Acton CLI (all-in-one Tolk toolchain)
curl -LsSf https://github.com/ton-blockchain/acton/releases/latest/download/acton-installer.sh | sh
source $HOME/.acton/bin/env
acton --version           # should print 1.1.0 or later

# Repo dependencies (one-time)
npm ci
```

---

## 1. Build & test before deploying

A green test run is the cheapest insurance you'll ever buy on-chain.

```bash
acton build               # compiles PushkaEscrow + PushkaFactory
acton test                # runs the full Tolk test suite (22 tests, <30 ms)
```

You should see `✓ 22 passed in 2 files`.

---

## 2. Deploy with TON Connect (recommended)

This path is safe and beginner-friendly: **Tonkeeper signs the deploy**,
and your seed phrase never touches the command line.

```bash
# Testnet first — always.
acton run deploy-testnet-tc
```

What happens:

1. Acton prints a TON Connect QR code in the terminal.
2. Open **Tonkeeper → Settings → Toggle testnet** (if you haven't yet).
3. **Scan the QR** with Tonkeeper.
4. **Approve** the deploy transaction (cost ≈ 0.15 TON).
5. Acton prints the deployed factory address and a copy-paste snippet
   for `.env.local (in the repo root, **not** under app/)`.

If you only have 2 testnet TON: top up to ~3 TON first with the
[Tonkeeper testnet faucet](https://t.me/testgiver_ton_bot). The deploy
itself costs <0.2 TON, but factory needs a small storage reserve.

Sanity-check on Tonviewer (testnet):

```
https://testnet.tonviewer.com/<factory_address>
```

You should see:

- a deployed contract (not "Uninitialized"),
- balance ≈ 0.15 TON,
- the contract methods `details`, `owner`, `feeBps`, `nextDealId`,
  `accumulatedFees`, `escrowAddressOf` exposed.

---

## 3. Wire the address into the Mini App

After deploy, create `.env.local (in the repo root, **not** under app/)`:

```env
VITE_PUSHKA_FACTORY_TESTNET=kQ...      # the address Acton printed
VITE_PUSHKA_FACTORY_MAINNET=            # leave blank until you mainnet-deploy
VITE_TONAPI_KEY=                        # optional — only needed under load
```

> If you skip `VITE_TONAPI_KEY`, the public TonAPI rate limit applies
> (~1 req/sec). For a tested launch that's plenty. Get a free key at
> [tonconsole.com](https://tonconsole.com) and paste it in once you
> start seeing 429s.

Then run the Mini App:

```bash
npm run dev
```

Open the printed URL (usually `http://localhost:5173`), connect your
Tonkeeper to **testnet**, and try the full flow:

- Create a deal as Wallet A (give 0.1, want 0.2, deadline 1h).
- Copy the resulting escrow address from Tonviewer.
- Switch to Wallet B (or send the URL share link to a friend).
- Open the Accept tab, paste the address, enter `0.2`, click Accept.
- Both wallets receive the right amounts; the protocol fee shows up in
  the Factory's `accumulatedFees`.

---

## 4. Mainnet deploy (after testnet success)

**Don't skip step 2.** Run the full lifecycle on testnet at least
once with a real counterparty before you ever touch mainnet.

```bash
acton run deploy-mainnet-tc
```

This costs ≈ 0.15 TON of _real_ TON. After deployment, fill the
`VITE_PUSHKA_FACTORY_MAINNET` env var with the address and rebuild:

```bash
npm run build
```

Host the `dist/` folder anywhere — Vercel, Netlify, Cloudflare Pages,
GitHub Pages. For a real Telegram Mini App you'll also need a
`tonconnect-manifest.json` served at a stable HTTPS URL; see
[TON Connect docs](https://docs.ton.org/develop/dapps/ton-connect/manifest).

---

## 5. Telegram Mini App registration

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. `/newbot` → name and username.
3. `/newapp` → pick the bot → name (e.g. PUSHKA) → short description →
   icon (512×512 PNG) → **upload your hosted Mini App URL**.
4. Set the bot menu button to launch the Mini App.

---

## 6. Operational tasks

```bash
# Inspect factory state
acton script contracts/scripts/deploy.tolk --net testnet --fork-net testnet

# Verify the source on TON Verifier (so users can audit byte-equivalence)
acton verify PushkaFactory --net testnet
acton verify PushkaEscrow  --net testnet
```

Withdrawing accumulated fees and rotating ownership are done by sending
typed messages from the Mini App while connected as the **owner wallet**.
(A dedicated admin panel can be added later — for MVP the easiest path
is `acton script` with a one-off Tolk script that calls
`factory.sendWithdrawFees(...)` or `factory.sendSetFeeBps(...)`.)

---

## 7. What to do if something goes wrong

| Symptom                                 | Likely cause / Fix                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `Wallet keys are available only…` error | You ran the script without `--net` or without `--tonconnect`. Add the right flag.                                        |
| Deploy succeeds, Factory shows "Uninit" | Look at the bounce in Tonviewer — the deploy message probably didn't carry enough value. Top up the deployer and re-run. |
| Mini App says "Factory not configured"  | `.env.local (in the repo root, **not** under app/)` is missing the variable, OR you forgot to restart `npm run dev` after editing it.                       |
| `429 Too Many Requests` from TonAPI     | Set `VITE_TONAPI_KEY` in `.env.local (in the repo root, **not** under app/)`.                                                                               |
| Tests fail after a code edit            | Run `acton check --fix` first; then re-run `acton test`. The Tolk compiler is strict but accurate.                       |

If you hit an issue that isn't covered here, paste the full output of
`acton doctor` into a GitHub issue.
