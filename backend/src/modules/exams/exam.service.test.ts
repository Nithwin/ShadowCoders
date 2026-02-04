
import { 
    createExam, 
    listExams, 
    updateExam, 
    deleteExam, 
    getExamById 
} from './exam.service';
import * as examRepo from './exam.repo';
import * as sectionRepo from '../sections/section.repo';
import { prismaMock } from '../../__tests__/helpers/db.helper'; // Use the helper!
import { ExamStatus, Prisma } from '@prisma/client';

// Mock dependencies
jest.mock('./exam.repo');
jest.mock('../sections/section.repo');
// We don't need to manually mock '../../lib/prisma' here because setup.ts and db.helper handles it.
// The jest.mock in the previous attempt might have been conflicting or incorrect path.
// However, since exam.service.ts imports prisma from '../../lib/prisma', we need to ensure THAT import is mocked.
// The setup.ts does: jest.mock('../lib/prisma', ...). 
// Let's rely on the global setup or explicitly use the helper.

describe('ExamService', () => {
    afterEach(() => {
        jest.clearAllMocks();
        prismaMock.exam.findUnique.mockReset();
        prismaMock.examSection.findMany.mockReset();
    });

    describe('createExam', () => {
        const mockInput = {
            title: 'Test Exam',
            durationMins: 60,
            startAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endAt: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
            timingMode: 'OVERALL_ONLY' as const,
            sectionLockPolicy: 'NONE' as const,
            releaseResults: true,
            enableProctoring: false,
        };

        it('should create an exam and default sections', async () => {
            const mockExam = { id: 'exam-123', ...mockInput };
            (examRepo.createExam as jest.Mock).mockResolvedValue(mockExam);
            (sectionRepo.createSection as jest.Mock).mockResolvedValue({});

            const result = await createExam(mockInput);

            expect(result).toEqual(mockExam);
            expect(examRepo.createExam).toHaveBeenCalled();
            // Should create 3 default sections
            expect(sectionRepo.createSection).toHaveBeenCalledTimes(3);
        });
        
        it('should throw error if start date is after end date', async () => {
             const invalidInput = {
                ...mockInput,
                startAt: new Date(Date.now() + 172800000).toISOString(),
                endAt: new Date(Date.now() + 86400000).toISOString(),
            };

            await expect(createExam(invalidInput)).rejects.toEqual(expect.objectContaining({
                status: 400,
                message: expect.stringContaining('start date must be before'),
            }));
        });
    });

    describe('listExams', () => {
        it('should list exams with pagination', async () => {
            const mockExams = {
                exams: [{ id: 'exam-1', title: 'Test Exam' }],
                totalCount: 1
            };
            (examRepo.listExams as jest.Mock).mockResolvedValue(mockExams);

            const result = await listExams({ page: 1, pageSize: 10, status: 'ALL' });
            
            expect(result.data).toHaveLength(1);
            expect(result.meta.totalCount).toBe(1);
        });
    });

    describe('getExamById', () => {
        it('should return exam if found', async () => {
            const mockExam = { id: 'exam-123', title: 'Test Exam' };
            
            // Use prismaMock from helper
            prismaMock.exam.findUnique.mockResolvedValue({ id: 'exam-123' } as any);
            prismaMock.examSection.findMany.mockResolvedValue([
                { title: 'Multiple Choice' },
                { title: 'Coding' },
                { title: 'Essay' }
            ] as any);
            
            (examRepo.findExamById as jest.Mock).mockResolvedValue(mockExam);

            const result = await getExamById('exam-123');
            expect(result).toEqual(mockExam);
        });

        it('should throw 404 if exam not found', async () => {
            prismaMock.exam.findUnique.mockResolvedValue(null);
            (examRepo.findExamById as jest.Mock).mockResolvedValue(null);

            await expect(getExamById('non-existent')).rejects.toEqual(expect.objectContaining({
                status: 404,
                message: 'Exam not found'
            }));
        });
    });

    describe('deleteExam', () => {
        it('should delete exam if force is true', async () => {
            prismaMock.exam.findUnique.mockResolvedValue({
                id: 'exam-123',
                _count: { attempts: 5, questions: 10 }
            } as any);
            
            (examRepo.deleteExamAndChildren as jest.Mock).mockResolvedValue(undefined);

            const result = await deleteExam('exam-123', true);

            expect(examRepo.deleteExamAndChildren).toHaveBeenCalledWith('exam-123');
            expect(result.deletedAttempts).toBe(5);
        });

        it('should warn but delete if force is false and attempts exist', async () => {
             prismaMock.exam.findUnique.mockResolvedValue({
                id: 'exam-123',
                _count: { attempts: 5, questions: 10 }
            } as any);
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            await deleteExam('exam-123', false);
            
            expect(consoleSpy).toHaveBeenCalled();
            expect(examRepo.deleteExamAndChildren).toHaveBeenCalledWith('exam-123');
        });
    });
});
