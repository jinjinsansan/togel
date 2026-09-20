import { test } from "node:test";
import assert from "node:assert/strict";

import { GET as ogRoute } from "../src/app/api/og/route";
import { GET as groupsRoute } from "../src/app/api/og/groups/route";
import { personalityTypes } from "../src/lib/personality";

/**
 * OG画像の全パターン生成。
 *
 * 文面を生成する変更には全パターンの検算を付ける、という決まりの画像版。
 * 画像は「実機で見たから大丈夫」が成立しない領域で、24タイプ×2形式を人が
 * 目で確認することはない。描画が落ちる・サイズが崩れるのは機械でしか捕まらない。
 *
 * ルートを直接呼ぶ（サーバを立てない）。初回だけ描画エンジンの初期化で数秒かかり、
 * 以降は1枚あたり1秒弱。全49枚で40秒前後を見込む。
 *
 * 外部への取得が起きないことも検査する。satori は絵文字を文字のまま渡すと
 * 描画のたびにCDNから画像を取りに行く。OG画像はXに貼られたリンクの
 * プレビューとして出るので、CDNが落ちればプレビューが静かに出なくなり、
 * 壊れたことに気づく手段が無い。絵文字はリポジトリに置いてある
 * （src/assets/emoji、取得は scripts/fetch-emoji.ts）。
 */

const PNG_SIGNATURE = "89504e470d0a1a0a";

/** PNGのIHDRから実寸を読む */
const readSize = (buffer: Buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
});

const render = async (url: string, route: typeof ogRoute) => {
  const response = await route(new Request(`https://www.to-gel.com${url}`));
  assert.equal(response.status, 200, url);
  assert.equal(response.headers.get("content-type"), "image/png", url);
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.subarray(0, 8).toString("hex"), PNG_SIGNATURE, `${url} がPNGでない`);
  return buffer;
};

test("24タイプの横型カード（1200×630）がすべて生成できる", async () => {
  for (const type of personalityTypes) {
    const buffer = await render(`/api/og?type=${type.id}`, ogRoute);
    assert.deepEqual(readSize(buffer), { width: 1200, height: 630 }, type.id);
    assert.ok(buffer.byteLength > 30_000, `${type.id} が小さすぎる ${buffer.byteLength}B`);
  }
});

test("24タイプの取扱注意ラベル（1080×1920）がすべて生成できる", async () => {
  for (const type of personalityTypes) {
    const buffer = await render(`/api/og?type=${type.id}&format=story`, ogRoute);
    assert.deepEqual(readSize(buffer), { width: 1080, height: 1920 }, type.id);
    assert.ok(buffer.byteLength > 80_000, `${type.id} が小さすぎる ${buffer.byteLength}B`);
  }
});

test("相性表（1080×1350）が生成できる", async () => {
  const buffer = await render("/api/og/groups", groupsRoute);
  assert.deepEqual(readSize(buffer), { width: 1080, height: 1350 });
  assert.ok(buffer.byteLength > 100_000, `小さすぎる ${buffer.byteLength}B`);
});

test("ミスマッチ表示も生成できる（同じテンプレで相手タイプを出す）", async () => {
  const buffer = await render(`/api/og?type=${personalityTypes[0].id}&mode=mismatch`, ogRoute);
  assert.deepEqual(readSize(buffer), { width: 1200, height: 630 });
});

test("実測スコアを渡した取扱注意ラベルも生成できる", async () => {
  const buffer = await render(
    `/api/og?type=${personalityTypes[0].id}&format=story&s=2.10,4.80,1.90,4.20,3.60`,
    ogRoute,
  );
  assert.deepEqual(readSize(buffer), { width: 1080, height: 1920 });
});

test("知らないタイプIDは404（画像を作らない）", async () => {
  const response = await ogRoute(new Request("https://www.to-gel.com/api/og?type=unknown-type"));
  assert.equal(response.status, 404);
});

/* ===== 外部への依存が戻っていないこと ===== */

test("絵文字の素材が24タイプ＋4群ぶん揃っている", async () => {
  const { personalityTypes: types, TYPE_GROUP_ORDER } = await import("../src/lib/personality");
  const { groupEmoji } = await import("../src/components/brand/group-badge");
  const { emojiDataUri } = await import("../src/lib/og/emoji");

  const needed = new Set<string>();
  for (const type of types) needed.add(type.emoji);
  for (const group of TYPE_GROUP_ORDER) needed.add(groupEmoji(group));

  for (const emoji of needed) {
    const uri = await emojiDataUri(emoji);
    assert.ok(uri.startsWith("data:image/svg+xml;base64,"), emoji);
  }
});

test("OG画像の生成が外部へ取りに行かない", async () => {
  // satori は自前の http クライアントを使うので globalThis.fetch を塞いでも捕まらない。
  // 外へ出るなら必ず通る socket の接続を塞いで、試みた先を記録する。
  const net = await import("node:net");
  const attempts: string[] = [];

  const original = net.Socket.prototype.connect;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (net.Socket.prototype as any).connect = function blocked(...args: unknown[]) {
    const target = args[0];
    attempts.push(typeof target === "object" ? JSON.stringify(target) : String(target));
    throw new Error("外部接続は禁止");
  };

  try {
    // 検査そのものが空振りしていないことを先に確かめる。
    // 塞ぎ方が効いていなければ、以降の「0件」は何も意味しない
    await assert.rejects(fetch("https://cdn.jsdelivr.net/"));
    assert.ok(attempts.length > 0, "接続を塞げていない（この検査は空振りしている）");
    attempts.length = 0;

    // 絵文字を使う2種（ラベル・相性表）。横型カードは絵文字を持たない
    await render(`/api/og?type=${personalityTypes[0].id}&format=story`, ogRoute);
    await render("/api/og/groups", groupsRoute);
  } finally {
    net.Socket.prototype.connect = original;
  }

  assert.deepEqual(attempts, [], "OG生成が外部へ取りに行っている");
});

test("絵文字の素材を置いている限り、帰属表示を2か所に出す", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");

  const assetDir = join(process.cwd(), "src/assets/emoji");
  if (!existsSync(assetDir)) return; // 素材を使うのをやめたなら帰属も要らない

  // 素材は CC-BY 4.0。OG画像はサイトの外（Xのタイムライン等）で表示されるので、
  // リポジトリ内の NOTICE だけでは見た人が辿り着けない。表にも出す。
  const notice = readFileSync(join(assetDir, "NOTICE.md"), "utf8");
  assert.ok(notice.includes("CC-BY 4.0"), "NOTICE.md にライセンスの記載が無い");
  assert.ok(notice.includes("Twemoji"), "NOTICE.md に出典の記載が無い");

  const about = readFileSync(join(process.cwd(), "src/app/about/page.tsx"), "utf8");
  assert.ok(about.includes("Twemoji"), "/about に出典が出ていない");
  assert.ok(
    about.includes("creativecommons.org/licenses/by/4.0"),
    "/about にライセンスへのリンクが無い",
  );
});
