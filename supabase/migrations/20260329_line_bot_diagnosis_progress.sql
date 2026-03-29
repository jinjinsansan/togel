-- LINE診断進捗カラム追加
ALTER TABLE line_users
  ADD COLUMN IF NOT EXISTS diagnosis_type TEXT DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS diagnosis_answers JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS current_question_index INT DEFAULT 0;
