/**
 * 週次配信の構造検算（角度・マスの住所）。npx tsx scripts/... で実行
 *
 * 【2026-09-21】15マスを数える図は撤去したが、**ここは図の検算ではない。**
 * 配信テンプレと角度の対応、マス指定の往復を見ている。
 * `3タイプ × 5角度 = 15` は配信の全15通と一致している必要がある。
 */
import { ANGLES_PER_TYPE, ANGLE_BY_BROADCAST_KIND, BOARD_ANGLES, boardTypeCount, cellKey, parseCellKey } from "../src/lib/coaching/board";

const failures: string[] = [];
// 🔴 この検算は「full は25」と書かれたまま放置されていた。boardTypeCount は
// 引数を取らず（診断の種別によらず3タイプ）、実際はどちらも15。
// 期待値のほうが古く、**走らせれば落ちる状態が残っていた**。
const cells = boardTypeCount() * ANGLES_PER_TYPE;
console.log(`[1] ${boardTypeCount()} タイプ x ${ANGLES_PER_TYPE} 角度 = ${cells}（期待15・配信の全通数と一致）`);
if (cells !== 15) failures.push("[1] 3タイプ×5角度が15にならない");

// 週次配信15通（5テンプレ×3タイプ）と light の15マスが1対1で対応すること
const angles = new Set(ANGLE_BY_BROADCAST_KIND);
console.log(`[2] 配信テンプレ数 ${ANGLE_BY_BROADCAST_KIND.length} / 角度の重複なし: ${angles.size === ANGLE_BY_BROADCAST_KIND.length}`);
if (ANGLE_BY_BROADCAST_KIND.length !== ANGLES_PER_TYPE) failures.push("[2] 配信テンプレ数と角度数が一致しない");
if (angles.size !== ANGLE_BY_BROADCAST_KIND.length) failures.push("[2] 配信テンプレが同じ角度に重複している");
if (!ANGLE_BY_BROADCAST_KIND.every((a) => BOARD_ANGLES.some((b) => b.key === a))) failures.push("[2] 未知の角度がある");

// マス指定の往復（typeIdにハイフンが含まれていても壊れないこと）
const round = parseCellKey(cellKey("creative-leader", "distance"));
console.log(`[3] 往復: ${JSON.stringify(round)}`);
if (round?.typeId !== "creative-leader" || round.angle !== "distance") failures.push("[3] マス指定の往復に失敗");
if (parseCellKey("creative-leader:unknown") !== null) failures.push("[3] 未知の角度を弾いていない");

console.log("");
if (failures.length === 0) console.log("PASS: 3点すべて問題なし");
else { console.log(`FAIL: ${failures.length} 件`); failures.forEach((f) => console.log("  - " + f)); process.exitCode = 1; }
