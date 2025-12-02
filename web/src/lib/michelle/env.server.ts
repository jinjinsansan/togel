const getOptionalEnv = (key: string) => process.env[key];

const toBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== "false" && value !== "0";
};

export const michelleServerEnv = {
  openAiApiKey: getOptionalEnv("OPENAI_API_KEY") ?? null,
  assistantId: getOptionalEnv("MICHELLE_ASSISTANT_ID") ?? getOptionalEnv("ASSISTANT_ID") ?? null,
  demoUserId: getOptionalEnv("MICHELLE_DEMO_USER_ID") ?? null,
  demoUserEmail: getOptionalEnv("MICHELLE_DEMO_USER_EMAIL") ?? null,
  demoModeEnabled: toBoolean(getOptionalEnv("MICHELLE_DEMO_MODE"), false),
};
