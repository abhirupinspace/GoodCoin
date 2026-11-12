import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <Outline
      title="Privacy policy"
      purpose="What the site stores (nothing server-side besides cached chain data)."

      sections={[
  {
    "title": "Content pending design"
  }
]}
    />
  );
}
