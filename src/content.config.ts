import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const chapters = defineCollection({
  loader: glob({ base: "./src/content/chapters", pattern: "**/*.mdx" }),
  schema: z.object({
    number: z.number().int().nonnegative(),
    title: z.string(),
    short: z.string(),
    kind: z.enum(["map", "seq", "sim", "apps", "refs"]),
    seq: z
      .enum(["overview", "connection", "retry", "offline", "e2ee", "group", "media"])
      .optional(),
  }),
});

export const collections = { chapters };
