'use client';

import { useForm } from 'react-hook-form'; // No SubmitHandler needed
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { QType } from '@/types';

// 1. Define the Zod schema for the AI generation form
const generateQuestionsFormSchema = z.object({
  topic: z.string().min(3, 'A topic is required'),
  mcqCount: z.coerce.number().int().min(0).default(0),
  codingCount: z.coerce.number().int().min(0).default(0),
  essayCount: z.coerce.number().int().min(0).default(0),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'ANY']).default('ANY'),
});

// This is the *output* type after Zod coercion, which 'onSubmit' will receive
type GenerateQuestionsForm = z.output<typeof generateQuestionsFormSchema>;

interface GenerateAiQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionsGenerated: (questions: any[]) => Promise<void>;
}

export default function GenerateAiQuestionsModal({
  open,
  onOpenChange,
  onQuestionsGenerated,
}: GenerateAiQuestionsModalProps) {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(generateQuestionsFormSchema),
    defaultValues: {
      topic: '',
      mcqCount: 0,
      codingCount: 0,
      essayCount: 0,
      difficulty: 'ANY' as const,
    },
  });

  // Reset form when modal closes
  const handleModalChange = (open: boolean) => {
    if (!open) {
      reset();
      setApiError(null);
    }
    onOpenChange(open);
  };

  // 2. Define the submit handler
  // The 'data' parameter receives the output type after Zod validation/coercion
  const onSubmit = async (data: z.infer<typeof generateQuestionsFormSchema>) => {
    setApiError(null);
    try {
      // Validate that at least one question type is requested
      if (data.mcqCount === 0 && data.codingCount === 0 && data.essayCount === 0) {
        setApiError('Please select at least one question type to generate.');
        return;
      }

      // Call the AI generation API we built
      // The backend expects the data in the body directly, not nested
      const response = await api.post('/admin/ai/generate-questions', {
        topic: data.topic,
        mcqCount: data.mcqCount || 0,
        codingCount: data.codingCount || 0,
        essayCount: data.essayCount || 0,
        difficulty: data.difficulty || 'ANY',
      });

      // Pass the resulting questions array back to the parent
      if (response.data && Array.isArray(response.data)) {
        if (response.data.length === 0) {
          setApiError('No questions were generated. Please try again with different parameters.');
          return;
        }
        
        // Log the AI-generated questions for debugging
        console.log('AI-generated questions:', JSON.stringify(response.data, null, 2));
        
        // Check if coding questions have testcases
        const codingQuestions = response.data.filter((q: any) => q.type === 'CODING' || q.type === QType.CODING);
        codingQuestions.forEach((q: any, idx: number) => {
          if (!q.testcases || !Array.isArray(q.testcases) || q.testcases.length === 0) {
            console.error(`⚠️ AI-generated coding question ${idx} has no testcases!`, {
              question: q,
              testcases: q.testcases,
              testcasesType: typeof q.testcases,
              testcasesIsArray: Array.isArray(q.testcases),
            });
          } else {
            console.log(`✅ AI-generated coding question ${idx} has ${q.testcases.length} testcases:`, q.testcases);
            // Validate testcase structure
            q.testcases.forEach((tc: any, tcIdx: number) => {
              if (!tc.input || !tc.expectedOutput) {
                console.warn(`Test case ${tcIdx} is missing input or expectedOutput:`, tc);
              }
            });
          }
        });
        
        // Notify parent - it will handle saving and closing the modal on success
        // Modal will stay open if saving fails
        try {
          await onQuestionsGenerated(response.data);
          // Parent will close the modal on success, no need to close here
        } catch (saveError: any) {
          // If saving fails, show error and keep modal open
          setApiError(saveError.message || 'Failed to save questions. Please try again.');
        }
      } else {
        setApiError('Unexpected response format from server. Please try again.');
      }
    } catch (err: any) {
      console.error('Error generating questions:', err);
      
      // Extract error message from various possible error formats
      let errorMessage = 'Failed to generate questions. Please try again.';
      
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = typeof err.response.data.error === 'string' 
          ? err.response.data.error 
          : err.response.data.error.message || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setApiError(errorMessage);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleModalChange} title="Generate Questions with AI">
      {/* handleSubmit now correctly handles the coercion from string to number 
        before passing the 'data: GenerateQuestionsForm' to 'onSubmit'
      */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-semibold text-primary mb-2"
          >
            Topic <span className="text-red-500">*</span>
          </label>
          <Input
            id="topic"
            {...register('topic')}
            placeholder="e.g., 'Data Structures in Python', 'JavaScript Fundamentals'"
            disabled={isSubmitting}
          />
          {errors.topic && (
            <p className="mt-1.5 text-sm text-red-500">{errors.topic.message}</p>
          )}
          <p className="mt-1 text-xs text-primary/60">
            Describe the topic or subject for the questions
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Number of Questions
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="mcqCount"
                className="block text-xs font-medium text-primary/70 mb-1"
              >
                MCQs
              </label>
              <Input 
                id="mcqCount" 
                type="number" 
                min={0} 
                max={20}
                {...register('mcqCount')}
                disabled={isSubmitting}
                placeholder="0"
              />
            </div>
            <div>
              <label
                htmlFor="codingCount"
                className="block text-xs font-medium text-primary/70 mb-1"
              >
                Coding
              </label>
              <Input 
                id="codingCount" 
                type="number" 
                min={0} 
                max={10}
                {...register('codingCount')}
                disabled={isSubmitting}
                placeholder="0"
              />
            </div>
            <div>
              <label
                htmlFor="essayCount"
                className="block text-xs font-medium text-primary/70 mb-1"
              >
                Essay
              </label>
              <Input 
                id="essayCount" 
                type="number" 
                min={0} 
                max={10}
                {...register('essayCount')}
                disabled={isSubmitting}
                placeholder="0"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-primary/60">
            Enter at least one question type. You can generate up to 20 MCQs, 10 coding questions, or 10 essay questions at a time.
          </p>
        </div>

        <div>
          <label
            htmlFor="difficulty"
            className="block text-sm font-semibold text-primary mb-2"
          >
            Difficulty Level
          </label>
          <select
            id="difficulty"
            {...register('difficulty')}
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="ANY">Any Difficulty</option>
            <option value="EASY">Easy (10 points each)</option>
            <option value="MEDIUM">Medium (20 points each)</option>
            <option value="HARD">Hard (30 points each)</option>
          </select>
          <p className="mt-1 text-xs text-primary/60">
            Points are automatically assigned based on difficulty level
          </p>
        </div>

        {apiError && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
            <div className="flex items-start gap-2">
              <span className="font-semibold">Error:</span>
              <p className="flex-1 text-sm">{apiError}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => handleModalChange(false)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-md hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Questions
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}