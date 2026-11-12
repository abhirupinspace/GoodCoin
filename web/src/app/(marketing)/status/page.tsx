import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Status" };

export default function Page() {
  return (
    <Outline
      title="Status"
      purpose="Frontend, indexer and RPC health."

      sections={[
  {
    "title": "RPC",
    "notes": "Latency of a view call.",
    "data": [
      "get_stats"
    ]
  },
  {
    "title": "Indexer",
    "notes": "Last indexed block of /api/events."
  },
  {
    "title": "Contract",
    "notes": "Invariants and settlement lag.",
    "data": [
      "check_invariants",
      "get_stats.next_to_settle"
    ]
  }
]}
    />
  );
}
