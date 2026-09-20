/**
 * 【計測用】診断直後に利用者が受け取る「自分についての地の文」を数える。
 *
 * 数えるだけで、何も直さない。タイプ名・スコア表示・CTA・見出しは除く。
 * どの文がどのデータから来ているか、スコアで変わるのはどこかを併せて出す。
 */
import { personalityTypes } from "../src/lib/personality";
import { TYPE_PROTOTYPES } from "../src/lib/personality/prototypes";
import { generatePersonalityNarrative } from "../src/lib/personality/narrative";
import { determinePersonalityType } from "../src/lib/personality/utils";
import { typeApproachGuides } from "../src/lib/coaching/translations";
import type { BigFiveScores } from "../src/types/diagnosis";

const len = (s: string) => [...s].length;
const sum = (xs: string[]) => xs.reduce((n, s) => n + len(s), 0);

/** /result が実際に描画している地の文だけを集める（page.tsx の描画順） */
const resultText = (typeId: string, scores: BigFiveScores) => {
  const type = personalityTypes.find((t) => t.id === typeId)!;
  const n = generatePersonalityNarrative(scores, type);
  return {
    "タイプ説明（固定）": [type.description],
    "強み（固定）": n.strengths.slice(0, 3),
    "伸びしろ（スコア依存）": n.warnings.slice(0, 3),
    "コミュニケーション（スコア依存）": n.communicationStyle.slice(0, 2),
    "考え方のクセ（開閉の中・スコア依存）": n.thinkingStyle,
    "恋愛傾向（開閉の中・スコア依存）": n.loveTendency,
    "求める相手（開閉の中・スコア依存）": n.idealPartner,
  } as Record<string, string[]>;
};

console.log("=".repeat(78));
console.log("【1】/result で1人が読む「自分についての地の文」");
console.log("=".repeat(78));

let firstShown = false;
const totals: number[] = [];
const openTotals: number[] = [];
for (const type of personalityTypes) {
  const blocks = resultText(type.id, TYPE_PROTOTYPES[type.id]);
  const per = Object.entries(blocks).map(([k, v]) => [k, sum(v), v.length] as const);
  const total = per.reduce((n, [, c]) => n + c, 0);
  const visible = per.filter(([k]) => !k.includes("開閉")).reduce((n, [, c]) => n + c, 0);
  totals.push(total);
  openTotals.push(visible);
  if (!firstShown) {
    firstShown = true;
    console.log(`\n内訳の例（${type.typeName} / 原型スコアの人）:`);
    for (const [k, c, items] of per) console.log(`  ${k.padEnd(34, "　")} ${String(c).padStart(4)}字 (${items}項目)`);
    console.log(`  ${"─".repeat(46)}`);
    console.log(`  開かずに見える分${" ".repeat(20)} ${String(visible).padStart(4)}字`);
    console.log(`  「もっと詳しい解説」を開いた合計${" ".repeat(6)} ${String(total).padStart(4)}字`);
  }
}
const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
console.log(`\n24タイプ平均: 開かずに ${avg(openTotals)}字 / 全部開いて ${avg(totals)}字`);
console.log(`最小 ${Math.min(...totals)}字 ・ 最大 ${Math.max(...totals)}字（全部開いた場合）`);

console.log("\n" + "=".repeat(78));
console.log("【2】/coaching/[typeId] の地の文");
console.log("=".repeat(78));
const guideCounts = Object.entries(typeApproachGuides).map(([id, g]) => {
  const parts = Object.entries(g).filter(([, v]) => typeof v === "string") as [string, string][];
  return { id, total: parts.reduce((n, [, v]) => n + len(v), 0), parts };
});
const g0 = guideCounts[0];
console.log(`\n内訳の例（${g0.id}）:`);
for (const [k, v] of g0.parts) console.log(`  ${k.padEnd(12)} ${String(len(v)).padStart(4)}字`);
console.log(`  ${"─".repeat(20)}`);
console.log(`  1タイプ分       ${String(g0.total).padStart(4)}字`);
console.log(`\n平均 ${avg(guideCounts.map((g) => g.total))}字 / タイプ（対象 ${guideCounts.length} タイプ）`);

console.log("\n" + "=".repeat(78));
console.log("【3】スコアで文面が変わるのは何箇所か");
console.log("=".repeat(78));
// 同じタイプに判定される人を無作為に作り、読む文章が何通りになるかを数える
const KEYS = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const;
const byType = new Map<string, Set<string>>();
const seen = new Map<string, number>();
let rng = 12345;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let i = 0; i < 200000; i++) {
  const scores = Object.fromEntries(KEYS.map((k) => [k, 1 + rand() * 4])) as BigFiveScores;
  const type = determinePersonalityType(scores);
  const blocks = resultText(type.id, scores);
  const key = JSON.stringify(blocks);
  if (!byType.has(type.id)) byType.set(type.id, new Set());
  byType.get(type.id)!.add(key);
  seen.set(type.id, (seen.get(type.id) ?? 0) + 1);
}
const variants = [...byType.entries()].map(([id, set]) => ({
  type: personalityTypes.find((t) => t.id === id)!.typeName,
  通り: set.size,
  人数: seen.get(id)!,
}));
variants.sort((a, b) => a.通り - b.通り);
console.log("\n同じタイプに判定された人が読む文章は、何通りあるか（20万人ぶんを無作為に生成）:");
for (const v of variants) console.log(`  ${v.type.padEnd(12, "　")} ${String(v.通り).padStart(3)}通り  (${v.人数}人)`);
console.log(`\n全タイプ合計 ${variants.reduce((n, v) => n + v.通り, 0)} 通り / 24タイプ`);
console.log(`1通りしかないタイプ: ${variants.filter((v) => v.通り === 1).length} / 24`);

console.log("\n" + "=".repeat(78));
console.log("【4】そのうち「同じタイプなら全員同じ」なのは何字か");
console.log("=".repeat(78));
// 「何通りあるか」だけだと、1行違うだけでも別の通りに数えてしまう。
// ブロックごとに、同じタイプの人の間で値が割れたかどうかを見る。
const blockNames = Object.keys(resultText(personalityTypes[0].id, TYPE_PROTOTYPES[personalityTypes[0].id]));
const perType = new Map<string, Map<string, Set<string>>>();
rng = 999;
for (let i = 0; i < 120000; i++) {
  const scores = Object.fromEntries(KEYS.map((k) => [k, 1 + rand() * 4])) as BigFiveScores;
  const type = determinePersonalityType(scores);
  const blocks = resultText(type.id, scores);
  if (!perType.has(type.id)) perType.set(type.id, new Map(blockNames.map((b) => [b, new Set<string>()])));
  const m = perType.get(type.id)!;
  for (const b of blockNames) m.get(b)!.add(blocks[b].join("｜"));
}
let fixedChars = 0, varChars = 0;
const blockStats = new Map<string, number[]>(blockNames.map((b) => [b, []]));
for (const [typeId, m] of perType) {
  const proto = resultText(typeId, TYPE_PROTOTYPES[typeId]);
  for (const b of blockNames) {
    const chars = sum(proto[b]);
    blockStats.get(b)!.push(m.get(b)!.size);
    if (m.get(b)!.size === 1) fixedChars += chars; else varChars += chars;
  }
}
console.log("\nブロックごとの通り数（24タイプの平均。1なら全員同じ文）:");
for (const b of blockNames) {
  const xs = blockStats.get(b)!;
  const a = (xs.reduce((s, n) => s + n, 0) / xs.length).toFixed(1);
  console.log(`  ${b.padEnd(34, "　")} 平均 ${a.padStart(5)} 通り`);
}
const t = fixedChars + varChars;
console.log(`\n文字数でみると: 同じタイプなら全員同じ ${Math.round(fixedChars / 24)}字 / 答えで変わりうる ${Math.round(varChars / 24)}字`);
console.log(`（1人あたり平均 ${Math.round(t / 24)}字 のうち ${Math.round((fixedChars / t) * 100)}% が固定）`);

console.log("\n" + "=".repeat(78));
console.log("【5】文章の在庫（システム全体に何種類の文が存在するか）");
console.log("=".repeat(78));
const inventory = new Map<string, Set<string>>(blockNames.map((b) => [b, new Set<string>()]));
rng = 4242;
for (let i = 0; i < 120000; i++) {
  const scores = Object.fromEntries(KEYS.map((k) => [k, 1 + rand() * 4])) as BigFiveScores;
  const type = determinePersonalityType(scores);
  const blocks = resultText(type.id, scores);
  for (const b of blockNames) for (const line of blocks[b]) inventory.get(b)!.add(line);
}
for (const b of blockNames) console.log(`  ${b.padEnd(34, "　")} ${String(inventory.get(b)!.size).padStart(4)} 種類`);
console.log(`\n合計 ${[...inventory.values()].reduce((n, s) => n + s.size, 0)} 文（24タイプ・全スコア帯を合わせた在庫）`);
