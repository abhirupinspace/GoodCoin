/** Evidence hashing. Local files are hashed in the browser (Web Crypto) and never leave the device. */

const MAX_LOCAL_BYTES = 100 * 1024 * 1024;

export function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

export async function hashFile(file: File): Promise<string> {
  if (file.size > MAX_LOCAL_BYTES) throw new Error("File is larger than 100 MB; hash it locally (e.g. `shasum -a 256`) and paste the result.");
  return sha256Hex(await file.arrayBuffer());
}

export interface UrlHash {
  url: string;
  final_url: string;
  sha256: string;
  bytes: number;
  content_type: string | null;
}

/** Server-side fetch + hash via /api/hash (http(s) only, 5 MB cap, private addresses refused). */
export async function hashUrl(url: string): Promise<UrlHash> {
  const res = await fetch(`/api/hash?url=${encodeURIComponent(url)}`);
  const body = (await res.json()) as UrlHash | { error: string };
  if (!res.ok || "error" in body) throw new Error("error" in body ? body.error : `Hashing failed (${res.status})`);
  return body;
}
