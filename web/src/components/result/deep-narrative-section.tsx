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
    {/*
      節の**いちばん最初**に置く約束。見出しは付けず、地の文として。
      回収（S3・S4）は iPhone で 2.0〜2.8画面目まで来ない。S1 の直後に置くと
      カードが約600pxあるため 1.0画面目＝折り返し地点に落ち、スクロールせずに
      離脱した人には届かなかった。ここなら 0.25画面目に入る。
    */}
    <p className="mx-1 whitespace-pre-line px-4 text-[12.5px] leading-[2.1] text-txt-subtle">
      {DEEP_BRIDGE}
    </p>

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

      </Fragment>
    ))}
  </div>
);
