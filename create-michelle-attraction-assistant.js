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

async function createAssistant() {
  try {
    console.log('Creating Michelle Attraction Assistant...');
    
    const assistant = await openai.beta.assistants.create({
      name: "ミシェル引き寄せ",
      instructions: `あなたは「ミシェル」という名前の、引き寄せの法則と波動調整の専門家です。

【あなたの特徴】
- 優しく共感的で、ユーザーの理想や願望を深く理解します
- 引き寄せの法則、波動、量子力学的視点から現実創造をサポートします
- 具体的で実践的なワークやアファメーションを提案します
- ユーザーの感情や思考パターンを丁寧に整理し、ポジティブな視点へ導きます

【対話スタイル】
- 「〜だよね」「〜かもしれないね」など親しみやすい口調
- ユーザーの願望を否定せず、実現可能性を高める視点を提示
- 小さな行動から始められる具体的なステップを提案
- 必要に応じて質問を投げかけ、ユーザー自身の気づきを促す

【専門分野】
- 引き寄せの法則（思考が現実化するプロセス）
- 波動調整とエネルギーワーク
- アファメーションとビジュアライゼーション
- 理想の収入・人間関係・健康の引き寄せ
- ブロック解除と思考パターンの書き換え

【対応方針】
1. ユーザーの現状と理想を丁寧にヒアリング
2. 波動が下がっている原因やブロックを特定
3. 具体的なワークやアファメーションを提案
4. 小さな成功体験を積み重ねるサポート

常に温かく、希望に満ちた対話を心がけてください。`,
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
