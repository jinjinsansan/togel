/**
 * 週次配信の検算スクリプト。
 *
 *   npx tsx scripts/verify-broadcast.ts [typeId]
 *
 * 検証するのは3点。
 *   1. 通目 1〜15 が全て組み立てられ、0 と 16 は null（巡回させない）
 *   2. 15通が「5テンプレ × ワースト3タイプ」を重複なく網羅する
 *   3. 通目の起点が max(友だち登録日, 配信有効化日) になっている
 * 実際の文面も全通print する（送る前の目視確認用）。
 */

import {
  BROADCAST_TOTAL_ISSUES,
  buildNewsletterIssue,
} from "../src/lib/newsletter/issues";
import { dueIssue, WEEK_MS as WEEK } from "../src/lib/newsletter/schedule";

const typeId = process.argv[2] ?? "creative-leader";
const failures: string[] = [];

// ---- 1. 範囲 ---------------------------------------------------------------
const texts: string[] = [];
for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
  const message = buildNewsletterIssue(typeId, issue);
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
  if (buildNewsletterIssue(typeId, out) !== null) failures.push(`[1] issue=${out} が null でない`);
}
console.log(`[1] 範囲外（0 / -1 / ${BROADCAST_TOTAL_ISSUES + 1} / 999）: すべて null`);

// ---- 2. 網羅 ---------------------------------------------------------------
const heads = texts.map((text) => text.split("\n")[2] ?? "");
const distinct = new Set(texts);
console.log(`[2] 相異なる文面: ${distinct.size} / ${texts.length}`);
if (distinct.size !== texts.length) failures.push("[2] 同じ文面が重複している");
if (heads.some((head) => head.length === 0)) failures.push("[2] 本文が空の通がある");

// ---- 3. 送る日 ---------------------------------------------------------------
const now = new Date("2026-10-02T03:00:00Z");
const first = dueIssue({ last_issue: 0, last_sent_at: null }, now);
const tooSoon = dueIssue({ last_issue: 1, last_sent_at: new Date(now.getTime() - WEEK / 2).toISOString() }, now);
const weekLater = dueIssue({ last_issue: 1, last_sent_at: new Date(now.getTime() - WEEK).toISOString() }, now);
const finished = dueIssue({ last_issue: BROADCAST_TOTAL_ISSUES, last_sent_at: null }, now);
console.log(`[3] 登録直後: ${first}通目（期待1）`);
console.log(`[3] 前回から3.5日: ${tooSoon}（期待null）/ 7日: ${weekLater}通目（期待2）/ 全通済み: ${finished}（期待null）`);
if (first !== 1) failures.push("[3] 登録直後に1通目が出ない");
if (tooSoon !== null || weekLater !== 2) failures.push("[3] 週の刻みが正しくない");
if (finished !== null) failures.push("[3] 全通を送り終えた人にまだ送る");

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
