/**
 * 【検査用】強度で分岐していない枠（S2〜S4）に、頻度を断定する語が無いかを探す。
 *
 * 強度（耐圧限界の3段階）で分岐しているのは S1 だけ。S1 で「まれに刺さる」と
 * 書いた相手に、S2 で「何千回も」と続けると、同じ人に矛盾したことを言う
 * （フォルダ型で実際に起きた）。S2〜S4 は全強度の人が読むので、頻度を断定できない。
 *
 * **出たら報告するだけ。直さない。** 「いつも同じ形」のように頻度でない使い方が
 * あるので、正誤は文脈を見て監修側が決める。
 */
import { DEEP_COPY } from "../src/lib/personality/narrative";
import { REACTION_KEYS } from "../src/lib/personality/reaction";

const WORDS = ["何千回", "毎回", "いつも", "ずっと", "何度も"];

let total = 0;
for (const reaction of REACTION_KEYS) {
  const copy = DEEP_COPY[reaction];
  if (!copy) continue;
  const slots: [string, string][] = [
    ["s2", copy.s2],
    ["s3", copy.s3],
    ["s4.heatHigh", copy.s4.heatHigh],
    ["s4.heatLow", copy.s4.heatLow],
  ];
  for (const [slot, text] of slots) {
    for (const line of text.split("\n")) {
      for (const word of WORDS) {
        if (line.includes(word)) {
          total += 1;
          console.log(`  ${reaction}.${slot}  「${word}」  … ${line.trim().slice(0, 48)}`);
        }
      }
    }
  }
}
console.log(total === 0 ? "\n検出なし" : `\n計 ${total} 件（正誤は文脈で判断）`);
