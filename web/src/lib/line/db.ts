import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LineUserRecord = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  gender: "male" | "female" | null;
  togel_type: string | null;
  diagnosis_result: Record<string, unknown> | null;
  big_five_scores: Record<string, number> | null;
  conversation_state: string;
  sns_accounts: Record<string, string>;
  sns_public: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getLineUser(lineUserId: string): Promise<LineUserRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("line_users")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (error) {
    console.error("[LINE DB] getLineUser error:", error);
    return null;
  }
  return data;
}

export async function upsertLineUser(params: {
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
}): Promise<LineUserRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("line_users")
    .upsert(
      {
        line_user_id: params.lineUserId,
        display_name: params.displayName ?? null,
        picture_url: params.pictureUrl ?? null,
      },
      { onConflict: "line_user_id" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("[LINE DB] upsertLineUser error:", error);
    return null;
  }
  return data;
}

export async function updateLineUserDiagnosis(params: {
  lineUserId: string;
  gender: "male" | "female";
  togelType: string;
  diagnosisResult: Record<string, unknown>;
  bigFiveScores: Record<string, number>;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("line_users")
    .update({
      gender: params.gender,
      togel_type: params.togelType,
      diagnosis_result: params.diagnosisResult,
      big_five_scores: params.bigFiveScores,
      conversation_state: "diagnosed",
    })
    .eq("line_user_id", params.lineUserId);

  if (error) {
    console.error("[LINE DB] updateLineUserDiagnosis error:", error);
  }
}

export async function updateConversationState(
  lineUserId: string,
  state: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("line_users")
    .update({ conversation_state: state })
    .eq("line_user_id", lineUserId);

  if (error) {
    console.error("[LINE DB] updateConversationState error:", error);
  }
}

export async function saveConversation(params: {
  lineUserId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("line_conversations").insert({
    line_user_id: params.lineUserId,
    role: params.role,
    content: params.content,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[LINE DB] saveConversation error:", error);
  }
}

export async function getRecentConversations(
  lineUserId: string,
  limit = 20,
): Promise<Array<{ role: string; content: string; created_at: string }>> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("line_conversations")
    .select("role, content, created_at")
    .eq("line_user_id", lineUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[LINE DB] getRecentConversations error:", error);
    return [];
  }
  return (data ?? []).reverse();
}
