// Turn real tickets + activity into the data shapes the Console dashboard needs.
// Everything here is derived from the live store (no mock data).
import type { Activity, Ticket } from "../api";
import { DB_TO_SKEY, PKEY_ORDER, SKEY_ORDER, srcToRef, T, type PKey, type SKey } from "./theme";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const ms = (iso: string) => new Date(iso).getTime();

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[i];
}
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Count items into N daily buckets ending today (idx 0 = oldest, N-1 = today). */
function dailyBuckets(times: number[], days: number): number[] {
  const out = Array(days).fill(0);
  const now = Date.now();
  for (const t of times) {
    const idx = days - 1 - Math.floor((now - t) / DAY);
    if (idx >= 0 && idx < days) out[idx]++;
  }
  return out;
}

export function derive(tickets: Ticket[], activity: Activity[]) {
  const now = Date.now();
  const done = tickets.filter((t) => t.status === "done");
  const closed = done.filter((t) => t.closed_at);
  const active = tickets.filter((t) => t.status !== "done");

  // status / priority distributions (in canonical order)
  const statusCounts: [SKey, number][] = SKEY_ORDER.map((sk) => [
    sk,
    tickets.filter((t) => DB_TO_SKEY[t.status] === sk).length,
  ]);
  const prioCounts: [PKey, number][] = PKEY_ORDER.map((pk) => [
    pk,
    active.filter((t) => t.priority === pk).length,
  ]);

  // 30-day created vs resolved
  const created = dailyBuckets(tickets.map((t) => ms(t.created_at)), 30);
  const resolved = dailyBuckets(closed.map((t) => ms(t.closed_at!)), 30);
  const totalCreated = tickets.length;
  const totalResolved = closed.length;

  // cycle time p50/p90 over 12 weeks (hours)
  const p50: number[] = [], p90: number[] = [];
  let lastP50 = 0, lastP90 = 0;
  for (let wk = 11; wk >= 0; wk--) {
    const lo = now - (wk + 1) * 7 * DAY, hi = now - wk * 7 * DAY;
    const durs = closed
      .filter((t) => ms(t.closed_at!) >= lo && ms(t.closed_at!) < hi)
      .map((t) => (ms(t.closed_at!) - ms(t.created_at)) / HOUR)
      .sort((a, b) => a - b);
    lastP50 = durs.length ? round1(pct(durs, 0.5)) : lastP50;
    lastP90 = durs.length ? round1(pct(durs, 0.9)) : lastP90;
    p50.push(lastP50);
    p90.push(lastP90);
  }
  const allDurs = closed.map((t) => (ms(t.closed_at!) - ms(t.created_at)) / HOUR).sort((a, b) => a - b);
  const avgCycle = allDurs.length ? round1(allDurs.reduce((a, b) => a + b, 0) / allDurs.length) : 0;

  // aging of open work
  const ageH = (t: Ticket) => (now - ms(t.created_at)) / HOUR;
  const agingBuckets: [string, number, boolean][] = [
    ["< 1d", active.filter((t) => ageH(t) < 24).length, false],
    ["1–3d", active.filter((t) => ageH(t) >= 24 && ageH(t) < 72).length, false],
    ["3–7d", active.filter((t) => ageH(t) >= 72 && ageH(t) < 168).length, false],
    ["> 7d", active.filter((t) => ageH(t) >= 168).length, true],
  ];

  // SLA: urgent>24h, high>48h, medium>120h open = breaching
  const slaLimit: Record<string, number> = { urgent: 24, high: 48, medium: 120, low: Infinity };
  const breaching = active.filter((t) => ageH(t) > (slaLimit[t.priority] ?? Infinity));
  const slaMet = tickets.length ? round1(100 * (1 - breaching.length / tickets.length)) : 100;

  // tags
  const tagMap = new Map<string, number>();
  for (const t of tickets)
    for (const tag of t.tags.split(",").map((s) => s.trim()).filter(Boolean))
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
  const tagCounts: [string, number][] = [...tagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // workload by assignee (active work)
  const wlMap = new Map<string, number>();
  for (const t of active) if (t.assignee) wlMap.set(t.assignee, (wlMap.get(t.assignee) ?? 0) + 1);
  const workload: [string, number][] = [...wlMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Claude / AI activity
  const aiTickets = tickets.filter((t) => srcToRef(t.source) === "claude");
  const createdPct = tickets.length ? Math.round((100 * aiTickets.length) / tickets.length) : 0;
  const touched = tickets.filter((t) => t.status !== "open" || t.assignee).length;
  const triagedPct = tickets.length ? Math.round((100 * touched) / tickets.length) : 0;
  const ticketsPerDay = dailyBuckets(aiTickets.map((t) => ms(t.created_at)), 14);
  const actionsPerDay = dailyBuckets(activity.map((a) => ms(a.at)), 14);

  // KPI sparklines (real slices) + deltas
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const throughput7 = sum(resolved.slice(-7));
  const prev7 = sum(resolved.slice(-14, -7));
  const thrDelta = prev7 ? Math.round((100 * (throughput7 - prev7)) / prev7) : 0;

  const FEED_GLYPH: Record<string, { ic: string; c: string }> = {
    created: { ic: "✳", c: T.coral },
    status: { ic: "→", c: T.prog },
    priority: { ic: "▲", c: T.high },
    type: { ic: "❖", c: T.coral },
    assigned: { ic: "✦", c: T.coral },
    edited: { ic: "✎", c: T.dim },
    deleted: { ic: "✗", c: T.urgent },
  };
  const feed = activity.slice(0, 7).map((a) => {
    const g = FEED_GLYPH[a.action] ?? { ic: "•", c: T.dim };
    const tm = new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    return { tm, ic: g.ic, c: g.c, act: a.action, tk: a.ticket_key, x: a.detail };
  });

  const resolvedToday = closed.filter((t) => now - ms(t.closed_at!) < DAY).length;

  return {
    total: tickets.length,
    activeCount: active.length,
    resolvedToday,
    statusCounts,
    prioCounts,
    throughput: { created, resolved },
    totalCreated,
    totalResolved,
    resolveRate: totalCreated ? Math.round((100 * totalResolved) / totalCreated) : 0,
    netBacklog: totalCreated - totalResolved,
    cycle: { p50, p90 },
    avgCycle,
    oldestOpenDays: active.length ? Math.floor(Math.max(...active.map(ageH)) / 24) : 0,
    agingBuckets,
    breaching: breaching.length,
    slaMet,
    tagCounts,
    workload,
    ai: { createdPct, triagedPct, ticketsPerDay, actionsPerDay, actionsToday: sum(actionsPerDay.slice(-1)) },
    feed,
    kpi: {
      open: statusCounts[0][1],
      prog: statusCounts[1][1],
      avgCycle,
      throughput7,
      thrDelta,
      breaching: breaching.length,
      createdPct,
      sparks: {
        open: created.slice(-7),
        prog: resolved.slice(-7),
        cycle: p50.slice(-7),
        thr: resolved.slice(-7),
        sla: ticketsPerDay.slice(-7),
        ai: ticketsPerDay.slice(-7),
      },
    },
  };
}

export type Derived = ReturnType<typeof derive>;
