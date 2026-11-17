import { describe, expect, it } from "vitest";
import { type Action, initial, reduce, type State } from "../src/lib/sim/model";

function run(...actions: Action[]): State {
  return actions.reduce((s, a) => reduce(s, a).state, initial());
}

const statusOf = (s: State, user: "A" | "B", i = 0) =>
  s.clients[user].bubbles.filter((b) => b.from === user)[i]?.status;

describe("simulator model", () => {
  it("delivers to an online peer immediately", () => {
    const s = run({ type: "send", from: "A", text: "hi" });
    expect(s.rows).toHaveLength(1);
    expect(s.clients.B.bubbles.map((b) => b.text)).toEqual(["hi"]);
    expect(statusOf(s, "A")).toBe("delivered");
  });

  it("ignores blank messages", () => {
    const s = run({ type: "send", from: "A", text: "   " });
    expect(s.clients.A.bubbles).toHaveLength(0);
  });

  it("holds messages for an offline peer until it syncs", () => {
    let s = run(
      { type: "online", user: "B", online: false },
      { type: "send", from: "A", text: "hi" },
    );
    expect(statusOf(s, "A")).toBe("sent");
    expect(s.clients.B.bubbles).toHaveLength(0);

    const out = reduce(s, { type: "online", user: "B", online: true });
    s = out.state;
    expect(out.events.map((e) => e.text.en)).toContain("SYNC since=0");
    expect(s.clients.B.bubbles).toHaveLength(1);
    expect(statusOf(s, "A")).toBe("delivered");
  });

  it("notifies via the push service when the peer is offline", () => {
    const s = run({ type: "online", user: "B", online: false });
    const { events } = reduce(s, { type: "send", from: "A", text: "hi" });
    expect(events.some((e) => e.to === "apns")).toBe(true);
  });

  it("queues sends while offline and flushes on reconnect", () => {
    let s = run(
      { type: "online", user: "A", online: false },
      { type: "send", from: "A", text: "later" },
    );
    expect(s.rows).toHaveLength(0);
    expect(statusOf(s, "A")).toBe("sending");
    s = reduce(s, { type: "online", user: "A", online: true }).state;
    expect(s.rows).toHaveLength(1);
    expect(statusOf(s, "A")).toBe("delivered");
  });

  it("deduplicates a retry after a lost ACK", () => {
    let s = run({ type: "dropNextAck", on: true }, { type: "send", from: "A", text: "once" });
    expect(statusOf(s, "A")).toBe("sending");
    expect(s.dropNextAck).toBe(false);

    const out = reduce(s, { type: "retry", from: "A" });
    s = out.state;
    expect(s.rows).toHaveLength(1);
    expect(s.clients.B.bubbles).toHaveLength(1);
    expect(statusOf(s, "A")).toBe("delivered");
    expect(out.events.some((e) => e.kind === "note" && e.text.en.includes("already stored"))).toBe(
      true,
    );
  });

  it("marks messages read when the peer opens the chat", () => {
    const s = run(
      { type: "send", from: "A", text: "a" },
      { type: "send", from: "A", text: "b" },
      { type: "open", user: "B" },
    );
    expect(s.read.B).toBe(2);
    expect(statusOf(s, "A", 0)).toBe("read");
    expect(statusOf(s, "A", 1)).toBe("read");
  });

  it("does not mark read what has not been delivered", () => {
    const s = run(
      { type: "online", user: "B", online: false },
      { type: "send", from: "A", text: "a" },
      { type: "open", user: "B" },
    );
    expect(s.read.B).toBe(0);
  });

  it("keeps an offline sender's view stale until it reconnects", () => {
    let s = run(
      { type: "send", from: "A", text: "a" },
      { type: "online", user: "A", online: false },
      { type: "open", user: "B" },
    );
    expect(statusOf(s, "A")).toBe("delivered");
    s = reduce(s, { type: "online", user: "A", online: true }).state;
    expect(statusOf(s, "A")).toBe("read");
  });

  it("does not mutate the previous state", () => {
    const s0 = initial();
    reduce(s0, { type: "send", from: "A", text: "x" });
    expect(s0.rows).toHaveLength(0);
  });
});
