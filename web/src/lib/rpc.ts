/**
 * Minimal NEAR JSON-RPC client (plain fetch). Used for every read so the app works without a wallet,
 * and for confirming transactions after the wallet sends them.
 */
import { CONTRACT_ID, RPC_URLS } from "./config";
import type { ViewMethods } from "./types";

/** The configured contract account does not exist or has no code deployed yet. */
export class ContractNotDeployedError extends Error {
  constructor(public readonly contractId: string) {
    super(`Contract ${contractId} is not deployed on testnet yet.`);
    this.name = "ContractNotDeployedError";
  }
}

/** The RPC answered, but the call itself failed (e.g. a contract panic). */
export class RpcCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RpcCallError";
  }
}

interface RpcEnvelope<T> {
  result?: T;
  error?: { name?: string; cause?: { name?: string }; data?: unknown; message?: string };
}

/** Index of the endpoint that last answered; public RPCs rate-limit, so stick with whichever works. */
let preferred = 0;

/** POST a JSON-RPC request, falling back to the next RPC URL on network/HTTP errors (incl. 429). */
export async function rpc<T>(method: string, params: unknown): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < RPC_URLS.length; i++) {
    const idx = (preferred + i) % RPC_URLS.length;
    const url = RPC_URLS[idx];
    let body: RpcEnvelope<T>;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "goodcoin", method, params }),
      });
      if (!res.ok) throw new Error(`RPC ${url} responded ${res.status}`);
      body = (await res.json()) as RpcEnvelope<T>;
    } catch (e) {
      lastError = e;
      continue;
    }
    preferred = idx;
    if (body.error) {
      const cause = body.error.cause?.name;
      if (cause === "UNKNOWN_ACCOUNT" || cause === "NO_CONTRACT_CODE") throw new ContractNotDeployedError(CONTRACT_ID);
      throw new RpcCallError(String(body.error.data ?? body.error.message ?? "RPC error"));
    }
    return body.result as T;
  }
  throw lastError instanceof Error ? lastError : new Error("All RPC endpoints failed");
}

interface CallFunctionResult {
  result?: number[];
  error?: string;
}

/** Pull "Smart contract panicked: X" out of a wasm error string. */
export function panicMessage(error: string): string {
  const marker = "Smart contract panicked: ";
  const i = error.indexOf(marker);
  if (i < 0) return error;
  const msg = error.slice(i + marker.length);
  // View errors wrap the message as FunctionCallError(ExecutionError("…")); tx outcomes give it bare.
  return msg.endsWith('"))') ? msg.slice(0, -3) : msg;
}

/** Call a view method on the GOODCOIN contract and JSON-decode the result. */
export async function view<M extends keyof ViewMethods>(
  method: M,
  args: Record<string, unknown> = {},
): Promise<ViewMethods[M]> {
  const r = await rpc<CallFunctionResult>("query", {
    request_type: "call_function",
    finality: "final",
    account_id: CONTRACT_ID,
    method_name: method,
    args_base64: btoa(JSON.stringify(args)),
  });
  if (r.error) {
    if (r.error.includes("CodeDoesNotExist")) throw new ContractNotDeployedError(CONTRACT_ID);
    throw new RpcCallError(panicMessage(r.error));
  }
  return JSON.parse(new TextDecoder().decode(new Uint8Array(r.result ?? []))) as ViewMethods[M];
}

export interface AccessKeyInfo {
  public_key: string;
  access_key: { permission: "FullAccess" | { FunctionCall: unknown } };
}

/** Access keys on the contract account. Zero full-access keys = nobody can redeploy or change it. */
export async function viewAccessKeys(accountId: string = CONTRACT_ID): Promise<AccessKeyInfo[]> {
  const r = await rpc<{ keys: AccessKeyInfo[] }>("query", {
    request_type: "view_access_key_list",
    finality: "final",
    account_id: accountId,
  });
  return r.keys;
}

/** Native NEAR balance (yoctoNEAR string) of any account. */
export async function viewNearBalance(accountId: string): Promise<string> {
  const r = await rpc<{ amount: string }>("query", {
    request_type: "view_account",
    finality: "final",
    account_id: accountId,
  });
  return r.amount;
}

type ExecutionStatus = { SuccessValue?: string; Failure?: unknown } | string;

export interface TxOutcome {
  status: ExecutionStatus;
  transaction: { hash: string };
}

/** Wait until the transaction is final on-chain and return its outcome (never trust the wallet's word alone). */
export async function waitForFinalTx(hash: string, signerId: string): Promise<TxOutcome> {
  return rpc<TxOutcome>("tx", { tx_hash: hash, sender_account_id: signerId, wait_until: "FINAL" });
}

/** Returns the failure message, or null if the transaction succeeded. */
export function txFailure(outcome: TxOutcome): string | null {
  const s = outcome.status;
  if (typeof s === "object" && s && "Failure" in s && s.Failure) {
    return findPanic(s.Failure) ?? JSON.stringify(s.Failure);
  }
  if (typeof s === "string" && s !== "SuccessValue") return `Transaction status: ${s}`;
  return null;
}

/** Depth-first search for the first string in an error object, preferring contract panics. */
function findPanic(node: unknown): string | null {
  if (typeof node === "string") return node.includes("panicked") ? panicMessage(node) : null;
  if (node && typeof node === "object") {
    for (const v of Object.values(node)) {
      const found = findPanic(v);
      if (found) return found;
    }
  }
  return null;
}
