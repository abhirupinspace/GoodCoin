import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WallFireDetail } from "@/components/public/wall-FireDetail";

type Params = { params: Promise<{ id: string }> };
const valid = (id: string) => /^(0|[1-9]\d{0,15})$/.test(id);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!valid(id)) return { title: "Fire not found" };
  return {
    title: `Fire №${id}`,
    description: `GOODCOIN fire №${id} on the Good Wall: givers, outcome, payout and the cause's report, read from the contract.`,
    openGraph: { images: [`/api/fire-card/${id}`] },
  };
}

export default async function FirePage({ params }: Params) {
  const { id } = await params;
  if (!valid(id)) notFound();
  return <WallFireDetail week={id} />;
}
