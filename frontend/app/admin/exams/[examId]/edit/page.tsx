"use client";

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Exam, TimingMode, SectionLockPolicy } from '@/types';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

const updateExamFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  // Accept datetime-local and normalize to ISO for API
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
}).refine((data) => new Date(data.startAt) < new Date(data.endAt), {
  message: 'Start time must be before end time',
  path: ['startAt'],
});

type UpdateExamFormInput = z.input<typeof updateExamFormSchema>;
type UpdateExamForm = z.output<typeof updateExamFormSchema>;

const toDateTimeLocal = (isoString: string): string => {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const dateWithoutTimezone = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return dateWithoutTimezone.toISOString().slice(0, 16);
};

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params?.examId as string;

  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'questions' | 'sections' | 'assignments'>('settings');

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset, watch } = useForm<UpdateExamFormInput>({
    resolver: zodResolver(updateExamFormSchema),
  });

  useEffect(() => {
    if (!examId) return;
    api.get(`/admin/exams/${examId}`)
      .then((response) => {
        const exam = response.data as Exam;
        reset({
          title: exam.title,
          description: exam.description || '',
          startAt: toDateTimeLocal(exam.startAt),
          endAt: toDateTimeLocal(exam.endAt),
          durationMins: exam.durationMins,
          timingMode: exam.timingMode,
          sectionLockPolicy: exam.sectionLockPolicy,
        });
      })
      .catch((err) => {
        console.error(err);
        setApiError('Failed to load exam data.');
      });
  }, [examId, reset]);

  const onSubmit = async (raw: UpdateExamFormInput) => {
    setApiError(null);
    try {
      const data = updateExamFormSchema.parse(raw) as UpdateExamForm;
      await api.put(`/admin/exams/${examId}`, data);
      reset(raw);
      alert('Exam updated successfully!');
    } catch (err: any) {
      console.error(err);
      setApiError(err?.response?.data?.error?.message || 'Failed to update exam');
    }
  };

  return (
    <div className="max-w-5xl mx-auto text-primary">
      <Link href="/admin/exams" className="flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Exam List
      </Link>

      <h1 className="text-4xl font-bold font-alan-sans mb-6">Edit Exam</h1>

      <div className="flex border-b border-primary/20 mb-6">
        {(['settings', 'questions', 'sections', 'assignments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 ${activeTab === tab ? 'border-b-2 border-primary' : 'text-primary/60'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="p-6 bg-secondary rounded-lg shadow-md space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-primary/80">Title</label>
              <input id="title" {...register('title')} className="mt-1 block w-full rounded-md bg-primary/10 border-primary/20" />
              {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-primary/80">Description</label>
              <textarea id="description" rows={3} {...register('description')} className="mt-1 block w-full rounded-md bg-primary/10 border-primary/20" />
              {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startAt" className="block text-sm font-medium text-primary/80">Start Time</label>
                <input id="startAt" type="datetime-local" {...register('startAt')} className="mt-1 block w-full rounded-md bg-primary/10 border-primary/20" step="60" />
                {errors.startAt && <p className="mt-1 text-sm text-red-500">{errors.startAt.message}</p>}
              </div>
              <div>
                <label htmlFor="endAt" className="block text-sm font-medium text-primary/80">End Time</label>
                <input id="endAt" type="datetime-local" {...register('endAt')} className="mt-1 block w-full rounded-md bg-primary/10 border-primary/20" step="60" />
                {errors.endAt && <p className="mt-1 text-sm text-red-500">{errors.endAt.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="durationMins" className="block text-sm font-medium text-primary/80">Duration (in minutes)</label>
              <input id="durationMins" type="number" {...register('durationMins', { valueAsNumber: true })} className="mt-1 block w-full rounded-md bg-primary/10 border-primary/20" />
              {errors.durationMins && <p className="mt-1 text-sm text-red-500">{errors.durationMins.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="timingMode" className="block text-sm font-medium text-primary/80">Timing Mode</label>
                <select id="timingMode" {...register('timingMode')} className="mt-1 block w-full rounded-md bg-primary/10 border-primary/20">
                  {Object.values(TimingMode).map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
                {errors.timingMode && <p className="mt-1 text-sm text-red-500">{errors.timingMode.message}</p>}
              </div>
              <div>
                <label htmlFor="sectionLockPolicy" className="block text sm font-medium text-primary/80">Section Lock Policy</label>
                <select id="sectionLockPolicy" {...register('sectionLockPolicy')} className="mt-1 block w-full rounded-md bg-primary/10 border-primary/20">
                  {Object.values(SectionLockPolicy).map((policy) => (
                    <option key={policy} value={policy}>{policy}</option>
                  ))}
                </select>
                {errors.sectionLockPolicy && <p className="mt-1 text-sm text-red-500">{errors.sectionLockPolicy.message}</p>}
              </div>
            </div>
          </div>

          {apiError && (
            <div className="p-4 rounded-md bg-red-100 border border-red-300 text-red-800">
              <strong>Error:</strong> {apiError}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting || !isDirty} className="flex items-center gap-2 px-6 py-2 bg-primary text-secondary rounded-lg shadow-md hover:bg-primary/80 transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </form>
      )}

      {activeTab === 'questions' && (
        <div className="p-6 bg-secondary rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Manage Questions</h2>
          <p>This is where the Question Management component will go.</p>
        </div>
      )}

      {activeTab === 'sections' && (
        <div className="p-6 bg-secondary rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Manage Sections</h2>
          <p>This is where the Section Management component will go.</p>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="p-6 bg-secondary rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Manage Assignments</h2>
          <p>This is where the Assignment Management component will go.</p>
        </div>
      )}
    </div>
  );
}
