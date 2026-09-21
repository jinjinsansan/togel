import { personalityTypes } from "../index";
import { typeDeepIgnition } from "./type-deep-01-ignition";
import { typeDeepSettling } from "./type-deep-02-settling";
import { typeDeepChain } from "./type-deep-03-chain";
import { typeDeepInert } from "./type-deep-04-inert";

/**
 * タイプそのものの説明（24タイプ・**タイプ固定**）。
 *
 * 【深掘り（S1〜S4）との役割の違い】
 * - 深掘り … **スコア駆動**。主反応5 × 強度3 × 放熱2 の30通りから選ぶ。
 *   答えた内容で変わる。「あなたはこう反応する人です」
 * - ここ … **タイプ固定**。同じ型なら全員同じ文を読む。**スコアでは分岐しない。**
 *   「あなたはこういう型です」
 *
 * 分岐させないのは、ここが**人に見せる部分**だから。型の名前と一緒に
 * スクリーンショットで貼られる。同じ型の人が違う文を貼ると、型が指すものがぼやける。
 * 深掘りは本人が読むもの、ここは他人に見せるもの。
 *
 * 【なぜ要るか】
 * タイプの説明は `definitions.ts` の `description` だけで、
 * **24タイプ合わせて24文・1タイプ53字**しかなかった。深掘りを1,069字にしても、
 * 「あなたの型がどういう型か」は53字のまま。診断結果として人に見せるものが無い。
 *
 * 【本文の形】
 * 1タイプ＝**1つの文字列**。空行で3段落に分かれている。
 *   1段落目 外から見たあなた（毒舌でよい）
 *   2段落目 その内側で実際に起きていること（ここで一度ひっくり返す）
 *   3段落目 本当のことを1つ返す
 * **3段落目を落とすと「ボロクソに言ったあとは必ず救う」が崩れる。**
 * 段落ごとの見出しは付けない。区切って読ませるものではなく、続けて読ませるもの。
 *
 * 本文は監修側が納品する。ここで書き起こさない。
 * **24タイプ全部そろうまで画面に出ない**（1つでも欠けたら出さない）。
 */

/** 1タイプぶんの本文。空行で区切られた3段落 */
export type TypeProfileCopy = string;

/** 節の見出し。本文側に混ぜると字数の実測がぶれる */
export const TYPE_PROFILE_HEADING = "あなたはこういう型です";

/**
 * タイプごとの本文。群ごとの4ファイルをそのまま束ねる。
 *
 * キーはタイプIDだが、**型では縛れない**。`personalityTypes` は
 * `ExtendedPersonalityTypeDefinition[]` として宣言されていて `as const` ではないので、
 * `id` はリテラルの union ではなく `string` になる。定義から型を導いても `string`
 * にしかならず、綴り間違いを弾けない。**代わりに検査で縛る**
 * （tests/type-profile.test.ts が、定義に無いIDと欠けているIDの両方で落とす）。
 */
export const TYPE_PROFILES: Record<string, TypeProfileCopy> = {
  ...typeDeepIgnition,
  ...typeDeepSettling,
  ...typeDeepChain,
  ...typeDeepInert,
};

/** 24タイプ全部そろっているか */
export const isTypeProfileComplete = (): boolean =>
  personalityTypes.every((type) => Boolean(TYPE_PROFILES[type.id]));

/** そろっていなければ null（節ごと出さない） */
export const typeProfileFor = (typeId: string): TypeProfileCopy | null => {
  if (!isTypeProfileComplete()) return null;
  return TYPE_PROFILES[typeId] ?? null;
};

/** 検査用。納品済みのぶんだけ返す */
export const deliveredTypeProfiles = (): { typeId: string; copy: TypeProfileCopy }[] =>
  personalityTypes
    .map((type) => ({ typeId: type.id, copy: TYPE_PROFILES[type.id] }))
    .filter((entry): entry is { typeId: string; copy: TypeProfileCopy } => Boolean(entry.copy));

/** 段落に割る。表示と検査で同じ割り方を使う */
export const typeProfileParagraphs = (copy: TypeProfileCopy): string[] =>
  copy
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
