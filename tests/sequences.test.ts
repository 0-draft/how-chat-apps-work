import { describe, expect, it } from "vitest";
import type { L10n } from "../src/i18n/ui";
import { sequences } from "../src/lib/sequences";

const CJK = /[぀-ヿ㐀-鿿]/;

function both(v: string | L10n): L10n {
  return typeof v === "string" ? { en: v, ja: v } : v;
}

describe.each(Object.values(sequences))("sequence $id", (seq) => {
  const ids = seq.actors.map((a) => a.id);

  it("has unique actor ids", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references declared actors", () => {
    for (const s of seq.steps) {
      expect(ids).toContain(s.from);
      expect(ids).toContain(s.to);
    }
  });

  it("uses self only for same-actor steps", () => {
    for (const s of seq.steps) expect(s.kind === "self").toBe(s.from === s.to);
  });

  it("puts every actor to use", () => {
    const used = new Set(seq.steps.flatMap((s) => [s.from, s.to]));
    expect([...used].sort()).toEqual([...ids].sort());
  });

  it("has text in both languages for every step", () => {
    for (const s of seq.steps) {
      for (const v of [both(s.label), s.title, s.body]) {
        expect(v.en.trim()).not.toBe("");
        expect(v.ja.trim()).not.toBe("");
      }
    }
  });

  it("keeps Japanese out of English text and payloads", () => {
    for (const a of seq.actors) expect(a.name.en).not.toMatch(CJK);
    for (const s of seq.steps) {
      for (const v of [both(s.label).en, s.title.en, s.body.en, s.payload ?? ""]) {
        expect(v).not.toMatch(CJK);
      }
    }
  });
});

it("every sequence id matches its key", () => {
  for (const [key, seq] of Object.entries(sequences)) expect(seq.id).toBe(key);
});
