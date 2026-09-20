"use client";

/**
 * 開封の手前に置く警告全画面。
 *
 * 演出ではなく、きつい内容の前置き。読む前に身構える機会を本人に渡す装置なので、
 * Web版・LIFF版のどちらにも同じものを出す（入口によって前置きの有無が変わらないように）。
 *
 * 予告しているのは「内容の強さ」であって「結果の可変性」ではない。
 * 何が出るかは既に決まっているので、ドラムロールやシャッフルとは性質が違う。
 *
 * 置く位置: 最終問に回答した直後の1回だけ。開封シーケンス（回想 → 封筒 → 開く）の
 * 途中には挟まない。挟むと「通ってきたものが集まって封筒になる」因果が切れる。
 */

type Props = {
  totalQuestions: number;
  /** 「あなたと絶対に合わない◯◯を特定しました」の◯◯（例: "タイプ" / "5タイプ"） */
  worstLabel: string;
  submitFailed?: boolean;
  onProceed: () => void;
  onCancel: () => void;
};

export const WarningGate = ({
  totalQuestions,
  worstLabel,
  submitFailed = false,
  onProceed,
  onCancel,
}: Props) => (
  <div className="animate-flash relative flex min-h-[100dvh] flex-col items-center justify-center bg-dangerbg px-[26px] py-[34px] text-center text-white">
    <div className="absolute inset-x-0 top-0 h-[10px] bg-hazard-lg" aria-hidden="true" />
    <div className="flex h-[82px] w-[82px] items-center justify-center rounded-hero bg-hazard text-[40px] font-black text-ink">
      ▲
    </div>
    <div className="mt-6 text-[11px] font-black tracking-[0.22em] text-hazard">WARNING</div>
    <h2 className="mt-3.5 text-[30px] font-black leading-[1.45] tracking-[-0.02em]">
      この先、
      <br />
      けっこう言います。
    </h2>
    <p className="mt-4 max-w-[22em] text-[13px] leading-8 text-txt-muted">
      {totalQuestions}問の回答から、あなたと絶対に合わない{worstLabel}
      を特定しました。読んだあと、笑える人だけ進んでください。
    </p>
    {submitFailed && (
      <p className="mt-4 rounded-input bg-error/15 px-4 py-2 text-xs font-bold text-errortext">
        診断結果の生成に失敗しました。もう一度お試しください。
      </p>
    )}
    <button
      type="button"
      onClick={onProceed}
      className="mt-[30px] min-h-[58px] w-full max-w-sm rounded-card bg-primary text-base font-black text-white shadow-danger transition-colors hover:bg-primary-hover"
    >
      覚悟して開ける
    </button>
    <button
      type="button"
      onClick={onCancel}
      className="mt-3 text-xs font-bold text-txt-subtle transition-colors hover:text-white"
    >
      やっぱりやめる
    </button>
    <div className="absolute inset-x-0 bottom-0 h-[10px] bg-hazard-lg" aria-hidden="true" />
  </div>
);
