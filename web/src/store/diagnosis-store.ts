import { create } from "zustand";

import { Answer, DiagnosisPayload, DiagnosisType } from "@/types/diagnosis";
import { getQuestionsByType } from "@/data/questions";
import { loadSession, saveSession } from "@/lib/diagnosis/session";

type DiagnosisState = {
  diagnosisType: DiagnosisType;
  userGender: "male" | "female" | null;
  answers: Answer[];
  progress: number;
  setDiagnosisType: (type: DiagnosisType) => void;
  setUserGender: (gender: "male" | "female") => void;
  answerQuestion: (answer: Answer) => void;
  loadFromStorage: () => void;
  reset: () => void;
};

export const useDiagnosisStore = create<DiagnosisState>((set, get) => ({
  diagnosisType: "light",
  userGender: null,
  answers: [],
  progress: 0,
  setDiagnosisType: (type) => set({ diagnosisType: type }),
  setUserGender: (gender) => {
    const state = get();
    if (state.userGender && state.answers.length > 0) {
      set({ userGender: gender, answers: [], progress: 0 });
    } else {
      set({ userGender: gender });
    }
    if (state.diagnosisType && gender) {
      const payload: DiagnosisPayload = {
        diagnosisType: state.diagnosisType,
        userGender: gender,
        answers: [],
      };
      saveSession(payload);
    }
  },
  answerQuestion: (answer) => {
    const state = get();
    if (!state.userGender) return;

    const filtered = state.answers.filter((item) => item.questionId !== answer.questionId);
    const nextAnswers = [...filtered, answer];
    const questionLength = getQuestionsByType(state.diagnosisType).length;
    const nextProgress = Math.round((nextAnswers.length / questionLength) * 100);

    const payload: DiagnosisPayload = {
      diagnosisType: state.diagnosisType,
      userGender: state.userGender,
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
      userGender: session.userGender,
      answers: session.answers,
      progress,
    });
  },
  reset: () => set({ answers: [], progress: 0, userGender: null }),
}));
