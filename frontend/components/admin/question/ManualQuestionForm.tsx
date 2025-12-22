'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { QType } from '@/types';
import { Loader2, Save, Plus, Trash2, Info, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { AdminAPI } from '@/lib/api-admin';

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
  language: z.string().optional(), // For SQL questions
  config: z.object({
    ddl: z.string().optional(), // For SQL questions - schema definition
  }).optional(),
  testcases: z
    .array(
      z.object({
        input: z.string(), // For SQL: INSERT statements (can be empty for non-SQL)
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

// Schema for Listening question
const listeningQuestionSchema = z.object({
  type: z.literal(QType.LISTENING),
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
  mediaAssetId: z.string().min(1, 'Audio file is required'),
  maxListenCount: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? Number(val) : val;
    return isNaN(num) ? undefined : num;
  }).pipe(z.number().int().positive().optional()),
});

// Schema for Speaking question
const speakingQuestionSchema = z.object({
  type: z.literal(QType.SPEAKING),
  prompt: z.string().min(1, 'Prompt is required'),
  points: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (isNaN(num)) throw new Error('Points must be a valid number');
    return num;
  }).pipe(z.number().positive('Points must be positive')),
  maxDurationSec: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? Number(val) : val;
    return isNaN(num) ? undefined : num;
  }).pipe(z.number().int().positive().optional()),
  maxReattempts: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? Number(val) : val;
    return isNaN(num) ? undefined : num;
  }).pipe(z.number().int().nonnegative().optional()),
});

const questionFormSchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  codingQuestionSchema,
  essayQuestionSchema,
  listeningQuestionSchema,
  speakingQuestionSchema,
]);

type QuestionFormInput = z.input<typeof questionFormSchema>;

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
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioAssetId, setAudioAssetId] = useState<string | null>(null);

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

  watch('options');
  const watchedCorrectOptions = watch('correctOptionIds') || [];

  const handleTypeChange = (newType: QType) => {
    setQuestionType(newType);
    setAudioFile(null);
    setAudioAssetId(null);
    reset({
      type: newType as string as any, // Cast to avoid discriminated union issues during reset
      prompt: '',
      points: newType === QType.ESSAY ? ('' as unknown as number) : 10,
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
      ...(newType === QType.LISTENING && {
        options: [
          { id: 'opt1', text: '' },
          { id: 'opt2', text: '' },
          { id: 'opt3', text: '' },
          { id: 'opt4', text: '' },
        ],
        correctOptionIds: [],
        mediaAssetId: '',
        maxListenCount: undefined,
      }),
      ...(newType === QType.SPEAKING && {
        maxDurationSec: undefined,
        maxReattempts: undefined,
      }),
    } as QuestionFormInput);
  };

  const handleAudioUpload = async (file: File) => {
    setUploadingAudio(true);
    setApiError(null);
    try {
      const formData = new FormData();
      formData.append('assetFile', file);
      formData.append('kind', 'AUDIO');
      
      const asset = await AdminAPI.uploadAsset(formData);
      setAudioAssetId(asset.id);
      setValue('mediaAssetId', asset.id);
      setAudioFile(file);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setApiError(error?.response?.data?.message || error?.message || 'Failed to upload audio file');
    } finally {
      setUploadingAudio(false);
    }
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
      // Parse and validate the data through the schema to get the transformed output
      const validatedData = questionFormSchema.parse(data);
      
      // Prepare the question data according to backend schema
      const questionData: Record<string, unknown> = {
        type: validatedData.type,
        prompt: validatedData.prompt,
        points: validatedData.points,
        order: defaultOrder,
      };

      if (validatedData.type === QType.MCQ) {
        questionData.options = validatedData.options;
        questionData.correctOptionIds = validatedData.correctOptionIds || [];
      } else if (validatedData.type === QType.CODING) {
        questionData.starterCode = validatedData.starterCode || '';
        // Add language if specified (for SQL questions)
        if (validatedData.language) {
          questionData.language = validatedData.language;
        }
        // Add config with DDL if specified (for SQL questions)
        if (validatedData.config?.ddl) {
          questionData.config = { ddl: validatedData.config.ddl };
        }
        // Ensure testcases are properly formatted
        if (validatedData.testcases && Array.isArray(validatedData.testcases) && validatedData.testcases.length > 0) {
          questionData.testcases = validatedData.testcases.map((tc) => ({
            input: String(tc.input || ''),
            expectedOutput: String(tc.expectedOutput || ''),
            isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : false,
            timeoutMs: tc.timeoutMs ? Number(tc.timeoutMs) : 2000,
          }));

        } else {
          console.error('Coding question must have at least one testcase');
          setApiError('Coding question must have at least one test case');
          return;
        }
      } else if (validatedData.type === QType.ESSAY) {
        if (validatedData.wordLimit) {
          questionData.wordLimit = validatedData.wordLimit;
        }
      } else if (validatedData.type === QType.LISTENING) {
        questionData.options = validatedData.options;
        questionData.correctOptionIds = validatedData.correctOptionIds || [];
        questionData.mediaAssetId = validatedData.mediaAssetId;
        if (validatedData.maxListenCount) {
          questionData.config = { maxListenCount: validatedData.maxListenCount };
        }
      } else if (validatedData.type === QType.SPEAKING) {
        if (validatedData.maxDurationSec) {
          questionData.maxDurationSec = validatedData.maxDurationSec;
        }
        if (validatedData.maxReattempts !== undefined) {
          questionData.config = { maxReattempts: validatedData.maxReattempts };
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
      setAudioFile(null);
      setAudioAssetId(null);
    } catch (err: unknown) {
      const error = err as { 
        response?: { 
          data?: { 
            error?: { message?: string };
            message?: string;
          };
        };
      };
      console.error(err);
      setApiError(
        error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
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
          <option value={QType.LISTENING}>Listening</option>
          <option value={QType.SPEAKING}>Speaking</option>
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
            {'options' in errors && errors.options && (
              <p className="text-sm text-red-500">{errors.options.message}</p>
            )}
            {'correctOptionIds' in errors && errors.correctOptionIds && (
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

        {/* Language Selection for Coding */}
        {questionType === QType.CODING && (
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Language (Optional - for SQL questions)
            </label>
            <select
              {...register('language')}
              className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="">General Coding (All Languages)</option>
              <option value="sql">SQL (SQLite)</option>
            </select>
            <p className="text-xs text-primary/60 mt-1">
              Select "SQL" if this is a SQL question. Leave as "General Coding" for regular coding questions.
            </p>
          </div>
        )}

        {/* SQL DDL Field */}
        {questionType === QType.CODING && watch('language') === 'sql' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-blue-900 mb-2">
              Database Schema (DDL) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={8}
              {...register('config.ddl')}
              className="flex w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
              placeholder="CREATE TABLE users (&#10;  id INTEGER PRIMARY KEY,&#10;  name TEXT NOT NULL&#10;);"
            />
            <div className="mt-2 text-xs text-blue-800">
              <p className="font-semibold">📝 Important:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Include ONLY CREATE TABLE statements (schema definition)</li>
                <li>Do NOT include INSERT statements here</li>
                <li>INSERT statements go in test case inputs below</li>
              </ul>
            </div>
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
                <textarea
                  rows={3}
                  {...register(`testcases.${index}.input`)}
                  placeholder="Input"
                  className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
                <textarea
                  rows={3}
                  {...register(`testcases.${index}.expectedOutput`)}
                  placeholder="Expected Output"
                  className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-mono text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
                <Input
                  type="number"
                  {...register(`testcases.${index}.timeoutMs`, { valueAsNumber: true })}
                  placeholder="Timeout (ms)"
                  className="w-full"
                />
              </div>
            ))}
            {'testcases' in errors && errors.testcases && (
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

        {/* Listening Specific Fields */}
        {questionType === QType.LISTENING && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Audio File <span className="text-red-500">*</span>
              </label>
              {!audioAssetId ? (
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAudioUpload(file);
                    }}
                    className="hidden"
                    id="audio-upload"
                    disabled={uploadingAudio}
                  />
                  <label
                    htmlFor="audio-upload"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${uploadingAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Upload className="w-8 h-8 text-primary/60" />
                    <span className="text-sm text-primary/80">
                      {uploadingAudio ? 'Uploading...' : 'Click to upload audio file'}
                    </span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-800 font-medium">
                      {audioFile?.name || 'Audio uploaded'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioFile(null);
                      setAudioAssetId(null);
                      setValue('mediaAssetId', '');
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input
                type="hidden"
                {...register('mediaAssetId' as any)}
                value={audioAssetId || ''}
              />
              {questionType === QType.LISTENING && 'mediaAssetId' in errors && errors.mediaAssetId && (
                <p className="mt-1.5 text-sm text-red-500">{(errors.mediaAssetId as { message?: string }).message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Max Listen Count (Optional)
              </label>
              <Input
                type="number"
                min="1"
                {...register('maxListenCount')}
                placeholder="e.g. 3 (leave empty for unlimited)"
                className="w-full"
              />
              <p className="mt-1 text-xs text-primary/60">
                Maximum number of times students can listen to the audio
              </p>
            </div>

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
              {'options' in errors && errors.options && (
                <p className="text-sm text-red-500">{errors.options.message}</p>
              )}
              {'correctOptionIds' in errors && errors.correctOptionIds && (
                <p className="text-sm text-red-500">{errors.correctOptionIds.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Speaking Specific Fields */}
        {questionType === QType.SPEAKING && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Max Recording Duration (seconds) (Optional)
              </label>
              <Input
                type="number"
                min="1"
                {...register('maxDurationSec')}
                placeholder="e.g. 60"
                className="w-full"
              />
              <p className="mt-1 text-xs text-primary/60">
                Maximum duration for student audio recording
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Max Reattempts (Optional)
              </label>
              <Input
                type="number"
                min="0"
                {...register('maxReattempts')}
                placeholder="e.g. 2 (leave empty for unlimited)"
                className="w-full"
              />
              <p className="mt-1 text-xs text-primary/60">
                Maximum number of times students can re-record their answer
              </p>
            </div>
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

