import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabaseAuthUnavailableError extends Error {
  public readonly context: string;

  public readonly originalError: unknown;

  constructor(context: string, originalError: unknown) {
    super(`Supabase auth unavailable: ${context}`);
    this.name = "SupabaseAuthUnavailableError";
    this.context = context;
    this.originalError = originalError;
  }
}

export const getRouteUser = async <Database>(
  supabase: SupabaseClient<Database>,
  context: string,
) => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn(`[${context}] Supabase auth warning`, error);
    }
    return data.user;
  } catch (error) {
    console.error(`[${context}] Supabase auth request failed`, error);
    throw new SupabaseAuthUnavailableError(context, error);
  }
};
