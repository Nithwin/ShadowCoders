import { Request, Response } from 'express';
export declare const getMyPoints: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMyPointsHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const adjustPoints: (req: Request, res: Response) => Promise<void>;
export declare const addPointsByEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const bulkAwardPointsForExam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=points.controller.d.ts.map