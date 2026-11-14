// Row shapes of the live queries in src/server/live.ts (numeric/bigint arrive as strings, jsonb parsed, timestamptz as Date).
import type { FireView, HearthView, SupplyView } from "@/types/contract";

export type LiveName = "directory" | "snapshot" | "fires" | "feed";

export interface DirectoryRow {
  id: string;
  kind: "flagship" | "demo" | "community";
  label: string;
  creator: string | null;
  causes: { account: string; name: string; uri: string; dead: boolean }[];
  created_at: Date;
  streak: number;
  longest_streak: number;
  current_week: string;
  next_to_settle: string;
  week_ns: string;
  genesis_ns: string;
  current_fire: FireView;
  floor_ratio: number;
  supply: SupplyView;
  updated_at: Date;
}

export interface SnapshotRow {
  contract: string;
  streak: number;
  longest_streak: number;
  current_week: string;
  next_to_settle: string;
  current_fire: FireView;
  supply: SupplyView;
  hearth: HearthView;
  floor_ratio: number;
  updated_at: Date;
}

export interface FireRow {
  contract: string;
  week: string;
  status: "burning" | "ended" | "caught" | "smothered";
  cause: number;
  givers: number;
  goal: number;
  total: string;
  data: FireView;
  updated_at: Date;
}

export interface FeedRow {
  receipt_id: string;
  idx: number;
  contract: string;
  block_height: string;
  ts: Date;
  tx_hash: string | null;
  signer: string | null;
  event: string;
  data: Record<string, unknown> | Record<string, unknown>[];
}
