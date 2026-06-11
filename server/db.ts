/**
 * Clautik data layer — a single SQLite database shared by the CLI, the hooks,
 * and the dashboard server. Uses Bun's built-in sqlite (no native compile step).
 *
 * Default location: ~/.clautik/clautik.db  (override with CLAUTIK_DB)
 * The store is global on purpose so one dashboard shows tickets from every
 * project/session, while each ticket records the project it came from.
 */
import { Database } from "bun:sqlite";
import { homedir } from "os";
import { join, dirname } from "path";
import { mkdirSync } from "fs";

export const DB_PATH =
  process.env.CLAUTIK_DB || join(homedir(), ".clautik", "clautik.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    key        TEXT,                                    -- e.g. CLT-12 (set after insert)
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'open',            -- open | in_progress | in_review | done
    priority   TEXT NOT NULL DEFAULT 'medium',          -- urgent | high | medium | low
    type       TEXT NOT NULL DEFAULT 'task',            -- task | bug | epic
    tags       TEXT NOT NULL DEFAULT '',                -- comma-separated labels
    assignee   TEXT NOT NULL DEFAULT '',                -- agent key (claude | maya | …) or ''
    source     TEXT NOT NULL DEFAULT 'dashboard',       -- slash | hook | td | dashboard
    project    TEXT NOT NULL DEFAULT '',                -- cwd the ticket was created in
    session_id TEXT NOT NULL DEFAULT '',
    position   REAL NOT NULL DEFAULT 0,                 -- ordering within a status column
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at  TEXT                                     -- set when status → done (for cycle time)
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);

// Append-only history — backbone of the time-based dashboard charts.
db.exec(`
  CREATE TABLE IF NOT EXISTS activity (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    ticket_key TEXT NOT NULL DEFAULT '',
    action    TEXT NOT NULL,                            -- created | status | priority | type | edited | deleted
    detail    TEXT NOT NULL DEFAULT '',                 -- e.g. "open → in_progress"
    at        TEXT NOT NULL
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_at ON activity(at);`);

/**
 * Additive migrations so pre-existing databases (e.g. tickets created before
 * these columns existed) keep working. ALTER ... ADD COLUMN throws if the column
 * is already there, so each is guarded.
 */
function addColumn(table: string, ddl: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl};`);
  } catch {
    /* column already exists — ignore */
  }
}
addColumn("tickets", "type TEXT NOT NULL DEFAULT 'task'");
addColumn("tickets", "closed_at TEXT");
addColumn("tickets", "tags TEXT NOT NULL DEFAULT ''");
addColumn("tickets", "assignee TEXT NOT NULL DEFAULT ''");
// Backfill closed_at for already-done tickets so cycle-time charts have data.
db.exec(
  "UPDATE tickets SET closed_at = updated_at WHERE status = 'done' AND closed_at IS NULL;"
);
