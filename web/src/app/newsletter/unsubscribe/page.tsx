"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * メールの「配信の解除」リンクの着地先（ログイン不要）。
 *
 * 開いただけでは解除しない。メールのセキュリティ機能がリンクを先読みしただけで
 * 解除されるのを防ぐため、ボタンを押して POST したときだけ解除する。
 */

type State = "idle" | "pending" | "done" | "error" | "invalid";

export default function NewsletterUnsubscribePage() {
  const [state, setState] = useState<State>("idle");

  const handleUnsubscribe = async () => {
    // トークンは押した時点で読む（この画面を静的なままにしておくため）
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("invalid");
      return;
    }
    setState("pending");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink px-6 py-10 text-white">
      <div className="w-full max-w-sm rounded-card border border-line bg-[#07090F] px-[18px] py-[22px] text-center">
        <div className="text-[15px] font-black leading-relaxed">メルマガの配信解除</div>
        {state === "done" ? (
          <p role="status" className="mt-4 text-xs leading-relaxed text-txt-muted">
            配信を解除しました。これ以降、メルマガは届きません。
            <br />
            もう一度受け取りたくなったら、マイページから登録できます。
          </p>
        ) : state === "invalid" ? (
          <p className="mt-4 text-xs leading-relaxed text-txt-muted">
            リンクが正しくありません。メールの「配信の解除」のリンクをもう一度開くか、マイページから解除してください。
          </p>
        ) : (
          <>
            <p className="mt-4 text-xs leading-relaxed text-txt-muted">
              ボタンを押すと、Togel のメルマガが届かなくなります。アカウントは消えません。
            </p>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={state === "pending"}
              className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-full bg-hazard px-6 text-[15px] font-black text-ink transition-colors hover:bg-white disabled:opacity-60"
            >
              {state === "pending" ? "解除中…" : "配信を解除する"}
            </button>
            {state === "error" && (
              <p role="alert" className="mt-3 text-xs leading-relaxed text-white">
                解除できませんでした。時間をおいてもう一度お試しいただくか、support@to-gel.com までご連絡ください。
              </p>
            )}
          </>
        )}
        <Link href="/" className="mt-5 inline-block text-xs font-bold text-txt-subtle hover:text-white">
          ← トップに戻る
        </Link>
      </div>
    </div>
  );
}
