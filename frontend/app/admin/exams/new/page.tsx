'use client';

import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ExamForm, { localDateTimeValue, type ExamForm as ExamFormType } from '@/components/admin/exam/ExamForm';

export default function CreateExamPage() {
  const router = useRouter();

  const handleFormSubmit = async (data: ExamFormType) => {
    const response = await api.post('/admin/exams', data);
    const newExamId = response.data.id;
    // On success, redirect to the "Edit" page
    router.push(`/admin/exams/${newExamId}/edit`);
  };

  return (
    <div className="max-w-4xl mx-auto text-primary">
      <Link
        href="/admin/exams"
        className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Exam List
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold font-alan-sans mb-2">Create New Exam</h1>
        <p className="text-primary/70">
          Configure the core exam settings. You can add sections and questions after saving.
        </p>
      </div>

      <ExamForm
        defaultValues={{
          timingMode: 'OVERALL_ONLY' as const,
          sectionLockPolicy: 'NONE' as const,
          durationMins: 60,
          startAt: localDateTimeValue(new Date()),
          endAt: localDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
          randomizeQuestions: false,
        }}
        onSubmit={handleFormSubmit}
        submitLabel="Save and Continue"
        showRandomize={true}
        showNegativeMarking={true}
      />
    </div>
  );
}