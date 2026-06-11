# Changelog

All notable changes to Clautik are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow
[SemVer](https://semver.org/).

## [0.1.0] — 2026-06-11

Initial public release as a Claude Code plugin.

### Added
- `/ticket <text>` — capture a ticket instantly from a Claude Code session
  (handled by a `UserPromptSubmit` hook, no model turn).
- `/td <text>` — file a ticket **and** have Claude act on it the same turn.
- `/clautik:ticket` skill — compose a richer ticket from conversation context.
- `/clautik:dashboard` skill — launch the Kanban dashboard server.
- `SessionStart` hook that injects open tickets so Claude is aware of them.
- Claude-themed React + Tailwind Kanban dashboard with drag-and-drop, create/edit
  dialog, and a Jira-inspired analytics view (activity log, cycle time, types).
- Bun + SQLite backend with a CLI and small REST API over one global store
  (`~/.clautik/clautik.db`, override with `CLAUTIK_DB`).
- Dashboard auto-builds on first `serve` if `web/dist` is missing.
- Distributed as a Claude Code plugin + self-hosting marketplace.
