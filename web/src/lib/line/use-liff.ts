"use client";

import { useState, useEffect, useCallback } from "react";

interface LiffModule {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: () => void;
  getContext: () => { userId?: string; type?: string } | null;
  getProfile: () => Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
  closeWindow: () => void;
  isInClient: () => boolean;
}

type LiffState = {
  isReady: boolean;
  isInClient: boolean;
  lineUserId: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  error: string | null;
  closeLiff: () => void;
};

let liffModule: LiffModule | null = null;

function loadLiffSdk(): Promise<LiffModule> {
  return new Promise((resolve, reject) => {
    // Already loaded via CDN
    const win = window as unknown as Record<string, unknown>;
    if (win.liff) {
      resolve(win.liff as LiffModule);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.charset = "utf-8";
    script.onload = () => {
      if (win.liff) {
        resolve(win.liff as LiffModule);
      } else {
        reject(new Error("LIFF SDK failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load LIFF SDK script"));
    document.head.appendChild(script);
  });
}

export function useLiff(): LiffState {
  const [isReady, setIsReady] = useState(false);
  const [isInClient, setIsInClient] = useState(false);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setError("LIFF ID is not configured");
      return;
    }

    const initLiff = async () => {
      try {
        if (!liffModule) {
          liffModule = await loadLiffSdk();
        }

        const liff = liffModule;
        await liff.init({ liffId });
        setIsInClient(liff.isInClient());

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const context = liff.getContext();
        if (context?.userId) {
          setLineUserId(context.userId);
        }

        try {
          const profile = await liff.getProfile();
          setDisplayName(profile.displayName);
          setPictureUrl(profile.pictureUrl ?? null);
          if (!context?.userId) {
            setLineUserId(profile.userId);
          }
        } catch {
          console.warn("[LIFF] Could not get profile");
        }

        setIsReady(true);
      } catch (err) {
        console.error("[LIFF] Init error:", err);
        setError("LIFF初期化に失敗しました");
      }
    };

    initLiff();
  }, []);

  const closeLiff = useCallback(() => {
    const liff = liffModule;
    if (liff && liff.isInClient()) {
      liff.closeWindow();
    }
  }, []);

  return { isReady, isInClient, lineUserId, displayName, pictureUrl, error, closeLiff };
}
