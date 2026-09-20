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
