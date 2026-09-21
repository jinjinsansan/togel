import { test } from "node:test";
import assert from "node:assert/strict";

import { buildBoard, columnsFor, milestoneNumbers } from "../src/lib/diagnosis/board";

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

/**
 * 盤は蛇行するグリッド。**40マス全部が1画面に入ること**が作り直しの目的なので、
 * そこを固定する。前の盤は画面外へ続いていたので「全体を見る」が必要で、
 * その全体表示が細い波線1本だった。
 */
test("盤が1画面に収まる（390pxの実機幅・盤の領域26dvh）", () => {
  for (const total of [40, 10]) {
    const board = buildBoard(total);
    // 390px から左右の余白（px-4 × 2 = 32px）を引いた実効幅
    assert.ok(board.width <= 390 - 32, `${total}問: 幅 ${board.width}px が入らない`);
    // 26dvh は 844px 端末で 219.4px。下に「あがり」の文字（16px＋余白4）が入るので
    // 盤そのものは 195px までにする。マス40pxだと 220px、36pxでも文字を足すと 220px
    assert.ok(board.height <= 195, `${total}問: 高さ ${board.height}px が入らない`);
  }
});

test("蛇行している（偶数行は左から右、奇数行は右から左）", () => {
  const board = buildBoard(40);
  const columns = columnsFor(40);
  assert.equal(columns, 8);

  // 1行目は 1..8 が左から右
  assert.deepEqual(
    board.cells.slice(0, 8).map((cell) => cell.column),
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  // 2行目は 9..16 が右から左
  assert.deepEqual(
    board.cells.slice(8, 16).map((cell) => cell.column),
    [7, 6, 5, 4, 3, 2, 1, 0],
  );
  // 折り返しの前後で列が同じ（＝縦に繋がる）
  assert.equal(board.cells[7].column, board.cells[8].column);
  assert.equal(board.cells[15].column, board.cells[16].column);
});

test("マスは等間隔（グリッドなので歩幅で加速を表現しない）", () => {
  const board = buildBoard(40);
  const rows = new Set(board.cells.map((cell) => cell.y));
  const sorted = [...rows].sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((y, index) => y - sorted[index]);
  assert.equal(new Set(gaps).size, 1, "行の間隔が一定でない");

  // 加速は中間マスの間隔が終盤ほど詰まることで見せる（区間の検査は上にある）
  assert.deepEqual(milestoneNumbers(40), [7, 13, 19, 24, 28, 32, 35, 38]);
});

test("あがりは最後のマスだけ", () => {
  for (const total of [40, 10]) {
    const board = buildBoard(total);
    const goals = board.cells.filter((cell) => cell.isGoal).map((cell) => cell.index);
    assert.deepEqual(goals, [total - 1]);
  }
});


test("座標は設問数だけで決まり、再現する（回答に依存しない）", () => {
  const a = buildBoard(40);
  const b = buildBoard(40);
  a.cells.forEach((cell, index) => {
    assert.equal(cell.x, b.cells[index].x);
    assert.equal(cell.y, b.cells[index].y);
  });
});
