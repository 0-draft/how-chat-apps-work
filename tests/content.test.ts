import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apps, mls } from "../src/lib/apps";
import { sequences } from "../src/lib/sequences";

const ROOT = join(import.meta.dirname, "../src/content/chapters");

function frontmatter(file: string): Record<string, string> {
  const src = readFileSync(file, "utf8");
  const block = /^---\n([\s\S]*?)\n---/.exec(src)?.[1] ?? "";
  return Object.fromEntries(
    block.split("\n").map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
}

const files = (lang: string) => readdirSync(join(ROOT, lang)).sort();

describe("chapters", () => {
  it("exist in both languages with the same structure", () => {
    expect(files("ja")).toEqual(files("en"));
    for (const f of files("en")) {
      const en = frontmatter(join(ROOT, "en", f));
      const ja = frontmatter(join(ROOT, "ja", f));
      expect({ n: ja.number, k: ja.kind, s: ja.seq }).toEqual({
        n: en.number,
        k: en.kind,
        s: en.seq,
      });
    }
  });

  it("only link to steps that exist", () => {
    for (const lang of ["en", "ja"]) {
      for (const f of files(lang)) {
        const body = readFileSync(join(ROOT, lang, f), "utf8");
        for (const [, id, n] of body.matchAll(/\]\(#([a-z0-9]+)-(\d+)\)/g)) {
          const seq = sequences[id as keyof typeof sequences];
          expect(seq, `${lang}/${f} links to unknown sequence ${id}`).toBeDefined();
          expect(Number(n)).toBeGreaterThanOrEqual(1);
          expect(Number(n)).toBeLessThanOrEqual(seq.steps.length);
        }
      }
    }
  });
});

describe("real-app claims", () => {
  it("each app cites at least one https source", () => {
    for (const a of apps) {
      expect(a.sources.length, a.name).toBeGreaterThan(0);
      for (const s of [...a.sources, ...mls.sources]) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("has every claim in both languages", () => {
    for (const a of apps) {
      for (const v of [a.transport, a.e2ee, a.groups, ...a.notes]) {
        expect(v.en.trim()).not.toBe("");
        expect(v.ja.trim()).not.toBe("");
      }
    }
  });
});
