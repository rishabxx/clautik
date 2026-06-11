---
name: ticket
description: Create a Clautik ticket from the current conversation. Use when the user asks to "make a ticket", "create a ticket", "track this as a ticket", "file a ticket", or otherwise wants outstanding work captured into Clautik. For a quick one-line ticket the user can instead type `/ticket <text>` directly (handled by a hook); use this skill when the ticket should summarize discussion/context.
---

# Create a Clautik ticket

When invoked, capture the work the user wants tracked into Clautik (the local
ticket system backed by SQLite + a Kanban dashboard).

## Steps

1. Figure out the ticket from the conversation:
   - **title**: one concise line (imperative, e.g. "Fix login redirect loop").
   - **body** (optional): a few sentences of context, repro steps, or acceptance
     criteria gathered from the discussion. Keep it tight.
   - **priority**: `low` | `medium` | `high` — infer from urgency, default `medium`.

2. Create it by running the Clautik CLI (`${CLAUDE_PLUGIN_ROOT}` resolves to the
   installed plugin directory):

   ```bash
   bun run "${CLAUDE_PLUGIN_ROOT}/server/cli.ts" create "<title>" \
     --body "<body>" --priority <priority> --source slash
   ```

3. Confirm to the user with the returned ticket key (e.g. `CLT-12`) and remind
   them they can view it on the dashboard (run the `/clautik:dashboard` skill,
   then open http://localhost:4319).

## Notes
- Don't ask many clarifying questions — infer a sensible title/body and create
  the ticket. The user can edit it later in the dashboard.
- If the user clearly wanted only a one-line ticket, prefer suggesting they use
  `/ticket <text>` next time (instant, no model turn).
