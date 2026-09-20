/**
 * タイプの安定性を測る。
 *
 * 「そのタイプと判定された人が、もう一度答えたとき同じタイプに留まる率」。
 * 到達率（どれだけの人がそのタイプになるか）とは別の性質で、
 * **痩せたタイプは、痩せているだけでなく不安定でもある**
 * （docs/ANALYSIS_2026-09-20_light版の一致率.md）。
 *
 * 到達率の均等化は第13便で打ち切ったが、安定性は別の根拠なので測り直す。
 *
 *   npx tsx scripts/measure-stability.ts
 *
 * 🔴 数字は「回答の揺れ幅」を仮定したシミュレーション。実データは無い
 * （同じ人に2回受けてもらった記録が無いため）。絶対値ではなく比較として読む。
 */

import { getQuestionsByType } from "../src/data/questions";
import { calculateBigFiveScores } from "../src/lib/personality/score";
import { TYPE_PROTOTYPES } from "../src/lib/personality/prototypes";
import { personalityTypes, typeToken } from "../src/lib/personality";
import type { BigFiveScores } from "../src/types/diagnosis";

const TRAITS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const;

const NOISE = 0.9;
const PEOPLE = 12000;
const IDS = personalityTypes.map((type) => type.id);
const QUESTIONS = getQuestionsByType("full");

type Prototypes = Record<string, BigFiveScores>;

const distance = (a: BigFiveScores, b: BigFiveScores) =>
  TRAITS.reduce((sum, trait) => sum + (a[trait] - b[trait]) ** 2, 0);

const assign = (scores: BigFiveScores, prototypes: Prototypes) => {
  let best = IDS[0];
  let bestDistance = Infinity;
  for (const id of IDS) {
    const d = distance(scores, prototypes[id]);
    if (d < bestDistance) {
      bestDistance = d;
      best = id;
    }
  }
  return best;
};

/** 同じ潜在特性の人に2回答えてもらう。種は固定なので配置を変えても同じ人を通す */
const makePairs = () => {
  let rng = 20260920;
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };
  const answer = (latent: Record<string, number>) =>
    calculateBigFiveScores(
      QUESTIONS.map((question) => {
        const target = question.reverse ? 6 - latent[question.trait] : latent[question.trait];
        return {
          questionId: question.id,
          value: Math.min(5, Math.max(1, Math.round(target + (rand() * 2 - 1) * NOISE))),
        };
      }),
    );
  return Array.from({ length: PEOPLE }, () => {
    const latent: Record<string, number> = {};
    for (const trait of TRAITS) latent[trait] = 1 + Math.floor(rand() * 5);
    return [answer(latent), answer(latent)] as const;
  });
};

const pairs = makePairs();
const everyone = pairs.map(([first]) => first);

const summarise = (prototypes: Prototypes) => {
  const first = new Map<string, number>();
  const stayed = new Map<string, number>();
  for (const [a, b] of pairs) {
    const ta = assign(a, prototypes);
    first.set(ta, (first.get(ta) ?? 0) + 1);
    if (assign(b, prototypes) === ta) stayed.set(ta, (stayed.get(ta) ?? 0) + 1);
  }
  const rows = IDS.map((id) => {
    const n = first.get(id) ?? 0;
    return {
      id,
      token: typeToken(personalityTypes.find((t) => t.id === id)!),
      share: (n / PEOPLE) * 100,
      stability: n === 0 ? 0 : ((stayed.get(id) ?? 0) / n) * 100,
      n,
    };
  });
  const overall =
    ([...stayed.values()].reduce((s, v) => s + v, 0) / PEOPLE) * 100;
  return { rows, overall };
};

/** ピアソンの相関係数 */
const correlation = (xs: number[], ys: number[]) => {
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const vx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const vy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return cov / (vx * vy);
};

const centre = Object.fromEntries(
  TRAITS.map((trait) => [trait, everyone.reduce((s, p) => s + p[trait], 0) / PEOPLE]),
) as unknown as BigFiveScores;

/** 痩せたタイプの原型を重心側へ寄せ、全タイプが下限を満たすまで繰り返す */
const balanceTo = (base: Prototypes, target: number): Prototypes => {
  const next: Prototypes = Object.fromEntries(IDS.map((id) => [id, { ...base[id] }]));
  for (let round = 0; round < 200; round += 1) {
    const { rows } = summarise(next);
    if (rows.every((row) => row.share >= target)) break;
    for (const row of rows) {
      if (row.share >= target) continue;
      // 足りないぶんに比例して重心へ寄せる
      const pull = Math.min(0.08, (target - row.share) * 0.03);
      for (const trait of TRAITS) {
        next[row.id][trait] += (centre[trait] - next[row.id][trait]) * pull;
      }
    }
  }
  return next;
};

/** データに最もよく合う配置（k-means）。安定性の上限に近い参考値 */
const fitToData = (base: Prototypes, rounds: number): Prototypes => {
  let current: Prototypes = Object.fromEntries(IDS.map((id) => [id, { ...base[id] }]));
  for (let round = 0; round < rounds; round += 1) {
    const sums = new Map<string, { sum: BigFiveScores; n: number }>();
    for (const person of everyone) {
      const id = assign(person, current);
      const acc = sums.get(id) ?? {
        sum: Object.fromEntries(TRAITS.map((t) => [t, 0])) as unknown as BigFiveScores,
        n: 0,
      };
      for (const trait of TRAITS) acc.sum[trait] += person[trait];
      acc.n += 1;
      sums.set(id, acc);
    }
    const next: Prototypes = {};
    for (const id of IDS) {
      const acc = sums.get(id);
      next[id] = acc
        ? (Object.fromEntries(TRAITS.map((t) => [t, acc.sum[t] / acc.n])) as unknown as BigFiveScores)
        : current[id];
    }
    current = next;
  }
  return current;
};

const shift = (a: Prototypes, b: Prototypes) => {
  const ds = IDS.map((id) => Math.sqrt(distance(a[id], b[id])));
  return {
    mean: ds.reduce((s, v) => s + v, 0) / ds.length,
    max: Math.max(...ds),
    maxId: IDS[ds.indexOf(Math.max(...ds))],
  };
};

const report = (label: string, prototypes: Prototypes, base?: Prototypes) => {
  const { rows, overall } = summarise(prototypes);
  const shares = rows.map((r) => r.share);
  const stabilities = rows.map((r) => r.stability);
  const thin = rows.filter((r) => r.share < 2).length;
  console.log(`\n=== ${label} ===`);
  console.log(`  全体の安定性 ${overall.toFixed(1)}%`);
  console.log(
    `  タイプ別 最小 ${Math.min(...stabilities).toFixed(1)}% / 最大 ${Math.max(...stabilities).toFixed(1)}%`,
  );
  console.log(
    `  到達率 最小 ${Math.min(...shares).toFixed(2)}% / 最大 ${Math.max(...shares).toFixed(2)}% ／ 2%未満 ${thin}タイプ`,
  );
  console.log(`  到達率と安定性の相関 ${correlation(shares, stabilities).toFixed(2)}`);
  if (base) {
    const s = shift(base, prototypes);
    console.log(
      `  v6からの移動 平均 ${s.mean.toFixed(2)} / 最大 ${s.max.toFixed(2)}（${typeToken(personalityTypes.find((t) => t.id === s.maxId)!)}）`,
    );
  }
  return rows;
};

const rows = report("現行（v6）", TYPE_PROTOTYPES);
console.log("\n  タイプ別（安定性の低い順）");
for (const row of [...rows].sort((a, b) => a.stability - b.stability)) {
  console.log(
    `    ${row.token.padEnd(7)} 安定性 ${row.stability.toFixed(1).padStart(5)}%  到達率 ${row.share.toFixed(2).padStart(5)}%`,
  );
}

report("到達率2%以上を満たす配置", balanceTo(TYPE_PROTOTYPES, 2.0), TYPE_PROTOTYPES);

const fitted = fitToData(TYPE_PROTOTYPES, 20);
report("データに最もよく合う配置（k-means 20回）", fitted, TYPE_PROTOTYPES);

/* ===== 定義がどれだけ壊れるか ===== */

const groupAxis = (prototypes: Prototypes, group: string, trait: (typeof TRAITS)[number]) =>
  personalityTypes.filter((t) => t.group === group).map((t) => prototypes[t.id][trait]);

const definitionCheck = (label: string, prototypes: Prototypes) => {
  const oSeparated =
    Math.min(...groupAxis(prototypes, "ignition", "openness")) >
    Math.max(...groupAxis(prototypes, "chain", "openness"));
  const aSeparated =
    Math.min(...groupAxis(prototypes, "chain", "agreeableness")) >
    Math.max(...groupAxis(prototypes, "ignition", "agreeableness"));

  // 動いた先が、他のタイプの元の位置に近くなっていないか
  const swapped = IDS.filter((id) => {
    const own = distance(prototypes[id], TYPE_PROTOTYPES[id]);
    return IDS.some((other) => other !== id && distance(prototypes[id], TYPE_PROTOTYPES[other]) < own);
  });

  console.log(`
  【${label}】定義との一致`);
  console.log(`    群の分離（O: 引火>連鎖）  ${oSeparated ? "維持" : "🔴 破れた"}`);
  console.log(`    群の分離（A: 連鎖>引火）  ${aSeparated ? "維持" : "🔴 破れた"}`);
  console.log(
    `    元の位置より他タイプの位置に近くなった原型  ${swapped.length}/24` +
      (swapped.length > 0
        ? `（${swapped.slice(0, 6).map((id) => typeToken(personalityTypes.find((t) => t.id === id)!)).join(" ")}${swapped.length > 6 ? " …" : ""}）`
        : ""),
  );
};

definitionCheck("到達率2%以上を満たす配置", balanceTo(TYPE_PROTOTYPES, 2.0));
definitionCheck("データに最もよく合う配置", fitted);
