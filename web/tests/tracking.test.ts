import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * letter-spacing がトークンの役割から外れていないことを検査する。
 *
 * トークンが定義している役割は4つ（display / heading / label / marquee）。
 * 実装には一時期17種類の値があり、同じ役割に18の値が付いていた。
 * 役割が1つなら値も1つ、を機械で保つ。
 *
 * 除外（LEGACY）は「刷新前意匠」の画面。letter-spacing だけ寄せても
 * uppercase・font-semibold・slate系という別の視覚言語が残るので、半端に寄せない。
 * これらを刷新するかどうかは別の課題として残っている。
 */

const TOKENS = {
  display: "-0.03em",
  heading: "-0.02em",
  label: "0.22em",
  marquee: "0.32em",
} as const;

const ALLOWED = new Set<string>(Object.values(TOKENS));

/** ブランドトークンの適用範囲外（刷新前意匠）。ここは触らない */
const LEGACY = [
  "src/app/admin/",
  "src/app/points/",
  "src/app/michelle/",
  "src/app/privacy/",
  "src/app/terms/",
  "src/app/tokushoho/",
];

/** 役割がラベルではない個別の例外。増やすときは理由を書く */
const EXCEPTIONS: { file: string; value: string; reason: string }[] = [
  {
    file: "src/app/page.tsx",
    value: "0.04em",
    reason: "トップのCTAボタン。小見出しラベルではなく本文サイズのボタン文字",
  },
];

const SRC = join(process.cwd(), "src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(path) ? [path] : [];
  });

const collect = () => {
  const found: { file: string; value: string; line: number }[] = [];
  for (const absolute of walk(SRC)) {
    const file = relative(process.cwd(), absolute).split(sep).join("/");
    readFileSync(absolute, "utf8")
      .split("\n")
      .forEach((text, index) => {
        for (const pattern of [/tracking-\[([^\]]+)\]/g, /letterSpacing:\s*"([^"]+)"/g]) {
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(text))) {
            found.push({ file, value: match[1], line: index + 1 });
          }
        }
      });
  }
  return found;
};

test("ブランド面の letter-spacing はトークンの4値だけを使う", () => {
  const offenders = collect()
    .filter((hit) => !LEGACY.some((prefix) => hit.file.startsWith(prefix)))
    .filter((hit) => !ALLOWED.has(hit.value))
    .filter(
      (hit) =>
        !EXCEPTIONS.some(
          (exception) => exception.file === hit.file && exception.value === hit.value,
        ),
    )
    .map((hit) => `${hit.file}:${hit.line} ${hit.value}`);

  assert.deepEqual(offenders, []);
});

test("除外した刷新前の画面は、実在するファイルだけを指している", () => {
  const files = collect().map((hit) => hit.file);
  for (const prefix of LEGACY) {
    assert.ok(
      files.some((file) => file.startsWith(prefix)),
      `${prefix} に letter-spacing の使用箇所が無い（除外が古くなっている可能性）`,
    );
  }
});

test("例外として書いた箇所が実在する", () => {
  const hits = collect();
  for (const exception of EXCEPTIONS) {
    assert.ok(
      hits.some((hit) => hit.file === exception.file && hit.value === exception.value),
      `例外 ${exception.file} ${exception.value} が実在しない（消えたなら例外も消す）`,
    );
  }
});
