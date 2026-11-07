"use client";

import { useEffect, useState } from "react";

import { trackNewsletterCta, type NewsletterPlace } from "@/lib/analytics/events";
import { isNewsletterEnabled } from "@/lib/newsletter/enabled";

/**
 * メルマガの登録導線（LINE友だち追加の置き換え）。
 *
 * 押した人の状態で動きが変わる。
 * - 未ログイン      → 登録画面へ（戻り先にこの画面を積む）
 * - ログイン済み    → その場で購読（宛先は本人の確認済みメールアドレス）
 * - 購読済み        → 「登録済み」を出す。解除はマイページかメールのリンクから
 *
 * **約束は、配信が有効なときだけ出す。** 「週1通」「全15通」は isNewsletterEnabled() の内側。
 * 無効のあいだも登録（同意の記録）は受け付ける。有効になった時点で1通目から届く。
 */

type Status =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "ready"; diagnosed: boolean }
  | { kind: "subscribed" }
  | { kind: "error"; message: string };

type Props = {
  place: NewsletterPlace;
  source: "result" | "mypage" | "newsletter_page";
  /** 見出し。省略時は既定の一文 */
  heading?: string;
  className?: string;
};

const loginHref = () => {
  const here = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(here)}`;
};

/** 状態の取得と購読。枠つきの導線（NewsletterCta）とボタンだけの導線（NewsletterButton）で共有する */
export const useNewsletterSubscription = (
  place: NewsletterPlace,
  source: "result" | "mypage" | "newsletter_page",
) => {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/newsletter", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { loggedIn?: boolean; subscribed?: boolean; diagnosed?: boolean }) => {
        if (!alive) return;
        if (!json.loggedIn) setStatus({ kind: "guest" });
        else if (json.subscribed) setStatus({ kind: "subscribed" });
        else setStatus({ kind: "ready", diagnosed: Boolean(json.diagnosed) });
      })
      .catch(() => alive && setStatus({ kind: "guest" }));
    return () => {
      alive = false;
    };
  }, []);

  const subscribe = async () => {
    if (status.kind === "guest") {
      trackNewsletterCta(place, "login");
      window.location.href = loginHref();
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (res.status === 401) {
        window.location.href = loginHref();
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({
          kind: "error",
          message:
            json.error === "email_not_confirmed"
              ? "メールアドレスの確認が済んでいません。登録時に届いたメールのリンクを開いてください。"
              : "登録できませんでした。時間をおいてもう一度お試しください。",
        });
        return;
      }
      trackNewsletterCta(place, "subscribed");
      setStatus({ kind: "subscribed" });
    } finally {
      setPending(false);
    }
  };

  return { status, pending, subscribe };
};

export const NewsletterCta = ({ place, source, heading, className }: Props) => {
  const enabled = isNewsletterEnabled();
  const { status, pending, subscribe: handleClick } = useNewsletterSubscription(place, source);

  return (
    <div
      className={`grid items-center gap-[18px] rounded-[18px] border border-[#1e3557] bg-navy p-5.5 sm:grid-cols-2 ${className ?? ""}`}
    >
      <div>
        <div className="text-[11px] font-black tracking-[0.22em] text-relief">MAIL</div>
        <div className="mt-2 text-[19px] font-black leading-normal text-white">
          {heading ?? "あなたが最も踏みやすい地雷は、3タイプ分あります"}
        </div>
        {/* 約束は、配信が有効なときだけ出す（止まっているのに「届く」と言わない） */}
        {enabled && (
          <p className="mt-2 text-xs leading-[1.9] text-[#b7c6dd]">
            メルマガで週に1通、全15回。踏まない歩き方だけ送ります。いつでも解除できます。
          </p>
        )}
        {status.kind === "ready" && !status.diagnosed && (
          <p className="mt-2 text-xs leading-[1.9] text-[#b7c6dd]">
            診断が終わると、あなたのタイプに合わせた内容が届きます。
          </p>
        )}
      </div>

      {status.kind === "subscribed" ? (
        <div
          role="status"
          className="flex min-h-[54px] items-center justify-center rounded-[14px] border border-[#1e3557] px-4 text-center text-sm font-black text-white"
        >
          メルマガ登録済みです
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={handleClick}
            disabled={pending || status.kind === "loading"}
            className="flex min-h-[54px] w-full items-center justify-center rounded-[14px] bg-hazard text-sm font-black text-ink transition-colors hover:bg-white disabled:opacity-60"
          >
            {pending
              ? "登録中…"
              : status.kind === "guest"
                ? "無料登録してメルマガを受け取る"
                : "メルマガを受け取る"}
          </button>
          {status.kind === "error" && (
            <p role="alert" className="mt-2 text-xs leading-relaxed text-white">
              {status.message}
            </p>
          )}
          {status.kind !== "guest" && status.kind !== "loading" && (
            <p className="mt-2 text-[10px] leading-relaxed text-[#b7c6dd]">
              登録したメールアドレスに届きます。押すとメルマガの受け取りに同意したことになります。
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/** ボタンだけの導線（ストーリーズの締めなど、枠を置けない場所） */
export const NewsletterButton = ({
  place,
  source,
  className,
}: {
  place: NewsletterPlace;
  source: "result" | "mypage" | "newsletter_page";
  className: string;
}) => {
  const { status, pending, subscribe } = useNewsletterSubscription(place, source);
  if (status.kind === "subscribed") {
    return (
      <div role="status" className={className}>
        メルマガ登録済みです
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={pending || status.kind === "loading"}
      data-primary-cta
      className={className}
    >
      {pending ? "登録中…" : status.kind === "error" ? "もう一度試す" : "メルマガで続きを受け取る"}
    </button>
  );
};
