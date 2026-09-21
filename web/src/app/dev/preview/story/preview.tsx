"use client";

import { StoryViewer } from "@/components/result/story-viewer";
import { personalityTypes } from "@/lib/personality";
import { TYPE_PROTOTYPES } from "@/lib/personality/prototypes";
import {
  HEAT_KEYS,
  INTENSITY_KEYS,
  REACTION_KEYS,
  type HeatKey,
  type IntensityKey,
  type ReactionKey,
} from "@/lib/personality/reaction";
import { buildStoryFromKeys } from "@/lib/personality/story/cards";
import { storyLabelHref } from "@/lib/share/story-label";

const pick = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export const StoryPreview = ({
  typeId,
  reaction,
  intensity,
  heat,
  card,
}: {
  typeId: string;
  reaction: string;
  intensity: string;
  heat: string;
  card: number;
}) => {
  const type = personalityTypes.find((t) => t.id === typeId) ?? personalityTypes[0];
  const keys = {
    typeId: type.id,
    reaction: pick<ReactionKey>(reaction, REACTION_KEYS, "evaluation"),
    intensity: pick<IntensityKey>(intensity, INTENSITY_KEYS, "mid"),
    heat: pick<HeatKey>(heat, HEAT_KEYS, "high"),
  };
  const story = buildStoryFromKeys(keys);
  // INDEX（5枚目）の数字は、そのタイプの原型スコアで描く
  const scores = TYPE_PROTOTYPES[type.id];
  if (!story) return <p className="p-6 text-white">組み立てられない分岐です</p>;

  return (
    <div className="bg-ink">
      <StoryViewer
        story={story}
        type={type}
        scores={scores}
        labelHref={storyLabelHref(type.id, scores)}
        belowId="preview-below"
        initialIndex={Number.isFinite(card) ? card - 1 : 0}
      />
      <div id="preview-below" className="p-6 text-[12px] text-txt-subtle">
        開発用プレビュー ／ {keys.typeId} ・ {keys.reaction} ・ 強度 {keys.intensity} ・ 放熱 {keys.heat}
      </div>
    </div>
  );
};
