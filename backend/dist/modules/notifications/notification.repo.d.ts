import { Prisma } from '@prisma/client';
export declare const createNotification: (data: Prisma.NotificationCreateInput) => Promise<{
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
export declare const getNotifications: (userId: string, limit?: number) => Promise<{
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
//# sourceMappingURL=notification.repo.d.ts.map