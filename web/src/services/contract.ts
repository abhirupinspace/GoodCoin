// Typed wrappers over every contract view (contract/src/views.rs, kindle.rs, NEP-141/145/148).
// The last argument picks the fire (contract account); it defaults to the configured demo contract.
import { CONTRACT } from "@/lib/config";
import { view } from "@/lib/rpc";
import type {
  AccountView, Cause, Config, FireView, Gift, HearthView, Invariants, Report, StatsView, SupplyView,
} from "@/types/contract";

type C = string;
export const getConfig = (c: C = CONTRACT) => view<Config>("get_config", {}, c);
export const getCauses = (c: C = CONTRACT) => view<Cause[]>("get_causes", {}, c);
export const getStats = (c: C = CONTRACT) => view<StatsView>("get_stats", {}, c);
export const currentFire = (c: C = CONTRACT) => view<FireView>("current_fire", {}, c);
export const getFire = (week: string, c: C = CONTRACT) => view<FireView>("get_fire", { week }, c);
export const listFires = (from: string, limit = 100, c: C = CONTRACT) => view<FireView[]>("list_fires", { from, limit }, c);
export const getSupply = (c: C = CONTRACT) => view<SupplyView>("get_supply", {}, c);
export const getHearth = (c: C = CONTRACT) => view<HearthView>("get_hearth", {}, c);
export const getAccount = (account_id: string, c: C = CONTRACT) => view<AccountView>("get_account", { account_id }, c);
export const getGift = (week: string, account_id: string, c: C = CONTRACT) => view<Gift | null>("get_gift", { week, account_id }, c);
export const getReport = (week: string, c: C = CONTRACT) => view<Report | null>("get_report", { week }, c);
export const kindleQuote = (week: string, c: C = CONTRACT) => view<string | null>("kindle_quote", { week }, c);
export const fireCard = (week: string, c: C = CONTRACT) => view<string>("fire_card", { week }, c);
export const checkInvariants = (c: C = CONTRACT) => view<Invariants>("check_invariants", {}, c);
export const goodBalance = (account_id: string, c: C = CONTRACT) => view<string>("ft_balance_of", { account_id }, c);
export const storageMin = (c: C = CONTRACT) => view<{ min: string; max: string | null }>("storage_balance_bounds", {}, c);
export const storageOf = (account_id: string, c: C = CONTRACT) =>
  view<{ total: string; available: string } | null>("storage_balance_of", { account_id }, c);
