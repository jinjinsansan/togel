"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PairPerson = {
  nickname: string;
  typeId: string;
  typeName: string;
  emoji: string;
  catchphrase: string;
  togelLabel: string;
  tags: string[];
};

type PairResult = {
  me: PairPerson;
  friend: PairPerson;
  verdict: {
    compatibility: number;
    mismatchScore: number;
    level: string;
    comment: string;
    isMismatch: boolean;
    catchphrase: string | null;
  };
  reasons: { title: string; userTrait: string; profileTrait: string; disaster: string }[];
  disasterScenario: { horrorScenarios: string[]; warnings: string[] } | null;
  absolutelyNotToDo: string[];
  survivalGuide: string[];
};

type PageState =
  | { status: "loading" }
  | { status: "ready"; result: PairResult }
  | { status: "error"; code: number; message: string; reason?: string };

/** 友達ミスマッチ診断の結果画面（招待リンク経由） */
export default function PairMismatchPage() {
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code") ?? params.get("c");
        const query = code ? `?code=${encodeURIComponent(code)}` : "";
        const res = await fetch(`/api/mismatch/pair${query}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            code: res.status,
            message: json.message ?? "判定に失敗しました",
            reason: json.reason,
          });
          return;
        }
        setState({ status: "ready", result: json as PairResult });
      } catch {
        if (!cancelled) {
          setState({ status: "error", code: 0, message: "通信に失敗しました" });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink">
        <div className="w-[200px] overflow-hidden rounded-full">
          <div className="animate-marquee h-[10px] w-[400%] bg-hazard-sm" />
        </div>
        <p className="text-xs font-bold text-txt-subtle">2人の相性を照合しています…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-white">
        <div className="text-4xl">🤝</div>
        <div>
          <h1 className="text-lg font-black">{state.message}</h1>
          <p className="mt-3 max-w-[26em] text-xs leading-8 text-txt-muted">
            {state.code === 401
              ? "この機能を使うにはログインが必要です。"
              : state.reason === "self-no-diagnosis"
                ? "あなたの診断がまだです。約5分で終わります。"
                : state.reason === "friend-no-diagnosis"
                  ? "相手の診断が終わると、2人の「合わなさ」が判定できます。リンクを送ってリマインドしましょう。"
                  : "友達ミスマッチ診断は、招待リンク経由で利用できます。マイページから自分のリンクを作って友達に送ってください。"}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {state.code === 401 ? (
            <Link
              href="/login"
              className="flex min-h-[52px] items-center rounded-full bg-hazard px-7 text-sm font-black text-ink shadow-cta"
            >
              ログインする
            </Link>
          ) : state.reason === "self-no-diagnosis" ? (
            <Link
              href="/diagnosis/select"
              className="flex min-h-[52px] items-center rounded-full bg-hazard px-7 text-sm font-black text-ink shadow-cta"
            >
              診断をはじめる
            </Link>
          ) : (
            <Link
              href="/mypage"
              className="flex min-h-[52px] items-center rounded-full bg-hazard px-7 text-sm font-black text-ink shadow-cta"
            >
              マイページで招待リンクを作る
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { me, friend, verdict, reasons, disasterScenario, absolutelyNotToDo, survivalGuide } =
    state.result;

  return (
    <div className="min-h-screen bg-ink px-5.5 py-8 text-white">
      <div className="mx-auto max-w-lg">
        <div className="text-center text-[11px] font-black tracking-[0.28em] text-hazard">
          FRIEND MISMATCH
        </div>

        {/* 判定カード（スクショ1枚で成立させる） */}
        <div className="mt-4 rounded-card border border-dangerline bg-[linear-gradient(160deg,#1c0d16,#0d111b)] px-[18px] py-5 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 rounded-input border border-line bg-surface px-2 py-[11px]">
              <div className="text-xs font-black">{me.nickname}</div>
              <div className="mt-[2px] text-[9px] text-txt-subtle">
                {me.emoji} {me.typeName}
              </div>
            </div>
            <div className="text-xl font-black text-primary">×</div>
            <div className="flex-1 rounded-input border border-line bg-surface px-2 py-[11px]">
              <div className="text-xs font-black">{friend.nickname}</div>
              <div className="mt-[2px] text-[9px] text-txt-subtle">
                {friend.emoji} {friend.typeName}
              </div>
            </div>
          </div>
          <div className="mt-[18px] text-[11px] font-black tracking-[0.2em] text-hazard">
            合わなさ
          </div>
          <div className="text-[44px] font-black leading-[1.1] text-primary">
            {verdict.mismatchScore}
            <span className="text-xl">%</span>
          </div>
          <div className="mt-1 text-[11px] font-black tracking-[0.14em] text-txt-muted">
            判定: {verdict.level}
          </div>
          <p className="mt-2 text-[11.5px] leading-[1.85] text-txt-muted">{verdict.comment}</p>
        </div>

        {verdict.catchphrase && (
          <div className="mt-3 rounded-input border border-dangerline bg-dangerbg px-4 py-3 text-center text-xs font-bold text-[#ffb3cd]">
            「{verdict.catchphrase}」
          </div>
        )}

        {/* なぜ合わないか */}
        {reasons.length > 0 && (
          <div className="mt-3 rounded-card border border-line bg-surface p-[18px]">
            <div className="text-[10px] font-black tracking-[0.22em] text-primary">
              なぜ合わないのか
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {reasons.map((reason, i) => (
                <div key={i}>
                  <div className="text-xs font-black text-white">{reason.title}</div>
                  <p className="mt-1 text-[11.5px] leading-[1.85] text-txt-muted">
                    {reason.disaster}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 地獄のシナリオ */}
        {disasterScenario && disasterScenario.horrorScenarios.length > 0 && (
          <div className="mt-3 rounded-card border border-dangerline bg-dangerbg p-[18px]">
            <div className="text-[10px] font-black tracking-[0.22em] text-primary">
              このまま親密になると
            </div>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {disasterScenario.horrorScenarios.slice(0, 3).map((scenario, i) => (
                <li key={i} className="text-xs leading-[1.85] text-txt-muted">
                  ・{scenario}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* NG行動 */}
        {absolutelyNotToDo.length > 0 && (
          <div className="mt-3 rounded-card border border-warnline bg-warnbg p-[18px]">
            <div className="text-[10px] font-black tracking-[0.22em] text-hazard">
              2人の間で絶対にやってはいけないこと
            </div>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {absolutelyNotToDo.slice(0, 3).map((item, i) => (
                <li key={i} className="text-xs leading-[1.85] text-[#e2e7f0]">
                  ✕ {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 救い（最後は必ず救う） */}
        <div className="mt-3 rounded-card border border-reliefline bg-reliefbg p-[18px]">
          <div className="text-[10px] font-black tracking-[0.22em] text-relief">
            それでも友達でいるために
          </div>
          <ul className="mt-2.5 flex flex-col gap-2">
            {survivalGuide.map((item, i) => (
              <li key={i} className="text-xs leading-[1.9] text-[#d5efe3]">
                ・{item}
              </li>
            ))}
          </ul>
        </div>

        {/* アクション */}
        <div className="mt-5 flex flex-col gap-2.5">
          <Link
            href="/coaching"
            className="flex min-h-[52px] items-center justify-center rounded-card bg-relief text-sm font-black text-[#05130e] transition-colors hover:bg-white"
          >
            {friend.typeName}の攻略法を見る
          </Link>
          <Link
            href="/mypage"
            className="flex min-h-[52px] items-center justify-center rounded-card border border-line text-sm font-bold text-txt-muted transition-colors hover:text-white"
          >
            自分も友達を招待する
          </Link>
        </div>

        <p className="mt-6 text-center text-[10px] leading-[1.9] text-txt-disabled">
          ※ エンタメ目的の判定です。2人の実際の関係は、2人が決めることです。
        </p>
      </div>
    </div>
  );
}
