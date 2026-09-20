export const metadata = {
  title: "特定商取引法に基づく表記 | Togel",
  description: "特定商取引法に基づく表記",
};

export default function TokushohoPage() {
  const rows: { label: string; value: string }[] = [
    { label: "販売事業者", value: "DLLC" },
    {
      label: "運営統括責任者",
      value: "お客様からの請求があった場合、遅滞なく開示いたします。",
    },
    { label: "所在地", value: "東京都港区赤坂4丁目8番19号 赤坂フロントタウン3階" },
    {
      label: "電話番号",
      value:
        "お客様からの請求があった場合、遅滞なく開示いたします。お問い合わせは下記メールアドレスまでお願いいたします。",
    },
    { label: "メールアドレス", value: "support@to-gel.com" },
    { label: "販売価格", value: "各ポイントパッケージの購入ページに表示する価格（税込）によります。" },
    {
      label: "商品代金以外の必要料金",
      value:
        "インターネット接続料金・通信料金はお客様のご負担となります。外貨建て決済時は為替手数料（目安：1米ドルあたり3円前後）が加算されます。",
    },
    { label: "支払方法", value: "クレジットカード等（決済代行：One.lat）" },
    { label: "支払時期", value: "ポイント購入手続き完了時に即時決済されます。" },
    {
      label: "商品の引渡し時期",
      value: "決済完了の確認後、ただちにアカウントへポイントを付与します。",
    },
    {
      label: "返品・キャンセル",
      value:
        "商品（ポイント）の性質上、購入手続き完了後のキャンセル・返金はお受けできません。購入したポイントは購入日から180日を経過すると失効します。",
    },
    {
      label: "動作環境",
      value: "最新版の主要ブラウザ（Chrome / Safari / Edge 等）。",
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-navy">
      <div className="mx-auto max-w-[760px] px-5.5 pb-14 pt-11">
        <header className="text-center">
          <p className="text-label text-primary-ink">
            Legal Notice
          </p>
          <h1 className="mt-3.5 text-[28px] font-black leading-[1.4] tracking-[-0.02em]">
            特定商取引法に基づく表記
          </h1>
          <p className="mt-2.5 text-[12px] font-bold text-lighttext-subtle">最終更新日: 2026年8月7日</p>
        </header>

        <section className="mt-7 overflow-hidden rounded-card border border-lightline bg-white shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]">
          <dl className="divide-y divide-lightline">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-1 gap-1.5 px-5.5 py-5 sm:grid-cols-3 sm:gap-4"
              >
                <dt className="text-[13px] font-black text-navy">{row.label}</dt>
                <dd className="text-[13px] leading-[1.95] text-lighttext-muted sm:col-span-2">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
