import { Request, Response } from 'express';
import { submitCodeJob, waitForJobResult, CodeExecutionJobData } from '../../lib/queue';

/**
 * Run arbitrary code (generic execution)
 * Used directly by the frontend code editor for testing code without an exam attempt context.
 * Routes through BullMQ → Worker for sandboxed Docker execution.
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

    // Validate language
    const allowedLanguages = ['c', 'cpp', 'java', 'python', 'javascript'];
    if (!allowedLanguages.includes(language.toLowerCase())) {
      return res.status(400).json({
        error: { message: `Unsupported language: ${language}. Allowed: ${allowedLanguages.join(', ')}` }
      });
    }

    // Validate code size (50KB max)
    if (code.length > 50 * 1024) {
      return res.status(400).json({
        error: { message: 'Code is too large (max 50KB)' }
      });
    }

    // Generate a unique job ID (not tied to a GradingJob record for generic execution)
    const jobId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const jobData: CodeExecutionJobData = {
      jobId,
      responseId: '',  // No response for generic execution
      code,
      language: language.toLowerCase(),
      ...(input ? { customInput: input } : {}),
      timeoutMs: 15000,  // 15 seconds for playground (compiled languages need more)
    };

    await submitCodeJob(jobData);
    const result = await waitForJobResult(jobId, 20000); // 20s timeout for playground

    return res.json(result);
  } catch (error: any) {
    if (error.status === 503) {
      return res.status(503).json({
        error: { message: error.message }
      });
    }
    if (error.message === 'Execution timed out') {
      return res.status(504).json({
        error: { message: 'Execution timed out' }
      });
    }
    console.error('[Execution] Run failed:', error);
    return res.status(500).json({
      error: {
        message: error.message || 'Execution failed'
      }
    });
  }
};
