import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Terms of use" };

export default function Page() {
  return (
    <Outline
      title="Terms of use"
      purpose="Terms of use (testnet)."

      sections={[
  {
    "title": "Content pending design"
  }
]}
    />
  );
}
