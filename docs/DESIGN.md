# GOODCOIN — Design Review (pre-implementation)

Status: APPROVED · 2026-11-11 · open questions resolved in [DECISIONS.md](DECISIONS.md); parameters validated in [SIMULATION.md](SIMULATION.md) · Track `memecoins` · Deadline 2026-11-14T23:59Z

Legend: **[SPEC]** given by spec · **[PROPOSED]** my implementation choice · **[OPEN]** needs decision · **[VERIFY]** assumption to confirm at build time

---

## 1. GOODCOIN in one paragraph

NEP-141 memecoin whose mint is gated by a *collective* condition. Each 7-day epoch, the community must reach ≥100 peer-verified good deeds AND ≥50 unique participants. Success → each approved participant can claim 25 GOOD, 1,000 GOOD of public-goods treasury unlocks for proposals, streak +1. Failure → nothing minted, streak resets, 0.1% of the locked treasury burns. All rules live in one immutable contract with no admin key. The mechanic judges score: **the community's streak is the meme, failure has a visible cost (burn), success has a visible payout (mint + unlocked funding).**

## 2. Product architecture

```
 Next.js app (Vercel) ── near-api-js 7.x + @hot-labs/near-connect ──► NEAR RPC (testnet)
   │  view calls: all metrics, epochs, challenges, submissions, treasury       │
   │  change calls: submit / attest / dispute / settle / claim / vote          ▼
   │                                                          good.<team>.testnet  (single contract, keys deleted)
   └─ /api/activity (Next route) ──► NearBlocks v3 testnet API  → tx hashes for activity log links
 Evidence: off-chain URL (GitHub PR, public image/video link) + client-computed SHA-256 → on-chain
```

Modules (spec §4) → backing state:

| Module | Backed by |
|---|---|
| Dashboard | `get_stats`, `get_epoch(current)`, `get_supply` views |
| Challenges | `list_challenges`, `get_challenge` |
| Submit | `submit_deed` (payable for storage) |
| Verification | `list_pending`, `attest`, `open_dispute`, `vote_dispute` |
| Rewards/Token activity | on-chain bounded activity log (`list_activity`) + NearBlocks tx links |
| Treasury | `get_treasury`, `list_proposals`, `vote`, `execute_proposal` |
| Leaderboard | per-account counters in contract (`get_account_stats`) |
| Transparency | `get_config` (every immutable param), `near list-keys` shows no full-access keys |

**[PROPOSED] No custom indexer / Neon for MVP.** Spec allows (not requires) a backend. All metrics are contract views; the contract keeps an append-only activity log (mint, burn, settle, transfer, unlock). Only tx hashes come from NearBlocks v3 (testnet v1 retired 2026-11-05; v3 keyless works, tested). Removes a whole service and a source of fake/stale data. Neon indexer = stretch goal.

## 3. Smart contract architecture

**[PROPOSED] One contract, five internal Rust modules** (`token`, `deeds`, `verify`, `epoch`, `treasury`). Justification (spec §13 allows combining):
- Mint authority is an internal function call, not a cross-contract permission → no "who may mint" attack surface, no callback failure paths.
- Settlement, reward earmarking, unlock and burn are atomic in one receipt.
- One account to lock, one address for judges to inspect.

Stack [VERIFIED 2026-11-11]: `near-sdk` 5.30.1, `near-contract-standards` 5.30.1 (`FungibleToken`, `StorageManagement`, `FtMint`/`FtBurn` NEP-297 events, NEP-148 metadata), `cargo-near` 0.23.0, Rust 1.95 (MSRV; local is 1.93 → install via `rust-toolchain.toml`), tests: `near-sandbox` 0.4 + `near-api` 0.8 with `fast_forward`. Template from `cargo near new` (overflow-checks on).

**Immutability [PROPOSED]:** all params passed to `#[init] new(config)`; no setter methods; no upgrade/migrate method; after init delete every full-access key (`near account delete-keys`). README shows `near list-keys` → empty. Two deployments with different immutable configs:
- `good.<team>.testnet` — spec parameters (7-day epoch, 100/50 targets).
- `gooddemo.<team>.testnet` — **clearly labeled demo config** (e.g. 10-min epoch, 3 deeds / 2 participants, 10-min dispute window) so the full success→fail→burn loop is demonstrable live. Same wasm, same code hash.

Key entities (abridged):

```
Config      { epoch_ns, genesis_ns, deeds_target, participants_target, reward_per_participant,
              pg_unlock_per_success, burn_bps(=10), min_attestations(=3), dispute_window_ns,
              reviewer_pool[], organizers[], vesting[], gov{quorum, threshold_bps, max_per_proposal, max_per_epoch},
              rate_limits{subs_per_epoch, attests_per_epoch, disputes_per_epoch} }
Challenge   { id, name, desc, category, instructions, start, end(=submission deadline), verify_deadline,
              max_approved, evidence_req, status(derived), organizer }
Submission  { id, challenge_id, account, evidence_hash[32], evidence_uri, meta_uri, ts,
              status, approvals[], rejections[], approved_at, approval_epoch, dispute_id?, rewarded }
EpochRecord { id, approved_deeds, participants(count), status: Open|Succeeded|Failed|SucceededNoReserve,
              reward_earmarked, burned, pg_unlocked }
```

## 4. Token allocation & supply analysis

[SPEC] cap 1B GOOD, 24 decimals, allocations 40/25/15/10/5/5.

[PROPOSED] representation:

| Allocation | Amount | At genesis | Release |
|---|---:|---|---|
| Community reward reserve | 400M | **not minted** (`reserve_remaining` counter) | minted only by `claim_reward` after a successful epoch |
| Public-goods treasury | 250M | **minted to contract's own account**, split into locked buckets 125M / 75M / 50M | +1,000/success unlocks to spendable; spent only via executed proposals; burns on failure |
| Liquidity 150M, Ecosystem 100M, Contributors 50M, Security 50M | 350M | **not minted** | fixed vesting schedules (beneficiary, start, cliff, duration) set at init; beneficiary calls `claim_vested` |

Accounting (all on-chain views):
- `total_minted ≤ 1B` hard check in the single internal `mint()`; burned tokens are **never re-mintable** (cap is on cumulative mint).
- `S(t) = S(0) + M(t) − B(t)`, S(0) = 250M. Invariant test: `total_supply == Σ balances` and `total_minted − total_burned == total_supply`.
- Circulating = S(t) − contract-held treasury − earmarked-unclaimed (not yet minted, so excluded automatically).
- Remaining mintable = reserve_remaining + Σ unvested.

**Finding — spec parameters are economically inert (do not hide this):**

| 60 days (8 settled epochs) | Minted (rewards) | PG unlocked | Burned | Supply Δ |
|---|---:|---:|---:|---:|
| Optimistic (8 success, ~90 ppl) | ~18,000 | 8,000 | 0 | +0.007% |
| Base (6 success, ~55 ppl) | ~8,250 | 6,000 | ~499,750 | −0.19% |
| Pessimistic (2 success) | ~2,500 | 2,000 | ~1,496,253 | −0.60% |

- One failed epoch burns ~250,000 GOOD ≈ **180× what a successful epoch mints** (1,375). Failure dominates economics.
- Reserve (400M) at ~1.4k/week lasts millennia → "reserve exhaustion" is not a real risk at these params; PG treasury unlocks 1k/week vs 250M locked.
- Rewards of 25 GOOD on 1B supply are tiny — meaningful only if price is high.
- Options to evaluate in simulator (not deciding now): (a) keep spec values; (b) reward pool = fixed % of `reserve_remaining` per success split among participants (symmetric with the % burn, geometric decay, never exhausts); (c) burn a fixed amount instead of %. → **[OPEN] Q1**

## 5. Weekly reward mechanism

- **Epochs are derived from time, no admin creates them [PROPOSED]:** `epoch(t) = (t − genesis_ns) / epoch_ns`. No "multiple initialization" possible.
- **Counting [PROPOSED]:** a submission counts toward the epoch in which it receives its 3rd approval (`approval_epoch`). Unique participants = accounts with ≥1 counted approval in that epoch.
- **Dispute interplay [PROPOSED]:** a dispute may be opened only within `dispute_window` (24h) after approval. Opening it immediately decrements the approval epoch's counts. If the dispute later upholds the deed, it counts toward the epoch in which it is resolved (never retroactively).
- **Settlement [PROPOSED]:** `settle_epoch()` — permissionless, callable once `now ≥ end(N) + dispute_window`; epochs settle strictly in order (streak is order-dependent); each call settles up to K pending epochs (bounded gas). Status set once → no double settlement.
  - Success (both targets): earmark `participants × 25` from reserve **all-or-nothing**; if reserve insufficient → `SucceededNoReserve` (streak still +1, no rewards, logged) **[OPEN] Q6**; unlock 1,000 to spendable buckets 50/30/20; streak+1, longest = max.
  - Failure: streak = 0; burn 0.1% of *locked* treasury pro-rata across buckets; `FtBurn` event.
- **Claim-based distribution [PROPOSED]:** `claim_reward(epoch)` by each eligible participant → mint 25 + `FtMint`. O(1) settlement regardless of participant count (no gas risk); per-(account, epoch) claimed flag prevents duplicates. Earmarked rewards stay claimable indefinitely.
- **Per-challenge cap [SPEC]** satisfied structurally: one submission per account per challenge.
- **60 days contains 8 full epochs + 4 days** (the 9th is unsettled).

## 6. Verification & Sybil threat model

[PROPOSED] rules:
- Attestor eligibility: reviewer pool (fixed at init) ∪ accounts with ≥1 finalized approved deed (bootstraps a peer set; makes sock-puppet attestors cost real deeds).
- 3 distinct approvals → Approved; 3 rejections → Rejected (first to 3). No self-attest, one attestation per account per submission, permanent record.
- Duplicate evidence: global `evidence_hash → submission_id` map rejects reuse.
- Rate limits per account per epoch (submissions, attestations, disputes).
- Dispute: any eligible attestor (not the submitter) within window; resolved by majority of `dispute_quorum` votes from reviewer pool members who are neither submitter nor original attestors. Pool size must be ≥ min_attestations + dispute_quorum + 1 to always be resolvable (init check).

| Threat | Mitigation | Residual (state in README) |
|---|---|---|
| 1 person, N accounts submits + attests own deeds | attestors must have own approved deed or be reviewers; 3 distinct; disputes | Ring of 3 colluding *earned* attestors can approve anything. Not Sybil-proof. |
| Farming across many challenges | organizers fixed at init; 1 sub/account/challenge; per-epoch sub cap | trusted organizer set (centralization point, but cannot touch economics) |
| Duplicate/recycled evidence | hash uniqueness | trivially bypassed by altering a byte; real check is human attestors |
| Griefing disputes | per-epoch dispute cap; only eligible attestors | reviewers can still be spammed within caps |
| Reviewer collusion | separation from original attestors | pool is trusted for MVP |
| Fake real-world impact | — | contract proves transfers/attestations only, never the deed itself |

Accounts ≠ humans. No personhood claim anywhere in UI.

## 7. Treasury & governance

- Buckets [SPEC] community 50% / environment 30% / education+OSS 20%, each with `locked` and `spendable`.
- Voters [PROPOSED]: accounts whose first approved deed was finalized **before the proposal's voting start** (eligibility fixed before voting; one account one vote). Same Sybil caveat as §6.
- Proposal: anyone eligible creates {name, desc, category, amount ≤ max_per_proposal, beneficiary, evidence_uri, voting window}. Single tranche for MVP — **milestone tranches cut [OPEN] Q8**.
- Execution: permissionless `execute_proposal` after voting end if quorum & threshold met and amount ≤ category spendable and ≤ epoch funding cap → internal FT transfer to beneficiary (must be storage-registered). Executed once.
- No other path moves treasury tokens. No admin withdrawal.

## 8. 60-day simulation methodology

- Python (uv), numpy + matplotlib, deterministic seeds, outputs PNG + CSV + markdown table into `sim/out/`.
- Model mirrors contract rules exactly (same epoch math, all-or-nothing earmark, % burn of locked, unlock split, streak).
- Weekly behavior: participants ~ NegBin(mean μ_p, dispersion k), deeds ~ participants × Poisson-ish deeds-per-person, approval rate, dispute rate. Daily granularity for supply curves.
- **Spec inconsistency flagged:** with *constant* 110 deeds / 55 people every week, base gives 8/8 successes, not 6; pessimistic at mean 25 people can never hit 50. So "6 successes" / "2 successes" must come from variance. Simulator runs Monte Carlo (1,000 runs) and reports the *distribution* of successes; it does not force counts.
- Scenarios: optimistic / base / pessimistic (spec means) + adversarial: participation spike (10×), collapse (→0 after week 3), duplicate-submission flood (rejected by contract → measures attestor load), fake-attestation ring (k colluding accounts approve fakes), reserve exhaustion stress (reward scaled up to find break point), treasury depletion (repeated failures over years), repeated failures (60 days all fail).
- Outputs per spec §15 (supply, treasury, reserve, streak charts, comparison table) + parameter options from §4 side by side.

## 9. Security risk register

| # | Risk | Control | Test |
|---|---|---|---|
| R1 | Unauthorized mint | single private `mint()`; callers: `claim_reward`, `claim_vested` only | unit + invariant |
| R2 | Cap violation | `total_minted + amt ≤ cap` require; u128 checked math | property test |
| R3 | Double settlement / double claim | status enum set once; claimed set per (acct, epoch) | unit + sandbox |
| R4 | Premature settlement | `now ≥ end + dispute_window` | sandbox fast_forward |
| R5 | Epoch manipulation | epochs from block time only; no setters | unit |
| R6 | Callback/reentrancy | no cross-contract calls except `ft_transfer_call` resolver (standard) | standard tests |
| R7 | Storage exhaustion | every storing call payable, charges actual bytes used × 1e19, refunds excess | unit |
| R8 | Gas exhaustion | claim-based rewards; bounded settle loop; paginated views | sandbox |
| R9 | Treasury theft | only `execute_proposal`; caps; executed flag | unit |
| R10 | Attestation/dispute manipulation | §6 rules | unit |
| R11 | Malformed evidence | length limits on URIs/strings; hash exactly 32 bytes | unit |
| R12 | Admin backdoor | no owner field, keys deleted, no upgrade method | `list-keys` in README |
| R13 | Frontend shows unconfirmed state | re-read view after tx final; show tx hash | manual |
| R14 | Timestamp edge (exact boundary) | half-open intervals `[start, end)` | unit |

## 10. Decisions (resolved — see DECISIONS.md for rationale)

Resolved 2026-11-11: Q1 → keep spec values + capped streak multiplier (D7, SIMULATION.md); Q2 per participant per epoch (D6, D8); Q3 informational (D9); Q4 organizers fixed (D10); Q5 locked only (D15); Q6 yes (D16); Q7 team testnet accounts + D18 schedules; Q8 cut; Q9 caller pays storage (D21); Q10 links + hash (D22); Q11 skipped (D23); Q12 testnet (D24).

Original questions:

1. **Economics**: keep spec numbers (inert, burn-dominated) or pick from sim options? → decide after sim.
2. **Reward unit**: 25 GOOD per participant per epoch (my default) vs per approved deed? Drop per-challenge "reward amount" field (all rewards global)?
3. **Challenge targets** (min participants / min approved per challenge): informational only (default) or gating?
4. **Who creates challenges**: organizer list fixed at init (default) vs permissionless?
5. **Burn base**: locked treasury only (default) vs locked + spendable?
6. **Reserve insufficient** on success: streak still +1, no rewards (default)?
7. **Other allocations**: vesting schedules + beneficiaries — which accounts/terms? For testnet use team accounts?
8. Cut treasury milestone tranches for MVP?
9. **Storage cost**: users attach ~0.01 NEAR on submit/claim (default; conflicts mildly with "no purchase needed") vs run own relayer (no public testnet relayer exists)?
10. **Evidence**: links + hash only (default) vs file upload (IPFS/Pinata/Vercel Blob → needs key)?
11. Neon indexer: skip for MVP (default)?
12. Mainnet at all? Default: testnet only (allowed by Q-010).

## 11. Implementation plan (3.5 days)

| When (UTC) | Deliverable |
|---|---|
| Nov 11 | Approve design · simulator + charts · pick params |
| Nov 12 | Contract: token, vesting, challenges, submissions, attestations, epochs, settle, claim, burn + unit tests |
| Nov 13 AM | Disputes, treasury/governance, sandbox integration tests (fast_forward) · deploy both testnet instances · delete keys |
| Nov 13 PM – Nov 14 AM | Next.js frontend: dashboard, challenges, submit, verify, treasury, activity, leaderboard |
| Nov 14 | Scripted demo run on gooddemo, record video, README, LICENSE (MIT) · **you**: make repo public, X post, confirm submission payload · target submit by ~18:00 UTC |

Cut order if behind: leaderboard → dispute UI (contract stays) → vesting UI → proposal creation UI (seed via CLI).

## 12. References to consult at build time

- NEP-141 https://github.com/near/NEPs/blob/master/neps/nep-0141.md · NEP-145 (nep-0145.md) · NEP-148 (nep-0148.md) · NEP-297 (nep-0297.md)
- near-sdk-rs + examples/fungible-token https://github.com/near/near-sdk-rs
- near-contract-standards fungible_token/{core_impl,storage_impl,events}.rs
- cargo-near https://github.com/near/cargo-near
- near-sandbox-rs https://github.com/near/near-sandbox-rs (fast_forward)
- Locking contracts https://docs.near.org/smart-contracts/release/upgrade
- Storage staking https://docs.near.org/protocol/storage/storage-staking · Gas https://docs.near.org/protocol/transactions/gas
- near-cli-rs https://docs.near.org/tools/cli
- Wallet login (near-connect) https://docs.near.org/web3-apps/tutorials/wallet-login · https://docs.near.org/tools/near-connect
- NearBlocks API v3 (testnet) https://api-testnet.nearblocks.io/v3
- agent-skills near-smart-contracts https://github.com/near/agent-skills/tree/main/skills/near-smart-contracts

[VERIFY] at build: `fast_forward` seconds-per-block; cargo-near max rustc; exact `storage_balance_bounds`; near-connect API for Next.js App Router.
