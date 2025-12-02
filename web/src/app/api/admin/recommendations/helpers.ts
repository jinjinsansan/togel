import { z } from "zod";

export const recommendationSelect = `
  id,
  togel_type_id,
  service_id,
  reason,
  match_percentage,
  display_order,
  show_on_result_page,
  show_on_mypage,
  is_active,
  start_date,
  end_date,
  created_at,
  updated_at,
  service:services (
    id,
    name,
    description,
    image_url,
    link_url,
    category,
    button_text,
    is_active
  )
`;

const percentageField = z.number().int().min(0).max(100);
const orderField = z.number().int().min(0).max(999);

export const recommendationBaseSchema = z.object({
  togelTypeId: z.string().min(1),
  serviceId: z.string().uuid(),
  reason: z.string().min(1),
  matchPercentage: percentageField.optional().nullable(),
  displayOrder: orderField.optional(),
  showOnResultPage: z.boolean().optional(),
  showOnMypage: z.boolean().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export const recommendationCreateSchema = recommendationBaseSchema;

export const recommendationUpdateSchema = recommendationBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "更新する項目がありません" }
);

export const toIsoString = (value?: string | null) => (value ? new Date(value).toISOString() : null);

export type RecommendationRow = {
  id: string;
  togel_type_id: string;
  service_id: string;
  reason: string;
  match_percentage: number | null;
  display_order: number;
  show_on_result_page: boolean;
  show_on_mypage: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  service?: Record<string, unknown> | null;
};

export const serializeRecommendation = (row: RecommendationRow) => ({
  id: row.id,
  togelTypeId: row.togel_type_id,
  serviceId: row.service_id,
  reason: row.reason,
  matchPercentage: row.match_percentage,
  displayOrder: row.display_order,
  showOnResultPage: row.show_on_result_page,
  showOnMypage: row.show_on_mypage,
  isActive: row.is_active,
  startDate: row.start_date,
  endDate: row.end_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  service: row.service
    ? {
        id: String(row.service.id ?? ""),
        name: String(row.service.name ?? ""),
        description: String(row.service.description ?? ""),
        imageUrl: (row.service.image_url as string | null | undefined) ?? null,
        linkUrl: String(row.service.link_url ?? ""),
        category: (row.service.category as string | null | undefined) ?? null,
        buttonText: (row.service.button_text as string | null | undefined) ?? null,
        isActive: Boolean(row.service.is_active ?? true),
      }
    : null,
});

export const hasValidDateRange = (start?: string | null, end?: string | null) => {
  if (!start || !end) return true;
  return new Date(end) > new Date(start);
};
