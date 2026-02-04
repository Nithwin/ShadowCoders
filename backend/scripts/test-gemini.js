const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables directly if needed
require('dotenv').config();

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('ERROR: GOOGLE_API_KEY is not set in your .env file.');
  process.exit(1);
}

const MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

async function main() {
  console.log('--- ShadowCoders AI Diagnostic ---');
  console.log('Testing models with your API key...\n');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  for (const modelName of MODELS) {
    try {
      process.stdout.write(`Checking ${modelName}... `);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent('Say "OK"');
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ SUCCESS! Response: ${text.trim()}`);
      console.log('\nSUCCESS: AI service is ready to use.');
      process.exit(0); 
    } catch (error) {
      const message = error?.message || String(error);
      if (message.includes('429') || message.includes('quota')) {
        console.log(`❌ Quota Exceeded (429)`);
      } else if (message.includes('404')) {
        console.log(`❌ Not Found (404)`);
      } else {
        console.log(`❌ Error: ${message.split('\n')[0]}`);
      }
    }
  }
  
  console.log('\nFAILED: No working models found. Please check your Gemini API key and billing status.');
  process.exit(1);
}

main();
