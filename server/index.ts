#!/usr/bin/env bun
/**
 * Clautik dashboard server. Serves the built React app (web/dist) and a small
 * REST API over the same SQLite store the CLI/hooks write to.
 *
 *   bun run server/index.ts            # serves on http://localhost:4319
 *   PORT=5000 bun run server/index.ts
 */
import { join } from "path";
import { existsSync } from "fs";
import {
  createTicket,
  listTickets,
  updateTicket,
  deleteTicket,
  getTicket,
  listActivity,
} from "./tickets";
import { DB_PATH } from "./db";

const PORT = Number(process.env.PORT || 4319);
const WEB_DIR = join(import.meta.dir, "..", "web");
const WEB_DIST = join(WEB_DIR, "dist");

// Build the dashboard on first run (or after a plugin update clears web/dist) so
// users never have to remember a separate setup step.
if (!existsSync(WEB_DIST)) {
  console.log("📦 Building the Clautik dashboard (one-time)…");
  Bun.spawnSync(["bun", "install"], { cwd: WEB_DIR, stdout: "inherit", stderr: "inherit" });
  const build = Bun.spawnSync(["bun", "run", "build"], {
    cwd: WEB_DIR,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (build.exitCode !== 0) {
    console.error("⚠️  Dashboard build failed — serving the API only.");
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    // ---- API ----------------------------------------------------------
    if (pathname === "/api/health") {
      return json({ ok: true, db: DB_PATH });
    }

    if (pathname === "/api/tickets" && req.method === "GET") {
      return json(listTickets(url.searchParams.get("status") ?? undefined));
    }

    if (pathname === "/api/activity" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") ?? 30);
      return json(listActivity(Number.isFinite(limit) ? limit : 30));
    }

    if (pathname === "/api/tickets" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      if (!b.title || !String(b.title).trim()) {
        return json({ error: "title is required" }, 400);
      }
      return json(
        createTicket({
          title: b.title,
          body: b.body,
          priority: b.priority,
          status: b.status,
          type: b.type,
          tags: b.tags,
          assignee: b.assignee,
          source: "dashboard",
          project: b.project ?? "",
        }),
        201
      );
    }

    const idMatch = pathname.match(/^\/api\/tickets\/(\d+)$/);
    if (idMatch) {
      const id = Number(idMatch[1]);
      if (req.method === "PATCH") {
        const b = await req.json().catch(() => ({}));
        const t = updateTicket(id, b);
        return t ? json(t) : json({ error: "not found" }, 404);
      }
      if (req.method === "DELETE") {
        return deleteTicket(id) ? json({ ok: true }) : json({ error: "not found" }, 404);
      }
      if (req.method === "GET") {
        const t = getTicket(id);
        return t ? json(t) : json({ error: "not found" }, 404);
      }
    }

    // ---- Static dashboard --------------------------------------------
    if (existsSync(WEB_DIST)) {
      const rel = pathname === "/" ? "/index.html" : pathname;
      const file = Bun.file(join(WEB_DIST, rel));
      if (await file.exists()) return new Response(file);
      // SPA fallback
      return new Response(Bun.file(join(WEB_DIST, "index.html")));
    }

    return new Response(
      "Clautik API is running, but the dashboard build is unavailable.\n" +
        "Try rebuilding:  cd web && bun install && bun run build\n",
      { status: 200, headers: { "content-type": "text/plain" } }
    );
  },
});

console.log(`🎟️  Clautik running at http://localhost:${server.port}`);
console.log(`    DB: ${DB_PATH}`);
