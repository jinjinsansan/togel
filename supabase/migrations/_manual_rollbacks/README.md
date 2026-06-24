# 手動ロールバック用スクリプト（自動適用しない）

このフォルダのSQLは **破壊的操作（TRUNCATE / DROP）** を含むため、
`supabase db push` / マイグレーション自動適用の対象から外しています。

必要時に、内容を確認した上で **手動で** 実行してください。

- `20251206_rollback_counseling_phases.sql`
- `20251206_rollback_from_backup.sql` — `michelle_knowledge` を TRUNCATE
- `20251207_rollback_sinr_tables.sql` — SINR 関連テーブルを DROP
