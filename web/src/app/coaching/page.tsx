"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GroupBadge } from "@/components/brand/group-badge";
import { BoardTypeCards } from "@/components/coaching/board-view";
import { trackLineCta } from "@/lib/analytics/events";
import { personalityTypes, TYPE_GROUP_ORDER, typesInGroup, typeToken } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import { BOARD_ANGLES, boardTypeCount, cellContent, parseCellKey } from "@/lib/coaching/board";
import type { BoardAngle } from "@/lib/coaching/board";
import { getTypeApproachGuide } from "@/lib/coaching/translations";
import { loadBoardState, saveBoardState } from "@/lib/coaching/progress";
import type { CoachingBoardState } from "@/lib/coaching/progress";
import { loadSession } from "@/lib/diagnosis/session";
import type { MismatchResult, PersonalityTypeDefinition } from "@/types/diagnosis";
import { isBroadcastEnabled } from "@/lib/line/broadcast-enabled";

/**
 * 地雷回避ガイド。
 *
 * 2つを分けて置く。
 * - あなた向けの入口 … 診断が要る（噛み合わない3タイプ × 5つの角度）
 * - タイプ別ガイド … 誰でも読める。24タイプの一覧から各ページへ
 *
 * 【2026-09-21】**「何マス歩いたか」を数える盤は撤去した。**
 * 数えていたのは「ガイドを何ページ開いたか」で、増えても読む人に意味が無い。
 * 置き換えられる数が無い（診断後に積み上がるものがまだ無い）ので、
 * 別の数に差し替えるのではなく、**無いものを数える図ごと消した**。
 * 残したのは「読むものへの入口」と本文。
 *
 * LINE配信のリンク（`?cell=`）はここに着地して本文を開く。**印は付けない。**
 *
 * 意匠はデザイン一式の「地雷回避ガイド」に合わせる（ライト面＝救いの画面）。
 */

const findExtended = (typeId: string | undefined): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === typeId) ?? null;

/** 診断結果（あれば）から、噛み合わないタイプを決める。無ければ保存済みのものを使う */
const buildBoardState = (): CoachingBoardState | null => {
  if (typeof window === "undefined") return null;

  const saved = loadBoardState();
  let selfTypeId: string | null = null;
  try {
    const raw = sessionStorage.getItem("latestDiagnosis");
    if (raw) {
      const diagnosis = JSON.parse(raw) as { personalityType?: PersonalityTypeDefinition };
      selfTypeId = diagnosis.personalityType?.id ?? null;
    }
  } catch {
    /* ignore */
  }
  if (!selfTypeId) return saved;

  const plan = loadSession()?.diagnosisType === "full" ? "full" : "light";
  const limit = boardTypeCount();

  // 入口の3タイプは**型の固定リスト**（badCompatibleTypes）。LINE配信と同じもの。
  // 以前は照合結果（実際に照合した相手）で上書きしていたため、画面の3タイプと
  // LINEで届く3タイプが食い違い得た。2つは別の概念で、ここは型の取扱説明書の場所。
  // 実際に照合した相手の話は /result/mismatch の役割。
  const primary = (findExtended(selfTypeId)?.badCompatibleTypes ?? []).slice(0, limit);

  // 照合結果は**読める追加**にだけ使う。40問の診断で増える2タイプで、
  // light 向けの導線（「その2タイプが読めるようになります」）の約束はこれで守る。
  const extra: string[] = [];
  try {
    const raw = sessionStorage.getItem("latestMismatch");
    if (raw) {
      const results = JSON.parse(raw) as MismatchResult[];
      for (const result of results) {
        const id = result.personalityTypes?.profile?.id;
        if (!id || primary.includes(id) || extra.includes(id) || !findExtended(id)) continue;
        extra.push(id);
      }
    }
  } catch {
    /* ignore */
  }
  const typeIds = primary;
  const readableTypeIds = extra.slice(0, 2);
  if (typeIds.length === 0) return saved;

  const next: CoachingBoardState = { selfTypeId, plan, typeIds, readableTypeIds };
  if (
    saved &&
    saved.selfTypeId === next.selfTypeId &&
    saved.plan === next.plan &&
    saved.typeIds.join(",") === next.typeIds.join(",") &&
    (saved.readableTypeIds ?? []).join(",") === readableTypeIds.join(",")
  ) {
    return saved;
  }
  saveBoardState(next);
  return next;
};

const MECHANISM = [
  {
    term: "ラベル",
    body: "人は誰でも、昔どこかで貼られた「思い込みのラベル」を持っています。本人は性格だと思っていますが、あとから貼られたものです。",
  },
  {
    term: "タンク",
    body: "ラベルの下には感情のタンクが埋まっています。中身は人それぞれ。寂しさの人も、恐怖の人も、「私には価値がない」の人もいます。",
  },
  {
    term: "警報",
    body: "タンクに触られると、中身をこれ以上感じないために警報が鳴ります。怒鳴る人も、黙る人も、笑ってかわす人もいますが、全部同じ警報です。",
  },
];

export default function CoachingPage() {
  const [board, setBoard] = useState<CoachingBoardState | null>(null);
  const [open, setOpen] = useState<{ typeId: string; angle: BoardAngle } | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 診断結果は永続層にあり、クライアントでしか読めない */
    const state = buildBoardState();
    setBoard(state);

    // LINE配信のリンク（?cell=<typeId>:<angle>）で来たら、その角度の本文を開く。
    // **「歩いた」印は付けない**（数えるものが無くなったので、印だけ残すと
    //   意味の無い状態が残る）。開くところまで。
    //
    // 🔴 **利用者のリストに入っているかは見ない。** タイプが24種のどれかで、
    // 角度が5つのどれかなら、必ず開く。以前は `state.typeIds.includes()` で弾いて
    // いたため、自分たちのLINEが送ったリンクが開かないことがあった。
    // LINE のアプリ内ブラウザで開くと保存済みの診断が無く、そもそも state が null。
    const requested = parseCellKey(new URLSearchParams(window.location.search).get("cell"));
    if (requested && findExtended(requested.typeId)) {
      setOpen(requested);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const openCell = useCallback((typeId: string, angle: BoardAngle) => {
    setOpen({ typeId, angle });
  }, []);

  const boardTypes = useMemo(
    () =>
      (board?.typeIds ?? [])
        .map((id) => findExtended(id))
        .filter((type): type is ExtendedPersonalityTypeDefinition => Boolean(type)),
    [board],
  );

  const readableTypes = useMemo(
    () =>
      (board?.readableTypeIds ?? [])
        .map((id) => findExtended(id))
        .filter((type): type is ExtendedPersonalityTypeDefinition => Boolean(type)),
    [board],
  );


  const openType = open ? findExtended(open.typeId) : null;
  const openGuide = openType ? getTypeApproachGuide(openType.id) : null;
  const openContent = openGuide && open ? cellContent(openGuide, open.angle) : null;
  const openLabel = open ? BOARD_ANGLES.find((angle) => angle.key === open.angle)?.label : null;

  /** 噛み合わないタイプが割り出せているか。盤は無くなったので「盤がある」ではない */
  const hasTypes = boardTypes.length > 0;

  const mechanism = (
    <div className="grid gap-3 sm:grid-cols-3">
      {MECHANISM.map((item) => (
        <div
          key={item.term}
          className="rounded-card border border-lightline bg-white p-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]"
        >
          <div className="text-[10px] font-black tracking-[0.22em] text-relief-ink">
            {item.term}
          </div>
          <p className="mt-[9px] text-[12px] leading-[1.95] text-lighttext-subtle">{item.body}</p>
        </div>
      ))}
    </div>
  );

  const broadcastOn = isBroadcastEnabled();

  /** 開いている本文。診断の有無によらず出す（LINE 配信の着地先） */
  const openPanel =
    openType && openContent ? (

                <div
                  key={`${openType.id}:${open?.angle}`}
                  className="animate-rise rounded-card border border-lightline bg-white p-[22px] shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]"
                >
                  <div className="text-[10px] font-black tracking-[0.22em] text-[#c1113f]">
                    {openLabel}
                  </div>
                  <h3 className="mt-2 text-[20px] font-black tracking-[-0.02em]">
                    {openType.emoji} {typeToken(openType)}
                  </h3>
                  <div className="mt-1 text-[12px] font-bold text-lighttext-subtle">
                    {openType.typeName} ／ {openType.catchphrase}
                  </div>

                  {openContent.body && (
                    <p className="mt-3.5 text-[13px] leading-[1.95] text-lighttext-muted">
                      {openContent.body}
                    </p>
                  )}

                  {openContent.ng && openContent.ok && (
                    <div className="mt-3.5 flex flex-col gap-3.5">
                      <div>
                        <div className="text-[10px] font-black text-[#c1113f]">
                          ✕ あなたが言いがち
                        </div>
                        <div className="mt-1 rounded-[11px] border border-[#f0d3da] bg-white px-[13px] py-[11px] text-[13px] leading-[1.8] text-lighttext-muted">
                          {openContent.ng}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-relief-ink">
                          ◯ こう言い換える
                        </div>
                        <div className="mt-1 rounded-[11px] border border-[#b9e3d0] bg-[#e9f7f0] px-[13px] py-[11px] text-[13px] font-bold leading-[1.8] text-navy">
                          {openContent.ok}
                        </div>
                      </div>
                    </div>
                  )}

                  {openContent.dos && (
                    <ol className="mt-3.5 flex flex-col gap-2.5">
                      {openContent.dos.map((item, index) => (
                        <li key={item} className="flex items-start gap-[9px]">
                          <span className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[5px] bg-relief-ink text-[10px] font-black text-white">
                            {index + 1}
                          </span>
                          <span className="text-[12px] leading-[1.8] text-lighttext-muted">{item}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {/*
                    読み終わったことを報告する一行は 2026-09-21 に外した。
                    数えるのをやめたので、報告しても積み上がる先が無い。
                  */}
                  <div className="mt-[18px] flex flex-wrap items-center justify-end gap-2.5 border-t border-dashed border-lightline pt-[18px]">
                    <Link
                      href={`/coaching/${openType.id}`}
                      className="text-[11px] font-bold text-lighttext-subtle underline transition-colors hover:text-navy"
                    >
                      このタイプの全文を読む
                    </Link>
                  </div>
                </div>
    ) : null;

  return (
    <div className="min-h-screen bg-paper text-navy">
      {/* ヒーロー: ネイビー→ペーパーの硬い分割。
          診断済みなら盤が主役になるので、ヒーローごと差し替える */}
      <section
        className={`px-5.5 pb-[26px] ${
          hasTypes
            ? "bg-[linear-gradient(180deg,#0b1f3a_0%,#0b1f3a_52%,#F4F7F5_52%,#F4F7F5_100%)] pt-[30px]"
            : "bg-[linear-gradient(180deg,#0b1f3a_0%,#0b1f3a_46%,#F4F7F5_46%,#F4F7F5_100%)] pt-8"
        }`}
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-relief/40 bg-relief/[.14] px-[13px] py-[5px]">
            <span className="text-[11px] font-black tracking-[0.22em] text-relief">
              毒のあとに、救いを
            </span>
          </div>

          {(
            <>
              <h1 className="mt-4 text-[clamp(28px,5cqw,48px)] font-black leading-[1.28] tracking-[-0.03em] text-white">
                合わない相手は、
                <br />
                選べない。
              </h1>
              <p className="mb-5.5 mt-3.5 max-w-[32em] text-[13px] leading-8 text-[#b7c6dd]">
                上司も、親も、部活の後輩も。だからTogelは「避ける」ではなく「無事に済ませる」方法を用意しました。ここからは、ちゃんと役に立つ話です。
              </p>

              {/* 地雷の仕組み（全タイプ共通の前提） */}
              <div className="mt-2">{mechanism}</div>
            </>
          )}
        </div>
      </section>

      <section className="px-5.5 pb-[34px] pt-3.5">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5">
          {/*
            診断が無いまま着地したとき（LINE のアプリ内ブラウザ等）は、入口の一覧は
            出せないが、**開いた本文だけは出す**。以前はパネルが下の hasTypes の内側に
            あったため、診断が無いと本文が一切出なかった。
          */}
          {!hasTypes && openPanel}

          {/* 読むものへの入口（診断済みのみ）。タイプごとに1枚、1行が1つの角度 */}
          {hasTypes && (
            <>
              <BoardTypeCards types={boardTypes} open={open} onOpenCell={openCell} />

              {openPanel}

              {/*
                light だけ次の階段（full には置かない）。
                以前は図が全部埋まったら出す条件だったが、数えるのをやめたので
                出す条件が無くなった。10問で来た人には常に出す。
              */}
              {board?.plan === "light" && (
                <div className="grid items-center gap-4 rounded-card border border-lightline bg-white px-5.5 py-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)] sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-black tracking-[0.22em] text-relief-ink">
                      10問で来た方へ
                    </div>
                    <div className="mt-[7px] text-[15px] font-black leading-[1.6] text-navy">
                      あと2タイプ、あなたと噛み合わない相手がいます
                    </div>
                    <p className="mt-[7px] text-[12px] leading-[1.9] text-lighttext-subtle">
                      40問の診断で、その2タイプが読めるようになります。
                    </p>
                  </div>
                  <Link
                    href="/diagnosis/full"
                    className="flex min-h-[52px] items-center justify-center rounded-[14px] bg-primary text-[14px] font-black text-ink transition-colors hover:bg-primary-hover"
                  >
                    40問の診断へ
                  </Link>
                </div>
              )}
            </>
          )}

          {/* 診断済みのときは上に入口が並ぶので、地雷の仕組みはここに置く */}
          {hasTypes && mechanism}

          {/* full 診断で増えるのは「読めるもの」。盤の長さは変えない */}
          {readableTypes.length > 0 && (
            <div className="rounded-card border border-lightline bg-white px-5.5 py-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]">
              <h2 className="text-[10px] font-black tracking-[0.22em] text-relief-ink">
                40問で増えた、読めるタイプ
              </h2>
              <p className="mt-2 text-[12px] leading-[1.95] text-lighttext-subtle">
                盤は3タイプ分のままです。こちらはマスではなく、読み物として増えた分です。
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {readableTypes.map((type) => (
                  <Link
                    key={type.id}
                    href={`/coaching/${type.id}`}
                    className="flex min-h-[56px] items-center gap-3 rounded-input border border-lightline bg-[#f1f5f2] px-3.5 py-2.5 transition-colors hover:border-navy"
                  >
                    <span className="text-[22px]">{type.emoji}</span>
                    <span className="flex flex-col gap-px">
                      <span className="text-[15px] font-black text-navy">{typeToken(type)}</span>
                      <span className="text-[10px] text-lighttext-subtle">{type.typeName}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 24タイプの公開一覧。診断の有無にかかわらず読める */}
          <div className="rounded-hero border border-lightline bg-white px-5.5 py-6 shadow-[0_26px_50px_-34px_rgba(11,31,58,.55)]">
            <h2 className="text-[10px] font-black tracking-[0.22em] text-relief-ink">
              タイプ別ガイド（24タイプ・診断なしで読めます）
            </h2>
            <p className="mt-2 text-[12px] leading-[1.95] text-lighttext-subtle">
              {boardTypes.length > 0
                ? "上に出ていない相手も、ここから読めます。"
                : "相手のタイプが分かっているなら、そのまま読めます。診断を受けると、あなたと噛み合わない相手だけがこの上に並びます。"}
            </p>

            <div className="mt-4 flex flex-col gap-5">
              {TYPE_GROUP_ORDER.map((group) => (
                <div key={group} className="flex flex-col gap-2">
                  <GroupBadge group={group} variant="light" className="self-start" />
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {typesInGroup(group).map((type) => (
                      <Link
                        key={type.id}
                        href={`/coaching/${type.id}`}
                        className="flex min-h-[56px] items-center gap-3 rounded-input border border-lightline bg-[#f1f5f2] px-3.5 py-2.5 transition-colors hover:border-navy"
                      >
                        <span className="text-[20px]">{type.emoji}</span>
                        <span className="flex flex-col gap-px">
                          <span className="text-[15px] font-black text-navy">
                            {typeToken(type)}
                          </span>
                          <span className="text-[10px] text-lighttext-subtle">
                            {type.typeName}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 締め文（省略不可） */}
          <div className="rounded-card border border-dashed border-[#cfdad4] bg-white px-5.5 py-[18px] text-center">
            <p className="text-[13px] font-black leading-[1.95] text-navy">
              タイプは傾向、ラベルは個人。
              <br />
              <span className="font-normal text-lighttext-subtle">
                隣のあの人の本当のラベルは、本人にしかわかりません。
              </span>
            </p>
          </div>

          {/* LINE */}
          <div className="grid items-center gap-[18px] rounded-hero bg-navy p-[22px] sm:grid-cols-2">
            <div>
              {/*
                約束は、配信が有効なときだけ出す。止まっているのに「届く」と言うと、
                登録しても何も来ない。

                以前ここにあった、リンクを開くと盤が進むという一文は外した。
                数える盤を撤去したので、指す先が無くなっていた。
              */}
              {broadcastOn && (
                <>
                  <div className="text-[11px] font-black tracking-[0.22em] text-relief">
                    週に1通、全15回
                  </div>
                  <div className="mt-2 text-[18px] font-black leading-[1.5] text-white">
                    1通目から、踏まない歩き方だけ送ります
                  </div>
                </>
              )}
            </div>
            <a
              href="https://lin.ee/T7OYAGQ"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackLineCta("coaching")}
              className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-linegreen text-[15px] font-black text-white transition-opacity hover:opacity-90"
            >
              {broadcastOn ? "1通目を受け取る" : "公式LINEに登録する"}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
