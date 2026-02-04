import { Request, Response } from 'express';
import { executeCodeLocally } from '../../lib/local-executor';

/**
 * Run arbitrary code (generic execution)
 * Used directly by the frontend code editor for testing code without an exam attempt context
 */
export const runCodeHandler = async (req: Request, res: Response) => {
  try {
    const { code, language, input } = req.body;

    if (!code || !language) {
      return res.status(400).json({ 
        error: { 
          message: 'Code and language are required' 
        } 
      });
    }

    // Default execution options
    const timeLimit = 5000; // 5 seconds
    
    const result = await executeCodeLocally(
      code,
      language,
      input,
      timeLimit
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[Execution] Run failed:', error);
    return res.status(500).json({
      error: {
        message: error.message || 'Execution failed'
      }
    });
  }
};
