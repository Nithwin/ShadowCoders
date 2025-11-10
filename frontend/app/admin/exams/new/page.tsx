"use client";

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TimingMode, SectionLockPolicy } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Form schema mirroring backend createExamSchema
const createExamFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  // Accept <input type="datetime-local"> value and normalize to RFC 3339 ISO for the API
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
    .transform((val: string | number | undefined) => (val === '' || val === undefined ? undefined : Number(val)))
    .refine((val: number | undefined) => val === undefined || !isNaN(val), 'Invalid number'),
}).refine((data: any) => new Date(data.startAt) < new Date(data.endAt), {
  message: 'Start time must be before end time',
  path: ['startAt'],
});

type CreateExamFormInput = z.input<typeof createExamFormSchema>;
export type CreateExamForm = z.output<typeof createExamFormSchema>;

function localDateTimeValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function CreateExamPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CreateExamFormInput>({
    resolver: zodResolver(createExamFormSchema),
    defaultValues: {
      timingMode: TimingMode.OVERALL_ONLY,
      sectionLockPolicy: SectionLockPolicy.NONE,
      durationMins: 60,
      startAt: localDateTimeValue(new Date()),
      endAt: localDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
      randomizeQuestions: false,
    },
  });

  const onSubmit = async (raw: CreateExamFormInput) => {
    setApiError(null);
    try {
      // Parse to get the refined/output types (numbers, etc.)
      const data = createExamFormSchema.parse(raw) as CreateExamForm;
      const response = await api.post('/admin/exams', data);
      const newExamId = response.data.id;
      router.push(`/admin/exams/${newExamId}/edit`);
    } catch (err: any) {
      console.error(err);
      setApiError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          'Failed to create exam'
      );
    }
  };

  const startAtVal = watch('startAt');
  const endAtVal = watch('endAt');
  const dateOrderInvalid = startAtVal && endAtVal && new Date(startAtVal) >= new Date(endAtVal);

  return (
    <div className="max-w-3xl mx-auto py-6">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold mb-2">Create New Exam</h1>
      <p className="mb-6 text-gray-600">
        Configure the core exam settings. You can add sections and questions after saving.
      </p>

  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-6 bg-white border rounded-lg shadow-sm space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input
              id="title"
              {...register('title')}
              className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g. Midterm Assessment"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Optional exam description"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startAt" className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                id="startAt"
                type="datetime-local"
                {...register('startAt')}
                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                step="60"
              />
              {errors.startAt && <p className="mt-1 text-sm text-red-600">{errors.startAt.message}</p>}
            </div>
            <div>
              <label htmlFor="endAt" className="block text-sm font-medium text-gray-700">End Time</label>
              <input
                id="endAt"
                type="datetime-local"
                {...register('endAt')}
                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                step="60"
              />
              {errors.endAt && <p className="mt-1 text-sm text-red-600">{errors.endAt.message}</p>}
            </div>
          </div>
          {dateOrderInvalid && (
            <p className="text-sm text-red-600">Start time must be before end time.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="durationMins" className="block text-sm font-medium text-gray-700">Duration (mins)</label>
              <input
                id="durationMins"
                type="number"
                min={1}
                {...register('durationMins', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.durationMins && <p className="mt-1 text-sm text-red-600">{errors.durationMins.message}</p>}
            </div>
            <div>
              <label htmlFor="timingMode" className="block text-sm font-medium text-gray-700">Timing Mode</label>
              <select
                id="timingMode"
                {...register('timingMode')}
                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              >
                {Object.values(TimingMode).map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
              {errors.timingMode && <p className="mt-1 text-sm text-red-600">{errors.timingMode.message}</p>}
            </div>
            <div>
              <label htmlFor="sectionLockPolicy" className="block text-sm font-medium text-gray-700">Section Lock Policy</label>
              <select
                id="sectionLockPolicy"
                {...register('sectionLockPolicy')}
                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              >
                {Object.values(SectionLockPolicy).map((policy) => (
                  <option key={policy} value={policy}>{policy}</option>
                ))}
              </select>
              {errors.sectionLockPolicy && <p className="mt-1 text-sm text-red-600">{errors.sectionLockPolicy.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                id="randomizeQuestions"
                type="checkbox"
                {...register('randomizeQuestions')}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="randomizeQuestions" className="text-sm font-medium text-gray-700">Randomize Question Order</label>
            </div>
            <div>
              <label htmlFor="negativeMarkPerWrong" className="block text-sm font-medium text-gray-700">Negative Mark (per wrong)</label>
              <input
                id="negativeMarkPerWrong"
                type="number"
                step="0.01"
                {...register('negativeMarkPerWrong')}
                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g. 0.25"
              />
              {errors.negativeMarkPerWrong && (
                <p className="mt-1 text-sm text-red-600">{errors.negativeMarkPerWrong.message as string}</p>
              )}
            </div>
          </div>
        </div>

        {apiError && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            <strong className="font-medium">Error:</strong> {apiError}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save and Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
