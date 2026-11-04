"use client";

import {
  NEXT_COOKIE,
  NEXT_COOKIE_MAX_AGE,
  NEXT_PARAM,
  safeNextPath,
} from "@/lib/auth/next-path";

/** 今いる /login の `?next=` を、信用できる形に正規化して返す */
export const currentNextPath = (): string =>
  safeNextPath(new URLSearchParams(window.location.search).get(NEXT_PARAM));

/**
 * 行き先をクッキーに預ける。
 *
 * 確認メールのリンクは /auth/callback に戻ってくる。そこで行き先を思い出すため。
 * 別のブラウザ（メールアプリの中など）で開かれた場合はクッキーが無いので、
 * 既定の行き先（診断の選択画面）に落ちる。それで困る人はいない。
 */
export const rememberNextPath = (next: string) => {
  document.cookie = [
    `${NEXT_COOKIE}=${encodeURIComponent(next)}`,
    "path=/",
    `max-age=${NEXT_COOKIE_MAX_AGE}`,
    "samesite=lax",
    window.location.protocol === "https:" ? "secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
};
