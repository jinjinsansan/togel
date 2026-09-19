/**
 * 攻略盤の到達状態。
 *
 * 現在地の正はこの永続層に置く（描画やURLの状態を正にしない）。
 * LINE配信から開いた到達も、Webで読んだ到達も、同じ1つの状態として扱う。
 *
 * 記録するのは「通ったマス」だけ。日時・連続日数・未読件数は持たない
 * （ストリークや督促の材料を最初から作らない）。
 */

const BOARD_KEY = "togel:coaching-board";
const VISITED_KEY = "togel:coaching-visited";

export type CoachingBoardState = {
  selfTypeId: string;
  plan: "light" | "full";
  /** 盤に載せる相手（順序が盤の並び） */
  typeIds: string[];
};

const readJson = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 保存できない環境（プライベートモード等）では盤はその場限りになる */
  }
};

export const loadBoardState = (): CoachingBoardState | null => readJson(BOARD_KEY);

export const saveBoardState = (state: CoachingBoardState) => writeJson(BOARD_KEY, state);

export const loadVisited = (): string[] => readJson<string[]>(VISITED_KEY) ?? [];

export const markVisited = (key: string): string[] => {
  const current = loadVisited();
  if (current.includes(key)) return current;
  const next = [...current, key];
  writeJson(VISITED_KEY, next);
  return next;
};
