# Clautik — Tasks

## Done
- [x] Research reference tools (claude-mem, ECC) + Claude Code hook model
- [x] Data layer: SQLite via `bun:sqlite` (`server/db.ts`)
- [x] Ticket model + CRUD + `/ticket` parser + context builder (`server/tickets.ts`)
- [x] CLI: create/list/move/done/delete/context + hook entry points (`server/cli.ts`)
- [x] HTTP server: REST API + static dashboard host (`server/index.ts`)
- [x] Hooks: SessionStart (inject open tickets) + UserPromptSubmit (`/ticket` capture)
- [x] `/ticket` slash-command skill (`skills/ticket/SKILL.md`)
- [x] Dashboard: Claude-themed Kanban (React + Vite + Tailwind v4 + dnd-kit)

## Active
- [x] Install web deps + build, verify server serves dashboard (screenshot ✓)
- [x] Wire hooks into `~/.claude/settings.json` (backup at settings.json.bak-clautik)
- [x] Install `/ticket` skill into `~/.claude/skills/ticket/`
- [x] Harden `/ticket` priority parsing (accepts `!prio` before `--` or at end)
- [x] Add `/td` command: files a ticket AND lets Claude act on it (no block)

## Done — Analytics Dashboard (CLT-2, Jira-inspired "Option A")
- [x] Researched Jira model/dashboards; chose lightweight subset
- [x] DB migration: `type` (task/bug/epic), `closed_at`, append-only `activity` table
- [x] Activity logging on create/status/priority/type/edit/delete + `/api/activity`
- [x] Dashboard view: stat cards, status donut, priority bars, flow (cycle/throughput),
      type×status matrix, created-vs-resolved (8wk), aging, recent-activity feed
- [x] Board/Dashboard tab switcher; type field in dialog + type badge on cards
- [x] All charts hand-built SVG/CSS (no chart-lib dependency); verified both views

## Done — "Console" redesign (CLT-2, match Downloads/Clautik Dashboard standalone.html → Direction A)
- [x] Reverse-engineered the reference HTML (bundler manifest → JSX) for exact tokens/layout
- [x] Model: added `in_review` status, `urgent` priority, `tags`, `assignee` (additive migration)
- [x] Ported Console theme + chart primitives (Spark/Area/Band/BarsV/BarsH/Donut/Gauge) — no chart lib
- [x] Dashboard / Board / Analytics views — terminal grid, mono, all wired to REAL derived data
- [x] FIXED: board drag now persists (closestCorners + droppable columns + reload-after-update);
      verified end-to-end with a Playwright drag (open → in_progress, confirmed via API)
- [x] Console create/edit dialog (title/body/type/priority/status/tags/assignee)

## Planned / ideas
- [ ] Quick filters above board (type / priority / recently-updated) + list view
- [ ] Inline edit on cards; keyboard shortcuts (c=create, /=search, j/k nav)
- [ ] Markdown rendering in description + comments/worklog thread
- [ ] Intra-column drag reordering (persist `position`)
- [ ] Cumulative Flow Diagram from the activity log (stretch)
- [ ] Stop/SessionEnd hook to auto-close tickets mentioned as done
- [ ] Package as a real Claude Code plugin (.claude-plugin/plugin.json + marketplace)

## Blocked
- (none)
