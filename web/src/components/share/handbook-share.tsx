"use client";

import { useState } from "react";

import { lineShareUrl, xIntentUrl } from "@/lib/share/text";

/**
 * 「取扱説明書を配る」導線。
 *
 * これは「シェア」ではなく「配る」。渡すのは自分の取扱説明書であって、
 * 相手に貼るラベルではない。文面は自己申告の形で固定する。
 *
 * LINEで送る導線をXと同等の目立ちで置く（個人に渡すほうが本命のため）。
 * 開封演出の直後には置かない（結果ページなど、1画面分空けた位置で使う）。
 */

type Props = {
  /** 配る文面（lib/share/text.ts で組成したもの） */
  text: string;
  /** 文面に添えるURL */
  url: string;
  /** 9:16の取扱注意ラベル画像 */
  labelHref: string;
  className?: string;
};

export const HandbookShare = ({ text, url, labelHref, className = "" }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`rounded-card border border-line bg-panel p-5 ${className}`}>
      <div className="text-[11px] font-black tracking-[0.22em] text-hazard">HANDBOOK</div>
      <h3 className="mt-2 text-[19px] font-black leading-normal text-white">取扱説明書を配る</h3>
      <p className="mt-2 text-xs leading-[1.9] text-txt-muted">
        「私はこういう人間なので、こう扱ってください」を、そのまま渡せる形にしました。
        言い当てるためではなく、言っておくためのものです。
      </p>

      <pre className="mt-3.5 whitespace-pre-wrap rounded-[14px] border border-line-soft bg-surface p-4 text-[12.5px] leading-[1.9] text-[#e2e7f0]">
        {text}
      </pre>

      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex min-h-[48px] items-center rounded-full bg-white px-5 text-xs font-black text-ink transition-colors hover:bg-hazard"
        >
          {copied ? "コピーしました" : "コピーして配る"}
        </button>
        <a
          href={lineShareUrl(text, url)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[48px] items-center rounded-full bg-linegreen px-5 text-xs font-black text-white transition-opacity hover:opacity-90"
        >
          LINEで送る
        </a>
        <a
          href={xIntentUrl(text, url)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[48px] items-center rounded-full border border-[#2a3348] bg-black px-5 text-xs font-black text-white transition-colors hover:border-white"
        >
          Xに投稿
        </a>
        <a
          href={labelHref}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[48px] items-center rounded-full border border-line px-5 text-xs font-bold text-txt-muted transition-colors hover:border-hazard hover:text-white"
        >
          ラベル画像（縦）
        </a>
      </div>
    </div>
  );
};
