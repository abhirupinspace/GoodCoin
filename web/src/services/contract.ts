// Typed wrappers over every contract view (contract/src/views.rs + kindle_quote + NEP-141/148).
import { CONTRACT } from "@/lib/config";
import { view } from "@/lib/near";
import type {
  AccountView, Cause, Config, FireView, Gift, HearthView, Invariants, Report, StatsView, SupplyView,
} from "@/types/contract";

const c = CONTRACT;
export const getConfig = () => view<Config>(c, "get_config");
export const getCauses = () => view<Cause[]>(c, "get_causes");
export const getStats = () => view<StatsView>(c, "get_stats");
export const currentFire = () => view<FireView>(c, "current_fire");
export const getFire = (week: string) => view<FireView>(c, "get_fire", { week });
export const listFires = (from: string, limit = 100) => view<FireView[]>(c, "list_fires", { from, limit });
export const getSupply = () => view<SupplyView>(c, "get_supply");
export const getHearth = () => view<HearthView>(c, "get_hearth");
export const getAccount = (account_id: string) => view<AccountView>(c, "get_account", { account_id });
export const getGift = (week: string, account_id: string) => view<Gift | null>(c, "get_gift", { week, account_id });
export const getReport = (week: string) => view<Report | null>(c, "get_report", { week });
export const kindleQuote = (week: string) => view<string | null>(c, "kindle_quote", { week });
export const fireCard = (week: string) => view<string>(c, "fire_card", { week });
export const checkInvariants = () => view<Invariants>(c, "check_invariants");
export const goodBalance = (account_id: string) => view<string>(c, "ft_balance_of", { account_id });
