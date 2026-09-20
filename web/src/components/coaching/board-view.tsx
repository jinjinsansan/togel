import { BOARD_ANGLES, ANGLES_PER_TYPE, cellKey } from "@/lib/coaching/board";
import type { BoardAngle } from "@/lib/coaching/board";
import { typeToken } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";

/**
 * 攻略盤の見た目。
 *
 * `/coaching`（本番）と `/dev/preview/board`（開発用の静的プレビュー）の
 * **両方がこれを使う**。プレビュー側で作り直すと、見ているものと出ているものが
 * 別々に育つ。意匠は `Togel 攻略盤.dc.html` に合わせてある。
 *
 * 出していいのは**来た距離と全長だけ**。残数・達成率・ストリーク・完走演出・
 * 督促・他人との比較は置かない。「クリア」ではなく「歩き方を1つ覚えた」。
 */

type BoardType = ExtendedPersonalityTypeDefinition;
type OpenCell = { typeId: string; angle: BoardAngle } | null;

/** ヒーロー（ネイビー→ペーパーの分割）の中身。診断済みのときだけ出る */
export const BoardHero = ({
  types,
  visited,
  walked,
}: {
  types: BoardType[];
  visited: string[];
  walked: number;
}) => {
  // 15マスを1列に。全体が見えるのはここだけ
  const allCells = types.flatMap((type) =>
    BOARD_ANGLES.map((angle) => ({
      key: cellKey(type.id, angle.key),
      walked: visited.includes(cellKey(type.id, angle.key)),
    })),
  );

  return (
    <>
      <h1 className="mt-3.5 text-[clamp(26px,4.4cqw,42px)] font-black leading-[1.3] tracking-[-0.03em] text-white">
        {walked}マス歩きました
      </h1>
      <p className="mb-5.5 mt-3 max-w-[30em] text-[13px] leading-8 text-[#b7c6dd]">
        この盤は全{allCells.length}マス（あなたと噛み合わない{types.length}タイプ ×{" "}
        {ANGLES_PER_TYPE}つの角度）。1マスにつき、覚えるのは歩き方ひとつです。
      </p>

      <div className="rounded-card border border-lightline bg-white px-5.5 py-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]">
        <div className="text-[10px] font-black tracking-[0.22em] text-relief-ink">歩いたところ</div>
        <div className="mt-3 flex flex-wrap gap-[7px]">
          {allCells.map((cell, index) => (
            <span
              key={cell.key}
              className={`flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border text-[10px] font-black ${
                cell.walked
                  ? "border-navy bg-navy text-white"
                  : "border-lightline bg-[#f1f5f2] text-[#8b9aae]"
              }`}
            >
              {index + 1}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] leading-[1.9] text-lighttext-subtle">
          LINEに登録すると、週に1通ずつ届いて勝手に1マス進みます。登録しなくても、ここから自分で歩けます。
        </p>
      </div>
    </>
  );
};

/** タイプごとに1枚、1行が1マス。`onOpenCell` が無ければ押せないだけで見た目は同じ */
export const BoardTypeCards = ({
  types,
  visited,
  open = null,
  onOpenCell,
}: {
  types: BoardType[];
  visited: string[];
  open?: OpenCell;
  onOpenCell?: (typeId: string, angle: BoardAngle) => void;
}) => (
  <div className="flex flex-col gap-4">
    {types.map((type) => {
      const done = BOARD_ANGLES.filter((angle) =>
        visited.includes(cellKey(type.id, angle.key)),
      ).length;
      return (
        <div
          key={type.id}
          className="rounded-card border border-lightline bg-white px-5 py-[18px] shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]"
        >
          <div className="flex flex-wrap items-center gap-[11px]">
            <span className="text-[22px]" aria-hidden="true">
              {type.emoji}
            </span>
            <div className="flex-grow">
              <div className="text-[16px] font-black text-navy">{typeToken(type)}</div>
              <div className="text-[11.5px] text-lighttext-subtle">{type.typeName}</div>
            </div>
            {/* 来た距離。残りではない */}
            <span className="text-[11px] font-black text-relief-ink">
              {done} / {ANGLES_PER_TYPE}
            </span>
          </div>

          <div className="mt-3.5 flex flex-col gap-2">
            {BOARD_ANGLES.map((angle, index) => {
              const walkedCell = visited.includes(cellKey(type.id, angle.key));
              const isOpen = open?.typeId === type.id && open.angle === angle.key;
              return (
                <button
                  key={angle.key}
                  type="button"
                  onClick={onOpenCell ? () => onOpenCell(type.id, angle.key) : undefined}
                  aria-pressed={isOpen}
                  className={`flex min-h-[48px] w-full items-center gap-[11px] rounded-[12px] border px-[13px] py-[9px] text-left transition-colors ${
                    isOpen
                      ? "border-navy bg-navy"
                      : walkedCell
                        ? "border-[#b9e3d0] bg-[#e9f7f0]"
                        : "border-lightline bg-white hover:border-navy"
                  }`}
                >
                  <span
                    className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] text-[11px] font-black ${
                      isOpen
                        ? "bg-white text-navy"
                        : walkedCell
                          ? "bg-relief-ink text-white"
                          : "bg-[#f1f5f2] text-[#8b9aae]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`flex-grow text-[13px] font-bold ${
                      isOpen ? "text-white" : walkedCell ? "text-navy" : "text-lighttext-muted"
                    }`}
                  >
                    {angle.label}
                  </span>
                  {walkedCell && !isOpen && (
                    <span className="text-[11px] font-bold text-relief-ink">
                      歩き方を1つ覚えた
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);
