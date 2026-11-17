<script lang="ts">
import type { Lang } from "../i18n/ui";
import {
  type Action,
  type Event,
  initial,
  reduce,
  type State,
  type Status,
  type User,
} from "../lib/sim/model";

let { lang }: { lang: Lang } = $props();

const T = {
  en: {
    server: "Server",
    dropAck: "Drop the next ACK",
    online: "Online",
    open: "Open chat",
    retry: "Resend",
    send: "Send",
    placeholder: "Message",
    inputLabel: (u: User) => `Message from ${u}`,
    log: "Wire log",
    clear: "Clear",
    empty: "Nothing on the wire yet. Send something.",
    positions: (s: State) =>
      `delivered up to: A=${s.delivered.A} B=${s.delivered.B} · read up to: A=${s.read.A} B=${s.read.B}`,
    status: { sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read" },
    cols: ["seq", "clientMsgId", "from", "body"],
  },
  ja: {
    server: "サーバー",
    dropAck: "次の ACK を落とす",
    online: "オンライン",
    open: "トークを開く",
    retry: "再送",
    send: "送信",
    placeholder: "メッセージ",
    inputLabel: (u: User) => `${u} のメッセージ`,
    log: "通信ログ",
    clear: "クリア",
    empty: "まだ何も流れていない。何か送ってみて。",
    positions: (s: State) =>
      `配信済み位置 A=${s.delivered.A} B=${s.delivered.B} ・ 既読位置 A=${s.read.A} B=${s.read.B}`,
    status: { sending: "送信中", sent: "送信済み", delivered: "配信済み", read: "既読" },
    cols: ["seq", "clientMsgId", "from", "本文"],
  },
} as const;

const t = $derived(T[lang]);
const users: User[] = ["A", "B"];

let state: State = $state(initial());
let log: (Event & { n: number })[] = $state([]);
let drafts: Record<User, string> = $state({ A: "", B: "" });
let n = 0;

function dispatch(action: Action) {
  const out = reduce($state.snapshot(state) as State, action);
  state = out.state;
  log = [...out.events.map((e) => ({ ...e, n: ++n })).reverse(), ...log].slice(0, 200);
}

function send(u: User, e: SubmitEvent) {
  e.preventDefault();
  dispatch({ type: "send", from: u, text: drafts[u] });
  drafts[u] = "";
}

const pending = (u: User) =>
  state.clients[u].bubbles.some((b) => b.from === u && b.seq === undefined);
const arrow = (e: Event) => (e.kind === "note" ? e.from : `${e.from} → ${e.to}`);
const statusLabel = (s: Status) => t.status[s];
</script>

<div class="sim">
  <div class="sim-stage">
    {#each users as u (u)}
      {@const c = state.clients[u]}
      <section class="phone" class:is-offline={!c.online} data-user={u} aria-label={u}>
        <header class="phone-bar">
          <strong>{u}</strong>
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              checked={c.online}
              onchange={(e) => dispatch({ type: "online", user: u, online: e.currentTarget.checked })}
            />
            <span>{t.online}</span>
          </label>
        </header>
        <ol class="bubbles" aria-live="polite">
          {#each c.bubbles as b (b.clientId)}
            <li class={b.from === u ? "mine" : "theirs"}>
              <span class="bubble">{b.text}</span>
              {#if b.from === u}
                <small data-status={b.status}>{statusLabel(b.status)}</small>
              {/if}
            </li>
          {/each}
        </ol>
        <div class="phone-actions">
          <button type="button" onclick={() => dispatch({ type: "open", user: u })}>{t.open}</button>
          <button
            type="button"
            disabled={!c.online || !pending(u)}
            onclick={() => dispatch({ type: "retry", from: u })}>{t.retry}</button
          >
        </div>
        <form class="composer" onsubmit={(e) => send(u, e)}>
          <input
            type="text"
            bind:value={drafts[u]}
            placeholder={t.placeholder}
            aria-label={t.inputLabel(u)}
            autocomplete="off"
          />
          <button type="submit" class="primary">{t.send}</button>
        </form>
      </section>
      {#if u === "A"}
        <section class="server" aria-label={t.server}>
          <header class="server-bar">
            <strong>{t.server}</strong>
            <label class="switch">
              <input
                type="checkbox"
                role="switch"
                checked={state.dropNextAck}
                onchange={(e) => dispatch({ type: "dropNextAck", on: e.currentTarget.checked })}
              />
              <span>{t.dropAck}</span>
            </label>
          </header>
          <div class="table-wrap">
            <table>
              <thead><tr>{#each t.cols as col (col)}<th scope="col">{col}</th>{/each}</tr></thead>
              <tbody>
                {#each state.rows as r (r.seq)}
                  <tr><td>{r.seq}</td><td>{r.clientId}</td><td>{r.from}</td><td>{r.text}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="server-meta">{t.positions(state)}</p>
        </section>
      {/if}
    {/each}
  </div>

  <div class="log-bar">
    <strong>{t.log}</strong>
    <button type="button" class="quiet" onclick={() => (log = [])}>{t.clear}</button>
  </div>
  <ol class="log" aria-live="polite">
    {#each log as e (e.n)}
      <li class="ev ev--{e.kind}"><span class="ev-who">{arrow(e)}</span><code>{e.text[lang]}</code></li>
    {:else}
      <li class="ev ev--empty">{t.empty}</li>
    {/each}
  </ol>
</div>
