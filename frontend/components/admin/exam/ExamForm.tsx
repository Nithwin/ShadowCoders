'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { TimingMode, SectionLockPolicy } from '@/types';
import { Loader2, Save, Info, CheckCircle2, AlertCircle } from 'lucide-react';
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
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null) return null;
      return (val === '' || val === undefined) ? undefined : Number(val);
    })
    .refine((val) => val === undefined || val === null || !isNaN(val) && Number.isInteger(val) && val >= 0, 'Must be a non-negative integer (0 for unlimited)'),
  allowedLanguages: z.array(z.string()).optional(),
  releaseResults: z.boolean().optional(),
  enableProctoring: z.boolean().optional(),
  mode: z.enum(['STANDARD', 'DYNAMIC']).default('STANDARD'),
  dynamicQuestionCount: z.coerce.number().int().optional(),
  generationPrompt: z.string().optional(),
  dynamicTopics: z.array(z.string()).optional(),
}).refine((data) => new Date(data.startAt) < new Date(data.endAt), {
  message: 'Start time must be before end time',
  path: ['startAt'],
}).refine((data) => {
  if (data.mode !== 'DYNAMIC') return true;
  const hasCount = typeof data.dynamicQuestionCount === 'number' && data.dynamicQuestionCount >= 1;
  const hasTopics = Array.isArray(data.dynamicTopics) && data.dynamicTopics.length > 0;
  return hasCount && hasTopics;
}, {
  message: 'Dynamic mode requires questions per student and at least one topic.',
  path: ['dynamicTopics'],
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
import { ExamFormTabs, type TabId } from './components/ExamFormTabs';

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
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  
  // If editing (title exists), mark all tabs as visited
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set(defaultValues?.title ? ['basic', 'timing', 'settings', 'security'] : ['basic'])
  );
  
  // Use external error if provided, otherwise use internal
  const displayError = externalApiError || apiError;

  const normalizedTimingMode =
    defaultValues?.timingMode === TimingMode.PER_SECTION_ONLY
      ? TimingMode.BOTH
      : (defaultValues?.timingMode ?? TimingMode.OVERALL_ONLY);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    clearErrors,
  } = useForm<ExamFormInput>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      timingMode: normalizedTimingMode,
      sectionLockPolicy: SectionLockPolicy.NONE,
      durationMins: 60,
      startAt: localDateTimeValue(new Date()),
      endAt: localDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
      randomizeQuestions: false,
      maxAttempts: 1,
      maxTabSwitches: 1,
      releaseResults: true,
      allowedLanguages: defaultValues?.allowedLanguages || [],
      ...defaultValues,
    },
  });
  
  const mode = watch('mode');
  
  // Clear dynamic errors when switching to STANDARD
  useEffect(() => {
    if (mode === 'STANDARD') {
      clearErrors(['dynamicQuestionCount', 'dynamicTopics']);
    }
  }, [mode, clearErrors]);

  const handleFormSubmit = async (raw: ExamFormInput) => {
    setApiError(null);
    setSuccessMessage(null);
    try {
      const normalizedRaw = {
        ...raw,
        timingMode:
          raw.timingMode === TimingMode.PER_SECTION_ONLY
            ? TimingMode.BOTH
            : raw.timingMode,
      };
      const data = examFormSchema.parse(normalizedRaw) as ExamForm;
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

  // Determine tab errors and completion status
  const tabErrors = {
    basic: !!(errors.title || errors.description),
    timing: !!(errors.startAt || errors.endAt || errors.durationMins || errors.timingMode || errors.sectionLockPolicy),
    settings: !!(
      errors.randomizeQuestions ||
      errors.negativeMarkPerWrong ||
      errors.allowedLanguages ||
      errors.releaseResults ||
      (watch('mode') === 'DYNAMIC' && (errors.dynamicQuestionCount || errors.dynamicTopics))
    ),
    security: !!(errors.maxAttempts || errors.maxTabSwitches),
  };

  const tabCompleted = {
    basic: !!watch('title') && !tabErrors.basic,
    timing: !!watch('startAt') && !!watch('endAt') && !tabErrors.timing,
    settings: !tabErrors.settings,
    security: !tabErrors.security,
  };

  // Check if all necessary fields are valid
  const currentMode = watch('mode');
  const hasSettingsErrors = tabErrors.settings;
  const allTabsValid = !tabErrors.basic && !tabErrors.timing && !hasSettingsErrors && !tabErrors.security;
  const canSubmit = allTabsValid && !!watch('title') && !!watch('startAt') && !!watch('endAt');

  const handleTabChange = (tab: TabId) => {
    setVisitedTabs(prev => new Set([...prev, tab]));
    setActiveTab(tab);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Tabbed Navigation */}
      <ExamFormTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        errors={tabErrors}
        completed={tabCompleted}
        visitedTabs={visitedTabs}
      />

      {/* Tab Content */}
      <div className="p-6 bg-secondary border border-primary/10 rounded-lg shadow-md space-y-6">
        {activeTab === 'basic' && (
          <ExamBasicInfo register={register} errors={errors} />
        )}
        
        {activeTab === 'timing' && (
          <ExamTiming register={register} errors={errors} watch={watch} />
        )}
        
        {activeTab === 'settings' && (
          <ExamSettings 
            register={register} 
            errors={errors} 
            watch={watch} 
            setValue={setValue}
            showRandomize={showRandomize}
            showNegativeMarking={showNegativeMarking}
          />
        )}
        
        {activeTab === 'security' && (
          <ExamSecurity register={register} errors={errors} watch={watch} setValue={setValue} />
        )}
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

      <div className="flex justify-between">
        {activeTab !== 'basic' && (
          <Button 
            type="button" 
            onClick={() => {
              const tabs: TabId[] = ['basic', 'timing', 'settings', 'security'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex > 0) {
                const previousTab = tabs[currentIndex - 1];
                setVisitedTabs(prev => new Set([...prev, previousTab]));
                setActiveTab(previousTab);
              }
            }}
            variant="outline"
            className="min-w-[120px]"
          >
            Previous
          </Button>
        )}
        
        <div className="flex-1" />
        
        {activeTab === 'security' ? (
          <>
            <Button 
              type="submit" 
              disabled={isSubmitting || !canSubmit} 
              className="min-w-[150px]"
              title={!canSubmit ? "Please fill all required fields in all sections" : ""}
            >
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
            {!canSubmit && (
              <div className="ml-3 flex flex-col gap-1.5 bg-red-50 p-3 rounded-lg border border-red-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  Form Incomplete
                </div>
                <div className="space-y-1">
                  {tabErrors.basic && <p className="text-xs text-red-600">• Check <strong>Basic Info</strong> (Title is required)</p>}
                  {tabErrors.timing && <p className="text-xs text-red-600">• Check <strong>Schedule & Timing</strong> (Check dates/duration)</p>}
                  {tabErrors.settings && <p className="text-xs text-red-600">• Check <strong>Settings</strong> (Check Topics/Questions count)</p>}
                  {tabErrors.security && <p className="text-xs text-red-600">• Check <strong>Security</strong></p>}
                  
                  {Object.keys(errors).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-red-200/50">
                      <p className="text-[10px] font-bold text-red-800 uppercase">Field Errors:</p>
                      {Object.entries(errors).map(([key, err]) => (
                        <p key={key} className="text-[10px] text-red-600 italic">
                          {key}: {err?.message as string || 'Invalid input'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <Button 
            type="button" 
            onClick={() => {
              const tabs: TabId[] = ['basic', 'timing', 'settings', 'security'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex < tabs.length - 1) {
                const nextTab = tabs[currentIndex + 1];
                setVisitedTabs(prev => new Set([...prev, nextTab]));
                setActiveTab(nextTab);
              }
            }}
            className="min-w-[120px]"
          >
            Next
          </Button>
        )}
      </div>
    </form>
  );
}

