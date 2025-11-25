const getServerEnvVar = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing server environment variable: ${key}`);
  }
  return value;
};

export const serverEnv = {
  supabaseServiceRoleKey: getServerEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
};
