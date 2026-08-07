import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifyInviteCode } from "@/lib/invite/code";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { generateDiagnosisResult } from "@/lib/matching/engine";
import { personalityTypes, getTogelLabel } from "@/lib/personality";
import {
  generateMismatchReason,
  generateDisasterScenario,
  generateMismatchCatchphrase,
  generateAbsolutelyNotToDo,
} from "@/lib/personality/mismatch-narrative";
import type { Answer, BigFiveScores } from "@/types/diagnosis";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 友達ミスマッチ診断（2人の「合わなさ」を告げる）
 *
 * GET /api/mismatch/pair?code=<招待コード>
 * - 招待コードは既存のHMAC署名付きコード（/api/invite/generate で発行）を流用
 * - code クエリがなければ ref_code cookie をフォールバックに使う
 * - 双方の最新診断からタイプ×Big5を突き合わせ、決定的（同じペアなら常に同じ）な
 *   ミスマッチ判定を返す。開示するのは相手の「タイプ」までで、Big5生スコアは返さない。
 */

type PairPerson = {
  nickname: string;
  typeId: string;
  typeName: string;
  emoji: string;
  catchphrase: string;
  togelLabel: string;
  tags: string[];
};

type DiagnosisSnapshot = {
  scores: BigFiveScores;
  type: ExtendedPersonalityTypeDefinition;
};

const findExtendedType = (typeId: string): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === typeId) ?? null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadLatestDiagnosis = async (admin: SupabaseClient<any>, userId: string): Promise<DiagnosisSnapshot | null> => {
  const { data } = await admin
    .from("diagnosis_results")
    .select("diagnosis_type, answers")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.answers) return null;

  const result = generateDiagnosisResult({
    diagnosisType: (data.diagnosis_type as "light" | "full") ?? "light",
    userGender: "male", // タイプ判定・スコア計算に性別は影響しない
    answers: data.answers as Answer[],
  });

  const extended = findExtendedType(result.personalityType.id);
  if (!extended) return null;

  return { scores: result.bigFiveScores, type: extended };
};

/** 同じペアなら常に同じ値を返す決定的ハッシュ（0-1） */
const pairSeed = (idA: string, idB: string): number => {
  const key = [idA, idB].sort().join(":");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash = hash & hash;
  }
  return (Math.abs(hash) % 1000) / 1000;
};

/** 相性スコア（0-100、低いほど最悪）を決定的に算出 */
const computeCompatibility = (
  a: DiagnosisSnapshot,
  b: DiagnosisSnapshot,
  seed: number,
): number => {
  const isBadPair =
    a.type.badCompatibleTypes.includes(b.type.id) || b.type.badCompatibleTypes.includes(a.type.id);
  const isGoodPair =
    a.type.compatibleTypes.includes(b.type.id) || b.type.compatibleTypes.includes(a.type.id);

  if (isBadPair) return Math.round(8 + seed * 12); // 8-20: 災害級
  if (isGoodPair) return Math.round(78 + seed * 17); // 78-95: 残念、相性いいです

  // 中間はBig5の距離から算出（trait差の平均: 0-4 → 相性 75-25 に写像）
  const traits: (keyof BigFiveScores)[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ];
  const avgDiff = traits.reduce((sum, t) => sum + Math.abs(a.scores[t] - b.scores[t]), 0) / traits.length;
  const base = 75 - (avgDiff / 4) * 50;
  return Math.round(Math.min(75, Math.max(25, base + (seed - 0.5) * 10)));
};

const verdictLabel = (compatibility: number): { level: string; comment: string } => {
  if (compatibility <= 20)
    return { level: "災害級", comment: "近づいてはいけない。これは警告です。" };
  if (compatibility <= 40)
    return { level: "要注意", comment: "覚悟なしで踏み込むと、お互いに消耗します。" };
  if (compatibility <= 60)
    return { level: "スリル満点", comment: "合わない部分を笑えるうちは大丈夫。笑えなくなったら終わり。" };
  if (compatibility <= 77)
    return { level: "意外とアリ", comment: "ミスマッチを期待した人には残念なお知らせです。" };
  return { level: "奇跡のペア", comment: "ごめんなさい、告げることがありません。相性いいです。" };
};

const toPairPerson = (nickname: string, snapshot: DiagnosisSnapshot): PairPerson => ({
  nickname,
  typeId: snapshot.type.id,
  typeName: snapshot.type.typeName,
  emoji: snapshot.type.emoji,
  catchphrase: snapshot.type.catchphrase,
  togelLabel: getTogelLabel(snapshot.type.id),
  tags: snapshot.type.tags,
});

/** 毒のあとの救い: それでも付き合っていくための取扱説明 */
const buildSurvivalGuide = (me: DiagnosisSnapshot, friend: DiagnosisSnapshot): string[] => [
  `相手（${friend.type.typeName}）の説明書: ${friend.type.characteristics.communication} — これは仕様です。直りません。`,
  `あなた（${me.type.typeName}）も他人のことは言えません: ${me.type.characteristics.growthAreas[0] ?? ""}`,
  `それでも付き合うなら: 相手の「${friend.type.characteristics.strengths[0] ?? ""}」だけ見る。他は見ない。`,
];

export const GET = async (request: Request) => {
  const cookieStore = await cookies();
  const supabaseAuth = createSupabaseRouteClient(cookieStore);
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? cookieStore.get("ref_code")?.value ?? null;
  const inviterUserId = verifyInviteCode(code);

  if (!inviterUserId) {
    return NextResponse.json({ message: "招待コードが無効です" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    // 自分の users レコード（auth_user_id → id、後方互換で id 直参照も許容）
    const { data: meRow } = await admin
      .from("users")
      .select("id, nickname")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    const { data: meFallback } = meRow
      ? { data: null }
      : await admin.from("users").select("id, nickname").eq("id", session.user.id).maybeSingle();

    const me = meRow ?? meFallback;
    if (!me) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (me.id === inviterUserId) {
      return NextResponse.json(
        { message: "自分自身との相性は診断できません（相性100%です）" },
        { status: 400 },
      );
    }

    const { data: inviter } = await admin
      .from("users")
      .select("id, nickname")
      .eq("id", inviterUserId)
      .maybeSingle();

    if (!inviter) {
      return NextResponse.json({ message: "招待した相手が見つかりません" }, { status: 404 });
    }

    const [meDiag, friendDiag] = await Promise.all([
      loadLatestDiagnosis(admin, me.id),
      loadLatestDiagnosis(admin, inviter.id),
    ]);

    if (!meDiag) {
      return NextResponse.json({ message: "先に診断を受けてください", reason: "self-no-diagnosis" }, { status: 409 });
    }
    if (!friendDiag) {
      return NextResponse.json(
        { message: "相手がまだ診断を受けていません", reason: "friend-no-diagnosis" },
        { status: 409 },
      );
    }

    const seed = pairSeed(me.id, inviter.id);
    const compatibility = computeCompatibility(meDiag, friendDiag, seed);
    const mismatchScore = 100 - compatibility;
    const verdict = verdictLabel(compatibility);
    const isMismatch = compatibility <= 60;

    // 既存のミスマッチナラティブエンジンを流用（低compatibility = 最悪、の意味論も一致）
    const { reasons } = generateMismatchReason(
      meDiag.scores,
      friendDiag.scores,
      meDiag.type,
      friendDiag.type,
      compatibility,
    );

    return NextResponse.json({
      me: toPairPerson(me.nickname ?? "あなた", meDiag),
      friend: toPairPerson(inviter.nickname ?? "友達", friendDiag),
      verdict: {
        compatibility,
        mismatchScore,
        level: verdict.level,
        comment: verdict.comment,
        isMismatch,
        catchphrase: isMismatch
          ? generateMismatchCatchphrase(meDiag.scores, friendDiag.scores, compatibility)
          : null,
      },
      reasons: isMismatch ? reasons.slice(0, 3) : [],
      disasterScenario: isMismatch ? generateDisasterScenario(meDiag.scores, friendDiag.scores) : null,
      absolutelyNotToDo: compatibility <= 20 ? generateAbsolutelyNotToDo() : [],
      survivalGuide: buildSurvivalGuide(meDiag, friendDiag),
    });
  } catch (error) {
    console.error("[mismatch/pair] failed", error);
    return NextResponse.json({ message: "診断の生成に失敗しました" }, { status: 500 });
  }
};
