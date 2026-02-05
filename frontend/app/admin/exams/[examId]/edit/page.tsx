"use client";

import { api } from '@/lib/api';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Exam } from '@/types';
import { ArrowLeft, Loader2, CheckCircle2, Info, AlertTriangle, ClipboardCopy, RefreshCw, Wand2 } from 'lucide-react';
import Link from 'next/link';
import QuestionManager from '@/components/admin/QuestionManager';
import ExamForm, { toDateTimeLocal, type ExamForm as ExamFormType } from '@/components/admin/exam/ExamForm';
import ExamTabs from '@/components/admin/exam/ExamTabs';
import AssignmentManager from '@/components/admin/exam/AssignmentManager';
import { Button } from '@/components/ui/Button';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';

import Modal from '@/components/ui/Modal';

export default function EditExamPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isTemplatePublic, setIsTemplatePublic] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'questions' || tab === 'assignments' || tab === 'settings') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchExamData = async (showLoading = true) => {
    if (showLoading) setIsLoadingExam(true);
    setApiError(null);
    try {
      const response = await api.get(`/admin/exams/${examId}`);
      const exam = response.data as Exam;
      setExamData(exam);
      // Pre-fill template data
      setTemplateTitle(exam.title);
      setTemplateDescription(exam.description || '');
      
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setApiError(error.response?.data?.error?.message || 'Failed to load exam data. Please refresh the page.');
    } finally {
      if (showLoading) setIsLoadingExam(false);
    }
  };

  useEffect(() => {
    if (!examId) return;
    fetchExamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);


  const handleFormSubmit = async (data: ExamFormType) => {
    // If exam is published, show confirmation dialog
    if (examData?.status === 'PUBLISHED') {
      const confirmed = await confirm({
        title: 'Edit Published Exam',
        message: 'This exam is currently published and may have active student attempts. Changes to exam settings may affect students who are currently taking or have already taken this exam. Are you sure you want to proceed?',
        confirmText: 'Yes, Save Changes',
        cancelText: 'Cancel',
        variant: 'warning',
      });
      
      if (!confirmed) {
        // User cancelled - throw a special error that ExamForm will handle gracefully
        // We use a specific error message that won't be displayed to the user
        const cancelError = new Error('CANCELLED');
        (cancelError as any).isCancellation = true;
        throw cancelError;
      }
    }

    setIsSubmitting(true);
    setApiError(null);
    setSuccessMessage(null);
    try {
      await api.put(`/admin/exams/${examId}`, data);
      setSuccessMessage('Exam settings updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Refresh exam data
      await fetchExamData(false);
    } catch (err: unknown) {
      // Check if this is a cancellation error
      if (err instanceof Error && (err as any).isCancellation) {
        // Don't show error for cancellation, just re-throw so form knows it was cancelled
        throw err;
      }
      
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

    if (!examData?.assignments || examData.assignments.length === 0) {
      toast.error('You must assign this exam to students before publishing.');
      // Switch to assignments tab to help the user
      setActiveTab('assignments');
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
      await fetchExamData(false);
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

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [manualPrompt, setManualPrompt] = useState('');

  const handleOpenGenerationModal = () => {
    if (!examData) return;
    
    // Check if dynamic mode
    if (examData.mode !== 'DYNAMIC') {
      toast.error('Regeneration is only available for Dynamic exams.');
      return;
    }
    setManualPrompt('');
    setIsGenerationModalOpen(true);
  };

  const handleConfirmGeneration = async () => {
    if (!examData) return;

    setIsRegenerating(true);
    try {
      await api.post(`/admin/exams/${examId}/generate`, {
        prompt: manualPrompt
      });
      toast.success('Generation started! Questions will appear in the pool shortly.');
      setIsGenerationModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to trigger generation');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateTitle.trim()) {
      alert('Template title is required');
      return;
    }

    setIsCreatingTemplate(true);
    try {
      await api.post(`/admin/exams/${examId}/template`, {
        title: templateTitle,
        description: templateDescription,
        isPublic: isTemplatePublic
      });
      setIsTemplateModalOpen(false);
      toast.success('Template created successfully!');
      setSuccessMessage('Template created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create template');
      alert('Failed to create template');
    } finally {
      setIsCreatingTemplate(false);
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
          
            <div className="flex gap-2">
              {examData?.mode === 'DYNAMIC' && (
                <Button
                  onClick={handleOpenGenerationModal}
                  disabled={isRegenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate Questions
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() => setIsTemplateModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              >
                <ClipboardCopy className="w-4 h-4 mr-2" />
                Save as Template
              </Button>
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

      {examData?.status === 'PUBLISHED' && (
        <div className="mb-4 p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Warning: Editing Published Exam</strong>
              <p className="mt-1 text-sm">
                This exam is currently published and may have active student attempts. Changes to exam settings, questions, or other details may affect students who are currently taking or have already taken this exam. Please proceed with caution.
              </p>
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
            maxAttempts: examData.maxAttempts ?? 1,
            maxTabSwitches: examData.maxTabSwitches ?? 1,
            allowedLanguages: Array.isArray(examData.allowedLanguages) ? examData.allowedLanguages : [],
            enableProctoring: examData.enableProctoring ?? false,
            releaseResults: examData.releaseResults ?? true,
            mode: examData.mode ?? 'STANDARD',
            dynamicQuestionCount: examData.dynamicQuestionCount ?? 5,
            dynamicTopics: Array.isArray(examData.dynamicTopics) ? examData.dynamicTopics : [],
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
        <AssignmentManager 
          examId={examId} 
          examStatus={examData.status} 
          onUpdate={() => fetchExamData(false)}
        />
      )}

      {/* Template Creation Modal */}
      <Modal
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        title="Save as Template"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary/70 mb-1">
              Template Title
            </label>
            <input
              type="text"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="e.g. Midterm Exam Template"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary/70 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent/50 transition-colors min-h-[100px]"
              placeholder="Describe what this template contains..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary/70 mb-2">
              Visibility
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={!isTemplatePublic}
                  onChange={() => setIsTemplatePublic(false)}
                  className="w-4 h-4 text-accent focus:ring-accent/50 bg-white/5 border-white/10"
                />
                <span className="text-sm text-primary">Private (Only me)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={isTemplatePublic}
                  onChange={() => setIsTemplatePublic(true)}
                  className="w-4 h-4 text-accent focus:ring-accent/50 bg-white/5 border-white/10"
                />
                <span className="text-sm text-primary">Public (All staff)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsTemplateModalOpen(false)}
              className="!bg-white !text-black border border-gray-200 hover:!bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={isCreatingTemplate || !templateTitle.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isCreatingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Template'
              )}
            </Button>
          </div>
        </div>

      </Modal>

      {/* Manual Generation Prompt Modal */}
      <Modal
        open={isGenerationModalOpen}
        onOpenChange={setIsGenerationModalOpen}
        title="Generate Questions"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-200 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              This will generate <b>{examData?.dynamicQuestionCount || 5} questions</b> for EACH difficulty level (Easy, Medium, Hard), totaling <b>{(examData?.dynamicQuestionCount || 5) * 3} questions</b>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary/70 mb-1">
              Custom Prompt (Optional)
            </label>
            <textarea
              value={manualPrompt}
              onChange={(e) => setManualPrompt(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent/50 transition-colors min-h-[100px] text-primary"
              placeholder="e.g. Generate questions focused on time complexity of sorting algorithms..."
            />
            <p className="text-xs text-primary/60 mt-1">
              Leave empty to generate based solely on the configured topics.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsGenerationModalOpen(false)}
              className="!bg-white !text-black border border-gray-200 hover:!bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmGeneration}
              disabled={isRegenerating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
