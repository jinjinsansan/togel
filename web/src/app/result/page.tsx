"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GroupBadge } from "@/components/brand/group-badge";
import { HandbookShare } from "@/components/share/handbook-share";
import { RecommendationsSection } from "@/components/recommendations/recommendations-section";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { trackLineCta } from "@/lib/analytics/events";
import { personalityTypes, typeToken } from "@/lib/personality";
import { storyLabelHref } from "@/lib/share/story-label";
import { handbookPostText } from "@/lib/share/text";
import { TOGEL_INDEX, togelIndexPercent } from "@/lib/personality/togel-index";
import { generateDeepNarrative } from "@/lib/personality/narrative";
import {
  TYPE_PROFILE_HEADING,
  typeProfileFor,
  typeProfileParagraphs,
} from "@/lib/personality/copy/type-profile";
import { DeepNarrativeSection } from "@/components/result/deep-narrative-section";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import {
  BigFiveScores,
  MatchingResult,
  MismatchResult,
  PersonalityTypeDefinition,
} from "@/types/diagnosis";

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

type MatchMode = "opposite" | "same";
type TabKey = "personality" | "mismatch" | "best";

const MATCH_STORAGE_KEYS: Record<MatchMode, string> = {
  opposite: "latestMatching:opposite",
  same: "latestMatching:same",
};

// トゥゲル診断の5つの取扱指標（lib/personality/togel-index.ts で一元管理）

const findExtended = (typeId: string | undefined): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === typeId) ?? null;

const getStoredResults = (mode: MatchMode): MatchingResult[] => {
  if (typeof window === "undefined") return [];
  const raw =
    sessionStorage.getItem(MATCH_STORAGE_KEYS[mode]) ??
    (mode === "opposite" ? sessionStorage.getItem("latestMatching") : null);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MatchingResult[];
  } catch {
    return [];
  }
};

const ResultPage = () => {
  const [tab, setTab] = useState<TabKey>("personality");
  const [mode, setMode] = useState<MatchMode>("opposite");
  const [results, setResults] = useState<MatchingResult[]>(() => getStoredResults("opposite"));
  const [mismatchResults, setMismatchResults] = useState<MismatchResult[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = sessionStorage.getItem("latestMismatch");
    if (!raw) return [];
    try {
      return JSON.parse(raw) as MismatchResult[];
    } catch {
      return [];
    }
  });
  const [diagnosis, setDiagnosis] = useState<LatestDiagnosis | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("latestDiagnosis");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LatestDiagnosis;
    } catch {
      return null;
    }
  });

  const [isInitialLoading, setIsInitialLoading] = useState(() => !diagnosis);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const supabase = createSupabaseBrowserClient();

  // ログアウト時はキャッシュを破棄する
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(MATCH_STORAGE_KEYS.opposite);
        sessionStorage.removeItem(MATCH_STORAGE_KEYS.same);
        sessionStorage.removeItem("latestMatching");
        sessionStorage.removeItem("latestMismatch");
        sessionStorage.removeItem("latestDiagnosis");
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchLatest = useCallback(
    async ({ skipLoading = false, forceFresh = false, fetchMode = "opposite" as MatchMode } = {}) => {
      if (skipLoading) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }
      try {
        const params = new URLSearchParams();
        params.set(forceFresh ? "fresh" : "revalidate", "1");
        if (fetchMode === "same") {
          params.set("targetGender", "same");
        }
        const res = await fetch(`/api/diagnosis/latest?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.results && data.diagnosis) {
          setResults(data.results);
          setDiagnosis(data.diagnosis);
          sessionStorage.setItem(MATCH_STORAGE_KEYS[fetchMode], JSON.stringify(data.results));
          sessionStorage.setItem("latestDiagnosis", JSON.stringify(data.diagnosis));
          if (fetchMode !== "same" && data.mismatchResults) {
            setMismatchResults(data.mismatchResults);
            sessionStorage.setItem("latestMismatch", JSON.stringify(data.mismatchResults));
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
    [],
  );

  const initialFetchTriggered = useRef(false);
  useEffect(() => {
    if (initialFetchTriggered.current) return;
    initialFetchTriggered.current = true;
    void fetchLatest({ skipLoading: !!diagnosis });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeChange = (nextMode: MatchMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    const cached = getStoredResults(nextMode);
    if (cached.length > 0) {
      setResults(cached);
      void fetchLatest({ skipLoading: true, fetchMode: nextMode });
    } else {
      void fetchLatest({ fetchMode: nextMode });
    }
  };

  const selfType = findExtended(diagnosis?.personalityType?.id);

  // ミスマッチをタイプ単位に整形（ミスマッチページと同じ規則）
  const worstTypeEntries = useMemo(() => {
    const seen = new Set<string>();
    const entries: {
      rank: number;
      score: number;
      type: ExtendedPersonalityTypeDefinition;
      blurb: string;
    }[] = [];
    for (const result of mismatchResults) {
      const extended = findExtended(result.personalityTypes?.profile?.id);
      if (!extended || seen.has(extended.id)) continue;
      seen.add(extended.id);
      entries.push({
        rank: entries.length + 1,
        score: Math.round(result.score),
        type: extended,
        blurb: result.mismatchReasons?.[0]?.disaster ?? extended.description,
      });
    }
    return entries.slice(0, 5);
  }, [mismatchResults]);

  const tabClass = (key: TabKey) =>
    `min-h-[42px] flex-none rounded-full border px-4 text-xs font-black transition-colors ${
      tab === key
        ? "border-primary bg-primary text-ink"
        : "border-line bg-transparent text-txt-muted hover:text-white"
    }`;

  if (isInitialLoading && !diagnosis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink">
        <div className="w-[200px] overflow-hidden rounded-full">
          <div className="animate-marquee h-[10px] w-[400%] bg-hazard" />
        </div>
        <p className="text-xs font-bold text-txt-subtle">回答を読んでいます…</p>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-white">
        <p className="text-sm font-bold text-txt-muted">まだ診断結果がありません。</p>
        <Link
          href="/diagnosis/select"
          className="flex min-h-[52px] items-center rounded-full bg-hazard px-7 text-sm font-black text-ink shadow-cta transition-colors hover:bg-white"
        >
          診断をはじめる
        </Link>
      </div>
    );
  }

  const scores = diagnosis.bigFiveScores;
  // 本文が5種そろうまでは null。節ごと出さない
  const deepNarrative = generateDeepNarrative(scores);
  // タイプ固定の本文。24タイプそろうまで null
  const typeProfile = selfType ? typeProfileFor(selfType.id) : null;

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* ヒーロー: あなたのタイプ */}
      <section
        className="bg-[radial-gradient(120%_90%_at_50%_-20%,rgba(11,31,58,.9),transparent_60%)] px-5.5 pb-[26px] pt-8"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto grid max-w-[1120px] items-center gap-6 md:grid-cols-2">
          <div>
            <div className="text-[11px] font-black tracking-[0.22em] text-hazard">
              YOUR TYPE / 24
            </div>
            <h1 className="mt-3 text-[clamp(30px,5.4cqw,50px)] font-black leading-[1.25] tracking-[-0.03em]">
              {selfType ? typeToken(selfType) : diagnosis.detailedNarrative.title}
            </h1>
            {selfType && (
              <div className="mt-1.5 text-[15px] font-bold text-txt-muted">{selfType.typeName}</div>
            )}
            <div className="mt-2 text-sm font-bold text-primary">
              {selfType?.catchphrase ?? diagnosis.detailedNarrative.subtitle}
            </div>
            {selfType && <GroupBadge group={selfType.group} className="mt-4" />}
            <p
              className="mt-3.5 max-w-[32em] text-[13px] leading-8 text-txt-muted"
              style={{ textWrap: "pretty" }}
            >
              {selfType?.description ?? diagnosis.narrative}
            </p>
            {/*
              タイプそのものの説明。**タイプ名とスペック（TOGEL INDEX）の間**に置く。
              「あなたはこういう型です」→「あなたのスペック」→「ここから、あなたの話をします」
              の順になる。ここは人に見せる部分なので、同じ型なら全員同じ文。
            */}
            {typeProfile && (
              <div className="mt-5 rounded-card border border-line bg-surface p-5">
                <h2 className="text-[11px] font-black tracking-[0.22em] text-relief">
                  {TYPE_PROFILE_HEADING}
                </h2>
                {/* 段落ごとに見出しを付けない。区切らず続けて読ませる */}
                {typeProfileParagraphs(typeProfile).map((paragraph, index) => (
                  <p
                    key={index}
                    className="mt-3 max-w-[34em] whitespace-pre-line text-[13px] leading-8 text-txt-muted"
                    style={{ textWrap: "pretty" }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {selfType && (
              <div className="mt-4 flex flex-wrap gap-[7px]">
                {selfType.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line bg-surface-alt px-[11px] py-[5px] text-[11px] font-bold text-txt-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-[320px] rounded-[18px] border border-line bg-surface p-5">
              <div className="text-[10px] font-black tracking-[0.22em] text-txt-muted">
                TOGEL INDEX
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {TOGEL_INDEX.map(({ key, label }) => {
                  const pct = togelIndexPercent(key, scores);
                  const high = pct >= 50;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-txt-muted">{label}</span>
                        <span className={high ? "text-hazard" : "text-primary"}>{pct}</span>
                      </div>
                      <div className="mt-[5px] h-1.5 rounded-full bg-surface-alt">
                        <div
                          className={`h-full rounded-full ${high ? "bg-hazard" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {selfType && (
                <a
                  href={storyLabelHref(selfType.id, scores)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex min-h-[44px] items-center justify-center rounded-full bg-white text-xs font-black text-ink transition-colors hover:bg-hazard"
                >
                  取扱注意ラベルを保存（縦・ストーリーズ用）
                </a>
              )}
            </div>
          </div>
        </div>

        {/*
          深い自己説明。スペック（TOGEL INDEX）の下に置く。
          数値の隣に並べると「解説」に見えてしまい、読まれずに飛ばされる。

          本文が5種そろうまで generateDeepNarrative は null を返し、
          この節ごと出ない。半端に出すと「自分のときは薄かった」が
          利用者側に見える。
        */}
        {deepNarrative && <DeepNarrativeSection narrative={deepNarrative} />}

      </section>

      {/* タブバー */}
      <div className="sticky top-[66px] z-20 flex gap-1 overflow-x-auto border-y border-line-soft bg-ink/95 px-5.5 py-2.5 backdrop-blur">
        <button type="button" onClick={() => setTab("personality")} className={tabClass("personality")}>
          あなたの性格
        </button>
        <button type="button" onClick={() => setTab("mismatch")} className={tabClass("mismatch")}>
          ミスマッチ {worstTypeEntries.length || 5}
        </button>
        <button type="button" onClick={() => setTab("best")} className={tabClass("best")}>
          おまけ：ベスト5
        </button>
        {isRefreshing && (
          <span className="ml-auto flex items-center text-[10px] font-bold text-txt-disabled">
            更新中…
          </span>
        )}
      </div>

      {/* タブA: あなたの性格 */}
      {tab === "personality" && (
        <section className="animate-rise px-5.5 pb-[34px] pt-7">
          <div className="mx-auto max-w-[1120px]">
            <div className="grid gap-3.5 md:grid-cols-3">
              <div className="rounded-card border border-line bg-surface p-5">
                <div className="text-[10px] font-black tracking-[0.22em] text-relief">強み</div>
                <ul className="mt-3 list-disc pl-[1.15em] text-[12.5px] leading-8 text-txt-muted">
                  {diagnosis.detailedNarrative.strengths.slice(0, 3).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-card border border-line bg-surface p-5">
                <div className="text-[10px] font-black tracking-[0.22em] text-hazard">伸びしろ</div>
                <ul className="mt-3 list-disc pl-[1.15em] text-[12.5px] leading-8 text-txt-muted">
                  {diagnosis.detailedNarrative.warnings.slice(0, 3).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-card border border-line bg-surface p-5">
                <div className="text-[10px] font-black tracking-[0.22em] text-txt-muted">
                  コミュニケーション
                </div>
                <ul className="mt-3 flex flex-col gap-1.5 text-[12.5px] leading-8 text-txt-muted">
                  {diagnosis.detailedNarrative.communicationStyle.slice(0, 2).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 段階開示: 詳しい解説 */}
            <div className="mt-3.5 rounded-card border border-line-soft bg-panel p-5">
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-sm font-black text-white"
              >
                <span>もっと詳しい性格解説を読む</span>
                <span className="text-lg text-hazard">{moreOpen ? "−" : "＋"}</span>
              </button>
              {moreOpen && (
                <div className="animate-rise mt-4 flex flex-col gap-4 border-t border-dashed border-line pt-4">
                  {[
                    { title: "考え方のクセ", items: diagnosis.detailedNarrative.thinkingStyle },
                    { title: "恋愛傾向", items: diagnosis.detailedNarrative.loveTendency },
                    { title: "求める相手", items: diagnosis.detailedNarrative.idealPartner },
                  ]
                    .filter((block) => block.items.length > 0)
                    .map((block) => (
                      <div key={block.title}>
                        <div className="text-[10px] font-black tracking-[0.22em] text-txt-subtle">
                          {block.title}
                        </div>
                        <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-[2.1] text-txt-muted">
                          {block.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 本編への導線 */}
            <div className="mt-3.5 rounded-[18px] border border-primary bg-[linear-gradient(160deg,#1c0d16,#0d111b)] p-5.5">
              <div className="text-[11px] font-black tracking-[0.22em] text-primary">
                この結果の本編
              </div>
              <div className="mt-2 text-xl font-black leading-normal">
                あなたと絶対に合わない5タイプ
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.95] text-txt-muted">
                地獄のシナリオとNG行動つき。ここが一番読まれています。
              </p>
              <Link
                href="/result/mismatch"
                className="mt-4 flex min-h-[56px] items-center justify-center rounded-card bg-primary text-[15px] font-black text-ink transition-colors hover:bg-primary-hover"
              >
                ミスマッチを見る
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* タブB: ミスマッチ5（要約） */}
      {tab === "mismatch" && (
        <section className="animate-rise px-5.5 pb-[34px] pt-7">
          <div className="mx-auto max-w-[1120px]">
            {worstTypeEntries.length === 0 ? (
              <div className="rounded-hero border border-dashed border-line bg-panel px-6 py-12 text-center">
                <p className="text-sm font-bold text-txt-muted">ミスマッチ結果を取得中です…</p>
              </div>
            ) : (
              <>
                <div className="rounded-[18px] border border-primary bg-[linear-gradient(165deg,#1c0d16,#0d111b)] p-5">
                  <div className="text-[10px] font-black tracking-[0.22em] text-primary">
                    WORST 1 ／ 危険度 {worstTypeEntries[0].score}%
                  </div>
                  <div className="mt-2 text-2xl font-black">{worstTypeEntries[0].type.typeName}</div>
                  <div className="mt-1 text-xs font-bold text-hazard">
                    {worstTypeEntries[0].type.catchphrase}
                  </div>
                  <p className="mt-3 text-[12.5px] leading-8 text-txt-muted">
                    {worstTypeEntries[0].blurb}
                  </p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {worstTypeEntries.slice(1).map((entry) => (
                    <div key={entry.type.id} className="rounded-[14px] border border-line bg-surface p-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black">{entry.type.typeName}</span>
                        <span className="text-[11px] font-black text-primary">{entry.score}%</span>
                      </div>
                      <p className="mt-[7px] text-[11.5px] leading-[1.85] text-txt-muted">
                        {entry.blurb}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/result/mismatch"
                  className="mt-3.5 flex min-h-[56px] items-center justify-center rounded-card bg-hazard text-[15px] font-black text-ink shadow-cta transition-colors hover:bg-white"
                >
                  地獄のシナリオを全部読む
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* タブC: おまけ ベスト5（ライト面） */}
      {tab === "best" && (
        <section className="animate-rise bg-paper px-5.5 pb-[34px] pt-7 text-navy">
          <div className="mx-auto max-w-[1120px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex rounded-full bg-navy px-3 py-[5px] text-[10px] font-black tracking-[0.22em] text-relief">
                  おまけ
                </div>
                <h2 className="mt-3 text-[clamp(20px,3cqw,30px)] font-black leading-[1.4]">
                  相性のいい5人
                </h2>
                <p className="mt-2.5 max-w-[32em] text-[12.5px] leading-8 text-lighttext-muted">
                  本編ではありません。気楽に見てください。
                </p>
              </div>
              <div className="flex gap-1 rounded-full border border-lightline bg-white p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange("opposite")}
                  className={`min-h-[44px] rounded-full px-4 text-[11px] font-black transition-colors ${
                    mode === "opposite" ? "bg-navy text-white" : "text-lighttext-subtle"
                  }`}
                >
                  異性
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("same")}
                  className={`min-h-[44px] rounded-full px-4 text-[11px] font-black transition-colors ${
                    mode === "same" ? "bg-navy text-white" : "text-lighttext-subtle"
                  }`}
                >
                  同性
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((result) => {
                const matchType = findExtended(result.personalityTypes?.profile?.id);
                return (
                  <Link
                    key={`${result.ranking}-${result.profile.id}`}
                    href={{
                      pathname: `/profile/${result.profile.id}`,
                      query: { nickname: result.profile.nickname },
                    }}
                    className={`block rounded-[14px] border bg-white p-4 transition-colors hover:border-navy ${
                      result.isPrank ? "border-primary ring-2 ring-primary/20" : "border-lightline"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-black">
                        {matchType?.typeName ?? result.profile.nickname}
                      </span>
                      <span className="flex-none text-xs font-black text-relief-ink">
                        {Math.round(result.score)}%
                      </span>
                    </div>
                    <div className="mt-[3px] text-[11px] font-bold text-lighttext-subtle">
                      {result.profile.nickname}・{result.profile.age}歳
                      {result.isPrank ? "・💘" : ""}
                    </div>
                    <p className="mt-[7px] text-[11.5px] leading-[1.85] text-lighttext-subtle">
                      {result.catchphrase}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 取扱説明書を配る（開封の直後ではなく、結果を読んだあとの位置に置く） */}
      {selfType && (
        <section className="px-5.5 pb-2 pt-4">
          <div className="mx-auto max-w-[1120px]">
            <HandbookShare
              text={handbookPostText(selfType)}
              url={`https://to-gel.com/share/${selfType.id}`}
              labelHref={storyLabelHref(selfType.id, scores)}
            />
          </div>
        </section>
      )}

      {/* LINE友だち追加CTA（診断完了直後が追加率のピーク） */}
      <section className="px-5.5 pb-8 pt-4">
        <div className="mx-auto grid max-w-[1120px] items-center gap-[18px] rounded-[18px] border border-[#1e3557] bg-navy p-5.5 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-black tracking-[0.22em] text-relief">
              LINE
            </div>
            <div className="mt-2 text-[19px] font-black leading-normal text-white">
              あなたが最も踏みやすい地雷は、3タイプ分あります
            </div>
            <p className="mt-2 text-xs leading-[1.9] text-[#b7c6dd]">
              週に1通、全15回。1通目から、踏まない歩き方だけ送ります。
            </p>
          </div>
          <a
            href="https://lin.ee/T7OYAGQ"
            target="_blank"
            rel="noreferrer"
            onClick={() => trackLineCta("result")}
            className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-linegreen text-sm font-black text-white transition-opacity hover:opacity-90"
          >
            1通目を受け取る
          </a>
        </div>
      </section>

      {/* PR / レコメンド枠: タブ内容の末尾にのみ配置 */}
      <section className="border-t border-line-soft bg-panel px-5.5 py-5.5">
        <div className="mx-auto max-w-[1120px]">
          <RecommendationsSection togelType={diagnosis.personalityType?.id ?? null} page="result" />
        </div>
      </section>
    </div>
  );
};

export default ResultPage;
