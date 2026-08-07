import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { personalityTypes, getTogelLabel } from "@/lib/personality";

/**
 * シェア用OGP画像の動的生成。
 *
 * GET /api/og?type=<typeId>            … 自分のタイプ発表カード
 * GET /api/og?type=<typeId>&mode=mismatch … 「私と絶対合わないのは」カード
 *
 * ビジュアルは暫定（デザイナー納品後にテンプレートを差し替える前提）。
 * 構造・フォント同梱・キャッシュ設定などの基盤部分が本体。
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

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const typeId = url.searchParams.get("type");
  const mode = url.searchParams.get("mode") === "mismatch" ? "mismatch" : "type";

  const type = personalityTypes.find((t) => t.id === typeId);
  if (!type) {
    return new Response("unknown type", { status: 404 });
  }

  const worstTypes = type.badCompatibleTypes
    .map((id) => personalityTypes.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .slice(0, 3);

  const { bold, black } = await loadFonts();

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #0B1F3A 0%, #070D1A 70%)",
          color: "#EAF0FA",
          fontFamily: "NotoSansJP",
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.3em",
              color: "#FF6FA5",
            }}
          >
            TOGEL
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#8FA2C4" }}>{getTogelLabel(type.id)}</div>
        </div>

        {/* 本文 */}
        {mode === "type" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 30, color: "#8FA2C4" }}>私のソウルタイプは</div>
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ display: "flex", fontSize: 110 }}>{type.emoji}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 76, fontWeight: 900, color: "#FFFFFF" }}>
                  {type.typeName}
                </div>
                <div style={{ display: "flex", fontSize: 32, color: "#FF9DC0", marginTop: 6 }}>
                  「{type.catchphrase}」
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
              {type.tags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#EAF0FA",
                    background: "rgba(255,255,255,0.1)",
                    padding: "10px 24px",
                    borderRadius: 999,
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", fontSize: 34 }}>{type.emoji}</div>
              <div style={{ display: "flex", fontSize: 30, color: "#8FA2C4" }}>
                {type.typeName}の私と、絶対合わないのは
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {worstTypes.map((worst, i) => (
                <div key={worst.id} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 26,
                      fontWeight: 900,
                      color: "#FF4F8B",
                      width: 64,
                    }}
                  >
                    {i + 1}位
                  </div>
                  <div style={{ display: "flex", fontSize: 44 }}>{worst.emoji}</div>
                  <div style={{ display: "flex", fontSize: 44, fontWeight: 900, color: "#FFFFFF" }}>
                    {worst.typeName}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#FF9DC0", marginTop: 4 }}>
              ⚠ 付き合ったら地獄確定らしいです
            </div>
          </div>
        )}

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid rgba(143,162,196,0.25)",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#EAF0FA" }}>
            {BRAND_TAGLINE}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#8FA2C4" }}>to-gel.com</div>
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
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return image;
};
