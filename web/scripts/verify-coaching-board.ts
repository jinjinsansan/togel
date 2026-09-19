/** 攻略盤の構造検算。npx tsx scripts/... で実行 */
import { ANGLES_PER_TYPE, ANGLE_BY_BROADCAST_KIND, BOARD_ANGLES, boardTypeCount, cellKey, parseCellKey } from "../src/lib/coaching/board";

const failures: string[] = [];
const light = boardTypeCount("light") * ANGLES_PER_TYPE;
const full = boardTypeCount("full") * ANGLES_PER_TYPE;
console.log(`[1] light = ${boardTypeCount("light")} x ${ANGLES_PER_TYPE} = ${light}（期待15）`);
console.log(`[1] full  = ${boardTypeCount("full")} x ${ANGLES_PER_TYPE} = ${full}（期待25）`);
if (light !== 15) failures.push("[1] light が15マスでない");
if (full !== 25) failures.push("[1] full が25マスでない");

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
