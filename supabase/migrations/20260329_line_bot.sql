-- LINE Bot ユーザーテーブル
CREATE TABLE IF NOT EXISTS line_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  togel_type TEXT,
  diagnosis_result JSONB,
  big_five_scores JSONB,
  conversation_state TEXT NOT NULL DEFAULT 'new',
  sns_accounts JSONB DEFAULT '{}',
  sns_public BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_users_line_user_id ON line_users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_users_togel_type ON line_users(togel_type);
CREATE INDEX IF NOT EXISTS idx_line_users_conversation_state ON line_users(conversation_state);
CREATE INDEX IF NOT EXISTS idx_line_users_sns_public ON line_users(sns_public) WHERE sns_public = true;

-- LINE会話履歴テーブル (カウンセリング用)
CREATE TABLE IF NOT EXISTS line_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL REFERENCES line_users(line_user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_conversations_user ON line_conversations(line_user_id, created_at DESC);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_line_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_line_users_updated_at
  BEFORE UPDATE ON line_users
  FOR EACH ROW
  EXECUTE FUNCTION update_line_users_updated_at();
