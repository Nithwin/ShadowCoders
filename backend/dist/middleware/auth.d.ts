import { RequestHandler } from "express";
import { Role } from "@prisma/client";
export declare const verifyAccess: RequestHandler;
export declare const requireRole: (role: Role) => RequestHandler;
//# sourceMappingURL=auth.d.ts.map