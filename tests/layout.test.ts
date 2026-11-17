import { describe, expect, it } from "vitest";
import { COL_W, HEAD_H, layout, PAD, ROW_H, SELF_LABEL_W } from "../src/lib/layout";
import type { Sequence } from "../src/lib/sequences/types";

const seq: Sequence = {
  id: "t",
  actors: [
    { id: "x", name: { en: "X", ja: "X" }, kind: "device" },
    { id: "y", name: { en: "Y", ja: "Y" }, kind: "service" },
  ],
  steps: [
    {
      from: "x",
      to: "y",
      kind: "request",
      label: "a",
      title: { en: "a", ja: "a" },
      body: { en: "a", ja: "a" },
    },
    {
      from: "y",
      to: "y",
      kind: "self",
      label: "b",
      title: { en: "b", ja: "b" },
      body: { en: "b", ja: "b" },
    },
    {
      from: "x",
      to: "y",
      kind: "lost",
      label: "c",
      title: { en: "c", ja: "c" },
      body: { en: "c", ja: "c" },
    },
  ],
};

describe("layout", () => {
  const geo = layout(seq);

  it("sizes the canvas from actors and steps", () => {
    expect(geo.width).toBe(PAD * 2 + COL_W * 2 + SELF_LABEL_W);
    expect(geo.height).toBe(HEAD_H + PAD * 2 + ROW_H * 3);
  });

  it("skips the label gutter when the last actor has no self step", () => {
    const plain = { ...seq, steps: [seq.steps[0]!] };
    expect(layout(plain).width).toBe(PAD * 2 + COL_W * 2);
  });

  it("centres actors in their columns", () => {
    expect(geo.columns.get("x")).toBe(PAD + COL_W / 2);
    expect(geo.columns.get("y")).toBe(PAD + COL_W * 1.5);
  });

  it("stacks steps top to bottom", () => {
    const ys = geo.arrows.map((a) => a.y);
    expect(ys).toEqual([...ys].sort((p, q) => p - q));
    expect(ys[1]! - ys[0]!).toBe(ROW_H);
  });

  it("flags self steps and shortens lost ones", () => {
    expect(geo.arrows[1]!.self).toBe(true);
    const lost = geo.arrows[2]!;
    expect(lost.x2).toBeLessThan(geo.columns.get("y")!);
    expect(lost.x2).toBeGreaterThan(lost.x1);
  });

  it("rejects unknown actors", () => {
    const bad = { ...seq, steps: [{ ...seq.steps[0]!, to: "z" }] };
    expect(() => layout(bad)).toThrow(/unknown actor/);
  });
});
