"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { QuestionCard } from "@/components/diagnosis/question-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getQuestionsByType } from "@/data/questions";
import { runMatching } from "@/lib/matching/engine";
import { clearSession, saveSession } from "@/lib/diagnosis/session";
import { useDiagnosisStore } from "@/store/diagnosis-store";

const DiagnosisPage = () => {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const diagnosisType = params.type === "full" ? "full" : params.type === "light" ? "light" : null;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = useMemo(() => {
    if (!diagnosisType) return [];
    return getQuestionsByType(diagnosisType);
  }, [diagnosisType]);

  const {
    answers,
    progress,
    setDiagnosisType,
    loadFromStorage,
    answerQuestion,
  } = useDiagnosisStore();

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
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        diagnosisType,
        answers,
      } as const;
      saveSession(payload);
      const results = runMatching(payload);
      sessionStorage.setItem("latestMatching", JSON.stringify(results));
      router.push("/result");
    } catch (err) {
      setError("診断結果の生成に失敗しました。時間を置いて再実行してください。");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentValue = answers.find((answer) => answer.questionId === currentQuestion?.id)?.value;

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-white/80 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              {diagnosisType === "light" ? "ライト版" : "しっかり版"}
            </span>
            <span className="text-xs text-muted-foreground">{progress}% 完了</span>
          </div>
          <Progress value={progress} className="mt-3" />
        </div>

        {currentQuestion && (
          <div className="mt-8">
            <QuestionCard
              question={currentQuestion}
              currentValue={currentValue}
              onSelect={handleSelect}
            />
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
            前へ
          </Button>
          {currentIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "AIが結果を生成中..." : "結果を見る"}
            </Button>
          ) : (
            <Button onClick={handleNext}>次へ</Button>
          )}
        </div>
        <div className="mt-4 text-right">
          <Button variant="ghost" size="sm" onClick={() => clearSession()}>
            保存データをリセット
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisPage;
