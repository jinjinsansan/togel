"use client";

import { CELL_GAP, CELL_SIZE } from "@/lib/diagnosis/board";
import type { Board, BoardCell } from "@/lib/diagnosis/board";

/**
 * 診断すごろくの盤面。
 *
 * 【2026-09-21 作り直し】
 * 前の盤は蛇行する1本の線で、マスを描いていなかった。盤が常に画面外へ続くので
 * 「全体を見る／現在地に戻る」が要り、その全体表示は細い波線1本だった。
 * **40マス全部を1画面に入れて、2つのボタンごと無くした。**
 *
 * ここで一番大事なのは、**5つの状態が見て区別が付くこと**。
 * 実装が仕様どおりでも、見て分からなければ盤として機能しない（前がそうだった）。
 *
 *   未到達   枠だけ・暗い面          これから
 *   通過済み 面が塗られている        答えた
 *   現在地   明るい枠＋光            いまここ
 *   中間マス 小さな印が付く          区切り
 *   あがり   二重の枠               終点
 *
 * - 現在地の正は呼び出し側の永続層。このコンポーネントは状態を持たない
 * - マスに数字は書かない（390pxで40個の数字は読めない。何問目かは設問カードが持つ）
 * - 盤の形は回答に依存しない。答えの中身で見え方が変わると優劣になる
 */

type Props = {
  board: Board;
  /** 現在地（0始まりの設問インデックス） */
  currentIndex: number;
  reducedMotion?: boolean;
  /** 途中再開時に現在地へ添える一行（次の回答で消す） */
  note?: string | null;
  /** コマの差し替えスロット */
  piece?: React.ReactNode;
  /** 回想で光らせるマス（0始まり。空なら通常表示） */
  highlightIndexes?: number[];
};

type CellState = "pending" | "passed" | "current" | "goal";

const stateOf = (cell: BoardCell, currentIndex: number): CellState => {
  if (cell.index === currentIndex) return "current";
  if (cell.isGoal) return "goal";
  return cell.index < currentIndex ? "passed" : "pending";
};

/**
 * 面・枠は状態ごとに**両方**変える。色だけだと縮小時に潰れる。
 * あがりが現在地でもあるとき（最後の設問）は current が勝ち、
 * あがりの印（内側の枠）は別に重ねる。
 */
const CELL_CLASS: Record<CellState, string> = {
  pending: "border-line bg-surface/40",
  passed: "border-primary/70 bg-primary/55",
  current: "border-white bg-primary",
  goal: "border-relief bg-surface/40",
};

export const DiagnosisBoard = ({
  board,
  currentIndex,
  reducedMotion = false,
  note = null,
  piece,
  highlightIndexes,
}: Props) => {
  const highlighted = new Set(highlightIndexes ?? []);
  return (
  <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 px-4">
    <div
      className="relative"
      style={{ width: board.width, height: board.height }}
      role="img"
      aria-label={`全${board.cells.length}問中 ${currentIndex + 1}問目`}
    >
      {/* 行と行をつなぐ折り返し。蛇行していることが分かる程度の細さに留める */}
      {Array.from({ length: board.rows - 1 }, (_, row) => {
        const onRight = row % 2 === 0;
        const step = CELL_SIZE + CELL_GAP;
        return (
          <span
            key={`turn-${row}`}
            aria-hidden="true"
            className="absolute rounded-full bg-line"
            style={{
              width: 2,
              height: CELL_GAP + 2,
              top: row * step + CELL_SIZE - 1,
              left: onRight
                ? (board.columns - 1) * step + CELL_SIZE / 2
                : CELL_SIZE / 2,
            }}
          />
        );
      })}

      {board.cells.map((cell) => {
        const state = stateOf(cell, currentIndex);
        return (
          <span
            key={cell.index}
            aria-hidden="true"
            className={`absolute flex items-center justify-center rounded-[9px] border-2 transition-colors ${
              CELL_CLASS[state]
            } ${state === "current" && !reducedMotion ? "shadow-[0_0_0_4px_rgba(255,46,116,.28)]" : ""} ${
              highlighted.has(cell.index) ? "!border-hazard !bg-hazard/70" : ""
            }`}
            style={{ left: cell.x, top: cell.y, width: CELL_SIZE, height: CELL_SIZE }}
          >
            {/* 中間マス: 小さな印。数字ではないので潰れない */}
            {cell.isMilestone && state !== "current" && (
              <span
                className={`h-2 w-2 rounded-full ${
                  cell.index < currentIndex ? "bg-white" : "bg-txt-disabled"
                }`}
              />
            )}
            {/*
              あがり: 二重の枠。色ではなく**形**で区別する。
              現在地と重なるとき（最後の設問）も消さない。消すと、あがりに
              着いた瞬間だけ「あがり」の印が無くなる。
            */}
            {cell.isGoal && (
              <span
                className={`absolute inset-[4px] rounded-[5px] border-2 ${
                  state === "current" ? "border-white" : "border-relief/70"
                }`}
              />
            )}
            {state === "current" && (piece ?? <span className="h-2.5 w-2.5 rounded-full bg-white" />)}
          </span>
        );
      })}
    </div>

        {note && <p className="max-w-[20em] text-center text-[11px] text-txt-subtle">{note}</p>}
    </div>
  );
};
