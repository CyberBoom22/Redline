-- Redline catalog dashboard — D1 schema.
--
-- Written by the daily scan (POST /api/ingest) and read by the dashboard.
-- Apply with:  npx wrangler d1 execute redline-catalog --remote --file worker/schema.sql

-- One row per scan.
CREATE TABLE IF NOT EXISTS runs (
  run_id         TEXT PRIMARY KEY,
  date           TEXT NOT NULL,
  started_at     TEXT NOT NULL,
  finished_at    TEXT NOT NULL,
  duration_ms    INTEGER NOT NULL DEFAULT 0,
  requests       INTEGER NOT NULL DEFAULT 0,
  request_limit  INTEGER NOT NULL DEFAULT 100,
  scanned        INTEGER NOT NULL DEFAULT 0,
  unchanged      INTEGER NOT NULL DEFAULT 0,
  added_count    INTEGER NOT NULL DEFAULT 0,
  changed_count  INTEGER NOT NULL DEFAULT 0,
  removed_count  INTEGER NOT NULL DEFAULT 0,
  error_count    INTEGER NOT NULL DEFAULT 0,
  stopped_reason TEXT,
  queued_next    INTEGER NOT NULL DEFAULT 0,
  by_vendor      TEXT NOT NULL DEFAULT '{}',  -- JSON
  ingested_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_date ON runs (date DESC);

-- What each scan added, changed or removed.
CREATE TABLE IF NOT EXISTS changes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT NOT NULL REFERENCES runs (run_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('added', 'changed', 'removed')),
  part_id     TEXT NOT NULL,
  vendor_id   TEXT NOT NULL,
  vendor_name TEXT,
  name        TEXT NOT NULL,
  url         TEXT,
  sku         TEXT,
  price       REAL,
  engine_ids  TEXT NOT NULL DEFAULT '[]',  -- JSON array
  fields      TEXT                          -- JSON array of {field, from, to}; 'changed' only
);
CREATE INDEX IF NOT EXISTS idx_changes_run  ON changes (run_id);
CREATE INDEX IF NOT EXISTS idx_changes_part ON changes (part_id);
CREATE INDEX IF NOT EXISTS idx_changes_kind ON changes (kind);

-- Current catalog snapshot, replaced on each ingest.
CREATE TABLE IF NOT EXISTS parts (
  id              TEXT PRIMARY KEY,
  vendor_id       TEXT NOT NULL,
  vendor_name     TEXT,
  url             TEXT,
  name            TEXT NOT NULL,
  brand           TEXT,
  sku             TEXT,
  mpn             TEXT,
  price           REAL,
  currency        TEXT,
  availability    TEXT,
  image_url       TEXT,
  description     TEXT,
  category        TEXT,
  engine_ids      TEXT NOT NULL DEFAULT '[]',  -- JSON array
  first_seen_at   TEXT,
  last_seen_at    TEXT,
  last_changed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_parts_vendor ON parts (vendor_id);
CREATE INDEX IF NOT EXISTS idx_parts_sku    ON parts (sku);

-- Price movements, so the dashboard can chart a part over time.
CREATE TABLE IF NOT EXISTS price_history (
  part_id TEXT NOT NULL,
  date    TEXT NOT NULL,
  price   REAL NOT NULL,
  PRIMARY KEY (part_id, date)
);

-- Pages that failed during a scan.
CREATE TABLE IF NOT EXISTS scan_errors (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs (run_id) ON DELETE CASCADE,
  url    TEXT,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_errors_run ON scan_errors (run_id);
