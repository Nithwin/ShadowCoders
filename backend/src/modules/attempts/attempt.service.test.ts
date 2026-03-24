
import { reevaluateAttempt, forceSubmitAttempt } from './attempt.service';
import * as attemptRepo from './attempt.repo';
import * as gradingLogic from '../grading/grading.logic';
import { prismaMock } from '../../__tests__/helpers/db.helper';
import { AttemptStatus, GradingMode, QType } from '@prisma/client';

jest.mock('./attempt.repo');
jest.mock('../grading/grading.logic');

describe('AttemptService Parallelization', () => {
    const mockAttemptId = 'attempt-123';
    const mockExam = {
        id: 'exam-123',
        questions: [
            { id: 'q1', type: QType.MCQ, points: 10, correctOptionIds: ['opt1'] },
            { id: 'q2', type: QType.CODING, points: 20, testcases: [] },
        ],
    };
    const mockAttempt = {
        id: mockAttemptId,
        exam: mockExam,
        responses: [
            { questionId: 'q1', answer: { chosenOptionIds: ['opt1'] }, earnedPoints: 0 },
            { questionId: 'q2', answer: { code: 'print(1)', language: 'python' }, earnedPoints: 0 },
        ],
        status: AttemptStatus.IN_PROGRESS,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (attemptRepo.getAttemptForSubmission as jest.Mock).mockResolvedValue(mockAttempt);
        (gradingLogic.gradeCoding as jest.Mock).mockResolvedValue({
            earnedPoints: 20,
            verdict: 'PASS',
            gradingMode: GradingMode.AUTO,
        });
        (gradingLogic.gradeMCQ as jest.Mock).mockReturnValue({
            earnedPoints: 10,
            verdict: 'PASS',
            gradingMode: GradingMode.AUTO,
        });
    });

    describe('reevaluateAttempt', () => {
        it('should correctly calculate scores in parallel', async () => {
            // Mock transaction to just run the callback
            prismaMock.$transaction.mockImplementation(async (cb) => await cb(prismaMock));

            const result = await reevaluateAttempt(mockAttemptId);

            expect(result.newScore).toBe(30);
            expect(gradingLogic.gradeCoding).toHaveBeenCalledTimes(1);
            expect(gradingLogic.gradeMCQ).toHaveBeenCalledTimes(1);
            expect(prismaMock.$transaction).toHaveBeenCalled();
        });

        it('should return dry run results without DB update', async () => {
            const result = await reevaluateAttempt(mockAttemptId, true);

            expect(result.newScore).toBe(30);
            expect(result.message).toBe('Dry run complete');
            expect(prismaMock.$transaction).not.toHaveBeenCalled();
        });
    });

    describe('forceSubmitAttempt', () => {
        it('should correctly lock in scores in parallel', async () => {
            prismaMock.attempt.update.mockResolvedValue({ ...mockAttempt, status: AttemptStatus.SUBMITTED } as any);

            const result = await forceSubmitAttempt(mockAttemptId);

            expect(result.status).toBe(AttemptStatus.SUBMITTED);
            expect(gradingLogic.gradeCoding).toHaveBeenCalledTimes(1);
            expect(gradingLogic.gradeMCQ).toHaveBeenCalledTimes(1);
            expect(prismaMock.response.updateMany).toHaveBeenCalled();
        });
    });
});
