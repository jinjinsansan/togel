"use client";

import { useMemo } from "react";

import { DiagnosisBoard } from "@/components/diagnosis/board/diagnosis-board";
import { MilestoneCard } from "@/components/diagnosis/board/milestone-card";
import { QuestionCard } from "@/components/diagnosis/question-card";
import { buildBoard, milestoneText } from "@/lib/diagnosis/board";
import { questions as allQuestions } from "@/data/questions";
import type { Answer } from "@/types/diagnosis";

/**
 * 盤・設問カード・中間マスの並べ方は `/diagnosis/[type]/page.tsx` に合わせる。
 * 高さ・枠線・余白まで同じにしてあるので、ここで見えるものが本番で見えるもの。
 *
 * 回答は「答えたことにする」ぶんだけ作る。中間マスの文言は振り切れた回答
 * （1 or 5）を拾うので、**振り切れた回答が無いと出る文言が変わる**。
 * どちらも見えるよう、5問ごとに振り切れた回答を混ぜてある。
 */
const fakeAnswers = (upTo: number): Answer[] =>
  allQuestions.slice(0, upTo).map((question, index) => ({
    questionId: question.id,
    value: index % 5 === 0 ? 5 : index % 7 === 0 ? 1 : 3,
  }));

export const DiagnosisPreview = ({
  total,
  questionNumber,
  phase,
  overview,
}: {
  total: number;
  questionNumber: number;
  phase: "quiz" | "milestone";
  overview: boolean;
}) => {
  const currentIndex = questionNumber - 1;
  const board = useMemo(() => buildBoard(total), [total]);
  const questions = useMemo(() => allQuestions.slice(0, total), [total]);
  const answers = useMemo(() => fakeAnswers(currentIndex), [currentIndex]);

  const answerByIndex = useMemo(() => {
    const map = new Map<number, number>();
    answers.forEach((answer, index) => map.set(index, answer.value));
    return map;
  }, [answers]);

  const currentQuestion = questions[currentIndex];
  const currentCell = board.cells[currentIndex];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink text-white">
      <div className="border-b border-dashed border-line px-4 py-2 text-[10px] text-txt-subtle">
        開発用プレビュー ／ Q{questionNumber} / {total} ／ {phase === "milestone" ? "中間マス" : "設問"}
        {overview ? " ／ 全体を見る" : ""}
      </div>

      {/* 以下、/diagnosis/[type]/page.tsx と同じ並び */}
      <div className="relative h-[36dvh] min-h-[210px] border-b border-line-soft bg-panel">
        <DiagnosisBoard
          board={board}
          currentIndex={currentIndex}
          answerByIndex={answerByIndex}
          overview={overview}
          reducedMotion
          moveKind="instant"
        />
        {board.chapterCount > 1 && !overview && (
          <div className="pointer-events-none absolute left-4 top-3 text-[10px] font-bold tracking-[0.22em] text-txt-disabled">
            第{(currentCell?.chapter ?? 0) + 1}章
          </div>
        )}
        <span className="absolute right-3 top-3 flex min-h-[44px] items-center rounded-full border border-line bg-surface/80 px-3.5 text-[11px] font-bold text-txt-muted backdrop-blur">
          {overview ? "現在地に戻る" : "全体を見る"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5.5 pb-6 pt-5">
        {phase === "milestone" ? (
          <MilestoneCard
            text={milestoneText(questions, answers, currentIndex, total)}
            onContinue={() => {}}
            continueLabel={currentIndex === total - 1 ? "結果へ" : "進む"}
          />
        ) : (
          currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              currentValue={undefined}
              onSelect={() => {}}
              counter={`Q${questionNumber} / ${total}`}
            />
          )
        )}
      </div>
    </div>
  );
};
