# GOODCOIN Contract Reference

Single Rust contract (`contract/`), near-sdk 5.30.1, NEP-141 / NEP-145 / NEP-148 / NEP-297.
Units: balances are yocto-GOOD strings (24 decimals); timestamps are nanosecond strings (`U64`).

Every operation is listed with **pre** (preconditions, else panic), **state** (changes), **events**,
**economics** (effect on supply/treasury), and **tests** (unit tests in `contract/src/tests.rs`;
`E2E` = live testnet run in `deploy/demo_e2e.sh`).

## Who can do what

| Role | Defined by | Can |
|---|---|---|
| Anyone | — | read every view, `settle_epochs`, `finalize_proposal`, `storage_deposit`, FT transfers |
| Participant | any account | `submit_deed`, `claim_reward` (if counted in a successful epoch) |
| Reviewer | `config.reviewer_pool` (fixed at init) | `attest`, `open_dispute`, `vote_dispute` |
| Verified contributor | has an approved deed whose dispute window passed (or dispute upheld) | `attest`, `open_dispute`, `create_proposal`, `vote_proposal` (if verified before voting start) |
| Organizer | `config.organizers` (fixed at init) | `create_challenge`, `update_challenge` (draft only), `publish_challenge` |
| Vesting beneficiary | `config.vesting[i].beneficiary` | `claim_vested(i)` |
| Owner / admin | **does not exist** | — |

There is no method that changes `config`, mints outside `claim_reward`/`claim_vested`, moves treasury
funds outside `finalize_proposal`, or upgrades the code. Deployment deletes all full-access keys
(`deploy/deploy.sh --lock`).

## Initialization

### `new(config: Config, icon: Option<String>)` — `#[init]`, once
- **pre**: full `validate_config`: targets > 0, deeds_target ≥ participants_target, bps bounds,
  `reviewer_pool` unique and ≥ `min_attestations + dispute_quorum + 1` (disputes always resolvable),
  organizers non-empty, Σ vesting = 350M exactly, cliff ≤ duration, `5000 < threshold_bps ≤ 10000`,
  `max_per_proposal ≤ max_per_epoch`, rate limits > 0.
- **state**: `genesis_ns = block_timestamp`; mints 250M to the contract's own account; buckets
  locked 125M / 75M / 50M; `reserve_remaining = 400M`; `total_minted = 250M`.
- **events**: `ft_mint` (genesis-treasury). Activity `GenesisMint`.
- **tests**: `genesis_allocation`, `config_rejects_bad_vesting_total`, `config_requires_resolvable_disputes`.

## Challenges — `deeds.rs`

### `create_challenge(input) -> u32` — payable (storage)
- **pre**: caller ∈ organizers; lengths (name 2–80, texts ≤ 1000/2000, category ≤ 32);
  `start < end ≤ verification_deadline`; `max_approved > 0`; deposit ≥ storage used.
- **state**: new `Challenge { state: Draft }`. **events**: `challenge_created`.
- **tests**: `only_organizers_create_challenges`.

### `update_challenge(id, input)` — payable
- **pre**: caller is its organizer; state == Draft. **tests**: `published_challenge_is_frozen`.

### `publish_challenge(id)`
- **pre**: organizer; Draft; `end > now`. **state**: Published (frozen forever). **events**: `challenge_published`.

Phase (derived, `get_challenge().phase`): Draft → Published (before start) → Active → Verification
(after `end`, before `verification_deadline`) → Finalized → Archived (epoch containing the deadline settled).

### `submit_deed(challenge_id, evidence_hash, evidence_uri, description) -> U64` — payable
Layer-1 automated checks:
- **pre**: Published, `start ≤ now < end`; `approved < max_approved`; if `OpenTo::VerifiedContributors`,
  caller verified; **one submission per (challenge, account)**; **evidence hash globally unique**;
  hash = 64 lowercase hex; URI scheme ∈ {https, http, ipfs, ar}, ≤ 512 chars, no whitespace;
  ≤ `submissions_per_epoch` this epoch; deposit ≥ storage.
- **state**: `Submission { Pending }`, indexes, account stats. **events**: `deed_submitted`.
- **tests**: `draft_rejects_submissions`, `submission_before_start`, `submission_after_deadline`,
  `one_submission_per_challenge`, `duplicate_evidence_rejected`, `malformed_hash_rejected`,
  `malformed_uri_rejected`, `storage_must_be_paid`, `submission_rate_limit`, `verified_only_challenge`. E2E step 2.

## Verification — `verify.rs`

### `attest(submission_id, approve: bool)` — payable
- **pre**: caller ∈ reviewer_pool or verified contributor; status Pending; caller ≠ submitter;
  caller has not attested this submission; `now < verification_deadline`; ≤ `attestations_per_epoch`.
- **state**: push to approvals/rejections. On the `min_attestations`-th (3rd) approval:
  status Approved, `approved_at = now`, `approval_epoch = current epoch`, epoch counters
  (`approved_deeds += 1`, `participants += 1` if first deed of that account this epoch),
  submitter becomes verified at `now + dispute_window`. On the 3rd rejection: Rejected (final).
  Approval also requires `challenge.approved < max_approved`.
- **events**: `attested`, `deed_approved` / `deed_rejected`.
- **tests**: `three_distinct_attestations_approve_and_count`, `self_attestation_rejected`,
  `duplicate_attestation_rejected`, `sock_puppet_cannot_attest`, `verified_contributor_can_attest_after_window`,
  `three_rejections_reject`, `attestation_after_deadline`. E2E step 3.

### `open_dispute(submission_id, reason) -> U64` — payable
- **pre**: caller eligible attestor ≠ submitter; status Approved; never disputed before;
  `now < approved_at + dispute_window`; approval epoch not settled (implied by timing);
  ≤ `disputes_per_epoch`.
- **state**: deed **uncounted immediately** from its epoch; status Disputed; submitter loses verified
  status if this deed granted it. **events**: `dispute_opened`.
- **tests**: `dispute_uncounts_and_overturn_rejects`, `dispute_after_window`, `one_dispute_per_submission`,
  `disputed_deed_earns_nothing`. E2E step 7.

### `vote_dispute(dispute_id, valid: bool)` — payable
- **pre**: caller ∈ reviewer_pool; not submitter, not opener, not an original attestor; not voted; open.
- **state**: first side to `dispute_quorum` wins. Upheld → Approved again, **counted in the current
  epoch** (settled epochs never change). Overturned → Rejected. Either way `finalized_at = now`.
- **events**: `dispute_vote`, `dispute_resolved`.
- **tests**: `upheld_dispute_recounts_in_resolution_epoch`, `original_attestor_cannot_judge_dispute`,
  `opener_cannot_judge_dispute`.

## Collective Milestone Engine — `epoch.rs`

Epoch `e` = `[genesis + e·D, genesis + (e+1)·D)`. No transaction creates epochs.

### `settle_epochs() -> u32` — anyone
- **pre**: `now ≥ end(next_to_settle) + dispute_window` (else panics with the time it becomes possible).
- **state**, per epoch in order (max 16 per call):
  - **Success** iff `approved_deeds ≥ deeds_target` **and** `participants ≥ participants_target`:
    `rpp = base_reward × (1 + streak_bonus_bps/10000 × min(streak, streak_bonus_cap))`;
    if `rpp × participants ≤ reserve_remaining` → move it to `reserve_earmarked`, status Succeeded,
    else status SucceededNoReserve (no rewards, no partial payout).
    Unlock `pg_unlock_per_success` from locked → spendable (50/30/20). `streak += 1`, `longest = max`.
  - **Failure**: status Failed, `streak = 0`, burn `failure_burn_bps` of every locked bucket.
- **events**: `epoch_settled`; `ft_burn` (memo `failed-epoch`) on failure.
- **economics**: success earmarks (mints later on claim); failure reduces total supply.
- **tests**: `successful_epoch_mints_unlocks_and_streaks`, `epoch_fails_when_both_targets_missed`,
  `epoch_fails_when_only_deeds_target_met`, `epoch_fails_when_only_participants_target_met`,
  `failed_epoch_burns_and_resets_streak_but_keeps_record`, `streak_multiplier_grows_and_caps`,
  `premature_settlement_rejected`, `double_settlement_impossible`, `settlement_is_bounded_and_ordered`,
  `reserve_exhaustion_is_all_or_nothing`. E2E steps 4 and 8.

### `claim_reward(epoch) -> U128` — payable (registers the caller if needed)
- **pre**: epoch settled with status Succeeded; caller had ≥ 1 counted deed in it; not claimed.
- **state**: claimed flag; `reserve_earmarked -= rpp`; mint `rpp`. **events**: `ft_mint` (epoch-reward), `reward_claimed`.
- **tests**: `double_claim_rejected`, `claim_before_settlement_rejected`, `non_participant_cannot_claim`,
  `claimable_epochs_view`, `reward_transfer_works`. E2E step 5.

## Treasury & governance — `treasury.rs`

### `create_proposal(input) -> U64` — payable
- **pre**: caller verified contributor; `0 < amount ≤ max_per_proposal`; voting duration within
  `[min_voting_ns, max_voting_ns]`; beneficiary ≠ contract; text/URI validation.
- **state**: Proposal Voting, `voting_start = now`. **events**: `proposal_created`.
- **tests**: `proposal_cap_enforced`, `unverified_cannot_propose`.

### `vote_proposal(proposal_id, support)` — payable
- **pre**: Voting and `voting_start ≤ now < voting_end`; caller verified **at `voting_start`**; one vote per account.
- **tests**: `late_verified_cannot_vote`, `one_account_one_vote`.

### `finalize_proposal(proposal_id) -> ProposalStatus` — anyone, payable (beneficiary registration)
- **pre**: Voting and `now ≥ voting_end`.
- **state**: `yes + no ≥ quorum` and `yes/(yes+no) ≥ threshold` → requires bucket `spendable ≥ amount`
  and epoch funding + amount ≤ `max_per_epoch`, then transfers from the contract to the beneficiary
  (Executed). Otherwise Rejected. If passed but unfundable, the call panics and can be retried later.
- **events**: `ft_transfer`, `proposal_executed` / `proposal_rejected`.
- **tests**: `proposal_passes_and_executes`, `proposal_without_quorum_rejected`, `proposal_limited_by_bucket`,
  `per_epoch_funding_cap`. E2E step 6.

## Vesting — `vesting.rs`

### `claim_vested(schedule) -> U128` — payable
- **pre**: caller = beneficiary; vested − claimed > 0. Linear from genesis; nothing before cliff.
- **state**: mint the difference. **events**: `ft_mint` (vesting:<name>), `vesting_claimed`.
- **tests**: `vesting_linear_cliff_and_cap`, `vesting_cliff_blocks_early_claim`, `vesting_only_beneficiary`, `vesting_cannot_double_claim`.

## Token — `token.rs`

`ft_transfer`, `ft_transfer_call`, `ft_total_supply`, `ft_balance_of`, `ft_resolve_transfer`,
`storage_deposit`, `storage_withdraw`, `storage_unregister`, `storage_balance_bounds`,
`storage_balance_of`, `ft_metadata` — standard behaviour from `near-contract-standards`, plus:
the two standard paths that destroy tokens (forced unregister; refund to a deleted sender) are added
to `total_burned` so `total_supply == total_minted − total_burned` always holds. The contract
(treasury) account cannot unregister. **tests**: `reward_transfer_works`, `treasury_cannot_unregister`.

## Views — `views.rs`

`get_config`, `get_stats`, `get_supply`, `check_invariants`, `get_treasury`, `get_epoch`,
`list_epochs`, `get_challenge`, `list_challenges`, `get_submission`, `list_submissions`,
`get_submission_for`, `list_disputes`, `list_proposals`, `has_voted`, `get_account`,
`list_accounts`, `activity_count`, `list_activity`, `get_vesting`. Lists are paginated (≤ 100).

### On-chain invariants (`check_invariants`)
1. `total_supply == total_minted − total_burned`
2. `total_minted ≤ 1,000,000,000 GOOD`
3. `total_minted + reserve_remaining + reserve_earmarked + unvested == 1,000,000,000 GOOD`
4. contract GOOD balance ≥ Σ bucket (locked + spendable)

Checked after every step of `invariants_hold_over_mixed_history` (pseudo-random 8-epoch history) and at the end of the E2E run.

## Events (NEP-297, standard `goodcoin`, version 1.0.0)

`challenge_created`, `challenge_published`, `deed_submitted`, `attested`, `deed_approved`,
`deed_rejected`, `dispute_opened`, `dispute_vote`, `dispute_resolved`, `epoch_settled`,
`reward_claimed`, `vesting_claimed`, `proposal_created`, `proposal_vote`, `proposal_executed`,
`proposal_rejected` — plus standard `nep141` `ft_mint` / `ft_burn` / `ft_transfer`.

## Storage & gas

- Every method that stores data is payable and charges exactly the bytes it adds
  (`storage_usage` delta × `storage_byte_cost`, 1e19 yocto/byte), refunding the rest.
  `near_sdk::store` collections buffer writes, so they are flushed before measuring.
- Settlement is O(1) per epoch (counters only), bounded to 16 epochs per call. Rewards are claimed
  individually, so settlement cost does not grow with participant count.
- No cross-contract calls except the standard `ft_transfer_call` → `ft_resolve_transfer` callback.
