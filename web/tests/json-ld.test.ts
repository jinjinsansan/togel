import { test } from "node:test";
import assert from "node:assert/strict";

import { personalityTypes, typeToken } from "../src/lib/personality";
import { serializeJsonLd, typeArticleJsonLd, websiteJsonLd } from "../src/lib/seo/json-ld";

/**
 * 構造化データの形を固定する。
 * 検索結果に出るが画面には出ないので、実機確認でもレビューでも見えない。
 *
 * 群名・理論用語の混入検査はここでは行わない。
 * 既存の不変条件テストが src 配下を全走査しており、JSON-LD の文字列も
 * コード内にあるのでその網に入る（検査を二重に持つと片方だけ更新される）。
 */

test("サイトの構造化データが必要な項目を持つ", () => {
  const data = websiteJsonLd();
  assert.equal(data["@type"], "WebSite");
  assert.equal(data.inLanguage, "ja");
  assert.ok(data.url.startsWith("https://www.to-gel.com"));
  assert.ok(data.publisher.name.length > 0);
});

test("24タイプすべての構造化データが組み立てられる", () => {
  for (const type of personalityTypes) {
    const data = typeArticleJsonLd(type);
    assert.equal(data["@type"], "Article");
    assert.ok(data.headline.includes(typeToken(type)), type.id);
    assert.equal(data.url, `https://www.to-gel.com/coaching/${type.id}`);
    assert.equal(data.mainEntityOfPage["@id"], data.url);
    assert.ok(data.image.includes(`type=${type.id}`), type.id);
    assert.equal(data.inLanguage, "ja");
  }
});

test("URLが重複しない（24本が別ページとして出る）", () => {
  const urls = personalityTypes.map((type) => typeArticleJsonLd(type).url);
  assert.equal(new Set(urls).size, urls.length);
});

test("scriptタグから抜け出せない形で直列化される", () => {
  const escaped = serializeJsonLd({ evil: "</script><script>alert(1)</script>" });
  assert.ok(!escaped.includes("</script>"));
  assert.ok(escaped.includes("\\u003c"));
  // エスケープしてもJSONとしては元の文字列に戻る
  assert.equal(
    (JSON.parse(escaped.replace(/\\u003c/g, "<")) as { evil: string }).evil,
    "</script><script>alert(1)</script>",
  );
});

test("直列化した結果が正しいJSONである", () => {
  for (const data of [websiteJsonLd(), ...personalityTypes.map(typeArticleJsonLd)]) {
    assert.doesNotThrow(() => JSON.parse(serializeJsonLd(data).replace(/\\u003c/g, "<")));
  }
});
