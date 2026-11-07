import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * newsletter_subscribers の読み書き。**サーバー（service role）からだけ呼ぶ。**
 * テーブルは RLS を有効にしてポリシーを置いていないので、利用者のブラウザからは触れない。
 */

export type ConsentSource = "signup" | "result" | "mypage" | "newsletter_page";

export type SubscriberRow = {
  user_id: string;
  email: string;
  type_id: string | null;
  consented_at: string;
  consent_source: ConsentSource;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
  last_issue: number;
  last_sent_at: string | null;
};

const TABLE = "newsletter_subscribers";

export type NewsletterState = {
  /** 行があるか（一度でも同意したか）。解除済みでも true */
  exists: boolean;
  subscribed: boolean;
  typeId: string | null;
  lastIssue: number;
};

export const getNewsletterState = async (userId: string): Promise<NewsletterState> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("type_id, unsubscribed_at, last_issue")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return {
    exists: Boolean(data),
    subscribed: Boolean(data && !data.unsubscribed_at),
    typeId: data?.type_id ?? null,
    lastIssue: data?.last_issue ?? 0,
  };
};

/** プロフィールに保存されている最新の診断タイプ（未診断なら null） */
export const latestTypeIdFor = async (userId: string): Promise<string | null> => {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("diagnosis_type_id")
    .eq("id", userId)
    .maybeSingle();
  return (data?.diagnosis_type_id as string | null | undefined) ?? null;
};

/**
 * 購読する（同意を記録する）。解除済みの人がもう一度押した場合は、解除を取り消して
 * 同意の時点を更新する。通目は続きから（同じ通を2回送らない）。
 */
export const subscribe = async (params: {
  userId: string;
  email: string;
  source: ConsentSource;
  typeId: string | null;
}): Promise<void> => {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select("user_id, type_id")
    .eq("user_id", params.userId)
    .maybeSingle();
  if (readError) throw readError;

  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from(TABLE)
      .update({
        email: params.email,
        type_id: params.typeId ?? existing.type_id,
        consented_at: now,
        consent_source: params.source,
        unsubscribed_at: null,
      })
      .eq("user_id", params.userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from(TABLE).insert({
    user_id: params.userId,
    email: params.email,
    type_id: params.typeId,
    consented_at: now,
    consent_source: params.source,
  });
  if (error) throw error;
};

/** 診断し直したら、購読中の人の宛先タイプを新しいタイプに合わせる */
export const updateSubscriberType = async (userId: string, typeId: string): Promise<void> => {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from(TABLE).update({ type_id: typeId }).eq("user_id", userId);
  if (error) throw error;
};

export const unsubscribeByUser = async (userId: string): Promise<void> => {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("unsubscribed_at", null);
  if (error) throw error;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 解除リンクから。見つからない・形式が違うトークンは false（何が登録されているかは教えない） */
export const unsubscribeByToken = async (token: string): Promise<boolean> => {
  if (!UUID.test(token)) return false;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("user_id, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  if (!data.unsubscribed_at) {
    const { error: updateError } = await supabase
      .from(TABLE)
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("user_id", data.user_id);
    if (updateError) throw updateError;
  }
  return true;
};

/**
 * 送信候補。前回の送信が古い順（未送信が先頭）に、上限の数倍を取る
 * （その中から「7日たった人」を schedule.ts で選ぶ）。
 */
export const fetchCandidates = async (limit: number): Promise<SubscriberRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "user_id, email, type_id, consented_at, consent_source, unsubscribed_at, unsubscribe_token, last_issue, last_sent_at",
    )
    .is("unsubscribed_at", null)
    .not("type_id", "is", null)
    .lt("last_issue", 15)
    .order("last_sent_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SubscriberRow[];
};

/**
 * 送る前に「この人のこの通は自分が送る」と確保する。`last_issue` が送る前の値のときだけ進むので、
 * cron が二重に走っても同じ通を2回送らない。確保できたら true。
 */
export const claimIssue = async (userId: string, issue: number, now: Date): Promise<boolean> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ last_issue: issue, last_sent_at: now.toISOString() })
    .eq("user_id", userId)
    .eq("last_issue", issue - 1)
    .is("unsubscribed_at", null)
    .select("user_id");
  if (error) throw error;
  return (data ?? []).length === 1;
};

/** 送信に失敗したら確保を戻す（翌日の cron でもう一度送る） */
export const releaseClaim = async (
  userId: string,
  issue: number,
  previousSentAt: string | null,
): Promise<void> => {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ last_issue: issue - 1, last_sent_at: previousSentAt })
    .eq("user_id", userId)
    .eq("last_issue", issue);
  if (error) throw error;
};

/**
 * 診断を保存した直後に呼ぶ。
 * - 購読中なら、宛先タイプを今回のタイプに合わせる
 * - まだ行が無く、登録時にメルマガへ同意していた（user_metadata.newsletter_opt_in）なら購読を作る
 * - 一度解除した人は、ここでは戻さない（本人がもう一度押したときだけ戻す）
 */
export const syncNewsletterAfterDiagnosis = async (params: {
  userId: string;
  email: string | undefined;
  emailConfirmed: boolean;
  optedInAtSignup: boolean;
  typeId: string;
}): Promise<void> => {
  const state = await getNewsletterState(params.userId);
  if (state.exists) {
    if (state.subscribed) await updateSubscriberType(params.userId, params.typeId);
    return;
  }
  if (!params.optedInAtSignup || !params.email || !params.emailConfirmed) return;
  await subscribe({
    userId: params.userId,
    email: params.email,
    source: "signup",
    typeId: params.typeId,
  });
};
