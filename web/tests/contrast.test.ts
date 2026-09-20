import { test } from "node:test";
import assert from "node:assert/strict";

import config from "../tailwind.config";

/**
 * 色トークンのコントラスト比（WCAG 2.1）。
 *
 * 「計算して直した」を「計算したまま保たれる」に変える。
 * 今回は人が手で計算して textSubtle と primaryInk を直したが、
 * 次に誰かが値を触ったときは、計算しなくても壊れた時点で落ちる。
 *
 * 本文（24px未満）は 4.5:1、大きな文字とUI部品は 3:1 が基準。
 * ここで見るのは「役割としてその組み合わせが成立するか」であって、
 * 実際にその組み合わせが使われているかではない。
 */

type Colors = Record<string, string | Record<string, string>>;
const colors = (config.theme?.extend?.colors ?? {}) as Colors;

const pick = (path: string): string => {
  const [group, key] = path.split(".");
  const value = colors[group];
  const hex = typeof value === "string" ? value : value?.[key ?? "DEFAULT"];
  assert.ok(typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex), `${path} が16進色でない`);
  return hex;
};

/** sRGB の相対輝度 */
const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

const DARK_BACKGROUNDS = ["ink", "base", "panel", "surface.DEFAULT", "surface.alt", "navy"];
const LIGHT_BACKGROUNDS = ["paper", "txt.DEFAULT"]; // txt.DEFAULT = #ffffff（白カード）

const expectBody = (fg: string, bg: string) => {
  const ratio = contrast(pick(fg), pick(bg));
  assert.ok(
    ratio >= 4.5,
    `${fg} on ${bg} = ${ratio.toFixed(2)}:1（本文は4.5:1以上が必要）`,
  );
};

test("ダーク面の本文色が、すべてのダーク背景で4.5:1以上", () => {
  for (const fg of ["txt.DEFAULT", "txt.muted", "txt.subtle"]) {
    for (const bg of DARK_BACKGROUNDS) {
      expectBody(fg, bg);
    }
  }
});

test("ライト面の本文色が、paper と白カードで4.5:1以上", () => {
  for (const fg of ["lighttext.DEFAULT", "lighttext.muted", "lighttext.subtle", "relief.ink", "primary.ink"]) {
    for (const bg of LIGHT_BACKGROUNDS) {
      expectBody(fg, bg);
    }
  }
});

test("ハザード黄はダーク面専用（ライト面の本文では使えない）", () => {
  // ダーク面では十分
  for (const bg of DARK_BACKGROUNDS) {
    assert.ok(contrast(pick("hazard"), pick(bg)) >= 4.5, `hazard on ${bg}`);
  }
  // ライト面では届かない。この事実を固定し、ライト面のテキストに使わない根拠にする
  for (const bg of LIGHT_BACKGROUNDS) {
    assert.ok(
      contrast(pick("hazard"), pick(bg)) < 4.5,
      `hazard on ${bg} が4.5:1を超えた。制約の前提が変わったので見直すこと`,
    );
  }
});

test("色の階層が保たれている（muted のほうが subtle より明るい）", () => {
  const onPanel = (fg: string) => contrast(pick(fg), pick("panel"));
  assert.ok(onPanel("txt.muted") > onPanel("txt.subtle"), "ダーク面の階層が反転している");
  const onPaper = (fg: string) => contrast(pick(fg), pick("paper"));
  assert.ok(onPaper("lighttext.muted") > onPaper("lighttext.subtle"), "ライト面の階層が反転している");
});

test("ブランド色をボタン背景にしたとき、白文字が3:1以上（UI部品の基準）", () => {
  for (const bg of ["primary.DEFAULT", "primary.light", "primary.ink", "relief.ink", "navy"]) {
    const ratio = contrast(pick("txt.DEFAULT"), pick(bg));
    assert.ok(ratio >= 3, `白文字 on ${bg} = ${ratio.toFixed(2)}:1`);
  }
});
