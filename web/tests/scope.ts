/**
 * ブランド面の刷新から外すと決めた画面。パスで宣言する。
 *
 * 「今回は触らない」を口約束ではなくコードに置く。ここに無いパスは
 * 刷新の対象であり、ブランド面の検査（letter-spacing・色トークン）が効く。
 * 逆にここに足せば検査から外れるので、足すときは reason を書く。
 *
 * 宣言が古くなること自体を tests/scope.test.ts が検査する
 * （消えた画面を除外したままにしない／サイトマップに漏らさない）。
 */

export type OutOfScopeArea = {
  /** src からの相対パス（プレフィックス一致） */
  prefix: string;
  /** 公開URL側のプレフィックス */
  route: string;
  /** proxy.ts の protectedRoutes に入っているか */
  authRequired: boolean;
  reason: string;
};

export const OUT_OF_SCOPE: OutOfScopeArea[] = [
  {
    prefix: "src/app/admin/",
    route: "/admin",
    authRequired: true,
    reason: "運営だけが見る管理画面。来訪者の目に触れないので意匠を揃える利得が無い",
  },
  {
    prefix: "src/app/michelle/",
    route: "/michelle",
    authRequired: true,
    reason: "有料側（カウンセリング）。無料側とは別の世界観を持たせる予定で、まだ決まっていない",
  },
  {
    prefix: "src/app/points/",
    route: "/points",
    authRequired: false,
    reason: "課金まわり。決済の導線を触るのは意匠刷新とは別の課題",
  },
];

/** letter-spacing など、ブランド面の検査が読む除外プレフィックスの一覧 */
export const OUT_OF_SCOPE_PREFIXES = OUT_OF_SCOPE.map((area) => area.prefix);
