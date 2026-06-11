import { useEffect, useState } from "react";
import { COLUMNS, PRIORITIES, TYPES, type Priority, type Status, type Ticket, type TicketType } from "../api";
import { PEOPLE, PRIO, STATUS, DB_TO_SKEY, T } from "./theme";

export interface Draft {
  title: string;
  body: string;
  priority: Priority;
  status: Status;
  type: TicketType;
  tags: string;
  assignee: string;
}

const field: any = { width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, padding: "8px 10px", color: T.text, fontSize: 12, fontFamily: "var(--mono)", outline: "none" };
const label: any = { fontSize: 9.5, letterSpacing: 0.6, color: T.faint, textTransform: "uppercase", marginBottom: 5, display: "block" };

function Seg({ options, value, onPick, colorOf }: any) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {options.map((o: any) => {
        const on = value === o.v;
        return (
          <button key={o.v} onClick={() => onPick(o.v)} style={{ flex: 1, padding: "6px 4px", borderRadius: 5, fontSize: 11, fontFamily: "var(--mono)", textTransform: "capitalize", cursor: "pointer", color: on ? T.text : T.dim, background: on ? T.raised : T.bg, border: `1px solid ${on ? (colorOf ? colorOf(o.v) : T.coral) : T.border}` }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Dialog({ ticket, onClose, onSave, onDelete }: { ticket: Ticket | null; onClose: () => void; onSave: (d: Draft) => void; onDelete?: () => void }) {
  const [d, setD] = useState<Draft>({
    title: ticket?.title ?? "", body: ticket?.body ?? "",
    priority: ticket?.priority ?? "medium", status: ticket?.status ?? "open",
    type: ticket?.type ?? "task", tags: ticket?.tags ?? "", assignee: ticket?.assignee ?? "",
  });
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const editing = !!ticket;
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(10,9,8,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "11vh", fontFamily: "var(--mono)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "92vw", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, boxShadow: "0 24px 80px rgba(0,0,0,.6)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", height: 42, padding: "0 14px", borderBottom: `1px solid ${T.border}`, gap: 8 }}>
          <span style={{ color: T.coral }}>◧</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{editing ? `edit ${ticket!.key}` : "new ticket"}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.faint, fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={label}>Title</label>
            <input autoFocus value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Multi-tenant auth: org switching" style={field} />
          </div>
          <div>
            <label style={label}>Description</label>
            <textarea value={d.body} onChange={(e) => set({ body: e.target.value })} rows={3} placeholder="context, repro, acceptance criteria…" style={{ ...field, resize: "none" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={label}>Type</label>
              <Seg options={TYPES.map((t) => ({ v: t, label: t }))} value={d.type} onPick={(v: TicketType) => set({ type: v })} />
            </div>
            <div>
              <label style={label}>Priority</label>
              <Seg options={PRIORITIES.map((p) => ({ v: p, label: PRIO[p].label }))} value={d.priority} onPick={(v: Priority) => set({ priority: v })} colorOf={(v: Priority) => PRIO[v].color} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={label}>Status</label>
              <select value={d.status} onChange={(e) => set({ status: e.target.value as Status })} style={field}>
                {COLUMNS.map((c) => <option key={c.status} value={c.status}>{STATUS[DB_TO_SKEY[c.status]].label}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Assignee</label>
              <select value={d.assignee} onChange={(e) => set({ assignee: e.target.value })} style={field}>
                <option value="">— unassigned —</option>
                {Object.entries(PEOPLE).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={label}>Tags <span style={{ textTransform: "none", color: T.ghost }}>(comma-separated)</span></label>
            <input value={d.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="infra, auth, bug" style={field} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderTop: `1px solid ${T.border}`, gap: 8 }}>
          {editing && onDelete ? <button onClick={onDelete} style={{ background: "none", border: "none", color: T.urgent, fontSize: 11, cursor: "pointer", fontFamily: "var(--mono)" }}>delete</button> : <span />}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "var(--mono)" }}>cancel</button>
          <button disabled={!d.title.trim()} onClick={() => onSave(d)} style={{ background: T.coral, color: "#1a120e", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: d.title.trim() ? "pointer" : "not-allowed", opacity: d.title.trim() ? 1 : 0.4, fontFamily: "var(--mono)" }}>
            {editing ? "save" : "create"}
          </button>
        </div>
      </div>
    </div>
  );
}
