"use client";
import { useState } from "react";
import { TxError, useNear, type ChangeMethod } from "./NearProvider";
import { useToast } from "@/components/ui/Toast";

/** Run a contract call with pending → confirmed / failed toasts. Never reports success before finality. */
export function useTx() {
  const { call, accountId, connect } = useNear();
  const { push, update } = useToast();
  const [busy, setBusy] = useState(false);

  async function run(method: ChangeMethod, args: Record<string, unknown>, deposit = "0", label: string = method): Promise<string | null> {
    if (!accountId) {
      await connect();
      return null;
    }
    setBusy(true);
    const id = push({ kind: "pending", title: `${label}…`, body: "Confirm in your wallet, then we wait for the transaction to be final." });
    try {
      const hash = await call(method, args, deposit);
      update(id, { kind: "success", title: `${label} confirmed`, body: "Final on NEAR. Numbers on this page are refreshed from the contract.", hash });
      return hash;
    } catch (e) {
      const err = e instanceof TxError ? e : new TxError(String(e), null);
      update(id, { kind: "error", title: `${label} failed`, body: humanError(err.message), hash: err.hash });
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, accountId };
}

const ERRORS: Record<string, string> = {
  WRONG_WEEK: "That fire has ended. Refresh to join the current one.",
  WRONG_CAUSE: "The fire's cause changed after settlement. Refresh and try again.",
  BELOW_MIN_GIFT: "Your total gift this week must reach the minimum gift.",
  DEPOSIT_BELOW_FEE: "A first gift must be more than the 0.005 NEAR record fee.",
  CAUSE_CANNOT_GIVE: "Cause accounts cannot give.",
  EXTINGUISHED: "Every cause is gone; giving is closed. Redemption stays open.",
  SETTLE_FIRST: "Too many fires await settlement. Press “Settle” first, then retry.",
  NOT_RESCUE_WINDOW: "Kindling only opens in the last 10% of the fire.",
  GOAL_MET: "The fire already has enough givers.",
  TOO_FAR_FROM_GOAL: "The fire is too far from its goal to be rescued by kindling.",
  INSUFFICIENT_BALANCE: "Not enough GOOD.",
  NOTHING_TO_CLAIM: "Nothing left to claim for these fires.",
  ATTACH_STORAGE_DEPOSIT: "Your account needs a one-time GOOD storage deposit.",
  NOT_SETTLED: "That fire is not settled yet.",
  NOTHING_TO_SETTLE: "Nothing to settle right now.",
  NOT_DUE: "That payout is not due.",
};
function humanError(msg: string): string {
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  return key ? ERRORS[key] : msg;
}
