import { Express, RequestHandler } from 'express';
import * as executionController from './execution.controller';

interface ExecutionMiddleware {
  throttleCodeSubmission: RequestHandler;
  validateCodeInput: RequestHandler;
}

export const registerExecutionRoutes = (app: Express, middleware?: ExecutionMiddleware) => {
  const handlers: RequestHandler[] = [];

  // Apply throttle and validation middleware if provided
  if (middleware?.throttleCodeSubmission) {
    handlers.push(middleware.throttleCodeSubmission);
  }
  if (middleware?.validateCodeInput) {
    handlers.push(middleware.validateCodeInput);
  }

  app.post(
    '/api/execution/run',
    ...handlers,
    executionController.runCodeHandler
  );
};
