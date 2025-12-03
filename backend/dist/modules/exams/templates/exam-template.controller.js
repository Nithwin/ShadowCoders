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
exports.deleteTemplate = exports.listTemplates = exports.createExamFromTemplate = exports.createTemplateFromExam = void 0;
const templateService = __importStar(require("./exam-template.service"));
const createTemplateFromExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { title, description, isPublic } = req.body;
        const userId = req.user.id;
        if (!examId)
            throw { status: 400, message: "Exam ID is required" };
        const template = await templateService.createTemplateFromExam(examId, userId, {
            title,
            description,
            isPublic,
        });
        res.status(201).json(template);
    }
    catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    }
};
exports.createTemplateFromExam = createTemplateFromExam;
const createExamFromTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;
        const { title, startAt, endAt } = req.body;
        const userId = req.user.id;
        if (!templateId)
            throw { status: 400, message: "Template ID is required" };
        const exam = await templateService.createExamFromTemplate(templateId, userId, {
            title,
            startAt: new Date(startAt),
            endAt: new Date(endAt),
        });
        res.status(201).json(exam);
    }
    catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    }
};
exports.createExamFromTemplate = createExamFromTemplate;
const listTemplates = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await templateService.listTemplates(userId, req.query);
        res.json(result);
    }
    catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    }
};
exports.listTemplates = listTemplates;
const deleteTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;
        const userId = req.user.id;
        if (!templateId)
            throw { status: 400, message: "Template ID is required" };
        await templateService.deleteTemplate(templateId, userId);
        res.json({ message: "Template deleted successfully" });
    }
    catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    }
};
exports.deleteTemplate = deleteTemplate;
//# sourceMappingURL=exam-template.controller.js.map