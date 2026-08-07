import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-base px-6 text-center text-white">
      <div className="text-[64px] font-black leading-none text-primary">404</div>
      <div>
        <h1 className="text-xl font-black">このページとは、相性が悪かったようです。</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-txt-muted">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
      </div>
      <Link
        href="/"
        className="flex min-h-[52px] items-center justify-center rounded-[14px] bg-hazard px-8 text-sm font-black text-ink shadow-cta transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        トップへ
      </Link>
    </div>
  );
}
