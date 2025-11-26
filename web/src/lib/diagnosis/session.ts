import { DiagnosisPayload } from "@/types/diagnosis";

const STORAGE_KEY = "matching_shindan_session";

export type DiagnosisSession = DiagnosisPayload & {
  updatedAt: string;
};

export const saveSession = (payload: DiagnosisPayload) => {
  if (typeof window === "undefined") return;
  const session: DiagnosisSession = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const loadSession = (): DiagnosisSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiagnosisSession;
  } catch (error) {
    console.warn("Failed to parse diagnosis session", error);
    return null;
  }
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
};
