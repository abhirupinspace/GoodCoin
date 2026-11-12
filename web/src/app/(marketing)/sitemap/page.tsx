import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Sitemap" };

export default function Page() {
  return (
    <Outline
      title="Sitemap"
      purpose="Human-readable list of every page."

      sections={[
  {
    "title": "Content pending design"
  }
]}
    />
  );
}
