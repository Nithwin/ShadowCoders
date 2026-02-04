import { Express } from 'express';
// import { verifyAccess } from '../../middleware/auth'; // Optional: if you want to protect this
import * as executionController from './execution.controller';

export const registerExecutionRoutes = (app: Express) => {
  app.post(
    '/api/execution/run',
    // verifyAccess, // Uncomment to require login
    executionController.runCodeHandler
  );
};
