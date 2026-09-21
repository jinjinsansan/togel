import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BROADCAST_TOTAL_ISSUES,
  buildTypeBroadcast,
  issueForUser,
} from "../src/lib/line/broadcast";
import { ANGLE_BY_BROADCAST_KIND } from "../src/lib/coaching/board";
import { personalityTypes } from "../src/lib/personality";

/**
 * LINE週次配信。通目・範囲・文面の重複を固定する。
 * 通目がユーザー単位でないと「1通目を受け取る」の約束が破れるので、起点の扱いも見る。
 */

const WEEK = 7 * 24 * 60 * 60 * 1000;
const START = new Date("2026-09-25T00:00:00Z");

test("1〜15通目がすべて組み立てられる", () => {
  for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
    const message = buildTypeBroadcast("creative-leader", issue);
    assert.ok(message, `issue=${issue}`);
    assert.equal(
      message.text.split("\n")[0],
      `${issue}通目です（全${BROADCAST_TOTAL_ISSUES}通）`,
    );
  }
});

test("範囲外の通目は送らない（巡回させない）", () => {
  for (const issue of [0, -1, BROADCAST_TOTAL_ISSUES + 1, 999, 1.5]) {
    assert.equal(buildTypeBroadcast("creative-leader", issue), null, `issue=${issue}`);
  }
});

/**
 * 🔴 この検査は**全文が同一かどうかしか見ていない。**
 * 見出しが違えば別の文字列になるので、**中の一部だけが重複していても通る。**
 * 実際そうなっていて、同じ相手の ✕/◯ が2通に入っていたのを通していた。
 * 部分の重複は下の「自分の角度だけを含む」で止める。
 */
test("15通の文面が重複しない（5テンプレ × ワースト3を網羅する）", () => {
  for (const type of personalityTypes) {
    const texts: string[] = [];
    for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
      const message = buildTypeBroadcast(type.id, issue);
      if (message) texts.push(message.text);
    }
    assert.equal(texts.length, BROADCAST_TOTAL_ISSUES, type.id);
    assert.equal(new Set(texts).size, BROADCAST_TOTAL_ISSUES, type.id);
  }
});

/**
 * 各通は、**自分の角度の文だけ**を含む。
 *
 * リンクの対応（ANGLE_BY_BROADCAST_KIND）は1対1だったのに、**本文がその対応に
 * 従っていなかった**。kind 2 は角度として `why` を指しているのに、本文に
 * `ng / ok` も載せていたため、1通目と同じ中身が2週後にもう一度届いていた
 * （15通中3通）。見出しも「言い方の翻訳講座」のままで、中身と合っていなかった。
 *
 * 既存の「1対1」検査は**リンク先しか見ていない**ので、これを通していた。
 */
test("他の角度を、その角度の見せ方で載せない", () => {
  // 「他の角度の文字列を含まない」では厳しすぎる。`why` の本文は
  // **説明する対象として ✕ の言い回しをそのまま引用している**（「『今、真面目な
  // 話してるんだけど』は進行の整理のつもりでも…」）。引用は重複ではない。
  //
  // 重複だったのは、**その角度の見せ方ごと載せていた**こと。
  // ✕/◯ の行は translate の見せ方、番号付きの行は dos の見せ方。
  // そこだけを、自分の角度の通に限る。
  const MARKERS: { angle: string; test: (line: string) => boolean; name: string }[] = [
    { angle: "translate", test: (l) => /^[✕◯]/.test(l.trim()), name: "✕/◯ の行" },
    { angle: "dos", test: (l) => /^\d+\. /.test(l.trim()), name: "番号付きの行" },
  ];

  const offenders: string[] = [];
  for (const type of personalityTypes) {
    for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
      const text = buildTypeBroadcast(type.id, issue)?.text;
      if (!text) continue;
      const mine = ANGLE_BY_BROADCAST_KIND[(issue - 1) % ANGLE_BY_BROADCAST_KIND.length];
      const lines = text.split("\n");

      for (const marker of MARKERS) {
        const hit = lines.some(marker.test);
        if (hit && marker.angle !== mine) {
          offenders.push(`${type.id} ${issue}通目(${mine}): ${marker.name}が出ている`);
        }
        if (!hit && marker.angle === mine) {
          offenders.push(`${type.id} ${issue}通目(${mine}): ${marker.name}が無い`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(offenders)], []);
});

test("各通は盤のマスへのリンクを持つ（配信1通 = 1マス）", () => {
  for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
    const text = buildTypeBroadcast("creative-leader", issue)?.text ?? "";
    assert.match(text, /to-gel\.com\/coaching\?cell=/);
  }
});

test("残り通数・連続記録・不在への言及を含まない", () => {
  // 「あとで〜」のような正当な語と区別するため、禁止事項そのものの形で見る
  const banned: [RegExp, string][] = [
    [/あと\s*\d+\s*通/, "残り通数"],
    [/残り\s*\d+/, "残り数"],
    [/\d+\s*週連続|連続記録|連続で開封/, "ストリーク"],
    [/お久しぶり|ぶりですね|未読/, "不在への言及"],
  ];
  for (const type of personalityTypes) {
    for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
      const text = buildTypeBroadcast(type.id, issue)?.text ?? "";
      for (const [pattern, label] of banned) {
        assert.ok(!pattern.test(text), `${type.id} issue=${issue} に${label}が含まれている`);
      }
    }
  }
});

test("通目の起点は max(友だち登録日, 配信有効化日)", () => {
  // 有効化以前からの友だちも1通目から始まる
  assert.equal(issueForUser("2026-08-01T00:00:00Z", START, START), 1);
  // 有効化後に登録した人も、その人の登録日から1通目
  const later = new Date("2026-10-02T00:00:00Z");
  assert.equal(issueForUser(later.toISOString(), START, later), 1);
});

test("通目は1週間ごとに1つ進む", () => {
  const created = "2026-08-01T00:00:00Z";
  assert.equal(issueForUser(created, START, new Date(START.getTime() + WEEK - 1000)), 1);
  assert.equal(issueForUser(created, START, new Date(START.getTime() + WEEK)), 2);
  assert.equal(issueForUser(created, START, new Date(START.getTime() + 14 * WEEK)), 15);
  // 15通を配り終えた人は範囲外になり、送信対象から外れる
  assert.ok(issueForUser(created, START, new Date(START.getTime() + 15 * WEEK)) > 15);
});
