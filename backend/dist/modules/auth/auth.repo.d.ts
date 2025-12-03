import { Prisma, User } from "@prisma/client";
interface GoogleProfile {
    email: string;
    name?: string | null;
    pictureUrl?: string | null;
    googleId: string;
}
export declare const findUserByEmailAndLinkGoogle: ({ email, name, pictureUrl, googleId }: GoogleProfile) => Promise<{
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
    settings: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
} | null>;
export declare const findUserByEmail: (email: string) => Promise<User | null>;
export declare const findUserById: (id: string) => Promise<{
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
    settings: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
} | null>;
export declare const findStudentWithCohortInfo: (id: string) => Promise<{
    id: string;
    year: number | null;
    department: string | null;
    section: string | null;
} | null>;
export declare const updateUser: (id: string, data: Prisma.UserUpdateInput) => Promise<{
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
    settings: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare const saveRefreshToken: (userId: string, tokenHash: string, expiresAt: Date) => Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
}>;
/**
 * Finds an active refresh token by its hash.
 */
export declare const findRefreshToken: (tokenHash: string) => Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
} | null>;
/**
 * Deletes a refresh token from the database (used for logout).
 */
export declare const deleteRefreshToken: (tokenHash: string) => Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
}>;
export declare const updatePassword: (id: string, passwordHash: string) => Promise<{
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
    settings: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export {};
//# sourceMappingURL=auth.repo.d.ts.map