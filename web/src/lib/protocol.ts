// TODO(web): TypeScript port of the protocol math for the interactive example on /how-it-works and
// /tokenomics. Must use the exact rounding of contract/src/{fire,claims,hearth,kindle}.rs and
// sim/src/goodsim/protocol.py, and be tested by replaying tests/golden/basic.json.
//
// Functions to provide (BigInt in, BigInt out):
//   fee(total, feeBps)                         ⌊X·φ⌋
//   mintable(fee, B, H, markupBps, allowance)  min(A, ⌊fee·B·10⁴/(H·(10⁴+β))⌋)
//   share(M, weight, weightSum)                ⌊M·w/Σw⌋
//   bounty(firstGift, minGift, bountyBps)      ⌊γ·min(g, 1.5·min_gift)/10⁴⌋  (moved, not added)
//   redeem(amount, H, B)                       ⌊a·H/B⌋
//   kindleCost(j, feeBps, minGift, B, H)       ⌈2^j·φ·min_gift·B/(10⁴·H)⌉
//   baseGoal(g0, e)                            ⌈g0·11^e/10^e⌉ | ⌈g0·10^k/11^k⌉
export {};
