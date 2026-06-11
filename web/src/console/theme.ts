// Console design tokens — ported verbatim from the Direction A redesign
// (dark + mono + Claude coral).
export const T = {
  bg: "#141312",
  bg2: "#1a1817",
  panel: "#1c1b19",
  panel2: "#211f1d",
  raised: "#262320",
  border: "#2c2926",
  borderHi: "#383430",
  text: "#ece7e0",
  dim: "#9a948b",
  faint: "#6a655d",
  ghost: "#48443e",
  coral: "#d97757",
  coralHi: "#e88f70",
  coralDim: "#9c5740",
  coralSoft: "rgba(217,119,87,0.14)",
  coralLine: "rgba(217,119,87,0.5)",
  open: "#d9a05b", // amber
  prog: "#5b9dd9", // blue
  review: "#b88bd9", // purple
  done: "#5bbd8a", // green
  urgent: "#d9685b",
  high: "#d9905b",
  medium: "#d9bf5b",
  low: "#7a8a9a",
  up: "#5bbd8a",
  down: "#d9685b",
} as const;

// Reference status keys (open/prog/review/done) — what the ported components index.
export type SKey = "open" | "prog" | "review" | "done";
export const STATUS: Record<SKey, { label: string; color: string }> = {
  open: { label: "Open", color: T.open },
  prog: { label: "In Progress", color: T.prog },
  review: { label: "In Review", color: T.review },
  done: { label: "Resolved", color: T.done },
};
export const SKEY_ORDER: SKey[] = ["open", "prog", "review", "done"];

// Map between the DB status strings and the reference short keys.
export const DB_TO_SKEY: Record<string, SKey> = {
  open: "open",
  in_progress: "prog",
  in_review: "review",
  done: "done",
};
export const SKEY_TO_DB: Record<SKey, string> = {
  open: "open",
  prog: "in_progress",
  review: "in_review",
  done: "done",
};

export type PKey = "urgent" | "high" | "medium" | "low";
export const PRIO: Record<PKey, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: T.urgent },
  high: { label: "High", color: T.high },
  medium: { label: "Medium", color: T.medium },
  low: { label: "Low", color: T.low },
};
export const PKEY_ORDER: PKey[] = ["urgent", "high", "medium", "low"];

export const SOURCE: Record<string, { label: string; glyph: string }> = {
  claude: { label: "/ticket", glyph: "✳" },
  manual: { label: "manual", glyph: "✎" },
  email: { label: "email", glyph: "✉" },
  slack: { label: "slack", glyph: "#" },
};
// DB sources (hook/td/slash = AI) collapse to "claude"; dashboard = manual.
export function srcToRef(src: string): string {
  return src === "dashboard" ? "manual" : src in SOURCE ? src : "claude";
}

export interface Person {
  name: string;
  init: string;
  color: string;
  bot?: boolean;
}
export const PEOPLE: Record<string, Person> = {
  claude: { name: "Claude", init: "CL", color: T.coral, bot: true },
  maya: { name: "Maya R.", init: "MR", color: "#5b9dd9" },
  dev: { name: "Devon K.", init: "DK", color: "#5bbd8a" },
  amina: { name: "Amina S.", init: "AS", color: "#b88bd9" },
  jonas: { name: "Jonas P.", init: "JP", color: "#d9a05b" },
};
export function personFor(key: string): Person {
  if (PEOPLE[key]) return PEOPLE[key];
  const init = key.slice(0, 2).toUpperCase() || "··";
  return { name: key, init, color: T.dim };
}
