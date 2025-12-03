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
    .refine((val) => val === undefined || !isNaN(val) && Number.isInteger(val) && val >= 0, 'Must be a non-negative integer (0 for unlimited)'),
  maxTabSwitches: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : Number(val)))
    .refine((val) => val === undefined || !isNaN(val) && Number.isInteger(val) && val >= 0, 'Must be a non-negative integer (0 for unlimited)'),
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

import { ExamBasicInfo } from './components/ExamBasicInfo';
import { ExamTiming } from './components/ExamTiming';
import { ExamSecurity } from './components/ExamSecurity';
import { ExamSettings } from './components/ExamSettings';

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
      maxAttempts: 0,
      maxTabSwitches: 0,
      allowedLanguages: defaultValues?.allowedLanguages || [],
      ...defaultValues,
    },
  });

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

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="p-6 bg-secondary border border-primary/10 rounded-lg shadow-md space-y-6">
        <ExamBasicInfo register={register} errors={errors} />
        
        <ExamTiming register={register} errors={errors} watch={watch} />
        
        <ExamSettings 
          register={register} 
          errors={errors} 
          watch={watch} 
          setValue={setValue}
          showRandomize={showRandomize}
          showNegativeMarking={showNegativeMarking}
        />
        
        <ExamSecurity register={register} errors={errors} />
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

