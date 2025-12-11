import axios from 'axios';
import { env } from '../config/env';

/**
 * Sends a prompt to the local Ollama instance and expects a JSON string back.
 * Uses the 'json' format parameter to force JSON output (requires supported models like llama3, mistral).
 */
export const generateJsonFromOllama = async (prompt: string): Promise<string> => {
  const baseUrl = env.OLLAMA_BASE_URL;
  const model = env.OLLAMA_MODEL;


  try {
    const response = await axios.post(`${baseUrl}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false, // We want the full response at once
      format: 'json', // Force JSON output
      options: {
        temperature: 0.7, // Consistent with Gemini settings
      }
    });

    if (!response.data || !response.data.response) {
      throw { status: 500, message: 'Ollama returned an empty response.' };
    }

    const responseText = response.data.response;
    
    return responseText;
  } catch (error: any) {
    console.error('[Ollama] Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      throw { 
        status: 503, 
        message: `Could not connect to Ollama at ${baseUrl}. Make sure Ollama is running locally.` 
      };
    }

    // Handle 404 (Model not found)
    if (error.response?.status === 404) {
       throw { 
        status: 404, 
        message: `Ollama model '${model}' not found. Run 'ollama pull ${model}' in your terminal.` 
      };
    }

    throw { 
      status: 500, 
      message: `Ollama error: ${error.message || 'Unknown error'}` 
    };
  }
};
