'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
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
  points: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (isNaN(num)) throw new Error('Points must be a valid number');
    return num;
  }).pipe(z.number().positive('Points must be positive')),
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
  points: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (isNaN(num)) throw new Error('Points must be a valid number');
    return num;
  }).pipe(z.number().positive('Points must be positive')),
  starterCode: z.string().optional(),
  config: z.object({
    ddl: z.string().optional(),
    forbiddenKeywords: z.string().optional(),
  }).optional(),
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
  points: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (isNaN(num)) throw new Error('Points must be a valid number');
    return num;
  }).pipe(z.number().positive('Points must be positive')),
  wordLimit: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? Number(val) : val;
    return isNaN(num) ? undefined : num;
  }).pipe(z.number().int().positive().optional()),
});

// Combined schema
const questionSchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  codingQuestionSchema,
  essayQuestionSchema,
]);

type QuestionFormData = z.input<typeof questionSchema>;

const RESTRICTED_KEYWORD_OPTIONS = [
  'sort',
  'reverse',
  'split',
  'eval',
  'exec',
  'system',
  'subprocess',
  'fetch',
  'axios',
  'requests',
];

const normalizeKeywordList = (value?: string) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

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
    config?: any; // For SQL DDL and other question-specific config
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
      type: question.type as QType.MCQ | QType.CODING | QType.ESSAY,
      prompt: question.prompt || '',
      points: question.points,
      ...(question.type === QType.MCQ && {
        options: question.options || [],
        correctOptionIds: question.correctOptionIds || [],
      }),
      ...(question.type === QType.CODING && {
        starterCode: question.starterCode || '',
        testcases: question.testcases || [],
        config: question.config || {},
      }),
      ...(question.type === QType.ESSAY && {
        wordLimit: question.wordLimit || undefined,
      }),
    },
  });

  const questionType = watch('type');
  const watchedStarterCode = watch('starterCode') || '';
  const watchedForbiddenKeywords = watch('config.forbiddenKeywords') || '';
  const selectedForbiddenKeywords = useMemo(
    () => new Set(normalizeKeywordList(watchedForbiddenKeywords).map((k) => k.toLowerCase())),
    [watchedForbiddenKeywords]
  );

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

  const toggleForbiddenKeyword = (keyword: string) => {
    const current = normalizeKeywordList(watch('config.forbiddenKeywords'));
    const currentLower = new Set(current.map((item) => item.toLowerCase()));

    const updated = currentLower.has(keyword.toLowerCase())
      ? current.filter((item) => item.toLowerCase() !== keyword.toLowerCase())
      : [...current, keyword];

    setValue('config.forbiddenKeywords', updated.join(', '), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Reset form when question changes
  useEffect(() => {
    if (open && question) {
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
      
      // Safely handle options and correctOptionIds
      const options = Array.isArray(question.options) ? question.options : [];
      let correctOptionIds = Array.isArray(question.correctOptionIds) ? question.correctOptionIds : [];
      
      // Debug log for MCQ data
      if (question.type === QType.MCQ) {

      }

      reset({
        type: question.type as QType.MCQ | QType.CODING | QType.ESSAY,
        prompt: question.prompt || '',
        points: question.points,
        // Always include these keys for MCQ to ensure form state is correct
        ...(question.type === QType.MCQ && {
          options: options,
          correctOptionIds: correctOptionIds,
        }),
        ...(question.type === QType.CODING && {
          starterCode: question.starterCode || '',

          testcases: testcases,
          config: question.config || {},
        }),
        ...(question.type === QType.ESSAY && {
          wordLimit: question.wordLimit || undefined,
        }),
      } as QuestionFormData);
      setApiError(null);
    }
  }, [open, question, reset]);

  const onSubmit = async (data: QuestionFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      // Parse and validate the data through the schema to get the transformed output
      const validatedData = questionSchema.parse(data);
      
      // Prepare the update data
      const updateData: Record<string, unknown> = {
        prompt: validatedData.prompt,
        points: validatedData.points,
      };

      // Add type-specific fields
      if (validatedData.type === QType.MCQ) {
        updateData.options = validatedData.options || [];
        updateData.correctOptionIds = validatedData.correctOptionIds || [];
      } else if (validatedData.type === QType.CODING) {
        updateData.starterCode = validatedData.starterCode || null;
        
        // Handle config (DDL and Forbidden Keywords)
        const config: Record<string, string> = {};
        if (validatedData.config?.ddl?.trim()) {
          config.ddl = validatedData.config.ddl.trim();
        }
        if (validatedData.config?.forbiddenKeywords?.trim()) {
          config.forbiddenKeywords = validatedData.config.forbiddenKeywords.trim();
        }
        updateData.config = config;

        // Ensure testcases are properly formatted
        if (validatedData.testcases && Array.isArray(validatedData.testcases) && validatedData.testcases.length > 0) {
          // Filter out empty testcases and format them
          updateData.testcases = validatedData.testcases
            .filter((tc) => tc && tc.input && tc.expectedOutput && 
                    String(tc.input).trim() && String(tc.expectedOutput).trim())
            .map((tc) => ({
              input: String(tc.input || '').trim(),
              expectedOutput: String(tc.expectedOutput || '').trim(),
              isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : false,
              timeoutMs: tc.timeoutMs ? Number(tc.timeoutMs) : 2000,
            }));
          
          if (Array.isArray(updateData.testcases) && updateData.testcases.length === 0) {
            throw new Error('Coding question must have at least one valid test case with both input and expected output');
          }
          

        } else {
          console.error('❌ No testcases found in form data or testcases array is empty!', {
            testcases: validatedData.testcases,
            testcasesType: typeof validatedData.testcases,
            testcasesIsArray: Array.isArray(validatedData.testcases),
            testcasesLength: Array.isArray(validatedData.testcases) ? validatedData.testcases.length : 'not an array',
            fullData: validatedData,
          });
          throw new Error('Coding question must have at least one test case. Please add test cases before saving.');
        }
      } else if (validatedData.type === QType.ESSAY) {
        if (validatedData.wordLimit) {
          updateData.wordLimit = validatedData.wordLimit;
        }
      }



      const response = await api.put(`/admin/questions/${question.id}`, updateData);
      


      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error updating question:', err);
      
      // Safely extract error message
      let errorMessage = 'Failed to update question. Please try again.';
      
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      open={open} 
      onOpenChange={onOpenChange} 
      title="Edit Question"
      size="full"
      maxHeight="90vh"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto pr-2 pb-20">
          <div className="space-y-6">
            {/* Top Row: Type & Points */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-primary mb-2">
                  Question Type
                </label>
                <div className="px-3 py-2 bg-primary/10 rounded-md text-primary font-medium w-full">
                  {questionType}
                </div>
              </div>
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
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Question Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('prompt')}
                rows={4}
                className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y min-h-[100px]"
                placeholder="Enter the question prompt..."
              />
              {errors.prompt && (
                <p className="mt-1 text-sm text-red-500">{errors.prompt.message}</p>
              )}
            </div>

            {/* MCQ Specific Fields */}
            {questionType === QType.MCQ && (
              <div className="space-y-4 border rounded-lg p-4 border-primary/10 bg-primary/5">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {optionFields.map((field, index) => {
                      const currentOption = watch(`options.${index}`);
                      const optionId = currentOption?.id || field.id;
                      
                      return (
                      <div key={field.id} className="flex gap-2 items-start p-3 border border-primary/20 rounded-lg bg-white/50 hover:border-primary/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <Input
                            {...register(`options.${index}.text`)}
                            placeholder={`Option ${index + 1}`}
                            className="w-full"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCorrectOption(optionId)}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                            correctOptionIds.includes(optionId)
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {correctOptionIds.includes(optionId) ? '✓ Correct' : 'Mark Correct'}
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
                      );
                    })}
                  </div>
                  {'options' in errors && errors.options && (
                    <p className="mt-2 text-sm text-red-500">{errors.options.message}</p>
                  )}
                  {'correctOptionIds' in errors && errors.correctOptionIds && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.correctOptionIds.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Coding Specific Fields - SPLIT LAYOUT */}
            {questionType === QType.CODING && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-primary/10 pt-6">
                {/* Left Column: Code Config */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Starter Code (Optional)
                    </label>
                    <textarea
                      {...register('starterCode')}
                      rows={12}
                      className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y min-h-[250px]"
                      placeholder="function solution() {&#10;  // Your code here&#10;}"
                    />
                    <p className="mt-1 text-xs text-primary/60">Starter code size: {new TextEncoder().encode(watchedStarterCode).length} bytes</p>
                  </div>

                  {/* Forbidden Keywords */}
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Forbidden Keywords (Optional)
                    </label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {RESTRICTED_KEYWORD_OPTIONS.map((keyword) => {
                        const isSelected = selectedForbiddenKeywords.has(keyword.toLowerCase());
                        return (
                          <button
                            key={keyword}
                            type="button"
                            onClick={() => toggleForbiddenKeyword(keyword)}
                            className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                              isSelected
                                ? 'bg-primary text-white border-primary'
                                : 'bg-primary/5 text-primary/80 border-primary/20 hover:bg-primary/10'
                            }`}
                          >
                            {keyword}
                          </button>
                        );
                      })}
                    </div>
                    <Input
                      {...register('config.forbiddenKeywords')}
                      placeholder="e.g. sort, reverse, split (comma separated)"
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-primary/60">
                      Students will be blocked from running or submitting code containing these words.
                    </p>
                  </div>
                </div>

                {/* Right Column: Test Cases */}
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex justify-between items-center">
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
                  
                  <div className="flex-1 overflow-y-auto max-h-[600px] custom-scrollbar pr-2 space-y-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
                    {testcaseFields.map((field, index) => (
                      <div key={field.id} className="border border-primary/20 rounded-lg p-4 bg-white shadow-sm space-y-3 hover:border-primary/30 transition-colors">
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
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-primary/70 mb-1.5">
                              Input
                            </label>
                            <textarea
                              {...register(`testcases.${index}.input`)}
                              rows={3}
                              className="flex w-full rounded-md border border-primary/20 bg-secondary px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
                              placeholder="Enter input (e.g., '5\n10')"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary/70 mb-1.5">
                              Expected Output
                            </label>
                            <textarea
                              {...register(`testcases.${index}.expectedOutput`)}
                              rows={3}
                              className="flex w-full rounded-md border border-primary/20 bg-secondary px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
                              placeholder="Enter expected output"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-primary/5">
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
                    {testcaseFields.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg text-primary/60 text-sm">
                        No test cases yet. Click &quot;Add Test Case&quot; to add one.
                      </div>
                    )}
                  </div>
                  {'testcases' in errors && errors.testcases && (
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
                {'wordLimit' in errors && errors.wordLimit && (
                  <p className="mt-1 text-sm text-red-500">{errors.wordLimit.message}</p>
                )}
              </div>
            )}

            {apiError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
                <strong>Error:</strong> {apiError}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions - Fixed at bottom */}
        <div className="flex justify-end gap-3 pt-4 border-t border-primary/10 bg-secondary flex-shrink-0 z-10">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
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

