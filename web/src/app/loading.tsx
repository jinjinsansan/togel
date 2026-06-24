export default function Loading() {
  return (
    <div
      role="status"
      aria-label="読み込み中"
      className="flex min-h-screen items-center justify-center bg-slate-50"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#E91E63]" />
      <span className="sr-only">読み込み中</span>
    </div>
  );
}
