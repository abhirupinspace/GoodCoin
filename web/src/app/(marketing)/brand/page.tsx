import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Brand" };

export default function Page() {
  return (
    <Outline
      title="Brand"
      purpose="Logo, colours, fire assets, media kit."

      sections={[
  {
    "title": "Content pending design"
  }
]}
    />
  );
}
