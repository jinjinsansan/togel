import { BigFiveScores, MatchingProfile } from "@/types/diagnosis";

type TraitIntensity = "very-low" | "low" | "medium" | "high" | "very-high";

function getIntensity(score: number): TraitIntensity {
  if (score >= 4.5) return "very-high";
  if (score >= 3.8) return "high";
  if (score >= 2.8) return "medium";
  if (score >= 2.0) return "low";
  return "very-low";
}

// プロフィールから人物像を生成
export function generateProfilePersonality(
  profile: MatchingProfile,
  profileScores: BigFiveScores,
): {
  personalityTraits: string[];
  values: string[];
  communicationStyle: string;
} {
  const traits: string[] = [];
  const values: string[] = [];

  const eIntensity = getIntensity(profileScores.extraversion);
  const oIntensity = getIntensity(profileScores.openness);
  const cIntensity = getIntensity(profileScores.conscientiousness);
  const aIntensity = getIntensity(profileScores.agreeableness);
  const nIntensity = getIntensity(profileScores.neuroticism);

  // 趣味から人物像
  if (profile.hobbies) {
    const hobby = profile.hobbies;
    if (hobby.includes("フィルム") || hobby.includes("カメラ")) {
      traits.push(`${hobby}が趣味。デジタルより「手触り感」重視`);
    } else if (hobby.includes("読書") || hobby.includes("本")) {
      traits.push(`${hobby}好き。インプット重視の知的タイプ`);
    } else if (hobby.includes("サウナ")) {
      traits.push(`サウナで整うのが日課。メンタル管理ガチ勢`);
    } else if (hobby.includes("アウトドア") || hobby.includes("キャンプ")) {
      traits.push(`${hobby}派。自然の中でリフレッシュするタイプ`);
    } else {
      traits.push(`${hobby}に時間を使う。好きなことには全力投球`);
    }
  }

  // 仕事から人物像
  if (profile.job) {
    if (profile.job.includes("経営")) {
      traits.push(`${profile.job}。数字も管理もちゃんとできる系`);
    } else if (profile.job.includes("エンジニア")) {
      traits.push(`${profile.job}。論理的思考が得意`);
    } else if (profile.job.includes("デザイナー")) {
      traits.push(`${profile.job}。センスとこだわりがある`);
    } else {
      traits.push(`${profile.job}として働く。仕事に誇りを持ってる`);
    }
  }

  // 外向性から
  if (eIntensity === "very-low" || eIntensity === "low") {
    traits.push("人と話すのは好きだけど、一人の時間がないと死ぬタイプ");
  } else if (eIntensity === "very-high" || eIntensity === "high") {
    traits.push("人といるのが好き。社交的で友達多め");
  }

  // 神経症傾向から
  if (nIntensity === "very-low" || nIntensity === "low") {
    traits.push("感情的にならない。冷静。でも冷たいわけじゃない");
  } else if (nIntensity === "high" || nIntensity === "very-high") {
    traits.push("繊細で感受性が豊か。相手の気持ちをよく察する");
  }

  // 価値観
  if (oIntensity === "high" || oIntensity === "very-high") {
    values.push("新しいことに挑戦するのが好き。変化を楽しむ");
  } else {
    values.push("質より量派。安いチェーン店より、ちょっと高くても良い店");
  }

  if (cIntensity === "high" || cIntensity === "very-high") {
    values.push("計画はちゃんと立てる。突然の予定変更は苦手");
  } else {
    values.push("柔軟に対応できる。その場のノリも大事にする");
  }

  if (profile.favoriteThings) {
    values.push(`「${profile.favoriteThings}」を大事にする。自分らしさ重視`);
  }

  // コミュニケーションスタイル
  let commStyle = "";
  if (aIntensity === "very-high" || aIntensity === "high") {
    if (eIntensity === "high" || eIntensity === "very-high") {
      commStyle = "明るく優しい。誰とでも仲良くなれるタイプ";
    } else {
      commStyle = "穏やかで優しい。じっくり話を聞いてくれる";
    }
  } else {
    if (nIntensity === "low" || nIntensity === "very-low") {
      commStyle = "率直で論理的。はっきり意見を言う";
    } else {
      commStyle = "正直。思ったことは伝える派";
    }
  }

  return {
    personalityTraits: traits.slice(0, 5),
    values: values.slice(0, 3),
    communicationStyle: commStyle,
  };
}

// なぜマッチしたか？の詳細説明を生成
export function generateMatchingReason(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
): {
  reasons: Array<{ title: string; userTrait: string; profileTrait: string; why: string }>;
} {
  const reasons: Array<{ title: string; userTrait: string; profileTrait: string; why: string }> = [];

  const userE = userScores.extraversion;
  const profileE = profileScores.extraversion;
  const userO = userScores.openness;
  const profileO = profileScores.openness;
  const userC = userScores.conscientiousness;
  const profileC = profileScores.conscientiousness;
  const userA = userScores.agreeableness;
  const profileA = profileScores.agreeableness;
  const userN = userScores.neuroticism;
  const profileN = profileScores.neuroticism;

  // 1. 外向性の組み合わせ
  const eDiff = Math.abs(userE - profileE);
  if (eDiff >= 1.5) {
    const userEText = userE >= 4 ? "人といるの大好き" : "一人時間が必須";
    const profileEText = profileE >= 4 ? "社交的で活発" : "一人時間を大切にする";
    reasons.push({
      title: "一人時間の理解が深い関係",
      userTrait: `あなた：${userEText}${userE >= 4 ? "だけど、たまに一人になりたい（本人気づいてない）" : ""}`,
      profileTrait: `相手：${profileEText}タイプ`,
      why:
        userE >= 4
          ? "相手の「今日は一人でいたい」を自然に尊重できる。逆に、あなたが友達と遊びに行く時、相手は「行ってらっしゃい」って言える。お互いに縛らない、ちょうどいい距離感。"
          : "相手が社交的に外出してる間、あなたは一人時間を満喫。Win-Winな関係。",
    });
  } else if (eDiff <= 0.8) {
    if (userE >= 3.5) {
      reasons.push({
        title: "一緒に楽しめるエネルギー",
        userTrait: "あなた：人といるのが好き",
        profileTrait: "相手：同じく社交的",
        why: "どっちもアクティブ。一緒に出かけたり、友達と遊んだり、エネルギッシュに過ごせる。",
      });
    } else {
      reasons.push({
        title: "静かな時間を共有できる",
        userTrait: "あなた：一人時間が大事",
        profileTrait: "相手：同じく内向的",
        why: "お互い一人の時間を理解し合える。無理に外出しなくても、家でまったりが最高。",
      });
    }
  }

  // 2. 誠実性の組み合わせ
  const cDiff = Math.abs(userC - profileC);
  if (cDiff >= 1.5) {
    if (userC < profileC) {
      reasons.push({
        title: "あなたの「計画できない」を相手が補完",
        userTrait: "あなた：「とりあえずやってみる」で計画は苦手",
        profileTrait: "相手：「ちゃんと計画しないと不安」タイプ",
        why: "あなたが「これやりたい！」って言うと、相手が「じゃあこういう手順で」って整理してくれる。あなたのアイデアを相手が現実に落とし込む理想の分業ができる。",
      });
    } else {
      reasons.push({
        title: "あなたの計画を相手が柔軟に受け入れる",
        userTrait: "あなた：計画通りに進めたい",
        profileTrait: "相手：柔軟に対応できる",
        why: "あなたが立てた計画を、相手が「いいね！」って受け入れてくれる。優柔不断な相手にイライラしない。",
      });
    }
  }

  // 3. 協調性の組み合わせ
  if (userA >= 4.0 && profileA < 3.5) {
    reasons.push({
      title: "あなたの優柔不断を相手が決めてくれる",
      userTrait: "あなた：「どうしよう」「相手に合わせたい」で決められない",
      profileTrait: "相手：自分の意見ははっきり持ってる。決断できる",
      why: "「どこ行く？」「なんでもいいよ」問題が発生しない。相手が「ここに行こう」って決めてくれるから、あなたは楽。でも相手は押し付けない。あなたの意見もちゃんと聞いてくれる。",
    });
  }

  // 4. 開放性の組み合わせ
  const oDiff = Math.abs(userO - profileO);
  if (oDiff >= 1.3) {
    reasons.push({
      title: "新しさと安定のバランスが絶妙",
      userTrait: userO >= 4 ? "あなた：新しいこと大好き。変化を楽しむ" : "あなた：慣れたルーティンが好き。安定志向",
      profileTrait: profileO >= 4 ? "相手：好奇心旺盛。冒険好き" : "相手：安定した日常を大切にする",
      why:
        userO >= 4
          ? "あなたが「こんなの見つけた！」って持ってくる刺激を、相手は新鮮に感じる。相手の安定感が、あなたの「飽き性で続かない」を支えてくれる。"
          : "相手が「これやってみない？」って提案してくれて、あなたの世界が広がる。でもあなたの安定感が、相手の暴走を止めてくれる。",
    });
  }

  // 5. 神経症傾向の組み合わせ
  const nDiff = Math.abs(userN - profileN);
  if (nDiff >= 1.5) {
    if (userN >= 4.0) {
      reasons.push({
        title: "相手の冷静さがあなたを支える",
        userTrait: "あなた：心配性。不安になりやすい",
        profileTrait: "相手：冷静で落ち着いてる。ストレスに強い",
        why: "あなたが不安な時、相手が「大丈夫だよ」って落ち着かせてくれる。相手の冷静さが、あなたの安心材料になる。",
      });
    } else {
      reasons.push({
        title: "あなたの安定感が相手を支える",
        userTrait: "あなた：冷静で落ち着いてる",
        profileTrait: "相手：繊細で感受性が豊か",
        why: "相手が不安な時、あなたが「大丈夫」って支えられる。あなたの安定感が、相手の拠り所になる。",
      });
    }
  }

  return { reasons: reasons.slice(0, 4) };
}

// 付き合ったらこんな感じ
export function generateRelationshipPreview(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  profile: MatchingProfile,
): {
  goodPoints: string[];
  warnings: string[];
} {
  const good: string[] = [];
  const warnings: string[] = [];

  const eDiff = Math.abs(userScores.extraversion - profileScores.extraversion);
  // 良いところ
  if (eDiff >= 1.3) {
    good.push("毎日LINEしなくても平気。お互い自分の時間を尊重できる");
  }

  if (userScores.conscientiousness < 3.5 && profileScores.conscientiousness >= 4.0) {
    good.push(`相手が「これどう？」って提案してくれるから、優柔不断なあなたが楽`);
  }

  if (profile.job) {
    good.push(`${profile.job}として働く相手を見て「かっこいい」って思える`);
  }

  if (profile.hobbies) {
    good.push(`${profile.hobbies}教えてもらったり、新しい趣味が増える`);
  }

  // 気をつけること
  if (userScores.agreeableness >= 4.0 && profileScores.agreeableness < 3.5) {
    warnings.push("相手は「察して」が通じない。ちゃんと言葉で伝える必要あり");
  }

  if (userScores.extraversion >= 4.0 && profileScores.extraversion <= 2.5) {
    warnings.push("あなたが寂しがりすぎると、相手は距離を取りたくなるかも");
  }

  if (profileScores.neuroticism <= 2.5) {
    warnings.push("冷静な相手に「冷たい」って感じることがあるかも。悪気はないよ");
  }

  if (profileScores.conscientiousness >= 4.0) {
    warnings.push("相手は時間厳守タイプ。遅刻は信用失うから注意");
  }

  return {
    goodPoints: good.slice(0, 4),
    warnings: warnings.slice(0, 4),
  };
}

// 最初のデート提案
export function generateFirstDate(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  profile: MatchingProfile,
): {
  recommendations: string[];
  conversationTopics: string[];
  ngActions: string[];
} {
  const recommendations: string[] = [];
  const topics: string[] = [];
  const ngActions: string[] = [];

  // おすすめデート
  if (profile.job.includes("カフェ") || profile.job.includes("バー")) {
    recommendations.push(`${profile.job}に行って、仕事終わりに軽く話す`);
    recommendations.push("→ 相手の「素」が見られる。働いてる姿を見ると人柄がわかる");
  } else if (profileScores.extraversion <= 2.8) {
    recommendations.push("静かなカフェで1対1でじっくり話す");
    recommendations.push("→ 相手は大人数苦手。最初は二人きりで");
  } else {
    recommendations.push("カジュアルな場所で気軽に会う");
    recommendations.push("→ 肩肘張らずに、リラックスして話せる");
  }

  // 会話トピック
  if (profile.hobbies) {
    topics.push(`「${profile.hobbies}」の魅力について教えて`);
    topics.push(`「${profile.hobbies}」に興味を持ったきっかけは？`);
  }

  if (profile.job) {
    topics.push(`「${profile.job}」って大変じゃない？どうやって始めたの？`);
  }

  topics.push("休日はどんな風に過ごすことが多い？");

  // NG行動
  if (userScores.agreeableness >= 4.0) {
    ngActions.push("「いつでもいいよ〜」連発（相手がイラッとする）");
  }

  if (profileScores.conscientiousness >= 4.0) {
    ngActions.push("遅刻（相手は時間厳守タイプ）");
  }

  if (profileScores.extraversion <= 2.8) {
    ngActions.push("最初から依存的な態度（重いって思われる）");
    ngActions.push("大人数で会おうとする（相手は1対1が好き）");
  }

  return {
    recommendations: recommendations.slice(0, 2),
    conversationTopics: topics.slice(0, 3),
    ngActions: ngActions.slice(0, 4),
  };
}
