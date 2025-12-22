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
// 1. Define the Zod schema for the AI generation form
const generateQuestionsFormSchema = z.object({
  topic: z.string().min(3, 'A topic is required'),
  mcqCount: z.coerce.number().int().min(0).default(0),
  codingCount: z.coerce.number().int().min(0).default(0),
  sqlCount: z.coerce.number().int().min(0).default(0),
  essayCount: z.coerce.number().int().min(0).default(0),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'ANY']).default('ANY'),
  points: z.coerce.number().int().positive().optional(),
});

// This is the *output* type after Zod coercion, which 'onSubmit' will receive

interface GenerateAiQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionsGenerated: (questions: Array<Record<string, unknown>>) => Promise<void>;
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
      sqlCount: 0,
      essayCount: 0,
      difficulty: 'ANY' as const,
      points: undefined,
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
  const onSubmit = async (data: z.infer<typeof generateQuestionsFormSchema>) => {
    setApiError(null);
    try {
      // Validate that at least one question type is requested
      if (data.mcqCount === 0 && data.codingCount === 0 && data.sqlCount === 0 && data.essayCount === 0) {
        setApiError('Please select at least one question type to generate.');
        return;
      }

      const response = await api.post('/admin/ai/generate-questions', {
        topic: data.topic,
        mcqCount: data.mcqCount || 0,
        codingCount: data.codingCount || 0,
        sqlCount: data.sqlCount || 0,
        essayCount: data.essayCount || 0,
        difficulty: data.difficulty || 'ANY',
        points: data.points, // Send points if provided
      });
      
      // ... (rest of the handle logic remains same)
      if (response.data && Array.isArray(response.data)) {
        if (response.data.length === 0) {
          setApiError('No questions were generated. Please try again with different parameters.');
          return;
        }
        
        // Notify parent
        try {
          await onQuestionsGenerated(response.data);
        } catch (saveError: unknown) {
           const error = saveError as { message?: string };
           setApiError(error.message || 'Failed to save questions. Please try again.');
        }
      } else {
        setApiError('Unexpected response format from server. Please try again.');
      }

    } catch (err: unknown) {
      // ... (error handling remains same)
       const error = err as { response?: { data?: { error?: { message?: string } | string; message?: string } } };
       console.error('Error', err);
       let errorMessage = 'Failed to generate questions';
       if (error.response?.data?.message) errorMessage = error.response.data.message;
       setApiError(errorMessage);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleModalChange} title="Generate Questions with AI">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Topic Field (keep same) */}
        <div>
          <label htmlFor="topic" className="block text-sm font-semibold text-primary mb-2">
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
        </div>

         {/* Counts (keep same) */}
         <div>
            <label className="block text-sm font-semibold text-primary mb-2">Number of Questions</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="mcqCount" className="block text-xs font-medium text-primary/70 mb-1">MCQs</label>
                <Input id="mcqCount" type="number" min={0} max={20} {...register('mcqCount')} disabled={isSubmitting} placeholder="0" />
              </div>
              <div>
                <label htmlFor="codingCount" className="block text-xs font-medium text-primary/70 mb-1">Coding</label>
                <Input id="codingCount" type="number" min={0} max={10} {...register('codingCount')} disabled={isSubmitting} placeholder="0" />
              </div>
              <div>
                <label htmlFor="sqlCount" className="block text-xs font-medium text-primary/70 mb-1">SQL</label>
                <Input id="sqlCount" type="number" min={0} max={10} {...register('sqlCount')} disabled={isSubmitting} placeholder="0" />
              </div>
              <div>
                <label htmlFor="essayCount" className="block text-xs font-medium text-primary/70 mb-1">Essay</label>
                <Input id="essayCount" type="number" min={0} max={10} {...register('essayCount')} disabled={isSubmitting} placeholder="0" />
              </div>
            </div>
         </div>

        {/* Difficulty and Points */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="difficulty" className="block text-sm font-semibold text-primary mb-2">
              Difficulty Level
            </label>
            <select
              id="difficulty"
              {...register('difficulty')}
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="ANY">Any Difficulty</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
             <label htmlFor="points" className="block text-sm font-semibold text-primary mb-2">
               Points
             </label>
             <Input 
                id="points" 
                type="number" 
                min={1} 
                {...register('points')} 
                disabled={isSubmitting} 
                placeholder="Auto" 
             />
          </div>
        </div>
        <p className="text-xs text-primary/60">
           Leave points empty to automatically assign based on difficulty (Easy=10, Medium=20, Hard=30).
        </p>

        {apiError && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
            <p className="text-sm">{apiError}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => handleModalChange(false)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-md hover:bg-primary/5"
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