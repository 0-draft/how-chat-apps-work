# How chat apps work

Follow one chat message from the send button to a read receipt, hop by hop, with step-through
sequence diagrams and a two-phone simulator. English at `/`, Japanese at `/ja/`.

<https://0-draft.github.io/how-chat-apps-work/>

## What's inside

| Chapter                           | Sequence                                                            |
| --------------------------------- | ------------------------------------------------------------------- |
| From send to read                 | `overview`                                                          |
| The always-on connection          | `connection`                                                        |
| Why it never arrives twice        | `retry`                                                             |
| Delivered while the app is closed | `offline`                                                           |
| A letter the server can't read    | `e2ee`                                                              |
| Groups                            | `group`                                                             |
| Photos and video                  | `media`                                                             |
| Try it                            | simulator                                                           |
| Real apps                         | LINE, WhatsApp, Signal, iMessage, Messenger, Telegram, Discord, MLS |

The protocol in the diagrams is a composite made up for teaching. Statements about real apps live in
`src/lib/apps.ts`, each with its primary source.

## Layout

```text
src/
  lib/sequences/      step data, every string as { en, ja }
  lib/layout.ts       diagram geometry (pure)
  lib/sim/model.ts    simulator state machine (pure)
  lib/apps.ts         real-app claims + sources
  content/chapters/   chapter prose, en/ and ja/ MDX with matching frontmatter
  components/         SequenceFigure (SSR SVG), SequenceChapter, Simulator.svelte, ...
  scripts/seq-player.ts   <seq-player> custom element: scroll on desktop, stepper on phones
```

Diagrams are rendered to SVG at build time, so every step is readable without JavaScript. Prose can
jump the diagram to a step with a plain link: `[text](#overview-6)`.

## Develop

```sh
npm ci
npm run dev
```

| Command         | What it runs                                                                            |
| --------------- | --------------------------------------------------------------------------------------- |
| `npm run lint`  | Biome (format + lint)                                                                   |
| `npm run check` | `astro check` (types, Astro, Svelte)                                                    |
| `npm test`      | Vitest: sequence data, EN/JA parity, step links, layout, simulator, rendered components |
| `npm run build` | check + static build to `dist/`                                                         |
| `npm run e2e`   | Playwright on desktop, phone and dark mode, with axe                                    |

## CI

- `ci.yml`: Biome, astro check, Vitest, build, Playwright + axe, actionlint
- `pages.yml`: deploys `main` to GitHub Pages
- `links.yml`: weekly check of every cited source; opens an issue when one breaks
- `codeql.yml`: CodeQL for TypeScript and workflows
- `claude-review.yml`: Claude reviews each PR for accuracy, citations and EN/JA drift (needs the `CLAUDE_CODE_OAUTH_TOKEN` secret)
- Dependabot: npm and GitHub Actions, weekly, grouped
