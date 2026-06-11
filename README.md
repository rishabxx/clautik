# 🎟️ Clautik

Write tickets to Claude, track them on a fast, Claude-themed console dashboard — Kanban board, analytics, and a live activity feed.

Clautik is a lightweight ticket tracker for **Claude Code**, in the spirit of
[`claude-mem`](https://github.com/thedotmack/claude-mem). It installs as a Claude
Code **plugin** — hooks capture tickets straight from your session, SQLite stores
them, and a dense, terminal-style console dashboard (Kanban board · analytics ·
live activity) shows them off in the Claude palette.

```
/ticket fix the login redirect loop    →   instantly tracked, no model turn
/td build a helpdesk landing page       →   tracked AND Claude works on it now
"make a ticket for the flaky test"      →   /clautik:ticket composes a richer one
/clautik:dashboard                       →   open the board (create / edit / drag)
```

## Requirements

- [Bun](https://bun.sh) ≥ 1.1 — backend, CLI, and hooks (built-in SQLite, no native build)
- [Claude Code](https://claude.com/claude-code) with plugin support
- A browser for the dashboard

## Install

Clautik is its own plugin marketplace. Add it and install in two commands inside
Claude Code:

```
/plugin marketplace add rishabxx/clautik
/plugin install clautik@clautik
```

That's it — the hooks and skills are wired up automatically. No editing of
`settings.json`, no absolute paths to manage.

> **Upgrading from the manual (pre-plugin) setup?** Remove the old Clautik
> `SessionStart` / `UserPromptSubmit` entries from your `~/.claude/settings.json`
> first, so hooks don't fire twice.

Tickets live in `~/.clautik/clautik.db` (override with the `CLAUTIK_DB` env var).
The store is global on purpose: one dashboard shows tickets from every project.

## Open the dashboard

Run the **`/clautik:dashboard`** skill in any Claude Code session, or launch it
directly with Bun:

```bash
bun run "$CLAUDE_PLUGIN_ROOT/server/index.ts"   # → http://localhost:4319
```

The dashboard builds itself on first launch, so there's no separate setup step.

## Creating tickets

| How | Where | Result |
|-----|-------|--------|
| `/ticket Fix flaky test !high` | typed in Claude Code | hook creates it, **blocks the turn** (no model tokens) |
| `/ticket Add dark mode -- users keep asking` | typed in Claude Code | title + body |
| `/td Build a helpdesk landing page` | typed in Claude Code | files a ticket **and** Claude works on it this turn |
| "make a ticket summarizing this bug" | natural language | `/clautik:ticket` composes & creates it |
| **+ New ticket** | dashboard | manual form |

`/ticket` = capture for later (no model turn). `/td` = capture **and do it now**
(`td` = "ticket + do"; named to avoid colliding with the `claude-mem:do` skill —
rename it in the regex in `server/tickets.ts` if you prefer another trigger).

`/ticket` syntax: text after `/ticket` is the title; a trailing
`!urgent`/`!high`/`!medium`/`!low` sets priority; ` -- ` separates an optional body.

## CLI

The CLI is the same entry point the hooks and skills use. From the plugin
directory (or a clone of this repo):

```bash
bun run server/cli.ts create "Title" --body "..." --priority high
bun run server/cli.ts list [--status open] [--json]
bun run server/cli.ts move <id> in_progress
bun run server/cli.ts done <id>
bun run server/cli.ts delete <id>
bun run server/cli.ts context           # markdown of open tickets
```

## Develop locally

```bash
git clone https://github.com/rishabxx/clautik
cd clautik
bun run setup     # build the dashboard (cd web && bun install && bun run build)
bun run serve     # http://localhost:4319
```

To test the plugin end-to-end without publishing, add the local checkout as a
marketplace: `/plugin marketplace add ./path/to/clautik`, then
`/plugin install clautik@clautik`. Validate the manifest with `/plugin validate .`.

## Layout

```
.claude-plugin/  plugin.json · marketplace.json   (plugin + self-hosting marketplace)
server/          db.ts · tickets.ts · cli.ts · index.ts   (Bun + SQLite + REST)
hooks/           hooks.json                          (SessionStart + UserPromptSubmit)
skills/          ticket/ · dashboard/                (conversational skills)
web/             Vite + React console UI — dashboard · board · analytics (hand-built SVG charts, no chart lib)
```

## License

MIT © Rishabh Mekala — see [LICENSE](LICENSE).
