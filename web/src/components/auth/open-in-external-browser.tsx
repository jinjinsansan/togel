"use client";

import { useEffect } from "react";

import { externalBrowserUrl } from "@/lib/line/external-browser";

/**
 * ログイン画面をLINEのアプリ内ブラウザで開いたとき、外部ブラウザで開き直す。
 *
 * ここに置くのは、外に出る必要があるのがログインの瞬間だけだから。
 * 読み物も診断もLINE内のまま読めるので、そこで文脈を切らない。
 *
 * 見た目を持たない。案内を読ませるのではなく、LINEの仕組みに渡して黙って開く。
 */
export const OpenInExternalBrowser = () => {
  useEffect(() => {
    const target = externalBrowserUrl(window.location.href, navigator.userAgent);
    if (target) window.location.replace(target);
  }, []);

  return null;
};
