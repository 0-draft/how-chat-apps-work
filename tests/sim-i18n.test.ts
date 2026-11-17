import { expect, it } from "vitest";
import { type Action, initial, reduce } from "../src/lib/sim/model";

const CJK = /[぀-ヿ㐀-鿿]/;

it("emits event text in both languages, English free of Japanese", () => {
  const actions: Action[] = [
    { type: "online", user: "B", online: false },
    { type: "send", from: "A", text: "a" },
    { type: "online", user: "A", online: false },
    { type: "send", from: "A", text: "b" },
    { type: "online", user: "A", online: true },
    { type: "online", user: "B", online: true },
    { type: "dropNextAck", on: true },
    { type: "send", from: "A", text: "c" },
    { type: "retry", from: "A" },
    { type: "open", user: "B" },
  ];
  let s = initial();
  const kinds = new Set<string>();
  for (const a of actions) {
    const out = reduce(s, a);
    s = out.state;
    for (const e of out.events) {
      kinds.add(e.kind);
      expect(e.text.en).not.toMatch(CJK);
      expect(e.text.ja.trim()).not.toBe("");
    }
  }
  expect([...kinds].sort()).toEqual(["lost", "note", "push", "request", "response"]);
});
