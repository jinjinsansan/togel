# リリース前 包括ハードニング記録（2026-06-24）

TOGEL のリリース前監査（5領域の並列監査）で検出した問題を、優先度順に8フェーズで修正した記録。

## スコア推移

総合 **43 → 92 / 100**（残り8点は運営者の法的情報待ち）

| 領域 | Before | After |
|---|---|---|
| セキュリティ/認可 | 48 | 90 |
| 中核ロジック | 52 | 85 |
| DB/整合性 | 48 | 90 |
| 連携/AI/コスト | 38 | 92 |
| フロント/法務 | 41 | 88 |

検証: `npm run typecheck` ✅ / `npm run build`（lint含む）✅

---

## Phase 1: 無認証エンドポイントの認証ゲート
- 新規 `web/src/lib/auth/internal.ts` … `denyUnlessInternal()`（管理者セッション or `x-internal-secret` ヘッダ、フェイルクローズ）
- 適用: `sinr-process-all` / `sinr-process-batch` / `sinr-process-file` / `sinr-compare` / `baseline-test` / `baseline-test-quick` / `line/notify-diagnosis`
- `recommendations/track` に UUID 形式バリデーション追加

## Phase 2: IDOR / 個人情報漏洩
- 招待コードを `btoa(uuid)` → **HMAC署名方式**に刷新
  - 新規 `web/src/lib/invite/code.ts`（`signInviteCode` / `verifyInviteCode`、`INVITE_SECRET` 未設定でフェイルクローズ）
  - 新規 `web/src/app/api/invite/generate/route.ts`（自分のコードのみ発行）
  - `mypage` の `handleCopyLink` をサーバー発行に変更、`diagnosis/latest` で署名検証
- `profile/[id]/diagnosis` の `is_public` をサーバー側で強制（本人のみ非公開閲覧可）
- `requireAdminUser` を `getSession()` → `getUser()`（JWT検証）に変更

## Phase 3: DB整合性 / RLS
新規マイグレーション（本番へ手動適用済み 2026-06-24）:
- `line_users` / `line_conversations` / `michelle_knowledge_backup` の **RLS有効化**（service_role のみ）
- `notifications` / `notification_reads` の RLS を `auth_user_id` 経由に修正（旧 `auth.uid() = user_id` は不一致で機能していなかった）
- `profiles` を `create table if not exists` + `add column if not exists` で再現可能化、RLSポリシー整備
- `point_transactions` に部分ユニークインデックス（order_id, transaction_type, reason）で二重付与防止
- `point_wallets` に残高 >= 0 の CHECK 制約
- `api_rate_limits` テーブル + `check_and_increment_rate_limit()` 関数
- 破壊的 rollback SQL を `supabase/migrations/_manual_rollbacks/` へ退避

## Phase 4: 決済の堅牢化（One.lat — 現在休眠）
- `verifyWebhookSecret` をフェイルクローズ + 定数時間比較に（旧実装はシークレット未設定で true を返していた）
- Webhook をイベントレベル冪等化（`point_webhook_events.event_id` 重複で打ち切り）+ RPC の 23505 を握りつぶして二重付与防止
- ※ One.lat は未使用。`ONE_LAT_WEBHOOK_SECRET` 未設定で全拒否されるため安全に休眠。

## Phase 5: AI / 連携の堅牢化
- 新規 `web/src/lib/rate-limit.ts` … DBバックエンドのアトミックなレート制限
- `michelle/chat` / `michelle-attraction/chat` に 60秒20回のレート制限、エラーメッセージ秘匿
- LINE Webhook の回答ハンドラに冪等ガード（現在の質問IDと一致時のみ進行）、postback の非null assertion 安全化
- R2 アップロード（avatar / service-image）に `ContentLength` 強制 + 拡張子ホワイトリスト

## Phase 6: 中核ロジック
- 24タイプ分類で到達不能だった `entertaining-creator` / `relational-ambassador` を到達可能化（**24/24 全タイプ出力可能**）
- `Math.random()` を全廃し決定的シードに（engine.ts のキャッチフレーズ/デートアイデア、mismatch-narrative）
- `diagnosis/submit` でサーバー側の回答数バリデーション（設問数未満を拒否）

## Phase 7: フロント / UX
- `error.tsx` / `global-error.tsx` / `not-found.tsx` / `loading.tsx` を追加
- トップページで OAuth エラー（`/?error=...`）をバナー表示（従来は無言で失敗）
- 残骸削除: `profile/edit/page.tsx.backup` / `.old` / `result/page-old.tsx`
- `about` ページの重複セクション削除
- `layout` の `maximumScale: 1` を撤廃（ピンチズーム許可 / WCAG 1.4.4）

## Phase 8: 法令対応
- 新規 `web/src/components/age-gate.tsx` … 18歳以上の年齢確認ゲート（全画面ブロック、localStorage 保存）
- 新規 `web/src/app/tokushoho/page.tsx` … 特定商取引法に基づく表記 + フッター導線
- 利用規約に第4条（年齢制限）/ 第5条（退会）/ 第6条（反社排除）を追加
- 規約・プライバシーの日付を動的（毎回今日）→ 固定日に修正
- プライバシーに個人情報取扱事業者欄を追加

---

## デプロイ時の必須設定
環境変数（Vercel に設定済み 2026-06-24）:
- `INVITE_SECRET` … 招待リンクの HMAC 鍵（未設定で招待機能無効）
- `INTERNAL_API_SECRET` … データ移行系 API 用

## 残作業（100点化に必要）
`/tokushoho` と `/privacy` の `【】` プレースホルダーに運営者の実情報を反映:
- 運営者名（会社名／個人事業主名）
- 代表者名
- 所在地
- 電話番号
