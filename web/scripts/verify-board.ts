/**
 * 盤面（lib/diagnosis/board.ts）の検算スクリプト。
 *
 *   npx tsx scripts/verify-board.ts
 *
 * 監修指示の数値をそのまま実装できているかを機械検証する。
 *   1. 中間マスの区間が full=7,6,6,5,4,4,3,3,2 / light=4,3,3（合計・単調非増加・最終区間最短）
 *   2. マスの座標が回答に依存しない／1マスの縦距離が一定でない
 *   3. 軌跡の横ずれが設問インデックスの偶奇で符号反転する（一貫した「良い側」が存在しない）
 */

import { buildBoard, milestoneNumbers, trailOffsetX } from "../src/lib/diagnosis/board";

const failures: string[] = [];

// ---- 1. 区間 ---------------------------------------------------------------
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

for (const [total, expected] of [
  [40, [7, 6, 6, 5, 4, 4, 3, 3, 2]],
  [10, [4, 3, 3]],
] as const) {
  const actual = segments(total);
  const sum = actual.reduce((a, b) => a + b, 0);
  const monotone = actual.every((value, index) => index === 0 || value <= actual[index - 1]);
  const lastIsShortest = actual[actual.length - 1] === Math.min(...actual);
  console.log(`[1] total=${total} 区間 ${actual.join(",")} / 合計 ${sum}`);
  if (actual.join(",") !== expected.join(",")) failures.push(`[1] total=${total} 区間が指示と不一致`);
  if (sum !== total) failures.push(`[1] total=${total} 合計が ${sum}`);
  if (!monotone) failures.push(`[1] total=${total} 単調非増加でない`);
  if (!lastIsShortest) failures.push(`[1] total=${total} 最終区間が最短でない`);
}

// ---- 2. 座標 ---------------------------------------------------------------
const board = buildBoard(40);
const gaps = board.cells.slice(1).map((cell, index) => cell.y - board.cells[index].y);
const distinctGaps = new Set(gaps.map((gap) => gap.toFixed(2)));
console.log(`[2] 縦距離の種類: ${distinctGaps.size}（1なら等間隔＝NG）`);
if (distinctGaps.size < 2) failures.push("[2] 1マスの縦距離が一定になっている");
if (buildBoard(40).cells.some((cell, index) => cell.y !== board.cells[index].y)) {
  failures.push("[2] 同じ設問数で座標が再現しない");
}
const milestoneCells = board.cells.filter((cell) => cell.isMilestone).map((cell) => cell.index + 1);
console.log(`[2] 中間マス: ${milestoneCells.join("/")}`);
if (milestoneCells.join(",") !== milestoneNumbers(40).join(",")) {
  failures.push("[2] 盤上の中間マス位置が指示と不一致");
}

// ---- 3. 軌跡の符号反転 -----------------------------------------------------
const sample = [1, 2, 3, 4, 5];
const evenOffsets = sample.map((value) => trailOffsetX(0, value));
const oddOffsets = sample.map((value) => trailOffsetX(1, value));
console.log(`[3] index0: ${evenOffsets.join(", ")}`);
console.log(`[3] index1: ${oddOffsets.join(", ")}`);
if (evenOffsets.some((offset, index) => offset !== -oddOffsets[index])) {
  failures.push("[3] 偶奇で符号が反転していない");
}
if (trailOffsetX(0, 3) !== 0) failures.push("[3] 中央（3）が0になっていない");
// 同じ回答が設問によって左にも右にも出ること（一貫した「良い側」が存在しない）
if (!(trailOffsetX(0, 5) > 0 && trailOffsetX(1, 5) < 0)) {
  failures.push("[3] 同じ回答が常に同じ側に出ている");
}
// 決定論（同じ入力なら同じ形）
if (trailOffsetX(7, 4) !== trailOffsetX(7, 4)) failures.push("[3] 決定論でない");

console.log("");
if (failures.length === 0) {
  console.log("PASS: 3点すべて問題なし");
} else {
  console.log(`FAIL: ${failures.length} 件`);
  failures.forEach((failure) => console.log(`  - ${failure}`));
  process.exitCode = 1;
}
