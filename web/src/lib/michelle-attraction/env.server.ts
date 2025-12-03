const getOptionalEnv = (key: string) => process.env[key];

export const michelleAttractionServerEnv = {
  openAiApiKey: getOptionalEnv("OPENAI_API_KEY") ?? null,
  assistantId: getOptionalEnv("MICHELLE_ATTRACTION_ASSISTANT_ID") ?? null,
};
