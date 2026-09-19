import { test } from "node:test";
import assert from "node:assert/strict";

import { buildBoard, milestoneNumbers, trailOffsetX } from "../src/lib/diagnosis/board";

/**
 * 診断すごろくの盤。監修指示の数値をそのまま実装できているかを固定する。
 * （scripts/verify-board.ts と同じ検証。あちらは文面や座標を目で見るための印字つき）
 */

const segments = (total: number) => {
  const numbers = milestoneNumbers(total);
  const result: number[] = [];
  let previous = 0;
  for (const number of numbers) {
    result.push(number - previous);
    previous = number;
  }
  result.push(total - previous);
  return result;
};

test("中間マスの区間が指示通り（full）", () => {
  assert.deepEqual(segments(40), [7, 6, 6, 5, 4, 4, 3, 3, 2]);
  assert.equal(
    segments(40).reduce((a, b) => a + b, 0),
    40,
  );
});

test("中間マスの区間が指示通り（light）", () => {
  assert.deepEqual(segments(10), [4, 3, 3]);
  assert.equal(
    segments(10).reduce((a, b) => a + b, 0),
    10,
  );
});

test("区間は単調非増加で、最終区間が最短（終盤に向けて詰まる）", () => {
  for (const total of [40, 10]) {
    const parts = segments(total);
    parts.forEach((value, index) => {
      if (index > 0) assert.ok(value <= parts[index - 1], `total=${total} index=${index}`);
    });
    assert.equal(parts[parts.length - 1], Math.min(...parts));
  }
});

test("中間マスの位置が盤の上でも一致する", () => {
  const board = buildBoard(40);
  const onBoard = board.cells.filter((cell) => cell.isMilestone).map((cell) => cell.index + 1);
  assert.deepEqual(onBoard, milestoneNumbers(40));
});

test("1マスの縦距離は一定でない（等間隔は等速と同じ）", () => {
  const board = buildBoard(40);
  const gaps = board.cells.slice(1).map((cell, index) => cell.y - board.cells[index].y);
  assert.ok(new Set(gaps.map((gap) => gap.toFixed(2))).size > 1);
});

test("座標は設問数だけで決まり、再現する（回答に依存しない）", () => {
  const a = buildBoard(40);
  const b = buildBoard(40);
  a.cells.forEach((cell, index) => {
    assert.equal(cell.x, b.cells[index].x);
    assert.equal(cell.y, b.cells[index].y);
  });
});

test("軌跡の横ずれは設問インデックスの偶奇で符号が反転する", () => {
  const values = [1, 2, 3, 4, 5];
  const even = values.map((value) => trailOffsetX(0, value));
  const odd = values.map((value) => trailOffsetX(1, value));
  even.forEach((offset, index) => assert.equal(offset, -odd[index]));
});

test("同じ回答が常に同じ側に出ない（一貫した「良い側」が存在しない）", () => {
  assert.ok(trailOffsetX(0, 5) > 0);
  assert.ok(trailOffsetX(1, 5) < 0);
  assert.equal(trailOffsetX(0, 3), 0);
  assert.equal(trailOffsetX(7, 4), trailOffsetX(7, 4));
});
