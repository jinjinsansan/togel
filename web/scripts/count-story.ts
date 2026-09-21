/** 【計測用】ストーリーズ1人ぶん（15枚）の地の文の字数。直さない。数えるだけ */
import { buildStoryFromKeys, type StoryCard } from "../src/lib/personality/story/cards";
import { plainText } from "../src/lib/personality/story/emphasis";
import { personalityTypes } from "../src/lib/personality";
import { HEAT_KEYS, INTENSITY_KEYS, REACTION_KEYS } from "../src/lib/personality/reaction";

const len = (s: string) => [...plainText(s)].length;
const cardChars = (c: StoryCard): number => {
  switch (c.kind) {
    case "text": case "close": return [c.card.lead, c.card.big, c.card.mid, c.card.sub].filter(Boolean).reduce((n, s) => n + len(s!), 0);
    case "toc": return len(c.big) + len(c.sub) + len(c.closing);
    case "diagram": return len(c.diagram.event) + len(c.diagram.meaning) + c.diagram.rejected.reduce((n, s) => n + len(s), 0) + len(c.diagram.closing);
    case "chips": return len(c.chips.intro) + c.chips.chips.reduce((n, s) => n + len(s), 0) + len(c.chips.big) + (c.chips.sub ? len(c.chips.sub) : 0);
    default: return 0;
  }
};
const totals: number[] = []; const perCard: { key: string; i: number; n: number }[] = [];
for (const t of personalityTypes) for (const r of REACTION_KEYS) for (const s of INTENSITY_KEYS) for (const h of HEAT_KEYS) {
  const story = buildStoryFromKeys({ typeId: t.id, reaction: r, intensity: s, heat: h })!;
  totals.push(story.reduce((n, c) => n + cardChars(c), 0));
  story.forEach((c, i) => perCard.push({ key: `${t.id}/${r}/${s}/${h}`, i: i + 1, n: cardChars(c) }));
}
console.log(`1人あたり（15枚）: 最小 ${Math.min(...totals)}字 / 最大 ${Math.max(...totals)}字 / 平均 ${Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)}字`);
const uniq = new Map<string, { i: number; n: number; key: string }>();
for (const p of perCard) { const k = `${p.i}:${p.n}`; if (!uniq.has(k)) uniq.set(k, p); }
console.log("\n字数の多いカード 上位8（重複を除く）:");
[...uniq.values()].sort((a, b) => b.n - a.n).slice(0, 8).forEach((p) => console.log(`  ${String(p.n).padStart(4)}字  ${p.i}枚目  ${p.key}`));
