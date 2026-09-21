/**
 * 【検査用】画面に出る文字列の誤字を、**機械で**探す。
 *
 * 🔴 できることの限界を先に書く。日本語の辞書をオフラインで持っていないので、
 * **一般的な誤字の検査はできない**。ここで見るのは次の2つだけ。
 *
 *   1. よくある誤字のうち、**正しい読みが1つに決まるもの**（幾帳面→几帳面 など）。
 *      文脈で正誤が変わるもの（以外/意外、関心/感心）は入れない。誤検知になる
 *   2. 形の崩れ（# の全角半角、空白、同じタイプ内のタグの重複）
 *
 * つまり**このリストに無い誤字は素通りする**。「0件」は「誤字が無い」ではなく
 * 「このリストの誤字は無い」。
 */
import { personalityTypes } from "../src/lib/personality";

// 誤 → 正。**正しい書き方が1つに決まるものだけ。**
// 注意: 「絶体絶命」は正しい（絶対絶命が誤り）。取り違えない
const KNOWN: [string, string][] = [
  ["幾帳面", "几帳面"], ["完壁", "完璧"], ["絶対絶命", "絶体絶命"], ["危機一発", "危機一髪"],
  ["最新の注意", "細心の注意"], ["異和感", "違和感"], ["専問", "専門"], ["復雑", "複雑"],
  ["除々に", "徐々に"], ["興味深々", "興味津々"], ["快心の", "会心の"], ["講議", "講義"],
  ["検当", "見当"], ["一諸", "一緒"], ["歴然と", "歴然"], ["可笑しい", "おかしい"],
  ["不和雷同", "付和雷同"], ["五里夢中", "五里霧中"], ["意味深重", "意味深長"],
  ["短刀直入", "単刀直入"], ["無我無中", "無我夢中"], ["自我自賛", "自画自賛"],
  ["責任転化", "責任転嫁"], ["当確を現す", "頭角を現す"], ["的を得る", "的を射る"],
];

type Hit = { where: string; text: string; problem: string };
const hits: Hit[] = [];

for (const type of personalityTypes) {
  const fields: [string, string][] = [
    ["typeName", type.typeName],
    ["catchphrase", type.catchphrase],
    ["description", type.description],
    ...type.tags.map((t, i): [string, string] => [`tags[${i}]`, t]),
  ];
  for (const [field, text] of fields) {
    for (const [wrong, right] of KNOWN) {
      if (text.includes(wrong)) hits.push({ where: `${type.id}.${field}`, text, problem: `「${wrong}」→「${right}」` });
    }
  }
  // 形の崩れ（タグ）
  for (const tag of type.tags) {
    if (tag.startsWith("＃")) hits.push({ where: `${type.id}.tags`, text: tag, problem: "全角の＃" });
    if (!tag.startsWith("#") && !tag.startsWith("＃")) hits.push({ where: `${type.id}.tags`, text: tag, problem: "# で始まっていない" });
    if (/\s/.test(tag)) hits.push({ where: `${type.id}.tags`, text: tag, problem: "空白を含む" });
  }
  const dup = type.tags.filter((t, i) => type.tags.indexOf(t) !== i);
  for (const d of dup) hits.push({ where: `${type.id}.tags`, text: d, problem: "同じタイプ内で重複" });
}

console.log(`対象: ${personalityTypes.length}タイプ・タグ${personalityTypes.reduce((n, t) => n + t.tags.length, 0)}個＋名前・キャッチ・説明`);
console.log(`既知の誤字リスト: ${KNOWN.length}組\n`);
if (hits.length === 0) {
  console.log("検出なし（**このリストの誤字は無い**という意味。誤字が無いことの証明ではない）");
} else {
  for (const h of hits) console.log(`  🔴 ${h.where}: ${h.problem}  「${h.text}」`);
}
