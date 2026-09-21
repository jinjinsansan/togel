/** 【検査用】タイプ本文の独立監査。監修側のリストを流用せず、こちらの観点で当てる */
import { deliveredTypeProfiles, typeProfileParagraphs } from "../src/lib/personality/copy/type-profile";

const all = deliveredTypeProfiles();
const len = (s: string) => [...s].length;
const counts = all.map(({ typeId, copy }) => ({ typeId, chars: len(copy), paras: typeProfileParagraphs(copy).length }));
console.log(`=== 字数（${all.length}タイプ）===`);
console.log(`最小 ${Math.min(...counts.map(c=>c.chars))}字 / 最大 ${Math.max(...counts.map(c=>c.chars))}字 / 平均 ${Math.round(counts.reduce((n,c)=>n+c.chars,0)/counts.length)}字`);
const short = counts.filter(c=>c.chars<230);
console.log(short.length ? `230字未満: ${short.map(c=>`${c.typeId}=${c.chars}`).join(", ")}` : "230字未満: なし");
const badParas = counts.filter(c=>c.paras!==3);
console.log(badParas.length ? `3段落でない: ${badParas.map(c=>`${c.typeId}=${c.paras}`).join(", ")}` : "3段落でない: なし");

const text = all.map(a=>a.copy).join("\n");
console.log("\n=== 日本語・英数・約物以外の文字 ===");
const allowed = /[぀-ゟ゠-ヿ一-鿿　-〿A-Za-z0-9\s。、「」『』（）・ー〜！？：；,.\-—…%'"]/u;
const stray = [...new Set([...text].filter(ch=>!allowed.test(ch)))];
console.log(stray.length ? `混入: ${stray.map(c=>`${c}(U+${c.codePointAt(0)!.toString(16)})`).join(" ")}` : "混入なし");

console.log("\n=== こちらの観点で足した検査語 ===");
const MINE = ["メンヘラ","地雷女","普通は","治りま","克服","矯正","欠陥","異常","診断されました","あなたは病気","ADHD","発達","うつ","障害"];
const hits = MINE.filter(w=>text.includes(w));
console.log(hits.length ? `検出: ${hits.join(", ")}` : "検出なし");

console.log("\n=== 本文の使い回し ===");
console.log(`24タイプ中 ${new Set(all.map(a=>a.copy)).size} 種類`);
const firsts = all.map(a=>typeProfileParagraphs(a.copy)[0].slice(0,14));
console.log(`書き出しの重複: ${firsts.length - new Set(firsts).size} 件`);
