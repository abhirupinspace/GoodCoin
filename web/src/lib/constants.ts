/** Compile-time constants copied from contract/src/types.rs (not exposed via get_config). */
export const MAX_PAGE = 100;
export const MAX_NAME = 80;
export const MAX_CATEGORY = 32;
export const MAX_TEXT = 1_000;
export const MAX_LONG_TEXT = 2_000;
export const MAX_URI = 512;
export const MAX_SETTLE_PER_CALL = 16;

/** Token allocations in whole GOOD (24 decimals on-chain). */
export const ALLOCATIONS = {
  max_supply: 1_000_000_000,
  reward_reserve: 400_000_000,
  treasury: 250_000_000,
  vested: 350_000_000,
} as const;

/** Treasury unlock split on success: Community 50%, Environment 30%, Education & open source 20%. */
export const BUCKET_SPLIT_BPS = { Community: 5_000, Environment: 3_000, Education: 2_000 } as const;
export const BUCKET_LABEL = {
  Community: "Community",
  Environment: "Environment",
  Education: "Education & open source",
} as const;

/** Mirrors validate_uri in contract/src/deeds.rs. */
export const URI_PREFIXES = ["https://", "http://", "ipfs://", "ar://"] as const;
export function uriError(uri: string): string | null {
  if (uri.length < 8 || uri.length > MAX_URI) return `Must be 8–${MAX_URI} characters`;
  if (!URI_PREFIXES.some((p) => uri.startsWith(p))) return "Must start with https://, http://, ipfs:// or ar://";
  if (/\s/.test(uri)) return "Must not contain whitespace";
  return null;
}
export const isSha256Hex = (h: string) => /^[0-9a-f]{64}$/.test(h);
