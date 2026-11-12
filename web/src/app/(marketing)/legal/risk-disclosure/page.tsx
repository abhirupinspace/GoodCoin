import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Risk disclosure" };

export default function Page() {
  return (
    <Outline
      title="Risk disclosure"
      purpose="Protocol and token risks: testnet, unaudited, donation not investment, floor in NEAR only."

      sections={[
  {
    "title": "Content pending design"
  }
]}
    />
  );
}
