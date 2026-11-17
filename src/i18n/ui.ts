export const LANGS = ["en", "ja"] as const;
export type Lang = (typeof LANGS)[number];
export type L10n = Record<Lang, string>;

export const NATIVE_NAME: Record<Lang, string> = { en: "English", ja: "日本語" };

export const ui = {
  siteTitle: { en: "How chat apps work", ja: "チャットアプリのしくみ" },
  siteDescription: {
    en: "Follow one chat message from the send button to a read receipt, hop by hop, with step-through sequence diagrams.",
    ja: "送信ボタンから既読がつくまで、1 通のメッセージが通る道をシーケンス図で 1 ステップずつ追う。",
  },
  kicker: { en: "A field guide to messaging internals", ja: "メッセージングの内側を歩く" },
  heroTitle: { en: "Sent, delivered, read.", ja: "既読が\nつくまで" },
  heroLede: {
    en: "You tap send, a bubble appears on someone else's screen, and soon after it says Read. Getting it there takes a fraction of a second. This is what travels between the phones and the servers along the way, one frame at a time.",
    ja: "「送信」を押すと相手の画面に吹き出しが出て、しばらくすると「既読」がつく。相手の端末に届くまでは 1 秒もかからない。そのあいだに端末とサーバーのあいだを何が行き来しているのかを、フレーム単位で追っていく。",
  },
  toc: { en: "Contents", ja: "目次" },
  diagram: { en: "Sequence diagram", ja: "シーケンス図" },
  step: { en: "Step", ja: "ステップ" },
  prev: { en: "Previous step", ja: "前のステップ" },
  next: { en: "Next step", ja: "次のステップ" },
  restart: { en: "Back to the first step", ja: "最初のステップへ" },
  play: { en: "Play", ja: "再生" },
  pause: { en: "Pause", ja: "一時停止" },
  payload: { en: "On the wire", ja: "流れるデータ" },
  legendTitle: { en: "How to read the diagrams", ja: "図の読み方" },
  legend: {
    en: "request|A asks B for something,response|the answer coming back,push|the server sends without being asked,lost|it never arrives,self|work done inside one box",
    ja: "request|依頼する,response|返事が戻る,push|サーバーから押し込む,lost|途中で消える,self|箱の中での処理",
  },
  keys: {
    en: "Scroll, use ← → keys, or click any arrow to jump to it.",
    ja: "スクロールするか、← → キー、または矢印のクリックで進む。",
  },
  sources: { en: "Sources", ja: "出典" },
  footer: {
    en: "Protocol names, fields and numbers in the diagrams are invented for illustration. Statements about real apps come from the cited sources.",
    ja: "図中のプロトコル・フィールド名・数値は説明のための架空のもの。実在のアプリについての記述は各出典による。",
  },
  editOnGitHub: { en: "Source on GitHub", ja: "GitHub でソースを見る" },
  skip: { en: "Skip to content", ja: "本文へスキップ" },
} satisfies Record<string, L10n>;

export type UiKey = keyof typeof ui;

export function tr(lang: Lang, key: UiKey): string {
  return ui[key][lang];
}

export function pairs(lang: Lang, key: UiKey): [string, string][] {
  return tr(lang, key)
    .split(",")
    .map((p) => {
      const [a = "", b = ""] = p.split("|");
      return [a, b];
    });
}

export function pick(lang: Lang, v: string | L10n): string {
  return typeof v === "string" ? v : v[lang];
}
