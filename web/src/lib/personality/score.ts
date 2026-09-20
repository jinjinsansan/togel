import { questions as allQuestions } from "@/data/questions";
import type { Answer, BigFiveScores } from "@/types/diagnosis";

/**
 * 回答から5軸の素点を出す。
 *
 * 採点だけを独立させてあるのは、DBにも外部サービスにも触らずに呼べるようにするため。
 * 以前は matching/engine.ts の中にあり、Supabase の環境変数が無いと読み込めなかった。
 * 診断の土台なので、単体で動かして確かめられる場所に置く。
 */

const TRAITS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const;

type TraitKey = (typeof TRAITS)[number];

/** 設問をIDで引く表。light と full の同一IDは同じ設問（full は light を再タグ付けして含む） */
const questionById = new Map(allQuestions.map((question) => [question.id, question]));

export function calculateBigFiveScores(answers: Answer[]): BigFiveScores {
  const totals: Record<TraitKey, { sum: number; count: number }> = {
    openness: { sum: 0, count: 0 },
    conscientiousness: { sum: 0, count: 0 },
    extraversion: { sum: 0, count: 0 },
    agreeableness: { sum: 0, count: 0 },
    neuroticism: { sum: 0, count: 0 },
  };

  answers.forEach((answer) => {
    const question = questionById.get(answer.questionId);
    if (!question) return; // 現行の設問に無いID（過去の回答など）は数えない
    const trait = question.trait;
    totals[trait].sum += question.reverse ? 6 - answer.value : answer.value;
    totals[trait].count += 1;
  });

  return TRAITS.reduce<BigFiveScores>((scores, trait) => {
    const { sum, count } = totals[trait];
    return {
      ...scores,
      [trait]: count === 0 ? 3 : Number((sum / count).toFixed(2)),
    };
  }, {
    openness: 3,
    conscientiousness: 3,
    extraversion: 3,
    agreeableness: 3,
    neuroticism: 3,
  });
}
