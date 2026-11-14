// Which deployment the site reads. Testnet only.
export const NETWORK = "testnet" as const;
export const CONTRACT = process.env.NEXT_PUBLIC_GOODCOIN_CONTRACT ?? "goodfire-demo4-ab92.testnet";
export const PRODUCTION_CONTRACT = process.env.NEXT_PUBLIC_GOODCOIN_PRODUCTION ?? "goodfire-prod-ab92.testnet";
export const RPC_URLS = [process.env.NEXT_PUBLIC_NEAR_RPC ?? "https://test.rpc.fastnear.com", "https://rpc.testnet.near.org"];
export const EXPLORER = "https://testnet.nearblocks.io";
export const REPO = "https://github.com/abhirupinspace/GoodCoin";

export const txUrl = (hash: string) => `${EXPLORER}/txns/${hash}`;
export const accountUrl = (account: string) => `${EXPLORER}/address/${account}`;

/** Gas for every change call (80 TGas). */
export const GAS = "80000000000000";
export const ONE_YOCTO = "1";

export const isValidFireId = (id: string) => /^[a-z0-9._-]{2,64}$/.test(id);

/** Fire (contract) from a request's ?fire= param, or the default demo contract. */
export function fireFromRequest(req: Request): string {
  const f = new URL(req.url).searchParams.get("fire");
  return f && isValidFireId(f) ? f : CONTRACT;
}
