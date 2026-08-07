export default function Loading() {
  return (
    <div
      role="status"
      aria-label="読み込み中"
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-base"
    >
      {/* スピナーの代わりに横スクロールするハザードテープ */}
      <div className="w-[200px] overflow-hidden rounded-full">
        <div className="animate-marquee h-[10px] w-[400%] bg-hazard-sm" />
      </div>
      <span className="sr-only">読み込み中</span>
    </div>
  );
}
