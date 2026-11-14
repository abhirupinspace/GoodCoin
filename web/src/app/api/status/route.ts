import { fireFromRequest } from "@/lib/config";
import { getStats } from "@/services/contract";

export async function GET(req: Request) {
  const t = Date.now();
  try {
    const s = await getStats(fireFromRequest(req));
    return Response.json({ rpc: "ok", latency_ms: Date.now() - t, current_week: s.current_week, next_to_settle: s.next_to_settle });
  } catch (e) {
    return Response.json({ rpc: "error", error: String(e) }, { status: 503 });
  }
}
