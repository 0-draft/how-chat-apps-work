import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SequenceChapter from "../src/components/SequenceChapter.astro";
import { sequences } from "../src/lib/sequences";

describe.each(["en", "ja"] as const)("SequenceChapter (%s)", (lang) => {
  it.each(Object.keys(sequences) as (keyof typeof sequences)[])("renders %s", async (id) => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SequenceChapter, { props: { seq: id, lang } });
    const seq = sequences[id];
    expect(html.match(/class="step step--/g)).toHaveLength(seq.steps.length);
    expect(html.match(/<li class="card card--/g)).toHaveLength(seq.steps.length);
    for (let i = 1; i <= seq.steps.length; i++) {
      expect(html).toContain(`href="#${id}-${i}"`);
      expect(html).toContain(`id="${id}-${i}"`);
    }
    expect(html).toContain(seq.steps[0]?.title[lang]);
  });
});
