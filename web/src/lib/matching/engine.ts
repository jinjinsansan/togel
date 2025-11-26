import { mockProfiles } from "@/data/mock-profiles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Answer, DiagnosisPayload, MatchingResult } from "@/types/diagnosis";

type RawUser = {
  id: string;
  nickname: string | null;
  gender: string;
  age: number | null;
  avatar_url: string | null;
  bio: string | null;
  job: string | null;
  favorite_things: string | null;
  hobbies: string | null;
  special_skills: string | null;
};

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
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, nickname, gender, age, avatar_url, bio, job, favorite_things, hobbies, special_skills")
      .eq("is_mock_data", true)
      .limit(200);

    if (error || !data || data.length === 0) {
      throw error ?? new Error("no users available");
    }

    const mappedProfiles = data.map((user: RawUser, index) => ({
      id: user.id,
      nickname: user.nickname ?? `ユーザー${index + 1}`,
      age: user.age ?? 0,
      gender: (user.gender === "male" ? "male" : "female") as "male" | "female",
      avatarUrl:
        user.avatar_url ?? `https://api.dicebear.com/8.x/thumbs/svg?seed=${user.id ?? index}`,
      bio: user.bio ?? "プロフィール更新をお待ちください。",
      job: user.job ?? "未設定",
      favoriteThings: user.favorite_things ?? "未設定",
      hobbies: user.hobbies ?? "未設定",
      specialSkills: user.special_skills ?? "コミュニケーション",
      values: user.favorite_things ?? "思いやりを重視",
      communication: user.special_skills ?? "穏やか",
      interests: user.hobbies ? [user.hobbies] : ["カフェ", "映画"],
      city: "東京都",
      animalType: "こじか-月",
    }));

    return mapProfiles(mappedProfiles, baseScore);
  } catch (error) {
    console.warn("Falling back to mock matching data", error);
    return mapProfiles(mockProfiles, baseScore);
  }
};
