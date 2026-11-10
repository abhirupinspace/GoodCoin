# GOODCOIN Security, Threat Model & Known Limitations

This file is meant to be read in full before trusting the system. GOODCOIN is a hackathon MVP
deployed on **testnet only**. It has not been audited.

## 1. Trust model in one table

| Component | Trusted? | Why / mitigation |
|---|---|---|
| Contract code | Verify, don't trust | Open source, 58 unit tests + live E2E, on-chain `check_invariants` |
| Deployer | **Not trusted after deploy** | No owner field, no setters, no upgrade method; all full-access keys deleted (`deploy/deploy.sh --lock`). Check with `near account list-keys <contract> network-config testnet now` → empty |
| Parameters | Fixed | Set in `new`; readable via `get_config` |
| Organizers | Partially trusted | Can only create challenges; cannot change rewards, targets, treasury |
| Reviewer pool | **Trusted for MVP** | Fixed at init; can attest and resolve disputes. A colluding pool can approve fake deeds |
| Frontend / API routes | Not trusted | Read-only views + wallet-signed calls; never decides an economic outcome |
| NearBlocks API | Not trusted | Only used to find tx hashes for links |
| Evidence hosts | Not trusted | We store only URI + SHA-256; anyone can re-hash and compare |

## 2. Sybil resistance — what it does and does not do

**Accounts are not humans.** Nothing in GOODCOIN proves unique personhood. What exists:

| Control | Effect |
|---|---|
| One submission per account per challenge | Farming needs many accounts *and* many challenges |
| Organizers fixed at init | Attacker cannot create challenges to farm |
| 3 distinct attestors, no self-attestation | One account cannot approve itself |
| Attestors must be reviewers or verified contributors | A fresh sock-puppet cannot attest; it must first get a deed approved by others |
| Global evidence-hash uniqueness | Stops naive replay; trivially bypassed by changing one byte — human attestors are the real check |
| Dispute window (24h) + separate reviewer quorum | Bad approvals can be reversed before they count |
| Rate limits per account per epoch (5 submissions, 50 attestations, 3 disputes) | Bounds spam and storage growth |
| No staking / purchase required | Accessibility (spec §10) — but participation is cheap, so Sybil cost is low |

**Known attack that works:** a ring of ≥ 3 colluding *verified* accounts can approve any number
of fake deeds from sock-puppets, up to rate limits and challenge capacity. Each approved puppet
then becomes a verified attestor, so the ring grows. The simulator quantifies the payoff
(`docs/SIMULATION.md`, "fake-attestation ring"): to flip one pessimistic epoch to success needs
~25 sock-puppets and 55 fake deeds; over 8 epochs puppets extract ≈ 7,187 GOOD. The streak
multiplier caps per-puppet payoff at 50 GOOD/epoch, which is why we rejected the reserve-share
reward policy (16–32× higher puppet payoff).

**Mitigations that remain:** honest reviewers can dispute within 24h; everything is public, so
rings are visible in `list_submissions` / `list_accounts`. **Future work:** personhood credentials
(e.g. proof-of-personhood attestations), organization attestations, reputation-weighted
attestation, slashing bonds for disputes, private credentials in a TEE.

The same caveat applies to treasury governance: one-account-one-vote with "verified before voting
start" eligibility raises the cost of vote-stuffing but does not prevent it.

## 3. Risk register

| # | Risk | Control | Evidence |
|---|---|---|---|
| R1 | Unauthorized mint | One private `internal_mint`; only callers are `claim_reward` and `claim_vested`; no public mint | code review: `grep -n internal_mint contract/src` |
| R2 | Supply cap violation | `total_minted + amt ≤ MAX_SUPPLY` check; cap on cumulative mint; reserve + vesting + genesis = 1B by construction | invariant 2 & 3; `vesting_linear_cliff_and_cap` |
| R3 | Double settlement | Strict `next_to_settle` cursor; status written once | `double_settlement_impossible` |
| R4 | Premature settlement | `now ≥ end + dispute_window` | `premature_settlement_rejected` |
| R5 | Duplicate rewards | `claimed` set per (epoch, account) | `double_claim_rejected` |
| R6 | Partial distribution / reserve exhaustion | All-or-nothing earmark at settlement; claims draw from earmark | `reserve_exhaustion_is_all_or_nothing` |
| R7 | Epoch manipulation / multiple init | Epochs derived from block time; `#[init]` once; no setters | `settlement_is_bounded_and_ordered` |
| R8 | Unresolved disputes paid | Disputed deeds are uncounted the moment the dispute opens | `disputed_deed_earns_nothing` |
| R9 | Treasury theft | Only `finalize_proposal` moves treasury funds; caps per proposal, per epoch, per bucket; executed once | `proposal_limited_by_bucket`, `per_epoch_funding_cap` |
| R10 | Attestation manipulation | No self-attest, one per account, eligibility | verification tests |
| R11 | Dispute manipulation | Submitter, opener and original attestors excluded; pool size guarantees resolvability | `original_attestor_cannot_judge_dispute`, `opener_cannot_judge_dispute`, `config_requires_resolvable_disputes` |
| R12 | Integer overflow | `overflow-checks = true` in release; u128 everywhere; vesting uses quotient/remainder split (a real overflow found by tests and fixed) | `vesting_linear_cliff_and_cap` |
| R13 | Gas exhaustion | Claim-based rewards; ≤ 16 epochs per settle; paginated views; bounded Vecs (≤ 6 attestors) | `settlement_is_bounded_and_ordered` |
| R14 | Storage exhaustion / DoS | Every storing call charges its exact bytes (after flushing buffered collections — a real bug found by tests and fixed) | `storage_must_be_paid` |
| R15 | Malformed evidence | Hash 64 lowercase hex; URI scheme allow-list, ≤ 512, no whitespace | `malformed_hash_rejected`, `malformed_uri_rejected` |
| R16 | Reentrancy / callback failure | No external calls in protocol logic; only the standard FT resolver, which also feeds burn accounting | `token.rs` |
| R17 | Replay | NEAR nonces per access key; protocol keys are (epoch, account), (challenge, account), (proposal, account) | — |
| R18 | Hidden admin | No owner; keys deleted; `list-keys` empty | deploy log |
| R19 | Frontend shows unconfirmed state | UI waits for final outcome, shows tx hash, re-reads views | `web/` |
| R20 | SSRF via evidence hashing route | `/api/hash` accepts http(s) only, blocks private/loopback ranges, 5 MB / 10 s caps | `web/` tests |
| R21 | Treasury account unregisters | `storage_unregister` refuses the contract account | `treasury_cannot_unregister` |

## 4. Known limitations (honest list)

1. **Testnet only.** No mainnet deployment; NEAR Intents is not used (no testnet exists for it).
2. **Real-world truth is not provable on-chain.** Attestations are opinions of accounts; transfers are provable, impact is not.
3. **Reviewer pool is a trusted, fixed set** (6 accounts controlled by the team in the testnet deployment).
4. **Economics are small relative to supply.** At spec parameters a failed epoch burns ~250,000 GOOD vs ≤ 2,250 GOOD minted per success (`docs/SIMULATION.md`). We kept the spec values and disclosed this rather than inflating rewards (which would raise Sybil payoff proportionally).
5. **Users pay a small NEAR storage deposit** (~0.01–0.05 NEAR, excess refunded). No public testnet relayer exists; meta-transactions are future work.
6. **Upheld disputes count in the resolution epoch**, not the original one (settled epochs are final). A deed upheld after its epoch ended may count in a later epoch.
7. **A disputed deed that had granted "verified" status removes it**; the account regains it with its next finalized approval or an upheld dispute.
8. **Vesting beneficiaries on testnet are team-controlled accounts** — placeholders for real multisigs.
9. Not audited. Unit tests use the near-sdk mocked blockchain; the live E2E script is the integration test.
