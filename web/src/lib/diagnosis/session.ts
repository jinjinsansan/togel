import { DiagnosisPayload } from "@/types/diagnosis";

const STORAGE_KEY = "matching_shindan_session";

/**
 * 保存先の区別。Web版とLIFF版は入口が別なので、途中保存を混ぜない。
 * 既定（web）のキーは従来のまま（既存の途中保存を壊さない）。
 */
export type SessionScope = "web" | "liff";

const keyFor = (scope: SessionScope) => (scope === "liff" ? `${STORAGE_KEY}:liff` : STORAGE_KEY);

export type DiagnosisSession = DiagnosisPayload & {
  updatedAt: string;
};

export const saveSession = (payload: DiagnosisPayload, scope: SessionScope = "web") => {
  if (typeof window === "undefined") return;
  const session: DiagnosisSession = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(keyFor(scope), JSON.stringify(session));
};

export const loadSession = (scope: SessionScope = "web"): DiagnosisSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return null;
    return JSON.parse(raw) as DiagnosisSession;
  } catch (error) {
    console.warn("Failed to parse diagnosis session", error);
    return null;
  }
};

export const clearSession = (scope: SessionScope = "web") => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(keyFor(scope));
};
