"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo, SyntheticEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { RecommendationsSection } from "@/components/recommendations/recommendations-section";
import { getTogelLabel } from "@/lib/personality";
import { BigFiveScores, MatchingResult, PersonalityTypeDefinition } from "@/types/diagnosis";
import { Switch } from "@/components/ui/switch";

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

// 追加: マッチングカードをコンポーネントとして分離
const MatchingCard = ({ result, isFeatured = false }: { result: MatchingResult; isFeatured?: boolean }) => {
  return (
    <div
      className={`rounded-none md:rounded-3xl border-b-8 md:border-2 border-muted/20 md:border-border bg-white/95 px-5 py-8 md:p-6 shadow-none md:shadow-lg hover:shadow-xl transition-shadow ${
        result.isPrank ? "ring-4 ring-[#E91E63]/30 border-[#E91E63]" : 
        isFeatured ? "border-yellow-400 ring-4 ring-yellow-400/20" : ""
      }`}
    >
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative h-24 w-24">
            <Image
              src={result.profile.avatarUrl}
              alt={result.profile.nickname}
              fill
              sizes="96px"
              className={`rounded-full border-4 ${isFeatured ? "border-yellow-400" : "border-[#FFD1DC]"} object-cover`}
              onError={(e: SyntheticEvent<HTMLImageElement>) => {
                const target = e.currentTarget;
                if (!target.src.includes("dicebear.com")) {
                  target.src = buildFallbackAvatar(result.profile.id, result.profile.gender);
                }
              }}
            />
             {isFeatured && (
               <div className="absolute -top-2 -right-2 bg-yellow-400 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                 PICK UP
               </div>
             )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isFeatured ? (
                 <span className="text-xl font-black text-yellow-500 flex items-center gap-1">
                   <span className="text-2xl">✨</span> SPECIAL
                 </span>
              ) : (
                 <span className="text-3xl font-black text-primary">#{result.ranking}</span>
              )}
              <span className="text-2xl font-bold">{result.profile.nickname}</span>
              <span className="text-sm text-muted-foreground">{result.profile.age}歳</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold">
                {getTogelLabel(result.personalityTypes.profile.id)}
              </span>
              <span className="text-xs bg-muted px-3 py-1 rounded-full">{result.profile.job}</span>
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-4xl font-black text-primary">{result.compatibility.total}%</p>
          <p className="text-xs text-muted-foreground">マッチ度</p>
        </div>
      </div>

      {/* キャッチフレーズ */}
      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#ffe9f0] to-[#eef4ff] border border-primary/20">
        <p className="text-base font-extrabold text-foreground text-center">
          {result.catchphrase}
        </p>
      </div>

      {/* 👤 この人ってこんな人 */}
      {result.profileNarrative && (
        <div className="mt-4 rounded-2xl bg-blue-50 p-5">
          <h4 className="flex items-center gap-2 text-lg font-bold mb-3">
            <span className="text-2xl">👤</span>
            {result.profile.nickname}ってこんな人
          </h4>
          <ul className="space-y-2 text-sm">
            {result.profileNarrative.personalityTraits.map((trait, idx) => (
              <li key={idx}>• {trait}</li>
            ))}
          </ul>
          
          {result.profileNarrative.values.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs font-semibold text-muted-foreground mb-2">こういう価値観</p>
              <ul className="space-y-1 text-sm">
                {result.profileNarrative.values.map((value, idx) => (
                  <li key={idx}>✓ {value}</li>
                ))}
              </ul>
            </div>
          )}

          {result.profileNarrative.communicationStyle && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground">💬 話し方</p>
              <p className="mt-1 text-sm">{result.profileNarrative.communicationStyle}</p>
            </div>
          )}
        </div>
      )}

      {/* 🤖 なぜあなたとマッチ？ */}
      {result.matchingReasons && result.matchingReasons.length > 0 && (
        <div className="mt-4 rounded-2xl bg-purple-50 p-5">
          <h4 className="flex items-center gap-2 text-lg font-bold mb-4">
            <span className="text-2xl">🤖</span>
            なぜあなたとマッチ？
          </h4>
          <div className="space-y-4">
            {result.matchingReasons.map((reason, idx) => (
              <div key={idx} className="rounded-xl bg-white/70 p-4">
                <p className="font-bold text-base mb-2">{idx + 1}. {reason.title}</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{reason.userTrait}</p>
                  <p>{reason.profileTrait}</p>
                </div>
                <div className="mt-2 pl-4 border-l-4 border-primary/30">
                  <p className="text-sm font-medium">💡 なぜ相性がいい？</p>
                  <p className="mt-1 text-sm text-foreground">{reason.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💭 付き合ったらこんな感じ */}
      {result.relationshipPreview && (
        <div className="mt-4 rounded-2xl bg-green-50 p-5">
          <h4 className="flex items-center gap-2 text-lg font-bold mb-3">
            <span className="text-2xl">💭</span>
            付き合ったらこんな感じ
          </h4>
          
          {result.relationshipPreview.goodPoints.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2">✅ 良いところ</p>
              <ul className="space-y-1 text-sm">
                {result.relationshipPreview.goodPoints.map((point, idx) => (
                  <li key={idx}>• {point}</li>
                ))}
              </ul>
            </div>
          )}

          {result.relationshipPreview.warnings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-xs font-semibold text-orange-700 mb-2">⚠️ 気をつけること</p>
              <ul className="space-y-1 text-sm">
                {result.relationshipPreview.warnings.map((warning, idx) => (
                  <li key={idx}>⚠️ {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 💡 最初のデートはこれで */}
      {result.firstDateSuggestion && (
        <details className="group mt-4">
          <summary className="cursor-pointer rounded-2xl bg-yellow-50 px-5 py-4 font-semibold hover:bg-yellow-100 transition-colors list-none flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-2xl">💡</span>
              最初のデート、どうする？
            </span>
            <span className="group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-3 space-y-3">
            {result.firstDateSuggestion.recommendations.length > 0 && (
              <div className="rounded-xl bg-white/70 p-4">
                <p className="text-sm font-bold text-muted-foreground mb-2">【おすすめ】</p>
                {result.firstDateSuggestion.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-sm">{rec}</p>
                ))}
              </div>
            )}

            {result.firstDateSuggestion.conversationTopics.length > 0 && (
              <div className="rounded-xl bg-white/70 p-4">
                <p className="text-sm font-bold text-muted-foreground mb-2">💬 会話ネタ</p>
                <ul className="space-y-1 text-sm">
                  {result.firstDateSuggestion.conversationTopics.map((topic, idx) => (
                    <li key={idx}>• {topic}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.firstDateSuggestion.ngActions.length > 0 && (
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700 mb-2">🚫 絶対NG行動</p>
                <ul className="space-y-1 text-sm">
                  {result.firstDateSuggestion.ngActions.map((ng, idx) => (
                    <li key={idx}>✗ {ng}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* アクションボタン */}
      <div className="mt-6">
        <Button asChild className="w-full" size="lg">
          <Link href={{ pathname: `/profile/${result.profile.id}`, query: { nickname: result.profile.nickname } }}>
            プロフィール詳細を見る →
          </Link>
        </Button>
      </div>
    </div>
  );
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

type MatchMode = "opposite" | "same";

const MATCH_STORAGE_KEYS: Record<MatchMode, string> = {
  opposite: "latestMatching:opposite",
  same: "latestMatching:same",
};

const ResultPage = () => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const clearSessionCaches = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem("latestMatching");
      sessionStorage.removeItem(MATCH_STORAGE_KEYS.opposite);
      sessionStorage.removeItem(MATCH_STORAGE_KEYS.same);
      sessionStorage.removeItem("latestDiagnosis");
      sessionStorage.removeItem("latestMismatch");
      sessionStorage.removeItem("latestFeatured");
    } catch (err) {
      console.warn("Failed to clear session caches", err);
    }
  }, []);
  const getStoredResults = useCallback((mode: MatchMode): MatchingResult[] => {
    if (typeof window === "undefined") return [];
    const raw = sessionStorage.getItem(MATCH_STORAGE_KEYS[mode]) ?? (mode === "opposite" ? sessionStorage.getItem("latestMatching") : null);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as MatchingResult[];
    } catch (error) {
      console.error("Failed to parse matching results", error);
      return [];
    }
  }, []);

  const [matchMode, setMatchMode] = useState<MatchMode>("opposite");
  const [results, setResults] = useState<MatchingResult[]>(() => getStoredResults("opposite"));

  const [diagnosis, setDiagnosis] = useState<LatestDiagnosis | null>(() => {
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

  const [isInitialLoading, setIsInitialLoading] = useState(() => results.length === 0 || !diagnosis);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prankMode, setPrankMode] = useState(true);
  const [hasPrank, setHasPrank] = useState(false);
  
  // PickUpユーザー
  const [featuredResult, setFeaturedResult] = useState<MatchingResult | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("latestFeatured");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MatchingResult;
    } catch {
      return null;
    }
  });

  const persistSessionPayload = useCallback((payload: {
    results?: MatchingResult[];
    diagnosis?: LatestDiagnosis | null;
    mismatchResults?: unknown;
    featuredResult?: MatchingResult | null;
    mode?: MatchMode;
  }) => {
    if (typeof window === "undefined") return;
    if (payload.results) {
      const mode = payload.mode ?? "opposite";
      sessionStorage.setItem(MATCH_STORAGE_KEYS[mode], JSON.stringify(payload.results));
    }
    if (payload.diagnosis) {
      sessionStorage.setItem("latestDiagnosis", JSON.stringify(payload.diagnosis));
    }
    if (payload.mode !== "same" && payload.mismatchResults) {
      sessionStorage.setItem("latestMismatch", JSON.stringify(payload.mismatchResults));
    }
    if (payload.mode !== "same" && payload.featuredResult) {
      sessionStorage.setItem("latestFeatured", JSON.stringify(payload.featuredResult));
    }
  }, []);

  const fetchLatest = useCallback(
    async ({ skipLoading = false, forceFresh = false, mode = "opposite" as MatchMode } = {}) => {
      if (skipLoading) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const params = new URLSearchParams();
        params.set(forceFresh ? "fresh" : "revalidate", "1");
        if (mode === "same") {
          params.set("targetGender", "same");
        }
        const res = await fetch(`/api/diagnosis/latest?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();

        if (data.results && data.diagnosis) {
          setResults(data.results);
          if (mode === "opposite") {
            setFeaturedResult(data.featuredResult ?? null);
          } else {
            setFeaturedResult(null);
          }
          setDiagnosis(data.diagnosis);
          persistSessionPayload({
            results: data.results,
            diagnosis: data.diagnosis,
            mismatchResults: data.mismatchResults,
            featuredResult: data.featuredResult,
            mode,
          });
          if (Array.isArray(data.results)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prankData = data.results.some((r: any) => r.isPrank);
            setHasPrank(prankData);
          }
        }
      } catch (error) {
        console.error("Failed to fetch latest diagnosis", error);
      } finally {
        if (skipLoading) {
          setIsRefreshing(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [persistSessionPayload]
  );

  const initialFetchTriggered = useRef(false);
  useEffect(() => {
    if (initialFetchTriggered.current) return;
    initialFetchTriggered.current = true;
    const hasCachedData = results.length > 0 && Boolean(diagnosis);
    fetchLatest({ skipLoading: hasCachedData, mode: "opposite" });
  }, [fetchLatest, results.length, diagnosis]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearSessionCaches();
        setResults([]);
        setDiagnosis(null);
        setFeaturedResult(null);
        setHasPrank(false);
      }

      if (event === "SIGNED_IN" && session?.user) {
        setIsRefreshing(true);
        fetchLatest({ skipLoading: true, forceFresh: true, mode: matchMode })
          .catch((error) => console.error("Retry fetch after sign-in failed", error))
          .finally(() => setIsRefreshing(false));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchLatest, clearSessionCaches, matchMode]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prankData = results.some((r: any) => r.isPrank);
    setHasPrank(prankData);
  }, [results]);

  const handleManualRefresh = () => {
    const hasCachedData = results.length > 0 && Boolean(diagnosis);
    fetchLatest({ skipLoading: hasCachedData, forceFresh: true, mode: matchMode });
  };

  const handleMatchModeToggle = () => {
    const nextMode: MatchMode = matchMode === "opposite" ? "same" : "opposite";
    setMatchMode(nextMode);
    const cached = getStoredResults(nextMode);
    if (cached.length > 0) {
      setResults(cached);
      if (nextMode === "opposite") {
        const featuredRaw = typeof window !== "undefined" ? sessionStorage.getItem("latestFeatured") : null;
        if (featuredRaw) {
          try {
            setFeaturedResult(JSON.parse(featuredRaw) as MatchingResult);
          } catch {
            setFeaturedResult(null);
          }
        } else {
          setFeaturedResult(null);
        }
      } else {
        setFeaturedResult(null);
      }
      return;
    }
    fetchLatest({ skipLoading: results.length > 0, forceFresh: true, mode: nextMode });
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#E91E63]"></div>
      </div>
    );
  }

  // Prank mode filtering:
  // If hasPrank is true and prankMode is true, show the prank result at rank 1.
  // If hasPrank is true and prankMode is false, filter out the prank result (marked with isPrank).
  // If hasPrank is false, show original results.
  
  const displayResults = results.filter(r => {
    if (!hasPrank) return true;
    if (r.isPrank) return prankMode;
    return true;
  }).map((r, idx) => ({
    ...r,
    ranking: idx + 1
  }));

  return (
    <div className="min-h-screen w-full bg-[#fdeef4] py-6 md:py-10">
      <div className="mx-auto max-w-5xl px-0 md:px-6">
        <div className="text-center px-4 md:px-0">
          <p className="text-xs font-extrabold tracking-[0.2em] text-primary">STEP 2 · RESULT</p>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl">マッチング結果</h1>
          <p className="mt-3 text-sm md:text-base text-muted-foreground">
            あなたの回答データから相性の良い5名を抽出しました
          </p>
          {results.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="inline-flex items-center gap-1 text-primary hover:underline"
                disabled={isRefreshing}
              >
                {isRefreshing ? "更新中..." : "最新状態を取得"}
              </button>
              {isRefreshing && <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
            </div>
          )}
          
          {hasPrank && (
            <div className="mt-4 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
               <span className={`text-sm font-bold ${!prankMode ? "text-primary" : "text-muted-foreground"}`}>通常モード</span>
               <Switch checked={prankMode} onCheckedChange={setPrankMode} />
               <span className={`text-sm font-bold ${prankMode ? "text-[#E91E63]" : "text-muted-foreground"}`}>運命モード</span>
            </div>
          )}

          <div className="mt-4 flex flex-col items-center gap-3">
            {matchMode === "opposite" && (
              <Button asChild variant="outline" size="sm" className="gap-2 border-red-600 text-red-600 hover:bg-red-50">
                <Link href="/result/mismatch">
                  <span className="text-lg">💀</span>
                  ミスマッチランキングも見る
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleMatchModeToggle}
            >
              {matchMode === "opposite" ? "同性のマッチング結果も見る" : "異性マッチングに戻る"}
            </Button>
          </div>
        </div>

        {/* あなたのタイプセクション - 新デザイン */}
        {diagnosis?.detailedNarrative && (
          <div className="mt-6 md:mt-10 rounded-none md:rounded-3xl border-0 md:border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-white to-secondary/5 p-5 md:p-8 shadow-none md:shadow-lg">
            <div className="border-b border-primary/20 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.4em] text-primary">📊 あなたの性格診断結果</p>
              <h2 className="mt-2 font-heading text-2xl md:text-3xl">{diagnosis.detailedNarrative.title}</h2>
              <p className="mt-1 text-base md:text-lg font-medium text-foreground">{diagnosis.detailedNarrative.subtitle}</p>
            </div>

            {/* 🎯 あなたってこんな人 */}
            <div className="mt-6 rounded-2xl bg-white/70 p-5 md:p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <span className="text-2xl">🎯</span>
                あなたってこんな人
              </h3>
              
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">💡 考え方のクセ</p>
                  <ul className="mt-2 space-y-1 text-base">
                    {diagnosis.detailedNarrative.thinkingStyle.map((text, idx) => (
                      <li key={idx}>• {text}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground">💬 コミュニケーションスタイル</p>
                  <ul className="mt-2 space-y-1 text-base">
                    {diagnosis.detailedNarrative.communicationStyle.map((text, idx) => (
                      <li key={idx}>• {text}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ⚡ 得意技 */}
            {diagnosis.detailedNarrative.strengths.length > 0 && (
              <div className="mt-4 rounded-2xl bg-green-50 p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <span className="text-2xl">⚡</span>
                  あなたの得意技
                </h3>
                <ul className="mt-3 space-y-1 text-base">
                  {diagnosis.detailedNarrative.strengths.map((strength, idx) => (
                    <li key={idx}>✓ {strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ⚠️ 要注意ポイント */}
            {diagnosis.detailedNarrative.warnings.length > 0 && (
              <div className="mt-4 rounded-2xl bg-orange-50 p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <span className="text-2xl">⚠️</span>
                  あなたの要注意ポイント
                </h3>
                <ul className="mt-3 space-y-1 text-base">
                  {diagnosis.detailedNarrative.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 💑 恋愛になるとこうなる */}
            {diagnosis.detailedNarrative.loveTendency.length > 0 && (
              <div className="mt-4 rounded-2xl bg-pink-50 p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <span className="text-2xl">💑</span>
                  恋愛になるとこうなる
                </h3>
                <ul className="mt-3 space-y-1 text-base">
                  {diagnosis.detailedNarrative.loveTendency.map((text, idx) => (
                    <li key={idx}>• {text}</li>
                  ))}
                </ul>

                {diagnosis.detailedNarrative.idealPartner.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-muted-foreground">💕 求めてるのはこんな相手</p>
                    <ul className="mt-2 space-y-1 text-base">
                      {diagnosis.detailedNarrative.idealPartner.map((text, idx) => (
                        <li key={idx}>→ {text}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Big Five スコア表示 */}
            <details className="group mt-4">
              <summary className="cursor-pointer rounded-2xl bg-muted/40 px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/60 transition-colors list-none flex items-center justify-between">
                <span>詳細スコアを見る</span>
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {TRAITS.map((trait) => (
                  <div key={trait} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 border border-border">
                    <span className="text-sm font-medium">{traitLabels[trait]}</span>
                    <span className="text-lg font-bold text-primary">{diagnosis.bigFiveScores[trait].toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* マッチング結果 - 新デザイン */}
        <div className="mt-0 md:mt-10 space-y-0 md:space-y-8">
          {displayResults.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
              <p className="text-muted-foreground">まだ診断結果がありません。まずは診断を実施しましょう。</p>
              <Button asChild className="mt-4">
                <Link href="/diagnosis/select">診断ページへ</Link>
              </Button>
            </div>
          )}

          {displayResults.map((result) => (
            <MatchingCard key={result.profile.id} result={result} />
          ))}

          {/* PickUp ユーザー (5位の下) */}
          {featuredResult && (
             <div className="mt-12">
               <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                 <span className="text-2xl animate-pulse">✨</span>
                 <h3 className="font-bold text-xl text-slate-700">Special Pick Up</h3>
                 <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded border border-yellow-200">期間限定</span>
               </div>
               <MatchingCard result={featuredResult} isFeatured={true} />
             </div>
          )}
        </div>

        <RecommendationsSection
          togelType={diagnosis?.personalityType?.id}
          page="result"
          heading={diagnosis?.personalityType?.typeName ? `${diagnosis.personalityType.typeName}型のあなたにおすすめ` : undefined}
          subheading="あなたの診断データに合わせてキュレーションされた注目サービス"
        />

        {/* 下部ミスマッチ結果リンク */}
        {matchMode === "opposite" && results.length > 0 && (
          <div className="mt-12 text-center px-4">
            <p className="mb-4 text-muted-foreground">
              相性の悪い相手も知っておくと、失敗を避けられるかも...？
            </p>
            <Button asChild variant="outline" size="lg" className="gap-2 border-red-600 text-red-600 hover:bg-red-50">
              <Link href="/result/mismatch">
                <span className="text-lg">💀</span>
                ミスマッチランキングも見る
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPage;
