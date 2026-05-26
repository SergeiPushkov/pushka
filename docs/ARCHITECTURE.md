# PUSHKA — Architecture

> P2P swap, escrow and limit orders aggregator on TON.
> Written in Tolk, scaffolded with Acton 1.1.0.

## 1. Why PUSHKA

The TON DEX market (STON.fi, DeDust) is mature for **instant pool swaps**,
but it does **not** cover several use-cases the community asks for:

| Need                                             | STON.fi | DeDust |        PUSHKA        |
| ------------------------------------------------ | :-----: | :----: | :------------------: |
| Instant TON↔Jetton swap with deep liquidity      |   ✅    |   ✅   | ✅ (via aggregation) |
| Trustless P2P deal between two specific parties  |   ❌    |   ❌   |          ✅          |
| Time-locked offers (deadline auto-refund)        |   ❌    |   ❌   |          ✅          |
| Recipient restricted offers (whitelist a wallet) |   ❌    |   ❌   |          ✅          |
| One-tap Telegram Mini App experience             |   ⚠️    |   ⚠️   |          ✅          |

PUSHKA's positioning: **"Telegram-native trustless deals on TON"**.

The MVP focuses on the P2P escrow primitive — the part competitors do not
cover — and exposes it through a Telegram Mini App. Pool-based instant
swaps will be added as an _aggregation_ layer in v2 (routing to STON.fi /
DeDust under the hood with a thin protocol fee on top).

## 2. Contract Topology

```
                ┌────────────────────────────────┐
                │  PushkaFactory  (singleton)    │
                │  • owner / admin               │
                │  • fee_bps  (e.g. 30 = 0.30 %) │
                │  • next_deal_id  (counter)     │
                │  • accumulated_fees (Coins)    │
                └──────────────┬─────────────────┘
                               │ creates (state-init)
                               ▼
                ┌────────────────────────────────┐
                │  PushkaEscrow   (one-per-deal) │
                │  • factory                     │
                │  • deal_id                     │
                │  • maker  /  taker?            │
                │  • give_asset  /  give_amount  │
                │  • want_asset  /  want_amount  │
                │  • deadline (unix)             │
                │  • state                       │
                └────────────────────────────────┘
```

**TON idiom:** one logical object = one contract address.
Each deal is its own contract, so state is local, gas is bounded, and
parallelism is natural. The Factory only holds global config and the fee
pot — it is **not** in the hot path of a deal.

## 3. Deal State Machine

```
        ┌───────────┐  fund(maker, give)  ┌────────┐
   ───▶│  CREATED   │ ──────────────────▶│ FUNDED │
        └───────────┘                     └───┬────┘
              │                               │ accept(taker, want)
              │ cancel()                      ▼
              ▼                          ┌─────────┐
        ┌──────────┐                     │ SETTLED │
        │CANCELLED │ ◀───────────────────│ (paid)  │
        └──────────┘  reclaim() if       └─────────┘
                      deadline reached
```

Transitions:

| From                | Action    | Who   | Guard                                                                | To        |
| ------------------- | --------- | ----- | -------------------------------------------------------------------- | --------- |
| CREATED             | `fund`    | maker | matches give amount                                                  | FUNDED    |
| FUNDED              | `accept`  | taker | matches want amount, before deadline, taker matches whitelist if set | SETTLED   |
| FUNDED              | `cancel`  | maker | only maker, no accept yet                                            | CANCELLED |
| FUNDED              | `reclaim` | maker | `now() > deadline`                                                   | CANCELLED |
| SETTLED / CANCELLED | —         | —     | terminal                                                             | —         |

## 4. Asset Model

```tolk
type Asset =
    | AssetTON          // native coin
    | AssetJetton       // any TEP-74 jetton (master address)

struct AssetTON   { /* tag */ }
struct AssetJetton { master: address }
```

- **TON side:** value comes inline in the message (`in.value`).
- **Jetton side:** the escrow is funded via `transfer_notification` from
  the contract's own jetton wallet. We compute the wallet address
  off-chain (Factory tells the user where to send) and trust **only**
  notifications from that exact wallet address.

## 5. Fee Model

- Fee is taken on `accept` (the only happy-path settlement).
- `fee = want_amount * fee_bps / 10000`.
- The fee is **forwarded immediately** to the Factory on settlement
  (separate message), it does **not** sit in the Escrow.
- Initial `fee_bps = 30` (0.30 %), matching STON.fi's protocol cut.
- Owner can change `fee_bps` only **upward bounded** (`<= 100`, i.e. 1 %)
  via the same `set_fee_bps` admin op — this is an explicit safety rail
  enforced inside the Factory.

## 6. Security & Audit Posture

The contract is intentionally minimal — fewer lines = smaller attack
surface. The full threat model lives in `docs/SECURITY.md`. Highlights:

- **No upgradability** of Escrow logic per deal — once deployed, immutable.
- **Bounce-safe**: every outgoing payment uses `bounce: true` and a
  bounced-message handler restores state.
- **Reentrancy**: TON's actor model serializes per-contract, but we still
  zero out the give/want amounts **before** sending payouts.
- **Front-running on accept**: mitigated by optional `taker_whitelist`
  (the maker pins the counterparty).
- **Replay**: each escrow address is unique (depends on `deal_id`), so
  the same payload cannot be replayed against a different deal.
- **Jetton wallet spoofing**: the Escrow validates that the notification
  comes from the _expected_ jetton wallet derived from its own address.

## 7. Telegram Mini App

Located in `app/`. Stack:

- **Vite + React + TypeScript** (already scaffolded by Acton).
- **TON Connect 2** (already wired by Acton).
- **TonAPI** (read-only chain data) — requires user-supplied API key in
  `.env.local` (`VITE_TONAPI_KEY`).

Screens (MVP):

1. **Home** — wallet + live fee pot stats.
2. **Create deal** — maker picks give/want assets, amount, deadline,
   optional taker, share link.
3. **Open deal** — taker lands here from share link; one-tap accept.
4. **My deals** — list of escrows where the wallet is maker or taker.

## 8. Repository Layout

```
.
├── Acton.toml              ← project manifest
├── AGENTS.md               ← guidance for coding agents
├── README.md
├── docs/
│   ├── ARCHITECTURE.md     ← this file
│   ├── SECURITY.md         ← threat model + checklist
│   ├── DEPLOY.md           ← step-by-step deploy guide for Tonkeeper
│   └── MARKETING.md        ← go-to-market playbook
├── contracts/
│   ├── src/
│   │   ├── PushkaFactory.tolk
│   │   ├── PushkaEscrow.tolk
│   │   └── types.tolk
│   ├── tests/              ← native Tolk tests (acton test)
│   ├── wrappers/           ← auto-generated by acton wrapper
│   └── scripts/
│       └── deploy.tolk
├── wrappers-ts/            ← auto-generated TS wrappers for the app
└── app/                    ← Vite + React + TON Connect Mini App
```

## 9. Roadmap

| Phase           | Scope                                                                 |
| --------------- | --------------------------------------------------------------------- |
| MVP (this repo) | Factory + Escrow + Mini App + testnet deploy.                         |
| v1.1            | Open offers (no taker pinned), shareable deep-links in TG.            |
| v1.2            | Swap aggregation layer: route to STON.fi / DeDust, charge 0.05 % top. |
| v2.0            | On-chain limit orders settled by keepers (Pyth/RedStone oracle).      |
