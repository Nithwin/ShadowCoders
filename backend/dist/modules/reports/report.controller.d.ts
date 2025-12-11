import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
export declare const createReport: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getReports: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateReportStatus: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=report.controller.d.ts.map