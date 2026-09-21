import type { Answer, DiagnosisQuestion } from "@/types/diagnosis";

/**
 * 診断すごろくの盤面（マスの座標と中間マス）。
 *
 * 【2026-09-21 作り直し】
 * 前の盤は蛇行する1本の線で、**マスも目盛りも終点も描いていなかった**。
 * 「座標は設問数だけで決まる／回答に依存しない」という性質は満たしていたが、
 * 満たした上で**見るものが何も無かった**（全体表示は細い波線1本、
 * 1問目は点ひとつと枠外へ消える線だけ）。
 * 性質の正しさは、機能することの証明にならない。
 *
 * いまの盤は**蛇行するグリッド**。40マス全部が1画面に入る。
 *
 *   行1   1  2  3  4  5  6  7  8
 *   行2  16 15 14 13 12 11 10  9   ← 右から左
 *   行3  17 18 19 20 21 22 23 24
 *   行4  32 31 30 29 28 27 26 25   ← 右から左
 *   行5  33 34 35 36 37 38 39 40
 *
 * 設計の前提（前の盤から引き継ぐもの）:
 * - 盤の形は設問数だけで決まる。回答には一切依存しない
 *   （答えの中身で歩幅が変わると「良い答えだと大きく進む」＝優劣になる）
 * - 現在地の正は回答の永続層。ここは座標を返すだけで、状態は持たない
 *
 * 変えたもの:
 * - 1マスの縦距離を不等間隔にして加速を表現するのをやめた。マスが等間隔でないと
 *   グリッドにならない。**加速は中間マスの間隔が終盤ほど詰まることで見せる**
 *   （7,13,19,24,28,32,35,38 は変えていない）
 * - 回答ごとの軌跡の横ずれ（trailOffsetX）を廃止した。マスが一様なグリッドでは
 *   置き場が無く、残すと5状態の区別を濁らせる
 */

/**
 * 1マスの一辺（px）。
 *
 * 指示は40pxだったが、**26dvh に収まらない**。
 *   40px → 5行で 220px。26dvh は844px端末で **219.4px**。1px 足りない
 *   36px → 200px。ただし下に「あがり」の文字（16px＋余白4）を置くと 220px で再び溢れる
 *   34px → 190px。文字を足して 210px。収まる
 * 幅はどれも問題ない（34pxで 307px ≤ 390−32）。
 */
export const CELL_SIZE = 34;
/** マスの間隔（px） */
export const CELL_GAP = 5;

/** 列数。40問は8列×5行、10問は5列×2行（どちらも1画面に収める） */
const COLUMNS: Record<number, number> = { 40: 8, 10: 5 };

export const columnsFor = (total: number): number =>
  COLUMNS[total] ?? Math.min(8, Math.max(1, Math.ceil(Math.sqrt(total))));

/**
 * 中間マスの位置（この設問に答えた直後に入る。1始まりの設問番号）。
 *
 * full(40): 区間 7,6,6,5,4,4,3,3,2 = 40（単調非増加・最終区間が最短）
 * light(10): 区間 4,3,3 = 10（同上）
 * 終盤に向けて間隔を詰め、「もうすぐ」を体感させるための不等間隔。
 */
const MILESTONE_NUMBERS: Record<number, number[]> = {
  40: [7, 13, 19, 24, 28, 32, 35, 38],
  10: [4, 7],
};

export type BoardCell = {
  /** 0始まり。設問インデックスと1:1 */
  index: number;
  /** 0始まりの列・行 */
  column: number;
  row: number;
  /** 盤のローカル座標（マスの左上） */
  x: number;
  y: number;
  /** この設問に答えた直後に中間マスが入る */
  isMilestone: boolean;
  /** 最後のマス（あがり） */
  isGoal: boolean;
};

export type Board = {
  cells: BoardCell[];
  columns: number;
  rows: number;
  width: number;
  height: number;
};

export const milestoneNumbers = (total: number): number[] => MILESTONE_NUMBERS[total] ?? [];

export const buildBoard = (total: number): Board => {
  const milestones = new Set(milestoneNumbers(total));
  const columns = columnsFor(total);
  const rows = Math.ceil(total / columns);
  const step = CELL_SIZE + CELL_GAP;
  const cells: BoardCell[] = [];

  for (let index = 0; index < total; index += 1) {
    const row = Math.floor(index / columns);
    const withinRow = index % columns;
    // 奇数行は右から左へ折り返す（蛇行）
    const column = row % 2 === 0 ? withinRow : columns - 1 - withinRow;
    cells.push({
      index,
      column,
      row,
      x: column * step,
      y: row * step,
      isMilestone: milestones.has(index + 1),
      isGoal: index === total - 1,
    });
  }

  return {
    cells,
    columns,
    rows,
    width: columns * step - CELL_GAP,
    height: rows * step - CELL_GAP,
  };
};

/** 振り切れた回答（両端）かどうか */
const isExtreme = (value: number) => value === 1 || value === 5;

export type AnswerRecord = {
  /** 設問文 */
  question: string;
  /** 選んだ選択肢のラベル */
  label: string;
};

const findRecord = (
  questions: DiagnosisQuestion[],
  answers: Answer[],
  from: number,
  to: number,
): AnswerRecord | null => {
  for (let index = from; index <= to && index < questions.length; index += 1) {
    const question = questions[index];
    const answer = answers.find((item) => item.questionId === question.id);
    if (!answer || !isExtreme(answer.value)) continue;
    const label = question.options.find((option) => option.value === answer.value)?.label;
    if (!label) continue;
    return { question: question.text, label };
  }
  return null;
};

/**
 * 中間マスに刻む文言。
 *
 * 前向きの予測をしない。後ろ向きの記録だけを出す。
 * 区間内で最初に振り切れた回答（1 or 5）を1つ引き、設問文と選択肢ラベルをそのまま返す。
 * 回答を解釈しない・軸名を出さない・スコアを出さない。
 */
export const milestoneText = (
  questions: DiagnosisQuestion[],
  answers: Answer[],
  /** この中間マスが入る設問のインデックス（0始まり） */
  atIndex: number,
  total: number,
): string => {
  const numbers = milestoneNumbers(total);
  const current = atIndex + 1;
  const previous = numbers.filter((number) => number < current).pop() ?? 0;
  const record = findRecord(questions, answers, previous, atIndex);
  if (!record) {
    return `ここまで ${current} 問。どれも、はっきりとは振り切れていません。`;
  }
  return `『${record.question}』\n——ここは「${record.label}」でしたね。`;
};

/** 中間マスに必ず添える但し書き */
export const MILESTONE_NOTE = "まだ途中です";

/** 回想で流す行（振り切れた回答だけを出た順に。上限あり） */
export const recallRecords = (
  questions: DiagnosisQuestion[],
  answers: Answer[],
  limit = 5,
): AnswerRecord[] => {
  const records: AnswerRecord[] = [];
  for (let index = 0; index < questions.length && records.length < limit; index += 1) {
    const record = findRecord(questions, answers, index, index);
    if (record) records.push(record);
  }
  return records;
};
