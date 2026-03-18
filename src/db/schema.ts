// SQLite database schema for offline storage

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- Memos table
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  server_id TEXT UNIQUE,
  content TEXT NOT NULL,
  visibility TEXT DEFAULT 'PRIVATE',
  pinned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  sync_status TEXT DEFAULT 'pending'
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_memos_sync_status ON memos(sync_status);
CREATE INDEX IF NOT EXISTS idx_memos_updated_at ON memos(updated_at);
CREATE INDEX IF NOT EXISTS idx_memos_pinned ON memos(pinned);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

-- Memo-Tag junction table
CREATE TABLE IF NOT EXISTS memo_tags (
  memo_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (memo_id, tag_id),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Sync queue for pending operations
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memo_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
);

-- App settings/metadata
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Insert schema version
INSERT OR REPLACE INTO app_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
`;

export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS sync_queue;
DROP TABLE IF EXISTS memo_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS memos;
DROP TABLE IF EXISTS app_meta;
`;
