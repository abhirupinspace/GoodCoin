// Mirrors contract/src/types.rs and contract/src/views.rs. U64/U128 are decimal strings.
export type U64 = string;
export type U128 = string;

export type Outcome = "Open" | "Caught" | "Smothered";
export type PayoutStatus = "None" | "Due" | "Sending" | "Paid" | "Carried";
export type RefundKind = "Smother" | "Carry";

export interface CauseInput { account: string; name: string; uri: string }
export interface Cause extends CauseInput { dead: boolean }

export interface Config {
  label: "production" | "demo" | string;
  week_ns: U64;
  min_gift: U128;
  record_fee: U128;
  fee_bps: number;
  markup_bps: number;
  bounty_bps: number;
  allowance_bps: number;
  seed_good: U128;
  goal_start: number;
  goal_min: number;
  goal_max: number;
  causes: CauseInput[];
}

/** `current_fire`, `get_fire`, `list_fires` */
export interface FireView {
  week: U64;
  start_ns: U64;
  end_ns: U64;
  cause: number;
  cause_account: string;
  cause_name: string;
  base_goal: number;
  kindled: number;
  goal: number;
  givers: number;
  total: U128;
  allowance: U128;
  outcome: Outcome;
  minted: U128;
  payout: PayoutStatus;
  settle_pending: boolean;
  rescue_window_open: boolean;
}

export interface SupplyView {
  max_supply: U128;
  total_minted: U128;
  total_burned: U128;
  circulating: U128;
  earmarked: U128;
  seed: U128;
  headroom: U128;
}

export interface HearthView {
  hearth: U128;
  backed: U128;
  floor_yocto_per_good: U128;
  high_water_h: U128;
  high_water_b: U128;
}

export interface StatsView {
  label: string;
  genesis_ns: U64;
  now_ns: U64;
  current_week: U64;
  next_to_settle: U64;
  e: number;
  e_min: number;
  e_max: number;
  streak: number;
  longest_streak: number;
  extinguished: boolean;
  due_weeks: U64[];
  escrow_open: U128;
  payouts_owed: U128;
  refunds_owed: U128;
  carry_total: U128;
}

export interface Profile {
  first_week: U64;
  sparked_by: string | null;
  sparks: number;
  bounty_weight: U128;
  first_floor_h: U128;
  first_floor_b: U128;
}

export interface AccountView {
  account: string;
  good_balance: U128;
  registered: boolean;
  is_cause: boolean;
  profile: Profile | null;
  /** Floor now vs at first gift, in bps (10000 = unchanged). */
  floor_gain_bps: U128 | null;
}

export interface Gift {
  amount: U128;
  weight: U128;
  claimed_share: boolean;
  claimed_refund: boolean;
  claimed_carry: boolean;
}

export interface Report { cause: string; uri: string; sha256: string }

export interface Invariants {
  within_cap: boolean;
  supply_equation: boolean;
  floor_never_decreased: boolean;
  solvent: boolean;
}

/** NEP-297 `goodcoin` events (contract/src/events.rs) — source for the indexer. */
export type GoodEvent =
  | { event: "fire_gift"; data: { week: U64; giver: string; amount: U128; sparked_by: string | null; bounty: U128 } }
  | { event: "fire_caught"; data: { week: U64; cause: string; givers: number; total: U128; fee: U128; minted: U128; floor_h: U128; floor_b: U128; goal: number } }
  | { event: "fire_smothered"; data: { week: U64; givers: number; total: U128; allowance_destroyed: U128; max_supply: U128 } }
  | { event: "payout"; data: { week: U64; cause: string; amount: U128; status: PayoutStatus } }
  | { event: "cause_dead"; data: { cause: string } }
  | { event: "extinguished"; data: Record<string, never> }
  | { event: "kindled"; data: { week: U64; burner: string; cost: U128; goal: number } }
  | { event: "redeemed"; data: { account: string; good: U128; near: U128 } }
  | { event: "claimed_good"; data: { week: U64; account: string; amount: U128 } }
  | { event: "claimed_near"; data: { week: U64; account: string; kind: RefundKind; amount: U128 } }
  | { event: "closed"; data: { week: U64; cancelled: U128 } }
  | { event: "report"; data: { week: U64; cause: string; uri: string; sha256: string } };
