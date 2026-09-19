"use client";

import { useSyncExternalStore } from "react";

/**
 * prefers-reduced-motion の購読。
 *
 * マウント時に1回読むだけでは不足する。OSの設定は診断の途中でも切り替わるので
 * change も購読し、ONになった瞬間に演出を畳めるようにする。
 */

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const getSnapshot = () =>
  typeof window !== "undefined" && window.matchMedia ? window.matchMedia(QUERY).matches : false;

/** SSR中は「動かす」側に倒し、ハイドレーション後に実値へ揃える */
const getServerSnapshot = () => false;

export const useReducedMotion = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
