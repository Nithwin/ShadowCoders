export declare const getSettings: (userId: string) => Promise<any>;
export declare const updateSettings: (userId: string, settings: any) => Promise<{
    name: string | null;
    id: string;
    reg_no: string | null;
    email: string;
    password: string | null;
    pictureUrl: string | null;
    pictureData: Uint8Array | null;
    pictureMimeType: string | null;
    role: import(".prisma/client").$Enums.Role;
    year: number | null;
    department: string | null;
    section: string | null;
    leetcodeId: string | null;
    leetcodeStats: import("@prisma/client/runtime/library").JsonValue | null;
    settings: import("@prisma/client/runtime/library").JsonValue | null;
    points: number;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=settings.service.d.ts.map