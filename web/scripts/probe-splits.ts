/** 【計測用】主反応以外の分岐（強度・放熱量）も、尺度の中心とそろっているかを見る */
import { determineReaction, NEUTRAL, REACTION_KEYS } from "../src/lib/personality/reaction";
import { togelIndexPercent } from "../src/lib/personality/togel-index";
import { TYPE_PROTOTYPES } from "../src/lib/personality/prototypes";
import { personalityTypes } from "../src/lib/personality";
import type { BigFiveScores } from "../src/types/diagnosis";

console.log(`尺度: スコア1〜5 → ${togelIndexPercent("openness", { openness: 1 } as BigFiveScores)}〜${togelIndexPercent("openness", { openness: 5 } as BigFiveScores)}%  中心 ${NEUTRAL}`);

let rng = 5150;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rand(); return s / 6; };
const sample = (): BigFiveScores => ({
  openness: 1 + gauss() * 4, conscientiousness: 1 + gauss() * 4, extraversion: 1 + gauss() * 4,
  agreeableness: 1 + gauss() * 4, neuroticism: 1 + gauss() * 4,
});

const N = 200000;
const r = new Map<string, number>(REACTION_KEYS.map((k) => [k, 0]));
const inten = new Map<string, number>([["low", 0], ["mid", 0], ["high", 0]]);
const heat = new Map<string, number>([["high", 0], ["low", 0]]);
for (let i = 0; i < N; i++) {
  const p = determineReaction(sample());
  r.set(p.reaction, r.get(p.reaction)! + 1);
  inten.set(p.intensity, inten.get(p.intensity)! + 1);
  heat.set(p.heat, heat.get(p.heat)! + 1);
}
const pct = (n: number) => `${(Math.round((n / N) * 1000) / 10).toFixed(1)}%`;
console.log("\n主反応:"); for (const [k, v] of r) console.log(`  ${k.padEnd(11)} ${pct(v)}`);
console.log("\n強度（耐圧限界 >=67 low / 34-66 mid / <=33 high）:");
for (const [k, v] of inten) console.log(`  ${k.padEnd(11)} ${pct(v)}`);
console.log("\n放熱量（>=50 で high）:"); for (const [k, v] of heat) console.log(`  ${k.padEnd(11)} ${pct(v)}`);

console.log("\n放熱の境目を中心(60)にしたら:");
let hi = 0; rng = 5150;
for (let i = 0; i < N; i++) if (togelIndexPercent("extraversion", sample()) >= NEUTRAL) hi++;
console.log(`  high ${pct(hi)} / low ${pct(N - hi)}`);

console.log("\n24タイプの原型では:");
const byR = new Map<string, number>(REACTION_KEYS.map((k) => [k, 0]));
const byH = new Map<string, number>([["high", 0], ["low", 0]]);
for (const t of personalityTypes) {
  const p = determineReaction(TYPE_PROTOTYPES[t.id]);
  byR.set(p.reaction, byR.get(p.reaction)! + 1);
  byH.set(p.heat, byH.get(p.heat)! + 1);
}
console.log("  主反応:", [...byR].map(([k, v]) => `${k}=${v}`).join(" "));
console.log("  放熱  :", [...byH].map(([k, v]) => `${k}=${v}`).join(" "));

console.log("\n\n======== 強度のしきい値の候補 ========");
console.log("尺度が 20〜100 なので、3等分の境目は 46.7 と 73.3（0〜100 前提の 33/67 ではない）");
const tryIntensity = (lowAt: number, highAt: number) => {
  let lo = 0, mid = 0, hi = 0; rng = 5150;
  for (let i = 0; i < N; i++) {
    const v = togelIndexPercent("neuroticism", sample());
    if (v >= lowAt) lo++; else if (v > highAt) mid++; else hi++;
  }
  console.log(`  low>=${String(lowAt).padStart(3)} / high<=${String(highAt).padStart(3)}  →  low ${pct(lo)} ・ mid ${pct(mid)} ・ high ${pct(hi)}`);
};
console.log("現状:");
tryIntensity(67, 33);
console.log("尺度の3等分:");
tryIntensity(74, 46);
console.log("人数がおおむね3等分になる境目:");
tryIntensity(66, 54);
tryIntensity(64, 56);

console.log("\n======== 放熱の境目の候補 ========");
for (const at of [50, 55, 60]) {
  let hi = 0; rng = 5150;
  for (let i = 0; i < N; i++) if (togelIndexPercent("extraversion", sample()) >= at) hi++;
  console.log(`  >=${at}  →  high ${pct(hi)} ・ low ${pct(N - hi)}`);
}
