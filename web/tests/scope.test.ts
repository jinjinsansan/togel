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

/* ===== 手順として読まれる文書の整合 ===== */

/**
 * 手順書は、オーナーが**不可逆な操作をしながら**読む文書。
 * 「8件」と書いてあって実際は9件あれば、読む人は1つ飛ばす。
 * 一度これを出しているので（項目の重複と件数の不一致）、コードと同じ重さで検査する。
 *
 * 対象は手順として読まれる2本だけ。全文書には広げない
 * （説明の文章に出る数字まで縛ると、書けることが減る）。
 */
const OPERATIONAL_DOCS = [
  "RUNBOOK_2026-09-20_LINEログイン移行.md",
  "BLOCKED_2026-09-20_オーナー判断待ち.md",
];

/** 見出しごとに、その下の番号付き箇条書きを拾う */
const numberedRuns = (text: string): { heading: string; numbers: number[] }[] => {
  const runs: { heading: string; numbers: number[] }[] = [];
  let current = { heading: "(冒頭)", numbers: [] as number[] };
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^#{2,4} (.+)$/);
    if (heading) {
      if (current.numbers.length > 0) runs.push(current);
      current = { heading: heading[1], numbers: [] };
      continue;
    }
    const item = line.match(/^ {0,3}(\d+)\. /);
    if (item) current.numbers.push(Number(item[1]));
  }
  if (current.numbers.length > 0) runs.push(current);
  return runs;
};

test("手順として読まれる文書に、番号の重複が無い", () => {
  const offenders: string[] = [];
  for (const name of OPERATIONAL_DOCS) {
    const text = readFileSync(join(process.cwd(), "..", "docs", name), "utf8");
    for (const { heading, numbers } of numberedRuns(text)) {
      const duplicated = numbers.filter((n, index) => numbers.indexOf(n) !== index);
      for (const n of new Set(duplicated)) offenders.push(`${name} / ${heading}: ${n}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("「N件」と書いた数が、実際の項目数と合っている", () => {
  const offenders: string[] = [];
  for (const name of OPERATIONAL_DOCS) {
    const text = readFileSync(join(process.cwd(), "..", "docs", name), "utf8");
    // 「〜（3件）」のように見出しが件数を宣言している節だけを見る
    for (const line of text.split(/\r?\n/)) {
      const declared = line.match(/^#{2,4} .*（(\d+)件）/);
      if (!declared) continue;
      const after = text.slice(text.indexOf(line) + line.length);
      const section = after.split(/\r?\n#{2,4} /)[0];
      const count = (section.match(/^ {0,3}\d+\. /gm) ?? []).length;
      if (count !== Number(declared[1])) {
        offenders.push(`${name} / ${line.trim()}: 実際は${count}件`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

/* ===== 開発専用のプレビュー ===== */

/**
 * 攻略盤は利用者ごとの保存状態でしか描画されないため、開発用の静的プレビューを
 * 置いている（`/dev/preview/board`）。本番に出てはいけない。
 * 環境変数を明示的に立てたときだけ出し、それ以外は404にする。
 */
test("開発用プレビューは、環境変数を立てないと404になる", () => {
  // パスを名指しにすると、次に増えたプレビューが検査されないまま公開される。
  // src/app/dev 配下のページを**全部**見る
  const pages = walk(join(process.cwd(), "src/app/dev")).filter((file) =>
    file.endsWith(`${sep}page.tsx`),
  );
  assert.ok(pages.length > 0, "開発用ページが1つも見つからない（置き場が変わった？）");

  for (const absolute of pages) {
    const where = relative(process.cwd(), absolute).split(sep).join("/");
    const page = readFileSync(absolute, "utf8");
    assert.ok(
      /process\.env\.TOGEL_DEV_PREVIEW !== "1"[\s\S]{0,40}notFound\(\)/.test(page),
      `${where}: 環境変数が立っていないときに notFound() を呼んでいない`,
    );
    // ビルド時に畳み込まれると、環境変数を付けても404のままになる（実際そうなった）
    assert.ok(
      page.includes('export const dynamic = "force-dynamic"'),
      `${where}: 実行時に判定していない`,
    );
  }
});

/**
 * ページ側の `notFound()` だけでは**404にならない**。
 *
 * `force-dynamic` のページでストリーミングが始まったあとに呼ばれるため、
 * 本文は404ページでも**ステータスは200**で返る。本番で実際にそうなっていた。
 * 中身は出ていなかったので「漏れてはいない」が、200は有効なページとして
 * 登録され得る。**本文だけ見る確認では気づけない。**
 *
 * レンダリング前に判定できる proxy で本物の404を返す。ページ側の
 * `notFound()` は二重の保険として残してある。
 */
test("開発用プレビューは、proxy の段階で404になる", () => {
  const proxy = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");

  assert.ok(
    /pathname\.startsWith\("\/dev"\)[\s\S]{0,120}status: 404/.test(proxy),
    "proxy.ts に /dev を404にする分岐が無い",
  );

  // Supabase を呼ぶ前に返していること（呼んだあとだと無駄な認証確認が走る）
  const devIndex = proxy.indexOf('startsWith("/dev")');
  const supabaseIndex = proxy.indexOf("createSupabaseMiddlewareClient(req");
  assert.ok(devIndex > 0 && devIndex < supabaseIndex, "/dev の判定が認証処理より後にある");
});

test("robots.txt が開発用プレビューを除外している", () => {
  const robots = readFileSync(join(process.cwd(), "public/robots.txt"), "utf8");
  assert.ok(/^Disallow: \/dev$/m.test(robots), "robots.txt に /dev の除外が無い");
});

test("開発用プレビューは、どこからもリンクされずサイトマップにも載らない", async () => {
  const sitemap = (await import("../src/app/sitemap")).default;
  const leaked = sitemap()
    .map((entry) => new URL(entry.url).pathname)
    .filter((path) => path.startsWith("/dev"));
  assert.deepEqual(leaked, [], "サイトマップに開発用のパスが載っている");

  // 見るのは「遷移する経路」だけ。年齢ゲートの除外リストや説明のコメントに
  // パスが出てくるのは正常なので、href / push / redirect に絞る
  const linked = walk(join(process.cwd(), "src"))
    .map((absolute) => relative(process.cwd(), absolute).split(sep).join("/"))
    .filter((file) => !file.startsWith("src/app/dev/"))
    .filter((file) =>
      /(href|push|replace|redirect)\s*[=(]\s*[{("'`]*\/dev\//.test(
        readFileSync(join(process.cwd(), file), "utf8"),
      ),
    );
  assert.deepEqual(linked, [], "開発用のパスへ遷移する経路がある");
});
