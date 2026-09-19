"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { trackLineCta } from "@/lib/analytics/events";
import { personalityTypes, typeToken } from "@/lib/personality";
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
import {
  loadBoardState,
  loadVisited,
  markVisited,
  saveBoardState,
} from "@/lib/coaching/progress";
import type { CoachingBoardState } from "@/lib/coaching/progress";
import { loadSession } from "@/lib/diagnosis/session";
import type { MismatchResult, PersonalityTypeDefinition } from "@/types/diagnosis";

/**
 * 攻略盤。
 *
 * 盤は「あなたの分」だけ（ミスマッチ3 or 5タイプ × 5つの角度）。
 * 24タイプ全部を集めさせる設計は採らない——大半はその人に関係がなく、
 * 3/24 と 22/24 は「進んでいる／遅れている」として読まれるため。
 *
 * 出していいのは来た距離（「{n}マス歩きました」）と盤の全長だけ。
 * 残数・達成率・ストリーク・完走演出・督促・他人との比較は置かない。
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

export default function CoachingPage() {
  const [board, setBoard] = useState<CoachingBoardState | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [open, setOpen] = useState<{ typeId: string; angle: BoardAngle } | null>(null);
  const [feedback, setFeedback] = useState<Record<string, "good" | "bad">>({});

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
      {/* ヒーロー */}
      <section
        className="bg-[linear-gradient(180deg,#0b1f3a_0%,#0b1f3a_46%,#F4F7F5_46%,#F4F7F5_100%)] px-5.5 pb-[26px] pt-8"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-relief/40 bg-relief/[.14] px-[13px] py-[5px]">
            <span className="text-[11px] font-black tracking-[0.16em] text-relief">
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

          {/* 地雷の仕組み（全タイプ共通の前提。30秒でわかる版） */}
          <div className="rounded-card border border-lightline bg-white p-5.5">
            <div className="text-[10px] font-black tracking-[0.2em] text-relief-ink">
              先に30秒だけ。地雷の仕組み
            </div>
            <p className="mt-2.5 text-xs leading-[1.95] text-lighttext-muted">
              人の地雷は、性格の欠陥ではありません。仕組みはこうです。
            </p>
            <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3">
              {[
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
              ].map((item) => (
                <div
                  key={item.term}
                  className="rounded-[14px] border border-lightline bg-[#f1f5f2] p-4"
                >
                  <div className="text-[13px] font-black text-navy">{item.term}</div>
                  <p className="mt-1.5 text-[11.5px] leading-[1.9] text-lighttext-subtle">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-xs leading-[1.95] text-lighttext-muted">
              つまり、あなたが誰かの地雷を踏んだとき、相手はあなたを攻撃しているのではありません。自分のタンクを守っているだけです。
              ひとつだけ約束してください。ここに書いてあるのはタイプという<b>キャラクター</b>
              の話。
              <b>タイプは傾向、ラベルは個人。</b>
              あなたの隣にいるあの人の本当のラベルは、本人にしかわかりません。
            </p>
          </div>
        </div>
      </section>

      <section className="px-5.5 pb-[34px] pt-1">
        <div className="mx-auto max-w-[1120px]">
          {/* 未診断: 盤は作らない */}
          {boardTypes.length === 0 && (
            <div className="rounded-card border border-dashed border-lightline bg-white p-6 text-center">
              <p className="text-[13px] font-bold leading-[1.9] text-navy">
                あなたの盤は、診断のあとに出ます。
              </p>
              <p className="mt-2 text-xs leading-[1.9] text-lighttext-subtle">
                噛み合わない相手は人によって違います。全員分ではなく、あなたの分だけを用意します。
              </p>
              <Link
                href="/diagnosis/select"
                className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-navy px-7 text-xs font-black text-white transition-colors hover:bg-primary"
              >
                診断をはじめる
              </Link>
            </div>
          )}

          {boardTypes.length > 0 && (
            <>
              {/* 来た距離と盤の全長。残数・達成率は出さない */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-[22px] font-black tracking-[-0.02em]">
                  {walked}マス歩きました
                </div>
                <div className="text-[11px] font-bold text-lighttext-subtle">
                  この盤は全{totalCells}マス（{boardTypes.length}タイプ × {ANGLES_PER_TYPE}）
                </div>
              </div>

              {/* 盤 */}
              <div className="mt-4 flex flex-col gap-3">
                {boardTypes.map((type) => (
                  <div
                    key={type.id}
                    className="rounded-card border border-lightline bg-white p-4 shadow-[0_20px_40px_-32px_rgba(11,31,58,.5)]"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-[17px] font-black">
                        {type.emoji} {typeToken(type)}
                      </span>
                      <span className="text-[11.5px] font-bold text-lighttext-subtle">
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
                            className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[12px] border px-1 text-center transition-colors ${
                              isOpen
                                ? "border-navy bg-navy text-white"
                                : walkedCell
                                  ? "border-relief-ink/40 bg-[#e9f7f0] text-navy"
                                  : "border-lightline bg-[#f1f5f2] text-lighttext-subtle hover:border-navy"
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
                  className="animate-rise mt-4 rounded-hero border border-lightline bg-white px-5.5 py-6 shadow-[0_26px_50px_-34px_rgba(11,31,58,.55)]"
                >
                  <div className="text-[10px] font-black tracking-[0.2em] text-relief-ink">
                    {openLabel}
                  </div>
                  <h2 className="mt-2 text-[22px] font-black tracking-[-0.02em]">
                    {openType.emoji} {typeToken(openType)}
                  </h2>
                  <div className="mt-1 text-xs font-bold text-lighttext-subtle">
                    {openType.typeName}・{openType.catchphrase}
                  </div>

                  {openContent.body && (
                    <p className="mt-4 text-[12.5px] leading-[1.95] text-lighttext-muted">
                      {openContent.body}
                    </p>
                  )}

                  {openContent.ng && openContent.ok && (
                    <div className="mt-4 flex flex-col gap-3.5">
                      <div>
                        <div className="text-[10px] font-black text-[#c1113f]">
                          ✕ あなたが言いがち
                        </div>
                        <div className="mt-1 rounded-[11px] border border-[#f0d3da] bg-[#fdf5f7] px-[13px] py-[11px] text-[12.5px] leading-relaxed text-lighttext-muted">
                          {openContent.ng}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-relief-ink">
                          ◯ こう言い換える
                        </div>
                        <div className="mt-1 rounded-[11px] border border-[#b9e3d0] bg-[#e9f7f0] px-[13px] py-[11px] text-[12.5px] font-bold leading-relaxed text-navy">
                          {openContent.ok}
                        </div>
                      </div>
                    </div>
                  )}

                  {openContent.dos && (
                    <div className="mt-4 flex flex-col gap-2.5">
                      {openContent.dos.map((item, i) => (
                        <div key={item} className="flex items-start gap-[9px]">
                          <span className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[5px] bg-relief-ink text-[10px] font-black text-white">
                            {i + 1}
                          </span>
                          <span className="text-xs leading-relaxed text-lighttext-muted">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-dashed border-lightline pt-4">
                    <span className="text-[11.5px] font-bold text-relief-ink">
                      歩き方を1つ覚えた
                    </span>
                    <span className="text-[11px] text-lighttext-subtle">
                      タイプは傾向、ラベルは個人。
                    </span>
                  </div>

                  {/* フィードバック */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-xs text-lighttext-subtle">
                      {feedback[openType.id]
                        ? feedback[openType.id] === "good"
                          ? "ありがとうございます。無事を祈ります。"
                          : "精進します。距離を置くのも正解です。"
                        : "このマスは役に立ちましたか？"}
                    </span>
                    {!feedback[openType.id] && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFeedback((prev) => ({ ...prev, [openType.id]: "good" }))
                          }
                          className="min-h-[40px] rounded-full border border-lightline bg-white px-4 text-xs font-bold text-navy transition-colors hover:border-relief-ink"
                        >
                          役に立った
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedback((prev) => ({ ...prev, [openType.id]: "bad" }))}
                          className="min-h-[40px] rounded-full border border-lightline bg-white px-4 text-xs font-bold text-navy transition-colors hover:border-[#c1113f]"
                        >
                          いまいち
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 盤が埋まったあと: light だけ次の階段を出す（full は出さない） */}
              {finished && board?.plan === "light" && (
                <div className="mt-4 rounded-card border border-lightline bg-white p-5.5">
                  <p className="text-[15px] font-black leading-[1.8] text-navy">
                    ここまで{totalCells}マス。
                    <br />
                    あと2タイプ、あなたと噛み合わない相手がいます。
                  </p>
                  <p className="mt-2 text-xs leading-[1.9] text-lighttext-subtle">
                    （40問の診断で、残りが出ます）
                  </p>
                  <Link
                    href="/diagnosis/full"
                    className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-navy px-7 text-xs font-black text-white transition-colors hover:bg-primary"
                  >
                    40問の診断へ
                  </Link>
                </div>
              )}
            </>
          )}

          {/* LINE: 登録すると盤が週1で勝手に進む */}
          <div className="mt-3.5 grid items-center gap-[18px] rounded-[18px] bg-navy p-5.5 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-black tracking-[0.2em] text-relief">LINE</div>
              <div className="mt-2 text-[19px] font-black leading-normal text-white">
                週に1通、盤が勝手に1マス進みます
              </div>
              <p className="mt-2 text-xs leading-[1.9] text-[#b7c6dd]">
                読むのはここでも、LINEでも構いません。同じ1マスです。
              </p>
            </div>
            <a
              href="https://lin.ee/T7OYAGQ"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackLineCta("coaching")}
              className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-linegreen text-sm font-black text-white transition-opacity hover:opacity-90"
            >
              1通目を受け取る
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
