import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Contact" };

export default function Page() {
  return (
    <Outline
      title="Contact"
      purpose="How to reach the team."

      sections={[
  {
    "title": "Content pending design"
  }
]}
    />
  );
}
