"use client";

import type { ReactNode } from "react";
import { accountUrl, CONTRACT_ID } from "@/lib/config";
import { useConfig } from "@/lib/queries";
import { ContractNotDeployedError } from "@/lib/rpc";
import { Card, ExternalLink } from "./ui";

/** Replaces every page with one clear explanation when the configured contract does not exist yet. */
export function ContractGate({ children }: { children: ReactNode }) {
  const config = useConfig();
  if (!(config.error instanceof ContractNotDeployedError)) return <>{children}</>;
  return (
    <Card title="Contract not deployed yet">
      <div className="space-y-2 text-sm">
        <p>
          No GOODCOIN contract is deployed at <ExternalLink href={accountUrl(CONTRACT_ID)} className="font-mono">{CONTRACT_ID}</ExternalLink> on
          testnet, so there is no data to show. Nothing on this site is simulated.
        </p>
        <p className="text-muted-fg">
          Point the app at a live deployment with <code>NEXT_PUBLIC_GOODCOIN_CONTRACT</code> (default: the demo contract
          goodcoin-demo-530a20.testnet) and restart.
        </p>
      </div>
    </Card>
  );
}
