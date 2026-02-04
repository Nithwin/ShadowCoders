import { Request, Response, NextFunction } from 'express';
import { generationService } from './generation.service';
import { z } from 'zod';
import { Difficulty } from '@prisma/client';

export const generatePoolHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      topic: z.string().min(1),
      count: z.number().min(1).max(50), // per difficulty
      difficulties: z.array(z.enum(['VERY_EASY', 'EASY', 'MEDIUM', 'HARD'])).optional()
    });

    const body = schema.parse(req.body);
    
    // Trigger bulk generation
    // This could be long-running, so ideally we might return a job ID.
    // For now, we await it (since we established "Prepare Exam" flow, admin waits or we return partial?)
    // Given 100 questions might take a while, let's allow it to run but maybe the frontend shows progress via sockets?
    // For MVP, we await.
    
    const result = await generationService.bulkGenerate(body.topic, body.count, body.difficulties as Difficulty[]);
    
    res.json({
      message: "Generation completed",
      details: result
    });
  } catch (error) {
    next(error);
  }
};
