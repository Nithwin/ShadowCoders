import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { env } from '../config/env'; // Assuming your env.ts has GOOGLE_API_KEY

const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY!);

// List of models to try in order of preference
// Based on Google AI Studio API keys and user's working reference
// gemini-2.5-flash is confirmed working in user's reference code
// Note: API keys from AI Studio (https://aistudio.google.com/api-keys) 
// have access to different models than Vertex AI
const MODEL_PRIORITIES = [
  'gemini-2.5-flash',        // Confirmed working in user's reference
  'gemini-1.5-flash-latest', // Stable flash model
  'gemini-1.5-flash',        // Flash model  
  'gemini-1.5-pro-latest',   // Pro model latest
  'gemini-1.5-pro',          // Pro model
];

/**
 * Helper function to list available models (for debugging)
 * This can help identify which models are accessible with the API key
 */
export const listAvailableModels = async () => {
  try {
    // Note: The @google/generative-ai package doesn't have a direct listModels method
    // We'll try each model and see which ones work
    const availableModels: string[] = [];
    const unavailableModels: string[] = [];
    
    for (const modelName of MODEL_PRIORITIES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // Try a minimal request to test if model is available
        await model.generateContent('test');
        availableModels.push(modelName);
      } catch (error: any) {
        unavailableModels.push(modelName);
      }
    }
    
    return { availableModels, unavailableModels };
  } catch (error) {
    console.error('Error listing models:', error);
    throw error;
  }
};

// Get model instance - will try models in priority order
const getModel = (modelName?: string) => {
  return genAI.getGenerativeModel({
    model: modelName || MODEL_PRIORITIES[0]!,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7, // Lower temperature for more consistent output
    },
    // Safety settings (optional, but good for this use case)
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });
};

/**
 * Sends a structured prompt to the Gemini API and expects a JSON string back.
 * Tries multiple models in order if one fails.
 */
export const generateJsonFromAi = async (prompt: string): Promise<string> => {
  if (!env.GOOGLE_API_KEY) {
    throw { status: 500, message: 'Google API key is not configured. Please contact administrator.' };
  }


  let lastError: any = null;
  const errorsByModel: Array<{ model: string; error: string }> = [];
  
  // Try each model in priority order
  for (const modelName of MODEL_PRIORITIES) {
    try {
      const currentModel = getModel(modelName);
      
      const result = await currentModel.generateContent(prompt);
      const response = result.response;
      
      // Check if the response was blocked by safety settings
      if (response.promptFeedback?.blockReason) {
        const blockReason = response.promptFeedback.blockReason;
        throw { 
          status: 400, 
          message: `Content generation was blocked due to safety filters. Reason: ${blockReason}. Please adjust your topic and try again.` 
        };
      }

      const responseText = response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        throw { status: 500, message: 'AI returned an empty response. Please try again.' };
      }

      return responseText;
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      errorsByModel.push({ model: modelName, error: errorMsg });
      
      console.error(`[Gemini] Model ${modelName} failed:`, {
        message: errorMsg,
        status: error?.status,
        code: error?.code,
        stack: error?.stack?.substring(0, 200), // First 200 chars of stack
      });
      
      // If it's a 404 (model not found), try the next model
      if (error?.message?.includes('404') || 
          error?.message?.includes('not found') || 
          error?.message?.includes('is not found for API version') ||
          error?.status === 404 ||
          error?.code === 404) {
        console.warn(`[Gemini] Model ${modelName} not available (404), trying next model...`);
        continue; // Try next model
      }
      
      // If it's not a 404, it's a different error (safety, quota, etc.) - don't retry
      console.error(`[Gemini] Non-404 error for model ${modelName}, stopping retry loop`);
      break;
    }
  }
  
  // Log all errors for debugging
  console.error('[Gemini] All models failed. Error summary:', JSON.stringify(errorsByModel, null, 2));

  // If we get here, all models failed
  console.error('All models failed. Last error:', lastError);
  
  // Handle specific Gemini API errors
  if (lastError?.status) {
    // Already formatted error
    throw lastError;
  }
  
  // Handle API-specific errors
  if (lastError?.message?.includes('API_KEY') || 
      lastError?.message?.includes('api key') || 
      lastError?.code === 'invalid_api_key') {
    throw { status: 500, message: 'Invalid Google API key. Please contact administrator.' };
  }
  
  if (lastError?.message?.includes('quota') || 
      lastError?.message?.includes('QUOTA') || 
      lastError?.code === 'resource_exhausted' || 
      lastError?.status === 429) {
    throw { status: 503, message: 'AI service quota exceeded. Please try again later.' };
  }

  // Handle blocked content
  if (lastError?.message?.includes('blocked') || 
      lastError?.message?.includes('safety') || 
      lastError?.message?.includes('SAFETY')) {
    throw { status: 400, message: 'Content was blocked by safety filters. Please adjust your topic and try again.' };
  }

  // Handle model not found error
  if (lastError?.message?.includes('404') || 
      lastError?.message?.includes('not found') || 
      lastError?.message?.includes('is not found for API version')) {
    throw { 
      status: 500, 
      message: `None of the available Gemini models are accessible. Please check your API key permissions or try again later. Error: ${lastError?.message || 'Model not found'}` 
    };
  }

  // Generic error
  throw { 
    status: 500, 
    message: lastError?.message || 'Failed to generate content from AI. Please try again.' 
  };
};