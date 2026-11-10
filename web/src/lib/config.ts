/**
 * Runtime configuration. Everything here is public (NEXT_PUBLIC_*), so it is safe in the browser.
 * The only server-only setting is NEARBLOCKS_API_KEY, read in src/app/api/txns/route.ts.
 */
import { nearToYocto, teraToGas } from "near-api-js";

export const NETWORK = "testnet" as const;

export const CONTRACT_ID = process.env.NEXT_PUBLIC_GOODCOIN_CONTRACT || "goodcoin-demo-530a20.testnet";

/**
 * Tried in order; the next one is used when a request fails (network error or HTTP error such as 429).
 * FastNEAR is first because rpc.testnet.near.org now answers every request with HTTP 429
 * "THIS ENDPOINT IS DEPRECATED" (checked 2026-11-11); it stays as a fallback.
 */
export const RPC_URLS: string[] = [
  process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://test.rpc.fastnear.com",
  "https://test.rpc.fastnear.com",
  "https://rpc.testnet.near.org",
].filter((u, i, all) => all.indexOf(u) === i);

export const EXPLORER = "https://testnet.nearblocks.io";
export const txUrl = (hash: string) => `${EXPLORER}/txns/${hash}`;
export const accountUrl = (account: string) => `${EXPLORER}/address/${account}`;

/** Optional link target for docs (e.g. https://github.com/org/repo). Paths are shown as text when unset. */
export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "";

/** 100 Tgas for every change call. */
export const GAS = teraToGas(100).toString();

/**
 * Attached deposits. Storage-charging methods are payable and refund whatever is not used for
 * on-chain storage (see `charge_storage` in contract/src/lib.rs). Non-payable methods must attach 0.
 */
export const DEPOSIT = {
  submit_deed: nearToYocto("0.05").toString(),
  create_challenge: nearToYocto("0.05").toString(),
  create_proposal: nearToYocto("0.05").toString(),
  open_dispute: nearToYocto("0.05").toString(),
  attest: nearToYocto("0.02").toString(),
  vote_proposal: nearToYocto("0.02").toString(),
  vote_dispute: nearToYocto("0.02").toString(),
  claim_reward: nearToYocto("0.01").toString(),
  claim_vested: nearToYocto("0.01").toString(),
  finalize_proposal: nearToYocto("0.01").toString(),
  publish_challenge: "0",
  settle_epochs: "0",
} as const;

export type ChangeMethod = keyof typeof DEPOSIT;
