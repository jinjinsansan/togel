import type { Answer, DiagnosisQuestion } from "@/types/diagnosis";

/**
 * 診断すごろくの盤面（座標・中間マス・軌跡）。
 *
 * 設計の前提:
 * - 盤の座標は設問数だけで決まる。回答には一切依存しない
 *   （答えの中身で歩幅が変わると「良い答えだと大きく進む」＝優劣になる）
 * - 現在地の正は回答の永続層。ここは座標を返すだけで、状態は持たない
 * - 1マスの縦距離は一定にしない。同じ1問でも「大きく進んだ」が作れる
 */

/** 盤のローカル座標系の幅（px） */
export const BOARD_WIDTH = 280;

const CENTER_X = BOARD_WIDTH / 2;
/** 蛇行の振れ幅 */
const AMPLITUDE = 92;
/** 蛇行の周期（マス数） */
const MEANDER_PERIOD = 8;
/** マス間の縦距離。等間隔にしないための固定表（回答に依存しない） */
const GAP_PATTERN = [104, 82, 120, 90, 76, 112, 96, 86];

/** full(40) のみ章分割する。章は空間の区切りで、止まる点ではない */
const CHAPTER_SIZE = 10;

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
  x: number;
  y: number;
  /** この設問に答えた直後に中間マスが入る */
  isMilestone: boolean;
  /** 0始まりの章番号。章分割しない盤は全て0 */
  chapter: number;
};

export type Board = {
  cells: BoardCell[];
  width: number;
  height: number;
  chapterCount: number;
};

export const milestoneNumbers = (total: number): number[] => MILESTONE_NUMBERS[total] ?? [];

export const buildBoard = (total: number): Board => {
  const milestones = new Set(milestoneNumbers(total));
  const useChapters = total === 40;
  const cells: BoardCell[] = [];

  let y = 0;
  for (let index = 0; index < total; index += 1) {
    if (index > 0) y += GAP_PATTERN[(index - 1) % GAP_PATTERN.length];
    cells.push({
      index,
      x: CENTER_X + AMPLITUDE * Math.sin((index / MEANDER_PERIOD) * Math.PI * 2),
      y,
      isMilestone: milestones.has(index + 1),
      chapter: useChapters ? Math.floor(index / CHAPTER_SIZE) : 0,
    });
  }

  return {
    cells,
    width: BOARD_WIDTH,
    height: y,
    chapterCount: useChapters ? Math.ceil(total / CHAPTER_SIZE) : 1,
  };
};

/** 軌跡の振れ幅（px） */
export const TRAIL_AMPLITUDE = 16;

/**
 * 軌跡が各マスで通る点の横ずれ。
 *
 * 符号を設問インデックスの偶奇で反転させる。同じ回答「5」が設問ごとに左にも右にも出るため、
 * 一貫した「良い側」が構造として存在しない（確認で担保せず、構造で消す）。
 * 太さ・濃さ・長さは回答によらず一定にすること。差は形にだけ出る。
 */
export const trailOffsetX = (questionIndex: number, answerValue: number): number => {
  const sign = questionIndex % 2 === 0 ? 1 : -1;
  const normalized = (answerValue - 3) / 2; // 1..5 → -1..+1（等間隔）
  return sign * normalized * TRAIL_AMPLITUDE;
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
