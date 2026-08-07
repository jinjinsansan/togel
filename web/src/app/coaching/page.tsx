"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { personalityTypes } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import { getTypeApproachGuide } from "@/lib/coaching/translations";
import type { PersonalityTypeDefinition } from "@/types/diagnosis";

const findExtended = (typeId: string | undefined): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === typeId) ?? null;

const levelForRank = (rank: number): string => {
  const stars = Math.max(3, 6 - rank); // rank1=5つ星, rank2=4つ星, rank3以降=3つ星
  return "★".repeat(stars) + "☆".repeat(5 - stars);
};

export default function CoachingPage() {
  const [selfTypeId, setSelfTypeId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedback, setFeedback] = useState<Record<string, "good" | "bad">>({});

  // 診断済みならsessionStorageから自分のタイプを読む（未診断でも全タイプ閲覧可）
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("latestDiagnosis");
      if (!raw) return;
      const diagnosis = JSON.parse(raw) as { personalityType?: PersonalityTypeDefinition };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorageはクライアントでしか読めない
      if (diagnosis.personalityType?.id) setSelfTypeId(diagnosis.personalityType.id);
    } catch {
      /* ignore */
    }
  }, []);

  const selfType = findExtended(selfTypeId ?? undefined);

  // 診断済み: 自分のワースト3タイプ / 未診断: 全24タイプから選択
  const targetTypes = useMemo(() => {
    if (selfType) {
      return selfType.badCompatibleTypes
        .map((id) => findExtended(id))
        .filter((t): t is ExtendedPersonalityTypeDefinition => Boolean(t));
    }
    return personalityTypes;
  }, [selfType]);

  const active = targetTypes[Math.min(activeIndex, targetTypes.length - 1)];
  const guide = active ? getTypeApproachGuide(active.id) : null;

  return (
    <div className="min-h-screen bg-paper text-navy">
      {/* ヒーロー: ネイビー→ペーパーの分割背景 */}
      <section
        className="bg-[linear-gradient(180deg,#0b1f3a_0%,#0b1f3a_46%,#F4F7F5_46%,#F4F7F5_100%)] px-5.5 pb-[26px] pt-8"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-relief/40 bg-relief/[.14] px-[13px] py-[5px]">
            <span className="text-[11px] font-black tracking-[0.16em] text-relief">
              毒のあとに、救いを
            </span>
          </div>
          <h1 className="mt-4 text-[clamp(28px,5cqw,48px)] font-black leading-[1.28] tracking-[-0.03em] text-white">
            合わない相手は、
            <br />
            選べない。
          </h1>
          <p className="mb-5.5 mt-3.5 max-w-[32em] text-[13px] leading-8 text-[#b7c6dd]">
            上司も、親も、部活の後輩も。だからTogelは「避ける」ではなく「無事に済ませる」方法を用意しました。ここからは、ちゃんと役に立つ話です。
          </p>

          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {[
              {
                step: "STEP 1",
                title: "相手を特定する",
                body: selfType
                  ? "あなたのワースト上位から選んでください。"
                  : "24タイプから相手を選んでください。診断すると自動で絞り込まれます。",
              },
              {
                step: "STEP 2",
                title: "言い方を変える",
                body: "同じ内容を、相手のタイプに刺さる形に翻訳します。",
              },
              {
                step: "STEP 3",
                title: "距離を決める",
                body: "分かり合わない、という選択肢も正解のひとつです。",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-card border border-lightline bg-white p-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]"
              >
                <div className="text-[10px] font-black tracking-[0.2em] text-relief-ink">
                  {item.step}
                </div>
                <div className="mt-2 text-[17px] font-black">{item.title}</div>
                <p className="mt-2 text-xs leading-[1.95] text-lighttext-subtle">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5.5 pb-[34px] pt-3.5">
        <div className="mx-auto max-w-[1120px]">
          {/* タイプ切替タブ */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {targetTypes.map((type, i) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`min-h-[42px] flex-none rounded-full border px-4 text-xs font-black transition-colors ${
                  i === activeIndex
                    ? "border-navy bg-navy text-white"
                    : "border-lightline bg-white text-lighttext-subtle hover:border-navy"
                }`}
              >
                {type.typeName}
              </button>
            ))}
          </div>

          {active && guide && (
            <div
              key={active.id}
              className="animate-rise mt-4 rounded-hero border border-lightline bg-white px-5.5 py-6 shadow-[0_26px_50px_-34px_rgba(11,31,58,.55)]"
              style={{ containerType: "inline-size" }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black tracking-[0.2em] text-[#c1113f]">
                    {selfType ? `あなたのワースト${activeIndex + 1}` : "攻略対象"}
                  </div>
                  <h2 className="mt-2 text-[clamp(22px,3.2cqw,32px)] font-black tracking-[-0.02em]">
                    {active.typeName}
                  </h2>
                  <div className="mt-1 text-xs font-bold text-lighttext-subtle">
                    {active.catchphrase}
                  </div>
                </div>
                <div className="rounded-input border border-lightline bg-[#f1f5f2] px-3.5 py-2">
                  <span className="text-[10px] text-lighttext-subtle">対処難易度</span>
                  <div className="text-[15px] font-black text-[#c1113f]">
                    {levelForRank(activeIndex + 1)}
                  </div>
                </div>
              </div>

              <div className="mt-5.5 grid gap-3.5 md:grid-cols-2">
                {/* 言い方の翻訳 */}
                <div className="rounded-[14px] border border-lightline bg-[#f1f5f2] p-[18px]">
                  <div className="text-[10px] font-black tracking-[0.2em] text-relief-ink">
                    言い方の翻訳
                  </div>
                  <div className="mt-3.5 flex flex-col gap-3.5">
                    <div>
                      <div className="text-[10px] font-black text-[#c1113f]">✕ あなたが言いがち</div>
                      <div className="mt-1 rounded-[11px] border border-[#f0d3da] bg-white px-[13px] py-[11px] text-[12.5px] leading-relaxed text-lighttext-muted">
                        {guide.ng}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-relief-ink">◯ こう言い換える</div>
                      <div className="mt-1 rounded-[11px] border border-[#b9e3d0] bg-[#e9f7f0] px-[13px] py-[11px] text-[12.5px] font-bold leading-relaxed text-navy">
                        {guide.ok}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3.5 text-[11.5px] leading-[1.9] text-lighttext-subtle">
                    {guide.why}
                  </p>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* 今日からやること */}
                  <div className="rounded-[14px] border border-lightline bg-[#f1f5f2] p-[18px]">
                    <div className="text-[10px] font-black tracking-[0.2em] text-relief-ink">
                      今日からやること
                    </div>
                    <div className="mt-3 flex flex-col gap-2.5">
                      {guide.dos.map((item, i) => (
                        <div key={i} className="flex items-start gap-[9px]">
                          <span className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[5px] bg-relief-ink text-[10px] font-black text-white">
                            {i + 1}
                          </span>
                          <span className="text-xs leading-relaxed text-lighttext-muted">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 距離の置き方 */}
                  <div className="rounded-[14px] bg-navy p-[18px]">
                    <div className="text-[10px] font-black tracking-[0.2em] text-relief">
                      距離の置き方
                    </div>
                    <p className="mt-[11px] text-[12.5px] leading-[1.95] text-[#c3d3e8]">
                      {guide.distance}
                    </p>
                  </div>
                </div>
              </div>

              {/* フィードバック */}
              <div className="mt-[18px] flex flex-wrap items-center justify-between gap-2.5 border-t border-dashed border-lightline pt-[18px]">
                <span className="text-xs text-lighttext-subtle">
                  {feedback[active.id]
                    ? feedback[active.id] === "good"
                      ? "ありがとうございます。無事を祈ります。"
                      : "精進します。距離を置くのも正解です。"
                    : "このガイドは役に立ちましたか？"}
                </span>
                {!feedback[active.id] && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFeedback((prev) => ({ ...prev, [active.id]: "good" }))}
                      className="min-h-[40px] rounded-full border border-lightline bg-white px-4 text-xs font-bold text-navy transition-colors hover:border-relief-ink"
                    >
                      役に立った
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedback((prev) => ({ ...prev, [active.id]: "bad" }))}
                      className="min-h-[40px] rounded-full border border-lightline bg-white px-4 text-xs font-bold text-navy transition-colors hover:border-[#c1113f]"
                    >
                      いまいち
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 未診断への導線 */}
          {!selfType && (
            <div className="mt-3.5 rounded-card border border-dashed border-lightline bg-white p-5 text-center">
              <p className="text-xs leading-[1.9] text-lighttext-subtle">
                診断を受けると、あなた専用のワーストタイプに自動で絞り込まれます。
              </p>
              <Link
                href="/diagnosis/select"
                className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-navy px-6 text-xs font-black text-white transition-colors hover:bg-primary"
              >
                診断をはじめる
              </Link>
            </div>
          )}

          {/* LINE CTA */}
          <div className="mt-3.5 grid items-center gap-[18px] rounded-[18px] bg-navy p-5.5 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-black tracking-[0.2em] text-relief">
                毎週1タイプずつ
              </div>
              <div className="mt-2 text-[19px] font-black leading-normal text-white">
                LINEで攻略法を受け取る
              </div>
              <p className="mt-2 text-xs leading-[1.9] text-[#b7c6dd]">
                読み切りサイズ。読むだけで、来週の面倒がひとつ減ります。
              </p>
            </div>
            <a
              href="https://lin.ee/T7OYAGQ"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-linegreen text-sm font-black text-white transition-opacity hover:opacity-90"
            >
              LINEで友だち追加
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
