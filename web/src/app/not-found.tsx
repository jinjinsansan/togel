import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center">
      <div className="text-6xl font-black text-[#E91E63]">404</div>
      <div>
        <h1 className="text-xl font-bold text-slate-800">ページが見つかりません</h1>
        <p className="mt-2 text-sm text-slate-500">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-[#E91E63] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
      >
        トップへ戻る
      </Link>
    </div>
  );
}
