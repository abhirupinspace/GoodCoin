//! Public-goods treasury governance. One account, one vote. A voter must have been a verified
//! contributor before the proposal's voting started (eligibility fixed before voting).
//! Funds leave the treasury only through `finalize_proposal` on a passed proposal, within the
//! bucket's spendable balance, the per-proposal cap and the per-epoch cap. No other path exists.
use near_sdk::json_types::{U64, U128};
use near_sdk::{env, near, require};

use crate::deeds::validate_uri;
use crate::events::GoodEvent;
use crate::types::*;
use crate::{Contract, ContractExt, check_len};

#[near]
impl Contract {
    #[payable]
    pub fn create_proposal(&mut self, input: ProposalInput) -> U64 {
        let initial = env::storage_usage();
        let proposer = env::predecessor_account_id();
        let now = Self::now();
        require!(self.verified_at(&proposer, now), "only verified contributors can propose");
        check_len("title", &input.title, 2, MAX_NAME);
        check_len("description", &input.description, 1, MAX_LONG_TEXT);
        check_len("beneficiary_name", &input.beneficiary_name, 1, MAX_NAME);
        validate_uri(&input.evidence_uri);
        let g = &self.config.gov;
        require!(input.amount.0 > 0 && input.amount.0 <= g.max_per_proposal.0, "amount must be in (0, max_per_proposal]");
        require!(
            input.voting_duration_ns.0 >= g.min_voting_ns.0 && input.voting_duration_ns.0 <= g.max_voting_ns.0,
            "voting duration out of bounds"
        );
        require!(input.beneficiary != env::current_account_id(), "beneficiary cannot be the treasury");
        let id = U64(self.proposals.len() as u64);
        let p = Proposal {
            id,
            proposer: proposer.clone(),
            voting_start: U64(now),
            voting_end: U64(now + input.voting_duration_ns.0),
            input,
            yes: 0,
            no: 0,
            status: ProposalStatus::Voting,
            executed_at: None,
        };
        GoodEvent::ProposalCreated { proposal_id: id, proposer, bucket: p.input.bucket, amount: p.input.amount }.emit();
        self.proposals.push(p);
        self.charge_storage(initial);
        id
    }

    #[payable]
    pub fn vote_proposal(&mut self, proposal_id: U64, support: bool) {
        let initial = env::storage_usage();
        let voter = env::predecessor_account_id();
        let now = Self::now();
        let idx = proposal_id.0 as u32;
        let p = self.proposals.get(idx).expect("proposal not found");
        require!(p.status == ProposalStatus::Voting, "voting closed");
        require!(now >= p.voting_start.0 && now < p.voting_end.0, "outside voting period");
        require!(
            self.verified_at(&voter, p.voting_start.0),
            "not eligible: must be a verified contributor before voting started"
        );
        let key = (proposal_id.0, voter.clone());
        require!(!self.proposal_votes.contains(&key), "already voted");
        self.proposal_votes.insert(key);
        let p = self.proposals.get_mut(idx).unwrap();
        if support {
            p.yes += 1;
        } else {
            p.no += 1;
        }
        self.stats_mut(&voter).proposals_voted += 1;
        GoodEvent::ProposalVote { proposal_id, voter, support }.emit();
        self.charge_storage(initial);
    }

    /// Permissionless after voting ends. Passed → transfer from the bucket's spendable balance.
    /// Failed quorum/threshold → Rejected. If a passed proposal cannot be funded yet (bucket or
    /// epoch cap), the call fails and can be retried later; nothing changes.
    /// Attach deposit if the beneficiary is not yet registered for GOOD storage.
    #[payable]
    pub fn finalize_proposal(&mut self, proposal_id: U64) -> ProposalStatus {
        let initial = env::storage_usage();
        let now = Self::now();
        let idx = proposal_id.0 as u32;
        let p = self.proposals.get(idx).expect("proposal not found").clone();
        require!(p.status == ProposalStatus::Voting, "already finalized");
        require!(now >= p.voting_end.0, "voting still open");
        let g = self.config.gov.clone();
        let total = p.yes + p.no;
        let passed = total >= g.quorum && (p.yes as u128) * BPS >= (total as u128) * g.threshold_bps as u128;
        if !passed {
            self.proposals.get_mut(idx).unwrap().status = ProposalStatus::Rejected;
            GoodEvent::ProposalRejected { proposal_id }.emit();
            self.charge_storage(initial);
            return ProposalStatus::Rejected;
        }
        let amount = p.input.amount.0;
        let b = p.input.bucket.idx();
        require!(self.buckets[b].spendable.0 >= amount, "bucket spendable balance too low; retry after more successful epochs");
        let epoch = self.current_epoch();
        let spent = self.epoch_funding.get(&epoch).copied().unwrap_or(0);
        require!(spent + amount <= g.max_per_epoch.0, "per-epoch funding cap reached; retry next epoch");
        self.epoch_funding.insert(epoch, spent + amount);
        let bucket = &mut self.buckets[b];
        bucket.spendable = U128(bucket.spendable.0 - amount);
        bucket.disbursed = U128(bucket.disbursed.0 + amount);
        let beneficiary = p.input.beneficiary.clone();
        self.ensure_registered(&beneficiary);
        let me = env::current_account_id();
        self.token.internal_transfer(&me, &beneficiary, amount, Some(format!("proposal #{}", proposal_id.0)));
        let pm = self.proposals.get_mut(idx).unwrap();
        pm.status = ProposalStatus::Executed;
        pm.executed_at = Some(U64(now));
        self.log_activity(
            ActivityKind::TreasuryDisbursement,
            Some(epoch),
            Some(beneficiary.clone()),
            amount,
            &format!("proposal #{}", proposal_id.0),
        );
        GoodEvent::ProposalExecuted { proposal_id, beneficiary, amount: U128(amount) }.emit();
        self.charge_storage(initial);
        ProposalStatus::Executed
    }
}
