-- フェーズトラッキング機能を削除（ロールバック）

ALTER TABLE michelle_sessions
DROP COLUMN IF EXISTS counseling_phase,
DROP COLUMN IF EXISTS counseling_phases_completed,
DROP COLUMN IF EXISTS counseling_notes;

-- このマイグレーションは冪等性があります（何度実行しても安全）
