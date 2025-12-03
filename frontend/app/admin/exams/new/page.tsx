'use client';

import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ExamForm, { localDateTimeValue, type ExamForm as ExamFormType } from '@/components/admin/exam/ExamForm';
import { TimingMode, SectionLockPolicy } from '@/types';
import { useEffect, useState } from 'react';

export default function CreateExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get('templateId');
  
  const [loading, setLoading] = useState(!!templateId);
  const [templateData, setTemplateData] = useState<any>(null);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await api.get(`/admin/templates/${templateId}`);
      setTemplateData(response.data);
    } catch (error) {
      console.error('Failed to fetch template:', error);
      alert('Failed to load template data');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data: ExamFormType) => {
    try {
      let response;
      if (templateId) {
        // Create exam from template
        response = await api.post(`/admin/templates/${templateId}/exam`, {
          title: data.title,
          startAt: data.startAt,
          endAt: data.endAt,
        });
      } else {
        // Create standard exam
        response = await api.post('/admin/exams', data);
      }
      
      const newExamId = response.data.id;
      // On success, redirect to the "Edit" page
      router.push(`/admin/exams/${newExamId}/edit`);
    } catch (error) {
      console.error('Failed to create exam:', error);
      alert('Failed to create exam');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-primary">Loading template...</span>
      </div>
    );
  }

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
        <h1 className="text-4xl font-bold font-alan-sans mb-2">
          {templateId ? `Create Exam from Template` : 'Create New Exam'}
        </h1>
        <p className="text-primary/70">
          {templateId 
            ? `Creating a new exam based on "${templateData?.title || 'template'}". Settings have been pre-filled.`
            : 'Configure the core exam settings. You can add sections and questions after saving.'}
        </p>
      </div>

      <ExamForm
        defaultValues={{
          title: templateData ? `${templateData.title} (Copy)` : '',
          description: templateData?.description || '',
          timingMode: templateData?.structure?.timingMode || TimingMode.OVERALL_ONLY,
          sectionLockPolicy: templateData?.structure?.sectionLockPolicy || SectionLockPolicy.NONE,
          durationMins: templateData?.structure?.durationMins || 60,
          startAt: localDateTimeValue(new Date()),
          endAt: localDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
          randomizeQuestions: templateData?.structure?.randomizeQuestions || false,
          negativeMarkPerWrong: templateData?.structure?.negativeMarkPerWrong?.toString(),
          maxAttempts: templateData?.structure?.maxAttempts,
          maxTabSwitches: templateData?.structure?.maxTabSwitches,
          allowedLanguages: templateData?.structure?.allowedLanguages || [],
        }}
        onSubmit={handleFormSubmit}
        submitLabel={templateId ? "Create Exam from Template" : "Save and Continue"}
        showRandomize={true}
        showNegativeMarking={true}
        // If using a template, some fields might be read-only or hidden if you want to enforce template settings
        // For now, we allow editing everything
      />
    </div>
  );
}