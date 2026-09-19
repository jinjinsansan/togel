"use client";

import { MILESTONE_NOTE } from "@/lib/diagnosis/board";

/**
 * 中間マス。
 *
 * 前向きの予測をしない。通ってきた設問と、そこで選んだ選択肢をそのまま返すだけ。
 * 解釈（「つまりあなたは〜」）・軸名・スコア・残り問数は出さない。
 * 診断が終わっていない時点で出る要素なので、但し書きは省略しない。
 */

type Props = {
  text: string;
  onContinue: () => void;
  /** 最後の中間マスのあとは設問が残り少ないので、ボタンの文言だけ変える */
  continueLabel?: string;
};

export const MilestoneCard = ({ text, onContinue, continueLabel = "進む" }: Props) => (
  <div className="animate-rise rounded-[18px] border border-warnline bg-warnbg p-5">
    <div className="text-[10px] font-black tracking-[0.28em] text-hazard">通ってきた道</div>
    <p
      className="mt-3.5 whitespace-pre-line text-[15px] font-bold leading-[1.9] text-white"
      style={{ textWrap: "pretty" }}
    >
      {text}
    </p>
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-[11px] font-bold text-txt-subtle">{MILESTONE_NOTE}</span>
      <button
        type="button"
        onClick={onContinue}
        className="min-h-[48px] rounded-full bg-hazard px-7 text-sm font-black text-ink transition-colors hover:bg-white"
      >
        {continueLabel}
      </button>
    </div>
  </div>
);
