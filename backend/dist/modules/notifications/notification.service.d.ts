import { Role, Prisma } from '@prisma/client';
export declare const createNotification: (userId: string, title: string, message: string, type: string, link?: string, metadata?: any) => Promise<{
    message: string;
    link: string | null;
    id: string;
    createdAt: Date;
    userId: string;
    type: string;
    title: string;
    isRead: boolean;
    metadata: Prisma.JsonValue | null;
}>;
export declare const getUserNotifications: (userId: string) => Promise<{
    message: string;
    link: string | null;
    id: string;
    createdAt: Date;
    userId: string;
    type: string;
    title: string;
    isRead: boolean;
    metadata: Prisma.JsonValue | null;
}[]>;
export declare const markAsRead: (id: string, userId: string) => Promise<Prisma.BatchPayload>;
export declare const markAllAsRead: (userId: string) => Promise<Prisma.BatchPayload>;
export declare const notifyRole: (role: Role, title: string, message: string, type: string, link?: string) => Promise<void>;
//# sourceMappingURL=notification.service.d.ts.map