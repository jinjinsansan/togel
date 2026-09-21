/**
 * 強調記法 `〔 〕` の解析。**解析はこの1か所だけ。**
 *
 * カード本文は `〔ここを強調〕` と書く。〔 〕は改行 `\n` をまたいでよい
 * （例: "〔あなたはそれを、\n頼まれずに\n毎回やっています。〕"）。
 *
 * 対応が取れていない `〔` や `〕`、入れ子は**本文の誤り**として扱う。
 * 画面に `〔` `〕` がそのまま出るのは不具合なので、検査
 * （tests/story.test.ts）が全カードの全文字列でこれを通し、1つでも崩れていれば落とす。
 */

export type Segment = { text: string; emphasis: boolean };

export class EmphasisSyntaxError extends Error {}

/**
 * 文字列を「強調する区間／しない区間」に分ける。
 * 記号そのものは結果に含めない。
 */
export const parseEmphasis = (source: string): Segment[] => {
  const segments: Segment[] = [];
  let buffer = "";
  let inside = false;

  for (const char of source) {
    if (char === "〔") {
      if (inside) throw new EmphasisSyntaxError(`〔 が入れ子になっている: ${source}`);
      if (buffer) segments.push({ text: buffer, emphasis: false });
      buffer = "";
      inside = true;
    } else if (char === "〕") {
      if (!inside) throw new EmphasisSyntaxError(`〔 の無い 〕 がある: ${source}`);
      segments.push({ text: buffer, emphasis: true });
      buffer = "";
      inside = false;
    } else {
      buffer += char;
    }
  }
  if (inside) throw new EmphasisSyntaxError(`〔 が閉じられていない: ${source}`);
  if (buffer) segments.push({ text: buffer, emphasis: false });
  return segments;
};

/** 記号を外した地の文（字数を数えるとき・検査用） */
export const plainText = (source: string): string =>
  parseEmphasis(source)
    .map((segment) => segment.text)
    .join("");
