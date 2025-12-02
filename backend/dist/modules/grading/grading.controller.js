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
exports.getQueueStatusHandler = exports.runCodeHandler = void 0;
const gradingService = __importStar(require("./grading.service"));
const execution_queue_1 = require("../../lib/execution-queue");
const runCodeHandler = async (req, res, next) => {
    try {
        const studentId = req.user?.sub;
        const attemptId = req.params.attemptId;
        const runData = req.body;
        if (!studentId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        if (!attemptId) {
            return next({ status: 400, message: 'Attempt ID parameter is required' });
        }
        // Call the service to run the code
        const result = await gradingService.runCode(studentId, attemptId, runData);
        // Send back the result from the code judge
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.runCodeHandler = runCodeHandler;
const getQueueStatusHandler = async (req, res, next) => {
    try {
        const stats = execution_queue_1.executionQueue.getStats();
        const estimatedWaitTime = execution_queue_1.executionQueue.getEstimatedWaitTime();
        res.status(200).json({
            ...stats,
            estimatedWaitTimeMs: estimatedWaitTime,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getQueueStatusHandler = getQueueStatusHandler;
//# sourceMappingURL=grading.controller.js.map