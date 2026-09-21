import { BigFiveScores, PersonalityTypeDefinition } from "@/types/diagnosis";
import { getTogelLabel } from "./utils";

type TraitIntensity = "very-low" | "low" | "medium" | "high" | "very-high";

function getIntensity(score: number): TraitIntensity {
  if (score >= 4.5) return "very-high";
  if (score >= 3.8) return "high";
  if (score >= 2.8) return "medium";
  if (score >= 2.0) return "low";
  return "very-low";
}

function selectVariation<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % items.length;
  return items[index];
}

// 外向性の文章バリエーション
const extraversionTexts = {
  "very-high": [
    "一人の時間？何それ？常に誰かと一緒にいたい人",
    "友達と予定が入ってない日は不安になるタイプ",
    "グループチャット10個くらい入ってそう",
  ],
  high: [
    "一人でも平気だけど、人といる方がテンション上がる",
    "初対面でも意外と話せる。少し時間はかかるけど",
    "人と会うと元気になる。エネルギーチャージできる",
  ],
  medium: [
    "一人も人といるのも、どっちも好き。バランス型",
    "その日の気分で変わる。人恋しい日と一人がいい日がある",
    "社交的でもないし内向的でもない、ちょうど真ん中",
  ],
  low: [
    "人といるのも楽しいけど、一人の時間の方が落ち着く",
    "少人数で深く話す方が好き。大人数は疲れる",
    "外出より家でまったりの方が好き",
  ],
  "very-low": [
    "基本ソロ活動。人といるとエネルギー吸い取られる",
    "一人でいるのが最高。誰にも邪魔されたくない",
    "大人数の飲み会とか地獄。即帰りたくなる",
  ],
};

// 開放性の文章バリエーション
const opennessTexts = {
  "very-high": [
    "新しいもの大好き人間。試したことないことに興味津々",
    "「これ面白そう！」で即行動。好奇心の塊",
    "同じルーティンは飽きる。変化がないと死ぬタイプ",
  ],
  high: [
    "新しいことに挑戦するの好き。でも慎重に選ぶ",
    "流行ってるものはとりあえずチェック派",
    "「なんか面白いことないかな」が口癖",
  ],
  medium: [
    "新しいことも慣れたことも、どっちも大事",
    "たまには冒険するけど、基本は安定志向",
    "興味あることには挑戦するけど、無理はしない",
  ],
  low: [
    "慣れたことの方が安心。新しいことはちょっと怖い",
    "「いつもの」が好き。変化は苦手",
    "冒険より安定。確実な方を選ぶタイプ",
  ],
  "very-low": [
    "ルーティン最高。毎日同じで全然OK",
    "新しいことより、やり慣れたことをやりたい",
    "変化？無理。安定が一番",
  ],
};

// 誠実性の文章バリエーション
const conscientiousnessTexts = {
  "very-high": [
    "計画立てないと不安で死ぬ。ToDoリスト命",
    "時間厳守。5分前行動が基本。遅刻する人が理解できない",
    "やることリスト作って、順番にこなすのが快感",
  ],
  high: [
    "計画はちゃんと立てる派。突発は苦手",
    "約束は守る。ドタキャンとか基本しない",
    "予定はGoogleカレンダーで管理してる",
  ],
  medium: [
    "計画も立てるけど、その場のノリも大事",
    "予定通りにいかなくても、まあいっか精神",
    "几帳面でもないし、適当でもない、中間",
  ],
  low: [
    "計画？その場のノリでなんとかなる",
    "「とりあえずやってみる」で失敗も多い",
    "締め切りギリギリで焦るタイプ",
  ],
  "very-low": [
    "計画とか無理。自由に生きたい",
    "予定は未定。その日の気分で決める",
    "部屋は散らかってるけど、本人は困ってない",
  ],
};

// 協調性の文章バリエーション
const agreeablenessTexts = {
  "very-high": [
    "「みんなが楽しいのが一番」が口癖",
    "相手の気持ち考えすぎて、自分の意見後回しにしがち",
    "喧嘩とか対立マジ無理。平和主義者",
  ],
  high: [
    "人に優しい。困ってる人見ると放っておけない",
    "「大丈夫？」ってよく聞かれる。心配性が顔に出る",
    "争いより話し合い派",
  ],
  medium: [
    "優しくもあるけど、言うべきことは言う",
    "空気は読むけど、合わせすぎない",
    "協調性とマイペースのバランス型",
  ],
  low: [
    "自分の意見ははっきり言う。遠慮しない",
    "合わない人とは無理に付き合わない",
    "正直が一番。思ったことは伝える派",
  ],
  "very-low": [
    "空気読むより、自分の意見を通したい",
    "「なんで合わせなきゃいけないの？」って思う",
    "競争心強め。負けるの嫌い",
  ],
};

// 神経症傾向の文章バリエーション
const neuroticismTexts = {
  "very-high": [
    "心配性の塊。「大丈夫かな」が口癖",
    "些細なことで不安になる。メンタル繊細系",
    "感情の波が激しい。めっちゃ落ち込むこともある",
  ],
  high: [
    "ストレス感じやすい。気にしすぎるとこある",
    "繊細で、細かいことに気づける。でも疲れる",
    "不安になりやすいけど、それが慎重さにもなる",
  ],
  medium: [
    "普通にストレスは感じる。でも対処できる",
    "たまに落ち込むけど、すぐ立ち直る",
    "メンタル安定してる方だと思う",
  ],
  low: [
    "ストレスに強い。あんまり悩まない",
    "おおらか。細かいこと気にしない",
    "「まあ、なんとかなるっしょ」精神",
  ],
  "very-low": [
    "メンタル鋼。何があっても動じない",
    "ストレス？何それ？って感じ",
    "いつも冷静。感情的にならない",
  ],
};

// 恋愛傾向の文章
function generateLoveTendency(scores: BigFiveScores, typeId: string): string[] {
  const texts: string[] = [];
  const eIntensity = getIntensity(scores.extraversion);
  const cIntensity = getIntensity(scores.conscientiousness);
  const aIntensity = getIntensity(scores.agreeableness);

  // 外向性に基づく恋愛傾向
  if (eIntensity === "very-high" || eIntensity === "high") {
    texts.push(selectVariation(["友達に即報告。恋愛相談しまくる", "デートは人がいる場所がいい。静かすぎると落ち着かない"], typeId + "e1"));
  } else if (eIntensity === "very-low" || eIntensity === "low") {
    texts.push(selectVariation(["恋愛は人に話さない。一人で抱え込むタイプ", "デートは静かな場所がいい。人混み苦手"], typeId + "e2"));
  }

  // 誠実性に基づく恋愛傾向
  if (cIntensity === "very-high" || cIntensity === "high") {
    texts.push(selectVariation(["デートプランは事前にリサーチ。失敗したくない", "記念日は絶対忘れない。カレンダーに登録してる"], typeId + "c1"));
  } else if (cIntensity === "very-low" || cIntensity === "low") {
    texts.push(selectVariation(["デートプランは「とりあえず会ってから考える」派", "記念日？忘れがち。サプライズは苦手"], typeId + "c2"));
  }

  // 協調性に基づく恋愛傾向
  if (aIntensity === "very-high" || aIntensity === "high") {
    texts.push(selectVariation(["「どこ行きたい？」って聞くけど、自分の意見は言えない", "相手が楽しんでるか気にしすぎて、自分の気持ち忘れがち"], typeId + "a1"));
    texts.push(selectVariation(["好きな人の予定に合わせすぎて自分の予定が消える", "「なんでもいいよ」って言うけど、本当は希望ある"], typeId + "a2"));
  } else if (aIntensity === "very-low" || aIntensity === "low") {
    texts.push(selectVariation(["「ここ行きたい」ってはっきり言う。遠慮しない", "自分の時間も大事。相手に合わせすぎない"], typeId + "a3"));
  }

  return texts.slice(0, 4);
}

// 求める相手の条件
function generateIdealPartner(scores: BigFiveScores): string[] {
  const ideals: string[] = [];
  const eIntensity = getIntensity(scores.extraversion);
  const oIntensity = getIntensity(scores.openness);
  const cIntensity = getIntensity(scores.conscientiousness);
  const aIntensity = getIntensity(scores.agreeableness);

  if (eIntensity === "very-high" || eIntensity === "high") {
    ideals.push("社交的なあなたを理解して、でも一人の時間も作ってくれる人");
  } else if (eIntensity === "very-low" || eIntensity === "low") {
    ideals.push("あなたの一人時間を理解してくれる人。毎日連絡しなくても平気な距離感");
  }

  if (oIntensity === "very-high" || oIntensity === "high") {
    ideals.push("新しいこと一緒に楽しんでくれる人。冒険を共有できる相手");
  } else {
    ideals.push("安定した日常を大切にできる人。変化を求めすぎない相手");
  }

  if (cIntensity === "very-low" || cIntensity === "low") {
    ideals.push("優柔不断なあなたをリードしてくれるけど、押し付けない人");
  } else if (cIntensity === "very-high" || cIntensity === "high") {
    ideals.push("ちゃんと計画立ててくれる。もしくは一緒に計画できる人");
  }

  if (aIntensity === "very-high" || aIntensity === "high") {
    ideals.push("あなたの優しさを利用せず、ちゃんと対等でいてくれる人");
    ideals.push("決断力があって、でも相手の意見も尊重してくれる人");
  }

  return ideals.slice(0, 4);
}

// 要注意ポイント
function generateWarnings(scores: BigFiveScores): string[] {
  const warnings: string[] = [];
  const eIntensity = getIntensity(scores.extraversion);
  const oIntensity = getIntensity(scores.openness);
  const cIntensity = getIntensity(scores.conscientiousness);
  const aIntensity = getIntensity(scores.agreeableness);
  const nIntensity = getIntensity(scores.neuroticism);

  if (eIntensity === "very-high") {
    warnings.push("【燃え尽き注意】人といすぎて疲れてることに気づかない。定期的に一人時間を確保しろ");
  } else if (eIntensity === "very-low") {
    warnings.push("【孤立注意】一人が好きすぎて、気づいたら友達いない。たまには連絡しろ");
  }

  if (oIntensity === "very-high") {
    warnings.push("【飽き性注意】色々手を出しすぎて、どれも中途半端。「これだけは」を決めろ");
  } else if (oIntensity === "very-low") {
    warnings.push("【成長停滞注意】快適ゾーンに居続けると成長止まる。たまには冒険しろ");
  }

  if (cIntensity === "very-high") {
    warnings.push("【完璧主義注意】「完璧じゃないとダメ」で何も始められない。60点でも出せ");
  } else if (cIntensity === "very-low") {
    warnings.push("【計画性ゼロ注意】締め切りギリギリで焦る。せめて予定は確認しろ");
  }

  if (aIntensity === "very-high") {
    warnings.push("【都合のいい人注意】優しさを悪用されることも。「NO」を言う練習をしろ");
    warnings.push("【自己主張不足注意】自分の意見を言わないと、後で爆発する可能性あり");
  } else if (aIntensity === "very-low") {
    warnings.push("【頑固注意】「自分のやり方」に固執しすぎ。他人の意見も聞け");
  }

  if (nIntensity === "very-high") {
    warnings.push("【メンタル注意】心配しすぎ。たまには「なんとかなる」って思え");
  }

  return warnings.slice(0, 4);
}

// メインの診断文生成関数
export function generatePersonalityNarrative(
  scores: BigFiveScores,
  personalityType: PersonalityTypeDefinition,
): {
  title: string;
  subtitle: string;
  thinkingStyle: string[];
  communicationStyle: string[];
  loveTendency: string[];
  idealPartner: string[];
  warnings: string[];
  strengths: string[];
} {
  const typeId = personalityType.id;
  const label = getTogelLabel(typeId);

  const eIntensity = getIntensity(scores.extraversion);
  const oIntensity = getIntensity(scores.openness);
  const cIntensity = getIntensity(scores.conscientiousness);
  const aIntensity = getIntensity(scores.agreeableness);
  const nIntensity = getIntensity(scores.neuroticism);

  return {
    title: label,
    subtitle: personalityType.typeName,
    thinkingStyle: [
      selectVariation(opennessTexts[oIntensity], typeId + "o"),
      selectVariation(conscientiousnessTexts[cIntensity], typeId + "c"),
    ],
    communicationStyle: [
      selectVariation(extraversionTexts[eIntensity], typeId + "e"),
      selectVariation(agreeablenessTexts[aIntensity], typeId + "a"),
      selectVariation(neuroticismTexts[nIntensity], typeId + "n"),
    ],
    loveTendency: generateLoveTendency(scores, typeId),
    idealPartner: generateIdealPartner(scores),
    warnings: generateWarnings(scores),
    strengths: personalityType.characteristics.strengths,
  };
}
