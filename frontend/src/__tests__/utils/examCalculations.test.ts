
import { calculateAnsweredCount } from '../../../utils/examCalculations';
import { describe, it, expect } from 'vitest';
import { QType } from '../../../types';

describe('examCalculations', () => {
  describe('calculateAnsweredCount', () => {
    it('should return 0 for empty questions', () => {
      const count = calculateAnsweredCount([], {});
      expect(count).toBe(0);
    });

    it('should count valid MCQ answers', () => {
      const questions = [
        { id: 'q1', type: QType.MCQ },
        { id: 'q2', type: QType.MCQ }
      ] as any[];

      const answers = {
        'q1': { chosenOptionIds: ['opt1'] }, // Valid
        'q2': { chosenOptionIds: [] }       // Invalid (empty)
      };

      const count = calculateAnsweredCount(questions, answers);
      expect(count).toBe(1);
    });

    it('should count valid Coding answers', () => {
       const questions = [
        { id: 'q1', type: QType.CODING },
        { id: 'q2', type: QType.CODING }
      ] as any[];

      const answers = {
        'q1': { code: 'console.log("hi")' }, // Valid
        'q2': { code: '   ' }                // Invalid (whitespace)
      };

      const count = calculateAnsweredCount(questions, answers);
      expect(count).toBe(1);
    });

    it('should count valid Essay answers', () => {
       const questions = [
        { id: 'q1', type: QType.ESSAY }
      ] as any[];

      const answers = {
        'q1': { textAnswer: 'My essay content' }
      };

      const count = calculateAnsweredCount(questions, answers);
      expect(count).toBe(1);
    });
    
    it('should ignore questions without answers in the map', () => {
         const questions = [
        { id: 'q1', type: QType.MCQ }
      ] as any[];
      
      const answers = {};
      
      const count = calculateAnsweredCount(questions, answers);
      expect(count).toBe(0);
    });
  });
});
