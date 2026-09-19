import type { TypeGroupId } from "@/lib/personality/groups";

/**
 * 群バッジ（群名 ＋ 再定義の一行）。
 *
 * 【このファイルの役割】
 * 群名と「再定義の一行」を一体で保持し、名前だけを取り出せない形にする。
 * 群名はユーザーが自分に貼るラベルなので、名前だけを裸で出すと
 * 自己否定の補強になる（特に「不活性群」）。Togelは、弱点に見える性質を
 * 「自分を守るための働き」として言い直す立場を取っているため、
 * 群名を出すすべての場所で再定義を同時に出す。
 *
 * そのため GROUP_BADGE は export しない。外に出すのは
 * 「必ず両方を描画する」3つの入口（GroupBadge / GroupBadgeOg / groupBadgeLine）だけ。
 */

type GroupBadgeContent = {
  emoji: string;
  /** 群名。単独で画面・文面に出さない */
  label: string;
  /** 再定義の一行。省略不可 */
  redefinition: string;
};

const GROUP_BADGE: Record<TypeGroupId, GroupBadgeContent> = {
  ignition: { emoji: "🔥", label: "引火群", redefinition: "すぐ燃える。だから世界が動く" },
  settling: { emoji: "🌑", label: "沈降群", redefinition: "深く沈む。だから底が見える" },
  chain: { emoji: "🔗", label: "連鎖群", redefinition: "つながる。だから独りにしない" },
  inert: { emoji: "🛡️", label: "不活性群", redefinition: "動かない。だから壊れない" },
};

/**
 * 群のアイコン（絵文字のみ）。名前ではないのでこれ単独で使ってよいが、
 * 凡例（GroupBadge / GroupBadgeOg）が同じ画面・同じ画像にあることを条件とする。
 */
export const groupEmoji = (group: TypeGroupId): string => GROUP_BADGE[group].emoji;

/** テキスト文脈用（alt属性・LINE文面など）。群名と再定義を必ず1文字列で返す */
export const groupBadgeLine = (group: TypeGroupId): string => {
  const { label, redefinition } = GROUP_BADGE[group];
  return `${label}——${redefinition}`;
};

type GroupBadgeProps = {
  group: TypeGroupId;
  /** compact: 1行に収める（カード内・表の見出しなど） */
  variant?: "default" | "compact";
  className?: string;
};

/** 画面（DOM）用の群バッジ。4群とも同じ装飾にする（群に優劣を作らない） */
export const GroupBadge = ({ group, variant = "default", className = "" }: GroupBadgeProps) => {
  const { emoji, label, redefinition } = GROUP_BADGE[group];

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}
        aria-label={groupBadgeLine(group)}
      >
        <span className="text-[12px] font-black text-hazard">
          {emoji} {label}
        </span>
        <span className="text-[11px] font-bold text-txt-muted">{redefinition}</span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex flex-col gap-1 rounded-[12px] border border-line bg-surface-alt px-3.5 py-2.5 ${className}`}
      aria-label={groupBadgeLine(group)}
    >
      <span className="text-[12px] font-black tracking-[0.12em] text-hazard">
        {emoji} {label}
      </span>
      <span className="text-[12px] font-bold leading-[1.7] text-txt-muted">{redefinition}</span>
    </div>
  );
};

type GroupBadgeOgProps = {
  group: TypeGroupId;
  /** 画像内のフォントサイズ基準値（px） */
  size?: number;
};

/**
 * OG画像（satori）用の群バッジ。
 * satoriはTailwindを解釈しないのでインラインstyleで書く。DOM版と同じく2要素セット。
 */
export const GroupBadgeOg = ({ group, size = 34 }: GroupBadgeOgProps) => {
  const { emoji, label, redefinition } = GROUP_BADGE[group];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: size * 0.2,
        padding: `${size * 0.5}px ${size * 0.7}px`,
        borderRadius: size * 0.45,
        border: "2px solid #29303f",
        background: "rgba(255,255,255,.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: size,
          fontWeight: 900,
          letterSpacing: "0.08em",
          color: "#FFE03D",
        }}
      >
        {emoji} {label}
      </div>
      <div style={{ display: "flex", fontSize: size * 0.85, fontWeight: 700, color: "#9aa5ba" }}>
        {redefinition}
      </div>
    </div>
  );
};
