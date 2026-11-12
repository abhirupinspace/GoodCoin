import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await params;
  return { title: `Fire #${p.id}` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  return (
    <Outline
      title={`Fire #${p.id}`}
      purpose="One fire's evidence and the cause's report."

      sections={[
  {
    "title": "Outcome and numbers",
    "data": [
      "get_fire"
    ]
  },
  {
    "title": "Payout status and transactions",
    "notes": "Due / Sending / Paid / Carried; tx links.",
    "data": [
      "get_fire.payout",
      "events: payout, cause_dead"
    ]
  },
  {
    "title": "Givers and sparks",
    "data": [
      "events: fire_gift"
    ]
  },
  {
    "title": "Cause report",
    "notes": "URI + sha256 verification.",
    "data": [
      "get_report"
    ]
  },
  {
    "title": "Fire card",
    "notes": "On-chain SVG (also used as the social preview via /api/fire-card/[week]).",
    "data": [
      "fire_card"
    ]
  }
]}
    />
  );
}
