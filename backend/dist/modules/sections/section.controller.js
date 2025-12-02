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
exports.listSectionsForExamHandler = exports.removeQuestionFromSectionHandler = exports.deleteSectionHandler = exports.updateSectionHandler = exports.addQuestionsToSectionHandler = exports.createSectionHandler = void 0;
const sectionService = __importStar(require("./section.service"));
const createSectionHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId; // Get examId from the URL
        const sectionData = req.body;
        if (!examId) {
            return next({ status: 400, message: 'Exam ID parameter is required' });
        }
        // Call the service to create the section
        const newSection = await sectionService.createSection(examId, sectionData);
        // Send back the newly created section
        res.status(201).json(newSection);
    }
    catch (error) {
        next(error);
    }
};
exports.createSectionHandler = createSectionHandler;
const addQuestionsToSectionHandler = async (req, res, next) => {
    try {
        const sectionId = req.params.sectionId; // Get sectionId from the URL
        const { questions } = req.body;
        if (!sectionId) {
            return next({ status: 400, message: 'Section ID parameter is required' });
        }
        // Call the service
        const result = await sectionService.addQuestionsToSection(sectionId, questions);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.addQuestionsToSectionHandler = addQuestionsToSectionHandler;
const updateSectionHandler = async (req, res, next) => {
    try {
        const sectionId = req.params.sectionId;
        const updateData = req.body;
        if (!sectionId) {
            return next({ status: 400, message: 'Section ID parameter is required' });
        }
        const updatedSection = await sectionService.updateSection(sectionId, updateData);
        res.status(200).json(updatedSection);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSectionHandler = updateSectionHandler;
const deleteSectionHandler = async (req, res, next) => {
    try {
        const sectionId = req.params.sectionId;
        if (!sectionId) {
            return next({ status: 400, message: 'Section ID parameter is required' });
        }
        const result = await sectionService.deleteSection(sectionId);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSectionHandler = deleteSectionHandler;
const removeQuestionFromSectionHandler = async (req, res, next) => {
    try {
        const { sectionId, questionId } = req.params;
        if (!sectionId || !questionId) {
            return next({
                status: 400,
                message: 'Section ID and Question ID are required',
            });
        }
        const result = await sectionService.removeQuestionFromSection(sectionId, questionId);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.removeQuestionFromSectionHandler = removeQuestionFromSectionHandler;
const listSectionsForExamHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Exam ID parameter is required' });
        }
        const sections = await sectionService.listSectionsForExam(examId);
        res.status(200).json(sections);
    }
    catch (error) {
        next(error);
    }
};
exports.listSectionsForExamHandler = listSectionsForExamHandler;
//# sourceMappingURL=section.controller.js.map