import { Fragment } from "react";

import {
  DEEP_BRIDGE,
  DEEP_HEADINGS,
  DEEP_SLOTS,
  type DeepNarrative,
  type DeepSlot,
} from "@/lib/personality/narrative";

/**
 * 診断直後に読む「深い自己説明」（S1〜S4）。
 *
 * `/result`（本番）と `/dev/preview/deep`（開発用の静的プレビュー）の**両方がこれを使う**。
 * プレビュー側で作り直すと、見ているものと出ているものが別々に育つ。
 *
 * 【構造の約束】
 * - **アコーディオンに入れない。** 既定で開いた状態で置く。押さないと見えない場所に
 *   置けば、深くしていないのと同じになる（実測で、開かずに読まれていたのは138字だった）
 * - S1-S2 で刺し、**S3-S4 で必ず回収する**。色も毒→救いの順に振ってある
 * - **S4 を省いた状態で出さない。** 刺しっぱなしで終わる
 */

const TONE: Record<DeepSlot, "hazard" | "relief"> = {
  s1: "hazard",
  s2: "hazard",
  s3: "relief",
  s4: "relief",
};

export const DeepNarrativeSection = ({
  narrative,
  /** 開発用プレビューで「途中で切れた状態」を作るためだけの指定。本番では渡さない */
  slots = DEEP_SLOTS,
}: {
  narrative: DeepNarrative;
  slots?: readonly DeepSlot[];
}) => (
  <div className="mx-auto mt-7 flex max-w-[1120px] flex-col gap-3.5">
    {slots.map((slot) => (
      <Fragment key={slot}>
        <div className="rounded-card border border-line bg-surface p-5">
          <h2
            className={`text-[13px] font-black leading-[1.6] ${
              TONE[slot] === "hazard" ? "text-hazard" : "text-relief"
            }`}
          >
            {DEEP_HEADINGS[slot]}
          </h2>
          <p
            className="mt-3 max-w-[38em] whitespace-pre-line text-[13px] leading-8 text-txt-muted"
            style={{ textWrap: "pretty" }}
          >
            {narrative[slot]}
          </p>
        </div>

        {/*
          S1 の直後に挟む約束。見出しは付けず、地の文として置く。
          ここで離脱しても「突き放された」で終わらないようにするためのものなので、
          **S1 が出ているときは必ず出す**（S2 以降を見せない指定のときも）。
        */}
        {slot === "s1" && (
          <p className="mx-1 whitespace-pre-line px-4 text-[12.5px] leading-[2.1] text-txt-subtle">
            {DEEP_BRIDGE}
          </p>
        )}
      </Fragment>
    ))}
  </div>
);
