"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { QuestionCard } from "@/components/diagnosis/question-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
      sessionStorage.setItem("latestMatching", JSON.stringify(data.results));
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

        {questionsLoading && (
          <div className="mt-8 rounded-3xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            質問を読み込んでいます...
          </div>
        )}

        {!questionsLoading && !currentQuestion && (
          <div className="mt-8 rounded-3xl border border-dashed border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
            質問データを取得できませんでした。時間を置いて再度お試しください。
          </div>
        )}

        {currentQuestion && !questionsLoading && (
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
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0 || questionsLoading}
          >
            前へ
          </Button>
          {currentIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={submitting || questionsLoading || !currentQuestion}>
              {submitting ? "AIが結果を生成中..." : "結果を見る"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={questionsLoading || !currentQuestion}>
              次へ
            </Button>
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
