import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { personalityTypes } from "@/lib/personality";

/**
 * シェア用OGP画像の動的生成（デザイナー納品テンプレート準拠 / 1200×630）。
 *
 * GET /api/og?type=<typeId>                … 自分のタイプ発表カード
 * GET /api/og?type=<typeId>&mode=mismatch  … 「私と絶対合わないのは」カード（WORST1）
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

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const typeId = url.searchParams.get("type");
  const mode = url.searchParams.get("mode") === "mismatch" ? "mismatch" : "type";

  const type = personalityTypes.find((t) => t.id === typeId);
  if (!type) {
    return new Response("unknown type", { status: 404 });
  }

  const worst = personalityTypes.find((t) => t.id === type.badCompatibleTypes[0]) ?? null;

  // 表示対象（mismatch: 相手タイプ / type: 自分のタイプ）
  const featured = mode === "mismatch" && worst ? worst : type;
  // タイプ名15文字以上は1段階だけ縮小、2行までは許容
  const nameSize = featured.typeName.length >= 15 ? 80 : 106;
  const showTagline = featured.typeName.length <= 11;

  const { bold, black } = await loadFonts();

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
              letterSpacing: "0.28em",
              color: "#FFE03D",
            }}
          >
            {mode === "mismatch" ? "MISMATCH / WORST 1" : "MY TYPE / 24"}
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 44, fontWeight: 700, color: "#9aa5ba" }}>
            {mode === "mismatch" ? "私と絶対に合わないのは" : "私のタイプは"}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: nameSize,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.04em",
              color: "#ffffff",
            }}
          >
            {featured.typeName}
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 38, fontWeight: 700, color: "#FF2E74" }}>
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
          {showTagline && (
            <div
              style={{
                display: "flex",
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
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      emoji: "twemoji",
      fonts: [
        { name: "NotoSansJP", data: bold, weight: 700, style: "normal" },
        { name: "NotoSansJP", data: black, weight: 900, style: "normal" },
      ],
    },
  );

  // 内容はタイプごとに固定なのでCDNで長めにキャッシュ
  image.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  return image;
};
