'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { QType } from '@/types';
import { Loader2, Save, Plus, Trash2, Info } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

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

const questionFormSchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  codingQuestionSchema,
  essayQuestionSchema,
]);

type QuestionFormInput = z.infer<typeof questionFormSchema>;

interface ManualQuestionFormProps {
  examId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultOrder?: number;
}

export default function ManualQuestionForm({
  examId,
  open,
  onOpenChange,
  onSuccess,
  defaultOrder = 1,
}: ManualQuestionFormProps) {
  const [questionType, setQuestionType] = useState<QType>(QType.MCQ);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    reset,
    watch,
    setValue,
  } = useForm<QuestionFormInput>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      type: QType.MCQ,
      prompt: '',
      points: 10,
      options: [
        { id: 'opt1', text: '' },
        { id: 'opt2', text: '' },
        { id: 'opt3', text: '' },
        { id: 'opt4', text: '' },
      ],
      correctOptionIds: [],
    },
  });

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

  const watchedOptions = watch('options');
  const watchedCorrectOptions = watch('correctOptionIds') || [];

  const handleTypeChange = (newType: QType) => {
    setQuestionType(newType);
    reset({
      type: newType,
      prompt: '',
      points: 10,
      ...(newType === QType.MCQ && {
        options: [
          { id: 'opt1', text: '' },
          { id: 'opt2', text: '' },
          { id: 'opt3', text: '' },
          { id: 'opt4', text: '' },
        ],
        correctOptionIds: [],
      }),
      ...(newType === QType.CODING && {
        starterCode: '',
        testcases: [{ input: '', expectedOutput: '', isHidden: false, timeoutMs: 2000 }],
      }),
      ...(newType === QType.ESSAY && {
        wordLimit: undefined,
      }),
    });
  };

  const toggleCorrectOption = (optionId: string) => {
    const current = watchedCorrectOptions || [];
    const newCorrectOptions = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    setValue('correctOptionIds', newCorrectOptions, { shouldValidate: true });
  };

  const onSubmit = async (data: QuestionFormInput) => {
    setApiError(null);
    try {
      // Prepare the question data according to backend schema
      const questionData: any = {
        type: data.type,
        prompt: data.prompt,
        points: Number(data.points),
        order: defaultOrder,
      };

      if (data.type === QType.MCQ) {
        questionData.options = data.options;
        questionData.correctOptionIds = data.correctOptionIds || [];
      } else if (data.type === QType.CODING) {
        questionData.starterCode = data.starterCode || '';
        // Ensure testcases are properly formatted
        if (data.testcases && Array.isArray(data.testcases) && data.testcases.length > 0) {
          questionData.testcases = data.testcases.map((tc: any) => ({
            input: String(tc.input || ''),
            expectedOutput: String(tc.expectedOutput || ''),
            isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : false,
            timeoutMs: tc.timeoutMs ? Number(tc.timeoutMs) : 2000,
          }));
          console.log('Creating coding question with testcases:', JSON.stringify(questionData.testcases, null, 2));
        } else {
          console.error('Coding question must have at least one testcase');
          setApiError('Coding question must have at least one test case');
          return;
        }
      } else if (data.type === QType.ESSAY) {
        if (data.wordLimit) {
          questionData.wordLimit = Number(data.wordLimit);
        }
      }

      // Call API to create question
      const { api } = await import('@/lib/api');
      await api.post(`/admin/exams/${examId}/questions`, {
        questions: [questionData],
      });

      onSuccess();
      onOpenChange(false);
      reset();
      setQuestionType(QType.MCQ);
    } catch (err: any) {
      console.error(err);
      setApiError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          'Failed to create question'
      );
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add Question Manually">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Question Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Question Type <span className="text-red-500">*</span>
          </label>
          <select
            value={questionType}
            onChange={(e) => handleTypeChange(e.target.value as QType)}
            className="flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value={QType.MCQ}>Multiple Choice (MCQ)</option>
            <option value={QType.CODING}>Coding</option>
            <option value={QType.ESSAY}>Essay</option>
          </select>
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
            placeholder="e.g. 10"
            className="w-full"
          />
          {errors.points && (
            <p className="mt-1.5 text-sm text-red-500">{errors.points.message}</p>
          )}
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Question Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            {...register('prompt')}
            className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
            placeholder="Enter your question here..."
          />
          {errors.prompt && (
            <p className="mt-1.5 text-sm text-red-500">{errors.prompt?.message}</p>
          )}
        </div>

        {/* MCQ Options */}
        {questionType === QType.MCQ && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-primary">
                Options <span className="text-red-500">*</span>
              </label>
              {optionFields.length < 8 && (
                <Button
                  type="button"
                  onClick={() => appendOption({ id: `opt${Date.now()}`, text: '' })}
                  className="h-8 px-3 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
            {optionFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <input
                  type="checkbox"
                  checked={watchedCorrectOptions?.includes(field.id) || false}
                  onChange={() => toggleCorrectOption(field.id)}
                  className="mt-2 h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50"
                />
                <div className="flex-1">
                  <Input
                    {...register(`options.${index}.text` as const)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full"
                  />
                  <input
                    type="hidden"
                    {...register(`options.${index}.id` as const)}
                    value={field.id}
                  />
                </div>
                {optionFields.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Remove from correct options if it was selected
                      if (watchedCorrectOptions?.includes(field.id)) {
                        toggleCorrectOption(field.id);
                      }
                      removeOption(index);
                    }}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {errors.options && (
              <p className="text-sm text-red-500">{errors.options.message}</p>
            )}
            {errors.correctOptionIds && (
              <p className="text-sm text-red-500">{errors.correctOptionIds.message}</p>
            )}
          </div>
        )}

        {/* Coding Starter Code */}
        {questionType === QType.CODING && (
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Starter Code (Optional)
            </label>
            <textarea
              rows={6}
              {...register('starterCode')}
              className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
              placeholder="function solution() {&#10;  // Your code here&#10;}"
            />
          </div>
        )}

        {/* Coding Test Cases */}
        {questionType === QType.CODING && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-primary">
                Test Cases <span className="text-red-500">*</span>
              </label>
              <Button
                type="button"
                onClick={() => appendTestcase({ input: '', expectedOutput: '', isHidden: false, timeoutMs: 2000 })}
                className="h-8 px-3 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Test Case
              </Button>
            </div>
            {testcaseFields.map((field, index) => (
              <div key={field.id} className="p-3 border border-primary/20 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">Test Case {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-primary/70">
                      <input
                        type="checkbox"
                        {...register(`testcases.${index}.isHidden`)}
                        className="h-3 w-3"
                      />
                      Hidden
                    </label>
                    {testcaseFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestcase(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  {...register(`testcases.${index}.input`)}
                  placeholder="Input"
                  className="w-full"
                />
                <Input
                  {...register(`testcases.${index}.expectedOutput`)}
                  placeholder="Expected Output"
                  className="w-full"
                />
                <Input
                  type="number"
                  {...register(`testcases.${index}.timeoutMs`, { valueAsNumber: true })}
                  placeholder="Timeout (ms)"
                  className="w-full"
                />
              </div>
            ))}
            {errors.testcases && (
              <p className="text-sm text-red-500">{errors.testcases.message}</p>
            )}
          </div>
        )}

        {/* Essay Word Limit */}
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
              className="w-full"
            />
          </div>
        )}

        {apiError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <p>{apiError}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              reset();
              setQuestionType(QType.MCQ);
            }}
            className="px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-md hover:bg-primary/5"
          >
            Cancel
          </button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Add Question
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

