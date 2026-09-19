import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { groupBadgeLine } from "../src/components/brand/group-badge";
import {
  ANGLES_PER_TYPE,
  ANGLE_BY_BROADCAST_KIND,
  BOARD_ANGLES,
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

test("攻略盤は light 15マス / full 25マス", () => {
  assert.equal(boardTypeCount("light") * ANGLES_PER_TYPE, 15);
  assert.equal(boardTypeCount("full") * ANGLES_PER_TYPE, 25);
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
