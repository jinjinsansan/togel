/**
 * 原型ベクトル表の評価器。
 *
 * 24タイプそれぞれに5軸の原型を置き、**最も近い原型に割り当てる**方式を
 * 採るとどうなるかを、本番コードを変えずに測る。
 *
 * いまの判定木は if を積んだ構造で、入口が外向性でしか開いていない。
 * そのため外向性が中くらいの人に行き先が無く、26.94% がフォールバックに落ちる
 * （docs/ANALYSIS_2026-09-20_判定木の地図.md）。最近傍なら距離は常に定義されるので、
 * 行き先が無い人は原理的に生じない。ただし**距離が完全に等しい場合**は残るので、
 * そこは例外処理ではなく規則（固定順）で決定的に解く。
 *
 *   npx tsx scripts/evaluate-prototypes.ts --template > prototypes.json
 *   npx tsx scripts/evaluate-prototypes.ts prototypes.json
 *   npx tsx scripts/evaluate-prototypes.ts --self-check
 *
 * 原型は**タイプの定義から独立に決める**こと。現在の代表値は今の判定木の出力から
 * 逆算した平均なので、それを原型にすると同じ偏りを作り直す。
 */

import { readFileSync } from "node:fs";

import { getQuestionsByType } from "../src/data/questions";
import { calculateBigFiveScores } from "../src/lib/personality/score";
import { determinePersonalityType } from "../src/lib/personality/utils";
import { personalityTypes, TYPE_GROUP_ORDER, typeToken } from "../src/lib/personality";
import type { BigFiveScores } from "../src/types/diagnosis";

const TRAITS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const;

type Prototypes = Record<string, BigFiveScores>;

/** この距離までを「囲まれている」と数える。素点の幅(1〜5)に対して約3分の1 */
const CROWD_RADIUS = 1.3;

/* ===== 仮想の回答者 ===== */

/**
 * 潜在特性を5軸それぞれ1〜5で振り、その人が答えた結果を採点する。
 * 逆転項目には 6-t 寄りに答える（＝一貫した回答者）。乱数は固定種なので、
 * 原型表を差し替えても**同じ24,000人**を通すことになる。
 */
const makePopulation = (size: number): BigFiveScores[] => {
  let rng = 20260920;
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };
  const questions = getQuestionsByType("full");
  const people: BigFiveScores[] = [];
  for (let i = 0; i < size; i += 1) {
    const latent: Record<string, number> = {};
    for (const trait of TRAITS) latent[trait] = 1 + Math.floor(rand() * 5);
    people.push(
      calculateBigFiveScores(
        questions.map((question) => {
          const target = question.reverse ? 6 - latent[question.trait] : latent[question.trait];
          const value = Math.min(5, Math.max(1, Math.round(target + (rand() * 2 - 1) * 0.9)));
          return { questionId: question.id, value };
        }),
      ),
    );
  }
  return people;
};

/* ===== 最近傍の割り当て ===== */

const distance = (a: BigFiveScores, b: BigFiveScores): number =>
  Math.sqrt(TRAITS.reduce((sum, trait) => sum + (a[trait] - b[trait]) ** 2, 0));

/**
 * 最も近い原型を返す。距離が等しいときは**固定順**（`personalityTypes` の並び）で
 * 先に来るほうを採る。例外処理ではなく規則。同点だった件数も返す。
 */
const assign = (scores: BigFiveScores, prototypes: Prototypes, order: string[]) => {
  let best = order[0];
  let bestDistance = Infinity;
  let tied = 0;
  for (const id of order) {
    const d = distance(scores, prototypes[id]);
    if (d < bestDistance - 1e-9) {
      best = id;
      bestDistance = d;
      tied = 0;
    } else if (Math.abs(d - bestDistance) <= 1e-9) {
      tied += 1;
    }
  }
  return { id: best, tied: tied > 0 };
};

/* ===== 評価 ===== */

type Verdict = { ok: boolean; warnings: string[] };

const evaluate = (prototypes: Prototypes, people: BigFiveScores[], quiet = false) => {
  const order = personalityTypes.map((type) => type.id);
  const groupOf = new Map(personalityTypes.map((type) => [type.id, type.group]));

  const counts = new Map<string, number>();
  const groupCounts = new Map<string, number>();
  const moves = new Map<string, number>();
  let ties = 0;

  for (const person of people) {
    const { id, tied } = assign(person, prototypes, order);
    if (tied) ties += 1;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    const group = groupOf.get(id)!;
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    const before = determinePersonalityType(person).id;
    if (before !== id) {
      const key = `${before} → ${id}`;
      moves.set(key, (moves.get(key) ?? 0) + 1);
    }
  }

  const rows = personalityTypes
    .map((type) => ({ id: type.id, token: typeToken(type), n: counts.get(type.id) ?? 0 }))
    .sort((a, b) => b.n - a.n);
  const total = people.length;
  const zero = rows.filter((row) => row.n === 0);
  const top = rows[0];
  const bottom = rows[rows.length - 1];

  const warnings: string[] = [];
  if (zero.length > 0) warnings.push(`到達率0のタイプが ${zero.length} 件（${zero.map((r) => r.token).join(" ")}）`);
  if (top.n / total > 0.15) warnings.push(`最大の到達率が ${(top.n / total * 100).toFixed(1)}%（1タイプに偏っている）`);
  if (bottom.n / total < 0.01 && bottom.n > 0) warnings.push(`最小の到達率が ${(bottom.n / total * 100).toFixed(2)}%（実質使われていない）`);
  if (ties / total > 0.01) warnings.push(`距離のタイが ${(ties / total * 100).toFixed(2)}%`);

  if (!quiet) {
    console.log(`\n■ タイプごとの到達率（${total}件）`);
    for (const row of rows) {
      const pct = (row.n / total) * 100;
      console.log(
        `  ${row.token.padEnd(7)} ${String(row.n).padStart(6)}  ${pct.toFixed(2)}%${row.n === 0 ? "   ← 到達率0" : ""}`,
      );
    }
    console.log(`\n  最大 ${top.token} ${(top.n / total * 100).toFixed(2)}% ／ 最小 ${bottom.token} ${(bottom.n / total * 100).toFixed(2)}%`);
    console.log(`  均等なら 1タイプ ${(100 / 24).toFixed(2)}%`);

    console.log(`\n■ 距離が完全に等しかった件数: ${ties} / ${total} = ${(ties / total * 100).toFixed(3)}%`);
    console.log("  （固定順で決定的に解いている。フォールバックではない）");

    // 群の取り分は、その群の原型がどれだけ密集しているかでほぼ決まる。
    // 6点が固まっていれば受け持つ領域も狭く、散っていれば広い。
    const groupCrowd = (group: string) =>
      order
        .filter((id) => groupOf.get(id) === group)
        .reduce(
          (sum, id) =>
            sum +
            order.filter(
              (other) => other !== id && distance(prototypes[id], prototypes[other]) <= CROWD_RADIUS,
            ).length,
          0,
        );

    console.log("\n■ 群ごとの合計（6タイプずつ／均等なら25%）");
    console.log("  密集度 = その群の6つが、他の原型とどれだけ近接しているかの合計");
    for (const group of TYPE_GROUP_ORDER) {
      const n = groupCounts.get(group) ?? 0;
      console.log(
        `  ${group.padEnd(9)} ${String(n).padStart(6)}  ${((n / total) * 100).toFixed(2).padStart(6)}%   密集度 ${String(groupCrowd(group)).padStart(2)}`,
      );
    }

    const token = (id: string) => typeToken(personalityTypes.find((t) => t.id === id)!);

    const moved = [...moves.values()].reduce((a, b) => a + b, 0);
    console.log(`\n■ 現行との差分: ${moved} / ${total} = ${(moved / total * 100).toFixed(1)}% が別のタイプになる`);
    console.log("  移動の多い順（上位15）");
    for (const [key, n] of [...moves].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      const [from, to] = key.split(" → ");
      console.log(`    ${token(from).padEnd(7)} → ${token(to).padEnd(7)} ${String(n).padStart(5)}  ${(n / total * 100).toFixed(2)}%`);
    }

    // 回答者の重心。原型がここから遠いほど、担当する人が少なくなる
    const centre = Object.fromEntries(
      TRAITS.map((trait) => [trait, people.reduce((sum, p) => sum + p[trait], 0) / total]),
    ) as unknown as BigFiveScores;

    // 原型同士がどれだけ近いか。近すぎる組は互いに食い合い、片方が痩せる
    const neighbours = order.map((id) => {
      let nearest = "";
      let nearestDistance = Infinity;
      for (const other of order) {
        if (other === id) continue;
        const d = distance(prototypes[id], prototypes[other]);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = other;
        }
      }
      // 隣が1つ近いだけなら端を削られるだけだが、複数に囲まれると四方から削られる
      const crowd = order.filter(
        (other) => other !== id && distance(prototypes[id], prototypes[other]) <= CROWD_RADIUS,
      ).length;
      return {
        id,
        nearest,
        distance: nearestDistance,
        crowd,
        fromCentre: distance(prototypes[id], centre),
        n: counts.get(id) ?? 0,
      };
    });

    console.log("\n■ 隣の原型までの距離と、回答者の重心からの距離（隣が近い順）");
    console.log("  到達率を決めるのは2つ。隣が近いと食い合い、重心から遠いと痩せる");
    console.log(`  重心 = ${TRAITS.map((t) => `${t[0].toUpperCase()}${centre[t].toFixed(2)}`).join(" ")}`);
    console.log("  タイプ    到達率  隣まで  最も近い原型        囲み  重心から");
    for (const row of [...neighbours].sort((a, b) => a.distance - b.distance)) {
      const same = groupOf.get(row.id) === groupOf.get(row.nearest) ? "同群" : "他群";
      console.log(
        `  ${token(row.id).padEnd(7)} ${((row.n / total) * 100).toFixed(2).padStart(5)}%  ` +
          ` ${row.distance.toFixed(2)}   ${token(row.nearest).padEnd(7)} (${same})   ` +
          `${row.crowd}    ${row.fromCentre.toFixed(2)}`,
      );
    }

    console.log("\n■ 判定");
    if (warnings.length === 0) {
      console.log("  警告なし");
    } else {
      for (const warning of warnings) console.log(`  🔴 ${warning}`);
    }
  }

  return { ok: warnings.length === 0, warnings } satisfies Verdict;
};

/* ===== 表どうしの比較 ===== */

/**
 * 前の版と並べる。
 *
 * **原型を動かしていないタイプの取り分も動く**のが最近傍の性質で、
 * 隣が動けば境界が動くため。意図した動きと、巻き添えの動きを分けて見る。
 */
const compare = (before: Prototypes, after: Prototypes, people: BigFiveScores[], label: string) => {
  const order = personalityTypes.map((type) => type.id);
  const count = (prototypes: Prototypes) => {
    const counts = new Map<string, number>();
    for (const person of people) {
      const { id } = assign(person, prototypes, order);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  };

  const a = count(before);
  const b = count(after);
  const total = people.length;
  const token = (id: string) => typeToken(personalityTypes.find((t) => t.id === id)!);

  const rows = order.map((id) => {
    const shift = distance(before[id], after[id]);
    return {
      id,
      shift,
      from: ((a.get(id) ?? 0) / total) * 100,
      to: ((b.get(id) ?? 0) / total) * 100,
    };
  });

  const show = (title: string, subset: typeof rows) => {
    if (subset.length === 0) return;
    console.log(`\n  ${title}`);
    for (const row of [...subset].sort((x, y) => y.to - y.from - (x.to - x.from))) {
      const delta = row.to - row.from;
      const sign = delta >= 0 ? "+" : "";
      console.log(
        `    ${token(row.id).padEnd(7)} ${row.from.toFixed(2).padStart(5)}% → ${row.to.toFixed(2).padStart(5)}%  ` +
          `${(sign + delta.toFixed(2)).padStart(6)}pt${row.shift > 0 ? `   （原型を ${row.shift.toFixed(2)} 動かした）` : ""}`,
      );
    }
  };

  console.log(`\n■ 前の版との比較（${label}）`);
  show("原型を動かしたタイプ", rows.filter((row) => row.shift > 1e-9));
  show("原型を動かしていないタイプ（隣が動いた巻き添え）", rows.filter((row) => row.shift <= 1e-9));

  const collateral = rows
    .filter((row) => row.shift <= 1e-9)
    .reduce((sum, row) => sum + Math.abs(row.to - row.from), 0);
  console.log(
    `\n  動かしていない13タイプの増減の合計: ${collateral.toFixed(2)}pt` +
      `（意図せず動いた分。大きいほど設計の見通しが効いていない）`,
  );
};

/* ===== 入力の検証 ===== */

const loadPrototypes = (path: string): Prototypes => {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, Record<string, number>>;
  const prototypes: Prototypes = {};
  const missing: string[] = [];

  for (const type of personalityTypes) {
    const entry = raw[type.id];
    if (!entry) {
      missing.push(type.id);
      continue;
    }
    const vector: Record<string, number> = {};
    for (const trait of TRAITS) {
      const value = entry[trait];
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`${type.id} の ${trait} が数値でない`);
      }
      if (value < 1 || value > 5) throw new Error(`${type.id} の ${trait} が 1〜5 の外（${value}）`);
      vector[trait] = value;
    }
    prototypes[type.id] = vector as unknown as BigFiveScores;
  }

  if (missing.length > 0) throw new Error(`原型の無いタイプ: ${missing.join(", ")}`);
  const extra = Object.keys(raw).filter((id) => !personalityTypes.some((t) => t.id === id));
  if (extra.length > 0) throw new Error(`知らないタイプID: ${extra.join(", ")}`);
  return prototypes;
};

const template = () => {
  const out: Record<string, Record<string, number | string>> = {};
  for (const type of personalityTypes) {
    out[type.id] = {
      "//": `${typeToken(type)}（${type.typeName}／${type.group}）`,
      ...Object.fromEntries(TRAITS.map((trait) => [trait, 3])),
    };
  }
  console.log(JSON.stringify(out, null, 2));
};

/* ===== 評価器そのものの検査 ===== */

/**
 * 評価器が空振りしていないことを確かめる。
 * 壊れた原型表を渡して、**警告が出ることを確認**してから本番の表を測る。
 * これをやらないと、「警告なし」が「問題なし」なのか「見ていない」なのか区別が付かない。
 */
const selfCheck = (people: BigFiveScores[]) => {
  const flat = Object.fromEntries(
    personalityTypes.map((type) => [
      type.id,
      Object.fromEntries(TRAITS.map((trait) => [trait, 3])) as unknown as BigFiveScores,
    ]),
  );
  const degenerate = evaluate(flat, people, true);
  console.log("① 全タイプの原型を同じ値にした場合");
  console.log(`   警告: ${degenerate.warnings.length} 件`);
  for (const warning of degenerate.warnings) console.log(`     ${warning}`);
  const caught =
    !degenerate.ok &&
    degenerate.warnings.some((w) => w.includes("到達率0")) &&
    degenerate.warnings.some((w) => w.includes("最大の到達率"));
  console.log(`   → ${caught ? "検出できた" : "🔴 検出できていない（評価器が空振りしている）"}`);

  // 5軸に散らした表なら警告が出ないこと（出るなら閾値が厳しすぎる）
  const spread: Prototypes = {};
  personalityTypes.forEach((type, index) => {
    const vector: Record<string, number> = {};
    TRAITS.forEach((trait, axis) => {
      vector[trait] = 2 + ((Math.floor(index / 2 ** axis) + axis) % 3);
    });
    spread[type.id] = vector as unknown as BigFiveScores;
  });
  const spreadResult = evaluate(spread, people, true);
  console.log("\n② 5軸に散らした表の場合（合格させるべき側）");
  console.log(`   警告: ${spreadResult.warnings.length} 件`);
  for (const warning of spreadResult.warnings) console.log(`     ${warning}`);

  console.log(
    `\n判定: ${caught ? "評価器は壊れた表を検出できる" : "🔴 評価器が機能していない"}`,
  );
  if (!caught) process.exit(1);
};

/* ===== 入口 ===== */

const main = () => {
  const arg = process.argv[2];
  if (arg === "--template") {
    template();
    return;
  }

  const people = makePopulation(24000);

  if (arg === "--self-check") {
    console.log("評価器そのものの検査（壊れた表を渡して、警告が出るか）");
    selfCheck(people);
    return;
  }

  if (!arg) {
    console.error("使い方: npx tsx scripts/evaluate-prototypes.ts <原型表.json>");
    console.error("        npx tsx scripts/evaluate-prototypes.ts --template > prototypes.json");
    console.error("        npx tsx scripts/evaluate-prototypes.ts --self-check");
    process.exit(1);
  }

  const prototypes = loadPrototypes(arg);
  console.log(`原型表: ${arg}（24タイプ・5軸を確認）`);
  const result = evaluate(prototypes, people);

  const againstIndex = process.argv.indexOf("--against");
  if (againstIndex > 0 && process.argv[againstIndex + 1]) {
    compare(loadPrototypes(process.argv[againstIndex + 1]), prototypes, people, process.argv[againstIndex + 1]);
  }

  return result;
};

main();
