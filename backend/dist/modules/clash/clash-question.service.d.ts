import { ClashMode, ClashDifficulty } from '@prisma/client';
export declare class ClashQuestionService {
    /**
     * Get a random question for room creation
     */
    getRandomQuestion(mode?: ClashMode, difficulty?: ClashDifficulty): Promise<any>;
    /**
     * Get question for a room (with appropriate visibility for mode)
     */
    getQuestionForRoom(roomId: string, userId: string): Promise<any>;
    /**
     * Get all questions (admin only)
     */
    getAllQuestions(filters?: {
        mode?: ClashMode;
        difficulty?: ClashDifficulty;
        limit?: number;
        offset?: number;
    }): Promise<{
        questions: any;
        total: any;
    }>;
    /**
     * Create a new question (admin only)
     */
    createQuestion(data: {
        title: string;
        description: string;
        difficulty: ClashDifficulty;
        mode: ClashMode;
        starterCode?: any;
        testcases: any;
        hiddenTests?: any;
        timeLimit?: number;
        memoryLimit?: number;
        tags?: string[];
        source?: string;
    }): Promise<any>;
    /**
     * Update a question (admin only)
     */
    updateQuestion(id: string, data: Partial<{
        title: string;
        description: string;
        difficulty: ClashDifficulty;
        mode: ClashMode;
        starterCode: any;
        testcases: any;
        hiddenTests: any;
        timeLimit: number;
        memoryLimit: number;
        tags: string[];
        source: string;
    }>): Promise<any>;
    /**
     * Delete a question (admin only)
     */
    deleteQuestion(id: string): Promise<any>;
}
export declare const clashQuestionService: ClashQuestionService;
//# sourceMappingURL=clash-question.service.d.ts.map