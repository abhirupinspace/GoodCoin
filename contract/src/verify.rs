//! Layer 2 (peer attestation) and Layer 3 (disputes) of hybrid verification.
//!
//! * Attestors: reviewer pool (fixed at init) ∪ verified contributors (accounts with a finalized
//!   approved deed). Never the submitter. One attestation per account per submission.
//! * First side to reach `min_attestations` wins (approve or reject).
//! * Within `dispute_window_ns` after approval any eligible attestor may dispute; the deed is
//!   uncounted immediately. Reviewer-pool members who are not the submitter, the opener or an
//!   original attestor resolve it; first side to `dispute_quorum` wins. An upheld deed counts
//!   toward the epoch of resolution (settled epochs never change).
use near_sdk::json_types::U64;
use near_sdk::{AccountId, env, near, require};

use crate::events::GoodEvent;
use crate::types::*;
use crate::{Contract, ContractExt, check_len};

#[near]
impl Contract {
    #[payable]
    pub fn attest(&mut self, submission_id: U64, approve: bool) {
        let initial = env::storage_usage();
        let attestor = env::predecessor_account_id();
        let now = Self::now();
        require!(
            self.can_attest(&attestor),
            "not an eligible attestor (reviewer pool or verified contributor)"
        );
        let idx = submission_id.0 as u32;
        let mut sub = self.submissions.get(idx).expect("submission not found").clone();
        require!(sub.status == SubmissionStatus::Pending, "submission is not pending");
        require!(sub.account != attestor, "cannot attest your own submission");
        require!(
            !sub.approvals.contains(&attestor) && !sub.rejections.contains(&attestor),
            "already attested"
        );
        let challenge = self.challenges.get(sub.challenge_id).unwrap().clone();
        require!(now < challenge.input.verification_deadline_ns.0, "verification deadline passed");

        let limit = self.config.limits.attestations_per_epoch;
        let r = self.rate_mut(&attestor);
        require!(r.attestations < limit, "attestation rate limit for this epoch reached");
        r.attestations += 1;

        if approve {
            sub.approvals.push(attestor.clone());
        } else {
            sub.rejections.push(attestor.clone());
        }
        self.stats_mut(&attestor).attestations += 1;
        GoodEvent::Attested { submission_id, attestor, approve }.emit();

        let min = self.config.min_attestations as usize;
        if sub.approvals.len() >= min {
            require!(
                challenge.approved < challenge.input.max_approved,
                "challenge reward capacity reached"
            );
            let epoch = self.current_epoch();
            sub.status = SubmissionStatus::Approved;
            sub.approved_at = Some(U64(now));
            sub.approval_epoch = Some(U64(epoch));
            self.challenges.get_mut(sub.challenge_id).unwrap().approved += 1;
            self.count_deed(&sub.account, epoch);
            let window = self.config.dispute_window_ns.0;
            let s = self.stats_mut(&sub.account);
            s.approved += 1;
            if s.approved == 1 {
                self.unique_contributors += 1;
            }
            let s = self.stats_mut(&sub.account);
            if s.verified_since.is_none() {
                s.verified_since = Some(U64(now + window));
                s.verified_by_submission = Some(submission_id);
            }
            GoodEvent::DeedApproved { submission_id, account: sub.account.clone(), epoch: U64(epoch) }
                .emit();
        } else if sub.rejections.len() >= min {
            sub.status = SubmissionStatus::Rejected;
            sub.finalized_at = Some(U64(now));
            self.stats_mut(&sub.account).rejected += 1;
            GoodEvent::DeedRejected { submission_id, account: sub.account.clone() }.emit();
        }
        self.submissions.set(idx, sub);
        self.charge_storage(initial);
    }

    #[payable]
    pub fn open_dispute(&mut self, submission_id: U64, reason: String) -> U64 {
        let initial = env::storage_usage();
        let opener = env::predecessor_account_id();
        let now = Self::now();
        check_len("reason", &reason, 1, MAX_TEXT);
        require!(self.can_attest(&opener), "not eligible to dispute (reviewer pool or verified contributor)");
        let idx = submission_id.0 as u32;
        let mut sub = self.submissions.get(idx).expect("submission not found").clone();
        require!(sub.status == SubmissionStatus::Approved, "only approved submissions can be disputed");
        require!(sub.dispute_id.is_none(), "submission already went through a dispute");
        require!(sub.account != opener, "cannot dispute your own submission");
        let approved_at = sub.approved_at.unwrap().0;
        require!(now < approved_at + self.config.dispute_window_ns.0, "dispute window closed");
        let epoch = sub.approval_epoch.unwrap().0;
        // Guaranteed by timing (settle needs end + window), checked anyway.
        require!(epoch >= self.next_to_settle, "approval epoch already settled");

        let limit = self.config.limits.disputes_per_epoch;
        let r = self.rate_mut(&opener);
        require!(r.disputes < limit, "dispute rate limit for this epoch reached");
        r.disputes += 1;

        self.uncount_deed(&sub.account, epoch);
        self.challenges.get_mut(sub.challenge_id).unwrap().approved -= 1;
        let s = self.stats_mut(&sub.account);
        s.approved -= 1;
        if s.verified_by_submission == Some(submission_id) {
            s.verified_since = None;
            s.verified_by_submission = None;
        }
        if s.approved == 0 {
            self.unique_contributors -= 1;
        }
        self.stats_mut(&opener).disputes_opened += 1;

        let dispute_id = U64(self.disputes.len() as u64);
        self.disputes.push(Dispute {
            id: dispute_id,
            submission_id,
            opener: opener.clone(),
            reason,
            opened_at: U64(now),
            valid_votes: vec![],
            invalid_votes: vec![],
            outcome: None,
            resolved_at: None,
        });
        sub.status = SubmissionStatus::Disputed;
        sub.dispute_id = Some(dispute_id);
        self.submissions.set(idx, sub);
        GoodEvent::DisputeOpened { dispute_id, submission_id, opener }.emit();
        self.charge_storage(initial);
        dispute_id
    }

    #[payable]
    pub fn vote_dispute(&mut self, dispute_id: U64, valid: bool) {
        let initial = env::storage_usage();
        let reviewer = env::predecessor_account_id();
        let now = Self::now();
        require!(self.is_reviewer(&reviewer), "only reviewer-pool members resolve disputes");
        let didx = dispute_id.0 as u32;
        let mut d = self.disputes.get(didx).expect("dispute not found").clone();
        require!(d.outcome.is_none(), "dispute already resolved");
        let sidx = d.submission_id.0 as u32;
        let mut sub = self.submissions.get(sidx).unwrap().clone();
        require!(reviewer != sub.account, "submitter cannot vote");
        require!(reviewer != d.opener, "dispute opener cannot vote");
        require!(
            !sub.approvals.contains(&reviewer) && !sub.rejections.contains(&reviewer),
            "original attestors cannot vote"
        );
        require!(
            !d.valid_votes.contains(&reviewer) && !d.invalid_votes.contains(&reviewer),
            "already voted"
        );
        if valid {
            d.valid_votes.push(reviewer.clone());
        } else {
            d.invalid_votes.push(reviewer.clone());
        }
        self.stats_mut(&reviewer).dispute_votes += 1;
        GoodEvent::DisputeVote { dispute_id, reviewer, valid }.emit();

        let q = self.config.dispute_quorum as usize;
        let resolved = if d.valid_votes.len() >= q {
            Some(true)
        } else if d.invalid_votes.len() >= q {
            Some(false)
        } else {
            None
        };
        if let Some(upheld) = resolved {
            d.outcome = Some(upheld);
            d.resolved_at = Some(U64(now));
            sub.finalized_at = Some(U64(now));
            if upheld {
                let epoch = self.current_epoch();
                sub.status = SubmissionStatus::Approved;
                sub.approval_epoch = Some(U64(epoch));
                self.challenges.get_mut(sub.challenge_id).unwrap().approved += 1;
                self.count_deed(&sub.account, epoch);
                let s = self.stats_mut(&sub.account);
                s.approved += 1;
                if s.approved == 1 {
                    self.unique_contributors += 1;
                }
                let s = self.stats_mut(&sub.account);
                if s.verified_since.is_none() {
                    s.verified_since = Some(U64(now));
                    s.verified_by_submission = Some(d.submission_id);
                }
            } else {
                sub.status = SubmissionStatus::Rejected;
                self.stats_mut(&sub.account).rejected += 1;
            }
            GoodEvent::DisputeResolved { dispute_id, submission_id: d.submission_id, upheld }.emit();
        }
        self.disputes.set(didx, d);
        self.submissions.set(sidx, sub);
        self.charge_storage(initial);
    }
}

impl Contract {
    pub(crate) fn count_deed(&mut self, account: &AccountId, epoch: u64) {
        let mut rec = self.epochs.get(&epoch).cloned().unwrap_or_default();
        rec.approved_deeds += 1;
        let key = (epoch, account.clone());
        let prev = self.epoch_participant.get(&key).copied().unwrap_or(0);
        self.epoch_participant.insert(key, prev + 1);
        if prev == 0 {
            rec.participants += 1;
            self.stats_mut(account).epochs.push(U64(epoch));
        }
        self.epochs.insert(epoch, rec);
        self.total_approved += 1;
    }

    pub(crate) fn uncount_deed(&mut self, account: &AccountId, epoch: u64) {
        let mut rec = self.epochs.get(&epoch).cloned().expect("epoch record missing");
        rec.approved_deeds -= 1;
        let key = (epoch, account.clone());
        let prev = *self.epoch_participant.get(&key).expect("participant record missing");
        if prev == 1 {
            self.epoch_participant.remove(&key);
            rec.participants -= 1;
            self.stats_mut(account).epochs.retain(|e| e.0 != epoch);
        } else {
            self.epoch_participant.insert(key, prev - 1);
        }
        self.epochs.insert(epoch, rec);
        self.total_approved -= 1;
    }
}
