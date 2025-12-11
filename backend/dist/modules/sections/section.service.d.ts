import { z } from 'zod';
import { addQuestionsToSectionSchema, createSectionSchema, updateSectionSchema } from './section.zod';
import { Prisma } from '@prisma/client';
type CreateSectionInput = z.infer<typeof createSectionSchema>['body'];
export declare const createSection: (examId: string, input: CreateSectionInput) => Promise<{
    id: string;
    description: string | null;
    title: string;
    order: number;
    durationMins: number | null;
}>;
type AddQuestionsInput = z.infer<typeof addQuestionsToSectionSchema>['body']['questions'];
export declare const addQuestionsToSection: (sectionId: string, questions: AddQuestionsInput) => Promise<{
    message: string;
}>;
type UpdateSectionInput = z.infer<typeof updateSectionSchema>['body'];
export declare const updateSection: (sectionId: string, input: UpdateSectionInput) => Promise<{
    id: string;
    description: string | null;
    title: string;
    order: number;
    durationMins: number | null;
}>;
export declare const deleteSection: (sectionId: string) => Promise<{
    message: string;
}>;
export declare const removeQuestionFromSection: (sectionId: string, questionId: string) => Promise<{
    message: string;
}>;
export declare const listSectionsForExam: (examId: string) => Promise<{
    id: string;
    title: string;
    description: string | null;
    order: number;
    durationMins: number | null;
    questions: {
        questionId: string;
        order: number;
        question: {
            id: string;
            points: Prisma.Decimal;
            type: import(".prisma/client").$Enums.QType;
            order: number;
            prompt: string | null;
        };
    }[];
}[]>;
export {};
//# sourceMappingURL=section.service.d.ts.map