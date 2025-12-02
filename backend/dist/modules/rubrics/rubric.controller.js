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
exports.deleteRubricHandler = exports.updateRubricHandler = exports.getRubricByIdHandler = exports.listRubricsHandler = exports.createRubricHandler = void 0;
const rubricService = __importStar(require("./rubric.service"));
const createRubricHandler = async (req, res, next) => {
    try {
        const creatorId = req.user?.sub; // ID of the STAFF user
        const rubricData = req.validatedData?.body || req.body;
        if (!creatorId) {
            return next({ status: 401, message: 'Unauthorized: Creator ID not found' });
        }
        // Call the service to create the rubric
        const newRubric = await rubricService.createRubric(creatorId, rubricData);
        // Send back the newly created rubric
        res.status(201).json(newRubric);
    }
    catch (error) {
        next(error);
    }
};
exports.createRubricHandler = createRubricHandler;
const listRubricsHandler = async (req, res, next) => {
    try {
        const queryParams = req.validatedData?.query;
        const result = await rubricService.listRubrics(queryParams);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.listRubricsHandler = listRubricsHandler;
const getRubricByIdHandler = async (req, res, next) => {
    try {
        const rubricId = req.params.rubricId;
        if (!rubricId) {
            return next({ status: 400, message: 'Missing rubricId parameter' });
        }
        const rubric = await rubricService.getRubricById(rubricId);
        res.status(200).json(rubric);
    }
    catch (error) {
        next(error);
    }
};
exports.getRubricByIdHandler = getRubricByIdHandler;
const updateRubricHandler = async (req, res, next) => {
    try {
        const rubricId = req.params.rubricId;
        if (!rubricId) {
            return next({ status: 400, message: 'Missing rubricId parameter' });
        }
        const rubricData = req.validatedData?.body || req.body;
        const updatedRubric = await rubricService.updateRubric(rubricId, rubricData);
        res.status(200).json(updatedRubric);
    }
    catch (error) {
        next(error);
    }
};
exports.updateRubricHandler = updateRubricHandler;
const deleteRubricHandler = async (req, res, next) => {
    try {
        const rubricId = req.params.rubricId;
        if (!rubricId) {
            return next({ status: 400, message: 'Missing rubricId parameter' });
        }
        await rubricService.deleteRubric(rubricId);
        res.status(200).json({ message: 'Rubric deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteRubricHandler = deleteRubricHandler;
//# sourceMappingURL=rubric.controller.js.map