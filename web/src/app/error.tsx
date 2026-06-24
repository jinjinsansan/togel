"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center">
      <div className="text-5xl">😢</div>
      <div>
        <h1 className="text-xl font-bold text-slate-800">予期しないエラーが発生しました</h1>
        <p className="mt-2 text-sm text-slate-500">
          時間をおいて、もう一度お試しください。
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#E91E63] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          再試行
        </button>
        <Link
          href="/"
          className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
