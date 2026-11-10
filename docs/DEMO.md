# Demo video script, X post draft, submission checklist

## Video (target 2:30, screen recording of the web app + one terminal)

Before recording: fresh demo deployment so epoch 0 starts at recording time
(`./deploy/deploy.sh demo <new-contract>.testnet goodcoin-team-530a20.testnet --lock`), point the web app at it
(`NEXT_PUBLIC_GOODCOIN_CONTRACT`), and run `deploy/demo_e2e.sh` in a side terminal so the
actions land on chain while the UI updates. Cut the waiting.

| t | Show | Say (one line each) |
|---|---|---|
| 0:00 | Overview: streak 0, epoch countdown, both progress bars at 0 | "Most memecoins reward holding. GOODCOIN only mints when the whole community does good together." |
| 0:15 | About page: parameters, `demo` badge, list-keys empty | "Every rule is in one NEAR contract with no admin key. These are demo parameters — 6-minute epochs." |
| 0:30 | Challenge → Submit: paste link, fetch & hash | "Alice submits proof: a public link plus its SHA-256, stored on NEAR." |
| 0:50 | Verify: three reviewers approve; progress bars hit 3/3 and 3/3 | "Three independent accounts attest. Both targets — deeds and people — must be met." |
| 1:10 | Settle → `Succeeded`, streak 1; claim → balance +25 GOOD; Activity shows ft_mint with tx link | "Anyone settles the epoch. Each participant claims GOOD, minted from a capped reserve." |
| 1:30 | Treasury: 1,000 GOOD unlocked 50/30/20; proposal voted and executed | "Success also unlocks public-goods funding, spent only by one-account-one-vote proposals." |
| 1:50 | Verify: dispute overturns a fake deed | "Bad approvals can be disputed and overturned by a separate reviewer quorum." |
| 2:05 | Next epoch misses → `Failed`, streak 0, longest 1, ft_burn on Activity | "Miss the targets and the streak resets — and 0.1% of the treasury burns. Forever." |
| 2:20 | `check_invariants` all green; repo link | "Supply math is checked on-chain. Accounts aren't humans — our Sybil limits are in the README. Code is open." |

## X post draft (the human posts it)

> What if a memecoin only minted when its community did good — together?
>
> GOODCOIN: each week the community needs 100 verified good deeds from 50 people. Hit it → everyone who
> contributed earns GOOD and the streak grows. Miss it → the streak resets and 0.1% of the treasury burns.
>
> NEAR runs the whole mechanic in one contract with no admin key: time-based epochs anyone can settle,
> NEP-141 mint/burn events, and named accounts so you can see who verified what.
>
> Built at #NEARHackathon @NEARProtocol @NearBuilders
> Demo ▶️ [video] · Code: [repo]
> How would you break our Sybil defenses? Tell us.

## Submission checklist (HACKATHON.md)

- [ ] Final locked deployments (`--lock`), README contract table updated, `list-keys` empty
- [ ] Repo public before 2026-11-14T23:59Z, LICENSE present, README "do X → see Y" verified from a clean clone
- [ ] Human records video and publishes the X post (tags @NEARProtocol #NEARHackathon)
- [ ] Human provides: project name, lead name, email, team size, NEAR mainnet payout account, repo URL, demo post URL, consent
- [ ] Re-read https://nearhackathon.com/HACKATHON.md for rule changes
- [ ] Print full JSON payload, get explicit yes, POST once with a single saved `requestId`
