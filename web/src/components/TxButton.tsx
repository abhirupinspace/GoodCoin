"use client";

import { useState, type ReactNode } from "react";
import { DEPOSIT, txUrl, type ChangeMethod } from "@/lib/config";
import { formatNear } from "@/lib/format";
import { TxError, useNear } from "@/near/NearProvider";
import { Button, ExternalLink } from "./ui";

type State =
  | { kind: "idle" }
  | { kind: "signing" }
  | { kind: "done"; hash: string }
  | { kind: "error"; message: string; hash: string | null };

/** One line explaining the attached deposit for a method (nothing for zero-deposit methods). */
export function DepositNote({ method }: { method: ChangeMethod }) {
  if (DEPOSIT[method] === "0") return null;
  return (
    <p className="text-xs text-muted-fg">
      Attaches {formatNear(DEPOSIT[method])} NEAR: covers on-chain storage; excess refunded.
    </p>
  );
}

/** Link + status for a transaction hash. */
export function TxLink({ hash }: { hash: string }) {
  return (
    <ExternalLink href={txUrl(hash)} className="font-mono">
      {hash.slice(0, 10)}…
    </ExternalLink>
  );
}

/**
 * Sends one contract call. Shows why it is disabled, waits for finality, links the transaction,
 * and surfaces the contract's own error message on failure.
 */
export function TxButton({
  method,
  args,
  children,
  variant = "primary",
  disabledReason,
  onDone,
  showDeposit = true,
}: {
  method: ChangeMethod;
  args: Record<string, unknown>;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  /** When set, the button is disabled and this reason is shown. */
  disabledReason?: string | null;
  onDone?: (hash: string) => void;
  showDeposit?: boolean;
}) {
  const { accountId, call, connect } = useNear();
  const [state, setState] = useState<State>({ kind: "idle" });

  if (!accountId) {
    return (
      <Button variant="secondary" onClick={() => connect()}>
        Connect wallet to continue
      </Button>
    );
  }

  const run = async () => {
    setState({ kind: "signing" });
    try {
      const hash = await call(method, args);
      setState({ kind: "done", hash });
      onDone?.(hash);
    } catch (e) {
      const err = e instanceof TxError ? e : new TxError(e instanceof Error ? e.message : String(e), null);
      setState({ kind: "error", message: err.message, hash: err.hash });
    }
  };

  const busy = state.kind === "signing";
  return (
    <div className="space-y-1.5">
      <Button variant={variant} onClick={run} disabled={busy || !!disabledReason} aria-busy={busy}>
        {busy ? "Waiting for wallet and finality…" : children}
      </Button>
      {disabledReason && <p className="text-xs text-muted-fg">{disabledReason}</p>}
      {!disabledReason && showDeposit && <DepositNote method={method} />}
      <div aria-live="polite" className="text-xs">
        {state.kind === "done" && (
          <p className="text-ok">
            Confirmed on-chain: <TxLink hash={state.hash} />
          </p>
        )}
        {state.kind === "error" && (
          <p className="text-bad">
            Failed: {state.message} {state.hash && <TxLink hash={state.hash} />}
          </p>
        )}
      </div>
    </div>
  );
}
