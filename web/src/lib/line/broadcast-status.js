/**
 * LINE週次配信が有効かどうか。**判定はここ1か所。**
 *
 * cron ルート（実行時）と next.config.js（ビルド時）の両方がこれを使う。
 * 判定を2か所に書くと、片方だけ直したときに「画面は約束しているのに配信は止まっている」
 * （またはその逆）がまた起きる。
 *
 * 【なぜ .js か】
 * next.config.js は CommonJS で、TypeScript のモジュールを直接読めない。
 * 判定を1か所にするため、両方から読める形にしてある（tsconfig は allowJs）。
 *
 * 【秘密を返さない】
 * 受け取るのは env だが、返すのは **有効かどうかと、欠けている変数の名前だけ**。
 * CRON_SECRET の値は返さない。ビルド時にこの結果を公開変数へ焼くので、
 * 値を返すと画面の JS に秘密が載る。
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ enabled: boolean, missing: string[] }}
 */
function broadcastStatus(env) {
  const missing = [];
  if (!env.CRON_SECRET) missing.push("CRON_SECRET");
  const startedAt = env.LINE_BROADCAST_START_AT;
  if (!startedAt || Number.isNaN(new Date(startedAt).getTime())) {
    missing.push("LINE_BROADCAST_START_AT");
  }
  return { enabled: missing.length === 0, missing };
}

module.exports = { broadcastStatus };
