-- GOODCOIN indexer schema (Neon Postgres 18). A read mirror of the chain; rebuildable from events + views.
CREATE TABLE IF NOT EXISTS contracts (
  id text PRIMARY KEY, kind text NOT NULL, label text NOT NULL, creator text,
  config jsonb NOT NULL, causes jsonb NOT NULL, created_at timestamptz NOT NULL, created_tx text
);
CREATE TABLE IF NOT EXISTS snapshots (
  contract text PRIMARY KEY REFERENCES contracts(id), streak int NOT NULL, longest_streak int NOT NULL,
  current_week bigint NOT NULL, next_to_settle bigint NOT NULL, genesis_ns numeric NOT NULL, week_ns numeric NOT NULL,
  extinguished boolean NOT NULL, current_fire jsonb NOT NULL, supply jsonb NOT NULL, hearth jsonb NOT NULL,
  floor_ratio double precision NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS fires (
  contract text NOT NULL REFERENCES contracts(id), week bigint NOT NULL, status text NOT NULL, cause int NOT NULL,
  givers int NOT NULL, goal int NOT NULL, total numeric NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL,
  PRIMARY KEY (contract, week)
);
CREATE TABLE IF NOT EXISTS events (
  receipt_id text NOT NULL, idx int NOT NULL, contract text NOT NULL, block_height bigint NOT NULL, ts timestamptz NOT NULL,
  tx_hash text, signer text, standard text NOT NULL, event text NOT NULL, data jsonb NOT NULL, PRIMARY KEY (receipt_id, idx)
);
CREATE INDEX IF NOT EXISTS events_contract_ts ON events (contract, ts DESC);
CREATE INDEX IF NOT EXISTS events_ts ON events (ts DESC);
CREATE TABLE IF NOT EXISTS cursors (name text PRIMARY KEY, value bigint NOT NULL, updated_at timestamptz NOT NULL);
