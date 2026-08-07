"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "togel_age_verified_v1";

/**
 * 18歳以上の年齢確認ゲート（出会い系サイト規制法対応）。
 * 確認するまでサービス全体をブロックし、確認結果は localStorage に保存する。
 * /privacy・/terms・/tokushoho など法務ページはブロックしない。
 * 「18歳未満です」選択時は同じモーダル内でメッセージを差し替える（別ページに飛ばさない）。
 */
export function AgeGate() {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 法務・情報ページは年齢確認なしで閲覧可能にする
    const exemptPaths = ["/terms", "/privacy", "/tokushoho", "/about"];
    if (exemptPaths.some((p) => window.location.pathname.startsWith(p))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSRとのhydration差異を避けるためクライアント側でのみ判定する
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
      /* LINE内WebView等でlocalStorageが使えない場合もセッション中は通す */
    }
    setVerified(true);
  };

  // 判定中、または確認済みなら何も表示しない
  if (verified === null || verified) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink px-6"
      onKeyDown={(e) => {
        if (e.key === "Escape") e.preventDefault();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-hero border border-line bg-ink text-center shadow-card">
        <div className="h-2 bg-hazard-sm" aria-hidden="true" />
        <div className="p-8">
          {!rejected ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-card bg-hazard text-2xl font-black text-ink">
                ▲
              </div>
              <h2 id="age-gate-title" className="mt-5 text-xl font-black leading-relaxed text-white">
                18歳以上の方のみ
                <br />
                ご利用いただけます
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-txt-muted">
                恋愛・相性に関する表現を含みます。
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  autoFocus
                  onClick={confirm}
                  className="flex min-h-[52px] items-center justify-center rounded-[14px] bg-hazard text-sm font-black text-ink transition-transform hover:scale-[1.01] active:scale-[0.98]"
                >
                  18歳以上です
                </button>
                <button
                  type="button"
                  onClick={() => setRejected(true)}
                  className="flex min-h-[52px] items-center justify-center rounded-[14px] border border-line text-[13px] font-bold text-txt-muted transition-colors hover:bg-white/5"
                >
                  18歳未満です
                </button>
              </div>
              <p className="mt-5 text-[10px] leading-relaxed text-txt-subtle">
                ご利用には
                <a href="/terms" className="underline">利用規約</a>
                および
                <a href="/privacy" className="underline">プライバシーポリシー</a>
                への同意が必要です。
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-card bg-surface text-2xl">
                🙇
              </div>
              <h2 id="age-gate-title" className="mt-5 text-xl font-black leading-relaxed text-white">
                ご利用いただけません
              </h2>
              <p className="mt-3 text-xs leading-loose text-txt-muted">
                本サービスは18歳以上の方を対象としています。
                <br />
                18歳になったら、またお越しください。
              </p>
              <button
                type="button"
                onClick={() => setRejected(false)}
                className="mt-6 text-[11px] font-bold text-txt-subtle underline transition-colors hover:text-white"
              >
                戻る
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
