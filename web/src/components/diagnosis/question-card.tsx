"use client";

import { Button } from "@/components/ui/button";
import { DiagnosisQuestion } from "@/types/diagnosis";

type Props = {
  question: DiagnosisQuestion;
  currentValue?: number;
  onSelect: (value: number) => void;
};

export const QuestionCard = ({ question, currentValue, onSelect }: Props) => {
  return (
    <div className="rounded-3xl border border-border bg-white/95 p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        Q{question.number}
      </p>
      <h2 className="mt-3 text-2xl font-semibold">{question.text}</h2>
      {question.helper && (
        <p className="mt-2 text-sm text-muted-foreground">{question.helper}</p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {question.options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={currentValue === option.value ? "primary" : "outline"}
            className="justify-start"
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
