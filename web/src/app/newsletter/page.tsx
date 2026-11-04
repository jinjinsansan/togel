import Link from "next/link";

import { NewsletterCta } from "@/components/newsletter/newsletter-cta";

export const metadata = {
  title: "メルマガ | Togel",
  description:
    "あなたのタイプが踏みやすい地雷の、踏み方と避け方をメールで。登録は無料、いつでも解除できます。",
};

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <section className="px-5.5 pb-10 pt-[60px]">
        <div className="mx-auto max-w-[760px]">
          <div className="text-[11px] font-black tracking-[0.22em] text-hazard">NEWSLETTER</div>
          <h1 className="mt-4 text-[28px] font-black leading-[1.4]" style={{ textWrap: "pretty" }}>
            地雷の踏み方と避け方を、
            <br />
            メールで受け取る。
          </h1>
          <ul className="mt-6 space-y-2.5 text-[14px] leading-7 text-txt-muted">
            <li>・あなたと噛み合わない3タイプについて、言い換え・中身の正体・距離の置き方を1通ずつ。</li>
            <li>・内容は診断したタイプに合わせて変わります。まだ診断していない方は、先に診断してください。</li>
            <li>・登録は無料です。配信はメールのリンクかマイページから、いつでも解除できます。</li>
          </ul>
        </div>
      </section>

      <section className="px-5.5 pb-12">
        <NewsletterCta
          place="newsletter_page"
          source="newsletter_page"
          heading="登録したメールアドレスに届きます"
          className="mx-auto max-w-[760px]"
        />
        <div className="mx-auto mt-5 max-w-[760px] text-center">
          <Link
            href="/diagnosis/select"
            className="text-xs font-bold text-txt-subtle underline transition-colors hover:text-white"
          >
            まだ診断していない方はこちら
          </Link>
        </div>
      </section>
    </div>
  );
}
