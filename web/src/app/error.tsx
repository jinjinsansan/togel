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
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-base px-6 text-center text-white">
      <div className="text-[64px] font-black leading-none text-primary">500</div>
      <div>
        <h1 className="text-xl font-black">こちらの不手際です。珍しく謝ります。</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-txt-muted">
          時間をおいて、もう一度お試しください。
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[52px] items-center justify-center rounded-[14px] bg-hazard px-8 text-sm font-black text-ink shadow-cta transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          再試行
        </button>
        <Link
          href="/"
          className="flex min-h-[52px] items-center justify-center rounded-[14px] border border-line px-8 text-sm font-bold text-txt-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          トップへ
        </Link>
      </div>
    </div>
  );
}
