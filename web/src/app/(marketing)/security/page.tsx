import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Security" };

export default function Page() {
  return (
    <Outline
      title="Security"
      purpose="Invariants, limitations and the security model."

      sections={[
  {
    "title": "No admin",
    "notes": "Contract accounts have no access keys; parameters fixed at deploy.",
    "data": [
      "get_config"
    ]
  },
  {
    "title": "Live invariants",
    "notes": "within_cap · supply_equation · floor_never_decreased · solvent.",
    "data": [
      "check_invariants"
    ]
  },
  {
    "title": "Testing",
    "notes": "45+ unit tests, property test, golden trace shared with the Python model, live testnet E2E with tx links."
  },
  {
    "title": "Honest limits",
    "notes": "Colluding cause, accounts ≠ people, giving is giving, unminted burn, curated causes, testnet placeholders."
  }
]}
    />
  );
}
