"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { DiagnosisBoard } from "@/components/diagnosis/board/diagnosis-board";
import { MilestoneCard } from "@/components/diagnosis/board/milestone-card";
import { RevealSequence } from "@/components/diagnosis/board/reveal-sequence";
import { useReducedMotion } from "@/components/diagnosis/board/use-reduced-motion";
import { WarningGate } from "@/components/diagnosis/board/warning-gate";
import { QuestionCard } from "@/components/diagnosis/question-card";
import { DiagnosisQuestion } from "@/types/diagnosis";
import { trackDiagnosisComplete, trackDiagnosisStart } from "@/lib/analytics/events";
import { buildBoard, milestoneText, recallRecords } from "@/lib/diagnosis/board";
import { clearSession, saveSession } from "@/lib/diagnosis/session";
import { personalityTypes, typeToken } from "@/lib/personality";
import type { TypeGroupId } from "@/lib/personality";
import { useDiagnosisStore } from "@/store/diagnosis-store";

/**
 * 診断フロー（すごろく）。
 *
 * - 進捗はプログレスバーではなく盤面の現在地で示す。コマは画面中央に固定し盤が動く
 * - 現在地の正は回答の永続層（zustand + localStorage）。演出は別レイヤに置く
 * - 中間マスは「通ってきた道」を返すだけ。傾向・軸名・スコアは出さない
 * - ゴールは回想 → 封筒 → 開封。カウントダウン等の「何が出るか分からない」演出は使わない
 */

type Phase = "quiz" | "milestone" | "warn" | "reveal";

type WorstReveal = {
  typeName: string;
  catchphrase: string;
  token?: string;
  emoji?: string;
  group?: TypeGroupId;
};

const DiagnosisPage = () => {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const diagnosisType = params.type === "full" ? "full" : params.type === "light" ? "light" : null;
  const reducedMotion = useReducedMotion();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<DiagnosisQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [overview, setOverview] = useState(false);
  const [resumeNote, setResumeNote] = useState<string | null>(null);
  // 移動の種類は操作を受けたこちらが決める（盤は渡された通りに描くだけ）
  const [move, setMove] = useState<{ kind: "forward" | "instant"; step: number }>({
    kind: "instant",
    step: 0,
  });
  const [worst, setWorst] = useState<WorstReveal | null>(null);
  const [submitFailed, setSubmitFailed] = useState(false);
  const submitStateRef = useRef<"idle" | "pending" | "done" | "error">("idle");

  const { answers, userGender, setDiagnosisType, loadFromStorage, answerQuestion, reset } =
    useDiagnosisStore();

  useEffect(() => {
    if (!diagnosisType) return;
    if (!userGender) {
      router.push("/diagnosis/select/gender");
      return;
    }
    const fetchQuestions = async () => {
      setQuestionsLoading(true);
      try {
        const response = await fetch(`/api/questions/${diagnosisType}`);
        if (!response.ok) {
          throw new Error("failed to fetch questions");
        }
        const json = await response.json();
        setQuestions(json.questions as DiagnosisQuestion[]);
        setCurrentIndex(0);
      } catch (fetchError) {
        console.error(fetchError);
        setQuestions([]);
        setError("質問取得に失敗しました。時間を置いて再度お試しください。");
      } finally {
        setQuestionsLoading(false);
      }
    };
    fetchQuestions();
  }, [diagnosisType, userGender, router]);

  useEffect(() => {
    if (!diagnosisType) return;
    setDiagnosisType(diagnosisType);
    loadFromStorage();
  }, [diagnosisType, setDiagnosisType, loadFromStorage]);

  // 途中保存から再開した場合、最初の未回答質問へ移動する（毎回Q1に戻さない）
  // 早送りの演出はせず、無音で現在地から始める。不在は責めない・数えない
  const resumeApplied = useRef(false);
  useEffect(() => {
    if (resumeApplied.current || questions.length === 0) return;
    resumeApplied.current = true;
    if (answers.length === 0) return;
    const answeredIds = new Set(answers.map((answer) => answer.questionId));
    const firstUnanswered = questions.findIndex((question) => !answeredIds.has(question.id));
    setCurrentIndex(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered);
    setResumeNote("ここで止まっていました");
  }, [questions, answers]);

  const totalQuestions = questions.length;
  const board = useMemo(() => buildBoard(totalQuestions || 1), [totalQuestions]);

  // 計測: 設問が出た時点で1回だけ（回答内容は送らない）
  const startTracked = useRef(false);
  useEffect(() => {
    if (startTracked.current || totalQuestions === 0 || !diagnosisType) return;
    startTracked.current = true;
    trackDiagnosisStart(diagnosisType, "web");
  }, [totalQuestions, diagnosisType]);

  const answerByIndex = useMemo(() => {
    const map = new Map<number, number>();
    questions.forEach((question, index) => {
      const answer = answers.find((item) => item.questionId === question.id);
      if (answer) map.set(index, answer.value);
    });
    return map;
  }, [questions, answers]);

  if (!diagnosisType) {
    notFound();
  }

  const currentQuestion = questions[currentIndex];
  const currentCell = board.cells[Math.min(currentIndex, board.cells.length - 1)];
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  const submitDiagnosis = async () => {
    if (!userGender || submitStateRef.current === "pending") return;
    submitStateRef.current = "pending";
    setSubmitFailed(false);
    try {
      const payload = {
        diagnosisType,
        userGender,
        answers,
      } as const;
      saveSession(payload);
      const response = await fetch("/api/diagnosis/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("failed to submit diagnosis");
      }
      const data = await response.json();
      if (data.results) {
        sessionStorage.setItem("latestMatching", JSON.stringify(data.results));
      }
      if (data.mismatchResults) {
        sessionStorage.setItem("latestMismatch", JSON.stringify(data.mismatchResults));
        const first = Array.isArray(data.mismatchResults) ? data.mismatchResults[0] : null;
        const typeId: string | undefined = first?.personalityTypes?.profile?.id;
        const extended = typeId ? personalityTypes.find((t) => t.id === typeId) : null;
        if (extended) {
          setWorst({
            typeName: extended.typeName,
            catchphrase: extended.catchphrase,
            token: typeToken(extended),
            emoji: extended.emoji,
            group: extended.group,
          });
        } else if (first?.personalityTypes?.profile?.typeName) {
          setWorst({ typeName: first.personalityTypes.profile.typeName, catchphrase: "" });
        }
      }
      if (data.diagnosis) {
        sessionStorage.setItem("latestDiagnosis", JSON.stringify(data.diagnosis));
      }
      submitStateRef.current = "done";
    } catch (err) {
      console.error(err);
      submitStateRef.current = "error";
      setSubmitFailed(true);
    }
  };

  const startReveal = () => {
    setPhase("reveal");
    if (diagnosisType) trackDiagnosisComplete(diagnosisType, "web");
    void submitDiagnosis();
  };

  const handleSelect = (value: number) => {
    if (!currentQuestion) return;
    answerQuestion({ questionId: currentQuestion.id, value });
    setError(null);
    setResumeNote(null);
    setMove((prev) => ({ kind: "forward", step: prev.step + 1 }));
    // 盤の上では中間マスに止まる。止まる点は中間マスだけ（章の区切りでは止まらない）
    if (currentCell?.isMilestone) {
      setPhase("milestone");
      return;
    }
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase("warn");
    }
  };

  const handleMilestoneContinue = () => {
    setPhase("quiz");
    setMove((prev) => ({ kind: "forward", step: prev.step + 1 }));
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase("warn");
    }
  };

  const handlePrev = () => {
    setError(null);
    setResumeNote(null);
    // 後退は即座・無演出（戻る動きを演出すると「間違えた」の意味が発生する）
    setMove((prev) => ({ kind: "instant", step: prev.step }));
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const currentValue = answers.find((answer) => answer.questionId === currentQuestion?.id)?.value;

  /* ===== 警告フルスクリーン（開封の手前に1回だけ） ===== */
  if (phase === "warn") {
    return (
      <WarningGate
        totalQuestions={totalQuestions}
        worstLabel={diagnosisType === "light" ? "タイプ" : "5タイプ"}
        submitFailed={submitFailed}
        onProceed={startReveal}
        onCancel={() => setPhase("quiz")}
      />
    );
  }

  /* ===== 回想 → 封筒 → 開封 ===== */
  if (phase === "reveal") {
    const records = recallRecords(questions, answers);
    const recordIndexes = records
      .map((record) => questions.findIndex((question) => question.text === record.question))
      .filter((index) => index >= 0);
    return (
      <RevealSequence
        board={board}
        answerByIndex={answerByIndex}
        records={records}
        recordIndexes={recordIndexes}
        worst={worst}
        worstCountLabel={diagnosisType === "light" ? "3" : "5"}
        submitFailed={submitFailed}
        onRetry={() => setPhase("warn")}
        reducedMotion={reducedMotion}
      />
    );
  }

  /* ===== 設問（盤面 + 設問カード / 中間マス） ===== */
  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink text-white">
      {/* 盤面: これが進捗表示そのもの */}
      <div className="relative h-[36dvh] min-h-[210px] border-b border-line-soft bg-panel">
        <DiagnosisBoard
          board={board}
          currentIndex={currentIndex}
          answerByIndex={answerByIndex}
          overview={overview}
          reducedMotion={reducedMotion}
          note={resumeNote}
          moveKind={move.kind}
          moveStep={move.step}
        />
        {board.chapterCount > 1 && !overview && (
          <div className="pointer-events-none absolute left-4 top-3 text-[10px] font-bold tracking-[0.22em] text-txt-disabled">
            第{(currentCell?.chapter ?? 0) + 1}章
          </div>
        )}
        <button
          type="button"
          onClick={() => setOverview((value) => !value)}
          className="absolute right-3 top-3 min-h-[44px] rounded-full border border-line bg-surface/80 px-3.5 text-[11px] font-bold text-txt-muted backdrop-blur transition-colors hover:text-white"
        >
          {overview ? "現在地に戻る" : "全体を見る"}
        </button>
      </div>

      {/* 設問 or 中間マス */}
      <div className="flex-1 overflow-y-auto px-5.5 pb-6 pt-5">
        {questionsLoading && (
          <div className="flex flex-col items-center gap-5 pt-10">
            <div className="w-[160px] overflow-hidden rounded-full">
              <div className="animate-marquee h-2 w-[400%] bg-hazard-sm" />
            </div>
            <p className="text-xs font-bold text-txt-subtle">質問を用意しています…</p>
          </div>
        )}

        {!questionsLoading && !currentQuestion && (
          <div className="rounded-[18px] border border-dashed border-dangerline bg-dangerbg p-6 text-center">
            <p className="text-sm font-bold text-errortext">データの取得に失敗しました</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 text-xs font-bold text-txt-muted underline hover:text-white"
            >
              再読み込みする
            </button>
          </div>
        )}

        {currentQuestion && !questionsLoading && phase === "milestone" && (
          <MilestoneCard
            text={milestoneText(questions, answers, currentIndex, totalQuestions)}
            onContinue={handleMilestoneContinue}
            continueLabel={isLastQuestion ? "結果へ" : "進む"}
          />
        )}

        {currentQuestion && !questionsLoading && phase === "quiz" && (
          <>
            <QuestionCard
              question={currentQuestion}
              currentValue={currentValue}
              onSelect={handleSelect}
              counter={`Q${currentIndex + 1} / ${totalQuestions}`}
            />
            {error && (
              <p className="mt-4 rounded-input bg-error/15 px-4 py-2 text-xs font-bold text-errortext">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {/* フッター */}
      <div className="flex items-center justify-between border-t border-line-soft px-5.5 pb-5.5 pt-3.5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0 || questionsLoading || phase === "milestone"}
          className="text-xs font-bold text-txt-subtle transition-colors hover:text-white disabled:opacity-40"
        >
          ← 前の質問
        </button>
        <button
          type="button"
          onClick={() => {
            clearSession();
            reset();
            setCurrentIndex(0);
            router.push("/diagnosis/select");
          }}
          className="text-[10px] font-bold text-txt-disabled underline transition-colors hover:text-txt-subtle"
        >
          最初から
        </button>
      </div>
    </div>
  );
};

export default DiagnosisPage;
