import { Request, Response } from 'express';
export declare const getAvailableItems: (req: Request, res: Response) => Promise<void>;
export declare const createOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMyOrders: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllItems: (req: Request, res: Response) => Promise<void>;
export declare const createItem: (req: Request, res: Response) => Promise<void>;
export declare const updateItem: (req: Request, res: Response) => Promise<void>;
export declare const getAllOrders: (req: Request, res: Response) => Promise<void>;
export declare const getOrderById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateOrder: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=redeem.controller.d.ts.map