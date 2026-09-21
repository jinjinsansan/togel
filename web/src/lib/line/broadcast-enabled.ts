/**
 * 画面側から見た「配信が有効か」。
 *
 * 判定そのものは `broadcast-status.js` の1か所にある。ここはビルド時に
 * next.config.js がその結果を焼いた公開変数（true/false だけ）を読むだけ。
 * 秘密の値は画面に来ない。
 *
 * **約束は、守れるときだけ出す。** 無効のあいだは「週1通」「全15通」を出さない
 * （配信が止まっているのに届くと約束すると、登録しても何も来ない）。
 *
 * 環境変数を変えたら再デプロイが要る。Vercel は環境変数の変更を既存の
 * デプロイに反映しない。cron ルートも同じ条件なので、両者はずれない。
 */
export const isBroadcastEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_BROADCAST_ENABLED === "true";
