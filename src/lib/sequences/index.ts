import type { L10n } from "../../i18n/ui";
import type { Actor, Sequence } from "./types";

const t = (en: string, ja: string): L10n => ({ en, ja });

const A: Actor = {
  id: "a",
  name: t("A's phone", "A の端末"),
  sub: t("sender", "送信側"),
  kind: "device",
};
const B: Actor = {
  id: "b",
  name: t("B's phone", "B の端末"),
  sub: t("recipient", "受信側"),
  kind: "device",
};
const GW: Actor = {
  id: "gw",
  name: t("Gateway", "ゲートウェイ"),
  sub: t("holds connections", "接続を終端"),
  kind: "edge",
};
const MSG: Actor = {
  id: "msg",
  name: t("Messaging", "メッセージサーバー"),
  sub: t("order + delivery", "順序・配送"),
  kind: "service",
};
const DB: Actor = {
  id: "db",
  name: t("Storage", "ストレージ"),
  sub: t("chat log", "チャットログ"),
  kind: "store",
};
const PUSH: Actor = {
  id: "push",
  name: t("APNs / FCM", "APNs / FCM"),
  sub: t("OS push service", "OS のプッシュ通知"),
  kind: "external",
};

export const overview: Sequence = {
  id: "overview",
  actors: [A, GW, MSG, DB, B],
  steps: [
    {
      from: "a",
      to: "gw",
      kind: "request",
      label: "SEND",
      title: t("The phone picks an ID before sending", "端末が ID を振ってから投げる"),
      body: t(
        'The moment you tap send, the app generates a clientMsgId, writes the message to its local database as "sending", and only then puts it on the wire. It goes over the connection the app opened at launch. No new TCP connection is made here.',
        "送信ボタンを押した瞬間、端末は clientMsgId を自分で作り、ローカル DB に「送信中」で書いてから送る。乗せる先はアプリ起動時から張りっぱなしの接続で、ここで新しく TCP を張ることはない。",
      ),
      payload: `{
  "op": "SEND",
  "chatId": "c_8f2a",
  "clientMsgId": "a-7d1c9e",
  "type": "text",
  "body": "<ciphertext, 128 bytes>"
}`,
    },
    {
      from: "gw",
      to: "msg",
      kind: "request",
      label: "SEND + userId",
      title: t("The gateway doesn't look inside", "ゲートウェイは中身を見ない"),
      body: t(
        "A gateway exists to hold open connections, lots of them, and it doesn't interpret what goes through. It stamps the frame with the user ID from the authenticated session and forwards it over an internal RPC.",
        "ゲートウェイの仕事は大量の接続を抱えておくこと。メッセージの中身は解釈せず、認証済みセッションのユーザー ID を付けて内部 RPC で後ろに渡す。",
      ),
      payload: `rpc Send {
  userId: 31337
  deviceId: "ios-2"
  frame: <SEND ...>
}`,
    },
    {
      from: "msg",
      to: "db",
      kind: "request",
      label: "APPEND seq=1042",
      title: t("Number it per chat, then append", "チャットごとに番号を振って追記"),
      body: t(
        "The server assigns a sequence number that only ever goes up within this chat, and appends the message. That seq decides the order everyone sees. Phone clocks drift, so they never decide order.",
        "サーバーはチャット単位で単調増加する seq を割り当てて保存する。並び順はこの seq で決まる。端末の時計はずれるので、順序の根拠には使わない。",
      ),
      payload: `chat_id  | seq  | client_msg_id | sender | body
c_8f2a   | 1042 | a-7d1c9e      | 31337  | ...`,
    },
    {
      from: "db",
      to: "msg",
      kind: "response",
      label: "OK",
      title: t("Only after it's durable", "永続化してから ACK"),
      body: t(
        "If the server acknowledged before the write was durable, a crash would lose a message the sender believes was sent. The ACK waits for the write.",
        "書き込みが確定する前に送信者へ ACK を返すと、サーバーが落ちたときに「送れたはずのメッセージ」が消える。ACK は永続化のあと。",
      ),
    },
    {
      from: "msg",
      to: "a",
      kind: "response",
      label: "ACK seq=1042",
      title: t('Now it\'s "sent"', "送信済みになる"),
      body: t(
        'From here on the diagram skips the gateway hop. A\'s phone finds its local row by clientMsgId and fills in the seq and server time. The bubble goes from "sending" to "sent".',
        "ここから先はゲートウェイの中継を図から省く。A の端末は clientMsgId で手元の行を見つけ、seq とサーバー時刻を書き込む。表示は「送信中」から「送信済み」に変わる。",
      ),
      payload: `{
  "op": "ACK",
  "clientMsgId": "a-7d1c9e",
  "seq": 1042,
  "serverTime": 1795442112384
}`,
    },
    {
      from: "msg",
      to: "b",
      kind: "push",
      label: "EVENT seq=1042",
      title: t("Find B's connection and push", "受信者の接続を探して押し込む"),
      body: t(
        "Which gateway B is connected to comes from a session table (userId → gateway). If B is signed in on a phone and a laptop, both get it.",
        "B がどのゲートウェイにつながっているかはセッション表 (userId → ゲートウェイ) で引く。B がスマホと PC の両方でログインしていれば、両方に配る。",
      ),
      payload: `{
  "op": "EVENT",
  "chatId": "c_8f2a",
  "seq": 1042,
  "from": 31337,
  "body": "<ciphertext>"
}`,
    },
    {
      from: "b",
      to: "b",
      kind: "self",
      label: t("store, render", "保存して表示"),
      title: t("The recipient writes to disk first, too", "受信側も先にローカル DB"),
      body: t(
        "B saves the message locally before showing it, and moves its cursor (the latest seq it holds) to 1042. The next time it reconnects, that cursor tells the server where to resume.",
        "画面に出す前にローカル DB に保存する。手元の最新 seq (カーソル) も 1042 に進める。次に接続し直したとき、どこから取り直せばいいかはこのカーソルで決まる。",
      ),
    },
    {
      from: "b",
      to: "msg",
      kind: "request",
      label: "DELIVERED upTo=1042",
      title: t('"Got everything up to here"', "「ここまで届いた」と返す"),
      body: t(
        "It's a position, not one ACK per message. If 50 messages arrive at once, one ACK covers them all.",
        "1 通ずつではなく「ここまで受け取った」という形で返す。まとめて 50 通届いても ACK は 1 回で済む。",
      ),
    },
    {
      from: "msg",
      to: "a",
      kind: "push",
      label: "DELIVERED",
      title: t("Delivered", "配信済み"),
      body: t(
        "This is WhatsApp's second grey tick. LINE doesn't show this state at all, only \"Read\".",
        "WhatsApp の灰色のチェック 2 つはこの段階。LINE はこの状態を画面に出さず、既読だけを見せる。",
      ),
    },
    {
      from: "b",
      to: "msg",
      kind: "request",
      label: "READ upTo=1042",
      title: t("B opens the chat", "チャットを開いたら既読"),
      body: t(
        "Sent when the chat is actually on screen. It's also a position, so ten unread messages still cost one frame.",
        "画面にチャットが表示された時点で送る。これも seq の位置で送るので、未読が何通あっても 1 フレーム。",
      ),
      payload: `{ "op": "READ", "chatId": "c_8f2a", "upTo": 1042 }`,
    },
    {
      from: "msg",
      to: "db",
      kind: "request",
      label: "read_pos[B]=1042",
      title: t("The read position lives on the server", "既読位置もサーバーに残す"),
      body: t(
        "It's stored per user, not per device, so B's other devices clear their unread badge too.",
        "B の別の端末も同じ位置まで既読にするため、既読位置はユーザー単位でサーバーに持つ。",
      ),
    },
    {
      from: "msg",
      to: "a",
      kind: "push",
      label: "READ_RECEIPT",
      title: t("Read", "既読がつく"),
      body: t(
        "Every message A sent at or below 1042 is now marked read. Groups count this differently; that's in a later chapter.",
        "A の画面で、1042 以下の自分のメッセージに既読がつく。グループでの数え方は後の章で扱う。",
      ),
    },
  ],
};

export const connection: Sequence = {
  id: "connection",
  actors: [
    B,
    { id: "dns", name: t("DNS", "DNS"), kind: "external" },
    {
      id: "gw",
      name: t("Gateway", "ゲートウェイ"),
      sub: t("behind an L4 LB", "L4 LB の先"),
      kind: "edge",
    },
    { id: "auth", name: t("Auth", "認証"), sub: t("token check", "トークン検証"), kind: "service" },
  ],
  steps: [
    {
      from: "b",
      to: "dns",
      kind: "request",
      label: "gw.example.com ?",
      title: t("Look up the gateway", "接続先を引く"),
      body: t(
        "On launch, or after switching networks, the app resolves the gateway's name. The answer usually differs by region so the phone lands on a nearby site.",
        "アプリ起動時やネットワーク切り替え時に、ゲートウェイの名前を解決する。地域ごとに別のアドレスを返して近い拠点に寄せることが多い。",
      ),
    },
    {
      from: "dns",
      to: "b",
      kind: "response",
      label: "203.0.113.17",
      title: t("An address comes back", "アドレスが返る"),
      body: t(
        "With a short TTL, this is also where traffic gets moved off a site that's going down.",
        "TTL が短めに設定されていれば、拠点の切り替えもここで効く。",
      ),
    },
    {
      from: "b",
      to: "gw",
      kind: "request",
      label: "SYN",
      title: t("TCP three-way handshake", "TCP 3-way handshake"),
      body: t(
        "On a mobile network one round trip can take 50–100 ms. The round trips from here to the end of TLS are what you feel between opening the app and seeing new messages.",
        "モバイル回線だと往復 1 回で 50〜100ms かかることもある。ここから TLS 完了までの往復回数が、アプリを開いてからメッセージが流れ始めるまでの時間になる。",
      ),
    },
    {
      from: "gw",
      to: "b",
      kind: "response",
      label: "SYN-ACK",
      title: t("TCP three-way handshake", "TCP 3-way handshake"),
      body: t(
        "The server sets aside buffers for the connection.",
        "サーバー側も接続用のバッファを確保する。",
      ),
    },
    {
      from: "b",
      to: "gw",
      kind: "request",
      label: "ACK + ClientHello",
      title: t("Start TLS 1.3", "TLS 1.3 を始める"),
      body: t(
        "The ClientHello already carries a key share, so TLS 1.3 finishes in a single round trip.",
        "ClientHello に鍵共有用の公開値 (key_share) を最初から入れておくので、TLS 1.3 は 1 往復で終わる。",
      ),
      payload: `ClientHello
  supported_versions: TLS 1.3
  key_share: x25519 <32 bytes>
  alpn: h2`,
    },
    {
      from: "gw",
      to: "b",
      kind: "response",
      label: "ServerHello … Finished",
      title: t("An encrypted channel exists", "暗号化された通信路ができる"),
      body: t(
        "Both sides derive the same keys from the key shares. Everything after ServerHello, including the certificate, is already encrypted; the phone checks the certificate before trusting the channel.",
        "key_share から両側で同じ鍵を導く。ServerHello より後は証明書も含めて暗号化されていて、端末は証明書を検証してから通信路を信用する。",
      ),
    },
    {
      from: "b",
      to: "gw",
      kind: "request",
      label: "HELLO token=…",
      title: t("Say who you are", "誰なのかを名乗る"),
      body: t(
        "The app sends the access token it got at login. Whether this rides on HTTP/2 streams, WebSocket or MQTT depends on the app; what matters is one long-lived connection that carries frames both ways.",
        "ログイン時にもらったアクセストークンを送る。HTTP/2 のストリームに乗せるか、WebSocket か MQTT かはアプリによって違う。大事なのは、双方向にフレームを流せる 1 本の接続があること。",
      ),
      payload: `{
  "op": "HELLO",
  "token": "eyJhbGciOi…",
  "device": "ios-2",
  "cursor": { "c_8f2a": 1038 }
}`,
    },
    {
      from: "gw",
      to: "auth",
      kind: "request",
      label: "verify(token)",
      title: t("Check the token", "トークン検証"),
      body: t(
        "Signature and expiry, and sometimes a revocation list.",
        "署名と有効期限を確認する。失効リストを引くこともある。",
      ),
    },
    {
      from: "auth",
      to: "gw",
      kind: "response",
      label: "userId=31337",
      title: t("Now we know who it is", "ユーザーが確定"),
      body: t(
        "Every frame on this connection is treated as coming from user 31337 from now on.",
        "以降、このコネクションから来るフレームはすべて userId=31337 のものとして扱う。",
      ),
    },
    {
      from: "gw",
      to: "gw",
      kind: "self",
      label: t("register session", "セッション表に登録"),
      title: t("An address book for delivery", "配送のための住所録"),
      body: t(
        "The gateway writes userId → (gateway, connection) to a shared store. Delivery looks here to decide which gateway to hand a message to.",
        "userId → (ゲートウェイ ID, 接続 ID) を共有ストアに書く。メッセージを配るときはこの表を見て、どのゲートウェイに投げればいいかを決める。",
      ),
      payload: "SET session:31337:ios-2 = gw-17/conn-88412  EX 300",
    },
    {
      from: "gw",
      to: "b",
      kind: "response",
      label: "READY",
      title: t("Ready", "使える状態"),
      body: t(
        "From here it's just frames in both directions.",
        "あとは双方向にフレームを流すだけ。",
      ),
    },
    {
      from: "b",
      to: "gw",
      kind: "request",
      label: "PING",
      title: t("Go quiet and you get forgotten", "黙っていると忘れられる"),
      body: t(
        "Carrier NATs and middleboxes silently drop TCP connections that carry nothing for a while. So the app sends a tiny frame every few tens of seconds to few minutes. Shorter keeps the line alive; longer saves battery.",
        "キャリアの NAT や途中の機器は、しばらく何も流れない TCP 接続を黙って捨てる。そこで数十秒〜数分おきに小さなフレームを流して、接続を生かしておく。短くすれば切れにくく、長くすれば電池が持つ。",
      ),
    },
    {
      from: "gw",
      to: "b",
      kind: "response",
      label: "PONG",
      title: t("Still alive", "生きてる"),
      body: t(
        "The session entry's TTL gets extended here too.",
        "セッション表の TTL もここで延長する。",
      ),
    },
    {
      from: "b",
      to: "gw",
      kind: "lost",
      label: "PING",
      title: t("Wi-Fi just switched to LTE", "Wi-Fi から LTE に切り替わった"),
      body: t(
        "A new IP address makes the old TCP connection useless. The OS may report that the network changed, but nothing reports the dead socket itself; the missing PONG is what proves it.",
        "IP アドレスが変わると古い TCP 接続は使えなくなる。ネットワークが変わったことは OS が教えてくれても、ソケットが死んだことまでは教えてくれない。PONG が返ってこないことで確かめる。",
      ),
    },
    {
      from: "b",
      to: "b",
      kind: "self",
      label: t("wait, reconnect", "待ってから再接続"),
      title: t("Don't all come back at once", "全員が同時に戻ってこないように"),
      body: t(
        "Wait 1 s, 2 s, 4 s… and add random jitter. Otherwise, when a gateway restarts, millions of phones reconnect in the same instant.",
        "1 秒、2 秒、4 秒…と間隔を伸ばし、さらにランダムなずれ (ジッタ) を足す。ゲートウェイが再起動したとき、数百万台が同じ瞬間に再接続してくるのを防ぐため。",
      ),
      payload: "delay = min(cap, base * 2^attempt) * random(0.5, 1.0)",
    },
  ],
};

export const retry: Sequence = {
  id: "retry",
  actors: [A, MSG, DB],
  steps: [
    {
      from: "a",
      to: "msg",
      kind: "request",
      label: "SEND id=a-7d1c9e",
      title: t("A normal send", "普通に送る"),
      body: t("Same as the first chapter so far.", "ここまでは最初の章と同じ。"),
    },
    {
      from: "msg",
      to: "db",
      kind: "request",
      label: "INSERT seq=1042",
      title: t("The write succeeds", "保存は成功している"),
      body: t(
        "As far as the server is concerned, the work is done.",
        "サーバー側では処理は完了している。",
      ),
    },
    {
      from: "msg",
      to: "a",
      kind: "lost",
      label: "ACK seq=1042",
      title: t("Only the ACK goes missing", "ACK だけが消える"),
      body: t(
        'An elevator, a tunnel. The message is stored; only the reply is lost. From A\'s side there\'s no way to tell "never arrived" from "reply lost".',
        "エレベーターに乗った、トンネルに入った。返事が届かないだけで、メッセージ自体は保存済み。A の端末からはこれが「届かなかった」のか「返事だけ消えた」のか区別できない。",
      ),
    },
    {
      from: "a",
      to: "a",
      kind: "self",
      label: t("timeout", "タイムアウト"),
      title: t("When in doubt, send again", "わからないので、もう一度送る"),
      body: t(
        "As long as it's in the outbox, the app resends after reconnecting. If it picked a new ID now, B would get the message twice.",
        "送信待ちキューに残っている限り、つながり直したら再送する。ここで新しい ID を振ると、相手には同じメッセージが 2 通届く。",
      ),
    },
    {
      from: "a",
      to: "msg",
      kind: "request",
      label: "SEND id=a-7d1c9e",
      title: t("Resend with the same clientMsgId", "同じ clientMsgId で送り直す"),
      body: t(
        "A retry reuses the original ID. That's what makes the send idempotent: doing it twice has the effect of doing it once.",
        "再送でも ID は最初に振ったものを使う。これで送信が冪等になる (何回送っても 1 回送ったのと同じ結果になる)。",
      ),
    },
    {
      from: "msg",
      to: "db",
      kind: "request",
      label: "SELECT by clientMsgId",
      title: t("Seen this before?", "前に見たことがあるか"),
      body: t(
        "A unique constraint on (chatId, sender, clientMsgId), or a dedup cache in front of it. The sender has to be part of the key: clientMsgId is picked by phones, and two phones can pick the same one.",
        "(chatId, 送信者, clientMsgId) に一意制約をかけておくか、重複検知用のキャッシュを引く。clientMsgId は端末が勝手に振るので、送信者を含めないと別人の ID とぶつかる。",
      ),
      payload: `SELECT seq FROM messages
 WHERE chat_id = 'c_8f2a'
   AND sender = 31337
   AND client_msg_id = 'a-7d1c9e';`,
    },
    {
      from: "db",
      to: "msg",
      kind: "response",
      label: "seq=1042",
      title: t("Yes", "あった"),
      body: t("It's already stored as 1042.", "すでに 1042 番として保存されている。"),
    },
    {
      from: "msg",
      to: "a",
      kind: "response",
      label: "ACK seq=1042",
      title: t("Same answer as the first time", "最初と同じ答えを返す"),
      body: t(
        "No second write, no second delivery, just the same ACK. To A it looks like the reply finally arrived. B has exactly one copy.",
        "保存も配送もやり直さず、前回と同じ ACK を返す。A から見れば「やっと返事が来た」だけで、B には 1 通しか届いていない。",
      ),
    },
  ],
};

export const offline: Sequence = {
  id: "offline",
  actors: [A, MSG, PUSH, B],
  steps: [
    {
      from: "a",
      to: "msg",
      kind: "request",
      label: "SEND",
      title: t("B has closed the app", "B はアプリを閉じている"),
      body: t(
        "Neither iOS nor Android lets a backgrounded app keep its own connection open for long. There is no line between B's phone and the server.",
        "iOS も Android も、バックグラウンドのアプリが接続を張り続けることをほぼ許さない。B の端末とサーバーの間に接続はない。",
      ),
    },
    {
      from: "msg",
      to: "msg",
      kind: "self",
      label: t("B not in sessions", "セッション表に B なし"),
      title: t("Can't deliver directly", "直接は届けられない"),
      body: t(
        "The message is stored, so nothing is lost. B just needs to come and fetch it. The problem is getting B to come.",
        "メッセージは保存済みなので失われはしない。B が次に来たときに取りに来てもらえばいい。問題は「来てもらう」きっかけ。",
      ),
    },
    {
      from: "msg",
      to: "push",
      kind: "request",
      label: t("push request", "通知依頼"),
      title: t("Ask the OS push service", "OS のプッシュ通知サービスに頼む"),
      body: t(
        "The app can't wake the phone itself, so it asks Apple (APNs) or Google (FCM). The OS keeps one shared connection for every app and the push arrives over that. Payloads are capped at 4 KB. An end-to-end encrypted app has no plaintext on the server, so the message text isn't in here.",
        "アプリは自前で端末を起こせないので、Apple (APNs) や Google (FCM) に頼む。OS は 1 本の接続を全アプリで共有していて、それ経由で届く。ペイロードは 4KB まで。E2EE のアプリは本文をサーバーが持っていないので、ここに本文は載らない。",
      ),
      payload: `POST /3/device/<device-token>
apns-push-type: alert
{
  "aps": {
    "alert": { "title": "New message" },
    "mutable-content": 1
  },
  "chatId": "c_8f2a",
  "seq": 1042
}`,
    },
    {
      from: "push",
      to: "b",
      kind: "push",
      label: t("notification", "通知"),
      title: t("The OS receives it", "OS が受け取る"),
      body: t("The app itself still isn't running.", "この時点でアプリ本体はまだ動いていない。"),
    },
    {
      from: "b",
      to: "b",
      kind: "self",
      label: t("extension runs", "拡張が起動"),
      title: t("Rewrite the notification", "通知を書き換える"),
      body: t(
        'With mutable-content set, iOS briefly runs the app\'s Notification Service Extension before showing anything. It can fetch and decrypt the message and replace "New message" with the real text.',
        "mutable-content が立っていると、iOS は通知を出す前にアプリの Notification Service Extension を短時間だけ動かす。ここで本文を取ってきて復号し、「新着メッセージ」をメッセージ本文に差し替えて表示できる。",
      ),
    },
    {
      from: "b",
      to: "msg",
      kind: "request",
      label: "SYNC since=1038",
      title: t("Resume from the cursor", "前回の続きから取り直す"),
      body: t(
        'The app reconnects (previous chapter) and sends its cursor. The server only has to return what comes after 1038. That\'s much harder to get wrong than "send me my unread messages".',
        "接続を張り直し (前の章の流れ)、手元のカーソルを渡す。サーバーは 1038 より後ろを返すだけでいい。「未読をすべて送る」より取りこぼしが起きにくい。",
      ),
      payload: `{ "op": "SYNC", "cursor": { "c_8f2a": 1038 } }`,
    },
    {
      from: "msg",
      to: "b",
      kind: "response",
      label: "1039 … 1042",
      title: t("The gap arrives in one batch", "差分がまとめて届く"),
      body: t(
        "It's not just messages. Read receipts, unsends and membership changes sit in the same log. Apply them in order and the phone ends up in the same state as the server.",
        "メッセージだけでなく、既読・取り消し・メンバー変更などのイベントも同じ列に並んでいる。端末はこれを先頭から順に適用すれば、サーバーと同じ状態になる。",
      ),
    },
    {
      from: "b",
      to: "msg",
      kind: "request",
      label: "DELIVERED upTo=1042",
      title: t("Got it up to here", "ここまで受け取った"),
      body: t("The cursor moves to 1042.", "カーソルを 1042 に進める。"),
    },
    {
      from: "msg",
      to: "a",
      kind: "push",
      label: "DELIVERED",
      title: t("A finds out too", "A にも伝わる"),
      body: t(
        "Right away if A is online, otherwise on A's next sync.",
        "A がオンラインならその場で。オフラインなら A の次の SYNC で拾われる。",
      ),
    },
  ],
};

const KEY: Actor = {
  id: "key",
  name: t("Key server", "鍵サーバー"),
  sub: t("public keys", "公開鍵の置き場"),
  kind: "service",
};

export const e2ee: Sequence = {
  id: "e2ee",
  actors: [A, KEY, MSG, B],
  steps: [
    {
      from: "b",
      to: "b",
      kind: "self",
      label: t("generate key pair", "鍵ペア生成"),
      title: t("The private key never leaves the phone", "秘密鍵は端末から出ない"),
      body: t(
        "At install time the app generates an elliptic-curve key pair (Curve25519, say). The private key goes into the phone's secure storage and is never uploaded.",
        "インストール時に楕円曲線 (Curve25519 など) の鍵ペアを作る。秘密鍵は端末の安全な領域にしまい、サーバーには送らない。",
      ),
    },
    {
      from: "b",
      to: "key",
      kind: "request",
      label: t("upload public key", "公開鍵を登録"),
      title: t("Only the public half is shared", "公開鍵だけを置いておく"),
      body: t(
        "A public key is safe to show anyone. It's parked on the server for whoever wants to write to B.",
        "公開鍵は見られても困らない。誰かが B に送りたくなったときのために、サーバーに預けておく。",
      ),
      payload: `{ "userId": 42, "keyId": 7, "pub": "Kq3…x25519 32 bytes" }`,
    },
    {
      from: "a",
      to: "key",
      kind: "request",
      label: t("B's public key?", "B の公開鍵は?"),
      title: t("The first message", "初めて送るとき"),
      body: t(
        "A fetches B's public key once and caches it.",
        "A は B の公開鍵を取りに行く。一度取ったら端末に保存しておく。",
      ),
    },
    {
      from: "key",
      to: "a",
      kind: "response",
      label: "pub_B, keyId=7",
      title: t("The key arrives", "公開鍵が届く"),
      body: t(
        "A server that swapped in its own key here would be a man in the middle. That's why apps let you compare key fingerprints in person, and warn when a contact's key changes.",
        "サーバーがここで別の鍵にすり替えれば中間者になれる。だから「鍵の指紋を対面で照合する」機能や、鍵が変わったときの警告がある。",
      ),
    },
    {
      from: "a",
      to: "a",
      kind: "self",
      label: t("ECDH → shared key", "ECDH → 共通鍵"),
      title: t("Same key, never sent", "鍵を送らずに同じ鍵を作る"),
      body: t(
        "A combines its private key with B's public key (ECDH). B, combining its own private key with A's public key, gets exactly the same value. Run that through a key derivation function and you have a message key.",
        "自分の秘密鍵と相手の公開鍵を組み合わせる (ECDH) と、B が自分の秘密鍵と A の公開鍵で計算した値と一致する。この値を鍵導出関数に通してメッセージ用の鍵を作る。",
      ),
      payload: `shared = X25519(priv_A, pub_B)
key    = KDF(shared, salt, "message")`,
    },
    {
      from: "a",
      to: "a",
      kind: "self",
      label: t("AES-GCM encrypt", "AES-GCM で暗号化"),
      title: t("Encrypt, with tamper detection", "改ざん検知つきで暗号化"),
      body: t(
        "AES-GCM produces an authentication tag along with the ciphertext. Flip one bit in transit and decryption fails.",
        "AES-GCM は暗号化と同時に認証タグを作る。途中で 1bit でも書き換えられれば、復号の時点で失敗する。",
      ),
      payload: `nonce = random(12)
ct, tag = AES-256-GCM(key, nonce, plaintext, aad=header)`,
    },
    {
      from: "a",
      to: "msg",
      kind: "request",
      label: "SEND ct",
      title: t("A sealed envelope", "サーバーには読めない封筒"),
      body: t(
        "The server sees metadata: who, to whom, when, how big. It can't read the body.",
        "サーバーに見えるのは、誰から誰へ・いつ・どのくらいのサイズかというメタデータだけ。本文は読めない。",
      ),
      payload: `{
  "op": "SEND",
  "chatId": "c_8f2a",
  "keyIds": { "from": 3, "to": 7 },
  "nonce": "3tq…",
  "body": "9f1c…e0 (ciphertext + tag)"
}`,
    },
    {
      from: "msg",
      to: "b",
      kind: "push",
      label: "EVENT ct",
      title: t("Carried as is", "そのまま運ぶ"),
      body: t(
        "The server delivers it without understanding it.",
        "サーバーは中身を解釈せずに配る。",
      ),
    },
    {
      from: "b",
      to: "b",
      kind: "self",
      label: t("ECDH → decrypt", "ECDH → 復号"),
      title: t("B derives the same key", "同じ鍵ができる"),
      body: t(
        "B computes X25519(priv_B, pub_A), which equals what A computed, and decrypts with the same key. If the tag doesn't verify, nothing is shown.",
        "B は X25519(priv_B, pub_A) を計算する。値は A が作ったものと一致するので、同じ鍵で復号できる。タグの検証に失敗したら表示しない。",
      ),
    },
    {
      from: "b",
      to: "b",
      kind: "self",
      label: t("ratchet forward", "鍵を進める"),
      title: t("Protect the past", "過去を守る"),
      body: t(
        "Reuse one key forever and a single leak exposes every old message. Signal's Double Ratchet derives a new key per message and throws the old one away, so a leaked key can't read the past (forward secrecy).",
        "同じ鍵を使い続けると、いつか端末から鍵が漏れたときに過去のメッセージも全部読まれる。Signal Protocol の Double Ratchet は 1 通ごとに鍵を更新して古い鍵を捨てるので、漏れても過去は読めない (前方秘匿性)。",
      ),
    },
  ],
};

const C: Actor = {
  id: "c",
  name: t("C's phone", "C の端末"),
  sub: t("online", "オンライン"),
  kind: "device",
};

export const group: Sequence = {
  id: "group",
  actors: [A, MSG, DB, B, C, PUSH],
  steps: [
    {
      from: "a",
      to: "msg",
      kind: "request",
      label: "SEND chat=g_room",
      title: t("Send to a group", "グループに送る"),
      body: t(
        "A sends one message. The server decides who gets it.",
        "A が送るのは 1 通だけ。誰に配るかはサーバーが決める。",
      ),
    },
    {
      from: "msg",
      to: "db",
      kind: "request",
      label: "APPEND seq=88",
      title: t("Stored once", "保存は 1 回"),
      body: t(
        "Write once to the group's log and let everyone read it (fan-out on read). The alternative copies it into each member's inbox (fan-out on write): faster reads, but a 500-member group turns one message into 500 writes.",
        "グループのログに 1 回だけ書き、全員がそれを読む (fan-out on read)。メンバーごとの受信箱に 1 通ずつコピーする方式 (fan-out on write) もあり、こちらは読むのが速いが、500 人のグループだと 1 通で 500 回書くことになる。",
      ),
    },
    {
      from: "msg",
      to: "a",
      kind: "response",
      label: "ACK seq=88",
      title: t("Sent", "送信済み"),
      body: t("It doesn't wait for delivery to members.", "メンバーへの配送を待たずに返す。"),
    },
    {
      from: "msg",
      to: "db",
      kind: "request",
      label: "members(g_room)",
      title: t("Who gets it", "誰に配るか"),
      body: t(
        "Look up the members and their sessions. This usually goes onto a queue and a separate worker does the delivery.",
        "メンバー一覧を引き、それぞれのセッションを探す。ここは非同期のキューに積んで別のワーカーが配ることが多い。",
      ),
    },
    {
      from: "msg",
      to: "b",
      kind: "push",
      label: "EVENT seq=88",
      title: t("Online members get it now", "オンラインの人にはすぐ"),
      body: t("Pushed down B's connection.", "B の接続に押し込む。"),
    },
    {
      from: "msg",
      to: "c",
      kind: "push",
      label: "EVENT seq=88",
      title: t("Online members get it now", "オンラインの人にはすぐ"),
      body: t("And C's.", "C にも。"),
    },
    {
      from: "msg",
      to: "push",
      kind: "request",
      label: t("push → D", "通知依頼 → D"),
      title: t("Offline members get a notification", "オフラインの人には通知"),
      body: t(
        "D isn't connected, so it's the OS push route from the earlier chapter. This is also where the server decides whether to batch notifications or skip a muted chat.",
        "D の端末はつながっていないので、前の章と同じく OS のプッシュ通知で起こす。通知を何通ぶんまとめるか、ミュート中なら送らないか、もここで判断する。",
      ),
    },
    {
      from: "b",
      to: "msg",
      kind: "request",
      label: "READ upTo=88",
      title: t("Counting readers", "既読の人数を数える"),
      body: t(
        'Keep each member\'s read position and "read by N" for seq 88 is just the number of members with upTo ≥ 88.',
        "各メンバーの既読位置 (upTo) を持っておけば、seq=88 を既読にした人数は「upTo ≥ 88 の人数」で出せる。",
      ),
    },
    {
      from: "msg",
      to: "a",
      kind: "push",
      label: t("read by 1", "既読 1"),
      title: t("The count goes up", "既読の数が増えていく"),
      body: t(
        'A sees "Read by 1", and the number climbs as others open the chat. With E2EE there\'s a second problem: you don\'t want to encrypt the body once per member. WhatsApp gives each sender a "Sender Key", hands it to every member over their 1:1 encrypted sessions, and encrypts the body once. LINE uses a shared group key and regenerates it when membership changes.',
        "A の画面に「既読 1」が出て、開いた人が増えるたびに数字が上がる。E2EE ではもう 1 つ問題があって、本文をメンバーの人数ぶん暗号化し直すのは避けたい。WhatsApp は送信者ごとの「Sender Key」を 1 対 1 の暗号路で全員に配っておき、本文は 1 回だけ暗号化する。LINE はグループ共有鍵を作って配り、メンバーが出入りするたびに作り直す。",
      ),
    },
  ],
};

const MEDIA: Actor = {
  id: "media",
  name: t("Media API", "メディア API"),
  sub: t("upload intake", "アップロード受付"),
  kind: "service",
};
const BLOB: Actor = {
  id: "blob",
  name: t("Object store", "オブジェクトストレージ"),
  sub: t("+ CDN", "+ CDN"),
  kind: "store",
};

export const media: Sequence = {
  id: "media",
  actors: [A, MEDIA, BLOB, MSG, B],
  steps: [
    {
      from: "a",
      to: "a",
      kind: "self",
      label: t("resize, encrypt", "縮小・暗号化"),
      title: t("Processed on the phone first", "送る前に端末で加工"),
      body: t(
        "The app downsizes the image, makes a thumbnail, and encrypts it with a random key used for this file only.",
        "画像を縮小してサムネイルを作り、ランダムな鍵で暗号化する。この鍵はファイルごとに使い捨て。",
      ),
      payload: `fileKey = random(32)
blob    = AES-256-GCM(fileKey, image)
digest  = SHA-256(blob)`,
    },
    {
      from: "a",
      to: "media",
      kind: "request",
      label: t("want to upload", "アップロードしたい"),
      title: t("Ask for a place to put it", "置き場所をもらう"),
      body: t(
        "Tell the server the size and type, get an upload target back.",
        "サイズや種類を伝えて、アップロード先を発行してもらう。",
      ),
    },
    {
      from: "media",
      to: "a",
      kind: "response",
      label: t("signed URL", "署名付き URL"),
      title: t("Upload straight to storage", "ストレージに直接上げさせる"),
      body: t(
        "Pushing several megabytes through the messaging servers would stall everyone's chats. Instead the app gets a short-lived signed URL and PUTs directly to storage.",
        "数 MB のファイルをメッセージサーバーに通すと、チャットの配送が詰まる。期限付きの署名 URL を渡して、ストレージに直接 PUT させる。",
      ),
      payload: `PUT https://blob.example.com/o/3f9a…
  ?X-Expires=600&X-Signature=…`,
    },
    {
      from: "a",
      to: "blob",
      kind: "request",
      label: "PUT blob",
      title: t("Stored still encrypted", "暗号化済みのまま置く"),
      body: t(
        "Storage can't even tell it's an image.",
        "ストレージ側は中身が画像だということすらわからない。",
      ),
    },
    {
      from: "blob",
      to: "a",
      kind: "response",
      label: "200 OK",
      title: t("Uploaded", "置けた"),
      body: t("Only now can the message itself go out.", "ここで初めてメッセージを送れる。"),
    },
    {
      from: "a",
      to: "msg",
      kind: "request",
      label: "SEND type=image",
      title: t("The message is a claim ticket", "メッセージは「引換券」"),
      body: t(
        "It carries where the file is and how to open it, not the file. fileKey is inside the end-to-end encrypted body.",
        "画像そのものではなく、どこにあるか・どう開けるかを送る。fileKey はメッセージ本文と一緒に E2EE で暗号化されている。",
      ),
      payload: `{
  "type": "image",
  "objectId": "3f9a…",
  "fileKey": "<inside E2EE body>",
  "sha256": "b1e4…",
  "thumb": "<tiny JPEG>",
  "w": 1179, "h": 2556
}`,
    },
    {
      from: "msg",
      to: "b",
      kind: "push",
      label: "EVENT",
      title: t("Thumbnail first", "まずサムネイル"),
      body: t(
        "B sees a blurry thumbnail straight away. The full file is fetched on tap, or automatically on Wi-Fi.",
        "B の画面にはまずぼやけたサムネイルが出る。本体はタップしたとき、または Wi-Fi なら自動で取りに行く。",
      ),
    },
    {
      from: "b",
      to: "blob",
      kind: "request",
      label: "GET objectId",
      title: t("Fetched from a nearby CDN", "近くの CDN から取る"),
      body: t(
        "A hundred group members opening the same photo puts no load on the messaging servers.",
        "同じ画像をグループの 100 人が開いても、メッセージサーバーには負荷がかからない。",
      ),
    },
    {
      from: "blob",
      to: "b",
      kind: "response",
      label: "blob",
      title: t("Encrypted bytes", "暗号化されたバイト列"),
      body: t(
        "Even cached on the CDN, it's unreadable without the key.",
        "CDN のキャッシュに残っていても、鍵がなければ読めない。",
      ),
    },
    {
      from: "b",
      to: "b",
      kind: "self",
      label: t("verify → decrypt", "検証 → 復号"),
      title: t("Check the hash before opening", "ハッシュを照合してから開く"),
      body: t(
        "B checks the SHA-256 against the value in the message, then decrypts with fileKey. A mismatch means the file was swapped somewhere along the way.",
        "SHA-256 がメッセージに書かれた値と一致するか確かめ、fileKey で復号して表示する。一致しなければ途中ですり替えられている。",
      ),
    },
  ],
};

export const sequences = { overview, connection, retry, offline, e2ee, group, media };
export type SequenceId = keyof typeof sequences;
