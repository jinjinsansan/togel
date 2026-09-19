"use client";

import { useEffect, useRef } from "react";

import { trackShareLanding } from "@/lib/analytics/events";

/**
 * シェアのランディングに来たことだけを1回記録する。
 * タイプIDは送らない（どのタイプのページかまでは要らない）。
 */
export const ShareLandingTracker = ({ mode }: { mode: "type" | "mismatch" }) => {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackShareLanding(mode);
  }, [mode]);
  return null;
};
