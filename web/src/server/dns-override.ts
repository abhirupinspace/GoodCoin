import "server-only";
// Local-dev escape hatch: some networks refuse DNS for *.neon.tech. With NEON_DNS_OVERRIDE="8.8.8.8,1.1.1.1"
// those hosts are resolved through the given servers instead. Never set in production.
import dns from "node:dns";

let installed = false;

export function installNeonDnsOverride() {
  const servers = process.env.NEON_DNS_OVERRIDE;
  if (installed || !servers) return;
  installed = true;
  const resolver = new dns.Resolver();
  resolver.setServers(servers.split(",").map((s) => s.trim()));
  const original = dns.lookup;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dns as any).lookup = (host: string, opts: any, cb?: any) => {
    if (typeof opts === "function") [cb, opts] = [opts, {}];
    if (!/\.neon\.tech$/.test(host)) return original(host, opts, cb);
    resolver.resolve4(host, (err, addrs) => {
      if (err || addrs.length === 0) return original(host, opts, cb);
      if (opts?.all) cb(null, addrs.map((address) => ({ address, family: 4 })));
      else cb(null, addrs[0], 4);
    });
  };
}
