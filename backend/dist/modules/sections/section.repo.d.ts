import { Prisma } from '@prisma/client';
/**
 * Creates a new exam section linked to a specific exam.
 */
export declare const createSection: (examId: string, data: Omit<Prisma.ExamSectionCreateInput, "exam">) => Prisma.Prisma__ExamSectionClient<{
    id: string;
    order: number;
    title: string;
    description: string | null;
    durationMins: number | null;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const addQuestionsToSection: (sectionId: string, questionsData: Prisma.SectionQuestionCreateManyInput[]) => Prisma.PrismaPromise<Prisma.BatchPayload>;
export declare const updateSection: (sectionId: string, data: Prisma.ExamSectionUpdateInput) => Prisma.Prisma__ExamSectionClient<{
    id: string;
    order: number;
    title: string;
    description: string | null;
    durationMins: number | null;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const deleteSection: (sectionId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    examId: string;
    order: number;
    title: string;
    description: string | null;
    durationMins: number | null;
    startsAt: Date | null;
    endsAt: Date | null;
}>;
export declare const removeQuestionFromSection: (sectionId: string, questionId: string) => Prisma.Prisma__SectionQuestionClient<{
    id: string;
    order: number;
    sectionId: string;
    questionId: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
//# sourceMappingURL=section.repo.d.ts.map