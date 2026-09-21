import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { GroupBadgeOg, groupEmoji } from "@/components/brand/group-badge";
import { emojiDataUri } from "@/lib/og/emoji";
import { TYPE_GROUP_ORDER } from "@/lib/personality";
import type { TypeGroupId } from "@/lib/personality";
import { groupMatrixCell, groupMatrixPairs } from "@/lib/personality/group-matrix";
import type { GroupMatchSymbol } from "@/lib/personality/group-matrix";

/**
 * 群×群の相性表（4×4＝16マス）を1枚画像にする。
 *
 * GET /api/og/groups … 1080×1350（4:5。Xのタイムラインで最も面積を取る比率）
 *
 * 24タイプ（24×24＝576マス）は画像化できないので、群の層で1枚に収める。
 * 表のマスには記号だけを置き、本文は10通りを下のブロックに並べる
 * （16マスに本文を詰めると実寸が読めるサイズを下回るため）。
 * 群名は必ず再定義の一行とセットで出す（軸の見出し）。本文側は凡例と対応する絵文字で示す。
 */

export const dynamic = "force-dynamic";

let fontCache: { bold: Buffer; black: Buffer } | null = null;

const loadFonts = async () => {
  if (fontCache) return fontCache;
  const [bold, black] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/noto-sans-jp-japanese-700-normal.woff")),
    readFile(join(process.cwd(), "src/assets/fonts/noto-sans-jp-japanese-900-normal.woff")),
  ]);
  fontCache = { bold, black };
  return fontCache;
};

/**
 * 記号（◎○△⚡）の描画。
 *
 * 同梱している日本語フォントは幾何記号のサブセットを含まず、文字のまま置くと
 * 豆腐になるためベクターで描く。意味は監修指示の4段階そのまま。
 *
 * 色は「両端に等しく色があり、真ん中が中立」に置く。
 * ◎（噛み合う）と ⚡（難しい）を同じ強さで色付けし、○△ を中立色にする。
 * 片端だけに色を持たせると、その記号が多い行＝悪い群、という読まれ方が発生する。
 */
const MatchSymbol = ({ symbol, size }: { symbol: GroupMatchSymbol; size: number }) => {
  const hazard = "#FF2E74";
  const relief = "#FF2E74";
  const plain = "#7c869c";

  if (symbol === "◎") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g fill="none" stroke={relief} strokeWidth="9">
          <circle cx="50" cy="50" r="42" />
          <circle cx="50" cy="50" r="19" />
        </g>
      </svg>
    );
  }
  if (symbol === "○") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke={plain} strokeWidth="8" />
      </svg>
    );
  }
  if (symbol === "△") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <polygon
          points="50,10 90,84 10,84"
          fill="none"
          stroke={plain}
          strokeWidth="8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <polygon points="58,6 26,56 46,56 38,94 74,42 52,42" fill={hazard} />
    </svg>
  );
};

const MatrixCell = ({ row, column }: { row: TypeGroupId; column: TypeGroupId }) => {
  const { symbol } = groupMatrixCell(row, column);
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #232a3a",
        borderRadius: 10,
        background: row === column ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.02)",
      }}
    >
      <MatchSymbol symbol={symbol} size={46} />
    </div>
  );
};

export const GET = async () => {
  const { bold, black } = await loadFonts();
  const groups = TYPE_GROUP_ORDER;

  // 絵文字はリポジトリから読む。satoriに文字で渡すと描画のたびに外部CDNを叩く
  const groupEmojiSrc = Object.fromEntries(
    await Promise.all(groups.map(async (group) => [group, await emojiDataUri(groupEmoji(group))])),
  ) as Record<(typeof groups)[number], string>;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#07090F",
          color: "#ffffff",
          fontFamily: "NotoSansJP",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 20,
            background: "#FF2E74",
          }}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "34px 40px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 900 }}>4群 相性表</div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#9aa5ba" }}>
              縦＝自分の群／横＝相手の群
            </div>
          </div>

          {/* 見出し行（群名と再定義はセット） */}
          <div style={{ display: "flex", marginTop: 22, gap: 8 }}>
            <div style={{ display: "flex", width: 196 }} />
            {groups.map((column) => (
              <div key={column} style={{ display: "flex", flex: 1 }}>
                <GroupBadgeOg group={column} size={19} emojiSrc={groupEmojiSrc[column]} />
              </div>
            ))}
          </div>

          {/* 16マス（記号のみ） */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {groups.map((row) => (
              <div key={row} style={{ display: "flex", height: 96, gap: 8 }}>
                <div style={{ display: "flex", width: 196, alignItems: "center" }}>
                  <GroupBadgeOg group={row} size={19} emojiSrc={groupEmojiSrc[row]} />
                </div>
                {groups.map((column) => (
                  <MatrixCell key={`${row}:${column}`} row={row} column={column} />
                ))}
              </div>
            ))}
          </div>

          {/* 10通りの本文 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}>
            {groupMatrixPairs().map(({ a, b, cell }) => (
              <div key={`${a}:${b}`} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    width: 118,
                    alignItems: "center",
                    gap: 8,
                    fontSize: 26,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- satoriが描くのでnext/imageは使えない */}
                  <img src={groupEmojiSrc[a]} width={26} height={26} alt="" />×
                  {/* eslint-disable-next-line @next/next/no-img-element -- satoriが描くのでnext/imageは使えない */}
                  <img src={groupEmojiSrc[b]} width={26} height={26} alt="" />
                </div>
                <div style={{ display: "flex", width: 44, justifyContent: "center" }}>
                  <MatchSymbol symbol={cell.symbol} size={28} />
                </div>
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    fontSize: 23,
                    fontWeight: 700,
                    color: "#c6cede",
                  }}
                >
                  {cell.text}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
              paddingTop: 22,
            }}
          >
            <div style={{ display: "flex", fontSize: 26, fontWeight: 900, color: "#FF2E74" }}>
              タイプは傾向、ラベルは個人。
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 900 }}>to-gel.com</div>
              <div
                style={{
                  display: "flex",
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "#FF2E74",
                  color: "#07090F",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                #トゥゲル診断
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: 20,
            background: "#FF2E74",
          }}
        />
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "NotoSansJP", data: bold, weight: 700, style: "normal" },
        { name: "NotoSansJP", data: black, weight: 900, style: "normal" },
      ],
    },
  );

  image.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  return image;
};
