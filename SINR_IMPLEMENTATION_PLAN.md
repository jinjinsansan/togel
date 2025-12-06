# SINR実装計画：RAG検索精度向上プロジェクト

## 🎯 目的
検索精度を向上させるため、SINR（Search Is Not Retrieval）手法を導入する。
親子チャンク構造により、「検索用の小さいチャンク」と「LLMに渡す大きいチャンク」を分離。

## ⚠️ 安全対策
- 既存データを一切変更しない
- バックアップから即座にロールバック可能
- 段階的な実装とテスト

---

## 📋 実装フェーズ

### フェーズ0：現状のバックアップ（最重要）

**所要時間：** 10分

**手順：**

1. **Supabase Studioでバックアップ作成**
   ```
   a. Supabase Studioにログイン
   b. Table Editor → michelle_knowledge
   c. 右上「...」→「Export to CSV」
   d. ファイルを安全な場所に保存（例: ~/backups/michelle_knowledge_20251206.csv）
   ```

2. **SQLバックアップテーブル作成**
   ```sql
   -- Supabase SQL Editorで実行
   -- ファイル: supabase/migrations/20251206_backup_michelle_knowledge.sql
   ```
   
   実行後、以下が表示されれば成功：
   ```
   table_name                    | record_count
   -----------------------------|-------------
   michelle_knowledge           | XXX
   michelle_knowledge_backup    | XXX
   ```

3. **バックアップ確認**
   ```sql
   SELECT COUNT(*) FROM michelle_knowledge;
   SELECT COUNT(*) FROM michelle_knowledge_backup;
   -- 件数が一致していることを確認
   ```

**✅ チェックリスト：**
- [ ] CSVファイルをダウンロード済み
- [ ] バックアップテーブル作成済み
- [ ] 件数が一致している

**🔄 ロールバック方法（問題が起きた場合）：**
```sql
-- supabase/migrations/20251206_rollback_from_backup.sql を実行
```

---

### フェーズ1：ベースライン性能測定

**所要時間：** 30分

**目的：** 改善前の性能を記録する

**テストクエリ：**
```
1. 「恐怖を感じる時はどうすればいい？」
2. 「怒りの下にある感情は？」
3. 「アラジンのランプテストとは？」
4. 「五大ネガティブとは何ですか？」
5. 「ピールダウンの方法を教えてください」
```

**測定項目：**
```
各クエリについて：
- ヒットした件数
- 返ってきた内容の関連性（1-5点）
- 文脈の一貫性（1-5点）
- 回答の品質（1-5点）
```

**記録方法：**
- 新しいチャットで各質問を投げる
- スクリーンショットを撮る
- 点数をスプレッドシートに記録

**✅ チェックリスト：**
- [ ] 5つのクエリをテスト済み
- [ ] 結果を記録済み（スプレッドシートorメモ）

---

### フェーズ2：SINRテーブル追加

**所要時間：** 5分

**手順：**

1. **マイグレーション実行**
   ```sql
   -- Supabase SQL Editorで実行
   -- ファイル: supabase/migrations/20251207_add_sinr_tables.sql
   ```

2. **テーブル作成確認**
   ```sql
   SELECT 
     'michelle_knowledge_parents' as table_name,
     COUNT(*) as record_count
   FROM michelle_knowledge_parents
   UNION ALL
   SELECT 
     'michelle_knowledge_children' as table_name,
     COUNT(*) as record_count
   FROM michelle_knowledge_children;
   ```
   
   両方とも`0件`であることを確認（まだデータを入れていないため）

3. **関数確認**
   ```sql
   SELECT proname 
   FROM pg_proc 
   WHERE proname = 'match_michelle_knowledge_sinr';
   ```
   
   関数が存在することを確認

**✅ チェックリスト：**
- [ ] michelle_knowledge_parents テーブル作成済み
- [ ] michelle_knowledge_children テーブル作成済み
- [ ] match_michelle_knowledge_sinr 関数作成済み
- [ ] 既存のmichelle_knowledgeは無傷

**🔄 ロールバック方法：**
```sql
-- supabase/migrations/20251207_rollback_sinr_tables.sql を実行
```

---

### フェーズ3：チャンキングスクリプト作成

**所要時間：** 2-3時間（開発）

**実装内容：**

1. `web/scripts/michelle-knowledge/chunk-sinr.ts` を作成
2. `web/scripts/michelle-knowledge/process-knowledge-sinr.ts` を作成
3. ローカルでテスト

**詳細は後日実装します。まずはここまでで一旦停止。**

---

### フェーズ4：小規模テスト（10ファイルのみ）

**所要時間：** 1時間 + 観察期間1週間

**手順：**
1. 10個のmdファイルだけSINR形式で変換
2. 新システムと旧システムを並行運用
3. ログで比較

---

### フェーズ5：全ファイル移行

**所要時間：** 1時間 + 観察期間2週間

**手順：**
1. 全ファイルをSINR形式に変換
2. A/Bテスト
3. 問題なければ完全移行

---

### フェーズ6：旧システム削除

**所要時間：** 30分

**条件：**
- 2週間以上問題なく動作
- ユーザーフィードバックが良好
- ロールバックの必要性がない

**実行内容：**
```sql
DROP TABLE michelle_knowledge_backup;
-- 旧スクリプトの削除
```

---

## 🚨 緊急ロールバック手順

### ケース1：SINR実装に問題がある

**症状：**
- 検索精度が悪化
- エラーが発生
- 回答の品質が低下

**対処：**
```typescript
// web/src/lib/michelle/rag.ts
const USE_SINR = false;  // ← これをfalseにする
```

```bash
git add -A
git commit -m "rollback: disable SINR temporarily"
git push origin main
```

**即座に旧システムに戻ります。**

### ケース2：データが壊れた

**症状：**
- michelle_knowledgeのデータが消えた/壊れた

**対処：**
```sql
-- supabase/migrations/20251206_rollback_from_backup.sql を実行
```

**バックアップから復元されます。**

### ケース3：SINRテーブルを削除したい

**対処：**
```sql
-- supabase/migrations/20251207_rollback_sinr_tables.sql を実行
```

---

## 📊 成功の指標

### 検索精度
- [ ] ヒット件数が適切（多すぎず、少なすぎず）
- [ ] 関連性スコアが向上（+15%以上）

### 回答品質
- [ ] 文脈の一貫性が向上（+30%以上）
- [ ] ユーザーの満足度が維持または向上

### パフォーマンス
- [ ] レスポンス時間が維持または改善
- [ ] エラー率が増加していない

---

## 📅 スケジュール（推奨）

| フェーズ | 期間 | 開始条件 |
|---------|------|----------|
| 0. バックアップ | 即時 | なし |
| 1. ベースライン測定 | 即時 | フェーズ0完了後 |
| 2. テーブル追加 | 即時 | フェーズ1完了後 |
| 3. スクリプト開発 | 2-3日 | フェーズ2完了後 |
| 4. 小規模テスト | 1週間 | フェーズ3完了後 |
| 5. 全体移行 | 2週間 | フェーズ4で問題なし |
| 6. 旧システム削除 | 1日 | フェーズ5で2週間問題なし |

**合計：約1ヶ月**

---

## 🎓 参考資料

- [元論文] Search Is Not Retrieval: https://arxiv.org/abs/2511.04939
- [Zenn記事] https://zenn.dev/knowledgesense/articles/746ceb4e4dd87e

---

## ✅ 次のアクション

**今すぐやること：**
1. [ ] フェーズ0のバックアップ実行
2. [ ] Droidに「フェーズ0完了」と報告

**その後：**
- フェーズ1（ベースライン測定）を開始
