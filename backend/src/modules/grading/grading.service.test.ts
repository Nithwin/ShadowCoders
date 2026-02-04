
import { runCode, gradeEssay, overrideResponseGrade } from './grading.service';
import * as gradingRepo from './grading.repo';
import { prismaMock } from '../../__tests__/helpers/db.helper';
import { executionQueue } from '../../lib/execution-queue';
import { testCodeWithTestCasesLocally, executeCodeLocally } from '../../lib/local-executor';
import { QType } from '@prisma/client';

// Mock dependencies
jest.mock('./grading.repo');
jest.mock('../../lib/execution-queue');
jest.mock('../../lib/local-executor');
jest.mock('../../config/env', () => ({
    env: {
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-key',
        EXECUTION_OS: 'linux'
    }
}));

// Mock AI libraries
jest.mock('../../lib/gemini', () => ({
    generateJsonFromAi: jest.fn()
}));

describe('GradingService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('runCode', () => {
        const mockInput = {
            questionId: 'q-1',
            code: 'console.log("hello")',
            language: 'javascript',
            runAllTests: false
        };

        const mockAttempt = {
            id: 'attempt-1',
            studentId: 'student-1',
            examId: 'exam-1',
            status: 'IN_PROGRESS'
        };

        const mockQuestion = {
            id: 'q-1',
            examId: 'exam-1',
            type: QType.CODING,
            testcases: [{ input: 'in', expectedOutput: 'out' }],
            config: { forbiddenKeywords: 'eval, exec' },
            points: 10
        };

        const mockResponse = { id: 'resp-1' };
        const mockJob = { id: 'job-1' };

        it('should execute code successfully', async () => {
            // Setup Mocks
            prismaMock.attempt.findUnique.mockResolvedValue(mockAttempt as any);
            prismaMock.question.findUnique.mockResolvedValue(mockQuestion as any);
            prismaMock.response.findFirst.mockResolvedValue(mockResponse as any);
            prismaMock.response.update.mockResolvedValue(mockResponse as any);
            (gradingRepo.createGradingJob as jest.Mock).mockResolvedValue(mockJob);
            (executionQueue.enqueue as jest.Mock).mockResolvedValue({
                passed: 1,
                total: 1,
                results: []
            });
            (gradingRepo.updateGradingJob as jest.Mock).mockResolvedValue({ result: { passed: 1 } });

            // Execute
            const result = await runCode('student-1', 'attempt-1', mockInput);

            // Assert
            expect(result.passed).toBe(1);
            expect(gradingRepo.createGradingJob).toHaveBeenCalled();
            expect(executionQueue.enqueue).toHaveBeenCalled();
        });

        it('should throw error for forbidden keywords', async () => {
            prismaMock.attempt.findUnique.mockResolvedValue(mockAttempt as any);
            prismaMock.question.findUnique.mockResolvedValue(mockQuestion as any);

            await expect(runCode('student-1', 'attempt-1', {
                ...mockInput,
                code: 'print(eval("1+1"))'
            })).rejects.toEqual(expect.objectContaining({
                status: 400,
                message: expect.stringContaining('Forbidden keyword used')
            }));
        });
    });

    describe('gradeEssay', () => {
        it('should queue essay for grading', async () => {
            prismaMock.response.findUnique.mockResolvedValue({
                id: 'resp-1',
                textAnswer: 'My essay content',
                question: { type: QType.ESSAY, points: 10, prompt: 'Write an essay' }
            } as any);
            
            (gradingRepo.createGradingJob as jest.Mock).mockResolvedValue({ id: 'job-1' });

            const result = await gradeEssay('resp-1');

            expect(result.status).toBe('QUEUED');
            expect(gradingRepo.createGradingJob).toHaveBeenCalled();
            // Note: We can't easily await the enqueued async task in this unit test setup 
            // without exposing the queue promise or mocking internal queue behavior deeply.
            // For now, we verify it WAS successfully queued.
        });
         it('should throw error if response is not essay', async () => {
            prismaMock.response.findUnique.mockResolvedValue({
                id: 'resp-1',
                 textAnswer: 'My essay content',
                question: { type: QType.CODING }
            } as any);

             await expect(gradeEssay('resp-1')).rejects.toEqual(expect.objectContaining({
                status: 400,
                message: expect.stringContaining('not an essay')
            }));
         });
    });

     describe('overrideResponseGrade', () => {
        it('should manually override grade', async () => {
            prismaMock.response.findUnique.mockResolvedValue({
                id: 'resp-1',
                 attemptId: 'attempt-1',
                question: { points: 10 }
            } as any);
            
            prismaMock.response.update.mockResolvedValue({ id: 'resp-1' } as any);
            prismaMock.response.findMany.mockResolvedValue([{ earnedPoints: 5 }] as any);
            prismaMock.attempt.update.mockResolvedValue({} as any);

            await overrideResponseGrade('resp-1', 8, 'Good job');

            expect(prismaMock.response.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'resp-1' },
                data: expect.objectContaining({ earnedPoints: 8, verdict: 'PARTIAL' })
            }));
             expect(prismaMock.attempt.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'attempt-1' },
                data: { score: 5 } // sum of findMany result
            }));
        });
     });

});
