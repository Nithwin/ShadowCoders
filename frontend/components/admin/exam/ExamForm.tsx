'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { TimingMode, SectionLockPolicy } from '@/types';
import { Loader2, Save, Info, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// Available programming languages
export const AVAILABLE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python 3' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'sql', label: 'SQL (SQLite)' },
];

// Form schema for exam settings
export const examFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  startAt: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid start date-time')
    .transform((v) => new Date(v).toISOString()),
  endAt: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid end date-time')
    .transform((v) => new Date(v).toISOString()),
  durationMins: z.coerce.number().int().min(1, 'Duration must be positive'),
  timingMode: z.nativeEnum(TimingMode),
  sectionLockPolicy: z.nativeEnum(SectionLockPolicy),
  randomizeQuestions: z.boolean().optional(),
  negativeMarkPerWrong: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : Number(val)))
    .refine((val) => val === undefined || !isNaN(val), 'Invalid number'),
  maxAttempts: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : Number(val)))
    .refine((val) => val === undefined || !isNaN(val) && Number.isInteger(val) && val >= 1, 'Must be a positive integer'),
  maxTabSwitches: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : Number(val)))
    .refine((val) => val === undefined || !isNaN(val) && Number.isInteger(val) && val >= 0, 'Must be a non-negative integer'),
  allowedLanguages: z.array(z.string()).optional(),
}).refine((data) => new Date(data.startAt) < new Date(data.endAt), {
  message: 'Start time must be before end time',
  path: ['startAt'],
});

export type ExamFormInput = z.input<typeof examFormSchema>;
export type ExamForm = z.output<typeof examFormSchema>;

// Helper to format dates for <input type="datetime-local">
export function localDateTimeValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function toDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const dateWithoutTimezone = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return dateWithoutTimezone.toISOString().slice(0, 16);
}

interface ExamFormProps {
  defaultValues?: Partial<ExamFormInput>;
  onSubmit: (data: ExamForm) => Promise<void>;
  isSubmitting?: boolean;
  apiError?: string | null;
  submitLabel?: string;
  showRandomize?: boolean;
  showNegativeMarking?: boolean;
}

export default function ExamForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  apiError: externalApiError = null,
  submitLabel = 'Save',
  showRandomize = true,
  showNegativeMarking = true,
}: ExamFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Use external error if provided, otherwise use internal
  const displayError = externalApiError || apiError;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<ExamFormInput>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      timingMode: TimingMode.OVERALL_ONLY,
      sectionLockPolicy: SectionLockPolicy.NONE,
      durationMins: 60,
      startAt: localDateTimeValue(new Date()),
      endAt: localDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
      randomizeQuestions: false,
      allowedLanguages: defaultValues?.allowedLanguages || [],
      ...defaultValues,
    },
  });

  const selectedLanguages = watch('allowedLanguages') || [];
  
  const toggleLanguage = (langValue: string) => {
    const current = selectedLanguages || [];
    if (current.includes(langValue)) {
      setValue('allowedLanguages', current.filter((l) => l !== langValue), { shouldDirty: true });
    } else {
      setValue('allowedLanguages', [...current, langValue], { shouldDirty: true });
    }
  };

  const handleFormSubmit = async (raw: ExamFormInput) => {
    setApiError(null);
    setSuccessMessage(null);
    try {
      const data = examFormSchema.parse(raw) as ExamForm;
      await onSubmit(data);
      setSuccessMessage('Saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      // Check if this is a cancellation error (user cancelled the confirmation dialog)
      if (err instanceof Error && (err as any).isCancellation) {
        // Silently handle cancellation - don't show error message
        return;
      }
      
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      console.error(err);
      setApiError(
        error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          'Failed to save exam'
      );
    }
  };

  const startAtVal = watch('startAt');
  const endAtVal = watch('endAt');
  const dateOrderInvalid = startAtVal && endAtVal && new Date(startAtVal) >= new Date(endAtVal);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="p-6 bg-secondary border border-primary/10 rounded-lg shadow-md space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-primary mb-2">
            Exam Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g. Midterm Assessment - Data Structures"
            className="w-full"
          />
          {errors.title && (
            <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-primary mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
            placeholder="Optional exam description or instructions for students"
          />
          {errors.description && (
            <p className="mt-1.5 text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startAt" className="block text-sm font-semibold text-primary mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <Input
              id="startAt"
              type="datetime-local"
              {...register('startAt')}
              step="60"
              className="w-full"
            />
            {errors.startAt && (
              <p className="mt-1.5 text-sm text-red-500">{errors.startAt.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="endAt" className="block text-sm font-semibold text-primary mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <Input
              id="endAt"
              type="datetime-local"
              {...register('endAt')}
              step="60"
              className="w-full"
            />
            {errors.endAt && (
              <p className="mt-1.5 text-sm text-red-500">{errors.endAt.message}</p>
            )}
          </div>
        </div>
        {dateOrderInvalid && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <Info className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-600">Start time must be before end time.</p>
          </div>
        )}

        {/* Duration and Timing Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="durationMins" className="block text-sm font-semibold text-primary mb-2">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <Input
              id="durationMins"
              type="number"
              min={1}
              {...register('durationMins')}
              className="w-full"
            />
            {errors.durationMins && (
              <p className="mt-1.5 text-sm text-red-500">{errors.durationMins.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="timingMode" className="block text-sm font-semibold text-primary mb-2">
              Timing Mode <span className="text-red-500">*</span>
            </label>
            <select
              id="timingMode"
              {...register('timingMode')}
              className="flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value={TimingMode.OVERALL_ONLY}>Overall Only</option>
              <option value={TimingMode.PER_SECTION_ONLY}>Per Section Only</option>
              <option value={TimingMode.BOTH}>Both</option>
            </select>
            {errors.timingMode && (
              <p className="mt-1.5 text-sm text-red-500">{errors.timingMode.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="sectionLockPolicy" className="block text-sm font-semibold text-primary mb-2">
              Section Lock Policy <span className="text-red-500">*</span>
            </label>
            <select
              id="sectionLockPolicy"
              {...register('sectionLockPolicy')}
              className="flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value={SectionLockPolicy.NONE}>None</option>
              <option value={SectionLockPolicy.LOCK_ON_COMPLETE}>Lock on Complete</option>
              <option value={SectionLockPolicy.LINEAR_NO_BACKTRACK}>Linear (No Backtrack)</option>
            </select>
            {errors.sectionLockPolicy && (
              <p className="mt-1.5 text-sm text-red-500">{errors.sectionLockPolicy.message}</p>
            )}
          </div>
        </div>

        {/* Additional Options */}
        {(showRandomize || showNegativeMarking) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-primary/10">
            {showRandomize && (
              <div className="flex items-center gap-3">
                <input
                  id="randomizeQuestions"
                  type="checkbox"
                  {...register('randomizeQuestions')}
                  className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50"
                />
                <label htmlFor="randomizeQuestions" className="text-sm font-medium text-primary/80 cursor-pointer">
                  Randomize Question Order
                </label>
              </div>
            )}
            {showNegativeMarking && (
              <div>
                <label htmlFor="negativeMarkPerWrong" className="block text-sm font-semibold text-primary mb-2">
                  Negative Marking (per wrong answer)
                </label>
                <Input
                  id="negativeMarkPerWrong"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('negativeMarkPerWrong')}
                  placeholder="e.g. 0.25 (optional)"
                  className="w-full"
                />
                {errors.negativeMarkPerWrong && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.negativeMarkPerWrong.message as string}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Security Settings */}
        <div className="pt-4 border-t border-primary/10">
          <h3 className="text-sm font-semibold text-primary mb-3">Security & Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxAttempts" className="block text-sm font-semibold text-primary mb-2">
                Max Attempts
              </label>
              <Input
                id="maxAttempts"
                type="number"
                min="1"
                {...register('maxAttempts')}
                placeholder="Unlimited if empty"
                className="w-full"
              />
              <p className="text-xs text-primary/60 mt-1">Leave empty for unlimited attempts.</p>
              {errors.maxAttempts && (
                <p className="mt-1.5 text-sm text-red-500">{errors.maxAttempts.message as string}</p>
              )}
            </div>
            <div>
              <label htmlFor="maxTabSwitches" className="block text-sm font-semibold text-primary mb-2">
                Max Tab Switches
              </label>
              <Input
                id="maxTabSwitches"
                type="number"
                min="0"
                {...register('maxTabSwitches')}
                placeholder="Unlimited if empty"
                className="w-full"
              />
              <p className="text-xs text-primary/60 mt-1">Warning shown on switch. Auto-submit if exceeded.</p>
              {errors.maxTabSwitches && (
                <p className="mt-1.5 text-sm text-red-500">{errors.maxTabSwitches.message as string}</p>
              )}
            </div>
          </div>
        </div>

        {/* Allowed Programming Languages */}
        <div className="pt-4 border-t border-primary/10">
          <label className="block text-sm font-semibold text-primary mb-3">
            Allowed Programming Languages (for coding questions)
          </label>
          <p className="text-xs text-primary/60 mb-3">
            Select which programming languages students can use when solving coding questions. Leave empty to allow all languages.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_LANGUAGES.map((lang) => (
              <div key={lang.value} className="flex items-center gap-2">
                <input
                  id={`lang-${lang.value}`}
                  type="checkbox"
                  checked={selectedLanguages.includes(lang.value)}
                  onChange={() => toggleLanguage(lang.value)}
                  className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50"
                />
                <label htmlFor={`lang-${lang.value}`} className="text-sm font-medium text-primary/80 cursor-pointer">
                  {lang.label}
                </label>
              </div>
            ))}
          </div>
          <input type="hidden" {...register('allowedLanguages')} />
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {displayError && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            <div>
              <strong className="font-semibold">Error:</strong>
              <p className="mt-1">{displayError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || (!isDirty && !!defaultValues)} className="min-w-[150px]">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

