"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DiagnosisAnalysisOverlay } from "@/components/diagnosis/analysis-overlay";
import { Button } from "@/components/ui/button";
import { DiagnosisQuestion, DiagnosisType } from "@/types/diagnosis";
import { useLiff } from "@/lib/line/use-liff";

type Answer = { questionId: string; value: number };

// トゥゲル診断の5つの取扱指標（設問の右上ラベルに表示）※本体diagnosisと同一
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

export default function LiffDiagnosisPage() {
  const router = useRouter();
  const { isReady, lineUserId, error: liffError } = useLiff();

  const [step, setStep] = useState<"type" | "gender" | "questions" | "submitting">("type");
  const [diagnosisType, setDiagnosisType] = useState<DiagnosisType>("light");
  const [userGender, setUserGender] = useState<"male" | "female" | null>(null);
  const [questions, setQuestions] = useState<DiagnosisQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (liffError) setError(liffError);
  }, [liffError]);

  const handleSelectType = (type: DiagnosisType) => {
    setDiagnosisType(type);
    setStep("gender");
  };

  const handleSelectGender = async (gender: "male" | "female") => {
    setUserGender(gender);
    setLoading(true);
    try {
      const res = await fetch(`/api/questions/${diagnosisType}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const json = await res.json();
      setQuestions(json.questions as DiagnosisQuestion[]);
      setCurrentIndex(0);
      setAnswers([]);
      setProgress(0);
      setStep("questions");
    } catch {
      setError("質問の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (value: number) => {
    const q = questions[currentIndex];
    if (!q) return;
    const filtered = answers.filter((a) => a.questionId !== q.id);
    const next = [...filtered, { questionId: q.id, value }];
    setAnswers(next);
    setProgress(Math.round((next.length / questions.length) * 100));
  };

  const handleNext = () => {
    setError(null);
    const q = questions[currentIndex];
    if (!q) return;
    if (!answers.some((a) => a.questionId === q.id)) {
      setError("回答を選択してください");
      return;
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleSubmit = async () => {
    if (answers.length < questions.length) {
      setError("未回答の質問があります");
      return;
    }
    if (!userGender || !lineUserId) return;

    setStep("submitting");
    setError(null);

    try {
      const res = await fetch("/api/diagnosis/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosisType,
          userGender,
          answers,
          lineUserId,
        }),
      });

      if (!res.ok) throw new Error("Submit failed");

      const data = await res.json();
      if (data.results) sessionStorage.setItem("latestMatching", JSON.stringify(data.results));
      if (data.mismatchResults) sessionStorage.setItem("latestMismatch", JSON.stringify(data.mismatchResults));
      if (data.diagnosis) sessionStorage.setItem("latestDiagnosis", JSON.stringify(data.diagnosis));

      setShowOverlay(true);
    } catch {
      setError("診断結果の生成に失敗しました");
      setStep("questions");
    }
  };

  const handleOverlayComplete = () => {
    router.push("/liff/diagnosis/result");
  };

  if (showOverlay) {
    return <DiagnosisAnalysisOverlay onComplete={handleOverlayComplete} />;
  }

  if (!isReady && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500 mb-4" />
          <p className="text-sm font-bold text-slate-400">LINE接続中...</p>
        </div>
      </div>
    );
  }

  // Step: Select Diagnosis Type
  if (step === "type") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
        <div className="container px-4">
          <div className="mx-auto max-w-lg text-center">
            <div className="mb-2 text-4xl">🧠</div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Togel性格診断</h1>
            <p className="text-sm text-slate-500 mb-8">診断タイプを選んでください</p>

            <div className="space-y-4">
              <button
                onClick={() => handleSelectType("light")}
                className="w-full rounded-2xl border-2 border-white bg-white/80 p-6 text-left shadow-lg transition hover:scale-[1.02] hover:border-blue-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-black text-slate-900">ライト版</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">10問</span>
                </div>
                <p className="text-sm text-slate-500">3分でサクッと診断。まずは気軽に。</p>
              </button>

              <button
                onClick={() => handleSelectType("full")}
                className="w-full rounded-2xl border-2 border-white bg-white/80 p-6 text-left shadow-lg transition hover:scale-[1.02] hover:border-pink-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-black text-slate-900">スタンダード版</span>
                  <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">40問</span>
                </div>
                <p className="text-sm text-slate-500">精度重視のスタンダード。約8分。</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: Select Gender
  if (step === "gender") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
        <div className="container px-4">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">性別を選択</h1>
            <p className="text-sm text-slate-500 mb-8">マッチング結果表示のために教えてください</p>

            {loading ? (
              <div className="py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSelectGender("male")}
                  className="flex flex-col items-center rounded-2xl border-2 border-white bg-white/80 p-6 shadow-lg transition hover:scale-105 hover:border-blue-200"
                >
                  <span className="text-5xl mb-3">👨</span>
                  <span className="text-xl font-black text-slate-900">男性</span>
                </button>
                <button
                  onClick={() => handleSelectGender("female")}
                  className="flex flex-col items-center rounded-2xl border-2 border-white bg-white/80 p-6 shadow-lg transition hover:scale-105 hover:border-pink-200"
                >
                  <span className="text-5xl mb-3">👩</span>
                  <span className="text-xl font-black text-slate-900">女性</span>
                </button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => setStep("type")}
              className="mt-6 text-slate-400 hover:text-slate-600"
            >
              ← 戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step: Questions
  const currentQuestion = questions[currentIndex];
  const currentValue = answers.find((a) => a.questionId === currentQuestion?.id)?.value;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink text-white">
      {/* 進捗ヘッダー（本体diagnosisと同デザイン） */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-[11px] font-black">
          <span className="text-txt-muted">
            Q{currentIndex + 1} <span className="text-txt-disabled">/ {questions.length || "-"}</span>
          </span>
          <span className="tracking-[0.14em] text-hazard">
            {currentQuestion ? (TRAIT_LABELS[currentQuestion.trait] ?? "") : ""}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
          <div
            className="h-full rounded-full bg-progress transition-all duration-300 ease-togel"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 設問本体 */}
      <div className="flex-1 overflow-y-auto px-5.5 pb-6 pt-[34px]">
        {currentQuestion && (
          <div key={currentQuestion.id} className="animate-rise mx-auto max-w-2xl">
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
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between border-t border-line-soft px-5.5 pb-5.5 pt-3.5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="text-xs font-bold text-txt-subtle transition-colors hover:text-white disabled:opacity-40"
        >
          ← 前の質問
        </button>
        {currentIndex === questions.length - 1 ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={step === "submitting"}
            className="flex min-h-[48px] items-center rounded-full bg-primary px-6 text-[13px] font-black text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {step === "submitting" ? "AI分析中..." : "診断結果を見る →"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="flex min-h-[48px] items-center rounded-full border border-line px-6 text-[13px] font-bold text-txt-muted transition-colors hover:border-primary hover:text-white"
          >
            次へ →
          </button>
        )}
      </div>
    </div>
  );
}
