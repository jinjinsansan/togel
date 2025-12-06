-- 緊急ロールバック用SQL
-- バックアップから元のテーブルを復元します
-- 
-- 警告：このSQLを実行すると、現在のmichelle_knowledgeの内容が
--       バックアップ時点のデータに置き換わります
-- 
-- 実行前に必ず確認してください

BEGIN;

-- 現在のデータ件数を確認（ログ用）
DO $$
DECLARE
  current_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count FROM michelle_knowledge;
  SELECT COUNT(*) INTO backup_count FROM michelle_knowledge_backup;
  
  RAISE NOTICE 'Current michelle_knowledge records: %', current_count;
  RAISE NOTICE 'Backup records: %', backup_count;
  
  IF backup_count = 0 THEN
    RAISE EXCEPTION 'Backup table is empty! Aborting rollback.';
  END IF;
END $$;

-- 既存データを削除
TRUNCATE TABLE michelle_knowledge;

-- バックアップからデータを復元
INSERT INTO michelle_knowledge 
SELECT * FROM michelle_knowledge_backup;

COMMIT;

-- 復元確認
SELECT 
  'michelle_knowledge (restored)' as status,
  COUNT(*) as record_count
FROM michelle_knowledge;
