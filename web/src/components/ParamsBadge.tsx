"use client";

import { CONTRACT_ID } from "@/lib/config";
import { useConfig } from "@/lib/queries";
import { ContractNotDeployedError } from "@/lib/rpc";
import { ExternalLink } from "./ui";
import { accountUrl } from "@/lib/config";

/** Persistent banner stating which immutable parameter set (from get_config().label) this UI is showing. */
export function ParamsBadge() {
  const config = useConfig();
  let text = "Loading contract parameters…";
  let tone = "bg-muted text-muted-fg";
  if (config.data) {
    const label = config.data.label;
    text = `${label.toUpperCase()} PARAMETERS — testnet`;
    tone = label === "production" ? "bg-info-soft text-info" : "bg-warn-soft text-warn";
  } else if (config.error instanceof ContractNotDeployedError) {
    text = "CONTRACT NOT DEPLOYED — testnet";
    tone = "bg-bad-soft text-bad";
  } else if (config.error) {
    text = "Parameters unavailable (RPC error) — testnet";
    tone = "bg-bad-soft text-bad";
  }
  return (
    <div className={`${tone} px-4 py-1.5 text-center text-xs font-semibold tracking-wide`}>
      <span>{text}</span>
      <span className="font-normal"> · contract </span>
      <ExternalLink href={accountUrl(CONTRACT_ID)} className="font-mono font-normal break-all">
        {CONTRACT_ID}
      </ExternalLink>
      {config.data?.label === "demo" && (
        <span className="hidden font-normal sm:inline"> · short epochs and tiny targets so the full cycle can be shown live</span>
      )}
    </div>
  );
}
