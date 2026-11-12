import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Good Wall" };

export default function Page() {
  return (
    <Outline
      title="Good Wall"
      purpose="Searchable archive of every fire and what it funded."

      sections={[
  {
    "title": "Filters",
    "notes": "All · Caught · Smothered · By cause · By date (week → date from genesis + week·W)."
  },
  {
    "title": "Fire cards",
    "notes": "Outcome, givers / goal, NEAR total, NEAR to cause, date, cause, link to /good-wall/[id].",
    "data": [
      "list_fires",
      "get_causes"
    ]
  },
  {
    "title": "Cause reports",
    "notes": "Reports posted by paid causes (report(week, uri, sha256)).",
    "data": [
      "get_report",
      "event: report"
    ]
  }
]}
    />
  );
}
