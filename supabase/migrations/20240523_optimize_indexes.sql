-- 1. Users Table Indexes
-- auth_user_id: ログイン時のユーザー特定に使用 (頻出)
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);
-- line_user_id: ゲストユーザーやLINE連携時の検索に使用
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON public.users (line_user_id);
-- gender: マッチング時の異性検索に使用 (カーディナリティは低いが、フィルタリングで有効)
CREATE INDEX IF NOT EXISTS idx_users_gender ON public.users (gender);
-- is_mock_data: 実ユーザーのみを検索する際に使用
CREATE INDEX IF NOT EXISTS idx_users_is_mock_data ON public.users (is_mock_data);

-- 2. Diagnosis Results Table Indexes
-- user_id + created_at: 「最新の診断結果」を取得するクエリで必須 (ORDER BY created_at DESC LIMIT 1)
CREATE INDEX IF NOT EXISTS idx_diagnosis_results_user_created ON public.diagnosis_results (user_id, created_at DESC);

-- 3. Matching Cache Table Indexes
-- user_id + created_at: 最新のキャッシュを取得する際に使用
CREATE INDEX IF NOT EXISTS idx_matching_cache_user_created ON public.matching_cache (user_id, created_at DESC);

-- 4. Profiles Table Indexes
-- diagnosis_type_id: 特定の診断タイプを持つユーザーを探す可能性に備えて
CREATE INDEX IF NOT EXISTS idx_profiles_diagnosis_type_id ON public.profiles (diagnosis_type_id);

-- 5. Performance Tuning for Matching Query (Real Profiles Loading)
-- マッチング時に「異性の実ユーザー」を最新順に取得するクエリ用
-- engine.ts: .eq("gender", gender).eq("is_mock_data", false).order("created_at", ...)
CREATE INDEX IF NOT EXISTS idx_users_gender_mock_created ON public.users (gender, is_mock_data, created_at DESC);
