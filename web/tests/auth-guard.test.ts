import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * API ルートの本人確認。
 *
 * `auth.getSession()` は cookie の JSON をそのまま返すだけで、JWT の署名を検証しない。
 * 本人確認に使うと、cookie を書き換えるだけで誰にでもなりすませる。
 * 実際に、管理者のお知らせ一斉送信・他人のポイント残高・他人の診断履歴が
 * 偽造 cookie で読み書きできる状態だった（2026-11-07 に修正）。
 * 本人確認は getUser()（getVerifiedSession / requireAdminUser / getRouteUser）で行う。
 */

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(path) ? [path] : [];
  });

const rel = (absolute: string) => relative(process.cwd(), absolute).split(sep).join("/");

test("API ルートは getSession() で本人確認しない", () => {
  const offenders = walk(join(process.cwd(), "src/app/api"))
    .filter((file) => readFileSync(file, "utf8").includes("auth.getSession("))
    .map(rel);
  assert.deepEqual(offenders, []);
});

test("管理者の判定は確認済みのメールアドレスに限る", () => {
  const check = readFileSync(join(process.cwd(), "src/lib/admin/check-admin.ts"), "utf8");
  assert.ok(check.includes("getUser()"), "管理者判定が JWT を検証していない");
  assert.ok(check.includes("email_confirmed_at"), "確認前のアドレスで管理者を名乗れる");
  const proxy = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
  const adminBlock = proxy.slice(proxy.indexOf('startsWith("/admin")) {'));
  assert.ok(adminBlock.includes("getUser()"), "管理画面の判定が cookie を検証していない");
});
