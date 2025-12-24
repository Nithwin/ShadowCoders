export declare const handleEmailLogin: (input: any) => Promise<{
    accessToken: string;
    refreshToken: string;
}>;
export declare const findUserById: (id: string) => Promise<{
    name: string | null;
    id: string;
    reg_no: string | null;
    email: string;
    pictureUrl: string | null;
    role: import(".prisma/client").$Enums.Role;
    year: number | null;
    department: string | null;
    section: string | null;
    leetcodeId: string | null;
    createdAt: Date;
} | null>;
/**
 * Verifies a refresh token and issues a new access token.
 */
export declare const handleRefreshToken: (rawRefreshToken: string) => Promise<string>;
export declare const handleLogout: (rawRefreshToken: string) => Promise<boolean>;
export declare const updateUserProfile: (userId: string, updateData: {
    name?: string | null;
    reg_no?: string | null;
    year?: number | null;
    department?: string | null;
    section?: string | null;
    pictureUrl?: string | null;
    leetcodeId?: string | null;
}) => Promise<{
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
export declare const changePassword: (userId: string, { currentPassword, newPassword }: any) => Promise<{
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
export declare const updateProfilePicture: (userId: string, file: Express.Multer.File) => Promise<string>;
//# sourceMappingURL=auth.service.d.ts.map