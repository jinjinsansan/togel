/**
 * Togel ブランドマーク（ファミリー共通DNA: ネイビータイル＋モノグラム＋">"スワイプ）。
 * Togel は ´T´ モノグラム＋ブランドピンクのグラデーション。
 */
export function TogelMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Togel"
    >
      <defs>
        <linearGradient id="tgLogo" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff6fa5" />
          <stop offset="1" stopColor="#E91E63" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#0b1f3a" />
      <path
        d="M9 13.5h13M15.5 13.5V27"
        fill="none"
        stroke="url(#tgLogo)"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 20l6-5m-6 5l6 5"
        fill="none"
        stroke="url(#tgLogo)"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
