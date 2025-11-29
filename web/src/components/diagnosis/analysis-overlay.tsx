"use client";

import { useEffect, useState } from "react";

type Step = {
  label: string;
  duration: number; // ms
};

const STEPS: Step[] = [
  { label: "回答データを解析中...", duration: 1200 },
  { label: "性格特性を多次元マッピング...", duration: 1500 },
  { label: "相性データベースと照合中...", duration: 1500 },
  { label: "運命の相手を特定しました。", duration: 1000 },
];

type Props = {
  onComplete: () => void;
};

export const DiagnosisAnalysisOverlay = ({ onComplete }: Props) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let startTime = Date.now();
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const currentStep = STEPS[currentStepIndex];

      if (elapsed < currentStep.duration) {
        // ステップ内の進捗
        const stepProgress = (elapsed / currentStep.duration) * 100;
        // 全体の進捗（簡易計算）
        const totalProgress = 
          (currentStepIndex / STEPS.length) * 100 + 
          (stepProgress / STEPS.length);
        
        setProgress(Math.min(totalProgress, 100));
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // 次のステップへ
        if (currentStepIndex < STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
          startTime = Date.now();
          animationFrameId = requestAnimationFrame(animate);
        } else {
          // 全ステップ完了
          setProgress(100);
          setTimeout(onComplete, 500);
        }
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentStepIndex, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white">
      {/* 背景のパーティクル演出（簡易版） */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-[#E91E63] blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 blur-[80px] animate-ping" style={{ animationDuration: "3s" }} />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-purple-600 blur-[100px] animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md px-8 text-center">
        {/* AIアイコン */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_30px_rgba(233,30,99,0.3)] animate-bounce">
          <svg className="h-10 w-10 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>

        {/* ステップテキスト */}
        <h2 className="mb-2 text-2xl font-bold tracking-wider animate-pulse">
          AI ANALYZING
        </h2>
        <p className="mb-8 text-lg font-medium text-slate-300 h-8">
          {STEPS[currentStepIndex].label}
        </p>

        {/* プログレスバー */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-[#E91E63] to-purple-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-right text-xs font-mono text-slate-500">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};
