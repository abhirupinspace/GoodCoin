# GOODCOIN v2 — "The Pot Burns"

Status: PROPOSED (2026-11-12) · replaces the v1 economics in DESIGN.md §4/§7 · reuses ~70% of v1 code

## 1. One sentence

> **Every week a pot of GOOD is put on the table. If the community does enough verified good
> together, the pot is split among the people who did it. If not, the pot burns, and GOOD's max
> supply shrinks forever.**

Zero premine. Zero team allocation. No admin key. **Every GOOD that will ever exist is minted for a
verified good deed, and every week the world fails to earn it, it is gone.**

## 2. Why v1 would not score 10/10 (recap of the critique)

| v1 flaw | v2 fix |
|---|---|
| Failure burned an unspendable treasury: nobody felt it | Failure burns **the pot people were about to split** and lowers the **max supply cap** |
| Rewards 25 GOOD on 1B supply: meaningless | Pot = 0.25% of the remaining reserve per week (≈2.5M GOOD week 1) |
| Team vesting out-minted the community 4,500:1 | **No premine, no team, no vesting.** 100% of supply is the pot reserve |
| Verifiers paid nothing, nobody rejects/disputes | Verifiers earn 10% of the pot for **correct** votes; deeds and disputes carry NEAR bonds; losers pay winners |
| Fixed 100/50 targets: dead at launch | **Difficulty adjustment**: target +15% after a success, −15% after a failure (floor) |
| Holders had no role (not really a memecoin) | **Believers**: holders stake GOOD on the community; win a pot share on success, lose 10% (burned) on failure |
| Mechanic = the track's sample prompt | Pot-burn-shrinks-cap + difficulty adjustment + believers market is new; the sample streak is one ingredient |
| 8 modules, hard to explain | One loop, three roles (Doers, Verifiers, Believers), one number on screen: **the pot** |

## 3. The loop

```
                     ┌──────────────── Week n (demo: 6 min) ───────────────┐
Reserve ── 0.25% × streak bonus ──► POT (shown live, e.g. 2,500,000 GOOD)
                                         │
 Doers:      do good → submit proof (+0.05 NEAR bond) → 3 attestations → 24h challenge window
 Verifiers:  attest; challenge bad deeds (+0.1 NEAR bond); jury resolves; loser's bond → winner
 Believers:  stake GOOD on "we'll make it" (staking closes at mid-week: no last-minute sniping)
                                         │
              week ends + challenge window → anyone calls settle()
                     │                                       │
   deeds ≥ target AND people ≥ target/2              target missed
   POT MINTED and split:                              POT BURNED: max supply −= pot
     60% doers (equal per person)                     Believers lose 10% of stake (burned)
     20% believers (pro-rata stake)                   streak → 0
     10% verifiers (per correct vote)                 next target −15% (floor)
     10% public-goods treasury
   streak +1, next target +15%
```

### Parameters (production; final values picked by the simulator)

| Parameter | Value | Why |
|---|---|---|
| Max supply (initial cap) | 1,000,000,000 GOOD | cap **only goes down** |
| Genesis mint | **0** | fair launch |
| Pot | 0.25% of remaining reserve × (1 + 10% × min(streak, 10)) | geometric: never runs out, early weeks biggest (halving-like urgency); streak doubles the pot at 10 |
| Initial deeds target | 10 (floor 5) | bootstrappable from day one |
| People target | ⌈deeds target / 2⌉ | both must be met |
| Difficulty step | ±15% | like Bitcoin difficulty, but for collective good |
| Split | doers 60 / believers 20 / verifiers 10 / treasury 10 | unused believer share (no stake) goes to doers |
| Believer loss on failure | 10% of stake, burned | holders have skin in the game |
| Staking window | first 50% of the week | prevents staking once the outcome is obvious |
| Deed bond / challenge bond | 0.05 / 0.1 NEAR | Sybil cost + reason to challenge; refunded to honest side |
| Attestations | 3 distinct (reviewer pool ∪ verified contributors) | unchanged from v1 |
| Challenge window | 24h after approval | unchanged |

Demo deployment: same code, 6-minute weeks, target 3, 2-minute window, labeled `demo` on-chain.

## 4. Incentive check (what each role wants)

| Role | Wants | Honest behaviour paid by | Cheating costs |
|---|---|---|---|
| Doer | its share of a successful pot | 60% of pot | bond lost if rejected or overturned |
| Verifier | correct-vote share | 10% of pot; correct = vote matches final outcome | approving a deed later overturned forfeits that week's verifier share and verified status |
| Challenger | winner bond | submitter's bond | own bond if the challenge fails |
| Believer | pot share | 20% of pot | 10% of stake burned on failure; cannot snipe after mid-week |
| Holder (not staking) | scarcity | cap shrinks on every failure | — |

Residual weakness (stated in README, not hidden): a ring of ≥ 3 colluding verified accounts can still
approve sock-puppet deeds. Bonds, challenge rewards and the difficulty ratchet raise the cost (the
simulator prices it). Accounts are not humans.

## 5. NEAR-specific angle

1. **The whole game is one locked NEAR account.** `near account list-keys goodcoin.testnet` → empty.
   Rules, pot, cap, difficulty are all `get_*` views. Nobody, the team included, can stop the pot from burning.
2. **NEP-141 events tell the story**: `ft_mint` when a pot is split, `ft_burn` when believers burn,
   and a NEP-297 `pot_burned` event with the new max supply.
3. **Function-call access keys** (if time allows): verifiers sign in once and attest in one click with
   a limited key scoped to `attest` (contract covers the attestation's storage, bounded by rate limits).
4. **Named accounts** make the leaderboard and the jury legible (`alice.near` verified 12 deeds).

## 6. The demo moment (what wins the room)

Week 3, 2 deeds short, 90 s left, **POT: 2,431,117 GOOD**. Last deed gets its 3rd attestation → bar
hits target → settle → pot splits live into doers / believers / verifiers / treasury. Next week nobody
shows up → settle → **"POT BURNED. Max supply 1,000,000,000 → 997,568,883"** and believers' stake ticks
down. Everything has an explorer link.

## 7. Judging scorecard (self-assessment)

| Criterion | v1 | v2 | Evidence for judges |
|---|---:|---:|---|
| Mechanic originality | 5 | 9 | cap that only shrinks + difficulty ratchet + believers bet on collective good |
| Mechanic depth / soundness | 6 | 9 | every role paid for honesty; sim incl. adversarial cases |
| Fits track ("supply reacts to the community, treasuries with rules, rituals") | 7 | 10 | literally the pot and the cap |
| Fully on-chain, no admin | 9 | 10 | locked account, `check_invariants` |
| NEAR usage | 5 | 7 | locked accounts, NEP-141/297, FC keys, named accounts |
| Technical execution / tests | 9 | 9 | unit + live E2E + sim |
| Demo clarity | 6 | 10 | one number (the pot), one moment |
| Docs / reproducibility (AI screen) | 9 | 10 | do-X-see-Y + tx log |

## 8. What changes in code

| Area | Change |
|---|---|
| `epoch.rs` | pot = % of reserve × streak; split 60/20/10/10; failure burns pot from reserve (cap −= pot) and 10% believer stakes; difficulty ratchet |
| new `believe.rs` | `believe(amount)` via `ft_transfer_call` or internal lock (first half of week), `unbelieve` after settlement, claim share |
| `verify.rs` | NEAR bonds on submit/challenge, bond payouts, verifier correct-vote accounting |
| `lib.rs` / types | remove genesis treasury + vesting; `max_supply` becomes state; new config fields |
| `treasury.rs` | funded by 10% pot share (spendable directly); unchanged governance |
| `vesting.rs` | **deleted** |
| tests | rewrite epoch/economics tests; keep challenge/verification/dispute/governance tests |
| sim | re-model v2 (pot, ratchet, believers, ring attack with bonds); pick pot %, step %, splits |
| web | Overview centred on the **pot**, max-supply counter, difficulty level, believe panel |
| docs | README/CONTRACT/SECURITY/SIMULATION/DECISIONS updated |

Estimate: contract + tests ~8h, sim ~2h (parallel), web ~5h (parallel), docs + deploy + E2E ~3h → done by
2026-11-13 night; 2026-11-14 for video, X post, submission.

Cut order if late: function-call keys → verifier rewards (keep bonds) → believers (last resort; it is the holder mechanic).
