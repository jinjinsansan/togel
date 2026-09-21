import { typeCards } from "../copy/cards-types";
import { fixedCards, reactionCards } from "../copy/cards-reactions";
import { typeToken } from "../definitions";
import { personalityTypes } from "../index";
import { determineReaction, type HeatKey, type IntensityKey, type ReactionKey } from "../reaction";
import { TOGEL_INDEX, togelIndexPercent } from "../togel-index";
import type { BigFiveScores } from "@/types/diagnosis";

/**
 * 結果ページのストーリーズ（全14枚）を1人ぶん組み立てる。
 *
 * 【v2（2026-09-21 オーナー承認）】後半を「取扱説明書の取扱注意の欄」として作り直した。
 * オーナー判断「後半が無理やり別の話に入っている感じ」（要旨）
 * 「ピンク色ばかりで見にくい」。「違います。」（全面ピンク）を廃止して 15→14枚。
 *
 * 【分岐の約束】
 * - 2〜4枚目（外から見えるあなた）だけが **typeId**。人に見せる部分なので型で固定
 * - 7〜13枚目は **主反応・強度・放熱** だけ。typeId を使わない
 *   （`{type}` の置換は型の名前を入れるだけで、分岐ではない）
 *
 * 【面】1〜8 暗（毒）／9〜14 明（救い）
 */

export type Card = {
  lead?: string;
  big: string;
  mid?: string;
  sub?: string;
  tone?: "hazard" | "relief";
};
type Diagram = (typeof reactionCards)[ReactionKey]["s2"];

export type Face = "dark" | "light";

/** 目次（6枚目）と各章のラベルで同じものを使う: [番号, 名前, 説明] */
export const CHAPTERS = fixedCards.sakai.toc;

/** 章のラベル（例: 「取扱注意 ①　起爆条件」） */
export const chapterLabel = (index: 0 | 1 | 2 | 3 | 4) =>
  `取扱注意 ${CHAPTERS[index][0]}　${CHAPTERS[index][1]}`;

export type StoryCard =
  | { kind: "cover"; face: "dark" }
  | { kind: "text"; face: Face; label?: string; card: Card }
  | { kind: "index"; face: "dark"; label: string; title: string; coreLine: string }
  | { kind: "sakai"; face: "dark" }
  | { kind: "diagram"; face: "dark"; label: string; diagram: Diagram }
  | {
      kind: "chips";
      face: "light";
      label: string;
      intro: string;
      chips: readonly string[];
      big: string;
      sub: string;
    }
  | {
      kind: "label";
      face: "light";
      label: string;
      title: string;
      ng: string;
      ok: string;
      note: string;
    }
  | { kind: "close"; face: "light"; card: Card };

export const STORY_LENGTH = 14;

/**
 * 5枚目の一文に出す「一番高い軸」。**同点は軸の固定順で先のもの**
 * （引火点→構造強度→放熱量→緩衝性能→耐圧限界 ＝ TOGEL_INDEX の並び）。
 * 「より大きければ置き換える」だけにしてあるので、同点では先に見たほうが残る。
 */
export const coreAxis = (scores: BigFiveScores) => {
  let best = TOGEL_INDEX[0];
  let bestValue = togelIndexPercent(best.key, scores);
  for (const axis of TOGEL_INDEX) {
    const value = togelIndexPercent(axis.key, scores);
    if (value > bestValue) {
      best = axis;
      bestValue = value;
    }
  }
  return best;
};

/** `{type}` を型の名前（例: フォルダ型）にする。愛称を単独で出さないため typeToken を通す */
const withType = (text: string, name: string) => text.split("{type}").join(name);

export type StoryInput = {
  typeId: string;
  reaction: ReactionKey;
  intensity: IntensityKey;
  heat: HeatKey;
  scores: BigFiveScores;
};

/** 分岐のキーから14枚を組む。1枚でも欠けたら null（呼び出し側はビューアを出さない） */
export const buildStoryFromKeys = ({
  typeId,
  reaction,
  intensity,
  heat,
  scores,
}: StoryInput): StoryCard[] | null => {
  const type = personalityTypes.find((t) => t.id === typeId);
  const outside = typeCards[typeId];
  const r = reactionCards[reaction];
  if (!type || !outside || !r) return null;

  const name = typeToken(type);
  const branch = heat === "high" ? r.s4.heatHigh : r.s4.heatLow;
  const axis = coreAxis(scores);

  const cards: StoryCard[] = [
    { kind: "cover", face: "dark" },
    { kind: "text", face: "dark", label: "外から見えるあなた　1 / 3", card: outside[0] },
    { kind: "text", face: "dark", label: "外から見えるあなた　2 / 3", card: outside[1] },
    { kind: "text", face: "dark", label: "外から見えるあなた　3 / 3", card: outside[2] },
    {
      kind: "index",
      face: "dark",
      label: "仕様　TOGEL INDEX",
      title: `${name}の仕様`,
      coreLine: `一番高いのは${axis.label}。この型の芯です。`,
    },
    { kind: "sakai", face: "dark" },
    { kind: "text", face: "dark", label: chapterLabel(0), card: r.s1[intensity] },
    { kind: "diagram", face: "dark", label: chapterLabel(1), diagram: r.s2 },
    { kind: "text", face: "light", label: chapterLabel(2), card: r.s3a },
    {
      kind: "text",
      face: "light",
      label: chapterLabel(2),
      card: { lead: r.s3b.lead, big: fixedCards.s3bBig },
    },
    {
      kind: "chips",
      face: "light",
      label: chapterLabel(3),
      intro: fixedCards.chips.intro,
      chips: branch.chips.chips,
      big: fixedCards.chips.big,
      sub: branch.chips.sub,
    },
    {
      kind: "text",
      face: "light",
      label: chapterLabel(3),
      card: { lead: branch.payoffLead, big: fixedCards.payoff.big, mid: fixedCards.payoff.mid },
    },
    {
      kind: "label",
      face: "light",
      label: chapterLabel(4),
      title: withType(fixedCards.label.title, name),
      ng: r.s5.ng,
      ok: r.s5.ok,
      note: r.s5.note,
    },
    {
      kind: "close",
      face: "light",
      card: { big: withType(fixedCards.close.big, name), sub: fixedCards.close.sub },
    },
  ];
  return cards.length === STORY_LENGTH ? cards : null;
};

/** スコアから14枚を組む（画面が使う入口） */
export const buildStory = (typeId: string, scores: BigFiveScores): StoryCard[] | null => {
  const { reaction, intensity, heat } = determineReaction(scores);
  return buildStoryFromKeys({ typeId, reaction, intensity, heat, scores });
};
