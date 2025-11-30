"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { QuestionCard } from "@/components/diagnosis/question-card";
import { DiagnosisAnalysisOverlay } from "@/components/diagnosis/analysis-overlay";
import { Button } from "@/components/ui/button";
import { DiagnosisQuestion } from "@/types/diagnosis";
import { clearSession, saveSession } from "@/lib/diagnosis/session";
import { useDiagnosisStore } from "@/store/diagnosis-store";

const DiagnosisPage = () => {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const diagnosisType = params.type === "full" ? "full" : params.type === "light" ? "light" : null;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<DiagnosisQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const {
    answers,
    progress,
    userGender,
    setDiagnosisType,
    loadFromStorage,
    answerQuestion,
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

  if (!diagnosisType) {
    notFound();
  }

  const currentQuestion = questions[currentIndex];

  const handleSelect = (value: number) => {
    if (!currentQuestion) return;
    answerQuestion({ questionId: currentQuestion.id, value });
  };

  const handleNext = () => {
    setError(null);
    if (!currentQuestion) return;
    const hasAnswer = answers.some((answer) => answer.questionId === currentQuestion.id);
    if (!hasAnswer) {
      setError("回答を選択してください");
      return;
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (answers.length < questions.length) {
      setError("未回答の質問があります");
      return;
    }
    if (!userGender) {
      setError("性別が選択されていません");
      return;
    }
    setSubmitting(true);
    setError(null);
    
    // まずAPIリクエストを開始（裏側で実行）
    try {
      const payload = {
        diagnosisType,
        userGender,
        answers,
      } as const;
      saveSession(payload);
      const response = await fetch("/api/diagnosis/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      }
      if (data.diagnosis) {
        sessionStorage.setItem("latestDiagnosis", JSON.stringify(data.diagnosis));
      }
      
      // API成功後、オーバーレイを表示して演出開始
      setShowOverlay(true);
      
    } catch (err) {
      setError("診断結果の生成に失敗しました。時間を置いて再実行してください。");
      console.error(err);
      setSubmitting(false);
    }
  };

  const handleOverlayComplete = () => {
    router.push("/result");
  };

  const currentValue = answers.find((answer) => answer.questionId === currentQuestion?.id)?.value;

  if (showOverlay) {
    return <DiagnosisAnalysisOverlay onComplete={handleOverlayComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 md:py-20">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-2xl">
          
          {/* Progress Header */}
          <div className="mb-8 rounded-[2rem] border-2 border-white bg-white/80 backdrop-blur-sm p-6 shadow-lg shadow-slate-200/50">
            <div className="flex items-center justify-between text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  diagnosisType === "light" 
                    ? "bg-blue-50 text-blue-600 border-blue-100" 
                    : "bg-pink-50 text-pink-600 border-pink-100"
                }`}>
                {diagnosisType === "light" ? "LIGHT MODE" : "STANDARD MODE"}
                </span>
                <span className="font-bold text-slate-400">
                  Q.{currentIndex + 1} <span className="text-xs font-normal text-slate-300">/ {questions.length}</span>
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400">{progress}% COMPLETE</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className="h-full bg-gradient-to-r from-[#E91E63] to-pink-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {questionsLoading && (
            <div className="mt-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-pink-500 mb-4"></div>
              <p className="text-sm font-bold text-slate-400">質問データを読み込んでいます...</p>
            </div>
          )}

          {!questionsLoading && !currentQuestion && (
            <div className="mt-8 rounded-[2.5rem] border-2 border-dashed border-red-200 bg-red-50/50 p-8 text-center">
              <p className="text-sm font-bold text-red-500">データの取得に失敗しました</p>
              <Button onClick={() => window.location.reload()} variant="ghost" className="text-red-600 mt-2 hover:text-red-700 hover:bg-red-100 underline">
                再読み込みする
              </Button>
            </div>
          )}

          {currentQuestion && !questionsLoading && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <QuestionCard
                question={currentQuestion}
                currentValue={currentValue}
                onSelect={handleSelect}
              />
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-center animate-in fade-in zoom-in duration-300">
              <p className="text-sm font-bold text-red-500 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </p>
            </div>
          )}

          <div className="mt-10 flex items-center gap-4">
            <Button
              variant="ghost"
              size="lg"
              onClick={handlePrev}
              disabled={currentIndex === 0 || questionsLoading}
              className="flex-1 h-14 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              ← 前へ
            </Button>
            
            {currentIndex === questions.length - 1 ? (
              <Button 
                size="lg"
                onClick={handleSubmit} 
                disabled={submitting || questionsLoading || !currentQuestion}
                className="flex-[2] h-14 rounded-xl bg-gradient-to-r from-[#E91E63] to-pink-600 text-lg font-bold text-white shadow-lg shadow-pink-200 hover:shadow-xl hover:shadow-pink-300 hover:scale-[1.02] transition-all"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    AI分析中...
                  </span>
                ) : (
                  "診断結果を見る →"
                )}
              </Button>
            ) : (
              <Button 
                size="lg"
                onClick={handleNext} 
                disabled={questionsLoading || !currentQuestion}
                className="flex-[2] h-14 rounded-xl bg-slate-900 text-lg font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                次へ →
              </Button>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => clearSession()}
              className="text-slate-300 hover:text-slate-500 text-xs underline"
            >
              保存データをリセットして最初から
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisPage;
