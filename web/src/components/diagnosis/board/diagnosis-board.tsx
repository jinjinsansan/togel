"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { trailOffsetX } from "@/lib/diagnosis/board";
import type { Board } from "@/lib/diagnosis/board";

/**
 * 診断すごろくの盤面。
 *
 * - コマは画面中央に固定し、盤の側を動かす（9:16で酔いにくく、実装も安定する）
 * - 現在地の正は呼び出し側の永続層。このコンポーネントは座標を描くだけで状態を持たない
 * - 前のマスへ戻るときは演出しない（後退を演出すると「間違えた」の意味が発生する）
 * - 軌跡は太さ・濃さ・長さを回答によらず一定にし、差は形にだけ出す
 * - コマの絵柄はデザイナー差し替え前提のスロット（piece プロパティ）
 */

type Props = {
  board: Board;
  /** 現在地（0始まりの設問インデックス） */
  currentIndex: number;
  /** 設問インデックス → 回答値（1〜5） */
  answerByIndex: Map<number, number>;
  /** 盤全体の俯瞰表示 */
  overview?: boolean;
  reducedMotion?: boolean;
  /** 途中再開時に現在地へ添える一行（次の回答で消す） */
  note?: string | null;
  /** 回想で光らせるマス（0始まり。空なら通常表示） */
  highlightIndexes?: number[];
  /** コマの差し替えスロット */
  piece?: React.ReactNode;
  /**
   * 直前の移動の種類。呼び出し側（＝操作を受けた側）が渡す。
   * forward: 進んだ。移動を見せ、着地の手応えを出す
   * instant: 戻った・再開した。演出しない（後退を演出すると「間違えた」の意味が発生する）
   */
  moveKind?: "forward" | "instant";
  /** 前進のたびに増える連番。着地の手応えを打ち直すためのキー */
  moveStep?: number;
};

const useSize = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
};

export const DiagnosisBoard = ({
  board,
  currentIndex,
  answerByIndex,
  overview = false,
  reducedMotion = false,
  note = null,
  highlightIndexes,
  piece,
  moveKind = "instant",
  moveStep = 0,
}: Props) => {
  const { ref, size } = useSize<HTMLDivElement>();

  // 前進したときだけ移動を見せ、着地の手応えを出す
  const animating = moveKind === "forward" && !reducedMotion;

  const current = board.cells[Math.min(currentIndex, board.cells.length - 1)] ?? board.cells[0];
  const highlight = new Set(highlightIndexes ?? []);

  // 俯瞰: 盤全体が収まる倍率で中央に置く。通常: 現在地を中央に合わせる
  const overviewScale = overview
    ? Math.min(
        (size.width - 32) / board.width,
        (size.height - 32) / Math.max(board.height, 1),
        1,
      )
    : 1;

  const transform = overview
    ? `translate3d(${-board.width / 2}px, ${-board.height / 2}px, 0) scale(${overviewScale})`
    : `translate3d(${-current.x}px, ${-current.y}px, 0)`;

  const transition = animating ? "transform .4s cubic-bezier(.2,.8,.2,1)" : "none";

  // 軌跡: 回答済みのマスだけを、回答で横にずらした点で結ぶ
  const trailPoints = board.cells
    .filter((cell) => answerByIndex.has(cell.index))
    .map((cell) => `${cell.x + trailOffsetX(cell.index, answerByIndex.get(cell.index)!)},${cell.y}`)
    .join(" ");

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform,
          transformOrigin: overview ? "center center" : "0 0",
          transition,
          willChange: animating ? "transform" : undefined,
        }}
      >
        <div
          key={animating ? moveStep : "static"}
          className={animating ? "animate-board-settle" : undefined}
        >
          <svg
            width={board.width}
            height={board.height + 40}
            viewBox={`0 0 ${board.width} ${board.height + 40}`}
            aria-hidden="true"
          >
            {/* 章の区切り: 空間の区切りであって止まる点ではないので、背景側に留める */}
            {board.chapterCount > 1 &&
              board.cells
                .filter((cell) => cell.chapter > 0 && cell.index % 10 === 0)
                .map((cell) => (
                  <line
                    key={`chapter-${cell.chapter}`}
                    x1={0}
                    x2={board.width}
                    y1={cell.y - 44}
                    y2={cell.y - 44}
                    stroke="#1c2333"
                    strokeWidth={1}
                  />
                ))}

            {/* 道（全体） */}
            <polyline
              points={board.cells.map((cell) => `${cell.x},${cell.y}`).join(" ")}
              fill="none"
              stroke="#1c2333"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 軌跡（通ってきた形）。濃さ・太さは回答によらず一定 */}
            {trailPoints && (
              <polyline
                points={trailPoints}
                fill="none"
                stroke="#FF2E74"
                strokeWidth={4}
                strokeOpacity={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* マス */}
            {board.cells.map((cell) => {
              const answered = answerByIndex.has(cell.index);
              const lit = highlight.has(cell.index);
              return (
                <g key={cell.index}>
                  {cell.isMilestone && (
                    <circle
                      cx={cell.x}
                      cy={cell.y}
                      r={13}
                      fill="none"
                      stroke="#FF2E74"
                      strokeWidth={2}
                      strokeOpacity={lit ? 1 : 0.55}
                    />
                  )}
                  <circle
                    cx={cell.x}
                    cy={cell.y}
                    r={cell.isMilestone ? 7 : 5}
                    fill={lit ? "#FF2E74" : answered ? "#FF2E74" : "#39415a"}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* コマ: 画面中央に固定。盤の側が動く */}
      {!overview && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            key={animating ? moveStep : "static"}
            className={animating ? "animate-piece-land" : undefined}
          >
            {piece ?? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary shadow-danger">
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
              </div>
            )}
          </div>
          {note && (
            <div className="absolute left-1/2 top-[30px] w-[190px] -translate-x-1/2 text-center text-[11px] font-bold text-txt-muted">
              {note}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
