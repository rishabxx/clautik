// SVG chart primitives — ported from the Direction A redesign (no deps).
// Typed loosely on purpose; these mirror the reference 1:1.
import { useEffect, useRef, useState, type ReactNode } from "react";

const _max = (a: number[]) => Math.max(...a);
const _path = (pts: number[][]) =>
  pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
const rid = (p: string) => p + Math.random().toString(36).slice(2, 8);

export function Dot({ c, s = 7 }: { c: string; s?: number }) {
  return <span style={{ display: "inline-block", width: s, height: s, borderRadius: s, background: c }} />;
}

/** Measures its own width and hands it to a render-prop, so fixed-px charts fill flexible panels. */
export function Measured({ h, children }: { h: number; children: (w: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: "100%", height: h }}>
      {w > 0 && children(w)}
    </div>
  );
}

export function Spark({ data, w = 120, h = 34, color = "#d97757", fill = true, sw = 1.5, pad = 2 }: any) {
  const max = _max(data) || 1, min = Math.min(...data);
  const span = max - min || 1;
  const xs = (i: number) => pad + i * ((w - pad * 2) / (data.length - 1));
  const ys = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const pts = data.map((v: number, i: number) => [xs(i), ys(v)]);
  const id = rid("sp");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {fill && (
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={_path(pts) + `L ${xs(data.length - 1)} ${h} L ${xs(0)} ${h} Z`} fill={`url(#${id})`} />}
      <path d={_path(pts)} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs(data.length - 1)} cy={ys(data[data.length - 1])} r={sw + 0.8} fill={color} />
    </svg>
  );
}

export function AreaChart({
  series, w = 560, h = 200, pad = { t: 14, r: 14, b: 22, l: 30 }, grid = true,
  gridColor = "rgba(255,255,255,0.05)", axisColor = "#6a655d",
  yTicks = 4, xLabels = null, fillFirst = true, font = 11, dotLast = true,
}: any) {
  const all = series.flatMap((s: any) => s.data);
  const max = _max(all) * 1.12 || 1, min = 0;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const xs = (i: number, n: number) => pad.l + i * (iw / (n - 1));
  const ys = (v: number) => pad.t + ih - ((v - min) / (max - min)) * ih;
  const id = rid("ar");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={series[0].color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={series[0].color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid && Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = pad.t + i * (ih / yTicks), val = Math.round(max - (i * (max - min)) / yTicks);
        return (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={gridColor} strokeWidth="1" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={font - 1} fill={axisColor} fontFamily="inherit">{val}</text>
          </g>
        );
      })}
      {series.map((s: any, si: number) => {
        const pts = s.data.map((v: number, i: number) => [xs(i, s.data.length), ys(v)]);
        return (
          <g key={si}>
            {fillFirst && si === 0 && (
              <path d={_path(pts) + `L ${xs(s.data.length - 1, s.data.length)} ${pad.t + ih} L ${pad.l} ${pad.t + ih} Z`} fill={`url(#${id})`} />
            )}
            <path d={_path(pts)} fill="none" stroke={s.color} strokeWidth={s.w || 1.8} strokeDasharray={s.dash || "none"} strokeLinejoin="round" strokeLinecap="round" />
            {dotLast && <circle cx={xs(s.data.length - 1, s.data.length)} cy={ys(s.data[s.data.length - 1])} r="2.6" fill={s.color} />}
          </g>
        );
      })}
      {xLabels && xLabels.map((lb: any, i: number) => (
        <text key={i} x={xs(lb.i, series[0].data.length)} y={h - 6} textAnchor="middle" fontSize={font - 1} fill={axisColor} fontFamily="inherit">{lb.t}</text>
      ))}
    </svg>
  );
}

export function BandChart({ low, high, w = 420, h = 170, color = "#d97757", band = "rgba(217,119,87,0.12)", pad = { t: 14, r: 14, b: 20, l: 28 }, axisColor = "#6a655d", font = 11 }: any) {
  const max = _max(high) * 1.1 || 1;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const xs = (i: number, n: number) => pad.l + i * (iw / (n - 1));
  const ys = (v: number) => pad.t + ih - (v / max) * ih;
  const hi = high.map((v: number, i: number) => [xs(i, high.length), ys(v)]);
  const lo = low.map((v: number, i: number) => [xs(i, low.length), ys(v)]);
  const bandPath = _path(hi) + " " + _path([...lo].reverse()) + " Z";
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {Array.from({ length: 4 }).map((_, i) => {
        const y = pad.t + i * (ih / 3), val = Math.round(max - (i * max) / 3);
        return (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={font - 1} fill={axisColor} fontFamily="inherit">{val}</text>
          </g>
        );
      })}
      <path d={bandPath} fill={band} stroke="none" />
      <path d={_path(hi)} fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="3 3" />
      <path d={_path(lo)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={xs(lo.length - 1, lo.length)} cy={ys(low[low.length - 1])} r="2.6" fill={color} />
    </svg>
  );
}

export function BarsV({ data, w = 300, h = 120, color = "#d97757", track = "rgba(255,255,255,0.04)", labels = null, font = 10, axisColor = "#6a655d", highlightIdx = null, hiColor = "#d9685b", gap = 0.34 }: any) {
  const vals = data.map((d: any) => (Array.isArray(d) ? d[1] : d));
  const max = _max(vals) || 1;
  const n = vals.length, bw = w / n;
  const ih = h - (labels ? 16 : 2);
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {vals.map((v: number, i: number) => {
        const bh = (v / max) * (ih - 6), x = i * bw + (bw * gap) / 2, ww = bw * (1 - gap);
        const c = highlightIdx === i ? hiColor : color;
        return (
          <g key={i}>
            <rect x={x} y={2} width={ww} height={ih - 6} rx="1.5" fill={track} />
            <rect x={x} y={2 + (ih - 6 - bh)} width={ww} height={bh} rx="1.5" fill={c} />
            {labels && <text x={x + ww / 2} y={h - 3} textAnchor="middle" fontSize={font} fill={axisColor} fontFamily="inherit">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function BarsH({ rows, barColor = "#d97757", track = "rgba(255,255,255,0.05)", labelW = 64, valW = 30, rowH = 22, font = 11, labelColor = "#9a948b", valColor = "#ece7e0", colorFn = null }: any) {
  const max = _max(rows.map((r: any) => r[1])) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((r: any, i: number) => {
        const c = colorFn ? colorFn(r, i) : barColor;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, height: rowH - 6, fontFamily: "inherit" }}>
            <div style={{ width: labelW, fontSize: font, color: labelColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r[0]}</div>
            <div style={{ flex: 1, height: 7, background: track, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${(r[1] / max) * 100}%`, height: "100%", background: c, borderRadius: 4 }} />
            </div>
            <div style={{ width: valW, textAlign: "right", fontSize: font, color: valColor, fontVariantNumeric: "tabular-nums" }}>{r[1]}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({ segments, size = 120, thickness = 16, gap = 2, track = "rgba(255,255,255,0.05)", center = null, sub = null, centerColor = "#ece7e0", font = 22 }: any) {
  const total = segments.reduce((a: number, s: any) => a + s.v, 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r, cx = size / 2;
  let off = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        {segments.map((s: any, i: number) => {
          const len = (s.v / total) * c;
          const dash = `${Math.max(0, len - gap)} ${c - Math.max(0, len - gap)}`;
          const el = <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={dash} strokeDashoffset={-off} strokeLinecap="butt" />;
          off += len;
          return el;
        })}
      </svg>
      {center != null && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
          <div style={{ fontSize: font, fontWeight: 600, color: centerColor, fontVariantNumeric: "tabular-nums" }}>{center}</div>
          {sub && <div style={{ fontSize: 10, color: "#6a655d", marginTop: 3, letterSpacing: 0.4 }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

export function Gauge({ value, size = 120, thickness = 12, color = "#d97757", track = "rgba(255,255,255,0.06)", label = null }: any) {
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2;
  const circ = Math.PI * r;
  const dash = `${(value / 100) * circ} ${circ}`;
  return (
    <div style={{ position: "relative", width: size, height: size / 2 + 8 }}>
      <svg width={size} height={size / 2 + 8}>
        <g transform={`rotate(180 ${cx} ${cy})`}>
          <path d={`M ${thickness / 2} ${cy} A ${r} ${r} 0 0 1 ${size - thickness / 2} ${cy}`} fill="none" stroke={track} strokeWidth={thickness} strokeLinecap="round" />
          <path d={`M ${thickness / 2} ${cy} A ${r} ${r} 0 0 1 ${size - thickness / 2} ${cy}`} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={dash} />
        </g>
      </svg>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", lineHeight: 1 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: "#ece7e0", fontVariantNumeric: "tabular-nums" }}>{value}<span style={{ fontSize: 13, color: "#9a948b" }}>%</span></div>
        {label && <div style={{ fontSize: 10, color: "#6a655d", marginTop: 3, letterSpacing: 0.4 }}>{label}</div>}
      </div>
    </div>
  );
}
