/**
 * メルマガの配信が有効かどうか。**判定はここ1か所。**
 *
 * cron ルート（実行時）と next.config.ts（ビルド時）の両方がこれを使う。
 * 判定を2か所に書くと、片方だけ直したときに「画面は約束しているのに配信は止まっている」
 * （またはその逆）がまた起きる。LINE配信で実際に起きたことの再発防止。
 *
 * 【秘密を返さない】
 * 受け取るのは env だが、返すのは **有効かどうかと、欠けている変数の名前だけ**。
 * ビルド時にこの結果を公開変数へ焼くので、値を返すと画面の JS に秘密が載る。
 */
export const NEWSLETTER_REQUIRED_ENV = ["CRON_SECRET", "RESEND_API_KEY"] as const;

export const newsletterStatus = (
  env: Record<string, string | undefined>,
): { enabled: boolean; missing: string[] } => {
  const missing = NEWSLETTER_REQUIRED_ENV.filter((key) => !env[key]);
  return { enabled: missing.length === 0, missing };
};
