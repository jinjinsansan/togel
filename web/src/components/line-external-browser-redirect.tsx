"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const isLineInAppBrowser = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  return /Line\//i.test(ua);
};

/**
 * LIFFはLINEのブラウザの中でしか動かない。
 * そこで「外部ブラウザで開いてください」を出すと、案内の先に行き場がなく、
 * LINE経由の導線がその画面で終わる。LIFF配下はこの案内の対象外にする。
 */
const EXEMPT_PREFIXES = ["/liff"];

export const LineExternalBrowserRedirect = () => {
  const pathname = usePathname();
  const [needsRedirect, setNeedsRedirect] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return undefined;
    }
    if (!isLineInAppBrowser()) {
      return undefined;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeedsRedirect(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [pathname]);

  const currentUrl = typeof window === "undefined" ? "https://www.to-gel.com" : window.location.href;

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
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-400">LINEブラウザは非対応です</p>
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
        <div className="mt-6">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-600"
          >
            {copied ? "URLをコピーしました" : "URLをコピー"}
          </button>
        </div>
        <p className="mt-4 text-xs text-rose-500">この画面はLINEブラウザで閲覧時に現れます。SafariやChromeでは正常にサービスをご利用いただけます。</p>
      </div>
    </div>
  );
};
