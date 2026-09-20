/** 【検査用】納品本文の独立監査。監修側のリストを流用せず、こちらの観点で当てる */
import { DEEP_COPY, allDeepCombinations } from "../src/lib/personality/narrative";
import { REACTION_KEYS } from "../src/lib/personality/reaction";

const combos = allDeepCombinations();
const len = (s: string) => [...s].length;

console.log("=== 1人あたりの字数（30通り）===");
const counts = combos.map((c) => ({
  key: `${c.reaction}/${c.intensity}/放熱${c.heat}`,
  chars: c.texts ? len(Object.values(c.texts).join("")) : 0,
}));
console.log(`最小 ${Math.min(...counts.map((c) => c.chars))}字 / 最大 ${Math.max(...counts.map((c) => c.chars))}字`);
console.log(`平均 ${Math.round(counts.reduce((n, c) => n + c.chars, 0) / counts.length)}字`);
const short = counts.filter((c) => c.chars < 800);
console.log(short.length ? `800字未満: ${short.map((c) => `${c.key}=${c.chars}`).join(", ")}` : "800字未満: なし");

console.log("\n=== 2. 日本語・英数・約物以外の文字 ===");
const allText = Object.values(DEEP_COPY).flatMap((c) => [...Object.values(c!.s1), c!.s2, c!.s3, ...Object.values(c!.s4)]).join("");
const allowed = /[぀-ゟ゠-ヿ一-鿿　-〿A-Za-z0-9\s。、「」『』（）・ー〜！？：；,.\-—…%'"]/u;
const stray = [...new Set([...allText].filter((ch) => !allowed.test(ch)))];
console.log(stray.length ? `混入: ${stray.map((c) => `${c}(U+${c.codePointAt(0)!.toString(16)})`).join(" ")}` : "混入なし");

console.log("\n=== 3. こちらの観点で足した検査語 ===");
// 監修側のリストに無く、こちらで危ないと考えた語
const MINE = ["診断されました","あなたは病気","カウンセリングを受け","メンヘラ","地雷女","普通は","治りま","克服","矯正","欠陥","異常","married","です。です。"];
const hits = MINE.filter((w) => allText.includes(w));
console.log(hits.length ? `検出: ${hits.join(", ")}` : "検出なし");

console.log("\n=== 4. 断定の語尾（「〜のはずです」「〜に違いありません」の濫用）===");
for (const w of ["に違いありません", "絶対に", "必ず", "はずです"]) {
  const n = allText.split(w).length - 1;
  console.log(`  ${w}: ${n}回`);
}

console.log("\n=== 5. 反応ごとに本文が実際に違うか（使い回しの検出）===");
for (const slot of ["s2", "s3"] as const) {
  const values = REACTION_KEYS.map((k) => DEEP_COPY[k]![slot]);
  const unique = new Set(values).size;
  console.log(`  ${slot}: 5反応中 ${unique} 種類${unique < 5 ? "  ← 使い回しあり" : ""}`);
}
const s4High = new Set(REACTION_KEYS.map((k) => DEEP_COPY[k]!.s4.heatHigh));
console.log(`  s4(heatHigh): 5反応中 ${s4High.size} 種類${s4High.size < 5 ? "  ← 使い回しあり" : ""}`);
