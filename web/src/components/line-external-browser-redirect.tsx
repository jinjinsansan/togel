"use client";

import { useEffect } from "react";

const shouldForceExternal = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent?.toLowerCase() ?? "";
  return ua.includes("line");
};

export const LineExternalBrowserRedirect = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldForceExternal()) return;

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("openExternalBrowser") === "1") return;

    currentUrl.searchParams.set("openExternalBrowser", "1");
    window.location.replace(currentUrl.toString());
  }, []);

  return null;
};
