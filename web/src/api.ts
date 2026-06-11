export type Status = "open" | "in_progress" | "in_review" | "done";
export type Priority = "urgent" | "high" | "medium" | "low";
export type TicketType = "task" | "bug" | "epic";

export interface Ticket {
  id: number;
  key: string;
  title: string;
  body: string;
  status: Status;
  priority: Priority;
  type: TicketType;
  tags: string;
  assignee: string;
  source: string;
  project: string;
  session_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface Activity {
  id: number;
  ticket_id: number;
  ticket_key: string;
  action: string;
  detail: string;
  at: string;
}

export const COLUMNS: { status: Status; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Resolved" },
];

export const TYPES: TicketType[] = ["task", "bug", "epic"];
export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  list: () => jfetch<Ticket[]>("/api/tickets"),
  activity: (limit = 30) => jfetch<Activity[]>(`/api/activity?limit=${limit}`),
  create: (data: Partial<Ticket>) =>
    jfetch<Ticket>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, patch: Partial<Ticket>) =>
    jfetch<Ticket>(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  remove: (id: number) =>
    jfetch<{ ok: boolean }>(`/api/tickets/${id}`, { method: "DELETE" }),
};
