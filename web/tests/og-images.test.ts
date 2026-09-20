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
