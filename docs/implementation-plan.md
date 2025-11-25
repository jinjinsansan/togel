# Matching診断 実装計画

## アーキテクチャ方針
- **アプリ基盤**: Next.js 14 App Router（TypeScript）＋Tailwind CSS＋shadcn/ui。
- **状態管理**: React Server Components＋クライアント側はContext/Zustand。
- **バックエンド**: Supabase（PostgreSQL・Auth・Storage・Edge Functions）。
- **認証**: supabase-jsのLINE Providerを使用し、LINE OAuth→Supabase Sessionを確立。displayName/pictureUrl/statusMessageは初回同期＋定期更新ジョブで反映。
- **AI連携**: Claude APIでマッチング根拠文章を生成（テンプレートフォールバックを用意）。
- **モックデータ**: Python/Nodeスクリプトで2,000件生成し、SupabaseにSeeder投入。
- **キャッシュ戦略**: `matching_cache`にマッチ結果（上位5名＋根拠）を保存しTTL 24h。再計算トリガーは診断結果再生成時のみ。

## フェーズ別タスク
### Phase 1: MVP基盤
1. **プロジェクトセットアップ**: Next.js初期化、ESLint/Prettier構成、Tailwind＆shadcn/ui導入。
2. **Supabase初期設定**: プロジェクト作成、.env管理、RLSデフォルト禁止設定。
3. **LINEログイン統合**: Supabase AuthでLINE Provider設定、コールバックAPI実装、ログイン導線。
4. **DBマイグレーション**: users / diagnosis_results / questions / matching_cache 等テーブル作成。
5. **診断システム(10問版)**: 質問取得API、回答フォーム（プログレスバー・戻る）、ローカル/DB保存。
6. **マッチング基礎ロジック**: 動物占いタイプ判定、相性スコア計算、上位5名抽出、matching_cache登録。
7. **モックデータ投入**: スクリプトとSupabase Seeder整備、2,000件投入、AI根拠ダミー生成。
8. **結果UI**: 上位5名カード表示、詳細プロフィールダミーページ。
9. **基本検証**: ユニット/統合テスト、lint、型チェックをCI相当で実行。

### Phase 2: コア機能拡張
1. **30問診断追加**: 質問マスタとUI拡張、回答保存ロジックを共通化。
2. **プロフィール編集/公開設定**: /mypage/editとAPI、年収表示切替、アカウント削除処理（Supabase & LINE連携解除）。
3. **AI根拠生成**: Claude API呼び出し、テンプレfallback、matching_cache保存形式を拡張。
4. **紹介リンク機能**: invite_links / invite_registrations API、プロフィール充実度判定、リンク1つ制約、いたずらモード設定。
5. **LINEプロフィール定期同期**: Edge Function or CronでdisplayName/pictureUrl/statusMessageの定期更新。

### Phase 3: UI/UX改善
1. **デザイン洗練**: shadcn/uiコンポーネント整備、テーマカラーパレット反映、フォント適用。
2. **レスポンシブ/アクセシビリティ**: ブレークポイント対応、キーボード操作検証。
3. **アニメーション**: 診断遷移・カードスライダーに軽量アニメーションを追加。
4. **設定/マイページ統合**: /settingsと/mypageの情報整理、紹介リンク管理画面追加。

### Phase 4: 運用準備
1. **包括テスト**: E2E、負荷テスト（マッチング10秒以内確認）、セキュリティレビュー（RLS/CSRF）。
2. **CI/CD整備**: Lint/Typecheck/Test/Coverageフロー、Supabaseマイグレーション自動化。
3. **パフォーマンス最適化**: 画像最適化、キャッシュヘッダ、APIレスポンス計測。
4. **デプロイ**: Vercel本番デプロイ、Supabase本番切替、監視/アラート初期設定。

## 横断タスク
- **ドキュメント管理**: ER図、API仕様、環境変数一覧をNotion/MDで追跡。
- **品質ゲート**: `pnpm lint`, `pnpm typecheck`, `pnpm test` を必須化。
- **セキュリティ**: 画像アップロード検証、LINE連携解除手順、データ削除ポリシーを実装。
- **法務**: 利用規約/プライバシーポリシー準備、出会い系規制法の確認。

## 直近アクション
1. SupabaseプロジェクトとVercel環境の準備。
2. Next.jsリポジトリ初期化と共通設定。
3. Phase1タスクをバックログに登録し、開発を開始。
