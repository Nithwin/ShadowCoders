"use client";

import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Exam } from '@/types';
import { ArrowLeft, Loader2, CheckCircle2, Info } from 'lucide-react';
import Link from 'next/link';
import QuestionManager from '@/components/admin/QuestionManager';
import ExamForm, { toDateTimeLocal, type ExamForm as ExamFormType } from '@/components/admin/exam/ExamForm';
import ExamTabs from '@/components/admin/exam/ExamTabs';
import AssignmentManager from '@/components/admin/exam/AssignmentManager';
import { Button } from '@/components/ui/Button';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';

export default function EditExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.examId as string;
  const { confirm } = useConfirmationDialog();
  const toast = useToastNotification();

  const [examData, setExamData] = useState<Exam | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'questions' | 'assignments'>('settings');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchExamData = async () => {
    setIsLoadingExam(true);
    setApiError(null);
    try {
      const response = await api.get(`/admin/exams/${examId}`);
      const exam = response.data as Exam;
      setExamData(exam);
      
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setApiError(error.response?.data?.error?.message || 'Failed to load exam data. Please refresh the page.');
    } finally {
      setIsLoadingExam(false);
    }
  };

  useEffect(() => {
    if (!examId) return;
    fetchExamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);


  const handleFormSubmit = async (data: ExamFormType) => {
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMessage(null);
    try {
      await api.put(`/admin/exams/${examId}`, data);
      setSuccessMessage('Exam settings updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Refresh exam data
      await fetchExamData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      console.error(err);
      setApiError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update exam. Please try again.'
      );
      throw err; // Re-throw so ExamForm can handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishExam = async () => {
    const confirmed = await confirm({
      title: 'Publish Exam',
      message: 'Are you sure you want to publish this exam? Once published, students will be able to access it based on assignments.',
      confirmText: 'Publish',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    
    if (!confirmed) {
      return;
    }
    
    setIsPublishing(true);
    setApiError(null);
    setSuccessMessage(null);
    try {
      await api.post(`/admin/exams/${examId}/publish`);
      setSuccessMessage('Exam published successfully!');
      toast.success('Exam published successfully!');
      // Refresh exam data to get updated status
      await fetchExamData();
      // Redirect to exams list after a short delay to show success message
      setTimeout(() => {
        router.push('/admin/exams');
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      console.error(err);
      const errorMessage = error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to publish exam. Please try again.';
      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoadingExam) {
    return (
      <div className="max-w-5xl mx-auto text-primary">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          <span className="ml-3 text-primary/70">Loading exam data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto text-primary">
      <Link
        href="/admin/exams"
        className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Exam List
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold font-alan-sans mb-2">Edit Exam</h1>
            <p className="text-primary/70">Manage exam settings, questions, sections, and assignments.</p>
            {examData && (
              <div className="mt-3 flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  examData.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                  examData.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {examData.status}
                </span>
                {examData.status === 'DRAFT' && (
                  <Button
                    onClick={handlePublishExam}
                    disabled={isPublishing}
                    className="bg-green-600 hover:bg-green-700 text-white border-0"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Publish Exam
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 rounded-md bg-green-50 border border-green-200 text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {apiError && (
        <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            <div>
              <strong className="font-semibold">Error:</strong>
              <p className="mt-1">{apiError}</p>
            </div>
          </div>
        </div>
      )}

      <ExamTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'settings' && examData && (
        <ExamForm
          defaultValues={{
            title: examData.title,
            description: examData.description || '',
            startAt: toDateTimeLocal(examData.startAt),
            endAt: toDateTimeLocal(examData.endAt),
            durationMins: examData.durationMins,
            timingMode: examData.timingMode,
            sectionLockPolicy: examData.sectionLockPolicy,
            randomizeQuestions: examData.randomizeQuestions,
            negativeMarkPerWrong: examData.negativeMarkPerWrong?.toString(),
            allowedLanguages: Array.isArray(examData.allowedLanguages) ? examData.allowedLanguages : [],
          }}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          apiError={apiError}
          submitLabel="Save Changes"
          showRandomize={true}
          showNegativeMarking={true}
        />
      )}

      {activeTab === 'questions' && (
        <QuestionManager examId={examId} />
      )}

      {activeTab === 'assignments' && examData && (
        <AssignmentManager examId={examId} examStatus={examData.status} />
      )}
    </div>
  );
}
