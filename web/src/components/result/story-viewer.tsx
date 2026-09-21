"use client";

import { Fragment, useCallback, useRef, useState } from "react";

import { GroupBadge } from "@/components/brand/group-badge";
import { useReducedMotion } from "@/components/diagnosis/board/use-reduced-motion";
import { trackLineCta } from "@/lib/analytics/events";
import { isBroadcastEnabled } from "@/lib/line/broadcast-enabled";
import { typeToken } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import { CHAPTERS, STORY_LENGTH, type Card, type Face, type StoryCard } from "@/lib/personality/story/cards";
import { parseEmphasis } from "@/lib/personality/story/emphasis";
import { TOGEL_INDEX, togelIndexPercent } from "@/lib/personality/togel-index";
import type { BigFiveScores } from "@/types/diagnosis";

/**
 * 結果ページのストーリーズ（全15枚）。
 *
 * 【オーナー判断】「長文はいいが、こんな見せ方では誰も読まない。10代20代向けに
 * 見せ方をちゃんとして」。中身（長さ）は承認済みで、変えるのは見せ方だけ。
 *
 * 【操作】
 * - 右66%をタップで次へ、左34%で前へ。どちらも本物の <button>
 * - ← → キーはビューアの要素に張る（window には張らない。ページの他の操作を奪わない）
 * - 表紙（1枚目）と締め（15枚目）にはタップ領域を置かない。明示のボタンだけ
 * - スワイプの物理演算は入れない。切り替えは 150ms 以下のフェードだけで、
 *   prefers-reduced-motion のときは付けない
 *
 * 【色】既存トークンだけ。案（Claude Design）に既存に無い色が6つあったので、
 * 最も近いトークンに寄せた（border #2a3142 → line など）。
 */

/** LINE の友だち追加。/result に既にある導線と同じリンク先（新しく作らない） */
const LINE_URL = "https://lin.ee/T7OYAGQ";

type Props = {
  story: StoryCard[];
  type: ExtendedPersonalityTypeDefinition;
  scores: BigFiveScores;
  /** 既存の「取扱注意ラベルを保存（縦・ストーリーズ用）」のリンク（新しい画像生成は作らない） */
  labelHref: string;
  /** 「結果の続きを見る」でスクロールする先 */
  belowId: string;
  /** 最初に開く1枚（0始まり）。開発用プレビューで途中の1枚を撮るためだけに使う */
  initialIndex?: number;
};

/* ---------- 面ごとの色 ---------- */

const FACE = {
  dark: {
    bg: "bg-base",
    big: "text-white",
    body: "text-txt-muted",
    label: "text-txt-subtle",
    hazard: "text-primary",
    relief: "text-relief",
    progressOn: "bg-primary",
    progressOff: "bg-line",
    footer: "text-txt-subtle",
  },
  light: {
    bg: "bg-paper",
    big: "text-lighttext",
    body: "text-lighttext-muted",
    label: "text-relief-ink",
    hazard: "text-primary-ink",
    relief: "text-relief-ink",
    progressOn: "bg-relief-ink",
    progressOff: "bg-lightline",
    footer: "text-lighttext-subtle",
  },
  pink: {
    bg: "bg-primary",
    big: "text-ink",
    body: "text-ink",
    label: "text-ink",
    hazard: "text-ink",
    relief: "text-ink",
    progressOn: "bg-ink",
    progressOff: "bg-ink/25",
    footer: "text-ink",
  },
} as const;

/** 〔〕 を強調色の span にする。解析は emphasis.ts の1か所だけ */
const Emph = ({ text, face, tone }: { text: string; face: Face; tone: "hazard" | "relief" }) => (
  <>
    {parseEmphasis(text).map((segment, i) =>
      segment.emphasis ? (
        <span key={i} className={FACE[face][tone]}>
          {segment.text}
        </span>
      ) : (
        <Fragment key={i}>{segment.text}</Fragment>
      ),
    )}
  </>
);

/** 強調色の既定: 暗面は hazard、明面は relief */
const toneOf = (card: Card, face: Face) => card.tone ?? (face === "light" ? "relief" : "hazard");

const Label = ({ text, face, tone }: { text: string; face: Face; tone?: "hazard" | "relief" }) => (
  <div
    className={`text-[12px] font-bold tracking-[0.22em] ${
      tone ? FACE[face][tone] : face === "dark" ? "text-txt-subtle" : FACE[face].label
    }`}
  >
    {text}
  </div>
);

/** 章の番号から見出しの色を決める（01・02 は hazard、03・04 は relief） */
const chapterTone = (label?: string): "hazard" | "relief" | undefined => {
  const chapter = CHAPTERS.find((c) => label?.startsWith(c.no));
  return chapter?.tone;
};

/* ---------- 本文のカード（lead → big → mid → sub） ---------- */

const TextBody = ({ card, face }: { card: Card; face: Face }) => {
  const tone = toneOf(card, face);
  const f = FACE[face];
  return (
    <>
      {card.lead && (
        <p className={`m-0 whitespace-pre-line text-[15px] font-medium leading-[1.95] ${f.body}`}>
          <Emph text={card.lead} face={face} tone={tone} />
        </p>
      )}
      <h2 className={`m-0 whitespace-pre-line font-heading text-[29px] font-black leading-[1.5] ${f.big}`}>
        <Emph text={card.big} face={face} tone={tone} />
      </h2>
      {card.mid && (
        <p className={`m-0 whitespace-pre-line text-[17px] font-bold leading-[1.8] ${f.big}`}>
          <Emph text={card.mid} face={face} tone={tone} />
        </p>
      )}
      {card.sub && (
        <p className={`m-0 whitespace-pre-line text-[15px] font-medium leading-[1.95] ${f.body}`}>
          <Emph text={card.sub} face={face} tone={tone} />
        </p>
      )}
    </>
  );
};

/* ---------- 各カード ---------- */

const CardBody = ({
  card,
  type,
  scores,
  onNext,
  onRestart,
  labelHref,
  belowId,
}: {
  card: StoryCard;
  type: ExtendedPersonalityTypeDefinition;
  scores: BigFiveScores;
  onNext: () => void;
  onRestart: () => void;
  labelHref: string;
  belowId: string;
}) => {
  switch (card.kind) {
    case "cover":
      return (
        <div className="flex h-full flex-col px-[26px] pb-9 pt-16">
          <div className="text-[12px] font-bold tracking-[0.22em] text-txt-subtle">
            診断結果　あなたの取扱説明書
          </div>
          <div className="mt-16 flex flex-col gap-3.5">
            {/*
              案は1行の枠付きの形。群名は GroupBadge の入口からしか出さない決まり
              （名前だけを裸で出さない）なので、1行版（compact）を枠で包んで近づけた。
            */}
            <div className="self-start rounded-full border border-line px-3.5 py-[7px]">
              <GroupBadge group={type.group} variant="compact" />
            </div>
            <div className="mt-[18px] text-[18px] font-bold text-txt-muted">あなたは</div>
            <div className="font-heading text-[64px] font-black leading-[1.05] tracking-[-0.03em] text-white">
              {typeToken(type)}
            </div>
            <div className="text-[16px] font-black text-primary">{type.typeName}</div>
            <div className="mt-1.5 text-[21px] font-bold leading-[1.55] text-white">{type.catchphrase}</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {type.tags.map((tag) => (
                <span key={tag} className="rounded-[8px] bg-surface px-2.5 py-1.5 text-[13px] font-bold text-txt-muted">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-grow" />
          <div className="flex flex-col gap-3">
            <div className="text-center text-[13px] font-medium text-txt-muted">
              全{STORY_LENGTH}枚　約3分で読めます
            </div>
            <button
              type="button"
              onClick={onNext}
              className="h-[58px] rounded-[16px] bg-primary text-[17px] font-black text-ink"
            >
              読みはじめる
            </button>
          </div>
        </div>
      );

    case "text":
      return (
        <div className="flex flex-col gap-[26px] px-[26px] pb-10 pt-[76px]">
          {card.label && <Label text={card.label} face={card.face} tone={chapterTone(card.label)} />}
          <TextBody card={card.card} face={card.face} />
        </div>
      );

    case "index":
      return (
        <div className="flex flex-col gap-[22px] px-[26px] pb-10 pt-[76px]">
          <Label text={card.label} face="dark" />
          <h2 className="m-0 font-heading text-[29px] font-black leading-[1.3] text-white">TOGEL INDEX</h2>
          <div className="mt-1.5 flex flex-col gap-5">
            {TOGEL_INDEX.map(({ key, label }) => {
              const pct = togelIndexPercent(key, scores);
              return (
                <div key={key} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-bold text-white">{label}</span>
                    <span className="text-[24px] font-black text-white">{pct}</span>
                  </div>
                  <div className="h-2 rounded-[4px] bg-line-soft">
                    <div className="h-2 rounded-[4px] bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "toc":
      return (
        <div className="flex flex-col gap-[22px] px-[26px] pb-10 pt-[76px]">
          <h2 className="m-0 whitespace-pre-line font-heading text-[29px] font-black leading-[1.5] text-white">
            {card.big}
          </h2>
          <p className="m-0 whitespace-pre-line text-[15px] font-medium leading-[1.95] text-txt-muted">
            {card.sub}
          </p>
          <div className="flex flex-col border-t border-line-soft">
            {CHAPTERS.map((chapter) => (
              <div key={chapter.no} className="flex items-baseline gap-3.5 border-b border-line-soft py-[13px]">
                <span className={`text-[13px] font-black ${chapter.tone === "hazard" ? "text-primary" : "text-relief"}`}>
                  {chapter.no}
                </span>
                <span className={`text-[15px] font-bold ${chapter.tone === "hazard" ? "text-white" : "text-relief"}`}>
                  {chapter.title}
                </span>
              </div>
            ))}
          </div>
          <p className="m-0 whitespace-pre-line text-[16px] font-black leading-[1.85] text-relief">
            {card.closing}
          </p>
        </div>
      );

    case "diagram":
      return (
        <div className="flex flex-col gap-[18px] px-[26px] pb-10 pt-[76px]">
          <Label text={card.label} face="dark" tone="hazard" />
          <div className="flex flex-col gap-1.5 rounded-[14px] border border-line px-[18px] py-4">
            <span className="text-[12px] font-bold text-txt-subtle">起きたこと</span>
            <span className="text-[21px] font-black text-white">{card.diagram.event}</span>
          </div>
          <div className="flex items-center gap-3.5 pl-[26px]">
            <div className="h-[58px] w-0 border-l-2 border-dashed border-primary" />
            <span className="text-[14px] font-black text-primary">ここ、かなり飛んでいます</span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[14px] border-2 border-primary bg-dangerbg px-[18px] py-4">
            <span className="text-[12px] font-bold text-primary-hover">あなたがつけた意味</span>
            <span className="text-[26px] font-black text-primary">{card.diagram.meaning}</span>
          </div>
          <div className="mt-2 flex flex-col gap-2.5">
            <span className="text-[12px] font-bold text-txt-subtle">本当は、こっちの可能性もありました</span>
            <div className="flex flex-wrap gap-2">
              {card.diagram.rejected.map((option) => (
                <span
                  key={option}
                  className="rounded-full border border-line px-3 py-1.5 text-[13px] font-bold text-txt-subtle line-through"
                >
                  {option}
                </span>
              ))}
            </div>
          </div>
          <p className="m-0 whitespace-pre-line text-[19px] font-black leading-[1.6] text-white">
            {card.diagram.closing}
          </p>
        </div>
      );

    case "chips":
      return (
        <div className="flex flex-col gap-[22px] px-[26px] pb-10 pt-[76px]">
          <Label text={card.label} face="light" />
          <p className="m-0 text-[17px] font-bold leading-[1.7] text-lighttext">{card.chips.intro}</p>
          <div className="flex flex-wrap gap-2">
            {card.chips.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-[12px] border border-lightline bg-white px-3.5 py-2.5 text-[15px] font-bold text-lighttext"
              >
                {chip}
              </span>
            ))}
          </div>
          {/* チップの強調は常に hazard（本人が欠点だと思っているものを指すため） */}
          <h2 className="m-0 mt-3 whitespace-pre-line font-heading text-[25px] font-black leading-[1.55] text-lighttext">
            <Emph text={card.chips.big} face="light" tone="hazard" />
          </h2>
          {card.chips.sub && (
            <p className="m-0 whitespace-pre-line text-[15px] font-medium leading-[1.95] text-lighttext-muted">
              <Emph text={card.chips.sub} face="light" tone="hazard" />
            </p>
          )}
        </div>
      );

    case "chigau":
      return (
        <div className="flex h-full items-center justify-center px-[26px]">
          {/*
            1行で出す。76px のままだと5文字で約380pxになり、390px幅の画面（本文幅338px）で
            「違いま／す。」と語の途中で折り返していた。ビューアの幅に合わせて縮め、
            広い画面では案の 76px で止める（ビューアに container-type を付けてある）。
          */}
          <div className="whitespace-nowrap font-heading text-[min(76px,calc(20cqw-11px))] font-black tracking-[-0.02em] text-ink">
            違います。
          </div>
        </div>
      );

    case "close": {
      const broadcastOn = isBroadcastEnabled();
      return (
        <div className="flex h-full flex-col gap-5 px-[26px] pb-[34px] pt-[76px]">
          <TextBody card={card.card} face="light" />
          <div className="flex-grow" />
          <div className="flex flex-col gap-2.5">
            {/*
              約束は、配信が有効なときだけ出す。止まっているあいだは「公式LINEに登録する」
              だけにして、「週1通」「全15通」は出さない（登録しても何も届かないため）。
            */}
            <a
              href={LINE_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackLineCta("result_story")}
              className="flex h-[58px] items-center justify-center rounded-[16px] bg-primary text-[16px] font-black text-ink"
            >
              {broadcastOn ? "LINEで週1通、続きを受け取る" : "公式LINEに登録する"}
            </a>
            {broadcastOn && (
              <div className="text-center text-[12px] font-medium leading-[1.7] text-lighttext-muted">
                あなたの型と噛み合わない3タイプの取扱説明書を、週1通ずつ。全15通。
              </div>
            )}
            <a
              href={labelHref}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 flex h-[52px] items-center justify-center rounded-[16px] border-2 border-lighttext text-[15px] font-black text-lighttext"
            >
              この1枚を画像で保存
            </a>
            <button
              type="button"
              onClick={() => document.getElementById(belowId)?.scrollIntoView({ behavior: "smooth" })}
              className="h-11 text-[14px] font-bold text-lighttext-muted underline"
            >
              結果の続きを見る
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="h-11 text-[14px] font-bold text-lighttext-muted underline"
            >
              最初から読む
            </button>
          </div>
        </div>
      );
    }
  }
};

/* ---------- ビューア本体 ---------- */

export const StoryViewer = ({ story, type, scores, labelHref, belowId, initialIndex = 0 }: Props) => {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), story.length - 1));
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  const last = story.length - 1;
  const next = useCallback(() => setIndex((i) => Math.min(last, i + 1)), [last]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const restart = useCallback(() => {
    setIndex(0);
    rootRef.current?.focus();
  }, []);

  const card = story[index];
  const face = card.face;
  const f = FACE[face];
  // 表紙と締めにはタップ領域を置かない（明示のボタンだけ）
  const tappable = index !== 0 && index !== last;
  // 「タップで次へ」は2〜4枚目と「違います。」だけ（案のとおり。表紙はタップできないので出さない）
  const showHint = (index >= 1 && index <= 3) || card.kind === "chigau";

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-roledescription="ストーリー"
      aria-label={`あなたの取扱説明書　${index + 1} / ${story.length}`}
      // ← → はこの要素に張る。window に張るとページの他の操作を奪う
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          next();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          prev();
        }
      }}
      /*
        高さは「画面の高さ − 固定ヘッダー（66px）」。案は 100dvh だったが、案には
        サイトのヘッダーが無い。100dvh のままだとビューアがヘッダーの下から始まり、
        **下の66pxが画面外に押し出される**（iPhone SE で下端が 734px／画面 667px）。
        上限は 844 − 66 = 778px（iPhone の高さを超えて伸ばさない）。
      */
      style={
        { "--story-h": "min(calc(100dvh - 66px), 778px)", containerType: "inline-size" } as React.CSSProperties
      }
      className={`relative mx-auto h-[var(--story-h)] w-full max-w-[480px] overflow-hidden outline-none ${f.bg}`}
    >
      {/* 本文。長いカードは中だけ縦にスクロールする（はみ出しを切らない） */}
      <div
        key={index}
        className={`absolute inset-0 overflow-y-auto ${
          reducedMotion ? "" : "animate-[fade-in_140ms_ease-out]"
        }`}
      >
        {/*
          タップ用のボタンは**スクロールする領域の内側**に置く。
          外側（兄弟）に重ねると、ボタンの上でのスクロールが本文ではなくページへ行き、
          はみ出したカードの続きが**読めなくなる**（ホイールで確認: 本文 0 / ページ 120）。
          内側の sticky な高さ0の層に置けば、見える範囲を覆いつつ、上でのスクロールは
          いちばん近い祖先＝本文の領域へ行く。
        */}
        {tappable && (
          <div className="sticky top-0 z-[5] h-0">
            <button
              type="button"
              aria-label="前のページ"
              onClick={prev}
              className="absolute left-0 top-9 h-[calc(var(--story-h)-36px)] w-[34%] bg-transparent"
            />
            <button
              type="button"
              aria-label="次のページ"
              onClick={next}
              className="absolute right-0 top-9 h-[calc(var(--story-h)-36px)] w-[66%] bg-transparent"
            />
          </div>
        )}
        <CardBody
          card={card}
          type={type}
          scores={scores}
          onNext={next}
          onRestart={restart}
          labelHref={labelHref}
          belowId={belowId}
        />
      </div>

      {/* 進捗バー（全15本。読んだ分が塗られる） */}
      <div className="pointer-events-none absolute left-4 right-4 top-3.5 z-[8] flex gap-1" aria-hidden="true">
        {story.map((_, i) => (
          <div key={i} className={`h-[3px] flex-grow rounded-[2px] ${i <= index ? f.progressOn : f.progressOff}`} />
        ))}
      </div>

      {/* 下端: 3 / 15 と、最初の数枚だけ「タップで次へ」 */}
      {index !== 0 && index !== last && (
        <div
          className={`pointer-events-none absolute bottom-[26px] left-[26px] right-[26px] z-[4] flex justify-between text-[12px] font-bold ${f.footer}`}
        >
          <span>
            {index + 1} / {story.length}
          </span>
          {showHint && <span>タップで次へ</span>}
        </div>
      )}
    </div>
  );
};
