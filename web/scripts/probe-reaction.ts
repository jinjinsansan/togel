import { reactionScores, determineReaction, REACTION_KEYS } from "../src/lib/personality/reaction";
import { TYPE_PROTOTYPES } from "../src/lib/personality/prototypes";
import { personalityTypes } from "../src/lib/personality";
import type { BigFiveScores } from "../src/types/diagnosis";

const flat: BigFiveScores = { openness: 2.5, conscientiousness: 2.5, extraversion: 2.5, agreeableness: 2.5, neuroticism: 2.5 };
const c = reactionScores(flat);
console.log("全軸50%のときの候補値:", Object.entries(c).map(([k, v]) => `${k}=${Object.is(v, -0) ? "-0" : v}`).join("  "));
console.log("選ばれる主反応:", determineReaction(flat).reaction);

console.log("\n--- 尺度の中心について ---");
console.log("表示は score/5*100 なので、スコア1〜5は 20%〜100% に写る。中心は 60%。");
console.log("式の中立点 d(v)=v-50 は 50。つまり「平均的な人」は全軸 +10 から始まる。");
const neutral: BigFiveScores = { openness: 3, conscientiousness: 3, extraversion: 3, agreeableness: 3, neuroticism: 3 };
console.log("全軸スコア3.0（尺度の中心）の候補値:", JSON.stringify(reactionScores(neutral)));
console.log("→ 選ばれる主反応:", determineReaction(neutral).reaction);

console.log("\n--- 分布 ---");
const tally = (label: string, sample: () => BigFiveScores, n: number) => {
  const counts = new Map(REACTION_KEYS.map((k) => [k, 0]));
  for (let i = 0; i < n; i++) {
    const r = determineReaction(sample());
    counts.set(r.reaction, counts.get(r.reaction)! + 1);
  }
  console.log(`\n${label}（${n}件）`);
  for (const [k, v] of counts) console.log(`  ${k.padEnd(11)} ${String(Math.round((v / n) * 1000) / 10).padStart(5)}%`);
};

let rng = 2024;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
tally("一様乱数（スコア1〜5）", () => ({
  openness: 1 + rand() * 4, conscientiousness: 1 + rand() * 4, extraversion: 1 + rand() * 4,
  agreeableness: 1 + rand() * 4, neuroticism: 1 + rand() * 4,
}), 100000);

// 実際の回答は中心に寄る。正規寄りのサンプルでも見る
const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rand(); return s / 6; };
tally("中心に寄った回答（平均3.0付近）", () => ({
  openness: 1 + gauss() * 4, conscientiousness: 1 + gauss() * 4, extraversion: 1 + gauss() * 4,
  agreeableness: 1 + gauss() * 4, neuroticism: 1 + gauss() * 4,
}), 100000);

console.log("\n--- 24タイプの原型スコアでは ---");
const proto = new Map(REACTION_KEYS.map((k) => [k, [] as string[]]));
for (const t of personalityTypes) {
  const r = determineReaction(TYPE_PROTOTYPES[t.id]);
  proto.get(r.reaction)!.push(t.typeName);
}
for (const [k, names] of proto) console.log(`  ${k.padEnd(11)} ${names.length}タイプ ${names.join("・") || "—"}`);

console.log("\n\n================ 中立点を 60 にしたら ================");
const alt = (s: BigFiveScores) => {
  const pct = (k: keyof BigFiveScores) => Math.round((s[k] / 5) * 100);
  const d = (v: number) => v - 60;                       // ← 尺度の中心
  const ignition = pct("openness"), structure = pct("conscientiousness");
  const heat = pct("extraversion"), buffer = pct("agreeableness");
  return {
    evaluation: d(structure) + d(buffer) * 0.5,
    loss: d(buffer) * 0.5 + d(heat) * 0.5,
    isolation: -d(heat),
    pressure: -d(buffer),
    shock: -d(ignition) * 0.7 + d(structure) * 0.3,
  } as Record<string, number>;
};
const pickAlt = (s: BigFiveScores) => {
  const c = alt(s);
  let best = REACTION_KEYS[0] as string;
  for (const k of REACTION_KEYS) if (c[k] - c[best] > 1e-9) best = k;
  return best;
};
const tallyAlt = (label: string, sample: () => BigFiveScores, n: number) => {
  const counts = new Map<string, number>(REACTION_KEYS.map((k) => [k, 0]));
  for (let i = 0; i < n; i++) { const k = pickAlt(sample()); counts.set(k, counts.get(k)! + 1); }
  console.log(`\n${label}（${n}件）`);
  for (const [k, v] of counts) console.log(`  ${k.padEnd(11)} ${String(Math.round((v / n) * 1000) / 10).padStart(5)}%`);
};
rng = 2024;
tallyAlt("中心に寄った回答（平均3.0付近）", () => ({
  openness: 1 + gauss() * 4, conscientiousness: 1 + gauss() * 4, extraversion: 1 + gauss() * 4,
  agreeableness: 1 + gauss() * 4, neuroticism: 1 + gauss() * 4,
}), 100000);
const protoAlt = new Map<string, string[]>(REACTION_KEYS.map((k) => [k, []]));
for (const t of personalityTypes) protoAlt.get(pickAlt(TYPE_PROTOTYPES[t.id]))!.push(t.typeName);
console.log("\n24タイプの原型スコアでは:");
for (const [k, names] of protoAlt) console.log(`  ${k.padEnd(11)} ${names.length}タイプ`);
