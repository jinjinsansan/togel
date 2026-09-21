import { BOARD_ANGLES } from "@/lib/coaching/board";
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
 */

type BoardType = ExtendedPersonalityTypeDefinition;
type OpenCell = { typeId: string; angle: BoardAngle } | null;

/**
 * タイプごとに1枚、1行が1つの角度。**読むものへの入口**であって、盤ではない。
 *
 * 「歩いた数」を数えるのをやめた（2026-09-21）。数えていたのは
 * 「ガイドを何ページ開いたか」で、増えても読む人に意味が無かった。
 * 置き換えられる数がそもそも無い（診断後に積み上がるものがまだ無い）ので、
 * 無いものを数える図を残さず、**入口と本文だけにした**。
 */
export const BoardTypeCards = ({
  types,
  open = null,
  onOpenCell,
}: {
  types: BoardType[];
  open?: OpenCell;
  onOpenCell?: (typeId: string, angle: BoardAngle) => void;
}) => (
  <div className="flex flex-col gap-4">
    {types.map((type) => {
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
          </div>

          <div className="mt-3.5 flex flex-col gap-2">
            {BOARD_ANGLES.map((angle, index) => {
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
                      : "border-lightline bg-white hover:border-navy"
                  }`}
                >
                  <span
                    className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] text-[11px] font-black ${
                      isOpen
                        ? "bg-white text-navy"
                        : "bg-[#f1f5f2] text-[#8b9aae]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`flex-grow text-[13px] font-bold ${
                      isOpen ? "text-white" : "text-lighttext-muted"
                    }`}
                  >
                    {angle.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);
