"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DiagnosisBoard } from "./diagnosis-board";
import { GroupBadge } from "@/components/brand/group-badge";
import type { TypeGroupId } from "@/lib/personality";
import type { AnswerRecord, Board } from "@/lib/diagnosis/board";

/**
 * 開封演出。
 *
 * 封筒が先に在って中身が未知だと、どう作ってもガチャの形になる。
 * そこで「通ってきたマスが順に光る → その集積として封筒が現れる → 静かに開く」の順にする。
 * 溜めは回想が担う。ドラムロール・シャッフル・光の強弱・カウントダウンは使わない。
 *
 * 共有導線はここに置かない（結果ページまで1画面分の間を空ける）。
 */

type Props = {
  board: Board;
  /** 回想で流す行（振り切れた回答だけ。0件でもよい） */
  records: AnswerRecord[];
  /** 答えた問数。**値は使わない**（何マス光らせるかだけ） */
  answeredCount: number;
  /** 回想で光らせるマス（records と同じ順） */
  recordIndexes: number[];
  /** 開封で出す相手。愛称（〜型）と群は、判定できたときだけ入る */
  worst: {
    typeName: string;
    catchphrase: string;
    token?: string;
    emoji?: string;
    group?: TypeGroupId;
  } | null;
  worstCountLabel: string;
  submitFailed: boolean;
  onRetry: () => void;
  reducedMotion: boolean;
  /** 結果ページの遷移先。Web版とLIFF版で出口が違うので外から渡す */
  resultHref?: string;
};

type Stage = "recall" | "envelope" | "card";

/** 回想1行あたりの尺。振り切れた回答が0件の人でも間延びしないよう、光だけで進む尺も確保する */
const LINE_MS = 900;
const GLOW_ONLY_MS = 2400;
const ENVELOPE_MS = 1100;

export const RevealSequence = ({
  board,
  records,
  answeredCount,
  recordIndexes,
  worst,
  worstCountLabel,
  submitFailed,
  onRetry,
  reducedMotion,
  resultHref = "/result/mismatch",
}: Props) => {
  const [stage, setStage] = useState<Stage>(reducedMotion ? "card" : "recall");
  const [shown, setShown] = useState(reducedMotion ? records.length : 0);

  // 回想 → 封筒 → カード。reduced-motion なら演出を畳んで結果だけ出す
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reducedMotion) {
      // 演出の途中で reduced-motion がONになった場合は、残りを捨てずに即座に畳む
      timers.push(
        setTimeout(() => {
          setShown(records.length);
          setStage("card");
        }, 0),
      );
      return () => timers.forEach(clearTimeout);
    }
    const steps = Math.max(records.length, 1);
    const stepMs = records.length > 0 ? LINE_MS : GLOW_ONLY_MS;

    for (let step = 1; step <= steps; step += 1) {
      timers.push(setTimeout(() => setShown(step), stepMs * step));
    }
    timers.push(setTimeout(() => setStage("envelope"), stepMs * steps + 200));
    timers.push(setTimeout(() => setStage("card"), stepMs * steps + 200 + ENVELOPE_MS));
    return () => timers.forEach(clearTimeout);
  }, [records.length, reducedMotion]);

  // 回想中は、通ってきたマスを頭から順に光らせる（0件の人はマスの光だけで進む）
  const litCount = records.length > 0 ? shown : Math.min(answeredCount, shown * 6);
  const highlightIndexes =
    stage === "recall"
      ? records.length > 0
        ? recordIndexes.slice(0, litCount)
        : Array.from({ length: litCount }, (_, index) => index)
      : [];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[radial-gradient(90%_60%_at_50%_40%,rgba(255,46,116,.22),#07090F_70%)] text-white">
      {stage === "recall" && (
        <>
          <div className="h-[46dvh] w-full">
            <DiagnosisBoard
              board={board}
              currentIndex={board.cells.length - 1}
              reducedMotion={reducedMotion}
              highlightIndexes={highlightIndexes}
            />
          </div>
          <div className="flex-1 px-5.5 pb-8">
            <div className="text-[11px] font-black tracking-[0.22em] text-hazard">
              通ってきた道
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {records.slice(0, shown).map((record) => (
                <p
                  key={record.question}
                  className="animate-rise text-[13px] leading-[1.9] text-txt-muted"
                  style={{ textWrap: "pretty" }}
                >
                  『{record.question}』——「{record.label}」
                </p>
              ))}
            </div>
          </div>
        </>
      )}

      {stage === "envelope" && (
        <div className="flex flex-1 flex-col items-center justify-center px-5.5">
          <div className="animate-rise flex h-[170px] w-[250px] items-end justify-center rounded-[10px] border border-hazard/70 bg-panel">
            <div
              className="animate-envelope-open h-[86px] w-full rounded-b-[10px] border-t border-hazard/50 bg-surface-alt"
              style={{ transformOrigin: "top center" }}
            />
          </div>
          <p className="mt-7 text-[13px] font-bold text-txt-muted">集まりました</p>
        </div>
      )}

      {stage === "card" && (
        <div className="flex flex-1 flex-col items-center justify-center px-5.5 py-10 text-center">
          {worst ? (
            <div className="w-full max-w-sm">
              <div
                className={`rounded-[18px] border border-primary bg-surface p-5 text-left ${
                  reducedMotion ? "" : "animate-card-turn"
                }`}
              >
                <div className="text-[10px] font-black tracking-[0.22em] text-primary">WORST 1</div>
                {/* 製品中で最も注目される瞬間。ここで愛称を覚えなければ他では定着しない */}
                <div className="mt-2 text-[30px] font-black leading-tight tracking-[-0.03em]">
                  {worst.emoji ? `${worst.emoji} ` : ""}
                  {worst.token ?? worst.typeName}
                </div>
                {worst.token && (
                  <div className="mt-1 text-[13px] font-bold text-txt-muted">{worst.typeName}</div>
                )}
                {worst.catchphrase && (
                  <div className="mt-1 text-xs font-bold text-txt-muted">{worst.catchphrase}</div>
                )}
                {worst.group && <GroupBadge group={worst.group} className="mt-3.5" />}
              </div>
              <Link
                href={resultHref}
                className="mt-3 flex min-h-[56px] items-center justify-center rounded-card bg-hazard text-[15px] font-black text-ink shadow-cta transition-colors hover:bg-white"
              >
                ワースト{worstCountLabel}をすべて見る
              </Link>
              <p className="mt-5 text-[11px] leading-[1.9] text-txt-subtle">
                タイプは傾向、ラベルは個人。
              </p>
            </div>
          ) : submitFailed ? (
            <div className="flex flex-col items-center gap-5">
              <p className="text-sm font-bold text-errortext">診断結果の生成に失敗しました</p>
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[48px] rounded-full border border-line px-6 text-sm font-bold text-txt-muted transition-colors hover:text-white"
              >
                戻ってやり直す
              </button>
            </div>
          ) : (
            <p className="text-[13px] leading-8 text-txt-muted">言い方を選んでいます…</p>
          )}
        </div>
      )}
    </div>
  );
};
