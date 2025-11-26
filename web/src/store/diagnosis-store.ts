import { create } from "zustand";

import { Answer, DiagnosisPayload, DiagnosisType } from "@/types/diagnosis";
import { getQuestionsByType } from "@/data/questions";
import { loadSession, saveSession } from "@/lib/diagnosis/session";

type DiagnosisState = {
  diagnosisType: DiagnosisType;
  answers: Answer[];
  progress: number;
  setDiagnosisType: (type: DiagnosisType) => void;
  answerQuestion: (answer: Answer) => void;
  loadFromStorage: () => void;
  reset: () => void;
};

export const useDiagnosisStore = create<DiagnosisState>((set, get) => ({
  diagnosisType: "light",
  answers: [],
  progress: 0,
  setDiagnosisType: (type) => set({ diagnosisType: type, answers: [], progress: 0 }),
  answerQuestion: (answer) => {
    const state = get();
    const filtered = state.answers.filter((item) => item.questionId !== answer.questionId);
    const nextAnswers = [...filtered, answer];
    const questionLength = getQuestionsByType(state.diagnosisType).length;
    const nextProgress = Math.round((nextAnswers.length / questionLength) * 100);

    const payload: DiagnosisPayload = {
      diagnosisType: state.diagnosisType,
      answers: nextAnswers,
    };
    saveSession(payload);

    set({ answers: nextAnswers, progress: nextProgress });
  },
  loadFromStorage: () => {
    const session = loadSession();
    if (!session) return;
    const questionLength = getQuestionsByType(session.diagnosisType).length;
    const progress = Math.round((session.answers.length / questionLength) * 100);
    set({
      diagnosisType: session.diagnosisType,
      answers: session.answers,
      progress,
    });
  },
  reset: () => set({ answers: [], progress: 0 }),
}));
