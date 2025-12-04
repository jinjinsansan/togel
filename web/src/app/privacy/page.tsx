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
      title: "6. クッキー等の利用",
      body:
        "当社は、利便性向上やアクセス解析のためにクッキーや類似技術を使用します。ブラウザ設定でクッキーを無効にすることも可能ですが、一部機能が利用できなくなる場合があります。",
    },
    {
      title: "7. 改定",
      body:
        "本ポリシーの内容を変更する場合は、当社ウェブサイト上で告知します。重要な変更を行う際は、合理的な方法で個別に通知する場合があります。改定後もサービスを利用された場合、変更に同意したものとみなします。",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-white via-[#f9fbff] to-[#eef4ff]">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#38bdf8]">Privacy Policy</p>
          <h1 className="mt-3 text-3xl font-bold text-[#0f2f4d]">プライバシーポリシー</h1>
          <p className="mt-2 text-sm text-[#4a6076]">最終更新日: {new Date().toLocaleDateString("ja-JP")}</p>
        </header>

        <section className="mt-10 space-y-8 rounded-3xl bg-white/95 p-8 shadow-lg shadow-[#0f2f4d]/5">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-lg font-semibold text-[#0f2f4d]">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#4a4f64]">{section.body}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
