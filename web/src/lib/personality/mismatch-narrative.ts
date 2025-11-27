import { BigFiveScores, MatchingProfile, PersonalityTypeDefinition } from "@/types/diagnosis";
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

// 相手の「ヤバい」特徴を生成
export function generateMismatchProfilePersonality(
  profile: MatchingProfile,
  profileScores: BigFiveScores,
  profileType: PersonalityTypeDefinition,
): {
  dangerousTraits: string[];
  incompatibleValues: string[];
  communicationNightmare: string;
} {
  const traits: string[] = [];
  const values: string[] = [];

  const eIntensity = getIntensity(profileScores.extraversion);
  const oIntensity = getIntensity(profileScores.openness);
  const cIntensity = getIntensity(profileScores.conscientiousness);
  const aIntensity = getIntensity(profileScores.agreeableness);
  const nIntensity = getIntensity(profileScores.neuroticism);

  // 極端な特徴を強調
  if (eIntensity === "very-high") {
    traits.push("人といないと死ぬタイプ。一人の時間を理解できない");
    traits.push("24時間365日連絡を求めてくる可能性大");
  } else if (eIntensity === "very-low") {
    traits.push("完全孤立型。デート中も無言で携帯いじってそう");
    traits.push("「なんで会わなきゃいけないの？」が本音");
  }

  if (cIntensity === "very-high") {
    traits.push("計画通りにいかないとブチギレる。柔軟性ゼロ");
    traits.push("5分の遅刻で信頼関係崩壊するレベルの几帳面さ");
  } else if (cIntensity === "very-low") {
    traits.push("約束？何それ？ドタキャンの常習犯");
    traits.push("計画性皆無。行き当たりばったりで周囲が疲弊");
  }

  if (aIntensity === "very-low") {
    traits.push("自分の意見が絶対。相手の話は聞かない");
    traits.push("喧嘩になったら絶対に謝らない頑固タイプ");
  } else if (aIntensity === "very-high") {
    traits.push("優しすぎて決断できない。優柔不断の極み");
    traits.push("「なんでもいいよ」しか言わない。主体性ゼロ");
  }

  if (nIntensity === "very-high") {
    traits.push("些細なことで不安爆発。メンタル不安定すぎる");
    traits.push("毎日「大丈夫？」って確認しないと不安になる依存体質");
  }

  // 仕事から
  if (profile.job) {
    traits.push(`${profile.job}というキャリア。価値観が根本的に違う`);
  }

  // 価値観の不一致
  if (oIntensity === "very-high") {
    values.push("新しいこと大好き。安定を求める人とは絶対に合わない");
  } else if (oIntensity === "very-low") {
    values.push("変化を極端に嫌う。冒険心ある人とは衝突確定");
  }

  if (cIntensity === "very-high") {
    values.push("ルール至上主義。自由な人とは価値観が真逆");
  } else if (cIntensity === "very-low") {
    values.push("自由すぎて無責任。真面目な人とは水と油");
  }

  values.push("生き方の根本が違う。妥協点が見つからない");

  // コミュニケーションの悪夢
  let commNightmare = "";
  if (aIntensity === "very-low" && eIntensity === "very-high") {
    commNightmare = "攻撃的で声がデカい。話し合いが喧嘩にしかならない";
  } else if (aIntensity === "very-high" && eIntensity === "very-low") {
    commNightmare = "何も言わずに溜め込む。ある日突然爆発する地雷タイプ";
  } else if (nIntensity === "very-high") {
    commNightmare = "感情的になりすぎて話が通じない。建設的な会話が不可能";
  } else {
    commNightmare = "話し方が根本的に合わない。会話がストレス";
  }

  return {
    dangerousTraits: traits.slice(0, 5),
    incompatibleValues: values.slice(0, 3),
    communicationNightmare: commNightmare,
  };
}

// なぜミスマッチなのか？超厳しい理由
export function generateMismatchReason(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
  profile: MatchingProfile,
  mismatchScore: number,
): {
  reasons: Array<{ title: string; userTrait: string; profileTrait: string; disaster: string }>;
} {
  const reasons: Array<{ title: string; userTrait: string; profileTrait: string; disaster: string }> = [];

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

  // 1. 外向性の極端な不一致
  const eDiff = Math.abs(userE - profileE);
  if (eDiff >= 2.5) {
    if (userE >= 4.5 && profileE <= 2.0) {
      reasons.push({
        title: "エネルギーレベルが異次元レベルで不一致",
        userTrait: "あなた：人といないと死ぬ。毎日誰かと会いたい",
        profileTrait: "相手：一人の時間が命。人といると疲労困憊",
        disaster:
          "あなたが「今日も会おう！」→相手が「もう無理…」で破綻確定。3日で別れるか、相手がメンタル崩壊する未来しか見えない。友達からも「あの2人、大丈夫？」って心配される。",
      });
    } else if (userE <= 2.0 && profileE >= 4.5) {
      reasons.push({
        title: "社交性のギャップで周囲を巻き込む大惨事",
        userTrait: "あなた：一人が好き。人と会うのは月1で十分",
        profileTrait: "相手：パリピ。毎週末イベント参加したい",
        disaster:
          "相手が「友達も呼んで飲もうよ！」→あなたが無言で固まる。相手の友達全員から「感じ悪い」認定される。相手は「なんで付き合ってるの？」と周囲に詰められ、あなたは「人付き合い疲れた…」で病む。最悪のパターン。",
      });
    }
  }

  // 2. 誠実性の極端な不一致
  const cDiff = Math.abs(userC - profileC);
  if (cDiff >= 2.5) {
    if (userC >= 4.5 && profileC <= 2.0) {
      reasons.push({
        title: "計画性の違いで毎日がストレス地獄",
        userTrait: "あなた：計画通りに進めないと不安で死ぬ。時間厳守絶対",
        profileTrait: "相手：計画？知らん。その場のノリで生きる。遅刻常習犯",
        disaster:
          "デートの待ち合わせで相手が30分遅刻→あなたブチギレ→相手「そんなに怒る？」→喧嘩→気まずさMAX。これが毎回。あなたはストレスで胃潰瘍、相手は「めんどくさい」で逃げたくなる。周囲の友人も「別れた方がいいよ」って言い出す。",
      });
    } else if (userC <= 2.0 && profileC >= 4.5) {
      reasons.push({
        title: "ルーズさVS完璧主義の終わりなき戦争",
        userTrait: "あなた：計画とか無理。自由に生きたい",
        profileTrait: "相手：予定は1ヶ月前に決める。5分遅刻で信用失う",
        disaster:
          "あなたが待ち合わせ忘れる→相手が激怒→あなた「そんなに怒る？」→相手「ありえない」→信頼関係崩壊。相手はあなたを「無責任」認定、あなたは相手を「神経質すぎ」認定。修復不可能。この2人が付き合うと、周囲が調整役で疲弊する。",
      });
    }
  }

  // 3. 協調性の極端な不一致
  const aDiff = Math.abs(userA - profileA);
  if (aDiff >= 2.5) {
    if (userA >= 4.5 && profileA <= 2.0) {
      reasons.push({
        title: "優しさVS自己主張の殺伐バトル",
        userTrait: "あなた：争いたくない。平和主義。相手に合わせたい",
        profileTrait: "相手：自分の意見が絶対。譲歩しない。勝つまで戦う",
        disaster:
          "あなたが我慢しまくる→限界突破で爆発→相手が「急に何？」→あなた号泣→相手「めんどくさ」→破局。もしくはあなたが永遠に我慢し続けて心が死ぬ。どっちにしても地獄。友人全員が「あの人と別れなよ」って心配する。",
      });
    } else if (userA <= 2.0 && profileA >= 4.5) {
      reasons.push({
        title: "攻撃性VS受動性で相手がメンタル崩壊",
        userTrait: "あなた：自分の意見が優先。相手に合わせるとか無理",
        profileTrait: "相手：優しすぎて何も言えない。我慢の人生",
        disaster:
          "あなたがガンガン意見を押し付ける→相手が我慢→相手のメンタルが壊れる→ある日突然「もう無理」で逃げられる。もしくは相手の友人が「別れさせ隊」結成して介入してくる。この組み合わせは相手を病ませる。",
      });
    }
  }

  // 4. 神経症傾向の極端な不一致
  const nDiff = Math.abs(userN - profileN);
  if (nDiff >= 2.5) {
    if (userN >= 4.5 && profileN <= 2.0) {
      reasons.push({
        title: "不安症VS鈍感の噛み合わなさが限界突破",
        userTrait: "あなた：心配性。毎日「大丈夫？」って確認したい",
        profileTrait: "相手：超マイペース。心配とか理解できない",
        disaster:
          "あなたが不安で連絡しまくる→相手「なんでそんなに心配するの？」→あなた「心配だから！」→相手「めんどくさい」→あなた「冷たい！」→喧嘩→破局。もしくはあなたの不安が悪化して病む。相手の友人も「あいつ大変そう」って同情される。",
      });
    } else if (userN <= 2.0 && profileN >= 4.5) {
      reasons.push({
        title: "鈍感力VS繊細さのギャップで相手が病む",
        userTrait: "あなた：基本のんき。細かいこと気にしない",
        profileTrait: "相手：超繊細。些細なことで不安爆発",
        disaster:
          "相手が不安で連絡→あなたが気づかない→相手「無視された…」→メンタル崩壊→あなた「え、何があった？」→相手「もういい」→破局。あなたの鈍感さが相手を追い詰める。周囲から「もっと気を使ってあげなよ」って説教される。",
      });
    }
  }

  // 5. 開放性の極端な不一致
  const oDiff = Math.abs(userO - profileO);
  if (oDiff >= 2.5) {
    if (userO >= 4.5 && profileO <= 2.0) {
      reasons.push({
        title: "冒険家VS安定志向の価値観衝突",
        userTrait: "あなた：新しいこと大好き。ルーティンは死",
        profileTrait: "相手：変化が怖い。同じことの繰り返しが安心",
        disaster:
          "あなた「旅行行こう！」→相手「いつもの場所がいい」→あなた「つまらん」→相手「安心できない」→価値観の違いで大喧嘩。お互いを否定し合う地獄。友達からも「その2人、合ってないよね」って言われる。",
      });
    }
  }

  // スコアに応じた総評
  if (mismatchScore <= 20) {
    reasons.push({
      title: "【総評】この組み合わせは宇宙の法則に反する",
      userTrait: `あなた：${getTogelLabel(userType.id)}`,
      profileTrait: `相手：${getTogelLabel(profileType.id)}`,
      disaster:
        "この2人が付き合ったら、周囲の友人1000人以上が巻き込まれて疲弊する可能性がある。喧嘩の仲裁役、愚痴の聞き役、破局後のケア役…周りが休まる日がない。人類の平和のために、この組み合わせは避けるべき。AIの総合判定：絶対に無理。",
    });
  } else if (mismatchScore <= 30) {
    reasons.push({
      title: "【総評】この相性は人間関係の大惨事を引き起こす",
      userTrait: `あなた：${getTogelLabel(userType.id)}`,
      profileTrait: `相手：${getTogelLabel(profileType.id)}`,
      disaster:
        "付き合っても3ヶ月以内に破局確定。その間に周囲の友人が巻き込まれて疲弊。破局後も「あの2人何だったの？」って語り継がれる黒歴史になる。避けるべき。",
    });
  } else {
    reasons.push({
      title: "【総評】この組み合わせは長期的に破綻する",
      userTrait: `あなた：${getTogelLabel(userType.id)}`,
      profileTrait: `相手：${getTogelLabel(profileType.id)}`,
      disaster:
        "最初は「なんとかなる」と思うかもしれないが、時間が経つほどストレスが蓄積。どちらかが我慢しまくるか、喧嘩しまくるか。どっちにしてもしんどい未来しか見えない。",
    });
  }

  return { reasons: reasons.slice(0, 5) };
}

// 付き合ったら起こる最悪のシナリオ
export function generateDisasterScenario(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  profile: MatchingProfile,
): {
  horrorScenarios: string[];
  warnings: string[];
} {
  const scenarios: string[] = [];
  const warnings: string[] = [];

  const eDiff = Math.abs(userScores.extraversion - profileScores.extraversion);
  const cDiff = Math.abs(userScores.conscientiousness - profileScores.conscientiousness);
  const aDiff = Math.abs(userScores.agreeableness - profileScores.agreeableness);

  // 地獄のシナリオ
  if (eDiff >= 2.5) {
    scenarios.push("毎週末の予定で大喧嘩。友達と会うVS二人で過ごすで永遠に揉める");
  }

  if (cDiff >= 2.5) {
    scenarios.push("待ち合わせの度にブチギレ。時間感覚の違いで信頼関係崩壊");
  }

  if (aDiff >= 2.5) {
    scenarios.push("意見の対立で毎日喧嘩。どっちかが我慢しまくって病む");
  }

  scenarios.push("周囲の友人が「別れろ」って言い出す。それでも意地で付き合い続けて地獄");
  scenarios.push("SNSで愚痴りまくって「あの2人、また喧嘩してる」って有名になる");

  // 警告
  warnings.push("付き合うと周囲を巻き込む。友達が疲弊する");
  warnings.push("破局後も「あの時は地獄だった」って語り継がれる黒歴史になる");
  warnings.push("精神的ダメージが大きすぎて、次の恋愛に影響する");
  warnings.push("この人と付き合うくらいなら、一人でいた方が100倍マシ");

  return {
    horrorScenarios: scenarios.slice(0, 5),
    warnings: warnings.slice(0, 4),
  };
}

// キャッチフレーズ（ネガティブ版）
export function generateMismatchCatchphrase(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  mismatchScore: number,
): string {
  const catchphrases: string[] = [];

  if (mismatchScore <= 15) {
    catchphrases.push("宇宙の法則に反する組み合わせ");
    catchphrases.push("この2人が付き合ったら世界が終わる");
    catchphrases.push("史上最悪の相性。絶対に避けるべき");
  } else if (mismatchScore <= 25) {
    catchphrases.push("周囲を巻き込む大惨事の予感");
    catchphrases.push("3ヶ月以内に破局確定の組み合わせ");
    catchphrases.push("友達全員が心配する相性の悪さ");
  } else {
    catchphrases.push("長期的に破綻する運命");
    catchphrases.push("我慢の連続で心が死ぬ組み合わせ");
    catchphrases.push("ストレスしか生まない相性");
  }

  const eDiff = Math.abs(userScores.extraversion - profileScores.extraversion);
  if (eDiff >= 2.5) {
    catchphrases.push("エネルギーレベルが異次元。会話が成立しない");
  }

  return catchphrases[Math.floor(Math.random() * catchphrases.length)];
}

// 絶対にやってはいけないこと
export function generateAbsolutelyNotToDo(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
): string[] {
  const nots: string[] = [];

  nots.push("付き合わない。これが最善策");
  nots.push("友達の忠告を無視して突き進まない");
  nots.push("「なんとかなる」精神で突っ込まない。絶対に無理");
  nots.push("この人に告白しない。時間の無駄");

  return nots.slice(0, 4);
}
