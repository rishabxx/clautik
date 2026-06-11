---
name: dashboard
description: Launch the Clautik Kanban dashboard. Use when the user wants to "open the dashboard", "see my tickets", "start the clautik board", or otherwise view their tickets in the browser.
---

# Launch the Clautik dashboard

Start the Clautik dashboard server, then point the user at it.

## Steps

1. Run the server in the background (it serves the board + REST API on port 4319,
   and builds the dashboard automatically on first run if needed):

   ```bash
   bun run "${CLAUDE_PLUGIN_ROOT}/server/index.ts"
   ```

   Run it with `run_in_background: true` so it keeps serving while the session
   continues. To use a different port, prefix with `PORT=5000`.

2. Tell the user the dashboard is live at **http://localhost:4319** (or the port
   they chose) and that tickets from every project/session show up there.

## Notes
- The store is global (`~/.clautik/clautik.db`, override with `CLAUTIK_DB`), so a
  single dashboard shows tickets from all projects.
- If the server is already running on that port, just remind the user of the URL
  instead of starting a second instance.
