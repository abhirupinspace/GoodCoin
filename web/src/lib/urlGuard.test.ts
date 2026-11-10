import { describe, expect, it } from "vitest";
import { checkUrlSyntax, isBlockedIp } from "./urlGuard";

describe("checkUrlSyntax (SSRF guard for /api/hash)", () => {
  it("accepts public http(s) URLs", () => {
    expect(checkUrlSyntax("https://github.com/near/docs/pull/1").ok).toBe(true);
    expect(checkUrlSyntax("http://example.com/a.png").ok).toBe(true);
    expect(checkUrlSyntax("https://8.8.8.8/").ok).toBe(true);
  });

  it.each([
    "ftp://example.com/x",
    "file:///etc/passwd",
    "ipfs://bafy",
    "javascript:alert(1)",
    "not a url",
    "https://user:pass@example.com/",
    "http://localhost:3000/api",
    "http://foo.localhost/",
    "http://printer.local/",
    "http://metadata.google.internal/",
    "http://127.0.0.1/",
    "http://2130706433/", // 127.0.0.1 as an integer; WHATWG URL normalizes it
    "http://0x7f.1/",
    "http://10.1.2.3/",
    "http://172.20.0.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
  ])("rejects %s", (url) => {
    expect(checkUrlSyntax(url).ok).toBe(false);
  });
});

describe("isBlockedIp (applied to every DNS answer)", () => {
  it("blocks private, loopback, link-local and reserved ranges", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "172.31.255.255", "192.168.0.1", "169.254.169.254", "224.0.0.1", "255.255.255.255", "::", "::1", "fc00::1", "fe80::abcd", "::ffff:10.0.0.1", "::ffff:a00:1", "64:ff9b::a00:1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "140.82.112.3", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("refuses non-IP input", () => {
    expect(isBlockedIp("example.com")).toBe(true);
  });
});
