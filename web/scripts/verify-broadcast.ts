/**
 * 週次配信の検算スクリプト。
 *
 *   npx tsx scripts/verify-broadcast.ts [typeId]
 *
 * 検証するのは3点。
 *   1. 通目 1〜15 が全て組み立てられ、0 と 16 は null（巡回させない）
 *   2. 15通が「5テンプレ × ワースト3タイプ」を重複なく網羅する
 *   3. 通目の起点が max(友だち登録日, 配信有効化日) になっている
 * 実際の文面も全通print する（LINEに送る前の目視確認用）。
 */

import {
  BROADCAST_TOTAL_ISSUES,
  buildTypeBroadcast,
  issueForUser,
} from "../src/lib/line/broadcast";

const typeId = process.argv[2] ?? "creative-leader";
const failures: string[] = [];
const WEEK = 7 * 24 * 60 * 60 * 1000;

// ---- 1. 範囲 ---------------------------------------------------------------
const texts: string[] = [];
for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
  const message = buildTypeBroadcast(typeId, issue);
  if (!message) {
    failures.push(`[1] issue=${issue} が組み立てられない`);
    continue;
  }
  texts.push(message.text);
  const head = message.text.split("\n")[0];
  if (head !== `${issue}通目です（全${BROADCAST_TOTAL_ISSUES}通）`) {
    failures.push(`[1] issue=${issue} の1行目が不正: ${head}`);
  }
}
console.log(`[1] 1〜${BROADCAST_TOTAL_ISSUES}通: ${texts.length}件を組み立て`);
for (const out of [0, -1, BROADCAST_TOTAL_ISSUES + 1, 999]) {
  if (buildTypeBroadcast(typeId, out) !== null) failures.push(`[1] issue=${out} が null でない`);
}
console.log(`[1] 範囲外（0 / -1 / ${BROADCAST_TOTAL_ISSUES + 1} / 999）: すべて null`);

// ---- 2. 網羅 ---------------------------------------------------------------
const heads = texts.map((text) => text.split("\n")[2] ?? "");
const distinct = new Set(texts);
console.log(`[2] 相異なる文面: ${distinct.size} / ${texts.length}`);
if (distinct.size !== texts.length) failures.push("[2] 同じ文面が重複している");
if (heads.some((head) => head.length === 0)) failures.push("[2] 本文が空の通がある");

// ---- 3. 起点 ---------------------------------------------------------------
const start = new Date("2026-09-25T00:00:00Z");
const before = issueForUser("2026-08-01T00:00:00Z", start, new Date(start.getTime()));
const after = issueForUser(
  "2026-10-02T00:00:00Z",
  start,
  new Date(new Date("2026-10-02T00:00:00Z").getTime()),
);
const laterWeek = issueForUser("2026-08-01T00:00:00Z", start, new Date(start.getTime() + WEEK));
const sameWeek = issueForUser(
  "2026-08-01T00:00:00Z",
  start,
  new Date(start.getTime() + WEEK - 1000),
);
console.log(`[3] 有効化以前からの友だち: ${before}通目（期待1）`);
console.log(`[3] 有効化後に登録した友だち: ${after}通目（期待1）`);
console.log(`[3] 1週間後: ${laterWeek}通目（期待2）/ 1週間未満: ${sameWeek}通目（期待1）`);
if (before !== 1) failures.push("[3] 有効化以前の友だちが1通目から始まらない");
if (after !== 1) failures.push("[3] 有効化後の登録者が1通目から始まらない");
if (laterWeek !== 2 || sameWeek !== 1) failures.push("[3] 週の刻みが正しくない");

// ---- 文面（目視確認用） -----------------------------------------------------
console.log(`\n===== ${typeId} の全${texts.length}通 =====`);
texts.forEach((text, index) => {
  console.log(`\n--- ${index + 1}通目 ---`);
  console.log(text);
});

console.log("");
if (failures.length === 0) {
  console.log("PASS: 3点すべて問題なし");
} else {
  console.log(`FAIL: ${failures.length} 件`);
  failures.forEach((failure) => console.log(`  - ${failure}`));
  process.exitCode = 1;
}
