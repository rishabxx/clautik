/**
 * Ticket model + CRUD. All ticket mutations in Clautik go through here so the
 * CLI, hooks, and HTTP server stay consistent (key generation, timestamps,
 * column ordering).
 */
import { db } from "./db";

export type Status = "open" | "in_progress" | "in_review" | "done";
export type Priority = "urgent" | "high" | "medium" | "low";
export type TicketType = "task" | "bug" | "epic";

export const STATUSES: Status[] = ["open", "in_progress", "in_review", "done"];
export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];
export const TYPES: TicketType[] = ["task", "bug", "epic"];

export interface Ticket {
  id: number;
  key: string;
  title: string;
  body: string;
  status: Status;
  priority: Priority;
  type: TicketType;
  tags: string;
  assignee: string;
  source: string;
  project: string;
  session_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface Activity {
  id: number;
  ticket_id: number;
  ticket_key: string;
  action: string;
  detail: string;
  at: string;
}

const now = () => new Date().toISOString();

function clampStatus(s: string | undefined): Status {
  return STATUSES.includes(s as Status) ? (s as Status) : "open";
}
function clampPriority(p: string | undefined): Priority {
  return PRIORITIES.includes(p as Priority) ? (p as Priority) : "medium";
}
function clampType(t: string | undefined): TicketType {
  return TYPES.includes(t as TicketType) ? (t as TicketType) : "task";
}
// Tags stored as a clean comma-separated string (lowercased, de-duped, no blanks).
function normalizeTags(t: string | undefined): string {
  if (!t) return "";
  const seen = new Set<string>();
  for (const raw of t.split(",")) {
    const tag = raw.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen].join(",");
}

function logActivity(t: Ticket, action: string, detail = "") {
  db.query(
    `INSERT INTO activity (ticket_id, ticket_key, action, detail, at)
     VALUES ($id, $key, $action, $detail, $at)`
  ).run({
    $id: t.id,
    $key: t.key,
    $action: action,
    $detail: detail,
    $at: now(),
  });
}

export function listActivity(limit = 30): Activity[] {
  return db
    .query("SELECT * FROM activity ORDER BY at DESC, id DESC LIMIT ?")
    .all(limit) as Activity[];
}

export interface CreateInput {
  title: string;
  body?: string;
  priority?: string;
  status?: string;
  type?: string;
  tags?: string;
  assignee?: string;
  source?: string;
  project?: string;
  session_id?: string;
}

export function createTicket(input: CreateInput): Ticket {
  const ts = now();
  const status = clampStatus(input.status);
  // New cards go to the top of their column (smallest position).
  const minPos =
    (db
      .query("SELECT MIN(position) AS p FROM tickets WHERE status = ?")
      .get(status) as { p: number | null }).p ?? 0;

  const info = db
    .query(
      `INSERT INTO tickets (title, body, status, priority, type, tags, assignee, source, project, session_id, position, created_at, updated_at, closed_at)
       VALUES ($title, $body, $status, $priority, $type, $tags, $assignee, $source, $project, $session_id, $position, $created_at, $updated_at, $closed_at)`
    )
    .run({
      $title: input.title.trim(),
      $body: (input.body ?? "").trim(),
      $status: status,
      $priority: clampPriority(input.priority),
      $type: clampType(input.type),
      $tags: normalizeTags(input.tags),
      $assignee: (input.assignee ?? "").trim(),
      $source: input.source ?? "dashboard",
      $project: input.project ?? "",
      $session_id: input.session_id ?? "",
      $position: minPos - 1,
      $created_at: ts,
      $updated_at: ts,
      $closed_at: status === "done" ? ts : null,
    });

  const id = Number(info.lastInsertRowid);
  const key = `CLT-${id}`;
  db.query("UPDATE tickets SET key = ? WHERE id = ?").run(key, id);
  const ticket = getTicket(id)!;
  logActivity(ticket, "created", `${ticket.type} · ${ticket.priority}`);
  return ticket;
}

export function getTicket(id: number): Ticket | null {
  return (db.query("SELECT * FROM tickets WHERE id = ?").get(id) as Ticket) ?? null;
}

export function listTickets(status?: string): Ticket[] {
  if (status) {
    return db
      .query("SELECT * FROM tickets WHERE status = ? ORDER BY position ASC, id DESC")
      .all(status) as Ticket[];
  }
  return db
    .query("SELECT * FROM tickets ORDER BY position ASC, id DESC")
    .all() as Ticket[];
}

export interface UpdateInput {
  title?: string;
  body?: string;
  status?: string;
  priority?: string;
  type?: string;
  tags?: string;
  assignee?: string;
  position?: number;
}

export function updateTicket(id: number, patch: UpdateInput): Ticket | null {
  const existing = getTicket(id);
  if (!existing) return null;

  const ts = now();
  const status =
    patch.status !== undefined ? clampStatus(patch.status) : existing.status;
  const priority =
    patch.priority !== undefined ? clampPriority(patch.priority) : existing.priority;
  const type = patch.type !== undefined ? clampType(patch.type) : existing.type;

  // closed_at tracks the moment a ticket enters "done" (and clears on reopen),
  // which is what cycle-time and created-vs-resolved charts read.
  let closed_at = existing.closed_at;
  if (status === "done" && existing.status !== "done") closed_at = ts;
  else if (status !== "done" && existing.status === "done") closed_at = null;

  const merged = {
    title: patch.title?.trim() ?? existing.title,
    body: patch.body !== undefined ? patch.body.trim() : existing.body,
    status,
    priority,
    type,
    tags: patch.tags !== undefined ? normalizeTags(patch.tags) : existing.tags,
    assignee: patch.assignee !== undefined ? patch.assignee.trim() : existing.assignee,
    position: patch.position !== undefined ? patch.position : existing.position,
    updated_at: ts,
    closed_at,
  };

  db.query(
    `UPDATE tickets SET title=$title, body=$body, status=$status, priority=$priority,
       type=$type, tags=$tags, assignee=$assignee, position=$position,
       updated_at=$updated_at, closed_at=$closed_at WHERE id=$id`
  ).run({
    $title: merged.title,
    $body: merged.body,
    $status: merged.status,
    $priority: merged.priority,
    $type: merged.type,
    $tags: merged.tags,
    $assignee: merged.assignee,
    $position: merged.position,
    $updated_at: merged.updated_at,
    $closed_at: merged.closed_at,
    $id: id,
  });

  const updated = getTicket(id)!;
  // Log meaningful field changes (a bare drag-reorder changes only position → no log).
  if (status !== existing.status)
    logActivity(updated, "status", `${existing.status} → ${status}`);
  if (priority !== existing.priority)
    logActivity(updated, "priority", `${existing.priority} → ${priority}`);
  if (type !== existing.type)
    logActivity(updated, "type", `${existing.type} → ${type}`);
  if (merged.assignee !== existing.assignee)
    logActivity(updated, "assigned", merged.assignee || "unassigned");
  if (merged.title !== existing.title || merged.body !== existing.body)
    logActivity(updated, "edited", "details updated");

  return updated;
}

export function deleteTicket(id: number): boolean {
  const existing = getTicket(id);
  const info = db.query("DELETE FROM tickets WHERE id = ?").run(id);
  if (info.changes > 0 && existing) logActivity(existing, "deleted", existing.title);
  return info.changes > 0;
}

export interface ParsedCommand {
  command: "ticket" | "td";
  title: string;
  body: string;
  priority: Priority;
}

/**
 * Parse a raw user prompt for a leading Clautik command:
 *   /ticket <x>   → file a ticket only (the hook blocks the turn)
 *   /td <x>       → file a ticket AND have Claude act on <x> this turn
 * Everything after the command is the title; an optional trailing
 * `!high`/`!low`/`!medium` sets priority, and ` -- body` adds a body:
 *   /ticket Fix the login redirect loop
 *   /ticket Fix flaky test !high
 *   /td Add dark mode -- users keep asking for it
 */
export function parseTicketCommand(prompt: string): ParsedCommand | null {
  const m = prompt.match(/^\s*\/(ticket|td)\b[ \t]*(.*)$/is);
  if (!m) return null;
  const command = m[1].toLowerCase() as "ticket" | "td";
  let rest = m[2].trim();
  if (!rest) return null;

  // Strip a `!high|!medium|!low` priority token. Accept it either at the very
  // end (e.g. `... -- body !high`) or just before the ` -- body` separator
  // (e.g. `title !high -- body`), since both read naturally.
  let priority: Priority = "medium";
  const stripPriority = (s: string): string => {
    const pr = s.match(/\s!(low|medium|high)\s*$/i);
    if (pr) {
      priority = pr[1].toLowerCase() as Priority;
      return s.slice(0, pr.index).trim();
    }
    return s;
  };

  rest = stripPriority(rest);

  let body = "";
  const bodySplit = rest.split(/\s--\s/);
  if (bodySplit.length > 1) {
    rest = stripPriority(bodySplit[0].trim());
    body = bodySplit.slice(1).join(" -- ").trim();
  }

  if (!rest) return null;
  return { command, title: rest, body, priority };
}

/** Markdown summary of unfinished tickets, injected at SessionStart. */
export function openTicketsContext(): string {
  const open = db
    .query(
      "SELECT * FROM tickets WHERE status != 'done' ORDER BY status DESC, priority DESC, id ASC"
    )
    .all() as Ticket[];
  if (open.length === 0) return "";

  const mark = { urgent: "🔴", high: "🟠", medium: "🟡", low: "⚪" } as const;
  const label = {
    open: "Open",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done",
  } as const;
  const lines = open.map(
    (t) =>
      `- ${mark[t.priority]} **${t.key}** [${label[t.status]}] ${t.title}` +
      (t.body ? ` — ${t.body.split("\n")[0]}` : "")
  );
  return `## 🎟️ Open Clautik tickets (${open.length})\n${lines.join("\n")}`;
}
