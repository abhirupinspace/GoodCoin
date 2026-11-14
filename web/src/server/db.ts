import "server-only";
// Neon Postgres over HTTP (serverless driver). The database is a read mirror of the chain: anyone can
// rebuild it from the contracts' events and views, and the site falls back to RPC when it is unavailable.
import { neon } from "@neondatabase/serverless";
import { installNeonDnsOverride } from "./dns-override";

installNeonDnsOverride();

let client: ReturnType<typeof neon> | null = null;

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  client ??= neon(url);
  return client;
}

export const hasDb = () => !!process.env.DATABASE_URL;
