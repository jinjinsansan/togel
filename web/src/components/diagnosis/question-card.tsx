"use client";

import { DiagnosisQuestion } from "@/types/diagnosis";

/**
 * 設問カード（Web版・LIFF版の共通部品）。
 *
 * 1問1画面・タップで即確定（確定ボタンなし）。
 * 軸名は出さない（どの設問がどの軸かを知らせない）。
 */

/** 選択肢の値ごとのドット色（ピンク=あてはまる ↔ イエロー=あてはまらない） */
const DOT_COLORS: Record<number, string> = {
  5: "#FF2E74",
  4: "rgba(255,46,116,.6)",
  3: "#39415a",
  2: "rgba(255,224,61,.6)",
  1: "#FFE03D",
};

type Props = {
  question: DiagnosisQuestion;
  currentValue?: number;
  onSelect: (value: number) => void;
  /** 設問番号の表示（例: "Q12 / 40"）。省略時は出さない */
  counter?: string;
};

export const QuestionCard = ({ question, currentValue, onSelect, counter }: Props) => (
  <div key={question.id} className="animate-rise">
    <div className="flex items-baseline justify-between">
      <div className="text-[11px] font-black tracking-[0.22em] text-txt-disabled">QUESTION</div>
      {counter && <div className="text-[11px] font-black text-txt-muted">{counter}</div>}
    </div>
    <h2
      className="mt-3 text-[22px] font-black leading-relaxed tracking-[-0.02em] text-white"
      style={{ textWrap: "pretty" }}
    >
      {question.text}
    </h2>
    <p className="mt-2.5 text-xs leading-[1.9] text-txt-subtle">
      直感で。考え込むほど当たらなくなります。
    </p>

    <div className="mt-4 flex flex-col gap-[9px]">
      {[...question.options]
        .sort((a, b) => b.value - a.value)
        .map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`flex min-h-[52px] items-center gap-3 rounded-[14px] border px-[18px] text-left text-sm font-bold transition-colors ${
              currentValue === option.value
                ? "border-primary bg-dangerbg text-white"
                : "border-line bg-surface text-[#e2e7f0] hover:border-primary hover:bg-dangerbg"
            }`}
          >
            <span
              className="h-[9px] w-[9px] flex-none rounded-full"
              style={{ background: DOT_COLORS[option.value] ?? "#39415a" }}
              aria-hidden="true"
            />
            {option.label}
          </button>
        ))}
    </div>
  </div>
);
