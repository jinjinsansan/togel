"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import { getTogelLabel } from "@/lib/personality";
import { BigFiveScores, MatchingResult, PersonalityTypeDefinition } from "@/types/diagnosis";

const buildFallbackAvatar = (seed: string, gender: "male" | "female"): string => {
  const palette = gender === "male" ? "blue" : "pink";
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodedSeed}&backgroundColor=ffdfbf,bee3db&scale=90&accessoriesProbability=40&hairColor=4a312c,2f1b0f&skinColor=f2d3b1,eac9a1&shapeColor=${palette}`;
};

type LatestDiagnosis = {
  bigFiveScores: BigFiveScores;
  personalityType: PersonalityTypeDefinition;
  narrative: string;
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
              <div className="space-y-3">
                <div>
                  <h2 className="font-heading text-2xl">{getTogelLabel(diagnosis.personalityType.id)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {diagnosis.personalityType.description}
                  </p>
                </div>
                <p className="text-base leading-relaxed text-foreground">{diagnosis.narrative}</p>
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
              className="flex flex-col rounded-3xl border border-border bg-white/90 p-6 shadow-card hover:shadow-lg transition-shadow"
            >
              {/* ヘッダー部分 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20">
                    <Image
                      src={result.profile.avatarUrl}
                      alt={result.profile.nickname}
                      fill
                      sizes="80px"
                      className="rounded-full border-2 border-primary/20 object-cover"
                      onError={(e: SyntheticEvent<HTMLImageElement>) => {
                        const target = e.currentTarget;
                        if (!target.src.includes("dicebear.com")) {
                          target.src = buildFallbackAvatar(result.profile.id, result.profile.gender);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold text-primary">#{result.ranking}</span>
                      <span className="text-xl font-semibold">{result.profile.nickname}</span>
                      <span className="text-sm text-muted-foreground">{result.profile.age}歳</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {getTogelLabel(result.personalityTypes.profile.id)}
                      </span>
                      <span className="text-xs text-muted-foreground">{result.profile.job}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{result.compatibility.total}%</p>
                  <p className="text-xs text-muted-foreground">マッチ度</p>
                </div>
              </div>

              {/* キャッチコピー */}
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <p className="text-base font-medium text-foreground leading-relaxed">
                  {result.catchphrase}
                </p>
              </div>

              {/* アイコン付き情報 */}
              <div className="grid gap-3 mb-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                  <span className="text-2xl">🎯</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">初デート提案</p>
                    <p className="text-sm text-foreground">{result.dateIdea}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">共通点</p>
                    <ul className="text-sm text-foreground space-y-1">
                      {result.commonalities.map((item) => (
                        <li key={item}>・{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                  <span className="text-2xl">💬</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">会話のきっかけ</p>
                    <ul className="text-sm text-foreground space-y-1">
                      {result.conversationStarters.map((starter) => (
                        <li key={starter}>・{starter}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 既存の詳細情報（折りたたみ可能に） */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors list-none flex items-center justify-between p-2">
                  <span>詳細な相性分析を見る</span>
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 space-y-3 pt-3 border-t border-border">
                {result.highlights.length > 0 && (
                  <div className="mt-2 rounded-2xl bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Match Points</p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                      {result.highlights.map((highlight) => (
                        <li key={highlight}>・{highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
                </div>
              </details>

              {/* アクションボタン */}
              <div className="mt-4">
                <Button asChild className="w-full" size="lg">
                  <Link href={`/profile/${result.profile.id}`}>プロフィールを見る</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
