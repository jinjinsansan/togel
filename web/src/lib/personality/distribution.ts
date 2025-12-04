import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { personalityTypes, getTogelLabel } from ".";

export type TogelDistributionItem = {
  id: string;
  label: string; // Togel XX型
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
  const counts = new Map<string, number>();
  let total = 0;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { data, error } = await supabase.from("togel_type_counts").select("animal_type, total");
      if (error) throw error;

      const rows = data ?? [];
      const attemptCounts = new Map<string, number>();
      let attemptTotal = 0;

      rows.forEach((row) => {
        if (!row?.animal_type) return;
        const count = Number(row.total) || 0;
        attemptCounts.set(row.animal_type, count);
        attemptTotal += count;
      });

      counts.clear();
      attemptCounts.forEach((count, label) => counts.set(label, count));
      total = attemptTotal;
      break;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error("Failed to load togel distribution", error);
        break;
      }
      const waitMs = attempt * 500;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

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

  const legacyRemainders = Array.from(counts.entries()).map(([label, value]) => ({
    label,
    count: value,
  }));

  return {
    total,
    distribution,
    legacy: legacyRemainders,
  };
};
