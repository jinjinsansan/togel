import { test } from "node:test";
import assert from "node:assert/strict";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import config from "../tailwind.config";

const walkSource = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walkSource(path) : /\.tsx?$/.test(path) ? [path] : [];
  });

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

test("注意色はダーク面専用（ライト面の本文では使えない）", () => {
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

/* ===== 色と背景画像で名前がぶつかっていないこと ===== */

/**
 * `colors` と `backgroundImage` に同じ名前があると、Tailwind は同じクラス名で
 * **2本のルール**を出力する。`background-image` が後に来て `background-color` を
 * 覆うので、単色のつもりのクラスが柄になる。
 *
 * 実際 `hazard` がこれで、`bg-hazard` を単色の黄として書いた41箇所が縞になり、
 * 載せていた `text-ink` が暗帯（#0B0F1A）の上で 1.04:1 まで落ちていた。
 * 2026-08-07 から約6週間、公開状態で続いていた。
 *
 * 🔴 **上の色のコントラスト検査は、これを「異常なし」で通した。**
 * あちらはトークンの色同士しか突き合わせておらず、背景画像の層を見ていない。
 * 道具が嘘をついたのではなく、測っていない層について何も言わなかっただけ。
 */
test("色と背景画像で、同じクラス名を作らない", () => {
  const images = Object.keys(config.theme?.extend?.backgroundImage ?? {});

  // 入れ子の色は bg-<親>-<子> になるので、その形まで展開して突き合わせる
  const colorClassNames = Object.entries(colors).flatMap(([name, value]) =>
    typeof value === "string"
      ? [name]
      : Object.keys(value).map((sub) => (sub === "DEFAULT" ? name : `${name}-${sub}`)),
  );

  const collisions = images.filter((image) => colorClassNames.includes(image));
  assert.deepEqual(
    collisions,
    [],
    "この名前は bg-<名前> が色と画像の2本になり、画像が色を覆う",
  );
});

/* ===== ヘッダーの切替点 ===== */

/**
 * ヘッダーは「インラインのナビ」と「ハンバーガー」を同じ切替点で入れ替える。
 * 関係する箇所は **4つ**（ナビ・認証エリア・ハンバーガーのボタン・
 * 開いたときのオーバーレイ）。1つでもずれると、次のどちらかになる。
 *
 * - ボタンだけ残る → **押しても何も出ない**（オーバーレイが display:none）
 * - ナビとボタンが同時に出る → 二重表示
 *
 * 実際に危なかった。2026-09-21 に切替点を md（768px）から xl（1280px）へ
 * 上げたとき、指示は3箇所だったが、オーバーレイにも同じ切替点があった。
 * 3箇所だけ直していたら、768〜1279px は「ボタンはあるが開かない」状態だった
 * （ブラウザで確認済み: xl:hidden → block / md:hidden → none）。
 *
 * 元の症状は、768px で「ミ/ス/マ/ッ/チ」が縦積みになりヘッダーからはみ出すこと。
 * 8項目が1行に収まるのは実測でヘッダー内側 741px、与えられる幅は 822px。
 * **下げるなら、下げた幅で撮ってから下げること。**
 */
test("ヘッダーの切替点が4箇所でそろっている", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("src/components/layout/site-header.tsx", "utf8");

  // 表示を切り替えている指定だけを拾う（他の用途の md:／xl: は見ない）
  const toggles = [...source.matchAll(/\b(sm|md|lg|xl|2xl):(flex|hidden)\b/g)].map(
    (match) => match[1],
  );

  assert.ok(toggles.length >= 4, `切替の指定が ${toggles.length} 個しかない（4つあるはず）`);
  assert.deepEqual(
    [...new Set(toggles)],
    ["xl"],
    "ヘッダーの表示切替が複数の幅に分かれている（ボタンは出るのに開かない状態になる）",
  );
});

/* ===== 黄黒を戻さない ===== */

/**
 * 黄（#FFE03D）と、それを黒と組んだ斜めの縞は、**オーナー判断で廃止**した
 * （2026-09-21「１も２も　とにかく黄黒を辞める」）。
 *
 * 廃止したのは2種類ある。
 *   (1) ボタンなどの面（`bg-hazard`）— 単色の黄。文字が読みにくいと指摘された
 *   (2) 各ページの10pxの帯（旧 `bg-hazard-sm` / `bg-hazard-lg`）— 黄黒の斜め縞
 * 帯そのものは意匠として残し、色だけ単色のブランド色に替えてある。
 *
 * トークンを1つ替えれば全部変わる作りなので、**直書きで戻ってくる**のが一番怖い。
 * 共有画像（OG）は Tailwind を通らず色を直書きするので、特にそこ。
 */
test("黄色と黄黒の縞が、どこにも残っていない", () => {
  // 🔴 `src` だけ見ていたら、**tailwind.config.ts の shadow-cta に黄が残った**。
  // トークンを定義しているファイルこそ、置き換えの取りこぼしが出る場所。
  const files = [
    ...walkSource(join(process.cwd(), "src")),
    join(process.cwd(), "tailwind.config.ts"),
  ];
  const offenders: string[] = [];

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const where = relative(process.cwd(), file).split(sep).join("/");
    // コメントで色名に言及するのは許す。見るのは値として書かれている場合だけ
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      // 16進だけ見ると取りこぼす。実際 rgba(255,224,61,.8) で書かれた影が残っていた
      if (/#f{0,1}fe03d/i.test(line)) offenders.push(`${where}: 黄の直書き（16進）`);
      if (/255\s*,\s*224\s*,\s*61/.test(line)) offenders.push(`${where}: 黄の直書き（rgb）`);
      // 45度の反復だけを見る。90度の反復はブラシドメタルの質感で、黄黒とは無関係
      if (/repeating-linear-gradient\(\s*45deg/.test(line)) offenders.push(`${where}: 斜めの縞`);
    }
  }

  assert.deepEqual([...new Set(offenders)], []);
});

test("縞の背景トークンが復活していない", () => {
  const images = Object.keys(config.theme?.extend?.backgroundImage ?? {});
  assert.deepEqual(
    images.filter((name) => /^hazard/.test(name)),
    [],
    "hazard-lg / hazard-sm は廃止した（帯は bg-hazard の単色）",
  );
});
