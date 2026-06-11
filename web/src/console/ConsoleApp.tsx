import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, closestCorners,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { api, type Activity, type Ticket } from "../api";
import {
  DB_TO_SKEY, PEOPLE, PKEY_ORDER, PRIO, SKEY_ORDER, SKEY_TO_DB, SOURCE,
  STATUS, T, personFor, srcToRef, type PKey, type SKey,
} from "./theme";
import { AreaChart, BandChart, BarsH, BarsV, Donut, Dot, Gauge, Measured, Spark } from "./charts";
import { derive, type Derived } from "./derive";
import Dialog, { type Draft } from "./Dialog";

type View = "dash" | "board" | "analytics";

const aS: Record<string, any> = {
  frame: { width: "100%", height: "100vh", background: T.bg, color: T.text, fontFamily: "var(--mono)", display: "flex", flexDirection: "column", overflow: "hidden", fontSize: 12 },
  top: { height: 52, flex: "0 0 52px", display: "flex", alignItems: "center", padding: "0 16px", borderBottom: `1px solid ${T.border}`, background: T.bg2 },
  logo: { width: 26, height: 26, borderRadius: 6, background: T.coral, display: "flex", alignItems: "center", justifyContent: "center", color: "#1a120e", fontSize: 15, fontWeight: 700 },
  sub: { height: 34, flex: "0 0 34px", display: "flex", alignItems: "center", gap: 14, padding: "0 16px", borderBottom: `1px solid ${T.border}`, background: T.bg, fontSize: 10.5, color: T.faint, letterSpacing: 0.5 },
  wrap: { flex: 1, minHeight: 0, background: T.border, display: "flex", flexDirection: "column", gap: 1 },
  hLabel: { fontSize: 10, letterSpacing: 1, color: T.faint, textTransform: "uppercase", fontWeight: 500 },
};
const chip = (on: boolean): any => ({ padding: "3px 8px", borderRadius: 4, fontSize: 10, letterSpacing: 0.5, color: on ? T.text : T.faint, background: on ? T.raised : "transparent", border: `1px solid ${on ? T.borderHi : "transparent"}`, cursor: "pointer" });

function Avatar({ pkey, s = 22 }: { pkey: string; s?: number }) {
  const p = personFor(pkey);
  return (
    <div style={{ width: s, height: s, borderRadius: 5, flexShrink: 0, background: p.bot ? T.coralSoft : "rgba(255,255,255,0.05)", border: `1px solid ${p.bot ? T.coralLine : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s * 0.4, fontWeight: 600, color: p.bot ? T.coral : p.color }}>
      {p.bot ? "✳" : p.init}
    </div>
  );
}

function Tab({ label, active, onClick }: any) {
  return (
    <div onClick={onClick} style={{ position: "relative", padding: "0 14px", height: 52, display: "flex", alignItems: "center", fontSize: 12, letterSpacing: 0.5, color: active ? T.text : T.dim, cursor: "pointer" }}>
      <span style={{ color: active ? T.coral : T.faint, marginRight: 6 }}>{active ? "▸" : "·"}</span>{label}
      {active && <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: T.coral }} />}
    </div>
  );
}

function TopBar({ view, setView, onNew }: any) {
  return (
    <div style={aS.top}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 18, borderRight: `1px solid ${T.border}`, height: "100%" }}>
        <div style={aS.logo}>◧</div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.3 }}>clautik</div>
          <div style={{ fontSize: 9.5, color: T.faint }}>helpdesk-saas</div>
        </div>
      </div>
      <div style={{ display: "flex", height: "100%", marginLeft: 4 }}>
        <Tab label="dashboard" active={view === "dash"} onClick={() => setView("dash")} />
        <Tab label="board" active={view === "board"} onClick={() => setView("board")} />
        <Tab label="analytics" active={view === "analytics"} onClick={() => setView("analytics")} />
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 14, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6, color: T.faint, fontSize: 11, minWidth: 180 }}>
        <span style={{ color: T.ghost }}>⌘K</span><span>search tickets…</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 14, fontSize: 10.5, color: T.dim }}>
        <Dot c={T.done} s={6} /> live
      </div>
      <div onClick={onNew} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 6, background: T.coral, color: "#1a120e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> new ticket
      </div>
    </div>
  );
}

function SubBar({ crumb, children }: any) {
  return (
    <div style={aS.sub}>
      <span style={{ color: T.dim, letterSpacing: 1 }}>{crumb}</span>
      <span style={{ color: T.ghost }}>/</span>
      {children}
      <div style={{ flex: 1 }} />
      <span>last sync <span style={{ color: T.dim }}>just now</span></span>
      <span style={{ color: T.ghost }}>·</span>
      <span>auto-refresh <span style={{ color: T.done }}>on</span></span>
    </div>
  );
}

function Panel({ title, right, children, style, pad = 13, glyph }: any) {
  return (
    <div style={{ background: T.bg2, display: "flex", flexDirection: "column", minHeight: 0, ...style }}>
      <div style={{ display: "flex", alignItems: "center", height: 30, flex: "0 0 30px", padding: `0 ${pad}px`, borderBottom: `1px solid ${T.border}`, gap: 8 }}>
        {glyph && <span style={{ color: T.coral, fontSize: 11 }}>{glyph}</span>}
        <span style={aS.hLabel}>{title}</span>
        <div style={{ flex: 1 }} />
        {right && <span style={{ fontSize: 10.5, color: T.dim, fontVariantNumeric: "tabular-nums" }}>{right}</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: pad, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function Kpi({ label, value, unit, delta, dir, data, color = T.coral }: any) {
  const good = dir === "up" ? T.up : dir === "down" ? T.down : T.dim;
  return (
    <div style={{ background: T.bg2, padding: "11px 13px 8px", display: "flex", flexDirection: "column", minHeight: 0, justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={aS.hLabel}>{label}</span>
        {delta != null && delta !== "" && <span style={{ fontSize: 10, color: good, fontVariantNumeric: "tabular-nums" }}>{delta}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
        <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {value}<span style={{ fontSize: 12, color: T.faint, fontWeight: 400, marginLeft: 2 }}>{unit}</span>
        </div>
        <Spark data={data} w={88} h={30} color={color} />
      </div>
    </div>
  );
}

function Legend({ items }: any) {
  return (
    <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: T.dim }}>
      {items.map((it: any, i: number) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 11, height: 2.5, borderRadius: 2, display: "inline-block", background: it.dash ? `repeating-linear-gradient(90deg,${it.c} 0 3px,transparent 3px 5px)` : it.c }} />{it.t}
        </span>
      ))}
    </div>
  );
}

function FooterStat({ items }: any) {
  return (
    <div style={{ display: "flex", marginTop: "auto", borderTop: `1px solid ${T.border}`, paddingTop: 9 }}>
      {items.map((it: any, i: number) => (
        <div key={i} style={{ flex: 1, borderLeft: i ? `1px solid ${T.border}` : "none", paddingLeft: i ? 12 : 0 }}>
          <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.6, textTransform: "uppercase" }}>{it.l}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: it.c || T.text, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{it.v}</div>
        </div>
      ))}
    </div>
  );
}

function StatusList({ D }: { D: Derived }) {
  const total = D.statusCounts.reduce((a, s) => a + s[1], 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 2 }}>
      {D.statusCounts.map(([k, v]) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Dot c={STATUS[k].color} />
          <span style={{ fontSize: 11.5, color: T.dim, width: 78 }}>{STATUS[k].label}</span>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(v / total) * 100}%`, height: "100%", background: STATUS[k].color, opacity: 0.85 }} />
          </div>
          <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", width: 18, textAlign: "right" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────
function DashView({ D }: { D: Derived }) {
  const k = D.kpi;
  return (
    <div style={aS.wrap}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, background: T.border, flex: "0 0 96px" }}>
        <Kpi label="Open" value={k.open} data={k.sparks.open} color={T.open} />
        <Kpi label="In progress" value={k.prog} data={k.sparks.prog} color={T.prog} />
        <Kpi label="Avg cycle" value={k.avgCycle} unit="h" data={k.sparks.cycle} color={T.coral} />
        <Kpi label="Throughput 7d" value={k.throughput7} delta={k.thrDelta ? `${k.thrDelta > 0 ? "+" : ""}${k.thrDelta}%` : ""} dir={k.thrDelta >= 0 ? "up" : "down"} data={k.sparks.thr} color={T.done} />
        <Kpi label="SLA breaches" value={k.breaching} dir="down" data={k.sparks.sla} color={T.urgent} />
        <Kpi label="AI-created" value={k.createdPct} unit="%" data={k.sparks.ai} color={T.coral} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1.72fr 1.28fr 1fr", gridTemplateRows: "1.16fr 1fr 0.9fr", gap: 1, background: T.border }}>
        <Panel title="Ticket throughput" right="30d" glyph="▤">
          <Legend items={[{ t: "created", c: T.coral }, { t: "resolved", c: T.done }]} />
          <div style={{ margin: "8px 0 0", flex: 1 }}>
            <Measured h={186}>{(w) => (
              <AreaChart w={w} h={186} series={[{ data: D.throughput.created, color: T.coral, w: 1.9 }, { data: D.throughput.resolved, color: T.done, w: 1.6 }]} xLabels={[{ i: 0, t: "30d ago" }, { i: 14, t: "15d" }, { i: 29, t: "today" }]} />
            )}</Measured>
          </div>
          <FooterStat items={[{ l: "created", v: D.totalCreated }, { l: "resolved", v: D.totalResolved, c: T.done }, { l: "net backlog", v: `${D.netBacklog >= 0 ? "+" : ""}${D.netBacklog}`, c: T.coral }, { l: "resolve rate", v: `${D.resolveRate}%` }]} />
        </Panel>

        <Panel title="Backlog by status" right={`${D.activeCount} active`} glyph="◷">
          <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}>
            <Donut size={118} thickness={15} center={String(D.activeCount)} sub="ACTIVE" segments={D.statusCounts.map(([key, v]) => ({ v, color: STATUS[key].color }))} />
            <div style={{ flex: 1 }}><StatusList D={D} /></div>
          </div>
        </Panel>

        <Panel title="SLA · aging" right={`${D.breaching} at risk`} glyph="⚑">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div><span style={{ fontSize: 28, fontWeight: 600, color: T.urgent }}>{D.breaching}</span><span style={{ fontSize: 11, color: T.faint, marginLeft: 6 }}>breaching</span></div>
            <div style={{ textAlign: "right", fontSize: 10.5, color: T.dim }}>SLA met<br /><span style={{ fontSize: 16, color: T.done, fontWeight: 600 }}>{D.slaMet}%</span></div>
          </div>
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.6, marginBottom: 5 }}>AGE DISTRIBUTION</div>
            <Measured h={92}>{(w) => (
              <BarsV data={D.agingBuckets.map((b) => b[1])} w={w} h={92} labels={D.agingBuckets.map((b) => b[0])} color={T.coralDim} highlightIdx={3} hiColor={T.urgent} />
            )}</Measured>
          </div>
        </Panel>

        <Panel title="Cycle time" right="P50 / P90 · 12w" glyph="◴">
          <Legend items={[{ t: "p50", c: T.coral }, { t: "p90", c: T.coral, dash: true }]} />
          <div style={{ marginTop: 6, flex: 1 }}>
            <Measured h={150}>{(w) => <BandChart low={D.cycle.p50} high={D.cycle.p90} w={w} h={150} color={T.coral} />}</Measured>
          </div>
          <FooterStat items={[{ l: "p50", v: `${D.cycle.p50.at(-1)}h` }, { l: "p90", v: `${D.cycle.p90.at(-1)}h` }, { l: "avg", v: `${D.avgCycle}h`, c: T.done }, { l: "oldest", v: `${D.oldestOpenDays}d`, c: T.urgent }]} />
        </Panel>

        <Panel title="Priority mix" right={`${D.activeCount} open`} glyph="▰">
          <BarsH rows={D.prioCounts.map(([key, v]) => [PRIO[key].label, v])} colorFn={(_r: any, i: number) => PRIO[D.prioCounts[i][0]].color} rowH={26} font={11.5} />
          <div style={{ marginTop: "auto", display: "flex", height: 9, borderRadius: 3, overflow: "hidden" }}>
            {D.prioCounts.map(([key, v]) => <div key={key} style={{ flex: v || 0.001, background: PRIO[key].color, opacity: 0.9 }} />)}
          </div>
        </Panel>

        <Panel title="Top tags" right={`${D.tagCounts.length} labels`} glyph="#">
          {D.tagCounts.length ? <BarsH rows={D.tagCounts} barColor={T.coralDim} rowH={21} font={11} labelW={84} /> : <Empty>no tags yet</Empty>}
        </Panel>

        <Panel title="Claude activity" right="14d" glyph="✳" style={{ borderTop: `1px solid ${T.coralLine}` }}>
          <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Gauge value={D.ai.createdPct} size={92} color={T.coral} label="CREATED" />
              <Gauge value={D.ai.triagedPct} size={92} color={T.coralHi} label="TRIAGED" />
            </div>
            <div style={{ flex: 1, borderLeft: `1px solid ${T.border}`, paddingLeft: 12, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.6, marginBottom: 4 }}>TICKETS VIA /TICKET — PER DAY</div>
              <Measured h={50}>{(w) => <BarsV data={D.ai.ticketsPerDay} w={w} h={50} color={T.coral} gap={0.28} />}</Measured>
              <div style={{ display: "flex", gap: 18, marginTop: "auto", fontSize: 10.5, color: T.dim }}>
                <span>actions today <b style={{ color: T.text }}>{D.ai.actionsToday}</b></span>
                <span>AI share <b style={{ color: T.coral }}>{D.ai.createdPct}%</b></span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Workload" right="WIP / agent" glyph="◇">
          {D.workload.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {D.workload.map(([key, v]) => {
                const max = Math.max(...D.workload.map((w) => w[1]), 1);
                const p = personFor(key);
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar pkey={key} s={20} />
                    <span style={{ fontSize: 11, color: T.dim, width: 62, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(v / max) * 100}%`, height: "100%", background: p.bot ? T.coral : p.color, opacity: 0.85 }} />
                    </div>
                    <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", width: 14, textAlign: "right" }}>{v}</span>
                  </div>
                );
              })}
            </div>
          ) : <Empty>no assignees yet</Empty>}
        </Panel>

        <Panel title="Live activity" right="●" glyph="≋">
          {D.feed.length ? (
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {D.feed.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "4px 0", borderBottom: i < D.feed.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <span style={{ fontSize: 10, color: T.ghost, width: 34, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{f.tm}</span>
                  <span style={{ color: f.c, fontSize: 11, width: 12, flexShrink: 0 }}>{f.ic}</span>
                  <span style={{ fontSize: 10.5, color: T.dim, lineHeight: 1.3 }}>
                    {f.act} <span style={{ color: T.coral }}>{f.tk}</span>
                    {f.x && <span style={{ color: T.faint }}> · {f.x}</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : <Empty>no activity yet</Empty>}
        </Panel>
      </div>
    </div>
  );
}

function Empty({ children }: any) {
  return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.ghost, fontSize: 10.5 }}>{children}</div>;
}

// ── BOARD (real drag-and-drop) ───────────────────────────────────────────────
function TicketCard({ tk, onOpen }: { tk: Ticket; onOpen: (t: Ticket) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tk.id });
  const pr = PRIO[tk.priority as PKey], sr = SOURCE[srcToRef(tk.source)];
  const tags = tk.tags ? tk.tags.split(",").filter(Boolean) : [];
  const style: any = {
    background: T.panel, border: `1px solid ${T.border}`, borderLeft: `2px solid ${pr.color}`,
    borderRadius: 5, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 7,
    cursor: "grab", opacity: isDragging ? 0.4 : 1,
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={() => onOpen(tk)} style={style}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10.5, color: T.coral, letterSpacing: 0.5, fontWeight: 600 }}>{tk.key}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: T.faint }}><Dot c={pr.color} s={6} />{pr.label}</span>
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.42, color: T.text }}>{tk.title}</div>
      {tags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {tags.map((t) => <span key={t} style={{ fontSize: 9, color: T.dim, background: "rgba(255,255,255,0.04)", padding: "2px 5px", borderRadius: 3, letterSpacing: 0.3 }}>{t}</span>)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 1, borderTop: `1px solid ${T.border}`, paddingTop: 7 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, color: T.faint }}>
          <span style={{ color: srcToRef(tk.source) === "claude" ? T.coral : T.faint }}>{sr.glyph}</span>{sr.label}
        </span>
        {tk.assignee ? <Avatar pkey={tk.assignee} s={19} /> : <span style={{ fontSize: 9.5, color: T.ghost, border: `1px dashed ${T.border}`, borderRadius: 5, width: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center" }}>+</span>}
      </div>
    </div>
  );
}

const WIP: Record<SKey, number> = { open: 12, prog: 6, review: 6, done: 20 };

function BoardColumn({ skey, tickets, onOpen }: { skey: SKey; tickets: Ticket[]; onOpen: (t: Ticket) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: skey });
  const st = STATUS[skey];
  const items = tickets.filter((t) => DB_TO_SKEY[t.status] === skey);
  return (
    <div ref={setNodeRef} style={{ display: "flex", flexDirection: "column", minHeight: 0, background: isOver ? T.panel : T.bg2 }}>
      <div style={{ height: 42, flex: "0 0 42px", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderBottom: `1px solid ${T.border}` }}>
        <Dot c={st.color} /><span style={{ fontSize: 12, fontWeight: 600 }}>{st.label}</span>
        <span style={{ fontSize: 11, color: T.faint, fontVariantNumeric: "tabular-nums" }}>{items.length}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9.5, color: T.faint }}>WIP {items.length}/{WIP[skey]}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.04)" }}>
        <div style={{ width: `${Math.min(100, (items.length / WIP[skey]) * 100)}%`, height: "100%", background: items.length > WIP[skey] ? T.urgent : st.color, opacity: 0.7 }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((t) => <TicketCard key={t.id} tk={t} onOpen={onOpen} />)}
        {items.length === 0 && <div style={{ border: `1px dashed ${T.border}`, borderRadius: 5, padding: "7px", textAlign: "center", fontSize: 10.5, color: T.ghost }}>drop here</div>}
      </div>
    </div>
  );
}

function BoardView({ tickets, onMove, onOpen }: { tickets: Ticket[]; onMove: (id: number, status: string) => void; onOpen: (t: Ticket) => void }) {
  const [active, setActive] = useState<Ticket | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  function start(e: DragStartEvent) { setActive(tickets.find((t) => t.id === e.active.id) ?? null); }
  function end(e: DragEndEvent) {
    setActive(null);
    const over = e.over?.id as SKey | undefined;
    const tk = tickets.find((t) => t.id === e.active.id);
    if (tk && over && DB_TO_SKEY[tk.status] !== over) onMove(tk.id, SKEY_TO_DB[over]);
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={start} onDragEnd={end} onDragCancel={() => setActive(null)}>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: T.border }}>
        {SKEY_ORDER.map((sk) => <BoardColumn key={sk} skey={sk} tickets={tickets} onOpen={onOpen} />)}
      </div>
      <DragOverlay>
        {active && (
          <div style={{ background: T.panel, border: `1px solid ${T.coralLine}`, borderLeft: `2px solid ${PRIO[active.priority as PKey].color}`, borderRadius: 5, padding: "9px 10px", boxShadow: "0 12px 40px rgba(0,0,0,.5)", fontFamily: "var(--mono)" }}>
            <span style={{ fontSize: 10.5, color: T.coral, fontWeight: 600 }}>{active.key}</span>
            <div style={{ fontSize: 11.5, color: T.text, marginTop: 5 }}>{active.title}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── ANALYTICS ────────────────────────────────────────────────────────────────
function AnaStat({ l, v, unit, sub, c }: any) {
  return (
    <div style={{ background: T.bg2, padding: "13px 15px" }}>
      <div style={aS.hLabel}>{l}</div>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, marginTop: 7, fontVariantNumeric: "tabular-nums" }}>{v}<span style={{ fontSize: 13, color: T.faint, fontWeight: 400, marginLeft: 2 }}>{unit}</span></div>
      <div style={{ fontSize: 10.5, color: c || T.dim, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function AnalyticsView({ D }: { D: Derived }) {
  const srcShare: [string, number, string][] = [
    ["/ticket", D.kpi.createdPct, T.coral],
    ["manual", 100 - D.kpi.createdPct, T.open],
  ];
  return (
    <div style={aS.wrap}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 1, background: T.border, flex: "0 0 96px" }}>
        <AnaStat l="Tickets in" v={D.totalCreated} sub="all time" c={T.done} />
        <AnaStat l="Resolved" v={D.totalResolved} sub={`${D.resolveRate}% resolve rate`} />
        <AnaStat l="Avg cycle" v={D.avgCycle} unit="h" sub="created → done" c={T.done} />
        <AnaStat l="SLA met" v={D.slaMet} unit="%" sub="target 95%" c={T.high} />
        <AnaStat l="AI-created" v={D.kpi.createdPct} unit="%" sub="via /ticket + skill" c={T.coral} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gridTemplateRows: "1.25fr 1fr", gap: 1, background: T.border }}>
        <Panel title="Created vs resolved" right="30d · daily" glyph="▤">
          <Legend items={[{ t: "created", c: T.coral }, { t: "resolved", c: T.done }]} />
          <div style={{ marginTop: 8, flex: 1 }}>
            <Measured h={232}>{(w) => <AreaChart w={w} h={232} yTicks={4} series={[{ data: D.throughput.created, color: T.coral, w: 2 }, { data: D.throughput.resolved, color: T.done, w: 1.7 }]} xLabels={[{ i: 0, t: "30d ago" }, { i: 14, t: "15d" }, { i: 29, t: "today" }]} />}</Measured>
          </div>
        </Panel>
        <Panel title="Cycle time" right="P50 / P90" glyph="◴">
          <Legend items={[{ t: "p50", c: T.coral }, { t: "p90", c: T.coral, dash: true }]} />
          <div style={{ marginTop: 8, flex: 1 }}>
            <Measured h={232}>{(w) => <BandChart low={D.cycle.p50} high={D.cycle.p90} w={w} h={232} color={T.coral} />}</Measured>
          </div>
        </Panel>
        <Panel title="By source" right="share" glyph="◷">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Donut size={120} thickness={16} center={`${D.kpi.createdPct}%`} sub="VIA CLAUDE" segments={[{ v: D.kpi.createdPct, color: T.coral }, { v: 100 - D.kpi.createdPct, color: T.open }]} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {srcShare.map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                  <Dot c={c} /><span style={{ color: T.dim, flex: 1 }}>{l}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Claude — actions / day" right="14d" glyph="✳" style={{ borderTop: `1px solid ${T.coralLine}` }}>
          <div style={{ flex: 1, marginTop: 4 }}>
            <Measured h={150}>{(w) => <AreaChart w={w} h={150} yTicks={3} series={[{ data: D.ai.actionsPerDay, color: T.coral, w: 2 }]} xLabels={[{ i: 0, t: "14d" }, { i: 7, t: "7d" }, { i: 13, t: "today" }]} />}</Measured>
          </div>
          <FooterStat items={[{ l: "triaged", v: `${D.ai.triagedPct}%`, c: T.coral }, { l: "ai-created", v: `${D.ai.createdPct}%` }, { l: "actions today", v: D.ai.actionsToday }, { l: "resolved", v: D.totalResolved }]} />
        </Panel>
        <Panel title="Backlog by status" right={`${D.activeCount} active`} glyph="◷">
          <BarsH rows={D.statusCounts.map(([key, v]) => [STATUS[key].label, v])} colorFn={(_r: any, i: number) => STATUS[D.statusCounts[i][0]].color} rowH={25} font={11.5} labelW={88} />
        </Panel>
        <Panel title="Top tags" right="30d" glyph="▰">
          {D.tagCounts.length ? <BarsH rows={D.tagCounts} barColor={T.coralDim} rowH={25} font={11.5} labelW={88} /> : <Empty>no tags yet</Empty>}
        </Panel>
      </div>
    </div>
  );
}

// ── APP SHELL ────────────────────────────────────────────────────────────────
export default function ConsoleApp() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [view, setView] = useState<View>("dash");
  const [dialog, setDialog] = useState<null | "new" | Ticket>(null);

  const load = useCallback(async () => {
    try {
      const [tk, ac] = await Promise.all([api.list(), api.activity(20)]);
      setTickets(tk); setActivity(ac);
    } catch { /* server down — keep last state */ }
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, [load]);

  const D = useMemo(() => derive(tickets, activity), [tickets, activity]);

  async function move(id: number, status: string) {
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, status: status as any } : t)));
    try { await api.update(id, { status: status as any }); } finally { load(); }
  }
  async function save(draft: Draft) {
    if (dialog === "new") await api.create(draft as any);
    else if (dialog && typeof dialog === "object") await api.update(dialog.id, draft as any);
    setDialog(null); load();
  }
  async function remove() {
    if (dialog && typeof dialog === "object") { await api.remove(dialog.id); setDialog(null); load(); }
  }

  const crumb = view === "board" ? "BOARD" : view === "analytics" ? "ANALYTICS" : "OVERVIEW";

  return (
    <div style={aS.frame}>
      <TopBar view={view} setView={setView} onNew={() => setDialog("new")} />
      <SubBar crumb={crumb}>
        <div style={{ display: "flex", gap: 5 }}>
          {["24H", "7D", "30D", "QTR"].map((c) => <span key={c} style={chip(c === (view === "analytics" ? "30D" : "7D"))}>{c}</span>)}
        </div>
        <span style={{ color: T.ghost }}>·</span>
        <span>{D.activeCount} active · {D.resolvedToday} resolved today</span>
      </SubBar>

      {view === "dash" && <DashView D={D} />}
      {view === "board" && <BoardView tickets={tickets} onMove={move} onOpen={(t) => setDialog(t)} />}
      {view === "analytics" && <AnalyticsView D={D} />}

      {dialog !== null && (
        <Dialog ticket={dialog === "new" ? null : dialog} onClose={() => setDialog(null)} onSave={save} onDelete={dialog !== "new" ? remove : undefined} />
      )}
    </div>
  );
}
