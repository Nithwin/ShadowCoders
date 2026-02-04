import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { env } from '../config/env'; // Assuming your env.ts has GOOGLE_API_KEY

const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY!);

// List of models to try in order of preference
// Based on Google Generative AI API available models
// Only include valid Gemini models that are available via Google AI Studio
const MODEL_PRIORITIES = [
  'gemini-3-flash-preview',  // Gemini 3 (found to work)
  'gemini-2.5-flash',        // Gemini 2.5 (available)
  'gemini-2.0-flash',        // Latest stable flash model
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
 * Implements exponential backoff for rate limiting (429) errors.
 */
export const generateJsonFromAi = async (prompt: string): Promise<string> => {
  if (!env.GOOGLE_API_KEY) {
    throw { status: 500, message: 'Google API key is not configured. Please contact administrator.' };
  }

  let lastError: any = null;
  const errorsByModel: Array<{ model: string; error: string }> = [];
  
  // Try each model in priority order
  for (const modelName of MODEL_PRIORITIES) {
    let retryCount = 0;
    const maxRetries = 2;
    let success = false;
    
    while (retryCount <= maxRetries && !success) {
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
        const statusCode = error?.status || error?.code;
        
        // Log the error with status
        console.error(`[Gemini] Model ${modelName} (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
          message: errorMsg.substring(0, 200),
          status: statusCode,
        });
        
        // Handle 429 Rate Limit - retry with exponential backoff
        if (statusCode === 429 || error?.message?.includes('429')) {
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const backoffMs = Math.pow(2, retryCount - 1) * 1000;
            console.warn(`[Gemini] Rate limited (429). Retrying ${modelName} after ${backoffMs}ms...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue; // Retry same model
          } else {
            // Max retries exceeded for this model
            errorsByModel.push({ 
              model: modelName, 
              error: 'Quota exceeded - Free tier limit reached. Please upgrade your Google API key or try again later.' 
            });
            break; // Move to next model
          }
        }
        
        // If it's a 404 (model not found), try the next model
        if (statusCode === 404 || 
            error?.message?.includes('404') || 
            error?.message?.includes('not found') || 
            error?.message?.includes('is not found for API version')) {
          console.warn(`[Gemini] Model ${modelName} not available (404), trying next model...`);
          errorsByModel.push({ model: modelName, error: 'Model not found (404)' });
          break; // Move to next model
        }
        
        // Check for other server errors (503, 500, 502, 504) - try next model
        if (statusCode === 503 || statusCode === 500 || statusCode === 502 || statusCode === 504 ||
            error?.message?.includes('503') || error?.message?.includes('overloaded') ||
            error?.message?.includes('500') || error?.message?.includes('internal server error')) {
          console.warn(`[Gemini] Model ${modelName} encountered server error (${statusCode}), trying next model...`);
          errorsByModel.push({ model: modelName, error: `Server error (${statusCode})` });
          break; // Move to next model
        }

        // Other errors - don't retry, move to next model
        console.error(`[Gemini] Non-retriable error for model ${modelName}, stopping for this model`);
        errorsByModel.push({ model: modelName, error: errorMsg.substring(0, 100) });
        break;
      }
    }
  }
  
  // Log all errors for debugging
  console.error('[Gemini] All models failed. Error summary:', JSON.stringify(errorsByModel, null, 2));

  // If we get here, all models failed
  console.error('All models failed. Last error:', lastError?.message?.substring(0, 300));
  
  // Handle specific Gemini API errors with user-friendly messages
  if (lastError?.status === 429 || lastError?.message?.includes('429')) {
    throw { 
      status: 503, 
      message: 'AI service is currently overloaded due to high demand. Please try again in a few moments. If this persists, you may need to upgrade your Google API plan.' 
    };
  }
  
  if (lastError?.message?.includes('API_KEY') || 
      lastError?.message?.includes('api key') || 
      lastError?.code === 'invalid_api_key') {
    throw { status: 500, message: 'Invalid Google API key. Please contact administrator.' };
  }
  
  if (lastError?.message?.includes('quota') || 
      lastError?.message?.includes('QUOTA')) {
    throw { 
      status: 503, 
      message: 'AI service quota exceeded. Please upgrade your Google API plan or try again later.' 
    };
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
      message: `None of the available Gemini models are accessible. Please check your API key permissions or try again later.` 
    };
  }

  // Generic error
  throw { 
    status: 500, 
    message: lastError?.message?.substring(0, 200) || 'Failed to generate content from AI. Please try again.' 
  };
};