/**
 * 【計測用】LINE週次配信が「1通あたり」実際に送る文字数を数える。
 * 直さない。数えるだけ。
 *
 * 盤のマス（/coaching の角度）と、配信1通は**同じではない**。
 * 配信の本文には、ガイドの中身に加えて枠の文（見出し・締めの一行）が入る。
 * 着地先の字数だけ見ると、実際に届く量と食い違う。
 */
import { buildTypeBroadcast, BROADCAST_TOTAL_ISSUES } from "../src/lib/line/broadcast";
import { personalityTypes } from "../src/lib/personality";

const len = (s: string) => [...s].length;
const KIND_LABEL = ["今週の地雷注意報", "中身の正体", "言い方の翻訳講座", "今日からやること", "距離の置き方"];

const perKind: number[][] = [[], [], [], [], []];
const bodies: string[] = [];
let missing = 0;

for (const type of personalityTypes) {
  for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
    const msg = buildTypeBroadcast(type.id, issue);
    if (!msg) { missing += 1; continue; }
    // 「N通目です（全15通）」とリンク行を除いた地の文
    const text = msg.text;
    const body = text.split("\n\n").slice(1).join("\n\n").split("▼ このマスを開く")[0].trim();
    perKind[(issue - 1) % 5].push(len(body));
    bodies.push(body);
  }
}

const stat = (xs: number[]) => ({
  min: Math.min(...xs), max: Math.max(...xs),
  avg: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length),
});

console.log("=".repeat(74));
console.log("【1】1通あたりの地の文（リンク行と「N通目です」を除く）");
console.log("=".repeat(74));
console.log("\n通の種類            平均   最小   最大");
perKind.forEach((xs, i) => {
  if (!xs.length) return;
  const s = stat(xs);
  console.log(`${KIND_LABEL[i].padEnd(10, "　")} ${String(s.avg).padStart(5)} ${String(s.min).padStart(6)} ${String(s.max).padStart(6)}`);
});
const all = perKind.flat();
console.log(`\n全通 平均 ${stat(all).avg}字（${stat(all).min}〜${stat(all).max}）`);
if (missing) console.log(`⚠ 生成できなかった通: ${missing}`);

console.log("\n" + "=".repeat(74));
console.log("【2】同じ中身が2通に出ていないか");
console.log("=".repeat(74));
const sample = personalityTypes[0];
const texts = Array.from({ length: BROADCAST_TOTAL_ISSUES }, (_, i) => {
  const m = buildTypeBroadcast(sample.id, i + 1);
  return m ? m.text : "";
});
console.log(`\n例: ${sample.typeName} の15通`);
for (let a = 0; a < 5; a += 1) {
  for (let b = a + 1; b < 5; b += 1) {
    // ✕/◯ の行が両方に出ているか
    const ex = (t: string) => (t.match(/[✕◯][^\n]*/g) ?? []).join("|");
    if (ex(texts[a]) && ex(texts[a]) === ex(texts[b])) {
      console.log(`  🔴 ${KIND_LABEL[a]} と ${KIND_LABEL[b]} に同じ ✕/◯ が出る`);
      console.log(`     ${ex(texts[a]).slice(0, 60)}`);
    }
  }
}

console.log("\n" + "=".repeat(74));
console.log("【3】枠の文（毎回同じ行）が占める割合");
console.log("=".repeat(74));
const fixed = [
  "踏むと警報が鳴ります。踏む前にどうぞ。",
  "タイプは傾向、ラベルは個人。隣のあの人の本当のラベルは、本人にしかわかりません。",
  "全部やれとは言いません。1つでいいです。",
  "逃げるのは負けじゃありません。保管距離という安全管理です。",
];
const fixedChars = fixed.reduce((n, s) => n + len(s), 0);
console.log(`\n毎回同じ締めの一行: ${fixed.length}種・合計${fixedChars}字`);
console.log(`1通の平均 ${stat(all).avg}字 のうち、締めの一行は平均 ${Math.round(fixedChars / fixed.length)}字`);
