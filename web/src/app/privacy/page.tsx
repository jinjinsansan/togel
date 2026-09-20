export default function PrivacyPage() {
  const sections = [
    {
      title: "1. 収集する情報",
      body:
        "当社は、アカウント登録時の氏名・メールアドレスなどの基本情報のほか、診断結果、チャット履歴、ポイント購入履歴、端末情報など本サービス提供に必要なデータを取得します。",
    },
    {
      title: "2. 利用目的",
      body:
        "収集した情報は、サービス提供・本人確認・不正利用防止・新機能の開発・重要なお知らせの送付・法令遵守のために利用します。統計化された匿名データは、サービス品質向上のために分析されます。",
    },
    {
      title: "3. 第三者提供",
      body:
        "決済処理やインフラ運用を担う事業者に対し、業務遂行に必要な範囲でのみ個人情報を委託します。法令に基づく開示要請があった場合を除き、利用者の同意なく第三者へ提供することはありません。",
    },
    {
      title: "4. セキュリティ",
      body:
        "当社は、通信の暗号化、アクセス権限の管理、監査ログの記録等、業界水準の安全管理措置を講じています。データは国内のクラウドインフラに保管され、不正アクセスや情報漏えいの防止に努めています。",
    },
    {
      title: "5. 利用者の権利",
      body:
        "利用者は、自身の個人情報について、開示・訂正・利用停止・削除を求めることができます。お問い合わせは support@to-gel.com までご連絡ください。",
    },
    {
      title: "6. クッキー等の利用とアクセス解析",
      body:
        "当社は、ログイン状態の保持など利便性向上のためにクッキーや類似技術を使用します。" +
        "また、どの画面がどれだけ見られているかを把握するためにアクセス解析ツール（Vercel Analytics）を利用します。" +
        "このツールはクッキーを使用せず、個人を特定する情報や診断の回答内容を送信しません。" +
        "送信されるのは、診断の開始・完了などの操作が何回起きたかという統計情報だけです。" +
        "ブラウザ設定でクッキーを無効にすることも可能ですが、一部機能が利用できなくなる場合があります。",
    },
    {
      title: "7. 改定",
      body:
        "本ポリシーの内容を変更する場合は、当社ウェブサイト上で告知します。重要な変更を行う際は、合理的な方法で個別に通知する場合があります。改定後もサービスを利用された場合、変更に同意したものとみなします。",
    },
    {
      title: "8. 個人情報取扱事業者・お問い合わせ窓口",
      body:
        "個人情報取扱事業者：DLLC／所在地：東京都港区赤坂4丁目8番19号 赤坂フロントタウン3階。個人情報の取扱いに関するお問い合わせ・開示等のご請求は、お問い合わせ窓口 support@to-gel.com までご連絡ください。",
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-navy">
      <div className="mx-auto max-w-[760px] px-5.5 pb-14 pt-11">
        <header className="text-center">
          <p className="text-label text-primary-ink">Privacy Policy</p>
          <h1 className="mt-3.5 text-[28px] font-black leading-[1.4] tracking-[-0.02em]">プライバシーポリシー</h1>
          <p className="mt-2.5 text-[12px] font-bold text-lighttext-subtle">最終更新日: 2026年6月24日</p>
        </header>

        <section className="mt-7 space-y-7 rounded-card border border-lightline bg-white p-[22px] shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-[15px] font-black leading-[1.6] text-navy">{section.title}</h2>
              <p className="mt-2.5 text-[13px] leading-[1.95] text-lighttext-muted">{section.body}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
