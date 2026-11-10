/**
 * SSRF guard for /api/hash. Pure functions (no I/O) so they are unit-testable;
 * the route handler adds DNS resolution and re-checks every redirect hop.
 */
import { isIP } from "node:net";

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan"];

/** Syntactic checks: http(s) only, no credentials, no local hostnames, no private IP literals. */
export function checkUrlSyntax(input: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, error: "Not a valid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: "Only http(s) URLs can be fetched" };
  if (url.username || url.password) return { ok: false, error: "URLs with credentials are not allowed" };
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return { ok: false, error: "Missing host" };
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, error: "Local hostnames are not allowed" };
  }
  if (isIP(host) && isBlockedIp(host)) return { ok: false, error: "Private or reserved IP addresses are not allowed" };
  return { ok: true, url };
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (cloud metadata lives here)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function inV4Range(ip: string, [base, bits]: [string, number]): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

/** Expand an IPv6 address into 8 hextets (handles "::" and embedded IPv4). */
function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0];
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    s = s.slice(0, -v4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  const fill = s.includes("::") ? 8 - h.length - t.length : 0;
  const parts = [...h, ...Array(fill).fill("0"), ...t];
  if (parts.length !== 8) return null;
  return parts.map((p) => parseInt(p, 16));
}

/** True for loopback, private, link-local, multicast, reserved, and IPv4-mapped/compatible versions of those. */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return V4_BLOCKED.some((r) => inV4Range(ip, r));
  if (kind !== 6) return true; // not an IP: refuse rather than guess
  const x = expandV6(ip);
  if (!x) return true;
  const allZeroPrefix = x.slice(0, 5).every((v) => v === 0);
  // ::ffff:a.b.c.d (mapped) and ::a.b.c.d (deprecated compatible) → check the IPv4 part
  if (allZeroPrefix && (x[5] === 0xffff || x[5] === 0) && (x[6] !== 0 || x[7] > 1)) {
    const v4 = `${x[6] >> 8}.${x[6] & 255}.${x[7] >> 8}.${x[7] & 255}`;
    return isBlockedIp(v4);
  }
  if (x.every((v) => v === 0)) return true; // ::
  if (x.slice(0, 7).every((v) => v === 0) && x[7] === 1) return true; // ::1
  if ((x[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((x[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((x[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (x[0] === 0x2001 && x[1] === 0x0db8) return true; // documentation
  if (x[0] === 0x0064 && x[1] === 0xff9b) return true; // NAT64 (could reach internal v4)
  return false;
}
