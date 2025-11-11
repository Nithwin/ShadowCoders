'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { QType } from '@/types';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { api } from '@/lib/api';

// Schema for MCQ question
const mcqQuestionSchema = z.object({
  type: z.literal(QType.MCQ),
  prompt: z.string().min(1, 'Prompt is required'),
  points: z.coerce.number().positive('Points must be positive'),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1, 'Option text is required'),
      })
    )
    .min(2, 'At least 2 options required')
    .max(8, 'Maximum 8 options allowed'),
  correctOptionIds: z.array(z.string()).min(1, 'At least one correct answer required'),
});

// Schema for Coding question
const codingQuestionSchema = z.object({
  type: z.literal(QType.CODING),
  prompt: z.string().min(1, 'Prompt is required'),
  points: z.coerce.number().positive('Points must be positive'),
  starterCode: z.string().optional(),
  testcases: z
    .array(
      z.object({
        input: z.string().min(1, 'Input is required'),
        expectedOutput: z.string().min(1, 'Expected output is required'),
        isHidden: z.boolean().default(false),
        timeoutMs: z.number().int().positive().default(2000),
      })
    )
    .min(1, 'At least one test case required'),
});

// Schema for Essay question
const essayQuestionSchema = z.object({
  type: z.literal(QType.ESSAY),
  prompt: z.string().min(1, 'Prompt is required'),
  points: z.coerce.number().positive('Points must be positive'),
  wordLimit: z.coerce.number().int().positive().optional(),
});

// Combined schema
const questionSchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  codingQuestionSchema,
  essayQuestionSchema,
]);

type QuestionFormData = z.infer<typeof questionSchema>;

interface EditQuestionModalProps {
  question: {
    id: string;
    type: QType;
    prompt: string | null;
    points: number;
    options?: Array<{ id: string; text: string }>;
    correctOptionIds?: string[];
    testcases?: Array<{
      input: string;
      expectedOutput: string;
      isHidden: boolean;
      timeoutMs: number;
    }>;
    starterCode?: string | null;
    wordLimit?: number | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditQuestionModal({
  question,
  open,
  onOpenChange,
  onSuccess,
}: EditQuestionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: question.type,
      prompt: question.prompt || '',
      points: question.points,
      ...(question.type === QType.MCQ && {
        options: question.options || [],
        correctOptionIds: question.correctOptionIds || [],
      }),
      ...(question.type === QType.CODING && {
        starterCode: question.starterCode || '',
        testcases: question.testcases || [],
      }),
      ...(question.type === QType.ESSAY && {
        wordLimit: question.wordLimit || undefined,
      }),
    },
  });

  const questionType = watch('type');

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: 'options',
  });

  const {
    fields: testcaseFields,
    append: appendTestcase,
    remove: removeTestcase,
  } = useFieldArray({
    control,
    name: 'testcases',
  });

  const correctOptionIds = watch('correctOptionIds') || [];

  const toggleCorrectOption = (optionId: string) => {
    const current = correctOptionIds || [];
    const newCorrectOptions = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    setValue('correctOptionIds', newCorrectOptions, { shouldValidate: true });
  };

  // Reset form when question changes
  useEffect(() => {
    if (open && question) {
      console.log('Loading question into form:', {
        id: question.id,
        type: question.type,
        testcases: question.testcases,
        testcasesType: typeof question.testcases,
        testcasesIsArray: Array.isArray(question.testcases),
      });
      
      // Parse testcases if they're stored as JSON string
      let testcases = question.testcases || [];
      if (typeof testcases === 'string') {
        try {
          testcases = JSON.parse(testcases);
        } catch (e) {
          console.error('Failed to parse testcases:', e);
          testcases = [];
        }
      }
      
      // Ensure testcases is an array
      if (!Array.isArray(testcases)) {
        testcases = [];
      }
      
      // Format testcases to ensure they have all required fields
      testcases = testcases.map((tc: Record<string, unknown>) => ({
        input: String(tc.input || ''),
        expectedOutput: String(tc.expectedOutput || ''),
        isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : false,
        timeoutMs: tc.timeoutMs ? Number(tc.timeoutMs) : 2000,
      }));
      
      console.log('Formatted testcases for form:', testcases);
      
      reset({
        type: question.type,
        prompt: question.prompt || '',
        points: question.points,
        ...(question.type === QType.MCQ && {
          options: Array.isArray(question.options) ? question.options : [],
          correctOptionIds: Array.isArray(question.correctOptionIds) ? question.correctOptionIds : [],
        }),
        ...(question.type === QType.CODING && {
          starterCode: question.starterCode || '',
          testcases: testcases,
        }),
        ...(question.type === QType.ESSAY && {
          wordLimit: question.wordLimit || undefined,
        }),
      });
      setApiError(null);
    }
  }, [open, question, reset]);

  const onSubmit = async (data: QuestionFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      // Prepare the update data
      const updateData: Record<string, unknown> = {
        prompt: data.prompt,
        points: Number(data.points),
      };

      // Add type-specific fields
      if (data.type === QType.MCQ) {
        updateData.options = data.options || [];
        updateData.correctOptionIds = data.correctOptionIds || [];
      } else if (data.type === QType.CODING) {
        updateData.starterCode = data.starterCode || null;
        // Ensure testcases are properly formatted
        if (data.testcases && Array.isArray(data.testcases) && data.testcases.length > 0) {
          // Filter out empty testcases and format them
          updateData.testcases = data.testcases
            .filter((tc: Record<string, unknown>) => tc && tc.input && tc.expectedOutput && 
                    String(tc.input).trim() && String(tc.expectedOutput).trim())
            .map((tc: Record<string, unknown>) => ({
              input: String(tc.input || '').trim(),
              expectedOutput: String(tc.expectedOutput || '').trim(),
              isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : false,
              timeoutMs: tc.timeoutMs ? Number(tc.timeoutMs) : 2000,
            }));
          
          if (updateData.testcases.length === 0) {
            throw new Error('Coding question must have at least one valid test case with both input and expected output');
          }
          
          console.log('✅ Sending testcases to backend:', JSON.stringify(updateData.testcases, null, 2));
        } else {
          console.error('❌ No testcases found in form data or testcases array is empty!', {
            testcases: data.testcases,
            testcasesType: typeof data.testcases,
            testcasesIsArray: Array.isArray(data.testcases),
            testcasesLength: Array.isArray(data.testcases) ? data.testcases.length : 'not an array',
            fullData: data,
          });
          throw new Error('Coding question must have at least one test case. Please add test cases before saving.');
        }
      } else if (data.type === QType.ESSAY) {
        if (data.wordLimit) {
          updateData.wordLimit = Number(data.wordLimit);
        }
      }

      console.log('Updating question with data:', JSON.stringify(updateData, null, 2));

      const response = await api.put(`/admin/questions/${question.id}`, updateData);
      
      console.log('Update response:', response.data);

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const error = err as { 
        response?: { 
          data?: { 
            error?: { message?: string };
            message?: string;
          };
        };
        message?: string;
      };
      console.error('Error updating question:', err);
      console.error('Error response:', error.response?.data);
      setApiError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message ||
          'Failed to update question. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      open={open} 
      onOpenChange={onOpenChange} 
      title="Edit Question"
      size="xl"
      maxHeight="85vh"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-4">
        {/* Question Type (read-only) */}
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Question Type
          </label>
          <div className="px-3 py-2 bg-primary/10 rounded-md text-primary font-medium">
            {questionType}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Question Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('prompt')}
            rows={4}
            className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
            placeholder="Enter the question prompt..."
          />
          {errors.prompt && (
            <p className="mt-1 text-sm text-red-500">{errors.prompt.message}</p>
          )}
        </div>

        {/* Points */}
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Points <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="1"
            {...register('points')}
            placeholder="10"
          />
          {errors.points && (
            <p className="mt-1 text-sm text-red-500">{errors.points.message}</p>
          )}
        </div>

        {/* MCQ Specific Fields */}
        {questionType === QType.MCQ && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-semibold text-primary">
                  Options <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-primary/60">
                    ({optionFields.length} option{optionFields.length !== 1 ? 's' : ''})
                  </span>
                </label>
                <Button
                  type="button"
                  onClick={() =>
                    appendOption({
                      id: `opt${Date.now()}`,
                      text: '',
                    })
                  }
                  disabled={optionFields.length >= 8}
                  className="text-xs px-3 py-1.5"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {optionFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start p-3 border border-primary/20 rounded-lg bg-primary/5 hover:border-primary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Input
                        {...register(`options.${index}.text`)}
                        placeholder={`Option ${index + 1}`}
                        className="w-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCorrectOption(field.id)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                        correctOptionIds.includes(field.id)
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {correctOptionIds.includes(field.id) ? '✓ Correct' : 'Mark Correct'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      disabled={optionFields.length <= 2}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      title={optionFields.length <= 2 ? 'Minimum 2 options required' : 'Remove option'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.options && (
                <p className="mt-2 text-sm text-red-500">{errors.options.message}</p>
              )}
              {errors.correctOptionIds && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.correctOptionIds.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Coding Specific Fields */}
        {questionType === QType.CODING && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Starter Code (Optional)
              </label>
              <textarea
                {...register('starterCode')}
                rows={4}
                className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
                placeholder="function solution() {&#10;  // Your code here&#10;}"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-semibold text-primary">
                  Test Cases <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-primary/60">
                    ({testcaseFields.length} test case{testcaseFields.length !== 1 ? 's' : ''})
                  </span>
                </label>
                <Button
                  type="button"
                  onClick={() =>
                    appendTestcase({
                      input: '',
                      expectedOutput: '',
                      isHidden: false,
                      timeoutMs: 2000,
                    })
                  }
                  className="text-xs px-3 py-1.5"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Test Case
                </Button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {testcaseFields.map((field, index) => (
                  <div key={field.id} className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3 hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-primary">
                        Test Case {index + 1}
                        {watch(`testcases.${index}.isHidden`) && (
                          <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                            Hidden
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTestcase(index)}
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove test case"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-primary/70 mb-1.5">
                        Input
                      </label>
                      <textarea
                        {...register(`testcases.${index}.input`)}
                        rows={2}
                        className="flex w-full rounded-md border border-primary/20 bg-secondary px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
                        placeholder="Enter input (e.g., '5\n10' for two numbers)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-primary/70 mb-1.5">
                        Expected Output
                      </label>
                      <textarea
                        {...register(`testcases.${index}.expectedOutput`)}
                        rows={2}
                        className="flex w-full rounded-md border border-primary/20 bg-secondary px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
                        placeholder="Enter expected output (e.g., '15')"
                      />
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register(`testcases.${index}.isHidden`)}
                          className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50 cursor-pointer"
                        />
                        <span className="text-sm text-primary/80">Hidden test case</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-primary/70 whitespace-nowrap">Timeout (ms):</label>
                        <Input
                          type="number"
                          {...register(`testcases.${index}.timeoutMs`, { valueAsNumber: true })}
                          className="w-24 h-8 text-xs"
                          min="1000"
                          step="1000"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {testcaseFields.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-primary/20 rounded-lg text-primary/60 text-sm">
                  No test cases yet. Click &quot;Add Test Case&quot; to add one.
                </div>
              )}
              {errors.testcases && (
                <p className="mt-2 text-sm text-red-500">{errors.testcases.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Essay Specific Fields */}
        {questionType === QType.ESSAY && (
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Word Limit (Optional)
            </label>
            <Input
              type="number"
              min="1"
              {...register('wordLimit')}
              placeholder="e.g. 500"
            />
            {errors.wordLimit && (
              <p className="mt-1 text-sm text-red-500">{errors.wordLimit.message}</p>
            )}
          </div>
        )}

        {apiError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            <strong>Error:</strong> {apiError}
          </div>
        )}

        {/* Footer Actions - Sticky at bottom of scrollable area */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-primary/10 sticky bottom-0 bg-secondary -mb-4 pb-4">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

