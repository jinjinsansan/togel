"use client";

import { Fragment, useCallback, useRef, useState, useSyncExternalStore } from "react";

import { GroupBadge } from "@/components/brand/group-badge";
import { useReducedMotion } from "@/components/diagnosis/board/use-reduced-motion";
import { trackLineCta } from "@/lib/analytics/events";
import { isBroadcastEnabled } from "@/lib/line/broadcast-enabled";
import { typeToken } from "@/lib/personality";
import { fixedCards } from "@/lib/personality/copy/cards-reactions";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import {
  CHAPTERS,
  STORY_LENGTH,
  coreAxis,
  type Face,
  type StoryCard,
} from "@/lib/personality/story/cards";
import { parseEmphasis } from "@/lib/personality/story/emphasis";
import { TOGEL_INDEX, togelIndexPercent } from "@/lib/personality/togel-index";
import type { BigFiveScores } from "@/types/diagnosis";

/**
 * 結果ページのストーリーズ（全14枚）。
 *
 * 【v2】後半を「取扱説明書の取扱注意の欄」に作り直した（オーナー承認済み）。
 * 「ピンク色ばかりで見にくい」を受けて、1枚に出るピンクは**主ボタン以外で1か所まで**。
 * 進捗バー・章ラベルは白とグレー、明るい面の強調は緑。
 *
 * 【スマホとPCで別の並びにする】
 * スマホは縦1列、PC（1024px以上）は左に見出し・右に図や本文の2段組み。並び順が違うので
 * **どちらか一方だけ**を描く（両方描いて片方を隠すと、同じ文が2回ある状態になる）。
 *
 * 【操作】
 * - スマホ: 右66%で次・左34%で前（本物の <button>）。表紙・13枚目（周りの人へ）・締めには
 *   タップ領域を置かない。13枚目は前へ／次へを明示する（ボタンの誤タップで進まないように）
 * - PC: タップ領域は使わず、下の前へ／次へのボタンだけ
 * - どちらも ← → キーはビューアの要素に張る（window には張らない）
 * - 切り替えは 150ms 以下のフェードだけで、prefers-reduced-motion のときは付けない
 */

/** LINE の友だち追加。/result に既にある導線と同じリンク先（新しく作らない） */
const LINE_URL = "https://lin.ee/T7OYAGQ";

type Props = {
  story: StoryCard[];
  type: ExtendedPersonalityTypeDefinition;
  scores: BigFiveScores;
  /** 既存の「取扱注意ラベルを保存（縦・ストーリーズ用）」のリンク（新しい画像生成は作らない） */
  labelHref: string;
  /** 「噛み合わない相手を見る」でスクロールする先 */
  belowId: string;
  /** 最初に開く1枚（0始まり）。開発用プレビューで途中の1枚を撮るためだけに使う */
  initialIndex?: number;
};

/* ---------- 画面幅（PCか） ---------- */

const DESKTOP_QUERY = "(min-width: 1024px)";
const subscribeDesktop = (onChange: () => void) => {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
/** サーバーではスマホ扱い（読み込み直後に PC なら切り替わる） */
const useIsDesktop = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );

/* ---------- 面ごとの色（ピンクは強調・図の出力・主ボタンだけ） ---------- */

const FACE = {
  dark: {
    bg: "bg-base",
    big: "text-white",
    body: "text-txt-muted",
    label: "text-txt-subtle",
    progressOn: "bg-white",
    progressOff: "bg-line",
    footer: "text-txt-subtle",
  },
  light: {
    bg: "bg-paper",
    big: "text-lighttext",
    body: "text-lighttext-muted",
    label: "text-lighttext-subtle",
    progressOn: "bg-lighttext",
    progressOff: "bg-lightline",
    footer: "text-lighttext-subtle",
  },
} as const;

type Tone = "hazard" | "relief";

/**
 * 強調の色。暗い面はピンク、ただし「本当のことを返す1枚」（tone: relief）は緑。
 * 明るい面は**緑だけ**（ピンクを使わない）。
 */
const emphClass = (face: Face, tone?: Tone) =>
  face === "light" ? "text-relief-ink" : tone === "relief" ? "text-relief" : "text-primary";

/** 〔〕 を強調の span にする。解析は emphasis.ts の1か所だけ */
const Emph = ({ text, face, tone }: { text: string; face: Face; tone?: Tone }) => (
  <>
    {parseEmphasis(text).map((segment, i) =>
      segment.emphasis ? (
        <span key={i} className={emphClass(face, tone)}>
          {segment.text}
        </span>
      ) : (
        <Fragment key={i}>{segment.text}</Fragment>
      ),
    )}
  </>
);

/* ---------- 共通の部品 ---------- */

const Label = ({ text, face }: { text: string; face: Face }) => (
  <div className={`text-[12px] font-bold tracking-[0.22em] lg:text-[13px] ${FACE[face].label}`}>
    {text}
  </div>
);

const BIG_SIZE = "text-[28px] short:text-[25px] lg:text-[40px] lg:leading-[1.45]";

const Big = ({
  text,
  face,
  tone,
  size = BIG_SIZE,
}: {
  text: string;
  face: Face;
  tone?: Tone;
  size?: string;
}) => (
  <h2
    className={`m-0 whitespace-pre-line font-heading font-black leading-[1.5] ${size} ${FACE[face].big}`}
  >
    <Emph text={text} face={face} tone={tone} />
  </h2>
);

const Mid = ({ text, face, tone }: { text: string; face: Face; tone?: Tone }) => (
  <p
    className={`m-0 whitespace-pre-line text-[17px] font-bold leading-[1.75] lg:text-[19px] short:text-[16px] ${FACE[face].big}`}
  >
    <Emph text={text} face={face} tone={tone} />
  </p>
);

const Body = ({ text, face, tone }: { text: string; face: Face; tone?: Tone }) => (
  <p
    className={`m-0 whitespace-pre-line text-[15px] font-medium leading-[1.95] lg:text-[16px] short:leading-[1.75] ${FACE[face].body}`}
  >
    <Emph text={text} face={face} tone={tone} />
  </p>
);

/** INDEX のバー。一番高い軸だけ白、他はグレー（ピンクにしない） */
const IndexBars = ({ scores }: { scores: BigFiveScores }) => {
  const core = coreAxis(scores).key;
  return (
    <div className="flex flex-col gap-[18px] short:gap-3">
      {TOGEL_INDEX.map(({ key, label }) => {
        const pct = togelIndexPercent(key, scores);
        return (
          <div key={key} className="flex flex-col gap-2 short:gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold text-white">{label}</span>
              <span className="text-[22px] font-black text-white">{pct}</span>
            </div>
            <div className="h-1.5 rounded-[3px] bg-line-soft">
              <div
                className={`h-1.5 rounded-[3px] ${key === core ? "bg-white" : "bg-txt-muted"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 6枚目の目次。⑤（周りの人へ）だけ緑: 最後は扱い方の話で終わる、を目次でも見せる */
const Toc = () => (
  <div className="flex flex-col border-t border-line-soft">
    {CHAPTERS.map(([no, name, desc], i) => {
      const last = i === CHAPTERS.length - 1;
      return (
        <div
          key={no}
          className="flex items-baseline gap-3 border-b border-line-soft py-3 short:py-2"
        >
          <span
            className={`w-5 shrink-0 text-[15px] font-black ${last ? "text-relief" : "text-white"}`}
          >
            {no}
          </span>
          <span
            data-toc-name
            className={`w-[92px] shrink-0 whitespace-nowrap text-[15px] font-bold ${last ? "text-relief" : "text-white"}`}
          >
            {name}
          </span>
          <span className="text-[13px] font-medium text-txt-subtle">{desc}</span>
        </div>
      );
    })}
  </div>
);

type DiagramData = Extract<StoryCard, { kind: "diagram" }>["diagram"];

/** 変換回路の図。スマホは縦、PCは横。この枚のピンクは「出力」の1か所だけ */
const Diagram = ({ diagram, horizontal }: { diagram: DiagramData; horizontal: boolean }) => {
  const d = fixedCards.diagram;
  const box =
    "flex flex-1 flex-col gap-1 rounded-[14px] px-[18px] py-3.5 short:py-3 lg:rounded-[16px] lg:px-[18px] lg:py-5";
  const input = (
    <div className={`${box} border border-line`}>
      <span className="text-[12px] font-bold text-txt-subtle">{d.inputLabel}</span>
      <span data-diagram-value className="text-[21px] font-black text-white lg:text-[20px]">
        {diagram.input}
      </span>
    </div>
  );
  const output = (
    <div className={`${box} border-2 border-primary`}>
      <span className="text-[12px] font-bold text-txt-subtle">{d.outputLabel}</span>
      <span
        data-diagram-value
        className="text-[25px] font-black text-primary lg:text-[20px] short:text-[22px]"
      >
        {diagram.output}
      </span>
    </div>
  );
  return (
    <div className="flex flex-col gap-4 lg:gap-[22px] short:gap-3">
      {horizontal ? (
        <>
          <div className="flex items-stretch gap-4">
            {input}
            <div className="flex shrink-0 items-center text-txt-muted" aria-hidden="true">
              <svg
                width="36"
                height="20"
                viewBox="0 0 36 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 10h30" />
                <path d="M24 3l8 7-8 7" />
              </svg>
            </div>
            {output}
          </div>
          <span className="text-[13px] font-bold text-txt-muted">{d.bridge}</span>
        </>
      ) : (
        <>
          {input}
          <div className="flex items-center gap-3.5 pl-[26px]">
            <div className="h-[46px] w-0 border-l-2 border-line short:h-7" />
            <span className="text-[13px] font-bold text-txt-muted">{d.bridge}</span>
          </div>
          {output}
        </>
      )}
      <div
        className={`flex flex-col gap-2.5 short:gap-2 ${
          horizontal ? "border-t border-line-soft pt-5" : "mt-1.5 short:mt-0"
        }`}
      >
        <span className="text-[12px] font-bold text-txt-subtle lg:text-[13px]">
          {d.rejectedLabel}
        </span>
        <div className="flex flex-wrap gap-2 lg:gap-2.5">
          {diagram.rejected.map((option) => (
            <span
              key={option}
              className="rounded-full border border-line px-3 py-1.5 text-[13px] font-bold text-txt-subtle line-through lg:px-4 lg:py-2 lg:text-[15px]"
            >
              {option}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Chips = ({ chips }: { chips: readonly string[] }) => (
  <div className="flex flex-wrap gap-2 lg:gap-2.5 short:gap-1.5">
    {chips.map((chip) => (
      <span
        key={chip}
        className="rounded-[12px] border border-lightline bg-white px-3 py-2 text-[14px] font-bold text-lighttext lg:px-4 lg:py-3 lg:text-[16px] short:px-2.5 short:py-1.5 short:text-[13px]"
      >
        {chip}
      </span>
    ))}
  </div>
);

type LabelData = Extract<StoryCard, { kind: "label" }>;

/** 人に渡せる取扱注意ラベル（13枚目）。ピンク系は「厳禁」の1か所だけ */
const LabelPlate = ({ card }: { card: LabelData }) => (
  <div className="flex flex-col gap-4 rounded-[18px] border-2 border-lighttext bg-white px-5 pb-[18px] pt-5 lg:gap-5 lg:px-7 lg:pb-6 lg:pt-7 short:gap-3 short:pt-4">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[20px] font-black text-lighttext lg:text-[24px]">{card.title}</span>
      <span className="text-[11px] font-bold tracking-[0.22em] text-lighttext-subtle">TOGEL</span>
    </div>
    <div className="h-px bg-lightline" />
    <div className="flex items-start gap-3">
      <span className="shrink-0 rounded-[6px] bg-primary-ink px-2 py-1 text-[12px] font-black text-white">
        {fixedCards.label.ngBadge}
      </span>
      <span className="text-[17px] font-black leading-[1.5] text-lighttext lg:text-[19px]">
        {card.ng}
      </span>
    </div>
    <div className="flex items-start gap-3">
      <span className="shrink-0 rounded-[6px] bg-relief-ink px-2 py-1 text-[12px] font-black text-white">
        {fixedCards.label.okBadge}
      </span>
      <span className="text-[17px] font-black leading-[1.5] text-lighttext lg:text-[19px]">
        {card.ok}
      </span>
    </div>
    <p className="m-0 text-[14px] font-medium leading-[1.85] text-lighttext-muted lg:text-[15px]">
      {card.note}
    </p>
  </div>
);

const SaveButton = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="flex h-[52px] items-center justify-center rounded-[16px] border-2 border-lighttext text-[15px] font-black text-lighttext"
  >
    画像で保存して送る
  </a>
);

const CloseButtons = ({ belowId, onRestart }: { belowId: string; onRestart: () => void }) => {
  const broadcastOn = isBroadcastEnabled();
  return (
    <div className="flex flex-col gap-2.5">
      {/*
        約束は、配信が有効なときだけ出す。止まっているあいだは「公式LINEに登録する」
        だけにする（登録しても何も届かないため）。
      */}
      <a
        href={LINE_URL}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackLineCta("result_story")}
        data-primary-cta
        className="flex h-[58px] items-center justify-center rounded-[16px] bg-primary text-[16px] font-black text-ink"
      >
        {broadcastOn ? "公式LINEで続きを受け取る" : "公式LINEに登録する"}
      </a>
      <button
        type="button"
        onClick={() => document.getElementById(belowId)?.scrollIntoView({ behavior: "smooth" })}
        className="h-[52px] rounded-[16px] border-2 border-lighttext text-[15px] font-black text-lighttext"
      >
        噛み合わない相手を見る
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="h-11 text-[14px] font-bold text-lighttext-muted underline"
      >
        最初から読む
      </button>
    </div>
  );
};

const CoverIdentity = ({ type }: { type: ExtendedPersonalityTypeDefinition }) => (
  <div className="flex flex-col gap-3.5">
    <div className="text-[12px] font-bold tracking-[0.22em] text-txt-subtle">
      診断結果　あなたの取扱説明書
    </div>
    {/* 群名は GroupBadge の入口からだけ出す（再定義と一体）。表紙では中立色の pill */}
    <GroupBadge group={type.group} variant="pill" className="mt-12 self-start lg:mt-8 short:mt-6" />
    <div className="mt-[18px] text-[18px] font-bold text-txt-muted short:mt-2">あなたは</div>
    <div className="font-heading text-[64px] font-black leading-[1.05] tracking-[-0.03em] text-white short:text-[56px]">
      {typeToken(type)}
    </div>
    {/* 呼称はグレー。この枚のピンクは主ボタンだけ */}
    <div className="text-[16px] font-bold text-txt-muted">{type.typeName}</div>
    <div className="mt-1.5 text-[21px] font-bold leading-[1.55] text-white">{type.catchphrase}</div>
    <div className="mt-2.5 flex flex-wrap gap-2">
      {type.tags.map((tag) => (
        <span
          key={tag}
          className="rounded-[8px] bg-surface px-2.5 py-1.5 text-[13px] font-bold text-txt-muted"
        >
          {tag}
        </span>
      ))}
    </div>
  </div>
);

const StartButton = ({ onNext }: { onNext: () => void }) => (
  <div className="flex flex-col gap-3">
    <div className="text-center text-[13px] font-medium text-txt-muted">
      全{STORY_LENGTH}枚　約3分で読めます
    </div>
    <button
      type="button"
      onClick={onNext}
      data-primary-cta
      className="h-[58px] rounded-[16px] bg-primary text-[17px] font-black text-ink"
    >
      読みはじめる
    </button>
  </div>
);

/* ---------- 1枚の中身: スマホ（縦1列） ---------- */

type BodyProps = {
  card: StoryCard;
  type: ExtendedPersonalityTypeDefinition;
  scores: BigFiveScores;
  onNext: () => void;
  onPrev: () => void;
  onRestart: () => void;
  labelHref: string;
  belowId: string;
};

const PAD = "px-[26px] pb-6 pt-12";

const MobileBody = ({
  card,
  type,
  scores,
  onNext,
  onPrev,
  onRestart,
  labelHref,
  belowId,
}: BodyProps) => {
  switch (card.kind) {
    case "cover":
      return (
        <div className="flex h-full flex-col px-[26px] pb-9 pt-14 short:pt-11">
          <CoverIdentity type={type} />
          <div className="flex-grow" />
          <StartButton onNext={onNext} />
        </div>
      );
    case "text":
      return (
        <div className={`flex flex-col gap-6 short:gap-3.5 ${PAD}`}>
          {card.label && <Label text={card.label} face={card.face} />}
          {card.card.lead && <Body text={card.card.lead} face={card.face} tone={card.card.tone} />}
          <Big text={card.card.big} face={card.face} tone={card.card.tone} />
          {card.card.mid && <Mid text={card.card.mid} face={card.face} tone={card.card.tone} />}
          {card.card.sub && <Body text={card.card.sub} face={card.face} tone={card.card.tone} />}
        </div>
      );
    case "index":
      return (
        <div className={`flex flex-col gap-5 short:gap-3 ${PAD}`}>
          <Label text={card.label} face="dark" />
          <Big text={card.title} face="dark" size="text-[27px] short:text-[24px]" />
          <IndexBars scores={scores} />
          <p className="m-0 text-[14px] font-bold leading-[1.8] text-txt-muted">{card.coreLine}</p>
        </div>
      );
    case "sakai":
      return (
        <div className={`flex flex-col gap-5 short:gap-3 ${PAD}`}>
          <Big text={fixedCards.sakai.big} face="dark" size="text-[27px] short:text-[24px]" />
          <Mid text={fixedCards.sakai.mid} face="dark" />
          <Toc />
          <p className="m-0 whitespace-pre-line text-[14px] font-medium leading-[1.85] text-txt-muted">
            {fixedCards.sakai.closing}
          </p>
        </div>
      );
    case "diagram":
      return (
        <div className={`flex flex-col gap-4 short:gap-3 ${PAD}`}>
          <Label text={card.label} face="dark" />
          <Diagram diagram={card.diagram} horizontal={false} />
          <p className="m-0 text-[17px] font-black leading-[1.65] text-white short:text-[16px]">
            {fixedCards.diagram.closing}
          </p>
        </div>
      );
    case "chips":
      return (
        <div className={`flex flex-col gap-[18px] short:gap-3 ${PAD}`}>
          <Label text={card.label} face="light" />
          <p className="m-0 whitespace-pre-line text-[16px] font-bold leading-[1.7] text-lighttext short:text-[15px]">
            {card.intro}
          </p>
          <Chips chips={card.chips} />
          <Big text={card.big} face="light" size="mt-2 text-[25px] short:mt-0 short:text-[22px]" />
          <Body text={card.sub} face="light" />
        </div>
      );
    case "label":
      return (
        <div className="flex min-h-full flex-col gap-4 px-[22px] pb-3 pt-12 short:gap-3">
          <div className="px-1">
            <Label text={card.label} face="light" />
          </div>
          <LabelPlate card={card} />
          <p className="m-0 px-1 text-[14px] font-bold leading-[1.8] text-lighttext">
            {fixedCards.label.handoff}
          </p>
          <SaveButton href={labelHref} />
          <div className="flex-grow" />
          {/* この枚はタップ領域を置かない。前へ／次へを明示する */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onPrev}
              className="h-11 px-3 text-[14px] font-bold text-lighttext-muted"
            >
              ← 前へ
            </button>
            <button
              type="button"
              onClick={onNext}
              className="h-11 px-3 text-[14px] font-black text-lighttext"
            >
              次へ →
            </button>
          </div>
        </div>
      );
    case "close":
      return (
        <div className="flex min-h-full flex-col gap-5 px-[26px] pb-[30px] pt-12 short:gap-3">
          <Big text={card.card.big} face="light" size="text-[29px] short:text-[25px]" />
          {card.card.sub && <Body text={card.card.sub} face="light" />}
          <div className="flex-grow" />
          <CloseButtons belowId={belowId} onRestart={onRestart} />
        </div>
      );
  }
};

/* ---------- 1枚の中身: PC（左に見出し、右に図や本文） ---------- */

const Two = ({
  left,
  right,
  cols = "grid-cols-2",
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  cols?: string;
}) => (
  <div className={`grid w-full items-center gap-16 xl:gap-[72px] ${cols}`}>
    <div className="flex flex-col gap-[22px]">{left}</div>
    <div className="flex flex-col gap-[22px]">{right}</div>
  </div>
);

const DesktopBody = ({ card, type, scores, onNext, onRestart, labelHref, belowId }: BodyProps) => {
  switch (card.kind) {
    case "cover":
      return (
        <Two
          left={<CoverIdentity type={type} />}
          right={
            <div className="max-w-[380px]">
              <StartButton onNext={onNext} />
            </div>
          }
        />
      );
    case "text": {
      const c = card.card;
      // 視覚要素の無い枚は、右に lead / sub を置く
      const side = c.lead || c.sub;
      return (
        <Two
          left={
            <>
              {card.label && <Label text={card.label} face={card.face} />}
              <Big text={c.big} face={card.face} tone={c.tone} />
              {c.mid && <Mid text={c.mid} face={card.face} tone={c.tone} />}
            </>
          }
          right={
            side ? (
              <>
                {c.lead && <Body text={c.lead} face={card.face} tone={c.tone} />}
                {c.sub && <Body text={c.sub} face={card.face} tone={c.tone} />}
              </>
            ) : undefined
          }
        />
      );
    }
    case "index":
      return (
        <Two
          left={
            <>
              <Label text={card.label} face="dark" />
              <Big text={card.title} face="dark" />
              <p className="m-0 text-[16px] font-bold leading-[1.8] text-txt-muted">
                {card.coreLine}
              </p>
            </>
          }
          right={<IndexBars scores={scores} />}
        />
      );
    case "sakai":
      return (
        <Two
          left={
            <>
              <Big text={fixedCards.sakai.big} face="dark" />
              <Mid text={fixedCards.sakai.mid} face="dark" />
            </>
          }
          right={
            <>
              <Toc />
              <p className="m-0 whitespace-pre-line text-[15px] font-medium leading-[1.85] text-txt-muted">
                {fixedCards.sakai.closing}
              </p>
            </>
          }
        />
      );
    case "diagram":
      return (
        <Two
          left={
            <>
              <Label text={card.label} face="dark" />
              {/* 図の結論を左の大見出しにする。強調は付けない（この枚のピンクは「出力」だけ） */}
              <Big text={fixedCards.diagram.closing} face="dark" size="text-[32px] leading-[1.5]" />
            </>
          }
          right={<Diagram diagram={card.diagram} horizontal />}
          // 図は横並びの箱2つ。半分の幅だと9文字（誰からも何も来ない）が箱の中で折り返す
          cols="grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
        />
      );
    case "chips":
      return (
        <Two
          left={
            <>
              <Label text={card.label} face="light" />
              <p className="m-0 whitespace-pre-line text-[17px] font-bold leading-[1.7] text-lighttext">
                {card.intro}
              </p>
              <Big text={card.big} face="light" size="text-[34px] leading-[1.5]" />
              <Body text={card.sub} face="light" />
            </>
          }
          right={<Chips chips={card.chips} />}
        />
      );
    case "label":
      return (
        <Two
          left={
            <>
              <Label text={card.label} face="light" />
              <Big text={fixedCards.label.handoff} face="light" size="text-[32px] leading-[1.5]" />
              <div className="max-w-[320px]">
                <SaveButton href={labelHref} />
              </div>
            </>
          }
          right={<LabelPlate card={card} />}
        />
      );
    case "close":
      return (
        <Two
          left={
            <>
              <Big text={card.card.big} face="light" />
              {card.card.sub && <Body text={card.card.sub} face="light" />}
            </>
          }
          right={
            <div className="max-w-[380px]">
              <CloseButtons belowId={belowId} onRestart={onRestart} />
            </div>
          }
        />
      );
  }
};

/* ---------- ビューア本体 ---------- */

export const StoryViewer = ({
  story,
  type,
  scores,
  labelHref,
  belowId,
  initialIndex = 0,
}: Props) => {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), story.length - 1));
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const rootRef = useRef<HTMLDivElement>(null);

  const last = story.length - 1;
  const next = useCallback(() => setIndex((i) => Math.min(last, i + 1)), [last]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const restart = useCallback(() => {
    setIndex(0);
    rootRef.current?.focus();
  }, []);

  const card = story[index];
  const f = FACE[card.face];
  const fade = reducedMotion ? "" : "animate-[fade-in_140ms_ease-out]";
  const bodyProps: BodyProps = {
    card,
    type,
    scores,
    onNext: next,
    onPrev: prev,
    onRestart: restart,
    labelHref,
    belowId,
  };

  // ← → はこの要素に張る。window に張るとページの他の操作を奪う
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    }
  };
  const ariaLabel = `あなたの取扱説明書　${index + 1} / ${story.length}`;

  const progress = (className: string) => (
    <div className={`pointer-events-none flex gap-1 ${className}`} aria-hidden="true">
      {story.map((_, i) => (
        <div
          key={i}
          className={`h-[3px] flex-grow rounded-[2px] ${i <= index ? f.progressOn : f.progressOff}`}
        />
      ))}
    </div>
  );

  /* ----- PC: 2段組み。タップ領域は使わず、前へ／次へのボタンだけ ----- */
  if (isDesktop) {
    return (
      <div
        ref={rootRef}
        tabIndex={0}
        role="region"
        aria-roledescription="ストーリー"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        data-story-layout="desktop"
        style={{ "--story-h": "min(calc(100dvh - 66px), 820px)" } as React.CSSProperties}
        className={`relative h-[var(--story-h)] min-h-[560px] w-full outline-none ${f.bg}`}
      >
        <div className="mx-auto flex h-full max-w-[1040px] flex-col gap-6 px-8 pb-8 pt-8">
          {progress("lg:gap-1.5")}
          <div
            key={index}
            className={`flex min-h-0 flex-grow items-center overflow-y-auto ${fade}`}
          >
            <DesktopBody {...bodyProps} />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-[13px] font-bold ${f.footer}`}>
              {index + 1} / {story.length}
            </span>
            <div className="flex gap-3">
              {index > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className={`h-12 rounded-[12px] border px-[22px] text-[15px] font-bold ${
                    card.face === "dark"
                      ? "border-line text-txt-muted"
                      : "border-lightline text-lighttext-muted"
                  }`}
                >
                  ← 前へ
                </button>
              )}
              {index < last && (
                <button
                  type="button"
                  onClick={next}
                  className={`h-12 rounded-[12px] px-[26px] text-[15px] font-black ${
                    card.face === "dark" ? "bg-white text-ink" : "bg-lighttext text-white"
                  }`}
                >
                  次へ →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ----- スマホ ----- */
  // 表紙・周りの人へ・締めにはタップ領域を置かない（明示のボタンだけ）
  const tappable = card.kind !== "cover" && card.kind !== "label" && card.kind !== "close";
  const showFooter = card.kind !== "cover" && card.kind !== "close";

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-roledescription="ストーリー"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      data-story-layout="mobile"
      /*
        高さは「画面の高さ − 固定ヘッダー（66px）」。100dvh のままだとビューアが
        ヘッダーの下から始まり、下の66pxが画面外に押し出される。上限は 844 − 66 = 778px。
      */
      style={{ "--story-h": "min(calc(100dvh - 66px), 778px)" } as React.CSSProperties}
      className={`relative mx-auto h-[var(--story-h)] w-full max-w-[480px] overflow-hidden outline-none ${f.bg}`}
    >
      {/*
        本文のスクロール領域は**番号の帯（48px）の上で終わる**（はみ出した本文が番号に重ならない）。
        タップ用のボタンはスクロール領域の**内側**の sticky な高さ0の層に置く。外側に重ねると、
        ボタンの上でのスクロールが本文ではなくページへ行き、はみ出したカードの続きが読めなくなる。
      */}
      <div
        key={index}
        className={`absolute inset-x-0 top-0 overflow-y-auto ${showFooter ? "bottom-12" : "bottom-0"} ${fade}`}
      >
        {tappable && (
          <div className="sticky top-0 z-[5] h-0">
            <button
              type="button"
              aria-label="前のページ"
              onClick={prev}
              className="absolute left-0 top-9 h-[calc(var(--story-h)-84px)] w-[34%] bg-transparent"
            />
            <button
              type="button"
              aria-label="次のページ"
              onClick={next}
              className="absolute right-0 top-9 h-[calc(var(--story-h)-84px)] w-[66%] bg-transparent"
            />
          </div>
        )}
        <MobileBody {...bodyProps} />
      </div>

      {progress("absolute left-4 right-4 top-3.5 z-[8]")}

      {/* 下端: 3 / 14 と、最初の数枚だけ「タップで次へ」 */}
      {showFooter && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex h-12 items-end justify-between px-[26px] pb-[26px] text-[12px] font-bold leading-none ${f.bg} ${f.footer}`}
        >
          <span>
            {index + 1} / {story.length}
          </span>
          {index >= 1 && index <= 3 && <span>タップで次へ</span>}
        </div>
      )}
    </div>
  );
};
