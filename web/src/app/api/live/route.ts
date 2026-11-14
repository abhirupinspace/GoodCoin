// POST /api/live {name, fire?} → a sealed live query (see src/server/live.ts) for the browser to subscribe to.
import { seal } from "@/server/live";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name, fire } = (await req.json()) as { name?: string; fire?: string | null };
    return Response.json(await seal(String(name), fire ?? null), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "cannot seal" }, { status: 400 });
  }
}
