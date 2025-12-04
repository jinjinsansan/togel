import type { SupabaseClient } from "@supabase/supabase-js";

import { type EmotionAnalysis } from "@/lib/michelle-attraction/emotion";
import { generateProgressCode, type ProgressStatus } from "@/lib/michelle-attraction/sections";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AttractionSupabase = SupabaseClient<any>;

export type PsychologyRecommendationState = "none" | "suggested" | "acknowledged" | "dismissed" | "resolved";

const PROGRESS_SELECT_COLUMNS =
  "id, auth_user_id, session_id, current_level, current_section, progress_status, progress_code, notes, emotional_state, emotional_score, psychology_recommendation, psychology_recommendation_reason, psychology_prompted_at, psychology_opt_out_until, updated_at";

export type ProgressRecord = {
  id: string;
  auth_user_id: string;
  session_id: string;
  current_level: number;
  current_section: number;
  progress_status: ProgressStatus;
  progress_code: string | null;
  notes: string | null;
  emotional_state: "stable" | "concern" | "critical";
  emotional_score: number;
  psychology_recommendation: PsychologyRecommendationState;
  psychology_recommendation_reason: string | null;
  psychology_prompted_at: string | null;
  psychology_opt_out_until: string | null;
  updated_at: string;
};

export type ProgressNote = {
  id: string;
  progress_id: string;
  note_type: string;
  related_level: number | null;
  related_section: number | null;
  content: string;
  created_at: string;
};

export const ensureProgressRecord = async (
  supabase: AttractionSupabase,
  authUserId: string,
  sessionId: string,
) => {
  const { data: existing } = await supabase
    .from("michelle_attraction_progress")
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("michelle_attraction_progress")
    .insert({
      auth_user_id: authUserId,
      session_id: sessionId,
      current_level: 1,
      current_section: 1,
      progress_status: "IP",
      progress_code: generateProgressCode(1, 1, "IP"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to seed progress record");
  }

  return data.id as string;
};

export const fetchLatestProgress = async (supabase: AttractionSupabase, authUserId: string) => {
  const { data, error } = await supabase
    .from("michelle_attraction_progress")
    .select(PROGRESS_SELECT_COLUMNS)
    .eq("auth_user_id", authUserId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ProgressRecord | null) ?? null;
};

export const fetchProgressBySession = async (
  supabase: AttractionSupabase,
  authUserId: string,
  sessionId: string,
) => {
  const { data, error } = await supabase
    .from("michelle_attraction_progress")
    .select(PROGRESS_SELECT_COLUMNS)
    .eq("auth_user_id", authUserId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ProgressRecord | null) ?? null;
};

export const fetchProgressNotes = async (
  supabase: AttractionSupabase,
  progressId: string,
  limit = 5,
) => {
  const { data, error } = await supabase
    .from("michelle_attraction_progress_notes")
    .select("id, progress_id, note_type, related_level, related_section, content, created_at")
    .eq("progress_id", progressId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data as ProgressNote[]) ?? [];
};

export const upsertProgressRecord = async (
  supabase: AttractionSupabase,
  params: {
    authUserId: string;
    sessionId: string;
    level: number;
    section: number;
    status: ProgressStatus;
    notes?: string | null;
    extras?: Partial<{
      emotional_state: ProgressRecord["emotional_state"];
      emotional_score: number;
      psychology_recommendation: PsychologyRecommendationState;
      psychology_recommendation_reason: string | null;
      psychology_prompted_at: string | null;
      psychology_opt_out_until: string | null;
    }>;
  },
) => {
  const { authUserId, sessionId, level, section, status, notes, extras } = params;
  const progress_code = generateProgressCode(level, section, status);
  const { data, error } = await supabase
    .from("michelle_attraction_progress")
    .upsert(
      {
        auth_user_id: authUserId,
        session_id: sessionId,
        current_level: level,
        current_section: section,
        progress_status: status,
        progress_code,
        notes: notes ?? null,
        last_check_at: new Date().toISOString(),
        ...extras,
      },
      { onConflict: "auth_user_id,session_id" },
    )
    .select(PROGRESS_SELECT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as ProgressRecord;
};

export const updateEmotionSnapshot = async (
  supabase: AttractionSupabase,
  params: {
    authUserId: string;
    sessionId: string;
    emotion: EmotionAnalysis;
  },
) => {
  const { authUserId, sessionId, emotion } = params;
  const { data, error } = await supabase
    .from("michelle_attraction_progress")
    .update({
      emotional_state: emotion.state,
      emotional_score: emotion.score,
      psychology_recommendation_reason:
        emotion.state === "stable" || emotion.reasons.length === 0
          ? null
          : emotion.reasons.slice(0, 3).join(" / "),
    })
    .eq("auth_user_id", authUserId)
    .eq("session_id", sessionId)
    .select(PROGRESS_SELECT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as ProgressRecord;
};

export const setPsychologyRecommendationState = async (
  supabase: AttractionSupabase,
  params: {
    authUserId: string;
    sessionId: string;
    state: PsychologyRecommendationState;
    reason?: string | null;
    optOutUntil?: Date | null;
  },
) => {
  const { authUserId, sessionId, state, reason, optOutUntil } = params;
  const { data, error } = await supabase
    .from("michelle_attraction_progress")
    .update({
      psychology_recommendation: state,
      psychology_recommendation_reason: reason ?? null,
      psychology_prompted_at: state === "suggested" || state === "acknowledged" ? new Date().toISOString() : null,
      psychology_opt_out_until: optOutUntil ? optOutUntil.toISOString() : null,
    })
    .eq("auth_user_id", authUserId)
    .eq("session_id", sessionId)
    .select(PROGRESS_SELECT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as ProgressRecord;
};

export const shouldThrottleRecommendation = (record: ProgressRecord | null) => {
  if (!record) return false;
  if (record.psychology_recommendation === "dismissed") {
    if (!record.psychology_opt_out_until) {
      return true;
    }
    const until = new Date(record.psychology_opt_out_until).getTime();
    return until > Date.now();
  }
  return false;
};
