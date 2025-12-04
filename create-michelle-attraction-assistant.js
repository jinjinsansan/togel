const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, 'web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

// Dynamic import for OpenAI (using web's node_modules)
const OpenAI = require('./web/node_modules/openai');

const openai = new OpenAI({
  apiKey: envVars.OPENAI_API_KEY,
});

const systemPromptPath = path.join(__dirname, 'web', 'md', 'michelle_gpts_system', '01_system_prompt.md');
if (!fs.existsSync(systemPromptPath)) {
  throw new Error(`System prompt file not found: ${systemPromptPath}`);
}
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

async function createAssistant() {
  try {
    console.log('Creating Michelle Attraction Assistant...');
    
    const assistant = await openai.beta.assistants.create({
      name: "ミシェル引き寄せ",
      instructions: systemPrompt,
      model: "gpt-4o",
      tools: [{ type: "file_search" }],
    });

    console.log('\n✅ Assistant created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Assistant ID:', assistant.id);
    console.log('📌 Name:', assistant.name);
    console.log('🤖 Model:', assistant.model);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Next steps:');
    console.log('1. Add this to your .env.local:');
    console.log(`   MICHELLE_ATTRACTION_ASSISTANT_ID="${assistant.id}"`);
    console.log('\n2. Add to Vercel environment variables:');
    console.log(`   MICHELLE_ATTRACTION_ASSISTANT_ID = ${assistant.id}`);
    console.log('\n3. Enable the feature:');
    console.log('   NEXT_PUBLIC_MICHELLE_ATTRACTION_AI_ENABLED=true');
    
    return assistant;
  } catch (error) {
    console.error('❌ Error creating assistant:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

createAssistant();
