import { mockProfiles } from "@/data/mock-profiles";
import { Answer, DiagnosisPayload, MatchingResult } from "@/types/diagnosis";

const scoreAnswers = (answers: Answer[]) => {
  return answers.reduce((acc, answer) => acc + answer.value, 0) / answers.length;
};

const mapProfiles = (profiles: MatchingResult["profile"][], baseScore: number) =>
  profiles
    .map((profile, idx) => {
      const compatibilityBoost = profile.animalType.includes("こじか") ? 5 : 0;
      const variance = Math.abs((idx % 10) - baseScore);
      const score = Math.max(
        50,
        100 - variance * 7 + compatibilityBoost + Math.random() * 5
      );

      const summary = `${profile.nickname}さんは${profile.communication}なコミュニケーションと${profile.values}を大切にするスタイル。あなたの診断結果と重ねると、日常の小さな気遣いを共有できる関係になりそう。`;

      return {
        ranking: 0,
        score: Math.min(99, Math.round(score)),
        profile,
        summary,
        compatibility: {
          personality: `${profile.nickname}さんは${profile.communication}タイプ。あなたの診断傾向（平均${baseScore.toFixed(
            1
          )}pt）と組み合わせると、感情面で自然に歩調を合わせられます。`,
          valueAlignment: `${profile.values}に共感できるポイントが多く、長期的に同じ方向を向けそうです。`,
          communication: `${profile.communication}だからこそ、言葉にしづらい気持ちも拾ってくれます。`,
        },
      } satisfies MatchingResult;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, index) => ({ ...item, ranking: index + 1 }));

export const generateMatchingResults = async (
  payload: DiagnosisPayload
): Promise<MatchingResult[]> => {
  const baseScore = scoreAnswers(payload.answers);
  
  const oppositeGender = payload.userGender === "male" ? "female" : "male";
  const filteredProfiles = mockProfiles.filter((profile) => profile.gender === oppositeGender);
  
  return mapProfiles(filteredProfiles, baseScore);
};
