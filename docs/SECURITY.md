# PUSHKA — Security & Threat Model

> ⚠️ **This document is the audit checklist.** Every assumption,
> every "we don't have to worry about X because Y" is written down
> here. If you find a counter-example, please open a GitHub issue
> tagged `security`.

The contracts are **~280 lines of Tolk total**. Small surface area is
the single most important security control we have, and we are very
conservative about adding features.

---

## 1. Trust model

| Party       | What they can do                                                                                                      | What they cannot do                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `owner`     | change `feeBps` (capped at 1 %), transfer ownership, swap escrow code for _future_ deals, withdraw `accumulatedFees`. | Touch live deal escrows. Forge fee payouts.   |
| `maker`     | `Cancel` before deadline, `Reclaim` after, decide who can accept (`takerPinned`).                                     | Withdraw a Funded deal mid-flight.            |
| `taker`     | `Accept` an open deal (or a pinned deal where they are the pinned address).                                           | Modify any storage. Replay across deals.      |
| anyone else | Send TON to the Factory (treated as a donation: `accumulatedFees += value`).                                          | Anything else. Unknown ops abort the message. |

The owner is **not** trusted with deal funds. Funds for a given deal
live on the per-deal escrow address; the owner has no message handler
that drains an escrow. The owner is only trusted with the protocol fee
pot.

---

## 2. Assumptions we rely on

A1. **TON serializes per-contract.** A contract processes one inbound
message at a time. We therefore do not need traditional reentrancy
guards, but we still set the terminal `state` _before_ sending
outgoing payouts in `Accept` (belt-and-braces).

A2. **`createMessage(..., bounce: NoBounce)` cannot bounce back.** All
payouts are `NoBounce`. If the recipient cannot accept (extremely
rare for wallets), the funds simply sit on the escrow until the
maker `Reclaim`s after the deadline.

A3. **Escrow address depends on `dealId` + maker + terms.** Two deals
cannot collide because each is hashed with a unique `dealId` from
the monotonically-incrementing Factory counter.

A4. **Storage cell limit.** `EscrowStorage` is split (the deal terms
are in a referenced cell) so the root storage stays under the
1023-bit cell limit. The Tolk compiler verifies this on every
build.

A5. **Maker fronts the entire give amount on creation.** The Factory
asserts `in.valueCoins >= giveAmount + buffers` before forwarding,
so a malicious maker cannot deploy an underfunded escrow that
misleads takers.

A6. **`testing.setNow` is **not** an attack surface.** It exists only
in the emulator; production has the real chain clock.

---

## 3. Threats considered

### T1. Front-running on `Accept`

**Risk:** A bot watches mempool, sees a Funded deal, sends `Accept`
before the intended counterparty.
**Mitigation:** the optional `takerPinned` field. When set, only the
pinned address can accept. UI surfaces this prominently.
**Residual risk:** open deals (no pinned taker) are by design first-come.
For sensitive deals always set `takerPinned`.

### T2. Replay across deals

**Risk:** an attacker takes a signed `Accept` payload and replays it
against another escrow.
**Mitigation:** each escrow address is unique (depends on `dealId`),
and `Accept` is a single 32-bit opcode — there is no nonce or
signature to replay. The payload alone is harmless.

### T3. Locked / griefed funds

**Risk:** maker funds a deal, taker never shows up.
**Mitigation:** the deadline guarantees auto-refund via `Reclaim`. The
maker provides a maximum hold time at deal creation.

### T4. Cancel after acceptance

**Risk:** maker tries to `Cancel` after a taker already paid in.
**Mitigation:** `Accept` flips `state` to `Settled` _before_ outgoing
payouts. Any later `Cancel` hits the `WrongState` guard.

### T5. Underfunded `Accept`

**Risk:** taker sends `Accept` with less than `wantAmount`.
**Mitigation:** `assert in.valueCoins >= wantAmount` in
`PushkaEscrow.tolk`. Transaction aborts; no state change.

### T6. Truncated / malformed messages

**Risk:** crafted body fools the `match`.
**Mitigation:** the `lazy EscrowMessage.fromSlice(in.body)` deserializer
fails the entire transaction on tag mismatch. The `else` branch is
hard-coded to throw `InvalidMessage`.

### T7. Spoofed fee payouts

**Risk:** anyone can send `FeePayout` to Factory and inflate stats.
**Mitigation:** `accumulatedFees` only grows by the _actual nanotons_
that arrived in the message. A bogus sender donates real coins to the
protocol — a non-attack. The displayed dealId is informational only.

### T8. Owner abuse

**Risk:** a compromised owner sets a 1 % fee, sweeps the pot, and
disappears.
**Mitigation/Disclosure:**

- The hard cap is **1 %** (`FEE_BPS_HARD_CAP = 100`), enforced inside
  `SetFeeBps`. Setting 50 % is impossible.
- A new fee only applies to **new deals**. Already-Funded escrows
  carry their snapshotted `feeBps` and cannot be re-priced.
- The owner cannot drain a live escrow. Worst case the owner siphons
  `accumulatedFees` and rotates ownership. This is disclosed in the
  README and is the standard "protocol-fee admin key" risk pattern.

### T9. Self-destruct + bounce edge cases

**Risk:** in the `Accept` flow we send 3 outbound messages, the last
with `CARRY_ALL_BALANCE | DESTROY`. If one of the first two fails to
make a transaction (e.g. dest doesn't exist), modes 1 (PAY_FEES_SEPARATELY)
guarantee no value-leak: the contract pays forward fees from balance,
so the value arrives as-is.
**Mitigation:** all outbound payouts are `NoBounce`. If the recipient
account is uninitialised, the funds are still received (a fresh
account is created with that balance). We never `+SEND_MODE_IGNORE_ERRORS`
on the _first_ payout, so the entire `Accept` reverts atomically if
something is structurally wrong.

### T10. Storage rent draining a long-lived escrow

**Risk:** a deal is created with a very long deadline; storage rent
on TON gradually drains the escrow until insolvency.
**Mitigation:** the Factory adds `ESCROW_DEPLOY_BUFFER = 0.05 TON` of
storage reserve on top of `giveAmount`. At current rates 0.05 TON
covers > 10 years of escrow storage. We still recommend keeping
deadlines under 30 days in the UI.

---

## 4. Explicit non-goals (for this MVP)

- No support for Jetton (TEP-74) assets. Add in v1.1 — see roadmap.
- No oracle-driven settlement / limit orders. Add in v2 — see roadmap.
- No upgradability of the _Escrow_ contract code per deal. The Factory
  can ship a new Escrow code for _future_ deals via `SetEscrowCode`,
  but already-deployed escrows are immutable. This is a feature, not
  a limitation: it makes auditing predictable.

---

## 5. Audit checklist (for a reviewer)

Tick when verified:

- [ ] `PushkaEscrow.onInternalMessage` rejects unknown ops with
      `InvalidMessage`.
- [ ] `Accept` flips `state` to `Settled` **before** sending payouts.
- [ ] `Cancel` and `Reclaim` are mutually exclusive on `now() vs deadline`.
- [ ] `payOutAndDestroy` is only reachable from `Cancel` and `Reclaim`
      flows.
- [ ] `SetFeeBps` cannot exceed `FEE_BPS_HARD_CAP`.
- [ ] `WithdrawFees` cannot underflow `accumulatedFees`.
- [ ] `FeePayout` only ever _adds_ to `accumulatedFees` (no negation).
- [ ] `escrowAddressOf` get-method reproduces the deployed address
      exactly (verified via test `happy path Accept settles deal …`).
- [ ] `Acton.toml` lists both contracts with `depends = ["PushkaEscrow"]`
      on the Factory so the code cell is wired up by `build("PushkaEscrow")`.
- [ ] No `--no-verify`, `--no-gpg-sign`, or other safety bypass in git
      history.

---

## 6. Reporting a vulnerability

Please open a GitHub issue with the `security` label, **or** if it is
exploitable, email the maintainer directly first. We will respond
within 72 hours and credit reporters in `docs/SECURITY.md` upon fix.
