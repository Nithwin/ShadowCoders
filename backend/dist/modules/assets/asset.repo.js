"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAsset = void 0;
const prisma_1 = require("../../lib/prisma");
/**
 * Creates a new asset record in the database.
 */
const createAsset = (data) => {
    return prisma_1.prisma.asset.create({
        data,
        select: {
            id: true,
            kind: true,
            url: true,
            createdAt: true,
            meta: true,
        },
    });
};
exports.createAsset = createAsset;
//# sourceMappingURL=asset.repo.js.map