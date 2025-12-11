import { RequestHandler, Request } from "express";
import { Role } from "@prisma/client";
export interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
        role: string;
    };
}
export declare const verifyAccess: RequestHandler;
export declare const requireRole: (role: Role) => RequestHandler;
//# sourceMappingURL=auth.d.ts.map