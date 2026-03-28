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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const liff = await import("@line/liff" as any) as any;
          liffModule = (liff.default ?? liff) as LiffModule;
        }

        const liff = liffModule!;
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
