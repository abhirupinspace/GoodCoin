//! Challenges (organizer-defined, frozen on publish) and deed submissions (Layer 1 automated checks).
use near_sdk::json_types::U64;
use near_sdk::{env, near, require};

use crate::events::GoodEvent;
use crate::types::*;
use crate::{Contract, ContractExt, check_len};

fn validate_challenge(input: &ChallengeInput) {
    check_len("name", &input.name, 2, MAX_NAME);
    check_len("description", &input.description, 1, MAX_TEXT);
    check_len("category", &input.category, 1, MAX_CATEGORY);
    check_len("instructions", &input.instructions, 1, MAX_LONG_TEXT);
    check_len("evidence_requirements", &input.evidence_requirements, 1, MAX_TEXT);
    check_len("eligibility", &input.eligibility, 1, MAX_TEXT);
    require!(input.start_ns.0 < input.end_ns.0, "start_ns must be < end_ns");
    require!(
        input.end_ns.0 <= input.verification_deadline_ns.0,
        "end_ns must be <= verification_deadline_ns"
    );
    require!(input.max_approved > 0, "max_approved must be > 0");
}

/// Accepts `https://`, `http://`, `ipfs://`, `ar://`.
pub(crate) fn validate_uri(uri: &str) {
    check_len("evidence_uri", uri, 8, MAX_URI);
    require!(
        ["https://", "http://", "ipfs://", "ar://"].iter().any(|p| uri.starts_with(p)),
        "evidence_uri must start with https://, http://, ipfs:// or ar://"
    );
    require!(!uri.chars().any(|c| c.is_whitespace() || c.is_control()), "evidence_uri contains whitespace");
}

/// 64 lowercase hex chars (SHA-256).
pub(crate) fn validate_hash(h: &str) {
    require!(
        h.len() == 64 && h.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
        "evidence_hash must be 64 lowercase hex chars (SHA-256)"
    );
}

#[near]
impl Contract {
    /// Organizer creates a challenge as a Draft. Caller pays storage.
    #[payable]
    pub fn create_challenge(&mut self, input: ChallengeInput) -> u32 {
        let initial = env::storage_usage();
        let organizer = env::predecessor_account_id();
        require!(self.config.organizers.contains(&organizer), "only configured organizers can create challenges");
        validate_challenge(&input);
        let id = self.challenges.len();
        self.challenges.push(Challenge {
            id,
            organizer: organizer.clone(),
            input,
            state: ChallengeState::Draft,
            created_at: U64(Self::now()),
            published_at: None,
            submissions: 0,
            approved: 0,
        });
        GoodEvent::ChallengeCreated { challenge_id: id, organizer }.emit();
        self.charge_storage(initial);
        id
    }

    /// Edit a Draft. Impossible after publish.
    #[payable]
    pub fn update_challenge(&mut self, challenge_id: u32, input: ChallengeInput) {
        let initial = env::storage_usage();
        validate_challenge(&input);
        let caller = env::predecessor_account_id();
        let c = self.challenges.get_mut(challenge_id).expect("challenge not found");
        require!(c.organizer == caller, "only the organizer");
        require!(c.state == ChallengeState::Draft, "published challenges are immutable");
        c.input = input;
        self.charge_storage(initial);
    }

    /// Freeze the challenge. From here on no field can change.
    pub fn publish_challenge(&mut self, challenge_id: u32) {
        let caller = env::predecessor_account_id();
        let now = Self::now();
        let c = self.challenges.get_mut(challenge_id).expect("challenge not found");
        require!(c.organizer == caller, "only the organizer");
        require!(c.state == ChallengeState::Draft, "already published");
        require!(c.input.end_ns.0 > now, "end_ns already passed");
        c.state = ChallengeState::Published;
        c.published_at = Some(U64(now));
        GoodEvent::ChallengePublished { challenge_id }.emit();
    }

    /// Submit a good deed. Layer-1 checks: challenge active, inside window, eligibility,
    /// one submission per account per challenge, globally unique evidence hash, capacity, rate limit.
    #[payable]
    pub fn submit_deed(
        &mut self,
        challenge_id: u32,
        evidence_hash: String,
        evidence_uri: String,
        description: String,
    ) -> U64 {
        let initial = env::storage_usage();
        let account = env::predecessor_account_id();
        let now = Self::now();
        require!(account != env::current_account_id(), "contract cannot submit");
        validate_hash(&evidence_hash);
        validate_uri(&evidence_uri);
        check_len("description", &description, 1, MAX_TEXT);

        let c = self.challenges.get(challenge_id).expect("challenge not found");
        require!(c.state == ChallengeState::Published, "challenge not published");
        require!(now >= c.input.start_ns.0, "challenge has not started");
        require!(now < c.input.end_ns.0, "submission deadline passed");
        require!(c.approved < c.input.max_approved, "challenge reward capacity reached");
        if c.input.open_to == OpenTo::VerifiedContributors {
            require!(self.verified_at(&account, now), "challenge open to verified contributors only");
        }
        let key = (challenge_id, account.clone());
        require!(
            !self.submission_by_challenge_account.contains_key(&key),
            "one submission per account per challenge"
        );
        require!(!self.evidence_hashes.contains_key(&evidence_hash), "duplicate evidence");

        let limit = self.config.limits.submissions_per_epoch;
        let r = self.rate_mut(&account);
        require!(r.submissions < limit, "submission rate limit for this epoch reached");
        r.submissions += 1;

        let id = self.submissions.len() as u64;
        self.submissions.push(Submission {
            id: U64(id),
            challenge_id,
            account: account.clone(),
            evidence_hash: evidence_hash.clone(),
            evidence_uri,
            description,
            submitted_at: U64(now),
            status: SubmissionStatus::Pending,
            approvals: vec![],
            rejections: vec![],
            approved_at: None,
            approval_epoch: None,
            dispute_id: None,
            finalized_at: None,
        });
        self.submission_by_challenge_account.insert(key, id);
        self.evidence_hashes.insert(evidence_hash.clone(), id);
        self.challenges.get_mut(challenge_id).unwrap().submissions += 1;
        self.stats_mut(&account).submissions += 1;

        GoodEvent::DeedSubmitted { submission_id: U64(id), challenge_id, account, evidence_hash }.emit();
        self.charge_storage(initial);
        U64(id)
    }
}

impl Contract {
    pub(crate) fn challenge_phase(&self, c: &Challenge) -> ChallengePhase {
        let now = Self::now();
        match c.state {
            ChallengeState::Draft => ChallengePhase::Draft,
            ChallengeState::Published => {
                let i = &c.input;
                if now < i.start_ns.0 {
                    ChallengePhase::Published
                } else if now < i.end_ns.0 {
                    ChallengePhase::Active
                } else if now < i.verification_deadline_ns.0 {
                    ChallengePhase::Verification
                } else if self.epoch_at(i.verification_deadline_ns.0) < self.next_to_settle {
                    ChallengePhase::Archived
                } else {
                    ChallengePhase::Finalized
                }
            }
        }
    }
}
