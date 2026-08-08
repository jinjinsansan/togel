"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadSession } from "@/lib/diagnosis/session";
import { personalityTypes } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import { BigFiveScores, MismatchResult, PersonalityTypeDefinition } from "@/types/diagnosis";

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

/** ミスマッチ結果をタイプ単位に整形した表示用エントリ */
type WorstEntry = {
  rank: number;
  score: number;
  type: ExtendedPersonalityTypeDefinition;
  reasons: MismatchResult["mismatchReasons"];
  disaster: MismatchResult["disasterScenario"];
  ngActions: string[];
};

const TIMELINE_LABELS = ["1ヶ月目", "3ヶ月目", "半年目", "1年目"];

const findExtended = (typeId: string | undefined): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === typeId) ?? null;

/** 毒のあとの救い: タイプ定義から決定的に組成 */
const reliefText = (self: ExtendedPersonalityTypeDefinition | null, target: ExtendedPersonalityTypeDefinition): string => {
  const targetStrength = target.characteristics.strengths[0] ?? "長所";
  const selfNote = self
    ? `あなたの「${self.characteristics.communication}」は、この相手にこそ効きます。`
    : "";
  return `相手の「${targetStrength}」だけを見てください。他を直そうとした瞬間に戦争が始まります。${selfNote}合わないのは事実ですが、噛み合った時の強さも本物です。`;
};

const MismatchResultPage = () => {
  const [results, setResults] = useState<MismatchResult[]>(() => {
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

  const [isLightPlan, setIsLightPlan] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // sessionStorage が空（直リンク・リロード・別タブ）の場合はAPIから復元する
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsLightPlan(loadSession()?.diagnosisType === "light");

    if (results.length > 0) return;
    let cancelled = false;
    const restoreFromApi = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/diagnosis/latest?revalidate=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.mismatchResults) && data.mismatchResults.length > 0) {
          setResults(data.mismatchResults as MismatchResult[]);
          sessionStorage.setItem("latestMismatch", JSON.stringify(data.mismatchResults));
        }
        if (data.diagnosis) {
          setDiagnosis(data.diagnosis as LatestDiagnosis);
          sessionStorage.setItem("latestDiagnosis", JSON.stringify(data.diagnosis));
        }
      } catch (error) {
        console.error("Failed to fetch mismatch results", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void restoreFromApi();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selfType = findExtended(diagnosis?.personalityType?.id);

  // プロフィール単位の結果を「タイプ単位」に整形（同タイプは初出のみ）
  const worstEntries = useMemo<WorstEntry[]>(() => {
    const seen = new Set<string>();
    const entries: WorstEntry[] = [];
    for (const result of results) {
      const typeId = result.personalityTypes?.profile?.id;
      const extended = findExtended(typeId);
      if (!extended || seen.has(extended.id)) continue;
      seen.add(extended.id);
      entries.push({
        rank: entries.length + 1,
        score: Math.round(result.score),
        type: extended,
        reasons: result.mismatchReasons ?? [],
        disaster: result.disasterScenario ?? null,
        ngActions: result.absolutelyNotToDo ?? [],
      });
    }
    return entries;
  }, [results]);

  const visibleEntries = isLightPlan ? worstEntries.slice(0, 3) : worstEntries.slice(0, 5);
  const worst1 = visibleEntries[0] ?? null;
  const rest = visibleEntries.slice(1);
  const totalLabel = isLightPlan ? "3タイプ" : "5タイプ";

  const shareText = worst1
    ? `私（${selfType?.typeName ?? "診断済み"}）と絶対に合わないのは「${worst1.type.typeName}」らしい…`
    : "Togelで「絶対に合わないタイプ」を診断しました";
  // シェア先はOGP付きランディング（/share/[typeId]）。タイプ未確定時はトップへ
  const shareUrl = selfType
    ? `https://to-gel.com/share/${selfType.id}?mode=mismatch`
    : "https://to-gel.com";

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* ヒーロー */}
      <section
        className="bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,46,116,.26),transparent_60%)] px-5.5 pb-[30px] pt-[34px]"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="text-[11px] font-black tracking-[0.28em] text-hazard">
            MISMATCH RANKING
          </div>
          <h1
            className="mt-3.5 text-[clamp(30px,6cqw,54px)] font-black leading-[1.25] tracking-[-0.03em]"
            style={{ textWrap: "pretty" }}
          >
            あなたと絶対に
            <br />
            合わない<span className="text-primary">{totalLabel}</span>
          </h1>
          <p className="mt-3.5 max-w-[34em] text-[13px] leading-8 text-txt-muted">
            {selfType ? (
              <>
                <strong className="font-bold text-white">{selfType.typeName}</strong>
                （{selfType.catchphrase}）のあなたに対する判定です。
              </>
            ) : (
              "あなたの診断結果に基づく判定です。"
            )}
            以下はタイプに対する記述であり、特定の個人を指すものではありません。
          </p>
        </div>
      </section>

      <section className="px-5.5 pb-5">
        <div className="mx-auto max-w-[1120px]">
          {visibleEntries.length === 0 && isLoading && (
            <div className="flex flex-col items-center gap-5 rounded-hero border border-line-soft bg-panel px-6 py-14">
              <div className="w-[180px] overflow-hidden rounded-full">
                <div className="animate-marquee h-2 w-[400%] bg-hazard-sm" />
              </div>
              <p className="text-xs font-bold text-txt-subtle">言い方を選んでいます…</p>
            </div>
          )}

          {visibleEntries.length === 0 && !isLoading && (
            <div className="rounded-hero border border-dashed border-line bg-panel px-6 py-12 text-center">
              <p className="text-sm font-bold text-txt-muted">まだ診断結果がありません。</p>
              <Link
                href="/diagnosis/select"
                className="mt-5 inline-flex min-h-[52px] items-center rounded-full bg-hazard px-7 text-sm font-black text-ink shadow-cta transition-colors hover:bg-white"
              >
                診断をはじめる
              </Link>
            </div>
          )}

          {worst1 && (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {/* WORST 1 フィーチャーカード */}
              <div className="overflow-hidden rounded-hero border border-primary bg-[linear-gradient(165deg,#1c0d16,#0d111b)] shadow-[0_40px_80px_-34px_rgba(255,46,116,.85)]">
                <div className="flex items-center justify-between border-b border-primary/30 bg-primary/[.14] px-5 py-3.5">
                  <span className="text-[11px] font-black tracking-[0.24em] text-primary">
                    WORST 1
                  </span>
                  <span className="text-[11px] font-black text-hazard">危険度 {worst1.score}%</span>
                </div>
                <div className="px-5 pb-6 pt-[22px]" style={{ containerType: "inline-size" }}>
                  <div className="text-[clamp(26px,3.4cqw,36px)] font-black leading-[1.3] tracking-[-0.02em]">
                    {worst1.type.typeName}
                  </div>
                  <div className="mt-1.5 text-[13px] font-bold text-hazard">
                    {worst1.type.catchphrase}
                  </div>
                  <p
                    className="mt-3.5 text-[13px] leading-8 text-txt-muted"
                    style={{ textWrap: "pretty" }}
                  >
                    {worst1.type.description}
                  </p>

                  {worst1.reasons && worst1.reasons.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-[7px]">
                      {worst1.reasons.slice(0, 3).map((reason, i) => (
                        <span
                          key={i}
                          className="rounded-chip border border-primary/35 bg-primary/[.12] px-2.5 py-[5px] text-[11px] font-bold text-[#ff8fb4]"
                        >
                          {reason.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5.5">
                  {/* 地獄のシナリオ（タイムライン） */}
                  {worst1.disaster && worst1.disaster.horrorScenarios.length > 0 && (
                    <div className="rounded-card border border-[#2a3348] bg-[#0b0e17] p-[18px]">
                      <div className="text-[10px] font-black tracking-[0.22em] text-primary">
                        付き合ったら起こる地獄のシナリオ
                      </div>
                      <div className="mt-4 flex flex-col">
                        {worst1.disaster.horrorScenarios.slice(0, 4).map((scenario, i, arr) => (
                          <div key={i} className="flex gap-3.5">
                            <div className="flex flex-none flex-col items-center">
                              <div
                                className={`h-[11px] w-[11px] rounded-full ${
                                  i === arr.length - 1 ? "bg-hazard" : "bg-primary"
                                }`}
                              />
                              {i < arr.length - 1 && <div className="w-px flex-1 bg-[#2a3348]" />}
                            </div>
                            <div className={i < arr.length - 1 ? "pb-[18px]" : undefined}>
                              <div className="text-[11px] font-black tracking-[0.1em] text-hazard">
                                {TIMELINE_LABELS[i] ?? `${i + 1}年目`}
                              </div>
                              <p className="mt-1 text-xs leading-[1.95] text-txt-muted">
                                {scenario}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NG行動 */}
                  {worst1.ngActions.length > 0 && (
                    <div className="mt-3 rounded-card border border-warnline bg-warnbg p-[18px]">
                      <div className="text-[10px] font-black tracking-[0.22em] text-hazard">
                        絶対にやってはいけないこと
                      </div>
                      <div className="mt-3.5 flex flex-col gap-2.5">
                        {worst1.ngActions.slice(0, 3).map((action, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[6px] bg-hazard text-[11px] font-black text-ink">
                              ✕
                            </span>
                            <span className="text-xs leading-[1.85] text-[#e2e7f0]">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 救い */}
                  <div className="mt-3 rounded-card border border-reliefline bg-reliefbg p-[18px]">
                    <div className="text-[10px] font-black tracking-[0.22em] text-relief">
                      それでも、救いはある
                    </div>
                    <p className="mt-2.5 text-[12.5px] leading-8 text-[#d5efe3]">
                      {reliefText(selfType, worst1.type)}
                    </p>
                    <Link
                      href="/coaching"
                      className="mt-3.5 inline-flex min-h-[44px] items-center rounded-full bg-relief px-[18px] text-xs font-black text-[#05130e] transition-colors hover:bg-white"
                    >
                      このタイプの攻略法を見る
                    </Link>
                  </div>
                </div>
              </div>

              {/* WORST 2-5 */}
              <div className="flex flex-col gap-3">
                <div className="rounded-[14px] border border-line-soft bg-panel px-[18px] py-3.5 text-[11px] font-black tracking-[0.2em] text-txt-muted">
                  WORST 2 - {visibleEntries.length}
                </div>

                {rest.map((entry) => (
                  <div
                    key={entry.type.id}
                    className="flex items-stretch gap-3.5 rounded-card border border-line bg-surface p-[18px] transition-colors hover:border-primary"
                  >
                    <div className="w-[34px] flex-none text-[28px] font-black leading-none text-txt-disabled">
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="text-[17px] font-black">{entry.type.typeName}</span>
                        <span className="flex-none text-[11px] font-black text-primary">
                          {entry.score}%
                        </span>
                      </div>
                      <div className="mt-[3px] text-[11px] font-bold text-txt-subtle">
                        {entry.type.catchphrase}
                      </div>
                      <p className="mt-2 text-xs leading-[1.9] text-txt-muted">
                        {entry.reasons?.[0]?.disaster ?? entry.type.description}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [entry.rank]: !prev[entry.rank] }))
                        }
                        className="mt-2.5 text-[11px] font-black text-hazard transition-colors hover:text-white"
                      >
                        地獄のシナリオを{expanded[entry.rank] ? "閉じる −" : "開く ＋"}
                      </button>

                      {expanded[entry.rank] && (
                        <div className="animate-rise mt-3 flex flex-col gap-2.5">
                          {entry.disaster && entry.disaster.horrorScenarios.length > 0 && (
                            <div className="rounded-input border border-dangerline bg-dangerbg p-3.5">
                              <div className="text-[10px] font-black tracking-[0.2em] text-primary">
                                地獄のシナリオ
                              </div>
                              <ul className="mt-2 flex flex-col gap-1.5">
                                {entry.disaster.horrorScenarios.slice(0, 3).map((scenario, i) => (
                                  <li key={i} className="text-xs leading-[1.85] text-txt-muted">
                                    ・{scenario}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {entry.ngActions.length > 0 && (
                            <div className="rounded-input border border-warnline bg-warnbg p-3.5">
                              <div className="text-[10px] font-black tracking-[0.2em] text-hazard">
                                やってはいけないこと
                              </div>
                              <ul className="mt-2 flex flex-col gap-1.5">
                                {entry.ngActions.slice(0, 2).map((action, i) => (
                                  <li key={i} className="text-xs leading-[1.85] text-[#e2e7f0]">
                                    ✕ {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="rounded-input border border-reliefline bg-reliefbg p-3.5">
                            <div className="text-[10px] font-black tracking-[0.2em] text-relief">
                              救い
                            </div>
                            <p className="mt-2 text-xs leading-[1.9] text-[#d5efe3]">
                              {reliefText(selfType, entry.type)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* ライト版アップセル */}
                {isLightPlan && worstEntries.length > 3 && (
                  <div className="rounded-card border border-dashed border-line bg-panel p-[18px]">
                    <div className="text-[11px] font-black tracking-[0.2em] text-txt-muted">
                      WORST 4 - 5 は封印中
                    </div>
                    <p className="mt-2 text-xs leading-[1.9] text-txt-subtle">
                      スタンダード診断（40問）を受けると、残り2タイプと地獄のシナリオ全文が開きます。
                    </p>
                    <Link
                      href="/diagnosis/select"
                      className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-primary px-5 text-xs font-black text-white transition-colors hover:bg-primary-hover"
                    >
                      40問で全部見る
                    </Link>
                  </div>
                )}

                {/* シェア */}
                <div className="mt-1.5 rounded-card border border-[#1e3557] bg-[linear-gradient(160deg,#0b1f3a,#0d111b)] p-5">
                  <div className="text-[11px] font-black tracking-[0.2em] text-txt-muted">
                    スクショして貼る
                  </div>
                  <p className="mt-2 text-xs leading-[1.9] text-txt-muted">
                    「私と絶対合わないのは〇〇タイプw」の1枚をどうぞ。
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {selfType && (
                      <a
                        href={`/api/og?type=${selfType.id}&mode=mismatch`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-[44px] items-center rounded-full bg-white px-[18px] text-xs font-black text-ink transition-colors hover:bg-hazard"
                      >
                        画像を保存
                      </a>
                    )}
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[44px] items-center rounded-full border border-[#2a3348] bg-black px-[18px] text-xs font-black text-white transition-colors hover:border-white"
                    >
                      Xに投稿
                    </a>
                    <a
                      href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[44px] items-center rounded-full bg-linegreen px-[18px] text-xs font-black text-white transition-opacity hover:opacity-90"
                    >
                      LINEで送る
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ライト面（救い） */}
      <section className="mt-6 bg-paper px-5.5 pb-10 pt-[34px] text-navy">
        <div
          className="mx-auto grid max-w-[1120px] items-center gap-6 md:grid-cols-2"
          style={{ containerType: "inline-size" }}
        >
          <div>
            <div className="text-[11px] font-black tracking-[0.24em] text-relief-ink">
              毒はここまで
            </div>
            <h2 className="mt-3 text-[clamp(22px,3.2cqw,34px)] font-black leading-[1.4] tracking-[-0.02em]">
              合わない相手は、
              <br />
              だいたい避けられない。
            </h2>
            <p className="mt-3 max-w-[30em] text-[13px] leading-8 text-lighttext-muted">
              上司かもしれないし、親かもしれません。地雷回避ガイドで、{totalLabel}
              それぞれの扱い方を確認してください。
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/coaching"
              className="flex min-h-[58px] items-center justify-between rounded-card bg-navy px-5.5 text-sm font-black text-white transition-colors hover:bg-primary"
            >
              地雷回避ガイドへ<span>→</span>
            </Link>
            <Link
              href="/result"
              className="flex min-h-[58px] items-center justify-between rounded-card border border-lightline bg-white px-5.5 text-sm font-black text-navy transition-colors hover:border-navy"
            >
              おまけ：相性ベスト5を見る<span>→</span>
            </Link>
          </div>
        </div>

        {/* LINE友だち追加CTA（診断完了直後が追加率のピーク） */}
        <div className="mx-auto mt-6 grid max-w-[1120px] items-center gap-[18px] rounded-[18px] bg-navy p-5.5 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-black tracking-[0.2em] text-relief">
              週1で地雷注意報
            </div>
            <div className="mt-2 text-[19px] font-black leading-normal text-white">
              あなたのワーストタイプの取説をLINEで受け取る
            </div>
            <p className="mt-2 text-xs leading-[1.9] text-[#b7c6dd]">
              言い方の翻訳・距離の置き方を毎週1本。読むだけで、来週の面倒がひとつ減ります。
            </p>
          </div>
          <a
            href="https://lin.ee/T7OYAGQ"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-linegreen text-sm font-black text-white transition-opacity hover:opacity-90"
          >
            LINEで友だち追加
          </a>
        </div>
      </section>

      <div className="bg-base px-5.5 pb-[26px] pt-5 text-center">
        <p className="text-[11px] leading-[1.9] text-txt-disabled">
          ※ 本診断はエンタメ目的です。記述は24タイプに対するものであり、特定の個人を評価するものではありません。
        </p>
      </div>
    </div>
  );
};

export default MismatchResultPage;
