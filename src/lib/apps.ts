import type { L10n } from "../i18n/ui";

export interface Source {
  title: string;
  url: string;
}

export interface AppProfile {
  id: string;
  name: string;
  transport: L10n;
  e2ee: L10n;
  e2eeDefault: "yes" | "partial" | "no";
  groups: L10n;
  notes: L10n[];
  sources: Source[];
}

const t = (en: string, ja: string): L10n => ({ en, ja });

const LINE_WP: Source = {
  title: "LINE Encryption Overview v2.2",
  url: "https://www.lycorp.co.jp/en/privacy-security/line-encryption-whitepaper-ver2.2.pdf",
};
const WA_WP: Source = {
  title: "WhatsApp Encryption Overview",
  url: "https://www.whatsapp.com/security/WhatsApp-Security-Whitepaper.pdf",
};

export const apps: AppProfile[] = [
  {
    id: "line",
    name: "LINE",
    transport: t(
      "Its own gateway, LEGY. SPDY from 2012, HTTP/2 today, moving to TLS 1.2 / 1.3.",
      "自社製ゲートウェイ LEGY。2012 年から SPDY、現在は HTTP/2 で TLS 1.2 / 1.3 へ移行中。",
    ),
    e2ee: t(
      "Letter Sealing: ECDH over Curve25519, AES-256-GCM (v2).",
      "Letter Sealing: Curve25519 の ECDH、AES-256-GCM (v2)。",
    ),
    e2eeDefault: "yes",
    groups: t(
      "A shared group key, regenerated when members change.",
      "グループ共有鍵。メンバーが変わると作り直す。",
    ),
    notes: [
      t(
        'Events are stored per account as "Operations", each with a revision number. Clients call fetchOperations(clientRev, count) over long polling; an empty result is 204 No Content.',
        "イベントはアカウントごとに「Operation」として積まれ、それぞれが revision 番号を持つ。端末は fetchOperations(clientRev, count) をロングポーリングで呼び、何もなければ 204 No Content が返る。",
      ),
      t(
        "Letter Sealing v2 is on by default for 1:1 and group chats when the clients support it. Sender and recipient IDs are not encrypted.",
        "Letter Sealing v2 は対応クライアント同士なら 1 対 1 もグループも既定で有効。送信者 ID・受信者 ID は暗号化されない。",
      ),
      t(
        "Message storage moved from Redis to HBase as volume grew, with Redis kept as a cache.",
        "メッセージの保存先は、量の増加にあわせて Redis から HBase に移り、Redis はキャッシュとして残した。",
      ),
    ],
    sources: [
      LINE_WP,
      {
        title: "LINE Engineering: Adopting SPDY in LINE",
        url: "https://engineering.linecorp.com/en/blog/adopting-spdy-in-line-part-1-overview/",
      },
      {
        title: "LINE DEVDAY 2019: LINT",
        url: "https://speakerdeck.com/line_devday2019/lint-line-improvement-for-next-ten-years",
      },
      {
        title: "LINE Engineering: LINE Storage",
        url: "https://engineering.linecorp.com/en/blog/line-storage-storing-billions-of-rows-in-sharded-redis-and-hbase/",
      },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    transport: t(
      "Noise Pipes with Curve25519, AES-GCM and SHA-256.",
      "Noise Pipes (Curve25519、AES-GCM、SHA-256)。",
    ),
    e2ee: t("Built on the Signal Protocol.", "Signal Protocol がベース。"),
    e2eeDefault: "yes",
    groups: t(
      "Sender Keys, handed out over pairwise sessions. The server fans out.",
      "Sender Keys を 1 対 1 のセッションで配る。配送はサーバー側で fan-out。",
    ),
    notes: [
      t(
        "Every linked device has its own identity key, and each message is encrypted separately for each device.",
        "リンクした端末はそれぞれ自分の identity key を持ち、メッセージは端末ごとに別々に暗号化される。",
      ),
      t(
        "Attachments are encrypted with AES-256-CBC plus an HMAC-SHA256 and uploaded to a blob store.",
        "添付ファイルは AES-256-CBC と HMAC-SHA256 で暗号化して blob store に上げる。",
      ),
      t(
        "The second check mark appears once the message reaches the recipient, and both turn blue once it has been read. In a group, each waits for every member. In a one-to-one chat, either person can turn read receipts off, and then the blue never comes.",
        "相手の端末に届くと 2 つ目のチェックがつき、読まれると 2 つとも青になる。グループではどちらも全員分がそろうまで変わらない。1 対 1 のチャットでは、どちらかが既読通知をオフにすると青にならない。",
      ),
    ],
    sources: [
      WA_WP,
      {
        title: "WhatsApp Help: How to check read receipts",
        url: "https://faq.whatsapp.com/665923838265756",
      },
    ],
  },
  {
    id: "signal",
    name: "Signal",
    transport: t("—", "—"),
    e2ee: t(
      "PQXDH key agreement (announced in 2023 to replace X3DH for new chats) and the Double Ratchet.",
      "鍵合意は PQXDH (2023 年に、新規チャットでは X3DH を置き換えると発表)、その後は Double Ratchet。",
    ),
    e2eeDefault: "yes",
    groups: t("—", "—"),
    notes: [
      t(
        "Since October 2025 a post-quantum ratchet, SPQR, is being rolled out alongside the Double Ratchet (the Triple Ratchet).",
        "2025 年 10 月から、Double Ratchet に耐量子のラチェット SPQR を加えた Triple Ratchet を段階的に展開している。",
      ),
      t(
        "Sealed sender takes the sender's identity off the message envelope. The recipient and IP addresses are still visible to the service.",
        "Sealed sender で、送信者 ID をメッセージの封筒から外す。受信者や IP アドレスはサービスから見える。",
      ),
    ],
    sources: [
      { title: "Signal: PQXDH", url: "https://signal.org/blog/pqxdh/" },
      {
        title: "Signal: The Double Ratchet Algorithm",
        url: "https://signal.org/docs/specifications/doubleratchet/",
      },
      { title: "Signal: SPQR", url: "https://signal.org/blog/spqr/" },
      { title: "Signal: Sealed sender", url: "https://signal.org/blog/sealed-sender/" },
    ],
  },
  {
    id: "imessage",
    name: "iMessage",
    transport: t(
      "Goes through APNs, which deletes it once delivered.",
      "APNs 経由で届き、配送後は APNs から消える。",
    ),
    e2ee: t("PQ3 (from iOS 17.4).", "PQ3 (iOS 17.4 から)。"),
    e2eeDefault: "yes",
    groups: t("—", "—"),
    notes: [
      t(
        "Attachments are encrypted with AES-CTR under a random 256-bit key and uploaded to iCloud.",
        "添付ファイルはランダムな 256bit 鍵の AES-CTR で暗号化して iCloud に上げる。",
      ),
    ],
    sources: [
      {
        title: "Apple Security: iMessage with PQ3",
        url: "https://security.apple.com/blog/imessage-pq3/",
      },
      {
        title: "Apple Platform Security: How iMessage sends and receives messages",
        url: "https://support.apple.com/guide/security/how-imessage-sends-and-receives-messages-sec70e68c949/web",
      },
    ],
  },
  {
    id: "messenger",
    name: "Messenger",
    transport: t("—", "—"),
    e2ee: t(
      "Signal protocol. Rolled out as the default for personal chats starting December 2023.",
      "Signal protocol。2023 年 12 月から、個人間のチャットで既定化を順次展開。",
    ),
    e2eeDefault: "yes",
    groups: t("—", "—"),
    notes: [
      t(
        "Encrypted history is kept server-side in a storage system called Labyrinth so new devices can sync it.",
        "暗号化された履歴は Labyrinth というストレージに置かれ、新しい端末からも同期できる。",
      ),
    ],
    sources: [
      {
        title: "Meta Engineering: Building end-to-end security for Messenger",
        url: "https://engineering.fb.com/2023/12/06/security/building-end-to-end-security-for-messenger/",
      },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    transport: t("MTProto 2.0.", "MTProto 2.0。"),
    e2ee: t(
      "Only in Secret Chats, which you open separately: 1:1 and tied to one device. Regular chats are cloud chats.",
      "E2EE は別途開く Secret Chat だけ。1 対 1 限定で、端末に紐づく。通常のチャットはクラウドチャット。",
    ),
    e2eeDefault: "no",
    groups: t(
      "Group chats are cloud chats: client–server encryption, stored in the Telegram cloud.",
      "グループはクラウドチャット。暗号化は端末–サーバー間のみで、Telegram のクラウドに保存。",
    ),
    notes: [],
    sources: [
      { title: "Telegram: End-to-end encryption", url: "https://core.telegram.org/api/end-to-end" },
      { title: "Telegram FAQ", url: "https://telegram.org/faq" },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    transport: t(
      "Gateway over secure WebSocket. The server's Hello (opcode 10) sets the heartbeat interval; a dropped client resumes and gets missed events replayed.",
      "Gateway は secure WebSocket。サーバーの Hello (opcode 10) がハートビート間隔を指定し、切れた端末は resume で取りこぼしを再送してもらう。",
    ),
    e2ee: t(
      "Text is not end-to-end encrypted. Since March 2026 every voice and video call uses DAVE, built on MLS; Stage channels are the one exception.",
      "テキストは E2EE ではない。音声・ビデオ通話は 2026 年 3 月から、Stage チャンネルを除いてすべて MLS ベースの DAVE で E2EE。",
    ),
    e2eeDefault: "partial",
    groups: t("—", "—"),
    notes: [],
    sources: [
      { title: "Discord: Gateway", url: "https://docs.discord.com/developers/events/gateway" },
      {
        title: "Discord: Meet DAVE",
        url: "https://discord.com/blog/meet-dave-e2ee-for-audio-video",
      },
      {
        title: "Discord: Every voice and video call is now E2EE",
        url: "https://discord.com/blog/every-voice-and-video-call-on-discord-is-now-end-to-end-encrypted",
      },
    ],
  },
];

export const mls = {
  body: t(
    "MLS (RFC 9420, 2023) is the IETF standard for end-to-end encrypted groups: the cost of updating keys grows with log(n) of the group size rather than n. Wire is moving to it from its own Proteus protocol, Webex uses it for zero-trust meetings, Discord's DAVE is built on it, and GSMA's RCS Universal Profile 3.0 specifies MLS-based end-to-end encryption. In May 2026 Apple and Google began a beta of end-to-end encrypted RCS between iPhone and Android.",
    "MLS (RFC 9420、2023 年) はグループ E2EE の IETF 標準で、鍵の更新コストがメンバー数 n ではなく log(n) に比例して増える。Wire は独自の Proteus から MLS への移行を進めていて、Webex はゼロトラスト会議で採用、Discord の DAVE も MLS 上に作られている。GSMA の RCS Universal Profile 3.0 も MLS ベースの E2EE を規定していて、2026 年 5 月には Apple と Google が iPhone と Android の間の E2EE RCS をベータで始めた。",
  ),
  sources: [
    { title: "RFC 9420", url: "https://www.rfc-editor.org/rfc/rfc9420.html" },
    {
      title: "Wire: MLS is coming to Wire",
      url: "https://wire.com/en/blog/mls-is-coming-to-wire-app-learn-more",
    },
    {
      title: "Wire: Migration from Proteus to MLS protocol",
      url: "https://support.wire.com/hc/en-us/articles/18666343787293-Migration-from-Proteus-to-MLS-protocol",
    },
    {
      title: "Webex: End-to-end encryption",
      url: "https://help.webex.com/en-us/article/5h5d8ab/End-to-end-encryption-for-Webex-Meetings-and-Webex-Calling",
    },
    {
      title: "GSMA: RCS encryption",
      url: "https://www.gsma.com/newsroom/article/rcs-encryption-a-leap-towards-secure-and-interoperable-messaging/",
    },
    {
      title: "Apple: End-to-end encrypted RCS messaging begins rolling out in beta",
      url: "https://www.apple.com/newsroom/2026/05/end-to-end-encrypted-rcs-messaging-begins-rolling-out-today-in-beta/",
    },
  ] satisfies Source[],
};
