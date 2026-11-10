# GOODCOIN — Decision Log (ADRs)

Each entry: decision · why · alternatives rejected. Resolves DESIGN.md §10 and spec §20.

| # | Decision | Why | Rejected |
|---|---|---|---|
| D1 | **One contract**, internal modules `token`, `deeds`, `verify`, `epoch`, `treasury`, `vesting` | Mint is an internal fn → no cross-contract mint permission to abuse; settlement/burn/unlock atomic; one account for judges to inspect | 5 contracts (callback failure surface, more keys to lock) |
| D2 | **No admin.** All params in `new(config)`; no setters, no upgrade method; all full-access keys deleted after init | Spec §19.3: no admin-controlled economics. Verifiable with `near list-keys` | owner + timelock (still an admin) |
| D3 | **Epochs derived from time**: `epoch(t) = (t − genesis) / epoch_len` | No epoch-creation tx → no "multiple initialization"; works with zero operators | keeper-created epochs |
| D4 | **Permissionless, ordered settlement** after `end + dispute_window`; ≤ `MAX_SETTLE_PER_CALL` epochs per call | Streak depends on order; bounded gas; anyone can call | admin settle; settle on every tx (gas spikes) |
| D5 | **Claim-based rewards** (`claim_reward(epoch)`); settlement earmarks total **all-or-nothing** | O(1) settlement for any participant count; never partially distributes | batch push (gas risk, partial failure) |
| D6 | **Reward unit = per participant per successful epoch**; one submission per account per challenge | Matches spec §7.2 "every approved participant receives"; per-deed reward invites farming | per deed |
| D7 | **Streak multiplier**: reward = `base × (1 + 12.5% × min(streak_before, 8))` → 25 → 50 GOOD max | Makes the streak economically real: a break costs everyone their multiplier. This is the meme's "don't break the chain" mechanic. Base value stays 25 as specified | flat 25 (streak is cosmetic) |
| D8 | Challenge "reward amount" field **removed**; all rewards global | One economic rule, not per-organizer economics; organizers cannot print rewards | per-challenge rewards |
| D9 | Per-challenge targets **informational** (progress bars), not gating | Single collective mechanic is the epoch; avoids two interacting thresholds | gating |
| D10 | **Organizers fixed at init** (cannot be changed); organizers can only create challenges, never touch economics | Permissionless creation → spam challenges = farming vector | permissionless |
| D11 | Deed counts toward the epoch of its **3rd approval**; dispute window 24h after approval; opening a dispute uncounts it immediately; upheld-later deeds count in the resolution epoch (never retroactively) | Settled epochs are final; counts are deterministic | count by submission epoch (needs waiting for verification) |
| D12 | Attestors = reviewer pool (init) ∪ accounts with ≥1 finalized approved deed | Sock-puppet attestors must first earn an approval; bootstraps peer set | anyone (trivial self-verify via 3 accounts) |
| D13 | Approve/reject = first side to `min_attestations` (3) | Symmetric, deterministic | majority after deadline |
| D14 | Disputes resolved by reviewer-pool majority (`dispute_quorum` votes) excluding submitter + original attestors; init requires pool ≥ min_att + quorum + 1 | Always resolvable; separation of duties | token vote |
| D15 | Failure burn = 0.1% of **locked** treasury (pro rata across buckets); spendable funds untouched | Burn hits the commons' future, not approved commitments | burn spendable too |
| D16 | Success with insufficient reserve → status `SucceededNoReserve`: streak +1, no rewards, logged | Never partial distribution; the community still achieved the goal | fail the epoch |
| D17 | Genesis mints **only** the 250M treasury (held by the contract). Reserve 400M and 350M vested allocations are **unminted counters** | Spec §8.3: don't mint into circulation artificially | mint all 1B |
| D18 | Vesting (linear, from genesis): Liquidity 150M 12 mo, no cliff · Ecosystem 100M 24 mo · Contributors 50M 6-mo cliff then linear to 24 mo · Security 50M 24 mo. Beneficiary claims via `claim_vested` | Transparent, predefined release; no discretionary wallet | lump allocations |
| D19 | Cap enforced on **cumulative mint** (burned tokens never re-mintable) | S(t) ≤ 1B always; burn is permanent | cap on current supply |
| D20 | Governance: one account one vote; voter eligible iff first approved deed finalized **before voting start**; quorum + threshold + per-proposal + per-epoch caps; permissionless execution; single tranche | Eligibility fixed before voting; no admin transfer path | token-weighted, milestones (cut for MVP) |
| D21 | Storage paid by caller (attached deposit, excess refunded) | No public testnet relayer exists (verified); contract-paid storage = DoS vector. Cost ≈ 0.01 NEAR | relayer (future work) |
| D22 | Evidence = public URI + SHA-256 (computed client-side) on-chain; no files stored by us | No PII on-chain; no hosted storage key to leak | IPFS pinning (needs secrets) |
| D23 | No custom indexer: contract keeps bounded append-only activity log; tx links via NearBlocks v3 testnet API | Fewer moving parts; every number comes from contract state | Neon indexer (stretch) |
| D24 | **Testnet only**, two deployments of the same wasm: `production config` (spec params) and `demo config` (minutes-long epochs, tiny targets), both labeled in UI | Full success→fail→burn loop demonstrable live; honest labeling (spec §17) | mainnet (not required, Q-010) |
| D25 | Rate limits per account per epoch: 5 submissions, 50 attestations, 3 disputes | Bounds spam and storage growth | none |
