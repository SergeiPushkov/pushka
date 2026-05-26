# PUSHKA — Go-to-Market Playbook

> Honest reading: PUSHKA is a niche, technically excellent escrow primitive
> living inside Telegram. Growth will come from **specific use-cases**
> (OTC, services, gambling-adjacent bets), not from generic "DeFi user"
> messaging. This playbook is opinionated and runnable solo.

---

## 1. Positioning

**One-line pitch:** _"Trustless TON escrows in one tap, inside Telegram."_

**The five jobs PUSHKA does that no one else on TON does well:**

1. **OTC TON sales between friends** — "send me 100 TON now, I'll pay
   you back 105 TON in a week, with auto-refund if I don't."
2. **Service deposits** — freelancer wants visible commitment before
   starting; client deposits, can cancel, fund auto-returns after deadline.
3. **Public bets / dares** — two parties stake unequal amounts; if the
   bet condition is met, the winner accepts and the contract settles.
4. **Time-locked gifts** — "this 1 TON is yours after May 26", with
   maker's option to cancel before then.
5. **OTC token launches (v1.1)** — once we add Jetton support, this
   becomes the easiest way to do allowlisted private rounds.

**Counter-positioning vs STON.fi / DeDust:** they swap _pools_ —
anonymous, pool-priced, instant. PUSHKA settles _deals_ between two
specific people at a specific price, with a deadline. Different jobs.
We never want to be a worse STON.fi; we want to be the only thing for
the jobs above.

---

## 2. Founding-distribution channels (free, founder-led)

In order of expected ROI:

### 2.1 Telegram-native (highest ROI)

| Channel                                            | Tactic                                                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@toncoin_chat` (≈ 100k members)                   | Don't announce. Search for "OTC" / "трейд" / "обмен" daily; reply with a concrete demo URL.                            |
| `@tonblockchain` / `@ton_society`                  | Wait until you have one paid deal screenshot, then post it.                                                            |
| TON Society regional chapters                      | Russian-speaking trader rooms are PUSHKA's bullseye early audience. Offer a 0-fee 30-day promo for the first 50 deals. |
| Niche freelancer chats (design, dev, translations) | Pitch PUSHKA as "client deposit you can verify on-chain." Pin a how-to image.                                          |

### 2.2 Twitter / X

Don't post "we built X." Instead:

1. **Comparison thread.** A 6-tweet thread titled
   _"What's missing in TON DEXes (and what we're building)"_. Quote
   real Tonviewer screenshots of a settled escrow.
2. **Daily build-in-public.** Tweet a Tolk code snippet + a Tonviewer
   link of a real testnet transaction. Tag `@ton_blockchain`,
   `@tolk_lang`. Aim for 30 days straight.
3. **Reply game.** Reply to every "I got rugged" tweet in TON niche with
   "PUSHKA is your escrow primitive — here's a 60-second demo:
   <screen capture>".

### 2.3 Reddit (lower priority but compounding)

`r/TONcoin` and `r/cryptocurrency` (in tech threads only — never promo).
Best post format: _"How I built a 250-LOC escrow contract on TON in
Tolk — code walkthrough"_. Pure tech, link to the GitHub repo.

### 2.4 GitHub / dev surface

- Publish the repo open-source from day one. **MIT license** (already
  set in `Acton.toml`).
- Add a public **Threat Model** (`docs/SECURITY.md`) — devs trust what
  they can audit.
- Submit to https://github.com/ton-society/ton-footprint as a
  community project once you have your first 10 mainnet deals.

---

## 3. The launch sequence (90 days)

| Week | Goal                                 | Action                                                                                                                 |
| ---- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 1    | Testnet beta                         | Deploy to testnet, post a 30-second demo video in 5 chats with the testnet link.                                       |
| 2    | First 10 testnet deals               | Run **20 deals yourself**: split across 2 wallets, walk through cancel / accept / reclaim flows.                       |
| 3    | First external user                  | Recruit 1 trusted friend; do a real OTC P2P testnet trade. Screen-record it. Post the video.                           |
| 4    | Mainnet deploy + tonconnect manifest | Deploy on mainnet, host Mini App on Cloudflare Pages (free tier), register with @BotFather.                            |
| 5–8  | "First 100 mainnet deals" sprint     | Personal outreach to 50 traders. Promo: zero protocol fee on the first deal per wallet, expires after 60 days.         |
| 9–12 | Repeat user loop                     | Every new user gets an auto-DM share-link after 7 days: "your last deal settled — invite a friend, both get 50 % off." |

**Quantitative North-Star for the 90 days:** 200 mainnet deals settled,
50 unique wallets. At our 0.30 % fee that's a tiny revenue (≈ \$50 if
average size is \$50), but the proof-point is what unlocks the next
phase.

---

## 4. The narrative arc to use

Don't say "DeFi." Don't say "smart contract." Say:

- "**Locked TON that the network gives back if the deal falls through.**"
- "**Trades between two people that can't be censored or front-run.**"
- "**The receipt is the contract.**"

Then show a Tonviewer link. The on-chain proof beats any marketing copy.

---

## 5. Pricing & promotion mechanics

- **Default protocol fee:** 0.30 % of `wantAmount` (matches STON.fi's
  protocol cut, so it's a familiar number).
- **First-deal promo:** zero protocol fee for the first deal per
  wallet. Implementation note: the contract doesn't natively support
  per-wallet promos; for MVP just absorb the fee off-chain by sending
  the same amount back from the owner wallet manually for the first
  50 deals. Document this honestly in DEPLOY.md.
- **Referral mechanic (v1.1):** the share-link will carry an optional
  `?ref=<wallet>` query param. We don't need an on-chain referral
  registry for v0 — track in the Mini App localStorage / TonAPI logs
  and pay out off-chain weekly.

---

## 6. Anti-patterns (avoid these)

- ❌ **Token launch on day 1.** Don't. We have no product-market fit
  yet, and a token launch will torpedo every credibility bullet above.
- ❌ **Generic DEX comparison.** PUSHKA is not a DEX. Don't say "we're
  better than DeDust" — you'll lose the audience that knows what a DEX
  is, and the audience that doesn't won't care.
- ❌ **Buying tier-3 KOL shoutouts.** Returns trend to zero within 24h
  and signal "rug-adjacent" to TON natives. The free, slow channels
  above will outperform them within a month.
- ❌ **Mainnet before testnet has run 50 deals.** A single bug in
  payout math nukes user trust forever. The full Tolk test suite
  catches most things, but **manual end-to-end on testnet is non-skip**.

---

## 7. KPI dashboard (track from day 1)

Minimal dashboard — just a Google Sheet is fine:

| Metric                            | Tooling                                               |
| --------------------------------- | ----------------------------------------------------- |
| Total deals created               | TonAPI: count of `CreateDeal` transactions on Factory |
| Total deals settled (Accept)      | TonAPI: count of `Accept` transactions on any escrow  |
| Settlement rate (settled/created) | derived                                               |
| Average deal size (TON)           | sum of giveAmounts / count                            |
| Unique wallets (maker ∪ taker)    | unique senders                                        |
| `accumulatedFees`                 | factory get-method                                    |
| Mini App MAU                      | umami.is or Plausible (privacy-friendly)              |

Update weekly. If `Settlement rate` < 25 % in week 3, **stop marketing
and talk to your last 10 makers personally** — there is a UX bug.

---

## 8. The first 10 things to do **right now** after deploy

1. Buy `pushka.ton` (TON domain) for ≈ \$5/year — sets the brand.
2. Set up `https://pushka.<your-domain>` to redirect to the Mini App.
3. Register the Telegram bot and Mini App via BotFather.
4. Publish the GitHub repo (public).
5. Tweet the repo + a 60-second screencast of a testnet deal.
6. Write **one** Medium / Telegraph article: _"How PUSHKA settles a
   trustless deal in 4 messages on TON"_ — with diagrams.
7. Submit to https://ton.app/ (TON app directory).
8. Pin a "How to do your first deal" image inside Tonkeeper-related TG
   chats.
9. DM 20 friends who actively trade on TON; offer a personal walkthrough.
10. Make a 10-second loop GIF of the "Create deal → Accept → settled"
    flow and use it as your Telegram bot's start screen.
