import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { personalityTypes, getTogelLabel } from ".";

export type TogelDistributionItem = {
  id: string;
  label: string; // TOGEL XX型
  typeName: string; // 創造的リーダー 等
  description: string;
  catchphrase: string;
  emoji: string;
  tags: string[];
  count: number;
  percentage: number;
};

export const loadTogelDistribution = async () => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("diagnosis_results").select("animal_type");

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const total = rows.length;
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const key = row.animal_type ?? "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const distribution: TogelDistributionItem[] = personalityTypes.map((type) => {
    const label = getTogelLabel(type.id);
    const count = counts.get(label) ?? 0;
    counts.delete(label);
    const percentage = total ? Math.round((count / total) * 1000) / 10 : 0;
    return {
      id: type.id,
      label,
      typeName: type.typeName,
      description: type.description,
      catchphrase: type.catchphrase,
      emoji: type.emoji,
      tags: type.tags,
      count,
      percentage,
    };
  });

  const legacyRemainders = Array.from(counts.entries()).map(([label, count]) => ({
    label,
    count,
  }));

  return {
    total,
    distribution,
    legacy: legacyRemainders,
  };
};
