//! Exact integer arithmetic (SPEC §3, DESIGN §5). Every product of two balances goes through U256.
#![allow(clippy::manual_div_ceil)]
use near_sdk::require;

uint::construct_uint! {
    pub struct U256(4);
}

/// ⌊a·b/c⌋, panicking if the result exceeds u128.
pub fn mul_div(a: u128, b: u128, c: u128) -> u128 {
    require!(c > 0, "division by zero");
    let r = U256::from(a) * U256::from(b) / U256::from(c);
    require!(r <= U256::from(u128::MAX), "overflow");
    r.as_u128()
}

/// ⌈a·b/c⌉.
pub fn mul_div_ceil(a: u128, b: u128, c: u128) -> u128 {
    require!(c > 0, "division by zero");
    let num = U256::from(a) * U256::from(b);
    let c = U256::from(c);
    let r = (num + c - U256::one()) / c;
    require!(r <= U256::from(u128::MAX), "overflow");
    r.as_u128()
}

/// ⌊(a·b·c)/(d·e)⌋ in U256.
pub fn mul3_div2(a: u128, b: u128, c: u128, d: u128, e: u128) -> u128 {
    let den = U256::from(d) * U256::from(e);
    require!(!den.is_zero(), "division by zero");
    let r = U256::from(a) * U256::from(b) * U256::from(c) / den;
    require!(r <= U256::from(u128::MAX), "overflow");
    r.as_u128()
}

/// ⌈(a·b·c)/(d·e)⌉ in U256.
pub fn mul3_div2_ceil(a: u128, b: u128, c: u128, d: u128, e: u128) -> u128 {
    let den = U256::from(d) * U256::from(e);
    require!(!den.is_zero(), "division by zero");
    let num = U256::from(a) * U256::from(b) * U256::from(c);
    let r = (num + den - U256::one()) / den;
    require!(r <= U256::from(u128::MAX), "overflow");
    r.as_u128()
}

/// Floor comparison: (h1/b1) ≥ (h2/b2) ⇔ h1·b2 ≥ h2·b1.
pub fn floor_ge(h1: u128, b1: u128, h2: u128, b2: u128) -> bool {
    U256::from(h1) * U256::from(b2) >= U256::from(h2) * U256::from(b1)
}

fn pow(base: u64, exp: u32) -> U256 {
    let mut r = U256::one();
    for _ in 0..exp {
        r *= U256::from(base);
    }
    r
}

/// Ĝ(e) = ⌈g0·11^e/10^e⌉ for e ≥ 0, ⌈g0·10^k/11^k⌉ for e = −k < 0.
pub fn base_goal(g0: u32, e: i32) -> u32 {
    let (num, den) = if e >= 0 {
        (U256::from(g0) * pow(11, e as u32), pow(10, e as u32))
    } else {
        let k = (-e) as u32;
        (U256::from(g0) * pow(10, k), pow(11, k))
    };
    let r = (num + den - U256::one()) / den;
    r.as_u32()
}

/// e_max: largest e ≥ 0 with g0·11^e ≤ gmax·10^e.
pub fn e_max(g0: u32, gmax: u32) -> i32 {
    let mut e = 0u32;
    while e < 70 && U256::from(g0) * pow(11, e + 1) <= U256::from(gmax) * pow(10, e + 1) {
        e += 1;
    }
    e as i32
}

/// e_min: smallest e ≤ 0 with g0·10^k ≥ gmin·11^k (k = −e).
pub fn e_min(g0: u32, gmin: u32) -> i32 {
    let mut k = 0u32;
    while k < 70 && U256::from(g0) * pow(10, k + 1) >= U256::from(gmin) * pow(11, k + 1) {
        k += 1;
    }
    -(k as i32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ratchet_round_trip_and_bounds() {
        assert_eq!(base_goal(20, 0), 20);
        assert_eq!(base_goal(20, 1), 22);
        assert_eq!(base_goal(20, 7), 39); // 20·1.1^7 = 38.97
        assert_eq!(base_goal(20, -1), 19); // 18.18 → 19
        assert_eq!(base_goal(4, 1), 5); // 4.4 → 5
        assert_eq!(e_max(20, 10_000), 65);
        assert_eq!(e_min(20, 5), -14);
        assert_eq!(e_max(4, 100), 33);
        assert_eq!(e_min(4, 2), -7);
        assert!(base_goal(20, 65) <= 10_000);
        assert!(base_goal(4, -7) >= 2);
    }

    #[test]
    fn mul_div_rounding() {
        assert_eq!(mul_div(10, 3, 4), 7);
        assert_eq!(mul_div_ceil(10, 3, 4), 8);
        assert_eq!(mul_div_ceil(8, 1, 4), 2);
        // 1e33 · 1e30 does not overflow in U256.
        assert_eq!(mul_div(10u128.pow(33), 10u128.pow(30), 10u128.pow(30)), 10u128.pow(33));
    }

    #[test]
    fn floor_compare() {
        assert!(floor_ge(2, 1, 1, 1));
        assert!(floor_ge(1, 1, 1, 1));
        assert!(!floor_ge(1, 2, 1, 1));
    }
}
