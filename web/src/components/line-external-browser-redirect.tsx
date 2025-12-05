"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const isLineInAppBrowser = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  return /Line\//i.test(ua);
};

export const LineExternalBrowserRedirect = () => {
  const [needsRedirect, setNeedsRedirect] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isLineInAppBrowser()) {
      setNeedsRedirect(true);
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, []);

  const currentUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://www.to-gel.com";
    return window.location.href;
  }, [needsRedirect]);

  const handleOpenExternal = useCallback(() => {
    try {
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open external browser", error);
    }
  }, [currentUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link", error);
    }
  }, [currentUrl]);

  if (!needsRedirect) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-6 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-400">LINEブラウザは非対応です</p>
        <h2 className="mt-3 text-lg font-semibold text-rose-900">外部ブラウザで開いてください</h2>
        <p className="mt-3 text-sm text-rose-700">
          AI診断とチャットは Safari / Chrome などのブラウザでのみご利用いただけます。
          LINE右上のメニューから「Safariで開く」「Chromeで開く」を選択してください。
        </p>
        <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-left text-xs text-rose-800 space-y-2">
          <div>
            <p className="font-semibold">iPhone の場合</p>
            <p>画面右上 … → 「Safariで開く」</p>
          </div>
          <div>
            <p className="font-semibold">Android の場合</p>
            <p>画面右上 ⋮ → 「Chromeで開く」</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleOpenExternal}
            className="w-full rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-600"
          >
            外部ブラウザで開く
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full rounded-2xl border border-rose-200 py-3 text-sm font-semibold text-rose-600"
          >
            {copied ? "URLをコピーしました" : "URLをコピー"}
          </button>
        </div>
        <p className="mt-4 text-xs text-rose-500">※ この画面はLINEブラウザでは閉じられません。外部ブラウザで開き直すと診断が進められます。</p>
      </div>
    </div>
  );
};
