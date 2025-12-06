const getServerEnvVar = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing server environment variable: ${key}`);
  }
  return value;
};

const getOptionalEnvVar = (key: string, defaultValue: string) => {
  return process.env[key] ?? defaultValue;
};

export const serverEnv = {
  supabaseServiceRoleKey: getServerEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
  useSinrRag: getOptionalEnvVar("USE_SINR_RAG", "false") === "true",
};
