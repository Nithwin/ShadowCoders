"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRubric = exports.updateRubric = exports.getRubricById = exports.listRubrics = exports.createRubric = void 0;
const rubricRepo = __importStar(require("./rubric.repo"));
const createRubric = async (creatorId, // The ID of the STAFF user
input) => {
    // 1. Prepare the data for the repository
    const dataToSave = {
        name: input.name,
        criteria: input.criteria, // Cast criteria to Prisma's JSON type
        createdBy: creatorId, // Store who created the rubric
    };
    // 2. Call the repository to save the data
    const newRubric = await rubricRepo.createRubric(dataToSave);
    return newRubric;
};
exports.createRubric = createRubric;
const listRubrics = async (query) => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const { q } = query;
    const { rubrics, totalCount } = await rubricRepo.listRubrics({
        page,
        pageSize,
        ...(q && { searchQuery: q }),
    });
    const totalPages = Math.ceil(totalCount / pageSize);
    return {
        data: rubrics,
        meta: {
            page,
            pageSize,
            totalCount,
            totalPages,
        },
    };
};
exports.listRubrics = listRubrics;
const getRubricById = async (id) => {
    const rubric = await rubricRepo.getRubricById(id);
    if (!rubric) {
        throw { status: 404, message: 'Rubric not found' };
    }
    return rubric;
};
exports.getRubricById = getRubricById;
const updateRubric = async (id, input) => {
    // Check if rubric exists
    const existing = await rubricRepo.getRubricById(id);
    if (!existing) {
        throw { status: 404, message: 'Rubric not found' };
    }
    // Prepare update data
    const dataToUpdate = {};
    if (input.name !== undefined) {
        dataToUpdate.name = input.name;
    }
    if (input.criteria !== undefined) {
        dataToUpdate.criteria = input.criteria;
    }
    const updatedRubric = await rubricRepo.updateRubric(id, dataToUpdate);
    return updatedRubric;
};
exports.updateRubric = updateRubric;
const deleteRubric = async (id) => {
    // Check if rubric exists and is being used
    const rubric = await rubricRepo.getRubricById(id);
    if (!rubric) {
        throw { status: 404, message: 'Rubric not found' };
    }
    // Check if rubric is being used
    if (rubric._count.questions > 0 || rubric._count.evaluations > 0) {
        throw {
            status: 400,
            message: 'Cannot delete rubric that is being used by questions or evaluations',
        };
    }
    await rubricRepo.deleteRubric(id);
    return { message: 'Rubric deleted successfully' };
};
exports.deleteRubric = deleteRubric;
//# sourceMappingURL=rubric.service.js.map