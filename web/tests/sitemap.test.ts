import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sitemap from "../src/app/sitemap";
import { personalityTypes } from "../src/lib/personality";

/**
 * サイトマップ。24本の着地ページが漏れないことを固定する。
 * タイプを足したり ID を変えたりしたときに、sitemap の更新忘れで落ちる。
 */

const entries = sitemap();
const urls = entries.map((entry) => entry.url);

test("24タイプの攻略ページがすべて入っている", () => {
  const missing = personalityTypes
    .map((type) => `https://www.to-gel.com/coaching/${type.id}`)
    .filter((url) => !urls.includes(url));
  assert.deepEqual(missing, []);
});

test("URLが重複しない", () => {
  assert.equal(new Set(urls).size, urls.length);
});

test("すべて本番ドメインの絶対URL", () => {
  for (const url of urls) {
    assert.ok(url.startsWith("https://www.to-gel.com/"), url);
    assert.doesNotThrow(() => new URL(url));
  }
});

test("認証が要る画面やAPIを載せていない", () => {
  const forbidden = ["/mypage", "/result", "/diagnosis/full", "/diagnosis/light", "/profile", "/michelle", "/admin", "/api/", "/liff"];
  for (const url of urls) {
    for (const path of forbidden) {
      assert.ok(!url.includes(path), `${url} は載せない`);
    }
  }
});

test("robots.txt が sitemap を指している", () => {
  const robots = readFileSync(join(process.cwd(), "public", "robots.txt"), "utf8");
  const active = robots
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith("sitemap:"));
  assert.deepEqual(active, ["Sitemap: https://www.to-gel.com/sitemap.xml"]);
});
