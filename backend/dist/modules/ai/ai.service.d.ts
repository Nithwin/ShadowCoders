import { z } from 'zod';
import { generateQuestionsSchema } from './ai.zod';
type GenerateInput = z.infer<typeof generateQuestionsSchema>['body'];
export declare const generateQuestions: (input: GenerateInput) => Promise<(({
    type: "MCQ";
    prompt: string;
    options: {
        id: string;
        text: string;
    }[];
    correctOptionIds: string[];
} | {
    type: "CODING";
    prompt: string;
    testcases: {
        input: string;
        expectedOutput: string;
        isHidden: boolean;
        timeoutMs: number;
    }[];
    starterCode?: string | undefined;
} | {
    type: "ESSAY";
    prompt: string;
    wordLimit?: number | undefined;
} | {
    type: "LISTENING";
    prompt: string;
    options: {
        id: string;
        text: string;
    }[];
    correctOptionIds: string[];
    mediaAssetId: string;
    maxListenCount?: number | undefined;
} | {
    type: "SPEAKING";
    prompt: string;
    maxDurationSec?: number | undefined;
    maxReattempts?: number | undefined;
}) & {
    order: number;
    points: number;
})[]>;
export {};
//# sourceMappingURL=ai.service.d.ts.map