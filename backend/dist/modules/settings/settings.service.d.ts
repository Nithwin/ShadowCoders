export declare const getSettings: (userId: string) => Promise<string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray>;
export declare const updateSettings: (userId: string, settings: any) => Promise<{
    name: string | null;
    id: string;
    reg_no: string | null;
    email: string;
    password: string | null;
    pictureUrl: string | null;
    role: import(".prisma/client").$Enums.Role;
    year: number | null;
    department: string | null;
    section: string | null;
    googleId: string | null;
    settings: import("@prisma/client/runtime/library").JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=settings.service.d.ts.map