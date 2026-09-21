"use client";

import { track } from "@vercel/analytics";

/**
 * 計測イベント。
 *
 * 送るのは「人が来ているか」を見るための最小限だけ。集計画面は作らない。
 *
 * 🔴 送ってよいのは、操作が起きたという事実と、その区別に要る属性だけ。
 * 診断の回答・タイプ・個人を特定しうる値は送らない。
 * イベント名にサービス外の語彙を持ち込まない（リポジトリは公開されている）。
 */

type Surface = "web" | "liff";
type Plan = "light" | "full";

/** 診断を開始した（最初の設問が出た） */
export const trackDiagnosisStart = (plan: Plan, surface: Surface) => {
  track("diagnosis_start", { plan, surface });
};

/** 診断を完了した（開封に到達した） */
export const trackDiagnosisComplete = (plan: Plan, surface: Surface) => {
  track("diagnosis_complete", { plan, surface });
};

/** シェアのランディングに人が来た */
export const trackShareLanding = (mode: "type" | "mismatch") => {
  track("share_landing", { mode });
};

/**
 * LINEの登録導線を押した（登録の成否はこちらでは分からない）。
 * `result_story` はストーリーズの締め（15枚目）のボタン。/result の下にある既存の
 * LINE 導線（`result`）と分けて数える。同じ値にすると、どちらが効いたか分からない。
 */
export const trackLineCta = (place: "result" | "result_story" | "mismatch" | "coaching") => {
  track("line_cta_click", { place });
};
