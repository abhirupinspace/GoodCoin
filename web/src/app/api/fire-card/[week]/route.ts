import { fireCard } from "@/services/contract";

// Serves the contract's on-chain fire card as an image, for social previews (og:image) and embeds.
export async function GET(_req: Request, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const svg = await fireCard(week);
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=30" } });
}
