/**
 * GET /api/hash?url=<http(s) url>
 * Fetches a public URL server-side and returns its SHA-256, so evidence linked on-chain can be hashed
 * (when submitting) or re-checked (when verifying). Nothing is stored.
 *
 * SSRF controls: http(s) only, no credentials, hostname + every resolved IP checked against private/reserved
 * ranges, redirects followed manually (max 3) with the same checks per hop, 10 s timeout, 5 MB cap.
 * Residual risk: DNS can change between our lookup and fetch's own lookup (rebinding). Acceptable for a
 * stateless hashing endpoint with no credentials attached; a production deployment should pin the resolved IP.
 */
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { checkUrlSyntax, isBlockedIp } from "@/lib/urlGuard";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

class HashError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

async function assertPublic(raw: string): Promise<URL> {
  const check = checkUrlSyntax(raw);
  if (!check.ok) throw new HashError(check.error);
  const host = check.url.hostname.replace(/^\[|\]$/g, "");
  if (!isIP(host)) {
    let addrs: { address: string }[];
    try {
      addrs = await lookup(host, { all: true, verbatim: true });
    } catch {
      throw new HashError("Host could not be resolved");
    }
    if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address))) {
      throw new HashError("Host resolves to a private or reserved address");
    }
  }
  return check.url;
}

async function fetchPublic(raw: string, signal: AbortSignal): Promise<Response> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublic(current);
    const res = await fetch(url, { redirect: "manual", signal, headers: { "user-agent": "goodcoin-evidence-hasher" } });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) throw new HashError(`Upstream responded ${res.status}`, 502);
    return res;
  }
  throw new HashError("Too many redirects");
}

async function sha256Capped(res: Response): Promise<{ hex: string; bytes: number }> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) throw new HashError("File is larger than 5 MB", 413);
  const hash = createHash("sha256");
  let bytes = 0;
  const reader = res.body?.getReader();
  if (!reader) throw new HashError("Empty response body", 502);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) {
      await reader.cancel();
      throw new HashError("File is larger than 5 MB", 413);
    }
    hash.update(value);
  }
  return { hex: hash.digest("hex"), bytes };
}

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) return Response.json({ error: "Missing ?url=" }, { status: 400 });
  try {
    const res = await fetchPublic(target, AbortSignal.timeout(TIMEOUT_MS));
    const { hex, bytes } = await sha256Capped(res);
    return Response.json(
      { url: target, final_url: res.url || target, sha256: hex, bytes, content_type: res.headers.get("content-type") },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof HashError) return Response.json({ error: e.message }, { status: e.status });
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return Response.json({ error: timedOut ? "Timed out after 10 s" : "Could not fetch URL" }, { status: 502 });
  }
}
