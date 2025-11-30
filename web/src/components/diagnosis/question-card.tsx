"use client";

import { DiagnosisQuestion } from "@/types/diagnosis";

type Props = {
  question: DiagnosisQuestion;
  currentValue?: number;
  onSelect: (value: number) => void;
};

export const QuestionCard = ({ question, currentValue, onSelect }: Props) => {
  return (
    <div className="rounded-[2.5rem] border-2 border-white bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50">
      <div className="text-center mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-3">
          QUESTION {question.number}
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
          {question.text}
        </h2>
        {question.helper && (
          <p className="mt-3 text-base font-medium text-slate-500">{question.helper}</p>
        )}
      </div>
      
      <div className="grid gap-4 sm:grid-cols-1">
        {question.options.map((option) => {
          const isSelected = currentValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-300 ease-out hover:scale-[1.01] ${
                isSelected
                  ? "border-[#E91E63] bg-[#E91E63]/5 shadow-lg shadow-[#E91E63]/10"
                  : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                isSelected
                  ? "border-[#E91E63] bg-[#E91E63] text-white"
                  : "border-slate-200 bg-slate-50 text-slate-400 group-hover:border-slate-300"
              }`}>
                {isSelected && (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`ml-4 text-lg font-bold transition-colors ${
                isSelected ? "text-[#E91E63]" : "text-slate-700 group-hover:text-slate-900"
              }`}>
                {option.label}
              </span>
              {isSelected && (
                <div className="absolute right-4 h-2 w-2 rounded-full bg-[#E91E63] animate-ping" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
