import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { OUT_OF_SCOPE } from "./scope";
import sitemap from "../src/app/sitemap";

/**
 * 「刷新の対象外」という宣言そのものを検査する。
 *
 * 対象外を決めただけだと、画面が消えても宣言が残り、
 * 逆に対象外の画面が検索に出たり公開動線に混ざったりしても誰も気づかない。
 * 宣言が現実とずれた時点で落ちるようにしておく。
 */

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(path) ? [path] : [];
  });

const files = walk(join(process.cwd(), "src")).map((absolute) =>
  relative(process.cwd(), absolute).split(sep).join("/"),
);

test("対象外として宣言した画面が実在する", () => {
  for (const area of OUT_OF_SCOPE) {
    assert.ok(
      existsSync(join(process.cwd(), area.prefix)),
      `${area.prefix} が無い（画面が消えたなら宣言も消す）`,
    );
    assert.ok(
      files.some((file) => file.startsWith(area.prefix) && file.endsWith("/page.tsx")),
      `${area.prefix} にページが無い（宣言が空振りしている）`,
    );
  }
});

test("対象外の画面はサイトマップに載せない", () => {
  const urls = sitemap().map((entry) => entry.url);
  for (const area of OUT_OF_SCOPE) {
    const leaked = urls.filter((url) => new URL(url).pathname.startsWith(area.route));
    assert.deepEqual(leaked, [], `${area.route} がサイトマップに載っている`);
  }
});

test("認証が要ると宣言した画面は proxy.ts で守られている", () => {
  const proxy = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
  const declared = proxy.match(/const protectedRoutes = \[([^\]]*)\]/);
  assert.ok(declared, "proxy.ts に protectedRoutes が見つからない");
  const routes = [...declared[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);

  for (const area of OUT_OF_SCOPE.filter((entry) => entry.authRequired)) {
    assert.ok(
      routes.includes(area.route),
      `${area.route} は認証が要る宣言だが protectedRoutes に無い`,
    );
  }
});

test("対象外の宣言には理由が書いてある", () => {
  for (const area of OUT_OF_SCOPE) {
    assert.ok(area.reason.length >= 10, `${area.prefix} の理由が短すぎる`);
  }
});

/* ===== docs の索引 ===== */

/**
 * docs/README.md は「次に入る人が最初に読む1枚」なので、載っていない文書が
 * あると、その文書は存在しないのと同じになる。索引が実体とずれたら落とす。
 */
test("docs の索引が実体と一致する", () => {
  const docsDir = join(process.cwd(), "..", "docs");
  const index = readFileSync(join(docsDir, "README.md"), "utf8");

  const listed = new Set(
    [...index.matchAll(/\]\(\.\/([^)]+)\)/g)].map((match) => decodeURIComponent(match[1])),
  );
  const actual = readdirSync(docsDir).filter((name) => name.endsWith(".md") && name !== "README.md");

  const unlisted = actual.filter((name) => !listed.has(name));
  assert.deepEqual(unlisted, [], "索引に載っていない文書がある");

  const dangling = [...listed].filter((name) => !existsSync(join(docsDir, name)));
  assert.deepEqual(dangling, [], "索引が実体の無い文書を指している");
});
