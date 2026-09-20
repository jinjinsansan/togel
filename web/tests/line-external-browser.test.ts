import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import {
  externalBrowserUrl,
  isLineInAppBrowser,
  withExternalBrowserParam,
} from "../src/lib/line/external-browser";

/**
 * LINEのアプリ内ブラウザから外に出る処理。
 *
 * ここが一度壊れたとき、主要な導線が6か月止まった。全ページに出る案内
 * モーダルがLIFF（LINE内でしか動かない）まで塞いでいて、しかもクライアント
 * 側のUA判定なのでサーバのHTMLを見る道具には映らなかった。
 * 判定を純粋な関数に切り出して、機械で読めるようにしてある。
 */

const LINE_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1 Line/14.9.0",
  "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 Line/14.8.1/IAB",
];

const OTHER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  // 「Lineage」のように Line を含むが別物の語で誤爆しない
  "Mozilla/5.0 (Linux; Android 13; LineageOS) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
];

test("LINEのアプリ内ブラウザを見分ける", () => {
  for (const ua of LINE_AGENTS) assert.equal(isLineInAppBrowser(ua), true, ua);
  for (const ua of OTHER_AGENTS) assert.equal(isLineInAppBrowser(ua), false, ua);
  assert.equal(isLineInAppBrowser(undefined), false);
  assert.equal(isLineInAppBrowser(""), false);
});

test("LINE内なら openExternalBrowser を付けたURLを返す", () => {
  const target = externalBrowserUrl("https://www.to-gel.com/login", LINE_AGENTS[0]);
  assert.equal(target, "https://www.to-gel.com/login?openExternalBrowser=1");
});

test("元のクエリを落とさない", () => {
  const target = externalBrowserUrl("https://www.to-gel.com/login?next=%2Fmypage", LINE_AGENTS[0]);
  assert.ok(target);
  assert.equal(new URL(target).searchParams.get("next"), "/mypage");
});

test("LINE以外では開き直さない", () => {
  for (const ua of OTHER_AGENTS) {
    assert.equal(externalBrowserUrl("https://www.to-gel.com/login", ua), null, ua);
  }
});

test("既に付いているURLでは開き直さない（LINEが尊重しなかった場合の無限ループ防止）", () => {
  const url = "https://www.to-gel.com/login?openExternalBrowser=1";
  assert.equal(externalBrowserUrl(url, LINE_AGENTS[0]), null);
});

test("トークに貼るリンクには、UAに関係なくパラメータを足す", () => {
  // 招待リンクは作る側ではなく踏む側のブラウザが問題なので、UAで判定しない
  const url = withExternalBrowserParam(new URL("https://www.to-gel.com/?c=abc"));
  assert.equal(url.searchParams.get("openExternalBrowser"), "1");
  assert.equal(url.searchParams.get("c"), "abc");
});

/* ===== 仕組みを2つ並存させない ===== */

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(path) ? [path] : [];
  });

const sources = walk(join(process.cwd(), "src")).map((absolute) => ({
  file: relative(process.cwd(), absolute).split(sep).join("/"),
  text: readFileSync(absolute, "utf8"),
}));

test("LINEのUA判定は1か所にしかない", () => {
  const offenders = sources
    .filter(({ text }) => /Line\\\//i.test(text) || /userAgent[\s\S]{0,80}line/i.test(text))
    .map(({ file }) => file)
    .filter((file) => file !== "src/lib/line/external-browser.ts");

  assert.deepEqual(offenders, [], "UA判定が増えている。判定は external-browser.ts に寄せる");
});

test("パラメータ名を書いているのは1か所だけ", () => {
  const offenders = sources
    .filter(({ text }) => text.includes("openExternalBrowser"))
    .map(({ file }) => file)
    .filter((file) => file !== "src/lib/line/external-browser.ts");

  assert.deepEqual(offenders, [], "外部ブラウザへ渡す処理は external-browser.ts を通す");
});

test("全画面で行き止まりになる案内を置かない", () => {
  const offenders = sources
    .filter(({ text }) => text.includes("外部ブラウザで開いてください"))
    .map(({ file }) => file);

  assert.deepEqual(offenders, [], "案内モーダルが戻っている。LIFFを含む全導線を塞ぐ");
});

test("外部ブラウザへ渡すのはログイン画面だけ", () => {
  const users = sources
    .filter(({ text }) => text.includes("OpenInExternalBrowser"))
    .map(({ file }) => file)
    .sort();

  assert.deepEqual(users, [
    "src/app/login/page.tsx",
    "src/components/auth/open-in-external-browser.tsx",
  ]);
});
