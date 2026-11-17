import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.SITE_ORIGIN ?? "https://0-draft.github.io",
  base: process.env.BASE_PATH ?? "/how-chat-apps-work",
  trailingSlash: "always",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ja"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    mdx(),
    svelte(),
    sitemap({ i18n: { defaultLocale: "en", locales: { en: "en", ja: "ja" } } }),
  ],
});
