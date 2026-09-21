import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { FOOTER_EXCLUDED_PATHS, showsFooter } from "../src/components/layout/footer-paths";

/**
 * お問い合わせと特商法・プライバシー・利用規約へのリンクはフッターにある。
 * ヘッダーからお問い合わせを外したあと、フッターがトップ（/）にしか出ていなかったため、
 * **画面上のお問い合わせ導線が0件のページ**が本番に出ていた。
 *
 * ここでは、画面のある全ページ（src/app の page.tsx）を機械で拾い、
 * 除外リストに無いページには必ずフッターが出ることを縛る。ページが増えても自動で対象になる。
 */

const APP = join(process.cwd(), "src/app");
const FOOTER = readFileSync(join(process.cwd(), "src/components/layout/site-footer.tsx"), "utf8");

/** page.tsx のあるディレクトリを URL にする（[typeId] などは見本の値に） */
const pageRoutes = (dir = APP, prefix = ""): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry.startsWith("(")) return pageRoutes(path, prefix); // ルートグループは URL に出ない
      const segment = entry.startsWith("[") ? "sample" : entry;
      return pageRoutes(path, `${prefix}/${segment}`);
    }
    return entry === "page.tsx" ? [prefix || "/"] : [];
  });

test("フッターにお問い合わせと、特商法・プライバシー・利用規約のリンクがある", () => {
  assert.ok(FOOTER.includes("https://lin.ee/T7OYAGQ") && FOOTER.includes("お問い合わせ"), "お問い合わせ");
  for (const href of ["/tokushoho", "/privacy", "/terms"]) assert.ok(FOOTER.includes(`"${href}"`), href);
});

test("除外リストに無いページには、すべてフッターが出る（お問い合わせ導線が0件のページが無い）", () => {
  const routes = pageRoutes();
  assert.ok(routes.length >= 30, `ページの拾い方が壊れている（${routes.length}件）`);
  const excluded = routes.filter((route) => !showsFooter(route));
  // 除外されたのは、除外リストに意図して載せたページだけ
  for (const route of excluded) {
    assert.ok(
      FOOTER_EXCLUDED_PATHS.some((p) => route === p || route.startsWith(`${p}/`)),
      `${route} が理由なくフッター無しになっている`,
    );
  }
  // 本文のページは出る
  for (const route of ["/", "/types", "/types/distribution", "/about", "/compatibility", "/coaching", "/coaching/sample", "/mypage", "/profile/edit", "/result", "/result/mismatch", "/michelle", "/michelle/attraction", "/points", "/tokushoho"]) {
    assert.ok(routes.includes(route) || route === "/", `${route} というページが無い（見本の書き間違い？）`);
    assert.ok(showsFooter(route), `${route} にフッターが出ない`);
  }
});

test("除外したページにはフッターが出ない（前方一致は / の区切りでだけ）", () => {
  for (const route of ["/diagnosis/select", "/diagnosis/sample", "/liff/diagnosis/result", "/admin/points", "/login", "/michelle/chat", "/michelle/attraction/chat", "/dev/preview/story"]) {
    assert.equal(showsFooter(route), false, route);
  }
  assert.equal(showsFooter("/loginx"), true);
  assert.equal(showsFooter("/michelle"), true, "講座の入口（購入が起きる側）には出す");
});
