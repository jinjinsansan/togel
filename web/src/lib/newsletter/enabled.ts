/**
 * 画面側から見た「メルマガ配信が有効か」。
 *
 * 判定そのものは `status.ts` の1か所にある。ここはビルド時に next.config.ts が
 * その結果を焼いた公開変数（true/false だけ）を読むだけ。秘密の値は画面に来ない。
 *
 * **約束は、守れるときだけ出す。** 無効のあいだは「週1通」「全15通」を出さない。
 * 登録（同意の記録）自体は受け付ける。有効になった時点で1通目から届く。
 *
 * 環境変数を変えたら再デプロイが要る。Vercel は環境変数の変更を既存の
 * デプロイに反映しない。cron ルートも同じ条件なので、両者はずれない。
 */
export const isNewsletterEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === "true";
