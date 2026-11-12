// Typed wrappers over every contract view (contract/src/views.rs, kindle.rs, NEP-141/145/148).
import { view } from "@/lib/rpc";
import type {
  AccountView, Cause, Config, FireView, Gift, HearthView, Invariants, Report, StatsView, SupplyView,
} from "@/types/contract";

export const getConfig = () => view<Config>("get_config");
export const getCauses = () => view<Cause[]>("get_causes");
export const getStats = () => view<StatsView>("get_stats");
export const currentFire = () => view<FireView>("current_fire");
export const getFire = (week: string) => view<FireView>("get_fire", { week });
export const listFires = (from: string, limit = 100) => view<FireView[]>("list_fires", { from, limit });
export const getSupply = () => view<SupplyView>("get_supply");
export const getHearth = () => view<HearthView>("get_hearth");
export const getAccount = (account_id: string) => view<AccountView>("get_account", { account_id });
export const getGift = (week: string, account_id: string) => view<Gift | null>("get_gift", { week, account_id });
export const getReport = (week: string) => view<Report | null>("get_report", { week });
export const kindleQuote = (week: string) => view<string | null>("kindle_quote", { week });
export const fireCard = (week: string) => view<string>("fire_card", { week });
export const checkInvariants = () => view<Invariants>("check_invariants");
export const goodBalance = (account_id: string) => view<string>("ft_balance_of", { account_id });
export const storageMin = () => view<{ min: string; max: string | null }>("storage_balance_bounds");
export const storageOf = (account_id: string) => view<{ total: string; available: string } | null>("storage_balance_of", { account_id });
