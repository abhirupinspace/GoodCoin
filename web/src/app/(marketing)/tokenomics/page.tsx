import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Tokenomics" };

export default function Page() {
  return (
    <Outline
      title="Tokenomics"
      purpose="The deeper economics of GOOD, the Hearth and supply — with live numbers, not marketing numbers."

      sections={[
  {
    "title": "GOOD token",
    "notes": "NEP-141 GOOD, 24 decimals.",
    "data": [
      "ft_metadata"
    ]
  },
  {
    "title": "Maximum supply",
    "notes": "Starts at 1,000,000,000 and only decreases.",
    "data": [
      "get_supply.max_supply"
    ]
  },
  {
    "title": "No premine, no team allocation",
    "notes": "One locked 1-NEAR / 1,000,000-GOOD seed nobody owns (keeps the floor defined)."
  },
  {
    "title": "Minting",
    "notes": "Only at settlement of a caught fire, claimed by givers.",
    "data": [
      "get_supply.total_minted",
      "get_supply.earmarked"
    ]
  },
  {
    "title": "Hearth backing and the redemption floor",
    "data": [
      "get_hearth"
    ]
  },
  {
    "title": "Supply destruction",
    "notes": "Smothered weeks destroy their allowance; close() cancels stale earmarks; burns via redeem and kindle.",
    "data": [
      "list_fires",
      "get_supply.total_burned"
    ]
  },
  {
    "title": "Ratchet",
    "notes": "Goal = Ĝ₀·1.1^e, e up on an unkindled catch, down on a smother, bounded.",
    "data": [
      "get_stats.e",
      "get_config.goal_*"
    ]
  },
  {
    "title": "Kindle economics",
    "notes": "Cost 2^j·φ·min_gift at the floor; who would kindle and why.",
    "data": [
      "kindle_quote"
    ]
  },
  {
    "title": "Example calculations",
    "notes": "The demo-run numbers (fire 0: 1.3 NEAR → 104,000 GOOD; alice 82,000) via lib/protocol.ts."
  },
  {
    "title": "Live protocol statistics panel",
    "data": [
      "get_stats",
      "get_supply",
      "get_hearth",
      "check_invariants"
    ]
  }
]}
    />
  );
}
