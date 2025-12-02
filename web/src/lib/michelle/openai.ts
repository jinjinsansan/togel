import OpenAI from "openai";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { michelleServerEnv } from "@/lib/michelle/env.server";

let michelleOpenAIClient: OpenAI | null = null;

export const getMichelleOpenAIClient = () => {
  if (!MICHELLE_AI_ENABLED) {
    throw new Error("Michelle AI is disabled");
  }

  if (michelleOpenAIClient) {
    return michelleOpenAIClient;
  }

  if (!michelleServerEnv.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  michelleOpenAIClient = new OpenAI({ apiKey: michelleServerEnv.openAiApiKey });
  return michelleOpenAIClient;
};

export const getMichelleAssistantId = () => {
  if (!michelleServerEnv.assistantId) {
    throw new Error("MICHELLE_ASSISTANT_ID (or ASSISTANT_ID) is not configured");
  }
  return michelleServerEnv.assistantId;
};
