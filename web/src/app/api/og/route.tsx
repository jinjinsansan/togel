import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { GroupBadgeOg, groupEmoji } from "@/components/brand/group-badge";
import { personalityTypes, representativeScores, typeToken } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality";
import { TOGEL_INDEX, togelIndexPercent } from "@/lib/personality/togel-index";
import { emojiDataUri } from "@/lib/og/emoji";
import { landmineHeading, landmineQuote } from "@/lib/share/text";
import type { BigFiveScores } from "@/types/diagnosis";

/**
 * シェア用OGP画像の動的生成（デザイナー納品テンプレート準拠 / 1200×630）。
 *
 * GET /api/og?type=<typeId>               … 自分のタイプ発表カード（1200×630）
 * GET /api/og?type=<typeId>&mode=mismatch … 「私と絶対合わないのは」カード（1200×630）
 * GET /api/og?type=<typeId>&format=story  … 取扱注意ラベル（1080×1920 / 9:16）
 *
 * story は Instagram ストーリーズ と LINE トーク画面のスクリーンショットで流通する前提。
 * リンクが剥がれた状態で出回るのが正常なので、ドメインとハッシュタグを画像内に焼き込む。
 * 5指標は実測値（&s=o,c,e,a,n）があればそれを、無ければタイプ代表値を使う。
 *
 * 文字は最小でも実寸28px。タイプ名と数字だけで意味が通ることを最優先。
 * ロゴは現行A案（">"スワイプ）を使用。
 */

export const dynamic = "force-dynamic";

const BRAND_TAGLINE = "運命の人は教えない。地雷なら教える。";

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

/** 現行ロゴ（A案）: ネイビータイル + ピンクグラデT + ">"スワイプ */
const LogoMark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <defs>
      <linearGradient id="tgOg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff6fa5" />
        <stop offset="1" stopColor="#E91E63" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="38" height="38" rx="11" fill="#0b1f3a" />
    <path
      d="M9 13.5h13M15.5 13.5V27"
      fill="none"
      stroke="url(#tgOg)"
      strokeWidth="2.7"
      strokeLinecap="round"
    />
    <path
      d="M25 20l6-5m-6 5l6 5"
      fill="none"
      stroke="url(#tgOg)"
      strokeWidth="2.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 実測スコア（1〜5 を o,c,e,a,n の順でカンマ区切り）。壊れていれば null */
const parseScores = (raw: string | null): BigFiveScores | null => {
  if (!raw) return null;
  const parts = raw.split(",").map((value) => Number.parseFloat(value));
  if (
    parts.length !== 5 ||
    parts.some((value) => !Number.isFinite(value) || value < 1 || value > 5)
  ) {
    return null;
  }
  const [openness, conscientiousness, extraversion, agreeableness, neuroticism] = parts;
  return { openness, conscientiousness, extraversion, agreeableness, neuroticism };
};

/** 菱形の警告標識（危険物ラベルのモチーフ）。中央に絵文字を置く */
const WarningDiamond = ({ size, emojiSrc }: { size: number; emojiSrc: string }) => (
  <div style={{ display: "flex", position: "relative", width: size, height: size }}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <polygon points="50,3 97,50 50,97 3,50" fill="#0B0F1A" stroke="#FFE03D" strokeWidth="5" />
    </svg>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 絵文字は文字ではなく画像で渡す（下の emojiDataUri の説明を参照） */}
      {/* eslint-disable-next-line @next/next/no-img-element -- satoriが描くのでnext/imageは使えない */}
      <img src={emojiSrc} width={size * 0.42} height={size * 0.42} alt="" />
    </div>
  </div>
);

/**
 * 取扱注意ラベル（1080×1920）。
 *
 * タイプ間に優劣を作らないサービスなので、人がこれを貼る理由は「勝った」ではなく「これが自分だ」。
 * 最大サイズを取るのは地雷の一文（自虐ネタとして引用されるのはそこ）であり、
 * 情報量や網羅性を増やす方向には広げない。
 */
const StoryLabel = ({
  type,
  scores,
  typeEmojiSrc,
  groupEmojiSrc,
}: {
  type: ExtendedPersonalityTypeDefinition;
  scores: BigFiveScores;
  typeEmojiSrc: string;
  groupEmojiSrc: string;
}) => {
  const mine = landmineQuote(type.id);
  const mineSize = mine.length >= 20 ? 68 : mine.length >= 16 ? 78 : 88;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "radial-gradient(85% 55% at 50% 0%, rgba(255,46,116,.32), #07090F 62%)",
        color: "#ffffff",
        fontFamily: "NotoSansJP",
      }}
    >
      <div
        style={{
          display: "flex",
          height: 34,
          background: "repeating-linear-gradient(45deg,#FFE03D 0 34px,#0B0F1A 34px 68px)",
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "74px 84px 64px",
        }}
      >
        {/* タイプの提示 */}
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <WarningDiamond size={210} emojiSrc={typeEmojiSrc} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "0.22em",
                color: "#FFE03D",
              }}
            >
              取扱注意
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 104,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {typeToken(type)}
            </div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#9aa5ba" }}>
              {type.typeName}
            </div>
            {/* 群（群名と再定義は必ずセット） */}
            <div style={{ display: "flex", marginTop: 18 }}>
              <GroupBadgeOg group={type.group} size={34} emojiSrc={groupEmojiSrc} />
            </div>
          </div>
        </div>

        {/* 地雷の一文: このラベルの主役 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: "0.22em",
              color: "#FF2E74",
            }}
          >
            {landmineHeading(type.id)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: mineSize,
              fontWeight: 900,
              lineHeight: 1.4,
              letterSpacing: "-0.03em",
            }}
          >
            {mine}
          </div>
        </div>

        {/* 5指標 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "0.22em",
              color: "#6b7488",
            }}
          >
            TOGEL INDEX
          </div>
          {TOGEL_INDEX.map(({ key, label }) => {
            const pct = togelIndexPercent(key, scores);
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div
                  style={{
                    display: "flex",
                    width: 190,
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#c6cede",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    height: 16,
                    borderRadius: 999,
                    background: "#1a1f2e",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${pct}%`,
                      height: 16,
                      borderRadius: 999,
                      background: "#FF2E74",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 焼き込みの導線（リンクが剥がれた状態で流通する前提） */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <LogoMark size={72} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 900 }}>Togel</div>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#9aa5ba" }}>
                to-gel.com
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "18px 30px",
              borderRadius: 999,
              background: "#FFE03D",
              color: "#07090F",
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            #トゥゲル診断
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          height: 34,
          background: "repeating-linear-gradient(45deg,#FFE03D 0 34px,#0B0F1A 34px 68px)",
        }}
      />
    </div>
  );
};

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const typeId = url.searchParams.get("type");
  const mode = url.searchParams.get("mode") === "mismatch" ? "mismatch" : "type";

  const type = personalityTypes.find((t) => t.id === typeId);
  if (!type) {
    return new Response("unknown type", { status: 404 });
  }

  const { bold, black } = await loadFonts();
  const fonts = [
    { name: "NotoSansJP", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "NotoSansJP", data: black, weight: 900 as const, style: "normal" as const },
  ];

  // 9:16 の取扱注意ラベル（ストーリーズ／トーク画面のスクショ用）
  if (url.searchParams.get("format") === "story") {
    const scores = parseScores(url.searchParams.get("s")) ?? representativeScores(type.id);
    // 絵文字はリポジトリから読む。satoriに文字で渡すと描画のたびに外部CDNを叩く
    const [typeEmojiSrc, groupEmojiSrc] = await Promise.all([
      emojiDataUri(type.emoji),
      emojiDataUri(groupEmoji(type.group)),
    ]);
    const story = new ImageResponse(
      <StoryLabel
        type={type}
        scores={scores}
        typeEmojiSrc={typeEmojiSrc}
        groupEmojiSrc={groupEmojiSrc}
      />,
      { width: 1080, height: 1920, fonts },
    );
    story.headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    return story;
  }

  const worst = personalityTypes.find((t) => t.id === type.badCompatibleTypes[0]) ?? null;

  // 表示対象（mismatch: 相手タイプ / type: 自分のタイプ）
  const featured = mode === "mismatch" && worst ? worst : type;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "radial-gradient(90% 90% at 20% 0%, rgba(255,46,116,.35), #07090F 62%)",
          color: "#ffffff",
          fontFamily: "NotoSansJP",
        }}
      >
        {/* ハザードテープ */}
        <div
          style={{
            display: "flex",
            height: 22,
            background: "repeating-linear-gradient(45deg,#FFE03D 0 26px,#0B0F1A 26px 52px)",
          }}
        />

        {/* 本文 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 76px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: "0.22em",
              color: "#FFE03D",
            }}
          >
            {mode === "mismatch" ? "MISMATCH / WORST 1" : "MY TYPE / 24"}
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 44, fontWeight: 700, color: "#9aa5ba" }}>
            {mode === "mismatch" ? "私と絶対に合わないのは" : "私のタイプは"}
          </div>
          {/* 主は愛称。1200×630はリンクを貼るたびに自動で出る既定のOGPなので、
              最も見られるこの画像に識別トークンを置く。正式名は副に落とす。
              愛称は最長5字なので、折り返しと字数の場合分けが要らなくなる */}
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 106,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            {typeToken(featured)}
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 40, fontWeight: 700, color: "#9aa5ba" }}>
            {featured.typeName}
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 36, fontWeight: 700, color: "#FF2E74" }}>
            {featured.catchphrase}
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 76px 54px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <LogoMark size={64} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 36, fontWeight: 900, color: "#ffffff" }}>
                Togel
              </div>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#6b7488" }}>
                to-gel.com
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              padding: "18px 30px",
              borderRadius: 999,
              background: "#FFE03D",
              color: "#07090F",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            {BRAND_TAGLINE}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    },
  );

  // 内容はタイプごとに固定なのでCDNで長めにキャッシュ
  image.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  return image;
};
