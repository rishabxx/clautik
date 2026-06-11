#!/usr/bin/env bun
/**
 * Clautik CLI — the single entry point used by the slash-command skill and the
 * Claude Code hooks. Run with: `bun run server/cli.ts <command> [args]`
 *
 * Commands:
 *   create "<title>" [--body B] [--priority low|medium|high] [--status S]
 *                    [--source slash|hook|dashboard] [--project P] [--session ID]
 *   list [--status open|in_progress|done] [--json]
 *   move <id> <status>
 *   done <id>
 *   delete <id>
 *   context                 print markdown of open tickets (plain text)
 *   hook-context            SessionStart hook: emit additionalContext JSON
 *   hook-capture            UserPromptSubmit hook: capture `/ticket ...` from stdin
 */
import { basename } from "path";
import {
  createTicket,
  listTickets,
  updateTicket,
  deleteTicket,
  parseTicketCommand,
  openTicketsContext,
} from "./tickets";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

async function readStdin(): Promise<any> {
  try {
    const text = await Bun.stdin.text();
    return text.trim() ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case "create": {
    const title = args[0];
    if (!title) {
      console.error('Usage: create "<title>" [--body ...] [--priority ...]');
      process.exit(1);
    }
    const t = createTicket({
      title,
      body: flag(args, "body"),
      priority: flag(args, "priority"),
      status: flag(args, "status"),
      type: flag(args, "type"),
      tags: flag(args, "tags"),
      assignee: flag(args, "assignee"),
      source: flag(args, "source") ?? "slash",
      project: flag(args, "project") ?? basename(process.cwd()),
      session_id: flag(args, "session") ?? "",
    });
    console.log(`Created ${t.key}: ${t.title}  [${t.status}/${t.priority}]`);
    break;
  }

  case "list": {
    const tickets = listTickets(flag(args, "status"));
    if (args.includes("--json")) {
      console.log(JSON.stringify(tickets, null, 2));
    } else if (tickets.length === 0) {
      console.log("No tickets.");
    } else {
      for (const t of tickets) {
        console.log(`${t.key}\t[${t.status}/${t.priority}]\t${t.title}`);
      }
    }
    break;
  }

  case "move": {
    const id = Number(args[0]);
    const status = args[1];
    const t = updateTicket(id, { status });
    console.log(t ? `${t.key} → ${t.status}` : `No ticket #${id}`);
    break;
  }

  case "done": {
    const id = Number(args[0]);
    const t = updateTicket(id, { status: "done" });
    console.log(t ? `${t.key} → done ✅` : `No ticket #${id}`);
    break;
  }

  case "delete": {
    const id = Number(args[0]);
    console.log(deleteTicket(id) ? `Deleted #${id}` : `No ticket #${id}`);
    break;
  }

  case "context": {
    console.log(openTicketsContext() || "No open tickets.");
    break;
  }

  // --- Claude Code hook entry points -------------------------------------

  case "hook-context": {
    // SessionStart: inject open tickets so Claude is aware of them.
    await readStdin();
    const ctx = openTicketsContext();
    process.stdout.write(
      JSON.stringify({
        continue: true,
        suppressOutput: true,
        hookSpecificOutput: ctx
          ? { hookEventName: "SessionStart", additionalContext: ctx }
          : { hookEventName: "SessionStart" },
      })
    );
    break;
  }

  case "hook-capture": {
    // UserPromptSubmit. Two commands:
    //   /ticket <x>  → file the ticket and BLOCK the turn (zero model tokens).
    //   /td <x>      → file the ticket and LET THE PROMPT THROUGH with an
    //                  instruction so Claude works on <x> this turn.
    const input = await readStdin();
    const prompt: string = input.prompt ?? "";
    const parsed = parseTicketCommand(prompt);
    if (!parsed) {
      process.exit(0); // not a Clautik command — let the prompt through untouched
    }
    const t = createTicket({
      title: parsed.title,
      body: parsed.body,
      priority: parsed.priority,
      source: parsed.command === "td" ? "td" : "hook",
      project: input.cwd ? basename(input.cwd) : "",
      session_id: input.session_id ?? "",
    });

    if (parsed.command === "ticket") {
      process.stdout.write(
        JSON.stringify({
          decision: "block",
          reason:
            `🎟️ Created ${t.key} — "${t.title}" [${t.priority}]\n` +
            `Tracked in Clautik. Open the board with the /clautik:dashboard skill.`,
        })
      );
    } else {
      // /td — file it, then hand the request to Claude to act on now.
      const request = parsed.body ? `${parsed.title}\n\n${parsed.body}` : parsed.title;
      process.stdout.write(
        JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext:
              `🎟️ Clautik filed ${t.key} to track this request. ` +
              `The leading "/td" is just the Clautik command prefix — ignore it. ` +
              `Now carry out the user's request:\n\n${request}`,
          },
        })
      );
    }
    break;
  }

  default:
    console.log(
      "clautik commands: create, list, move, done, delete, context, hook-context, hook-capture"
    );
}
