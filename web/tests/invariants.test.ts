import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { typeApproachGuides } from "../src/lib/coaching/translations";
import { isSpokenLandmine, landmineHeading, landmineQuote } from "../src/lib/share/text";

import { groupBadgeLine } from "../src/components/brand/group-badge";
import { BROADCAST_TOTAL_ISSUES } from "../src/lib/line/broadcast";
import {
  ANGLES_PER_TYPE,
  ANGLE_BY_BROADCAST_KIND,
  BOARD_ANGLES,
  BOARD_TYPE_COUNT,
  boardTypeCount,
  cellKey,
  parseCellKey,
} from "../src/lib/coaching/board";
import { groupMatrixCell, groupMatrixPairs } from "../src/lib/personality/group-matrix";
import { personalityTypes, TYPE_GROUP_ORDER, typesInGroup, typeToken } from "../src/lib/personality";

/**
 * これまで口頭で確認していた不変条件。
 * 人が覚えている限りでしか守られない状態をやめ、壊れたら落ちるようにする。
 */

const GROUP_NAMES = ["引火群", "沈降群", "連鎖群", "不活性群"];
const SRC = join(process.cwd(), "src");

/** コメントを落としたソース（コメント内の言及は画面に出ないので対象外） */
const readCode = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(path) ? [path] : [];
  });

test("愛称24件が相互に重複しない", () => {
  const nicknames = personalityTypes.map((type) => type.nickname);
  assert.equal(nicknames.length, 24);
  assert.equal(new Set(nicknames).size, 24);
});

test("愛称は他タイプの正式名・キャッチと衝突しない", () => {
  for (const type of personalityTypes) {
    for (const other of personalityTypes) {
      if (other.id === type.id) continue;
      assert.ok(!other.typeName.includes(type.nickname), `${type.nickname} in ${other.typeName}`);
    }
  }
});

test("表示トークンは必ず「〜型」になる", () => {
  for (const type of personalityTypes) {
    assert.equal(typeToken(type), `${type.nickname}型`);
    assert.ok(!type.nickname.endsWith("型"));
  }
});

test("群は4×6で、各タイプがちょうど1群に属する", () => {
  assert.equal(TYPE_GROUP_ORDER.length, 4);
  const seen = new Set<string>();
  for (const group of TYPE_GROUP_ORDER) {
    const members = typesInGroup(group);
    assert.equal(members.length, 6, group);
    for (const member of members) {
      assert.ok(!seen.has(member.id), `${member.id} が複数の群に属している`);
      seen.add(member.id);
    }
  }
  assert.equal(seen.size, 24);
});

test("相性表は対称展開で16マスを埋める", () => {
  let filled = 0;
  for (const row of TYPE_GROUP_ORDER) {
    for (const column of TYPE_GROUP_ORDER) {
      const cell = groupMatrixCell(row, column);
      assert.ok(cell, `${row}:${column}`);
      assert.equal(cell.symbol, groupMatrixCell(column, row).symbol, "対称でない");
      assert.equal(cell.text, groupMatrixCell(column, row).text, "対称でない");
      filled += 1;
    }
  }
  assert.equal(filled, 16);
  assert.equal(groupMatrixPairs().length, 10);
});

test("どの群も ◎ を少なくとも1つ持つ（⚡が「悪い群」の印にならない）", () => {
  for (const group of TYPE_GROUP_ORDER) {
    const symbols = TYPE_GROUP_ORDER.map((other) => groupMatrixCell(group, other).symbol);
    assert.ok(symbols.includes("◎"), `${group} に ◎ がない`);
  }
});

test("相性表の本文は群名を含まない（単体で流用しても裸にならない）", () => {
  for (const { cell } of groupMatrixPairs()) {
    for (const name of GROUP_NAMES) {
      assert.ok(!cell.text.includes(name), `「${name}」が本文に含まれている: ${cell.text}`);
    }
  }
});

test("群名の文字列は group-badge.tsx にしか存在しない（再定義から分離できない）", () => {
  const offenders = walk(SRC)
    .filter((path) => !path.endsWith(join("brand", "group-badge.tsx")))
    .filter((path) => GROUP_NAMES.some((name) => readCode(path).includes(name)));
  assert.deepEqual(offenders, []);
});

test("群名を出す唯一のテキスト経路は再定義を伴う", () => {
  for (const group of TYPE_GROUP_ORDER) {
    const line = groupBadgeLine(group);
    assert.ok(GROUP_NAMES.some((name) => line.includes(name)));
    assert.ok(line.includes("——"), "再定義が付いていない");
    assert.ok(line.split("——")[1].length > 0);
  }
});

/**
 * 「数える」言い回しが残っていないこと。
 *
 * 2026-09-21 に「何マス歩いたか」を数える図を撤去したが、**撤去しきれていなかった。**
 * `board-view.tsx` だけを直して、`coaching/page.tsx` に残っていた
 * 「歩き方を1つ覚えた」を見落とした。ローカルの検査は通り、本番にも出た。
 *
 * 見つかったのは、**配信のリンク形式（?cell=）で本番を実際に開いた**とき。
 * 未診断のHTMLしか見ていなかったので、診断済みでしか出ない部分が素通りしていた。
 */
/**
 * 流れる帯（マーキー）の幅を、画面幅に対する割合で決めないこと。
 *
 * 以前は帯が `w-[200%]`、中の各枚が `w-1/2` だった。つまり「1枚＝画面幅」を
 * 前提にしていたが、**中身の自然幅は 632px で画面幅によらず一定**。
 * 実測（本番）: 320pxで312px・390pxで242px・430pxで202px はみ出して文字が重なり、
 * 768pxでは136px 足りずに継ぎ目が空いていた。**狭くても広くても壊れていた。**
 *
 * `w-max` なら帯は2枚ぶんちょうどになり、`translateX(-50%)` が
 * きっかり1枚ぶんの移動になる。どの画面幅でも重ならず、空かない。
 */
/**
 * LINE配信のリンク（?cell=）が、利用者の状態によらず本文を開くこと。
 *
 * 以前は2か所で弾いていた。
 *   1. `state.typeIds.includes(typeId)` — 利用者のリストに無いタイプは開かない
 *   2. 本文のパネルが `hasTypes &&` の内側 — 保存済みの診断が無いと出ない
 * LINE のアプリ内ブラウザで開くと保存済みの診断が無いので、**2だけで全部止まる。**
 * 本番（修正前）で確かめたところ、状態なし・リスト食い違いの**両方で開かなかった。**
 * 配信が止まっていたので実害は出ていないが、有効にした瞬間に全リンクが行き止まりになっていた。
 */
test("LINE配信のリンクは、利用者のリストと診断の有無によらず本文を開く", () => {
  const source = readFileSync(join(process.cwd(), "src/app/coaching/page.tsx"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  assert.ok(
    !/typeIds\.includes\(\s*requested/.test(code),
    "着地で利用者のリストに入っているかを見ている（入っていないとLINEのリンクが開かない）",
  );
  assert.ok(
    /!hasTypes && openPanel/.test(code),
    "診断が無いときに本文を出す経路が無い（LINEのアプリ内ブラウザで開かない）",
  );
});

test("流れる帯の幅を画面幅の割合で決めていない", () => {
  const source = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
  const marquee = source.slice(source.indexOf("const Marquee"), source.indexOf("const Marquee") + 1200);

  for (const forbidden of ['w-[200%]', "w-1/2"]) {
    assert.ok(
      !marquee.includes(forbidden),
      `マーキーが ${forbidden} を使っている（中身の幅は画面幅と無関係なので崩れる）`,
    );
  }
  assert.ok(marquee.includes("w-max"), "マーキーの幅が中身で決まっていない");
});

test("「数える」言い回しが残っていない", () => {
  const targets = [
    "src/app/coaching/page.tsx",
    "src/components/coaching/board-view.tsx",
    "src/lib/coaching/board.ts",
    "src/lib/coaching/progress.ts",
  ];
  const phrases = ["マス歩きました", "歩いたところ", "歩き方を1つ覚えた", "歩き切った"];
  const offenders: string[] = [];

  for (const file of targets) {
    const text = readFileSync(join(process.cwd(), file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      // 撤去の経緯を説明するコメントは許す。見るのは画面に出る文字列だけ
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      for (const phrase of phrases) {
        if (line.includes(phrase)) offenders.push(`${file}: ${phrase}`);
      }
    }
  }
  assert.deepEqual([...new Set(offenders)], []);
});

test("週次配信の全15通が、3タイプ×5角度と一致する", () => {
  // 🔴 **これは図の検査ではない。配信の検査。**
  // 2026-09-21 に「何マス歩いたか」を数える図は撤去したが、この検査は残す。
  // 消すと、BROADCAST_TOTAL_ISSUES を 16 に変えても誰も気づかなくなる。
  // 元は「盤の全長は常に15マス」という名前で、図の検査に見えていた。
  assert.equal(BOARD_TYPE_COUNT, 3);
  assert.equal(boardTypeCount() * ANGLES_PER_TYPE, 15);
  assert.equal(boardTypeCount() * ANGLES_PER_TYPE, BROADCAST_TOTAL_ISSUES);
});

test("配信の5テンプレと盤の5つの角度が1対1で対応する", () => {
  assert.equal(ANGLE_BY_BROADCAST_KIND.length, ANGLES_PER_TYPE);
  assert.equal(new Set(ANGLE_BY_BROADCAST_KIND).size, ANGLES_PER_TYPE);
  for (const angle of ANGLE_BY_BROADCAST_KIND) {
    assert.ok(BOARD_ANGLES.some((item) => item.key === angle), angle);
  }
});

test("マス指定は往復できる（タイプIDにハイフンが含まれても壊れない）", () => {
  const round = parseCellKey(cellKey("creative-leader", "distance"));
  assert.deepEqual(round, { typeId: "creative-leader", angle: "distance" });
  assert.equal(parseCellKey("creative-leader:unknown"), null);
  assert.equal(parseCellKey(null), null);
});

/* ===== 共有する文面の地雷（ガイドの ng） ===== */

/**
 * ng は2つの役割を兼ねている。ガイドでは「NG行動」でト書きも有効、
 * 共有する文面では「私に言われたくない一言」。片方で正しい形が、もう片方で壊れる。
 * 形だけを機械で固定して、壊れ方が戻ってこないようにする。
 */

const guides = Object.entries(typeApproachGuides);

test("注記は引用符の外に置く（内側にあると本人が声に出して言ったことになる）", () => {
  const offenders = guides
    .filter(([, guide]) => (guide.ng.match(/「[^」]*」/g) ?? []).some((q) => /[（）]/.test(q)))
    .map(([id, guide]) => `${id}: ${guide.ng}`);

  assert.deepEqual(offenders, []);
});

test("引用符の外の注記は、共有する文面から落ちる", () => {
  for (const [id, guide] of guides) {
    if (!/(?<=」)\s*（[^（）]*）\s*$/.test(guide.ng)) continue;
    assert.ok(!landmineQuote(id).includes("（"), `${id} の注記が落ちていない`);
  }
});

test("見出しは ng の形と一致する（言うことか、されることか）", () => {
  for (const [id, guide] of guides) {
    const spoken = guide.ng.startsWith("「");
    assert.equal(isSpokenLandmine(id), spoken, id);
    assert.equal(
      landmineHeading(id),
      spoken ? "私に言うと、警報が鳴ります" : "私にされると、警報が鳴ります",
      id,
    );
  }
});

test("24タイプすべてに地雷の一文がある", () => {
  for (const [id] of guides) {
    assert.ok(landmineQuote(id).length > 0, `${id} の ng が空`);
  }
  assert.equal(guides.length, 24);
});
