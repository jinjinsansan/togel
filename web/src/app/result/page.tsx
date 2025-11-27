"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getTogelLabel } from "@/lib/personality";
import { BigFiveScores, MatchingResult, PersonalityTypeDefinition } from "@/types/diagnosis";

type LatestDiagnosis = {
  bigFiveScores: BigFiveScores;
  personalityType: PersonalityTypeDefinition;
};

const traitLabels: Record<keyof BigFiveScores, string> = {
  openness: "アイデア感度",
  conscientiousness: "計画遂行力",
  extraversion: "交流エネルギー",
  agreeableness: "共感スタイル",
  neuroticism: "ストレス耐性",
};

const TRAITS: (keyof BigFiveScores)[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
];

const ResultPage = () => {
  const [results] = useState<MatchingResult[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = sessionStorage.getItem("latestMatching");
    if (!raw) return [];
    try {
      return JSON.parse(raw) as MatchingResult[];
    } catch (error) {
      console.error("Failed to parse matching results", error);
      return [];
    }
  });

  const [diagnosis] = useState<LatestDiagnosis | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("latestDiagnosis");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LatestDiagnosis;
    } catch (error) {
      console.error("Failed to parse diagnosis", error);
      return null;
    }
  });

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">STEP 2</p>
          <h1 className="mt-2 font-heading text-4xl">マッチング結果</h1>
          <p className="mt-3 text-muted-foreground">
            あなたの回答データから相性の良い5名を抽出しました。カードをクリックすると詳細プロフィールを確認できます。
          </p>
        </div>

        {diagnosis && (
          <div className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">あなたのタイプ</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-heading text-2xl">{getTogelLabel(diagnosis.personalityType.id)}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getTogelLabel(diagnosis.personalityType.id)}の特徴：{diagnosis.personalityType.description}
                </p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                {TRAITS.map((trait) => (
                  <div key={trait} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                    <span>{traitLabels[trait]}</span>
                    <span className="font-semibold text-foreground">{diagnosis.bigFiveScores[trait].toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-6">
          {results.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
              <p className="text-muted-foreground">まだ診断結果がありません。まずは診断を実施しましょう。</p>
              <Button asChild className="mt-4">
                <Link href="/diagnosis/select">診断ページへ</Link>
              </Button>
            </div>
          )}

          {results.map((result) => (
            <div
              key={result.profile.id}
              className="flex flex-col rounded-3xl border border-border bg-white/90 p-6 shadow-card lg:flex-row"
            >
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-primary">#{result.ranking}</span>
                    <div>
                      <p className="text-sm text-muted-foreground">マッチングスコア</p>
                      <p className="text-2xl font-semibold">{result.compatibility.total}%</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
                    {getTogelLabel(result.personalityTypes.profile.id)}
                  </div>
                </div>
                <p className="text-lg font-semibold">{result.profile.nickname} さん ({result.profile.age}歳)</p>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    { label: "性格", value: result.compatibility.personality },
                    { label: "価値観", value: result.compatibility.valueAlignment },
                    { label: "コミュニケーション", value: result.compatibility.communication },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-muted/60 p-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.label}</span>
                        <span>{item.value}点</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                  <p className="font-semibold text-foreground">インサイト</p>
                  {result.insights.strengths.length > 0 && (
                    <div className="mt-2 text-muted-foreground">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em]">Strength</p>
                      <ul className="mt-1 space-y-1">
                        {result.insights.strengths.map((strength) => (
                          <li key={strength}>・{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.insights.growthAreas.length > 0 && (
                    <div className="mt-3 text-muted-foreground">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em]">Growth</p>
                      <ul className="mt-1 space-y-1">
                        {result.insights.growthAreas.map((growth) => (
                          <li key={growth}>・{growth}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.insights.relationshipStyle && (
                    <p className="mt-3 text-muted-foreground">{result.insights.relationshipStyle}</p>
                  )}
                  {result.insights.challenges.length > 0 && (
                    <div className="mt-3 text-muted-foreground">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em]">Challenge</p>
                      <ul className="mt-1 space-y-1">
                        {result.insights.challenges.map((challenge) => (
                          <li key={challenge}>・{challenge}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <Button asChild variant="secondary" className="w-fit">
                  <Link href={`/profile/${result.profile.id}`}>プロフィールを見る</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-col items-center gap-4 lg:mt-0 lg:w-64">
                <div className="relative h-32 w-32">
                  <Image
                    src={result.profile.avatarUrl}
                    alt={result.profile.nickname}
                    fill
                    sizes="128px"
                    className="rounded-full border border-border object-cover"
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p>{result.profile.job}</p>
                  <p>{result.profile.city}</p>
                  <p className="text-primary">あなた: {getTogelLabel(result.personalityTypes.user.id)}</p>
                  <p>相手: {getTogelLabel(result.personalityTypes.profile.id)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
