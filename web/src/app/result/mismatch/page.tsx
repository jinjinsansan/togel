"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import { getTogelLabel } from "@/lib/personality";
import { BigFiveScores, MismatchResult, PersonalityTypeDefinition } from "@/types/diagnosis";

const buildFallbackAvatar = (seed: string, gender: "male" | "female"): string => {
  const palette = gender === "male" ? "blue" : "pink";
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodedSeed}&backgroundColor=ffdfbf,bee3db&scale=90&accessoriesProbability=40&hairColor=4a312c,2f1b0f&skinColor=f2d3b1,eac9a1&shapeColor=${palette}`;
};

type LatestDiagnosis = {
  bigFiveScores: BigFiveScores;
  personalityType: PersonalityTypeDefinition;
  narrative: string;
  detailedNarrative: {
    title: string;
    subtitle: string;
    thinkingStyle: string[];
    communicationStyle: string[];
    loveTendency: string[];
    idealPartner: string[];
    warnings: string[];
    strengths: string[];
  };
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

const MismatchResultPage = () => {
  const [results] = useState<MismatchResult[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = sessionStorage.getItem("latestMismatch");
    if (!raw) return [];
    try {
      return JSON.parse(raw) as MismatchResult[];
    } catch (error) {
      console.error("Failed to parse mismatch results", error);
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
    <div className="min-h-screen bg-[linear-gradient(170deg,#15181f,#0d0f14_60%,#1a0e12)]">
      <div className="w-full md:container py-8 md:py-10">
        <div className="mx-auto max-w-5xl">
          {/* ヘッダー */}
          <div className="text-center px-4 md:px-0 mb-8">
            <p className="text-sm font-semibold text-red-400">⚠️ DANGER ZONE</p>
            <h1 className="mt-2 font-heading text-4xl text-white">ミスマッチランキング</h1>
            <p className="mt-3 text-gray-300">
              AIが選んだ、あなたと絶対に合わない5名。付き合ったら地獄確定。
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <Link href="/result">← 通常のマッチング結果を見る</Link>
              </Button>
            </div>
          </div>

          {/* あなたのタイプセクション（簡易版） */}
          {diagnosis?.detailedNarrative && (
            <div className="mb-10 rounded-none md:rounded-3xl border-0 md:border-2 border-gray-700 bg-gray-800/80 px-5 py-6 md:p-6 shadow-none md:shadow-xl">
              <div className="pb-3 md:border-b md:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-gray-400">📊 あなたの性格診断結果</p>
                <h2 className="mt-2 font-heading text-2xl text-white">{diagnosis.detailedNarrative.title}</h2>
                <p className="mt-1 text-base font-medium text-gray-300">{diagnosis.detailedNarrative.subtitle}</p>
              </div>
              <details className="group mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-400 hover:text-gray-300 transition-colors list-none flex items-center justify-between">
                  <span>詳細を見る</span>
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {TRAITS.map((trait) => (
                    <div key={trait} className="flex items-center justify-between rounded-xl bg-gray-700/50 px-4 py-3 border border-gray-600">
                      <span className="text-sm font-medium text-gray-300">{traitLabels[trait]}</span>
                      <span className="text-lg font-bold text-red-400">{diagnosis.bigFiveScores[trait].toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* ミスマッチランキング */}
          <div className="mt-8 space-y-0 md:space-y-8">
            {results.length === 0 && (
              <div className="rounded-none md:rounded-3xl border border-dashed border-gray-600 bg-gray-800/50 px-6 py-12 text-center">
                <p className="text-gray-400">まだ診断結果がありません。</p>
                <Button asChild className="mt-4">
                  <Link href="/diagnosis/select">診断ページへ</Link>
                </Button>
              </div>
            )}

            {results.map((result) => (
              <div
                key={result.profile.id}
                className="rounded-none md:rounded-3xl border-0 md:border-2 md:border-red-900/50 bg-gradient-to-br from-gray-800/80 via-gray-900/80 to-gray-900 px-4 py-6 md:px-6 md:py-6 shadow-none md:shadow-2xl hover:shadow-red-900/20 transition-shadow"
              >
                {/* ヘッダー */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-4 md:border-b md:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative h-24 w-24">
                      <Image
                        src={result.profile.avatarUrl}
                        alt={result.profile.nickname}
                        fill
                        sizes="96px"
                        className="rounded-full border-4 border-red-900/50 object-cover grayscale"
                        onError={(e: SyntheticEvent<HTMLImageElement>) => {
                          const target = e.currentTarget;
                          if (!target.src.includes("dicebear.com")) {
                            target.src = buildFallbackAvatar(result.profile.id, result.profile.gender);
                          }
                        }}
                      />
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-black text-sm">
                        💀
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-3xl font-black text-red-500">#{result.ranking}</span>
                        <span className="text-2xl font-bold text-white">{result.profile.nickname}</span>
                        <span className="text-sm text-gray-400">{result.profile.age}歳</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-red-900/30 text-red-400 px-3 py-1 rounded-full font-semibold border border-red-800">
                          {getTogelLabel(result.personalityTypes.profile.id)}
                        </span>
                        <span className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">{result.profile.job}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-4xl font-black text-red-500">{result.score.toFixed(0)}%</p>
                    <p className="text-xs text-gray-400">ミスマッチ度</p>
                  </div>
                </div>

                {/* キャッチフレーズ */}
                <div className="mt-4 p-4 rounded-2xl bg-red-950/30 md:border md:border-red-900/50">
                  <p className="text-base font-bold text-red-400 text-center flex items-center justify-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    {result.catchphrase}
                  </p>
                </div>

                {/* 💀 この人のヤバい特徴 */}
                {result.profileNarrative && (
                  <div className="mt-4 rounded-2xl bg-gray-800/40 md:border md:border-gray-600 p-5">
                    <h4 className="flex items-center gap-2 text-lg font-bold mb-3 text-white">
                      <span className="text-2xl">💀</span>
                      {result.profile.nickname}のヤバい特徴
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                      {result.profileNarrative.dangerousTraits.map((trait, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">⚠️</span>
                          <span>{trait}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {result.profileNarrative.incompatibleValues.length > 0 && (
                      <div className="mt-3 pt-3 md:border-t md:border-gray-600">
                        <p className="text-xs font-semibold text-gray-400 mb-2">🚫 あなたとは真逆の価値観</p>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {result.profileNarrative.incompatibleValues.map((value, idx) => (
                            <li key={idx}>✗ {value}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.profileNarrative.communicationNightmare && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-400">💬 コミュニケーションの悪夢</p>
                        <p className="mt-1 text-sm text-red-400">{result.profileNarrative.communicationNightmare}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 🚨 なぜミスマッチ？ */}
                {result.mismatchReasons && result.mismatchReasons.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-red-950/30 md:border md:border-red-900/50 p-5">
                    <h4 className="flex items-center gap-2 text-lg font-bold mb-4 text-white">
                      <span className="text-2xl">🚨</span>
                      なぜあなたとミスマッチ？
                    </h4>
                    <div className="space-y-4">
                      {result.mismatchReasons.map((reason, idx) => (
                        <div key={idx} className="rounded-xl bg-gray-800/50 md:border md:border-gray-700 p-4">
                          <p className="font-bold text-base mb-2 text-red-400">{idx + 1}. {reason.title}</p>
                          <div className="space-y-1 text-sm text-gray-400">
                            <p>{reason.userTrait}</p>
                            <p>{reason.profileTrait}</p>
                          </div>
                          <div className="mt-3 pl-4 border-l-4 border-red-600">
                            <p className="text-sm font-bold text-red-500 mb-1">💥 起こる大惨事</p>
                            <p className="text-sm text-gray-200 leading-relaxed">{reason.disaster}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🔥 付き合ったら起こる地獄のシナリオ */}
                {result.disasterScenario && (
                  <div className="mt-4 rounded-2xl bg-orange-950/30 md:border md:border-orange-900/50 p-5">
                    <h4 className="flex items-center gap-2 text-lg font-bold mb-3 text-white">
                      <span className="text-2xl">🔥</span>
                      付き合ったら起こる地獄のシナリオ
                    </h4>
                    
                    {result.disasterScenario.horrorScenarios.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-orange-400 mb-2">💀 最悪の未来</p>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {result.disasterScenario.horrorScenarios.map((scenario, idx) => (
                            <li key={idx}>• {scenario}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.disasterScenario.warnings.length > 0 && (
                      <div className="mt-3 pt-3 md:border-t md:border-orange-900/50">
                        <p className="text-xs font-semibold text-red-500 mb-2">⚠️ 深刻な警告</p>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {result.disasterScenario.warnings.map((warning, idx) => (
                            <li key={idx} className="text-red-400">⚠️ {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 🚫 絶対にやってはいけないこと */}
                {result.absolutelyNotToDo && result.absolutelyNotToDo.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-red-950/40 md:border-2 md:border-red-900 p-5">
                    <h4 className="flex items-center gap-2 text-lg font-bold mb-3 text-white">
                      <span className="text-2xl">🚫</span>
                      絶対にやってはいけないこと
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {result.absolutelyNotToDo.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-500 text-xl">✗</span>
                          <span className="text-gray-200 font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 注意メッセージ */}
                <div className="mt-6 p-4 rounded-xl bg-gray-700/40 md:border md:border-gray-600">
                  <p className="text-sm text-gray-300 text-center">
                    <span className="font-bold text-red-400">AI判定：</span> この組み合わせは避けるべき。時間の無駄。
                  </p>
                </div>

                {/* アクションボタン */}
                <div className="mt-6">
                  <Button
                    asChild
                    className="w-full text-[#E91E63] hover:text-[#F06292]"
                    size="lg"
                    variant="outline"
                  >
                    <Link href={{ pathname: `/profile/${result.profile.id}`, query: { nickname: result.profile.nickname } }}>
                      プロフィール詳細を見る（自己責任） →
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* フッター */}
          <div className="mt-12 text-center px-4 md:px-0">
            <p className="text-sm text-gray-500">
              ※ この診断結果はエンターテイメント目的です。実際の相性は人それぞれです。
            </p>
            <div className="mt-6 flex gap-4 justify-center">
              <Button asChild variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <Link href="/result">通常のマッチング結果</Link>
              </Button>
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                <Link href="/diagnosis/select">もう一度診断する</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MismatchResultPage;
