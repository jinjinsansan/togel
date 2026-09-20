import { typeToken } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality";

/**
 * 構造化データ（JSON-LD）。
 *
 * 検索結果に出る情報なので、画面を見ても実機で確認しても目に入らない。
 * meta description で一度そこを踏んでいるので、文字列はコード内に置き、
 * 既存の不変条件テスト（src配下の全走査）の網に入る形にする。
 * 群名・理論用語を直接書かないこと。
 */

const SITE_NAME = "Togel";
const BASE_URL = "https://www.to-gel.com";
const PUBLISHER = "DLLC";

/** `</script>` でタグから抜け出せないようにする */
export const serializeJsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, "\\u003c");

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: BASE_URL,
  inLanguage: "ja",
  description:
    "合わない相手との付き合い方がわかる性格診断。運命の人は教えない。地雷なら教える。",
  publisher: {
    "@type": "Organization",
    name: PUBLISHER,
    url: BASE_URL,
  },
});

/** タイプ別の攻略ページ（24本の着地ページ） */
export const typeArticleJsonLd = (type: ExtendedPersonalityTypeDefinition) => {
  const url = `${BASE_URL}/coaching/${type.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${typeToken(type)}（${type.typeName}）の取扱説明`,
    description: `${type.catchphrase}。${typeToken(type)}と噛み合わないときの言い方の翻訳と、距離の置き方。`,
    inLanguage: "ja",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: `${BASE_URL}/api/og?type=${encodeURIComponent(type.id)}`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: BASE_URL },
    publisher: { "@type": "Organization", name: PUBLISHER, url: BASE_URL },
  };
};
