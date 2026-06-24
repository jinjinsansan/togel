"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "togel_age_verified_v1";

/**
 * 18歳以上の年齢確認ゲート（出会い系サイト規制法対応）。
 * 確認するまでサービス全体をブロックし、確認結果は localStorage に保存する。
 * /privacy・/terms・/tokushoho など法務ページはブロックしない。
 */
export function AgeGate() {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 法務・情報ページは年齢確認なしで閲覧可能にする
    const exemptPaths = ["/terms", "/privacy", "/tokushoho", "/about"];
    if (exemptPaths.some((p) => window.location.pathname.startsWith(p))) {
      setVerified(true);
      return;
    }
    try {
      setVerified(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setVerified(false);
    }
  }, []);

  const confirm = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setVerified(true);
  };

  const reject = () => {
    window.location.href = "https://www.yahoo.co.jp/";
  };

  // 判定中、または確認済みなら何も表示しない
  if (verified === null || verified) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-6"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="text-4xl">🔞</div>
        <h2 id="age-gate-title" className="mt-4 text-lg font-bold text-slate-800">
          年齢確認
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          本サービスは18歳以上の方のみご利用いただけます。
          <br />
          あなたは18歳以上ですか？
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={confirm}
            className="rounded-full bg-[#E91E63] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            はい（18歳以上です）
          </button>
          <button
            type="button"
            onClick={reject}
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          >
            いいえ（退出する）
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          ご利用には
          <a href="/terms" className="underline">利用規約</a>
          および
          <a href="/privacy" className="underline">プライバシーポリシー</a>
          への同意が必要です。
        </p>
      </div>
    </div>
  );
}
