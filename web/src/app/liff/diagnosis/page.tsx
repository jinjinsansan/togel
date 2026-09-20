"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DiagnosisBoard } from "@/components/diagnosis/board/diagnosis-board";
import { MilestoneCard } from "@/components/diagnosis/board/milestone-card";
import { RevealSequence } from "@/components/diagnosis/board/reveal-sequence";
import { useReducedMotion } from "@/components/diagnosis/board/use-reduced-motion";
import { WarningGate } from "@/components/diagnosis/board/warning-gate";
import { QuestionCard } from "@/components/diagnosis/question-card";
import { DiagnosisQuestion, DiagnosisType } from "@/types/diagnosis";
import { trackDiagnosisComplete, trackDiagnosisStart } from "@/lib/analytics/events";
import { buildBoard, milestoneText, recallRecords } from "@/lib/diagnosis/board";
import { loadSession, saveSession } from "@/lib/diagnosis/session";
import { useLiff } from "@/lib/line/use-liff";
import { personalityTypes, typeToken } from "@/lib/personality";
import type { TypeGroupId } from "@/lib/personality";

/**
 * LINE内（LIFF）の診断フロー。
 *
 * 盤面・設問カード・中間マス・開封演出は Web版と同じコンポーネントを共有する。
 * LIFF固有の差（結果ページの出口など）は props で外から渡し、コンポーネント内部に
 * 分岐を置かない。
 *
 * 🔴 LINE内は通知やトーク切り替えで離脱・復帰が頻繁に起きる。現在地の正は
 * localStorage（scope: "liff"）に置き、WebViewが捨てられても現在地から再開できるようにする。
 */

type Answer = { questionId: string; value: number };
type Step = "type" | "gender" | "questions" | "milestone" | "warn" | "reveal";

type WorstReveal = {
  typeName: string;
  catchphrase: string;
  token?: string;
  emoji?: string;
  group?: TypeGroupId;
};

export default function LiffDiagnosisPage() {
  const { isReady, lineUserId, error: liffError } = useLiff();
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState<Step>("type");
  const [diagnosisType, setDiagnosisType] = useState<DiagnosisType>("light");
  const [userGender, setUserGender] = useState<"male" | "female" | null>(null);
  const [questions, setQuestions] = useState<DiagnosisQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState(false);
  const [resumeNote, setResumeNote] = useState<string | null>(null);
  const [move, setMove] = useState<{ kind: "forward" | "instant"; step: number }>({
    kind: "instant",
    step: 0,
  });
  const [worst, setWorst] = useState<WorstReveal | null>(null);
  const [submitFailed, setSubmitFailed] = useState(false);
  const submitStateRef = useRef<"idle" | "pending" | "done" | "error">("idle");

  useEffect(() => {
    if (liffError) setError(liffError);
  }, [liffError]);

  const fetchQuestions = async (type: DiagnosisType): Promise<DiagnosisQuestion[]> => {
    const res = await fetch(`/api/questions/${type}`);
    if (!res.ok) throw new Error("Failed to fetch questions");
    const json = await res.json();
    return json.questions as DiagnosisQuestion[];
  };

  // 途中保存からの復帰。早送りはせず、無音で現在地から始める
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !isReady) return;
    restored.current = true;
    const session = loadSession("liff");
    if (!session || session.answers.length === 0 || !session.userGender) return;
    const restore = async () => {
      try {
        const list = await fetchQuestions(session.diagnosisType);
        const answeredIds = new Set(session.answers.map((answer) => answer.questionId));
        const firstUnanswered = list.findIndex((question) => !answeredIds.has(question.id));
        setDiagnosisType(session.diagnosisType);
        setUserGender(session.userGender);
        setQuestions(list);
        setAnswers(session.answers);
        setCurrentIndex(firstUnanswered === -1 ? list.length - 1 : firstUnanswered);
        setResumeNote("ここで止まっていました");
        setStep("questions");
      } catch {
        // 復帰に失敗したときは最初の選択から始める（黙って捨てない）
        setError("前回の続きを読み込めませんでした。最初から選び直してください");
      }
    };
    void restore();
  }, [isReady]);

  const totalQuestions = questions.length;
  const board = useMemo(() => buildBoard(totalQuestions || 1), [totalQuestions]);

  const answerByIndex = useMemo(() => {
    const map = new Map<number, number>();
    questions.forEach((question, index) => {
      const answer = answers.find((item) => item.questionId === question.id);
      if (answer) map.set(index, answer.value);
    });
    return map;
  }, [questions, answers]);

  const currentQuestion = questions[currentIndex];
  const currentCell = board.cells[Math.min(currentIndex, board.cells.length - 1)];
  const isLastQuestion = currentIndex >= totalQuestions - 1;
  const currentValue = answers.find((answer) => answer.questionId === currentQuestion?.id)?.value;

  const persist = (nextAnswers: Answer[], gender: "male" | "female", type: DiagnosisType) => {
    saveSession({ diagnosisType: type, userGender: gender, answers: nextAnswers }, "liff");
  };

  const handleSelectType = (type: DiagnosisType) => {
    setDiagnosisType(type);
    setStep("gender");
  };

  const handleSelectGender = async (gender: "male" | "female") => {
    setUserGender(gender);
    setLoading(true);
    try {
      const list = await fetchQuestions(diagnosisType);
      setQuestions(list);
      setCurrentIndex(0);
      setAnswers([]);
      persist([], gender, diagnosisType);
      setStep("questions");
      trackDiagnosisStart(diagnosisType, "liff");
    } catch {
      setError("質問の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const submitDiagnosis = async (finalAnswers: Answer[]) => {
    if (!userGender || !lineUserId || submitStateRef.current === "pending") return;
    submitStateRef.current = "pending";
    setSubmitFailed(false);
    try {
      const res = await fetch("/api/diagnosis/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosisType, userGender, answers: finalAnswers, lineUserId }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      if (data.results) sessionStorage.setItem("latestMatching", JSON.stringify(data.results));
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
      if (data.diagnosis) sessionStorage.setItem("latestDiagnosis", JSON.stringify(data.diagnosis));
      submitStateRef.current = "done";
    } catch {
      submitStateRef.current = "error";
      setSubmitFailed(true);
    }
  };

  // タップで即確定。盤の移動は「答えた瞬間に進む」でなければゲームにならない
  const handleSelect = (value: number) => {
    if (!currentQuestion || !userGender) return;
    const nextAnswers = [
      ...answers.filter((answer) => answer.questionId !== currentQuestion.id),
      { questionId: currentQuestion.id, value },
    ];
    setAnswers(nextAnswers);
    persist(nextAnswers, userGender, diagnosisType);
    setError(null);
    setResumeNote(null);
    setMove((prev) => ({ kind: "forward", step: prev.step + 1 }));

    if (currentCell?.isMilestone) {
      setStep("milestone");
      return;
    }
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    setStep("warn");
  };

  const handleMilestoneContinue = () => {
    setMove((prev) => ({ kind: "forward", step: prev.step + 1 }));
    if (!isLastQuestion) {
      setStep("questions");
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    setStep("warn");
  };

  const startReveal = () => {
    setStep("reveal");
    trackDiagnosisComplete(diagnosisType, "liff");
    void submitDiagnosis(answers);
  };

  const handlePrev = () => {
    setError(null);
    setResumeNote(null);
    // 後退は即座・無演出（戻る動きを演出すると「間違えた」の意味が発生する）
    setMove((prev) => ({ kind: "instant", step: prev.step }));
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  /* ===== 警告フルスクリーン（開封の手前に1回だけ） ===== */
  if (step === "warn") {
    return (
      <WarningGate
        totalQuestions={totalQuestions}
        worstLabel={diagnosisType === "light" ? "タイプ" : "5タイプ"}
        submitFailed={submitFailed}
        onProceed={startReveal}
        onCancel={() => setStep("questions")}
      />
    );
  }

  /* ===== 開封 ===== */
  if (step === "reveal") {
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
        onRetry={() => setStep("questions")}
        reducedMotion={reducedMotion}
        resultHref="/liff/diagnosis/result"
      />
    );
  }

  if (!isReady && !error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-line border-t-primary" />
          <p className="text-sm font-bold text-txt-subtle">LINE接続中...</p>
        </div>
      </div>
    );
  }

  // Step: Select Diagnosis Type
  if (step === "type") {
    return (
      <div className="min-h-screen bg-ink text-white">
        <div className="mx-auto max-w-xl px-5.5 pb-10 pt-[30px]">
          <div className="text-[11px] font-black tracking-[0.22em] text-hazard">STEP 1 / 3</div>
          <h1 className="mt-3.5 text-[28px] font-black leading-[1.4] tracking-[-0.02em]">
            どこまで
            <br />
            言われたいですか。
          </h1>
          <p className="mt-3 text-[13px] leading-[1.95] text-txt-muted">
            設問が多いほど、指摘は具体的になります。
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleSelectType("light")}
              className="rounded-[18px] border border-line bg-surface p-5 text-left transition-colors hover:border-hazard"
            >
              <div className="flex items-center justify-between">
                <span className="text-[19px] font-black">ライト診断</span>
                <span className="rounded-full bg-line-soft px-2.5 py-1 text-[11px] font-black text-txt-muted">
                  10問 / 約2分
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-[1.9] text-txt-muted">
                まず味見したい人へ。ワースト3までお伝えします。
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectType("full")}
              className="relative rounded-[18px] border border-primary bg-[linear-gradient(160deg,#160d14,#0d111b)] p-5 text-left shadow-[0_20px_50px_-26px_rgba(255,46,116,.9)] transition-colors hover:border-hazard"
            >
              <div className="flex items-center justify-between">
                <span className="text-[19px] font-black">スタンダード診断</span>
                <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-black text-white">
                  40問 / 約5分
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-[1.9] text-txt-muted">
                ワースト5・地獄のシナリオ・NG行動まで全部。おすすめ。
              </p>
            </button>
          </div>

          <div className="mt-5.5 rounded-[14px] border border-line-soft bg-panel p-4">
            <div className="text-[10px] font-black tracking-[0.22em] text-hazard">注意事項</div>
            <p className="mt-2 text-[11px] leading-[1.9] text-txt-subtle">
              本診断はエンタメ目的です。診断結果はタイプに対する記述であり、特定の個人を否定するものではありません。
            </p>
          </div>

          {error && (
            <p className="mt-4 rounded-input bg-error/15 px-4 py-2 text-[12px] font-bold text-errortext">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step: Select Gender
  if (step === "gender") {
    return (
      <div className="min-h-screen bg-ink text-white">
        <div className="mx-auto max-w-xl px-5.5 pb-10 pt-[30px]">
          <div className="text-[11px] font-black tracking-[0.22em] text-hazard">STEP 2 / 3</div>
          <h1 className="mt-3.5 text-[28px] font-black leading-[1.4] tracking-[-0.02em]">
            あなたの性別は？
          </h1>
          <p className="mt-3 text-[13px] leading-[1.95] text-txt-muted">
            マッチング候補の抽出にのみ使用します。
          </p>

          {loading ? (
            <div className="mt-[26px] flex flex-col items-center gap-5 py-10">
              <div className="w-[160px] overflow-hidden rounded-full">
                <div className="animate-marquee h-2 w-[400%] bg-hazard-sm" />
              </div>
              <p className="text-[12px] font-bold text-txt-subtle">質問を用意しています…</p>
            </div>
          ) : (
            <div className="mt-[26px] grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectGender("male")}
                className="rounded-[18px] border border-line bg-surface px-3 py-[30px] text-[17px] font-black transition-colors hover:border-primary hover:bg-dangerbg"
              >
                男性
              </button>
              <button
                type="button"
                onClick={() => handleSelectGender("female")}
                className="rounded-[18px] border border-line bg-surface px-3 py-[30px] text-[17px] font-black transition-colors hover:border-primary hover:bg-dangerbg"
              >
                女性
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep("type")}
            className="mt-5 min-h-[44px] text-[12px] font-bold text-txt-subtle transition-colors hover:text-white"
          >
            ← 戻る
          </button>

          {error && (
            <p className="mt-4 rounded-input bg-error/15 px-4 py-2 text-[12px] font-bold text-errortext">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ===== 設問（盤面 + 設問カード / 中間マス） ===== */
  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink text-white">
      {/* 盤面: これが進捗表示そのもの */}
      <div className="relative h-[32dvh] min-h-[190px] border-b border-line-soft bg-panel">
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
      <div className="flex-1 overflow-y-auto px-5.5 pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        <div className="mx-auto max-w-2xl">
          {currentQuestion && step === "milestone" && (
            <MilestoneCard
              text={milestoneText(questions, answers, currentIndex, totalQuestions)}
              onContinue={handleMilestoneContinue}
              continueLabel={isLastQuestion ? "結果へ" : "進む"}
            />
          )}

          {currentQuestion && step === "questions" && (
            <QuestionCard
              question={currentQuestion}
              currentValue={currentValue}
              onSelect={handleSelect}
              counter={`Q${currentIndex + 1} / ${totalQuestions}`}
            />
          )}

          {error && (
            <p className="mt-4 rounded-input bg-error/15 px-4 py-2 text-xs font-bold text-errortext">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* フッター */}
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between border-t border-line-soft px-5.5 pb-[max(22px,env(safe-area-inset-bottom))] pt-3.5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0 || step === "milestone"}
          className="text-xs font-bold text-txt-subtle transition-colors hover:text-white disabled:opacity-40"
        >
          ← 前の質問
        </button>
        <span className="text-[10px] font-bold text-txt-disabled">タップで進みます</span>
      </div>
    </div>
  );
}
