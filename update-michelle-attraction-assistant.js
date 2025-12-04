const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "web", ".env.local");
const env = {};

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1].trim()] = value;
  }
}

const openaiApiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const assistantId = env.MICHELLE_ATTRACTION_ASSISTANT_ID || process.env.MICHELLE_ATTRACTION_ASSISTANT_ID;
const systemPromptPath = path.join(__dirname, "web", "md", "michelle_gpts_system", "01_system_prompt.md");

if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY is required");
}

if (!assistantId) {
  throw new Error("MICHELLE_ATTRACTION_ASSISTANT_ID is required");
}

if (!fs.existsSync(systemPromptPath)) {
  throw new Error(`System prompt file not found: ${systemPromptPath}`);
}

const instructions = fs.readFileSync(systemPromptPath, "utf-8");
const OpenAI = require("./web/node_modules/openai");
const client = new OpenAI({ apiKey: openaiApiKey });

async function main() {
  console.log("Updating existing Michelle Attraction assistant...");
  const assistant = await client.beta.assistants.update(assistantId, {
    instructions,
  });

  console.log("✅ Update complete");
  console.log("Assistant:", assistant.id, `(${assistant.name})`);
}

main().catch((error) => {
  console.error("❌ Failed to update assistant", error);
  process.exit(1);
});
