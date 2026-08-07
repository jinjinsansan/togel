"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DiagnosisQuestion } from "@/types/diagnosis";
import { clearSession, saveSession } from "@/lib/diagnosis/session";
import { personalityTypes } from "@/lib/personality";
import { useDiagnosisStore } from "@/store/diagnosis-store";

// トゥゲル診断の5つの取扱指標（設問の右上ラベルに表示）
const TRAIT_LABELS: Record<string, string> = {
  openness: "引火点",
  conscientiousness: "構造強度",
  extraversion: "放熱量",
  agreeableness: "緩衝性能",
  neuroticism: "耐圧限界",
};

/** 選択肢の値ごとのドット色（ピンク=あてはまる ↔ イエロー=あてはまらない） */
const DOT_COLORS: Record<number, string> = {
  5: "#FF2E74",
  4: "rgba(255,46,116,.6)",
  3: "#39415a",
  2: "rgba(255,224,61,.6)",
  1: "#FFE03D",
};

/** 進捗に応じてフッターの煽り文を強くする */
const teaseForProgress = (pct: number): string => {
  if (pct >= 90) return "もう逃げられません";
  if (pct >= 60) return "だんだん見えてきました";
  if (pct >= 30) return "半分すぎました";
  return "まだ余裕ですね";
};

type Phase = "quiz" | "warn" | "reveal";

type WorstReveal = {
  typeName: string;
  catchphrase: string;
};

const DiagnosisPage = () => {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const diagnosisType = params.type === "full" ? "full" : params.type === "light" ? "light" : null;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<DiagnosisQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [count, setCount] = useState(3);
  const [worst, setWorst] = useState<WorstReveal | null>(null);
  const [submitFailed, setSubmitFailed] = useState(false);
  const submitStateRef = useRef<"idle" | "pending" | "done" | "error">("idle");
  const countTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    answers,
    progress,
    userGender,
    setDiagnosisType,
    loadFromStorage,
    answerQuestion,
    reset,
  } = useDiagnosisStore();

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
  const resumeApplied = useRef(false);
  useEffect(() => {
    if (resumeApplied.current || questions.length === 0) return;
    resumeApplied.current = true;
    if (answers.length === 0) return;
    const answeredIds = new Set(answers.map((answer) => answer.questionId));
    const firstUnanswered = questions.findIndex((question) => !answeredIds.has(question.id));
    setCurrentIndex(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered);
  }, [questions, answers]);

  useEffect(() => {
    return () => {
      if (countTimerRef.current) clearInterval(countTimerRef.current);
    };
  }, []);

  if (!diagnosisType) {
    notFound();
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const displayProgress = totalQuestions
    ? Math.round(((currentIndex + 1) / totalQuestions) * 100)
    : 0;

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
          setWorst({ typeName: extended.typeName, catchphrase: extended.catchphrase });
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
    setCount(3);
    void submitDiagnosis();
    if (countTimerRef.current) clearInterval(countTimerRef.current);
    countTimerRef.current = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          if (countTimerRef.current) clearInterval(countTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 900);
  };

  const handleSelect = (value: number) => {
    if (!currentQuestion) return;
    answerQuestion({ questionId: currentQuestion.id, value });
    setError(null);
    // 1問1画面・タップで即次へ（確定ボタンなし）
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase("warn");
    }
  };

  const handlePrev = () => {
    setError(null);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const currentValue = answers.find((answer) => answer.questionId === currentQuestion?.id)?.value;

  /* ===== 警告フルスクリーン ===== */
  if (phase === "warn") {
    return (
      <div className="animate-flash relative flex min-h-[100dvh] flex-col items-center justify-center bg-dangerbg px-[26px] py-[34px] text-center text-white">
        <div className="absolute inset-x-0 top-0 h-[10px] bg-hazard" aria-hidden="true" />
        <div className="flex h-[82px] w-[82px] items-center justify-center rounded-hero bg-hazard text-[40px] font-black text-ink">
          ▲
        </div>
        <div className="mt-6 text-[11px] font-black tracking-[0.34em] text-hazard">WARNING</div>
        <h2 className="mt-3.5 text-[30px] font-black leading-[1.45] tracking-[-0.02em]">
          この先、
          <br />
          けっこう言います。
        </h2>
        <p className="mt-4 max-w-[22em] text-[13px] leading-8 text-txt-muted">
          {totalQuestions}問の回答から、あなたと絶対に合わない
          {diagnosisType === "light" ? "タイプ" : "5タイプ"}
          を特定しました。読んだあと、笑える人だけ進んでください。
        </p>
        {submitFailed && (
          <p className="mt-4 rounded-input bg-error/15 px-4 py-2 text-xs font-bold text-errortext">
            診断結果の生成に失敗しました。もう一度お試しください。
          </p>
        )}
        <button
          type="button"
          onClick={startReveal}
          className="mt-[30px] min-h-[58px] w-full max-w-sm rounded-card bg-primary text-base font-black text-white shadow-danger transition-colors hover:bg-primary-hover"
        >
          覚悟して開ける
        </button>
        <button
          type="button"
          onClick={() => setPhase("quiz")}
          className="mt-3 text-xs font-bold text-txt-subtle transition-colors hover:text-white"
        >
          やっぱりやめる
        </button>
        <div className="absolute inset-x-0 bottom-0 h-[10px] bg-hazard" aria-hidden="true" />
      </div>
    );
  }

  /* ===== カウントダウン開封 ===== */
  if (phase === "reveal") {
    const running = count > 0;
    const waitingForResult = !running && !worst && !submitFailed;
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[radial-gradient(90%_60%_at_50%_40%,rgba(255,46,116,.3),#07090F_70%)] px-[26px] py-[34px] text-center text-white">
        <div className="text-[11px] font-black tracking-[0.3em] text-hazard">
          WORST 1 を発表します
        </div>
        <div className="relative mt-[30px] flex h-[190px] w-[190px] items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-line" aria-hidden="true" />
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary"
            aria-hidden="true"
          />
          <div className="text-[74px] font-black leading-none tracking-[-0.05em]">
            {running ? count : "!"}
          </div>
        </div>
        <p className="mt-7 animate-pulse text-[13px] leading-8 text-txt-muted">
          {running
            ? "心の準備をしてください"
            : waitingForResult
              ? "言い方を選んでいます…"
              : submitFailed
                ? "診断結果の生成に失敗しました"
                : "あなたと絶対に合わないのは"}
        </p>

        {!running && worst && (
          <div className="animate-rise mt-[26px] w-full max-w-sm">
            <div className="rounded-[18px] border border-primary bg-surface p-5 text-left">
              <div className="text-[10px] font-black tracking-[0.22em] text-primary">WORST 1</div>
              <div className="mt-2 text-[26px] font-black tracking-[-0.02em]">{worst.typeName}</div>
              {worst.catchphrase && (
                <div className="mt-1 text-xs font-bold text-txt-muted">{worst.catchphrase}</div>
              )}
            </div>
            <Link
              href="/result/mismatch"
              className="mt-3 flex min-h-[56px] items-center justify-center rounded-card bg-hazard text-[15px] font-black text-ink shadow-cta transition-colors hover:bg-white"
            >
              ワースト{diagnosisType === "light" ? "3" : "5"}をすべて見る
            </Link>
          </div>
        )}

        {!running && submitFailed && (
          <button
            type="button"
            onClick={() => setPhase("warn")}
            className="mt-6 min-h-[48px] rounded-full border border-line px-6 text-sm font-bold text-txt-muted transition-colors hover:text-white"
          >
            戻ってやり直す
          </button>
        )}
      </div>
    );
  }

  /* ===== 設問画面 ===== */
  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink text-white">
      {/* 進捗ヘッダー */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-[11px] font-black">
          <span className="text-txt-muted">
            Q{currentIndex + 1} <span className="text-txt-disabled">/ {totalQuestions || "-"}</span>
          </span>
          <span className="tracking-[0.14em] text-hazard">
            {currentQuestion ? (TRAIT_LABELS[currentQuestion.trait] ?? "") : ""}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
          <div
            className="h-full rounded-full bg-progress transition-all duration-300 ease-togel"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>

      {/* 設問本体 */}
      <div className="flex-1 overflow-y-auto px-5.5 pb-6 pt-[34px]">
        {questionsLoading && (
          <div className="flex flex-col items-center gap-5 pt-16">
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

        {currentQuestion && !questionsLoading && (
          <div key={currentQuestion.id} className="animate-rise">
            <div className="text-[11px] font-black tracking-[0.2em] text-txt-disabled">QUESTION</div>
            <h2
              className="mt-3.5 text-[25px] font-black leading-relaxed tracking-[-0.01em]"
              style={{ textWrap: "pretty" }}
            >
              {currentQuestion.text}
            </h2>
            <p className="mt-3.5 text-xs leading-[1.9] text-txt-subtle">
              直感で。考え込むほど当たらなくなります。
            </p>

            <div className="mt-[26px] flex flex-col gap-[9px]">
              {[...currentQuestion.options]
                .sort((a, b) => b.value - a.value)
                .map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`flex min-h-[56px] items-center gap-3 rounded-[14px] border px-[18px] text-left text-sm font-bold transition-colors ${
                      currentValue === option.value
                        ? "border-primary bg-dangerbg text-white"
                        : "border-line bg-surface text-[#e2e7f0] hover:border-primary hover:bg-dangerbg"
                    }`}
                  >
                    <span
                      className="h-[9px] w-[9px] flex-none rounded-full"
                      style={{ background: DOT_COLORS[option.value] ?? "#39415a" }}
                      aria-hidden="true"
                    />
                    {option.label}
                  </button>
                ))}
            </div>

            {error && (
              <p className="mt-4 rounded-input bg-error/15 px-4 py-2 text-xs font-bold text-errortext">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="flex items-center justify-between border-t border-line-soft px-5.5 pb-5.5 pt-3.5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0 || questionsLoading}
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
        <span className="text-[11px] text-txt-disabled">{teaseForProgress(progress)}</span>
      </div>
    </div>
  );
};

export default DiagnosisPage;
