import type { L10n } from "../../i18n/ui";

export type User = "A" | "B";
export type Status = "sending" | "sent" | "delivered" | "read";

export interface Bubble {
  clientId: string;
  from: User;
  text: string;
  seq?: number;
  status: Status;
}

export interface ServerRow {
  seq: number;
  clientId: string;
  from: User;
  text: string;
}

export interface Client {
  online: boolean;
  cursor: number;
  bubbles: Bubble[];
}

export interface State {
  clients: Record<User, Client>;
  rows: ServerRow[];
  delivered: Record<User, number>;
  read: Record<User, number>;
  dropNextAck: boolean;
  counter: number;
}

export type Action =
  | { type: "send"; from: User; text: string }
  | { type: "retry"; from: User }
  | { type: "online"; user: User; online: boolean }
  | { type: "open"; user: User }
  | { type: "dropNextAck"; on: boolean };

export interface Event {
  from: string;
  to: string;
  text: L10n;
  kind: "request" | "response" | "push" | "lost" | "note";
}

const same = (x: string): L10n => ({ en: x, ja: x });

export const other = (u: User): User => (u === "A" ? "B" : "A");

export function initial(): State {
  return {
    clients: {
      A: { online: true, cursor: 0, bubbles: [] },
      B: { online: true, cursor: 0, bubbles: [] },
    },
    rows: [],
    delivered: { A: 0, B: 0 },
    read: { A: 0, B: 0 },
    dropNextAck: false,
    counter: 0,
  };
}

function clone(s: State): State {
  return structuredClone(s);
}

function lastSeqFrom(s: State, from: User): number {
  return s.rows.filter((r) => r.from === from).reduce((m, r) => Math.max(m, r.seq), 0);
}

function refreshStatuses(s: State): void {
  for (const u of ["A", "B"] as const) {
    if (!s.clients[u].online) continue;
    const peer = other(u);
    for (const b of s.clients[u].bubbles) {
      if (b.from !== u || b.seq === undefined) continue;
      if (s.read[peer] >= b.seq) b.status = "read";
      else if (s.delivered[peer] >= b.seq) b.status = "delivered";
      else b.status = "sent";
    }
  }
}

function deliver(s: State, to: User, ev: Event[]): void {
  const c = s.clients[to];
  const fresh = s.rows.filter((r) => r.seq > c.cursor && r.from !== to);
  if (fresh.length === 0) {
    c.cursor = Math.max(c.cursor, s.rows.at(-1)?.seq ?? 0);
    return;
  }
  for (const r of fresh) {
    if (!c.bubbles.some((b) => b.clientId === r.clientId)) {
      c.bubbles.push({
        clientId: r.clientId,
        from: r.from,
        text: r.text,
        seq: r.seq,
        status: "sent",
      });
    }
  }
  const top = s.rows.at(-1)?.seq ?? 0;
  c.cursor = top;
  s.delivered[to] = top;
  ev.push({ from: `${to}`, to: "server", kind: "response", text: same(`DELIVERED upTo=${top}`) });
}

function submit(s: State, from: User, clientId: string, text: string, ev: Event[]): void {
  ev.push({ from, to: "server", kind: "request", text: same(`SEND clientId=${clientId}`) });
  let row = s.rows.find((r) => r.clientId === clientId);
  const duplicate = row !== undefined;
  if (row) {
    ev.push({
      from: "server",
      to: "server",
      kind: "note",
      text: {
        en: `clientId=${clientId} already stored. Return the same seq, store nothing`,
        ja: `clientId=${clientId} は処理済み。保存せず同じ seq を返す`,
      },
    });
  } else {
    row = { seq: (s.rows.at(-1)?.seq ?? 0) + 1, clientId, from, text };
    s.rows.push(row);
  }

  const bubble = s.clients[from].bubbles.find((b) => b.clientId === clientId);
  if (s.dropNextAck) {
    s.dropNextAck = false;
    ev.push({
      from: "server",
      to: from,
      kind: "lost",
      text: { en: `ACK seq=${row.seq} (lost on the way)`, ja: `ACK seq=${row.seq} (途中で消えた)` },
    });
  } else {
    if (bubble) bubble.seq = row.seq;
    s.clients[from].cursor = Math.max(s.clients[from].cursor, row.seq);
    ev.push({
      from: "server",
      to: from,
      kind: "response",
      text: same(`ACK clientId=${clientId} seq=${row.seq}`),
    });
  }

  const peer = other(from);
  if (duplicate) return;
  if (s.clients[peer].online) {
    ev.push({ from: "server", to: peer, kind: "push", text: same(`EVENT seq=${row.seq}`) });
    deliver(s, peer, ev);
  } else {
    ev.push({
      from: "server",
      to: "apns",
      kind: "push",
      text: { en: `push request → ${peer} (no body)`, ja: `通知依頼 → ${peer} (本文なし)` },
    });
  }
}

export function reduce(prev: State, action: Action): { state: State; events: Event[] } {
  const s = clone(prev);
  const ev: Event[] = [];

  switch (action.type) {
    case "send": {
      const text = action.text.trim();
      if (!text) break;
      s.counter += 1;
      const clientId = `${action.from.toLowerCase()}-${s.counter}`;
      s.clients[action.from].bubbles.push({ clientId, from: action.from, text, status: "sending" });
      if (s.clients[action.from].online) submit(s, action.from, clientId, text, ev);
      else
        ev.push({
          from: action.from,
          to: action.from,
          kind: "note",
          text: {
            en: `offline: queued in outbox (${clientId})`,
            ja: `オフライン。送信待ちに積む (${clientId})`,
          },
        });
      break;
    }
    case "retry": {
      if (!s.clients[action.from].online) break;
      for (const b of s.clients[action.from].bubbles) {
        if (b.from === action.from && b.seq === undefined)
          submit(s, action.from, b.clientId, b.text, ev);
      }
      break;
    }
    case "online": {
      const c = s.clients[action.user];
      if (c.online === action.online) break;
      c.online = action.online;
      if (!action.online) {
        ev.push({
          from: action.user,
          to: "server",
          kind: "note",
          text: { en: "connection dropped", ja: "接続が切れた" },
        });
        break;
      }
      ev.push({
        from: action.user,
        to: "server",
        kind: "request",
        text: same(`SYNC since=${c.cursor}`),
      });
      deliver(s, action.user, ev);
      for (const b of c.bubbles) {
        if (b.from === action.user && b.seq === undefined)
          submit(s, action.user, b.clientId, b.text, ev);
      }
      break;
    }
    case "open": {
      const u = action.user;
      if (!s.clients[u].online) break;
      const upTo = lastSeqFrom(s, other(u));
      if (upTo === 0 || s.read[u] >= upTo || s.delivered[u] < upTo) break;
      s.read[u] = upTo;
      ev.push({ from: u, to: "server", kind: "request", text: same(`READ upTo=${upTo}`) });
      if (s.clients[other(u)].online) {
        ev.push({
          from: "server",
          to: other(u),
          kind: "push",
          text: same(`READ_RECEIPT by=${u} upTo=${upTo}`),
        });
      }
      break;
    }
    case "dropNextAck":
      s.dropNextAck = action.on;
      break;
  }

  refreshStatuses(s);
  return { state: s, events: ev };
}
