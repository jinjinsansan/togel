import { notFound } from "next/navigation";

import { DeepNarrativeSection } from "@/components/result/deep-narrative-section";
import { DEEP_COPY, DEEP_SLOTS, type DeepSlot } from "@/lib/personality/narrative";
import {
  HEAT_KEYS,
  INTENSITY_KEYS,
  REACTION_KEYS,
  type HeatKey,
  type IntensityKey,
  type ReactionKey,
} from "@/lib/personality/reaction";

/**
 * 【開発用】S1〜S4 の静的プレビュー。**本番では404を返す。**
 *
 * 本番の `/result` は利用者ごとの保存状態でしか描画されないため、
 * 書いた本文がどう見えるかを外から確認できない。見た目は
 * `components/result/deep-narrative-section.tsx` を本番と共有している。
 *
 * `?only=s1` は「S4まで読まずに離脱した人に何が残るか」を見るためにある。
 * 通しで問題なくても、途中で切れたときに何が残るかは別の問題。
 *
 *   TOGEL_DEV_PREVIEW=1 npm run start
 *   /dev/preview/deep?reaction=evaluation&intensity=high&heat=high
 *   /dev/preview/deep?reaction=evaluation&intensity=high&heat=high&only=s1
 */
export const dynamic = "force-dynamic";

const pick = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export default async function DeepPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ reaction?: string; intensity?: string; heat?: string; only?: string }>;
}) {
  if (process.env.TOGEL_DEV_PREVIEW !== "1") notFound();

  const params = await searchParams;
  const reaction = pick<ReactionKey>(params.reaction, REACTION_KEYS, "evaluation");
  const intensity = pick<IntensityKey>(params.intensity, INTENSITY_KEYS, "high");
  const heat = pick<HeatKey>(params.heat, HEAT_KEYS, "high");

  const copy = DEEP_COPY[reaction];
  if (!copy) notFound();

  const narrative = {
    s1: copy.s1[intensity],
    s2: copy.s2,
    s3: copy.s3,
    s4: heat === "high" ? copy.s4.heatHigh : copy.s4.heatLow,
  };

  // 「途中で切れた状態」を作る。?only=s1 なら S1 だけ
  const only = params.only?.split(",").filter((slot): slot is DeepSlot =>
    (DEEP_SLOTS as readonly string[]).includes(slot),
  );
  const slots = only?.length ? only : DEEP_SLOTS;

  const chars = [...slots.map((slot) => narrative[slot]).join("")].length;

  return (
    <div className="min-h-screen bg-ink px-5.5 py-8 text-txt">
      <div className="mx-auto max-w-[1120px] rounded-card border border-dashed border-line p-4 text-[11px] text-txt-subtle">
        開発用プレビュー ／ {reaction} ・ 強度 {intensity} ・ 放熱 {heat} ／ 表示 {slots.join("+")}{" "}
        ／ {chars}字
      </div>
      <DeepNarrativeSection narrative={narrative} slots={slots} />
    </div>
  );
}
