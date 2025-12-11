import { RedeemOrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
export declare const getAllRedeemItems: (activeOnly?: boolean) => Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    pointsCost: number;
    metadata: Prisma.JsonValue | null;
    isActive: boolean;
    itemType: string;
}[]>;
export declare const getRedeemItemById: (id: string) => Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    pointsCost: number;
    metadata: Prisma.JsonValue | null;
    isActive: boolean;
    itemType: string;
} | null>;
export declare const createRedeemItem: (data: {
    name: string;
    description?: string;
    pointsCost: number;
    itemType: string;
    metadata?: any;
}) => Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    pointsCost: number;
    metadata: Prisma.JsonValue | null;
    isActive: boolean;
    itemType: string;
}>;
export declare const updateRedeemItem: (id: string, data: {
    name?: string;
    description?: string;
    pointsCost?: number;
    isActive?: boolean;
    metadata?: any;
}) => Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    pointsCost: number;
    metadata: Prisma.JsonValue | null;
    isActive: boolean;
    itemType: string;
}>;
export declare const createRedeemOrder: (userId: string, itemId: string, leaveDate?: Date, message?: string) => Promise<{
    user: {
        name: string | null;
        id: string;
        reg_no: string | null;
        email: string;
    };
    item: {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        pointsCost: number;
        metadata: Prisma.JsonValue | null;
        isActive: boolean;
        itemType: string;
    };
} & {
    message: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.RedeemOrderStatus;
    userId: string;
    itemId: string;
    pointsCost: number;
    leaveDate: Date | null;
    adminNotes: string | null;
    rejectionReason: string | null;
    reportUrl: string | null;
    processedById: string | null;
    processedAt: Date | null;
}>;
export declare const getRedeemOrders: (filters: {
    userId?: string;
    status?: RedeemOrderStatus;
    page?: number;
    limit?: number;
}) => Promise<{
    orders: ({
        user: {
            name: string | null;
            id: string;
            reg_no: string | null;
            email: string;
        };
        item: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            pointsCost: number;
            metadata: Prisma.JsonValue | null;
            isActive: boolean;
            itemType: string;
        };
    } & {
        message: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RedeemOrderStatus;
        userId: string;
        itemId: string;
        pointsCost: number;
        leaveDate: Date | null;
        adminNotes: string | null;
        rejectionReason: string | null;
        reportUrl: string | null;
        processedById: string | null;
        processedAt: Date | null;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const getRedeemOrderById: (id: string) => Promise<({
    user: {
        name: string | null;
        id: string;
        reg_no: string | null;
        email: string;
    };
    item: {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        pointsCost: number;
        metadata: Prisma.JsonValue | null;
        isActive: boolean;
        itemType: string;
    };
} & {
    message: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.RedeemOrderStatus;
    userId: string;
    itemId: string;
    pointsCost: number;
    leaveDate: Date | null;
    adminNotes: string | null;
    rejectionReason: string | null;
    reportUrl: string | null;
    processedById: string | null;
    processedAt: Date | null;
}) | null>;
export declare const updateRedeemOrder: (id: string, data: {
    status?: RedeemOrderStatus;
    adminNotes?: string;
    rejectionReason?: string;
    reportUrl?: string;
    processedById?: string;
}) => Promise<{
    user: {
        name: string | null;
        id: string;
        reg_no: string | null;
        email: string;
    };
    item: {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        pointsCost: number;
        metadata: Prisma.JsonValue | null;
        isActive: boolean;
        itemType: string;
    };
} & {
    message: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.RedeemOrderStatus;
    userId: string;
    itemId: string;
    pointsCost: number;
    leaveDate: Date | null;
    adminNotes: string | null;
    rejectionReason: string | null;
    reportUrl: string | null;
    processedById: string | null;
    processedAt: Date | null;
}>;
//# sourceMappingURL=redeem.repo.d.ts.map