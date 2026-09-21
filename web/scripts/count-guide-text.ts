/**
 * 【計測用】`/coaching/[typeId]`（LINE週次配信の着地先）の地の文を数える。
 * 直さない。数えるだけ。`/result` の計測（scripts/count-self-text.ts）と同じ粒度。
 */
import { typeApproachGuides } from "../src/lib/coaching/translations";
import { BOARD_ANGLES, cellContent } from "../src/lib/coaching/board";
import { personalityTypes } from "../src/lib/personality";

const len = (s: string) => [...s].length;
const entries = personalityTypes
  .map((type) => ({ type, guide: typeApproachGuides[type.id] }))
  .filter((e) => Boolean(e.guide));

/** 1つの角度で読む地の文（cellContent が返すものを、画面と同じ組で足す） */
const angleText = (guide: (typeof entries)[number]["guide"], angle: string): string[] => {
  const c = cellContent(guide, angle as never);
  return [c.body, c.ng, c.ok, ...(c.dos ?? [])].filter((x): x is string => Boolean(x));
};

console.log("=".repeat(76));
console.log(`【1】角度別の字数（${entries.length}タイプ）`);
console.log("=".repeat(76));
const per = new Map<string, number[]>(BOARD_ANGLES.map((a) => [a.key, []]));
for (const { guide } of entries) {
  for (const a of BOARD_ANGLES) per.get(a.key)!.push(angleText(guide, a.key).reduce((n, s) => n + len(s), 0));
}
const stat = (xs: number[]) => ({
  min: Math.min(...xs), max: Math.max(...xs),
  avg: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length),
});
console.log("\n角度            平均   最小   最大   （画面に出るもの）");
const FIELD: Record<string, string> = {
  core: "core", translate: "ng + ok", why: "why", dos: "dos ×3", distance: "distance",
};
for (const a of BOARD_ANGLES) {
  const s = stat(per.get(a.key)!);
  console.log(
    `${a.label.padEnd(10, "　")} ${String(s.avg).padStart(5)} ${String(s.min).padStart(6)} ${String(s.max).padStart(6)}   ${FIELD[a.key]}`,
  );
}
const totals = entries.map(({ guide }) =>
  BOARD_ANGLES.reduce((n, a) => n + angleText(guide, a.key).reduce((m, s) => m + len(s), 0), 0),
);
const t = stat(totals);
console.log(`\n1タイプ合計    ${t.avg} 字（最小 ${t.min} / 最大 ${t.max}）`);

console.log("\n" + "=".repeat(76));
console.log("【2】文の在庫（/result の186文と同じ数え方）");
console.log("=".repeat(76));
const inventory = new Map<string, Set<string>>(BOARD_ANGLES.map((a) => [a.key, new Set()]));
for (const { guide } of entries) {
  for (const a of BOARD_ANGLES) for (const s of angleText(guide, a.key)) inventory.get(a.key)!.add(s);
}
for (const a of BOARD_ANGLES) {
  console.log(`  ${a.label.padEnd(10, "　")} ${String(inventory.get(a.key)!.size).padStart(4)} 種類`);
}
console.log(`\n合計 ${[...inventory.values()].reduce((n, s) => n + s.size, 0)} 文`);

console.log("\n" + "=".repeat(76));
console.log("【3】タイプによって変わらない共通文");
console.log("=".repeat(76));
const seen = new Map<string, string[]>();
for (const { type, guide } of entries) {
  for (const a of BOARD_ANGLES) {
    for (const s of angleText(guide, a.key)) {
      if (!seen.has(s)) seen.set(s, []);
      seen.get(s)!.push(type.typeName);
    }
  }
}
const shared = [...seen.entries()].filter(([, who]) => who.length > 1);
if (shared.length === 0) console.log("  共通文なし（すべてタイプ固有）");
for (const [text, who] of shared.sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
  console.log(`  ${who.length}タイプ: 「${text.slice(0, 40)}${text.length > 40 ? "…" : ""}」`);
}
console.log(`\n重複している文 ${shared.length} 件 / 全 ${seen.size} 文`);

console.log("\n" + "=".repeat(76));
console.log("【4】極端に短い角度");
console.log("=".repeat(76));
const avgAll = t.avg / BOARD_ANGLES.length;
for (const a of BOARD_ANGLES) {
  const s = stat(per.get(a.key)!);
  const ratio = (s.avg / avgAll).toFixed(2);
  const mark = s.avg < avgAll * 0.35 ? "  ← 平均の1/3未満" : "";
  console.log(`  ${a.label.padEnd(10, "　")} 平均${String(s.avg).padStart(4)}字  角度平均比 ${ratio}${mark}`);
}
console.log("\nng と ok を分けて見る:");
const ng = entries.map((e) => len(e.guide.ng));
const ok = entries.map((e) => len(e.guide.ok));
const dos = entries.map((e) => e.guide.dos.reduce((n, s) => n + len(s), 0));
for (const [name, xs] of [["ng（✕の言い方）", ng], ["ok（◯の言い換え）", ok], ["dos（3つ合計）", dos]] as const) {
  const s = stat(xs as number[]);
  console.log(`  ${name.padEnd(18, "　")} 平均${String(s.avg).padStart(4)}字（${s.min}〜${s.max}）`);
}

console.log("\n" + "=".repeat(76));
console.log("【5】タイプ別（角度ごと）");
console.log("=".repeat(76));
console.log("タイプ              正体  翻訳  なぜ  やる  距離  合計");
const rows = entries.map(({ type, guide }) => {
  const cells = BOARD_ANGLES.map((a) => angleText(guide, a.key).reduce((n, s) => n + len(s), 0));
  return { name: type.typeName, cells, total: cells.reduce((a, b) => a + b, 0) };
});
for (const r of rows.sort((a, b) => a.total - b.total)) {
  console.log(
    `${r.name.padEnd(12, "　")} ${r.cells.map((c) => String(c).padStart(5)).join(" ")} ${String(r.total).padStart(5)}`,
  );
}
console.log("\n参考: 以前お伝えした「平均364字」は **dos（今日からやること）を数え落として**いました。");
console.log("     文字列のフィールドだけを足していて、配列の dos が抜けていた。正しくは 431字。");
