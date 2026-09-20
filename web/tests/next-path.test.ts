import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEFAULT_AFTER_LOGIN,
  loginUrlFor,
  NEXT_PARAM,
  readNextCookie,
  safeNextPath,
} from "../src/lib/auth/next-path";

/**
 * ログイン後の行き先。
 *
 * 行き先はURLで運ぶので、外部サイトへの踏み台（オープンリダイレクト）に
 * なりうる。「サイト内の相対パスだけを通す」を検査で固定する。
 */

test("サイト内のパスはそのまま通る", () => {
  assert.equal(safeNextPath("/mypage"), "/mypage");
  assert.equal(safeNextPath("/result/mismatch"), "/result/mismatch");
  assert.equal(safeNextPath("/profile/edit?tab=photo"), "/profile/edit?tab=photo");
  assert.equal(safeNextPath("/coaching#board"), "/coaching#board");
});

test("外部への行き先は既定に落とす", () => {
  const hostile = [
    "https://evil.example/steal",
    "//evil.example/steal", // プロトコル相対
    "/\\evil.example", // バックスラッシュはパーサが / と解釈する
    "/\\/evil.example",
    "http:/evil.example",
    "javascript:alert(1)",
    "mypage", // 先頭が / でない
    "",
  ];
  for (const value of hostile) {
    assert.equal(safeNextPath(value), DEFAULT_AFTER_LOGIN, value);
  }
  assert.equal(safeNextPath(null), DEFAULT_AFTER_LOGIN);
  assert.equal(safeNextPath(undefined), DEFAULT_AFTER_LOGIN);
});

test("改行や制御文字を含む行き先は通さない", () => {
  assert.equal(safeNextPath("/mypage\nSet-Cookie: x=1"), DEFAULT_AFTER_LOGIN);
  assert.equal(safeNextPath("/mypage\u0000"), DEFAULT_AFTER_LOGIN);
});

test("ログイン画面自身は行き先にしない（輪になる）", () => {
  assert.equal(safeNextPath("/login"), DEFAULT_AFTER_LOGIN);
  assert.equal(safeNextPath("/login?next=%2Fmypage"), DEFAULT_AFTER_LOGIN);
});

test("ログイン画面のURLに行き先が積まれる", () => {
  const url = loginUrlFor("/mypage?tab=points", "https://www.to-gel.com/mypage");
  assert.equal(url.pathname, "/login");
  assert.equal(url.searchParams.get(NEXT_PARAM), "/mypage?tab=points");
});

test("クッキーは復号済み・未復号のどちらでも読める", () => {
  // 書く側は encodeURIComponent する。読む側が復号済みで渡してくる場合もある
  assert.equal(readNextCookie("%2Fmypage%3Ftab%3Dpoints"), "/mypage?tab=points");
  assert.equal(readNextCookie("/mypage?tab=points"), "/mypage?tab=points");
  assert.equal(readNextCookie("%E3%81%82"), DEFAULT_AFTER_LOGIN); // 先頭が / でない
  assert.equal(readNextCookie("%"), DEFAULT_AFTER_LOGIN); // 復号に失敗する値
  assert.equal(readNextCookie(undefined), DEFAULT_AFTER_LOGIN);
});

test("クッキー越しでも外部への行き先は通さない", () => {
  assert.equal(readNextCookie(encodeURIComponent("//evil.example")), DEFAULT_AFTER_LOGIN);
  assert.equal(readNextCookie(encodeURIComponent("https://evil.example")), DEFAULT_AFTER_LOGIN);
});

/* ===== 経路の途中で落とさない ===== */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("proxy は行き先を積んでから /login に飛ばす", () => {
  const proxy = read("src/proxy.ts");
  assert.ok(proxy.includes("loginUrlFor("), "proxy が行き先を積んでいない");
  assert.ok(
    !/new URL\("\/login"/.test(proxy),
    "行き先を積まない /login へのリダイレクトが残っている",
  );
});

test("OAuth の往復ごしに行き先を運ぶ", () => {
  const button = read("src/components/auth/login-button.tsx");
  assert.ok(button.includes(NEXT_PARAM), "ログイン画面が行き先を読んでいない");
  assert.ok(button.includes("NEXT_COOKIE"), "出発前に行き先を預けていない");
  assert.ok(
    button.includes("samesite=lax"),
    "SameSite が緩くないと Google からの戻りでクッキーが届かない",
  );
  const callback = read("src/app/auth/callback/route.ts");
  assert.ok(callback.includes("readNextCookie("), "callback が行き先を読んでいない");
  assert.ok(
    !callback.includes('new URL("/diagnosis/select"'),
    "callback が行き先を無視して固定の場所へ飛ばしている",
  );
});
