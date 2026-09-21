/** 【計測用】同じ ✕/◯ が同じ相手について複数の通に出ていないかを見る */
import { buildTypeBroadcast, BROADCAST_TOTAL_ISSUES } from "../src/lib/line/broadcast";
import { personalityTypes } from "../src/lib/personality";

const KIND = ["今週の地雷注意報", "中身の正体", "言い方の翻訳講座", "今日からやること", "距離の置き方"];
const sample = personalityTypes[0];
console.log(`例: ${sample.typeName} の15通\n`);

const rows = Array.from({ length: BROADCAST_TOTAL_ISSUES }, (_, i) => {
  const m = buildTypeBroadcast(sample.id, i + 1);
  const t = m?.text ?? "";
  const marks = (t.match(/[✕◯][^\n]*/g) ?? []).map((l) => l.replace(/^[✕◯]\s*(言いがち|言い換え)?\s*/, ""));
  const target = (t.match(/対 ([^\n｜】]+)/) ?? t.match(/｜([^\n】]+)】/) ?? [])[1] ?? "";
  return { issue: i + 1, kind: i % 5, block: Math.floor(i / 5), marks, target, chars: [...t].length };
});

for (const r of rows) {
  console.log(`  ${String(r.issue).padStart(2)}通目 [${KIND[r.kind]}] ${r.chars}字  ${r.marks.length ? "✕/◯あり" : ""}`);
}

console.log("\n=== 同じ相手の中で ✕/◯ が繰り返されているか ===");
const byBlock = new Map<number, typeof rows>();
for (const r of rows) {
  if (!byBlock.has(r.block)) byBlock.set(r.block, []);
  byBlock.get(r.block)!.push(r);
}
for (const [block, rs] of byBlock) {
  const withMarks = rs.filter((r) => r.marks.length > 0);
  if (withMarks.length > 1) {
    const same = new Set(withMarks.map((r) => r.marks.join("|"))).size === 1;
    console.log(`  ${block + 1}人目: ${withMarks.map((r) => `${r.issue}通目`).join("・")} に ✕/◯${same ? "（中身は同一）" : "（中身は別）"}`);
    if (same) console.log(`     → 「${withMarks[0].marks[0].slice(0, 34)}…」を2回送っている`);
  }
}
