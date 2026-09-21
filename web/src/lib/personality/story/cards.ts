import { typeCards } from "../copy/cards-types";
import { reactionCards } from "../copy/cards-reactions";
import { deepNarrativeBridge } from "../copy/reaction-bridge";
import { determineReaction, type HeatKey, type IntensityKey, type ReactionKey } from "../reaction";
import type { BigFiveScores } from "@/types/diagnosis";

/**
 * 結果ページのストーリーズ（全15枚）を1人ぶん組み立てる。
 *
 * 【分岐の約束】
 * - 2〜4枚目（タイプ本文）だけが **typeId** で決まる。人に見せる部分なので型で固定
 * - 7〜15枚目は **主反応・強度・放熱** だけで決まる。typeId を使わない
 *   （同じ型でも反応は人による。typeId で選ぶと同じ型の全員が同じ文を読む）
 *
 * 【面】1〜9 暗（毒）／10〜12・14〜15 明（救い）／13 ピンク「違います。」
 * 刺したあと（S1〜S2）に明るい面へ切り替えて回収する、を画面の明暗で見せる。
 */

type ReactionCardsOf = (typeof reactionCards)[ReactionKey];
export type Card = ReactionCardsOf["s2"];
export type DiagramCard = ReactionCardsOf["s2Diagram"];
export type ChipsCard = ReactionCardsOf["s4"]["heatHigh"]["chips"];

export type Face = "dark" | "light" | "pink";

export type StoryCard =
  | { kind: "cover"; face: "dark" }
  | { kind: "text"; face: Face; label?: string; card: Card }
  | { kind: "index"; face: "dark"; label: string }
  | { kind: "toc"; face: "dark"; big: string; sub: string; closing: string }
  | { kind: "diagram"; face: "dark"; label: string; diagram: DiagramCard }
  | { kind: "chips"; face: "light"; label: string; chips: ChipsCard }
  | { kind: "chigau"; face: "pink" }
  | { kind: "close"; face: "light"; card: Card };

export const STORY_LENGTH = 15;

/** 章の見出し（01〜04）。目次（6枚目）と各章のラベルで同じものを使う */
export const CHAPTERS = [
  { no: "01", title: "あなたに一番効く刺激", tone: "hazard" },
  { no: "02", title: "そのとき、あなたが勝手につけている意味", tone: "hazard" },
  { no: "03", title: "それ、あなたが決めたことじゃありません", tone: "relief" },
  { no: "04", title: "あなたが自分を守るためにやっていること", tone: "relief" },
] as const;

const chapterLabel = (index: 0 | 1 | 2 | 3) => `${CHAPTERS[index].no}　${CHAPTERS[index].title}`;

/**
 * 約束の一文（reaction-bridge.ts）を目次の1枚に割る。
 * 1段落目の1行目を大見出し、2行目を地の文、2段落目を救いの色の締めにする。
 * **文言は変えない。** 割り方だけ。
 */
const splitBridge = () => {
  const [first, second] = deepNarrativeBridge.split(/\n\s*\n/);
  const [big, ...rest] = first.split("\n");
  return { big, sub: rest.join("\n"), closing: second ?? "" };
};

export type StoryInput = {
  typeId: string;
  reaction: ReactionKey;
  intensity: IntensityKey;
  heat: HeatKey;
};

/** 分岐のキーから15枚を組む。1枚でも欠けたら null（呼び出し側はビューアを出さない） */
export const buildStoryFromKeys = ({ typeId, reaction, intensity, heat }: StoryInput): StoryCard[] | null => {
  const type = typeCards[typeId];
  const r = reactionCards[reaction];
  if (!type || !r) return null;

  const branch = heat === "high" ? r.s4.heatHigh : r.s4.heatLow;
  const bridge = splitBridge();

  const cards: StoryCard[] = [
    { kind: "cover", face: "dark" },
    { kind: "text", face: "dark", label: "あなたはこういう型です　1 / 3", card: type[0] },
    { kind: "text", face: "dark", label: "あなたはこういう型です　2 / 3", card: type[1] },
    { kind: "text", face: "dark", label: "あなたはこういう型です　3 / 3", card: type[2] },
    { kind: "index", face: "dark", label: "あなたのスペック" },
    { kind: "toc", face: "dark", ...bridge },
    { kind: "text", face: "dark", label: chapterLabel(0), card: r.s1[intensity] },
    { kind: "diagram", face: "dark", label: chapterLabel(1), diagram: r.s2Diagram },
    { kind: "text", face: "dark", label: chapterLabel(1), card: r.s2 },
    { kind: "text", face: "light", label: chapterLabel(2), card: r.s3a },
    { kind: "text", face: "light", label: chapterLabel(2), card: r.s3b },
    { kind: "chips", face: "light", label: chapterLabel(3), chips: branch.chips },
    { kind: "chigau", face: "pink" },
    { kind: "text", face: "light", label: chapterLabel(3), card: branch.payoff },
    { kind: "close", face: "light", card: branch.close },
  ];
  return cards.length === STORY_LENGTH ? cards : null;
};

/** スコアから15枚を組む（画面が使う入口） */
export const buildStory = (typeId: string, scores: BigFiveScores): StoryCard[] | null => {
  const { reaction, intensity, heat } = determineReaction(scores);
  return buildStoryFromKeys({ typeId, reaction, intensity, heat });
};
