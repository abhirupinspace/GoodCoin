# GOODCOIN

**Make good contagious.**

Memecoins coordinate millions of people… to buy. GOODCOIN coordinates them to **give together**.

A memecoin on NEAR with three rules:

1. **Give together.** Every week there is one fire for one public good. If enough givers throw NEAR in
   before the week ends, the fire **catches**: 90% goes to the cause's DAO treasury, 10% to the
   **Hearth**. If not, every gift is refunded and that week's GOOD can never exist: max supply shrinks.
2. **Get GOOD.** Givers of a fire that catches receive new GOOD, backed by the Hearth. Anyone can redeem
   GOOD for its share of the Hearth (the **floor**) at any time. The floor **never goes down**, and every
   later fire that catches raises it.
3. **Bring a friend.** A first-time giver who names you passes a quarter of their first share to you.

Holders can **kindle**: in a fire's final moments, burn GOOD to rescue it when it's a giver short.

| | |
|---|---|
| Track | Memecoins With Mechanics (`memecoins`) · also Social Money (`social`): causes are Sputnik DAO treasuries |
| Network | NEAR testnet · both contracts locked (no access keys) |
| Demo contract (6-minute fires, goal 4) | [`goodfire-demo2-ab92.testnet`](https://testnet.nearblocks.io/address/goodfire-demo2-ab92.testnet) |
| Production-parameter contract (7-day fires, goal 10) | [`goodfire-prod-ab92.testnet`](https://testnet.nearblocks.io/address/goodfire-prod-ab92.testnet) |
| Causes (demo DAOs) | [`gf-ab92-oss.sputnik-v2.testnet`](https://testnet.nearblocks.io/address/gf-ab92-oss.sputnik-v2.testnet), [`gf-ab92-climate.sputnik-v2.testnet`](https://testnet.nearblocks.io/address/gf-ab92-climate.sputnik-v2.testnet) |
| License | MIT |

## How a week works

```
 givers ──NEAR──► fire (escrow) ── goal: N distinct givers ──► week ends · anyone settles
                                              │
                    ┌─────────────────────────┴──────────────────────┐
              enough givers: CATCHES                        too few: SMOTHERED
              90% → cause DAO (payout)                       every gift refunded
              10% → Hearth                                   that week's GOOD never exists
              GOOD to givers                                 (max supply ↓ forever)
              floor ↑ for every holder                       goal eases ×1/1.1
              goal grows ×1.1 (unless rescued by a kindle)
```

**Floor = Hearth NEAR ÷ backed GOOD.** Each new GOOD is paid for with at least 1.25× the floor out of
the givers' 10%, so a catch raises the floor; redeeming leaves it unchanged; burning raises it. The
contract asserts after every state change that the floor never decreased, and `check_invariants()`
lets anyone verify it on-chain.

GOOD is therefore a share of every future fire: each later catch adds part of its fee to the backing of
GOOD already held, so bringing more people raises your own floor.

## Why it holds up

| Property | How |
|---|---|
| Nothing lost by trying | assurance contract: NEAR leaves only if the goal is met (a 0.005 NEAR record fee pays for storage) |
| No free GOOD, even for a dishonest cause | new GOOD costs ≥ 1.25× the floor, so recycled gifts buy nothing cheap |
| Sybil attacks fund public goods | each fake giver costs ≥ `min_gift`, 90% of which reaches the cause; the spark bounty moves weight from the newcomer, so fake friends earn nothing |
| Fair launch | zero premine, zero team allocation; one locked 1-NEAR seed that nobody owns |
| No admin | parameters fixed at deploy, causes rotate in a fixed order, no owner / setter / upgrade method, all keys deleted |
| No oracle, no judges | the good is an on-chain NEAR transfer to a curated DAO; the contract checks it |
| Robust payouts | `Due → Sending → Paid / Carried`; a payout to a deleted cause is carried to the next catch; if every cause dies, carried NEAR becomes refundable |

**Honest limits.**
- A cause colluding with its insiders can fake participation, though it can never get cheap GOOD.
- Accounts are not people.
- At the floor, a giver's GOOD is worth about 8–9% of the gift on day one. It's a donation with a receipt that appreciates.
- A smother destroys GOOD that was never minted.
- The chain proves a transfer to a curated account, not the good that was done.
- Testnet causes are team-controlled demo DAOs.

## Verify it yourself

Read-only, no wallet needed:

```sh
C=goodfire-demo2-ab92.testnet
near account list-keys $C network-config testnet now                                    # → no keys
near contract call-function as-read-only $C current_fire json-args '{}' network-config testnet now
near contract call-function as-read-only $C get_hearth json-args '{}' network-config testnet now
near contract call-function as-read-only $C check_invariants json-args '{}' network-config testnet now
near contract call-function as-read-only $C list_fires json-args '{"from":"0"}' network-config testnet now
near contract call-function as-read-only $C fire_card json-args '{"week":"0"}' network-config testnet now
```

Tests:

```sh
cd contract && cargo test        # every rule, error and invariant, the golden trace, and a property test
cd sim && uv run pytest && uv run python -m goodsim     # exact Python reference model + economics
```

Live end-to-end on testnet (about 25 minutes; needs funded accounts in `~/.near-credentials`):

```sh
./deploy/deploy.sh demo <contract>.testnet <team>.testnet <suffix> --lock
./deploy/e2e.sh <contract>.testnet <team>.testnet
```

The E2E run goes through every rule and asserts chain state after each step:
1. a fire catches, with a spark;
2. a cause account is deleted, so its payout is carried;
3. a fire smothers;
4. a fire is rescued by a kindle;
5. the carry drains into the next payout;
6. GOOD is redeemed at the floor;
7. every invariant is checked.

## Live run on testnet (2026-11-13)

`deploy/e2e.sh` against the locked demo contract `goodfire-demo2-ab92.testnet` (0 access keys). Every
step asserted chain state; `check_invariants()` was all true at the end.

| Step | Result | Transaction |
|---|---|---|
| Fire 0: 4 givers, bob sparked by alice | caught; 104,000 GOOD earmarked; a quarter of bob's first-gift weight moved to alice | [settle](https://testnet.nearblocks.io/txns/JDSgZu4tCBC7RWjpcgy7gxjtkgoS6YBh22AcVK3pY4Q8) |
| Payout of fire 0 | 1.17 NEAR to the open-source DAO | [payout](https://testnet.nearblocks.io/txns/GaMu9J87siKUD622Bshf98brTmxXVvWxs9Ep4ohHMfkr) |
| Claims | alice 82,000 GOOD, bob 6,000 GOOD | [alice](https://testnet.nearblocks.io/txns/DqTFZ4VfN5fZS2B2XAJ9NVMnTwcJmB5NMY62DTJxigom), [bob](https://testnet.nearblocks.io/txns/FgXgucTWyqEbpdCDafhMG7Z5PTft3JUgNRLHtqTeSNX8) |
| Fire 1: 5 givers; cause account deleted | caught; payout failed → cause dead forever, NEAR carried | [payout](https://testnet.nearblocks.io/txns/9MDEgYJV5pUdKUjWrPK7eZtFy6nFciWfE1aBAA5Sqb19) |
| Fire 2: 1 giver | smothered; max supply 1,000,000,000 → 997,500,357.7 GOOD; refund claimed | [settle](https://testnet.nearblocks.io/txns/F24WZZQpFE6PMHkLyA7e9hzLWXJ4EnXdUNmNryEtdNm2), [refund](https://testnet.nearblocks.io/txns/HrxkTtLqSkTjZ611aShsX6AD7u7zZukPBZNv57mnx4a1) |
| Fire 3: 4 of 5 givers, last 30 s | alice kindled (≈ 9,687 GOOD burned), goal 5 → 4, fire caught | [kindle](https://testnet.nearblocks.io/txns/HJQKjHo5cYkr6UiCbzghHfoNsh5W8mD6xSq5JesgZ4h4), [settle](https://testnet.nearblocks.io/txns/FjTwKFCaym8r3QYuUEM31tr4AFimqN4iRv8Kjp8kvuv2) |
| Payout of fire 3 | paid to the next live cause, draining fire 1's carried NEAR | [payout](https://testnet.nearblocks.io/txns/6MfVsappLp3zj5Zs62gSuEJ1CGxBffSCtQFdi1jwc82n) |
| Redeem 10,000 GOOD | NEAR at the floor; floor unchanged | [redeem](https://testnet.nearblocks.io/txns/FtTCBeMWdannHiidSLbgtvPFzNna9iPbGvBYTANd1vhC) |

The run was resumed once at fire 3 after one demo account ran out of gas money; the contract state
was unaffected.

## Contract interface

| Method | Who | What |
|---|---|---|
| `give(week, cause, sparked_by?)` | anyone | throw NEAR into the current fire (`week` and `cause` must match) |
| `settle()` | anyone | settle up to 16 ended fires (state only) |
| `payout(week)` | anyone | pay a caught fire's 90% (+ carry) to its cause |
| `claim(weeks)` | givers | GOOD shares of caught fires; NEAR refunds of smothered fires |
| `kindle(week)` | holders | burn GOOD to lower the goal by one in the rescue window |
| `redeem(amount)` | holders | burn GOOD for its share of the Hearth |
| `close(week)` | anyone | 52 weeks after a catch, cancel its unclaimed GOOD |
| `report(week, uri, sha256)` | the paid cause | publish what the gift funded |
| views | anyone | `current_fire`, `get_fire`, `list_fires`, `get_hearth`, `get_supply`, `get_stats`, `get_account`, `get_gift`, `get_causes`, `kindle_quote`, `fire_card`, `check_invariants`, NEP-141/145/148 |

Events: NEP-297 standard `goodcoin`, plus NEP-141 `ft_mint` / `ft_burn`.
- `fire_gift`, `fire_caught`, `fire_smothered`
- `payout`, `cause_dead`, `extinguished`
- `kindled`, `redeemed`, `claimed_good`, `claimed_near`, `closed`, `report`

## Repository

```
contract/  Rust NEAR contract (near-sdk 5.30): fire, payout, claims, hearth, kindle, token, views, math
sim/       Python: exact integer reference model of the protocol + economic simulation
tests/     golden trace replayed by both the simulator and the contract tests
deploy/    make_config.py (demo / production), deploy.sh (deploy + seed + lock), e2e.sh (live run)
```

## Libraries and AI assistance

Rust `near-sdk` / `near-contract-standards` 5.30.1, `uint`, `proptest`; Python numpy, matplotlib,
pytest. Designed and written with AI assistance (Claude Code) under human direction, as the hackathon
rules require us to disclose.
