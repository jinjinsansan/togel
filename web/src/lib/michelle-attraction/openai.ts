import OpenAI from "openai";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import { michelleAttractionServerEnv } from "@/lib/michelle-attraction/env.server";

let michelleAttractionOpenAIClient: OpenAI | null = null;

export const getMichelleAttractionOpenAIClient = () => {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    throw new Error("Michelle Attraction AI is disabled");
  }

  if (michelleAttractionOpenAIClient) {
    return michelleAttractionOpenAIClient;
  }

  if (!michelleAttractionServerEnv.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  michelleAttractionOpenAIClient = new OpenAI({ apiKey: michelleAttractionServerEnv.openAiApiKey });
  return michelleAttractionOpenAIClient;
};

export const getMichelleAttractionAssistantId = () => {
  if (!michelleAttractionServerEnv.assistantId) {
    throw new Error("MICHELLE_ATTRACTION_ASSISTANT_ID is not configured");
  }
  return michelleAttractionServerEnv.assistantId;
};
