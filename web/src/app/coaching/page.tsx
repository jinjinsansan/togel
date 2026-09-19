"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GroupBadge } from "@/components/brand/group-badge";
import { trackLineCta } from "@/lib/analytics/events";
import { personalityTypes, TYPE_GROUP_ORDER, typesInGroup, typeToken } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import {
  ANGLES_PER_TYPE,
  BOARD_ANGLES,
  boardTypeCount,
  cellContent,
  cellKey,
  parseCellKey,
} from "@/lib/coaching/board";
import type { BoardAngle } from "@/lib/coaching/board";
import { getTypeApproachGuide } from "@/lib/coaching/translations";
import { loadBoardState, loadVisited, markVisited, saveBoardState } from "@/lib/coaching/progress";
import type { CoachingBoardState } from "@/lib/coaching/progress";
import { loadSession } from "@/lib/diagnosis/session";
import type { MismatchResult, PersonalityTypeDefinition } from "@/types/diagnosis";

/**
 * 地雷回避ガイド。
 *
 * 2つを分けて置く。
 * - 盤 … 個人のもの。診断が要る（ミスマッチ3 or 5タイプ × 5つの角度）
 * - タイプ別ガイド … 誰でも読める。24タイプの一覧から各ページへ
 *
 * 盤で出していいのは来た距離（「{n}マス歩きました」）と全長だけ。
 * 残数・達成率・ストリーク・完走演出・督促・他人との比較は置かない。
 *
 * 意匠はデザイン一式の「地雷回避ガイド」に合わせる（ライト面＝救いの画面）。
 */

const findExtended = (typeId: string | undefined): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === typeId) ?? null;

/** 診断結果（あれば）から盤を組む。無ければ保存済みの盤を使う */
const buildBoardState = (): CoachingBoardState | null => {
  if (typeof window === "undefined") return null;

  const saved = loadBoardState();
  let selfTypeId: string | null = null;
  try {
    const raw = sessionStorage.getItem("latestDiagnosis");
    if (raw) {
      const diagnosis = JSON.parse(raw) as { personalityType?: PersonalityTypeDefinition };
      selfTypeId = diagnosis.personalityType?.id ?? null;
    }
  } catch {
    /* ignore */
  }
  if (!selfTypeId) return saved;

  const plan = loadSession()?.diagnosisType === "full" ? "full" : "light";
  const limit = boardTypeCount(plan);

  // ミスマッチ結果があればそれを、無ければタイプ定義の相性から組む
  let typeIds: string[] = [];
  try {
    const raw = sessionStorage.getItem("latestMismatch");
    if (raw) {
      const results = JSON.parse(raw) as MismatchResult[];
      const seen = new Set<string>();
      for (const result of results) {
        const id = result.personalityTypes?.profile?.id;
        if (!id || seen.has(id) || !findExtended(id)) continue;
        seen.add(id);
        typeIds.push(id);
      }
    }
  } catch {
    /* ignore */
  }
  if (typeIds.length === 0) {
    typeIds = findExtended(selfTypeId)?.badCompatibleTypes ?? [];
  }
  typeIds = typeIds.slice(0, limit);
  if (typeIds.length === 0) return saved;

  const next: CoachingBoardState = { selfTypeId, plan, typeIds };
  if (
    saved &&
    saved.selfTypeId === next.selfTypeId &&
    saved.plan === next.plan &&
    saved.typeIds.join(",") === next.typeIds.join(",")
  ) {
    return saved;
  }
  saveBoardState(next);
  return next;
};

const MECHANISM = [
  {
    term: "ラベル",
    body: "人は誰でも、昔どこかで貼られた「思い込みのラベル」を持っています。本人は性格だと思っていますが、あとから貼られたものです。",
  },
  {
    term: "タンク",
    body: "ラベルの下には感情のタンクが埋まっています。中身は人それぞれ。寂しさの人も、恐怖の人も、「私には価値がない」の人もいます。",
  },
  {
    term: "警報",
    body: "タンクに触られると、中身をこれ以上感じないために警報が鳴ります。怒鳴る人も、黙る人も、笑ってかわす人もいますが、全部同じ警報です。",
  },
];

export default function CoachingPage() {
  const [board, setBoard] = useState<CoachingBoardState | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [open, setOpen] = useState<{ typeId: string; angle: BoardAngle } | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 盤の状態は永続層にあり、クライアントでしか読めない */
    const state = buildBoardState();
    setBoard(state);
    const stored = loadVisited();

    // LINE配信のリンク（?cell=<typeId>:<angle>）で来た場合は、そのマスを開いて埋める
    const requested = parseCellKey(new URLSearchParams(window.location.search).get("cell"));
    if (requested && state?.typeIds.includes(requested.typeId)) {
      setOpen(requested);
      setVisited(markVisited(cellKey(requested.typeId, requested.angle)));
      return;
    }
    setVisited(stored);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const openCell = useCallback((typeId: string, angle: BoardAngle) => {
    setOpen({ typeId, angle });
    setVisited(markVisited(cellKey(typeId, angle)));
  }, []);

  const boardTypes = useMemo(
    () =>
      (board?.typeIds ?? [])
        .map((id) => findExtended(id))
        .filter((type): type is ExtendedPersonalityTypeDefinition => Boolean(type)),
    [board],
  );

  const totalCells = boardTypes.length * ANGLES_PER_TYPE;
  const walked = useMemo(
    () =>
      boardTypes.reduce(
        (count, type) =>
          count +
          BOARD_ANGLES.filter((angle) => visited.includes(cellKey(type.id, angle.key))).length,
        0,
      ),
    [boardTypes, visited],
  );
  const finished = totalCells > 0 && walked >= totalCells;

  const openType = open ? findExtended(open.typeId) : null;
  const openGuide = openType ? getTypeApproachGuide(openType.id) : null;
  const openContent = openGuide && open ? cellContent(openGuide, open.angle) : null;
  const openLabel = open ? BOARD_ANGLES.find((angle) => angle.key === open.angle)?.label : null;

  return (
    <div className="min-h-screen bg-paper text-navy">
      {/* ヒーロー: ネイビー→ペーパーの硬い分割 */}
      <section
        className="bg-[linear-gradient(180deg,#0b1f3a_0%,#0b1f3a_46%,#F4F7F5_46%,#F4F7F5_100%)] px-5.5 pb-[26px] pt-8"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-relief/40 bg-relief/[.14] px-[13px] py-[5px]">
            <span className="text-[11px] font-black tracking-[0.22em] text-relief">
              毒のあとに、救いを
            </span>
          </div>
          <h1 className="mt-4 text-[clamp(28px,5cqw,48px)] font-black leading-[1.28] tracking-[-0.03em] text-white">
            合わない相手は、
            <br />
            選べない。
          </h1>
          <p className="mb-5.5 mt-3.5 max-w-[32em] text-[13px] leading-8 text-[#b7c6dd]">
            上司も、親も、部活の後輩も。だからTogelは「避ける」ではなく「無事に済ませる」方法を用意しました。ここからは、ちゃんと役に立つ話です。
          </p>

          {/* 地雷の仕組み（全タイプ共通の前提） */}
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {MECHANISM.map((item) => (
              <div
                key={item.term}
                className="rounded-card border border-lightline bg-white p-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]"
              >
                <div className="text-[10px] font-black tracking-[0.22em] text-relief-ink">
                  {item.term}
                </div>
                <p className="mt-[9px] text-[12px] leading-[1.95] text-lighttext-subtle">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5.5 pb-[34px] pt-3.5">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5">
          {/* あなたの盤（診断済みのみ） */}
          {boardTypes.length > 0 && (
            <div className="rounded-hero border border-lightline bg-white px-5.5 py-6 shadow-[0_26px_50px_-34px_rgba(11,31,58,.55)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[20px] font-black tracking-[-0.02em]">
                  {walked}マス歩きました
                </h2>
                <span className="text-[11px] font-bold text-lighttext-subtle">
                  この盤は全{totalCells}マス（{boardTypes.length}タイプ × {ANGLES_PER_TYPE}）
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {boardTypes.map((type) => (
                  <div
                    key={type.id}
                    className="rounded-input border border-lightline bg-[#f1f5f2] p-4"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-[17px] font-black">
                        {type.emoji} {typeToken(type)}
                      </span>
                      <span className="text-[12px] font-bold text-lighttext-subtle">
                        {type.typeName}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-1.5">
                      {BOARD_ANGLES.map((angle) => {
                        const key = cellKey(type.id, angle.key);
                        const walkedCell = visited.includes(key);
                        const isOpen = open?.typeId === type.id && open.angle === angle.key;
                        return (
                          <button
                            key={angle.key}
                            type="button"
                            onClick={() => openCell(type.id, angle.key)}
                            aria-pressed={isOpen}
                            className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-chip border px-1 text-center transition-colors ${
                              isOpen
                                ? "border-navy bg-navy text-white"
                                : walkedCell
                                  ? "border-[#b9e3d0] bg-[#e9f7f0] text-navy"
                                  : "border-lightline bg-white text-lighttext-subtle hover:border-navy"
                            }`}
                          >
                            <span
                              className={`text-[13px] ${walkedCell && !isOpen ? "text-relief-ink" : ""}`}
                              aria-hidden="true"
                            >
                              {walkedCell ? "✓" : "・"}
                            </span>
                            <span className="text-[10px] font-bold leading-tight">
                              {angle.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 開いているマス */}
              {openType && openContent && (
                <div
                  key={`${openType.id}:${open?.angle}`}
                  className="animate-rise mt-3.5 rounded-input border border-lightline bg-[#f1f5f2] p-[18px]"
                >
                  <div className="text-[10px] font-black tracking-[0.22em] text-[#c1113f]">
                    {openLabel}
                  </div>
                  <h3 className="mt-2 text-[20px] font-black tracking-[-0.02em]">
                    {openType.emoji} {typeToken(openType)}
                  </h3>
                  <div className="mt-1 text-[12px] font-bold text-lighttext-subtle">
                    {openType.typeName} ／ {openType.catchphrase}
                  </div>

                  {openContent.body && (
                    <p className="mt-3.5 text-[13px] leading-[1.95] text-lighttext-muted">
                      {openContent.body}
                    </p>
                  )}

                  {openContent.ng && openContent.ok && (
                    <div className="mt-3.5 flex flex-col gap-3.5">
                      <div>
                        <div className="text-[10px] font-black text-[#c1113f]">
                          ✕ あなたが言いがち
                        </div>
                        <div className="mt-1 rounded-[11px] border border-[#f0d3da] bg-white px-[13px] py-[11px] text-[13px] leading-[1.8] text-lighttext-muted">
                          {openContent.ng}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-relief-ink">
                          ◯ こう言い換える
                        </div>
                        <div className="mt-1 rounded-[11px] border border-[#b9e3d0] bg-[#e9f7f0] px-[13px] py-[11px] text-[13px] font-bold leading-[1.8] text-navy">
                          {openContent.ok}
                        </div>
                      </div>
                    </div>
                  )}

                  {openContent.dos && (
                    <ol className="mt-3.5 flex flex-col gap-2.5">
                      {openContent.dos.map((item, index) => (
                        <li key={item} className="flex items-start gap-[9px]">
                          <span className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[5px] bg-relief-ink text-[10px] font-black text-white">
                            {index + 1}
                          </span>
                          <span className="text-[12px] leading-[1.8] text-lighttext-muted">{item}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className="mt-[18px] flex flex-wrap items-center justify-between gap-2.5 border-t border-dashed border-lightline pt-[18px]">
                    <span className="text-[12px] font-bold text-relief-ink">
                      歩き方を1つ覚えた
                    </span>
                    <Link
                      href={`/coaching/${openType.id}`}
                      className="text-[11px] font-bold text-lighttext-subtle underline transition-colors hover:text-navy"
                    >
                      このタイプの全文を読む
                    </Link>
                  </div>
                </div>
              )}

              {/* 盤が埋まったあと: light だけ次の階段（full には置かない） */}
              {finished && board?.plan === "light" && (
                <div className="mt-3.5 rounded-input border border-lightline bg-[#f1f5f2] p-[18px]">
                  <p className="text-[15px] font-black leading-[1.8]">
                    ここまで{totalCells}マス。
                    <br />
                    あと2タイプ、あなたと噛み合わない相手がいます。
                  </p>
                  <p className="mt-2 text-[12px] leading-[1.9] text-lighttext-subtle">
                    （40問の診断で、残りが出ます）
                  </p>
                  <Link
                    href="/diagnosis/full"
                    className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-navy px-7 text-[12px] font-black text-white transition-colors hover:bg-primary"
                  >
                    40問の診断へ
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 24タイプの公開一覧。診断の有無にかかわらず読める */}
          <div className="rounded-hero border border-lightline bg-white px-5.5 py-6 shadow-[0_26px_50px_-34px_rgba(11,31,58,.55)]">
            <h2 className="text-[10px] font-black tracking-[0.22em] text-relief-ink">
              タイプ別ガイド（24タイプ・診断なしで読めます）
            </h2>
            <p className="mt-2 text-[12px] leading-[1.95] text-lighttext-subtle">
              {boardTypes.length > 0
                ? "盤に出ていない相手も、ここから読めます。"
                : "相手のタイプが分かっているなら、そのまま読めます。診断を受けると、あなたと噛み合わない相手だけを並べた「あなたの盤」がこの上に出ます。"}
            </p>

            <div className="mt-4 flex flex-col gap-5">
              {TYPE_GROUP_ORDER.map((group) => (
                <div key={group} className="flex flex-col gap-2">
                  <GroupBadge group={group} variant="light" className="self-start" />
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {typesInGroup(group).map((type) => (
                      <Link
                        key={type.id}
                        href={`/coaching/${type.id}`}
                        className="flex min-h-[56px] items-center gap-3 rounded-input border border-lightline bg-[#f1f5f2] px-3.5 py-2.5 transition-colors hover:border-navy"
                      >
                        <span className="text-[20px]">{type.emoji}</span>
                        <span className="flex flex-col gap-px">
                          <span className="text-[15px] font-black text-navy">
                            {typeToken(type)}
                          </span>
                          <span className="text-[10px] text-lighttext-subtle">
                            {type.typeName}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 締め文（省略不可） */}
          <div className="rounded-card border border-dashed border-[#cfdad4] bg-white px-5.5 py-[18px] text-center">
            <p className="text-[13px] font-black leading-[1.95] text-navy">
              タイプは傾向、ラベルは個人。
              <br />
              <span className="font-normal text-lighttext-subtle">
                隣のあの人の本当のラベルは、本人にしかわかりません。
              </span>
            </p>
          </div>

          {/* LINE */}
          <div className="grid items-center gap-[18px] rounded-hero bg-navy p-[22px] sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-black tracking-[0.22em] text-relief">
                週に1通、全15回
              </div>
              <div className="mt-2 text-[20px] font-black leading-[1.5] text-white">
                1通目から、踏まない歩き方だけ送ります
              </div>
              <p className="mt-2 text-[12px] leading-[1.9] text-[#b7c6dd]">
                あなたが最も踏みやすい地雷は、3タイプ分あります。読み切りサイズで、週にひとつずつ。
              </p>
            </div>
            <a
              href="https://lin.ee/T7OYAGQ"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackLineCta("coaching")}
              className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-linegreen text-[15px] font-black text-white transition-opacity hover:opacity-90"
            >
              1通目を受け取る
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
