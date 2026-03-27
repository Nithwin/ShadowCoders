'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Edit, Trash2, Loader2, X, Plus, Search, GripVertical, ArrowUp, ArrowDown, Clock3, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';

type Section = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  durationMins: number | null;
  questions: Array<{
    questionId: string;
    order: number;
    question: {
      id: string;
      type: string;
      prompt: string | null;
      points: number;
      order: number;
    };
  }>;
};

type Question = {
  id: string;
  type: string;
  prompt: string | null;
  points: number;
  order: number;
};

interface SectionManagerProps {
  examId: string;
  questions: Question[];
  timingMode?: 'OVERALL_ONLY' | 'PER_SECTION_ONLY' | 'BOTH';
  sectionLockPolicy?: 'NONE' | 'LOCK_ON_COMPLETE' | 'LINEAR_NO_BACKTRACK';
}

const createSectionSchema = z.object({
  title: z.string().min(3, 'Section title must be at least 3 characters'),
  order: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (isNaN(num)) throw new Error('Order must be a valid number');
    return num;
  }).pipe(z.number().int().min(1, 'Order must be 1 or greater')),
  description: z.string().optional(),
  durationMins: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? Number(val) : val;
    return isNaN(num) ? undefined : num;
  }).pipe(z.number().int().positive().optional()),
});

type SectionFormData = z.input<typeof createSectionSchema>;

export default function SectionManager({ examId, questions, timingMode = 'OVERALL_ONLY', sectionLockPolicy = 'NONE' }: SectionManagerProps) {
  const { confirm } = useConfirmationDialog();
  const toast = useToastNotification();
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections]
  );

  const missingDurationCount = useMemo(() => {
    if (timingMode !== 'PER_SECTION_ONLY' && timingMode !== 'BOTH') return 0;
    return sortedSections.filter((s) => !s.durationMins || s.durationMins <= 0).length;
  }, [sortedSections, timingMode]);


  const fetchSections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/exams/${examId}/sections`);
      setSections(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to fetch sections.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchSections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  useEffect(() => {
    // Get questions that are not already in any section
    const sectionQuestionIds = new Set(
      sections.flatMap((s) => s.questions.map((q) => q.questionId))
    );
    const uniqueQuestions = questions.filter((q, index, arr) => arr.findIndex((a) => a.id === q.id) === index);
    const available = uniqueQuestions.filter((q) => !sectionQuestionIds.has(q.id));
    setAvailableQuestions(available);
  }, [sections, questions]);

  const persistSectionOrder = async (nextSections: Section[]) => {
    setIsReordering(true);
    try {
      const sorted = [...nextSections].sort((a, b) => a.order - b.order);
      await Promise.all(
        sorted.map((section, idx) =>
          api.put(`/admin/sections/${section.id}`, {
            title: section.title,
            description: section.description || undefined,
            durationMins: section.durationMins || undefined,
            order: idx + 1,
          })
        )
      );
      toast.success('Section order updated');
      fetchSections();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to reorder sections');
      fetchSections();
    } finally {
      setIsReordering(false);
      setDraggingSectionId(null);
    }
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const list = [...sortedSections];
    const currentIndex = list.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const [moved] = list.splice(currentIndex, 1);
    list.splice(targetIndex, 0, moved);

    const reordered = list.map((section, idx) => ({ ...section, order: idx + 1 }));
    setSections(reordered);
    persistSectionOrder(reordered);
  };

  const handleDropReorder = (targetSectionId: string) => {
    if (!draggingSectionId || draggingSectionId === targetSectionId) return;
    const list = [...sortedSections];
    const fromIndex = list.findIndex((s) => s.id === draggingSectionId);
    const toIndex = list.findIndex((s) => s.id === targetSectionId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    const reordered = list.map((section, idx) => ({ ...section, order: idx + 1 }));
    setSections(reordered);
    persistSectionOrder(reordered);
  };

  const handleDelete = async (sectionId: string) => {
    const confirmed = await confirm({
      title: 'Delete Section',
      message: 'Are you sure you want to delete this section? This will remove all question assignments from this section.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await api.delete(`/admin/sections/${sectionId}`);
      toast.success('Section deleted successfully!');
      fetchSections();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      toast.error(error.response?.data?.error?.message || 'Failed to delete section.');
    }
  };

  const handleRemoveQuestion = async (sectionId: string, questionId: string) => {
    try {
      await api.delete(`/admin/sections/${sectionId}/questions/${questionId}`);
      toast.success('Question removed from section successfully!');
      fetchSections();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      toast.error(error.response?.data?.error?.message || 'Failed to remove question from section.');
    }
  };

  return (
    <div className="p-6 bg-secondary border border-primary/10 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold font-alan-sans text-primary">Manage Sections</h2>
          <p className="text-sm text-primary/70 mt-1">
            Build your exam section-wise: create custom sections and assign questions to each section.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
              <Clock3 className="w-3 h-3" />
              Timing: {timingMode === 'OVERALL_ONLY' ? 'Overall Only' : timingMode === 'PER_SECTION_ONLY' ? 'Per Section' : 'Both'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
              <Lock className="w-3 h-3" />
              Lock: {sectionLockPolicy === 'NONE' ? 'Unlocked' : sectionLockPolicy === 'LOCK_ON_COMPLETE' ? 'Lock on Complete' : 'Linear No Backtrack'}
            </span>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Section
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center p-8 text-primary/70">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          <span>Loading sections...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 mb-4">
          <p className="font-medium">Error:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {missingDurationCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 mb-4 text-sm">
          {missingDurationCount} section{missingDurationCount !== 1 ? 's are' : ' is'} missing duration while section timing is enabled.
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {sections.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
              <p className="text-primary/60 text-lg mb-2">No sections created yet</p>
              <p className="text-primary/50 text-sm">
                Start by creating a section like Grammar MCQ, Technical MCQ, Easy Coding, or Advanced Coding.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Section
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sortedSections.map((section) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => setDraggingSectionId(section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropReorder(section.id)}
                className={`border border-primary/20 rounded-lg p-4 bg-primary/5 hover:bg-primary/10 transition-colors ${isReordering ? 'opacity-70' : ''}`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-1 rounded border border-primary/20 bg-white text-primary/70 cursor-grab active:cursor-grabbing"
                          title="Drag to reorder section"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded-full">Order {section.order}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveSection(section.id, 'up')}
                          disabled={isReordering || sortedSections[0]?.id === section.id}
                          className="p-1 rounded border border-primary/20 bg-white text-primary disabled:opacity-40"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(section.id, 'down')}
                          disabled={isReordering || sortedSections[sortedSections.length - 1]?.id === section.id}
                          className="p-1 rounded border border-primary/20 bg-white text-primary disabled:opacity-40"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-primary">
                        {section.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-primary/70 border border-primary/20 bg-white px-2 py-1 rounded-full">
                        {timingMode === 'OVERALL_ONLY'
                          ? 'Section timing disabled'
                          : section.durationMins
                            ? `${section.durationMins} mins`
                            : 'Timing not set'}
                      </span>
                    </div>
                    {section.questions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-primary/10">
                        <p className="text-xs font-medium text-primary/60 mb-2">Questions:</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {section.questions.map((sq) => (
                            <div
                              key={sq.questionId}
                              className="flex items-center justify-between p-2 bg-primary/5 rounded text-sm"
                            >
                              <span className="text-primary/80 truncate flex-1">
                                {sq.order}. {sq.question.prompt || 'Untitled Question'}
                              </span>
                              <button
                                onClick={() => handleRemoveQuestion(section.id, sq.questionId)}
                                className="text-red-600 hover:text-red-700 p-1 ml-2 flex-shrink-0"
                                title="Remove from section"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-primary/10">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => setSelectedSection(section)}
                        className="bg-white border border-primary/20 text-primary hover:bg-primary/10"
                        title="Manage Questions"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setEditingSection(section)}
                        className="bg-white border border-primary/20 text-primary hover:bg-primary/10"
                        title="Edit Section"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(section.id)}
                        className="bg-white border border-red-200 text-red-600 hover:bg-red-50"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && (
        <EditSectionModal
          section={editingSection}
          timingMode={timingMode}
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
          onSuccess={() => {
            fetchSections();
            setEditingSection(null);
          }}
        />
      )}

      <CreateSectionModal
        examId={examId}
        timingMode={timingMode}
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={fetchSections}
        defaultOrder={sections.length + 1}
      />

      {/* Manage Questions in Section Modal */}
      {selectedSection && (
        <ManageSectionQuestionsModal
          section={selectedSection}
          availableQuestions={availableQuestions}
          open={!!selectedSection}
          onOpenChange={(open) => !open && setSelectedSection(null)}
          onSuccess={() => {
            fetchSections();
            setSelectedSection(null);
          }}
        />
      )}
    </div>
  );
}

// Create Section Modal Component
function CreateSectionModal({
  examId,
  timingMode,
  open,
  onOpenChange,
  onSuccess,
  defaultOrder,
}: {
  examId: string;
  timingMode: 'OVERALL_ONLY' | 'PER_SECTION_ONLY' | 'BOTH';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultOrder: number;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SectionFormData>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: {
      title: '',
      order: defaultOrder,
      durationMins: undefined,
    },
  });

  const onSubmit = async (data: SectionFormData) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      // Parse and validate the data through the schema to get the transformed output
      const validatedData = createSectionSchema.parse(data);
      await api.post(`/admin/exams/${examId}/sections`, validatedData);
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      console.error('Error creating section:', err);
      setApiError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to create section. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create Section">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Section Title <span className="text-red-500">*</span>
          </label>
          <Input
            {...register('title')}
            placeholder="e.g., Part 1: Multiple Choice"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Order <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="1"
            {...register('order')}
          />
          {errors.order && (
            <p className="mt-1 text-sm text-red-500">{errors.order.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Duration (minutes, Optional)
          </label>
          <Input
            type="number"
            min="1"
            {...register('durationMins')}
            placeholder="e.g. 30"
            disabled={timingMode === 'OVERALL_ONLY'}
          />
          {timingMode === 'OVERALL_ONLY' && (
            <p className="mt-1 text-xs text-primary/60">Section timing is disabled in Overall Only mode.</p>
          )}
          {errors.durationMins && (
            <p className="mt-1 text-sm text-red-500">{errors.durationMins.message}</p>
          )}
        </div>

        {apiError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            <strong>Error:</strong> {apiError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Section
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Section Modal Component
function EditSectionModal({
  section,
  timingMode,
  open,
  onOpenChange,
  onSuccess,
}: {
  section: Section;
  timingMode: 'OVERALL_ONLY' | 'PER_SECTION_ONLY' | 'BOTH';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SectionFormData>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: {
      title: section.title,
      order: section.order,
      durationMins: section.durationMins || undefined,
    },
  });

  const onSubmit = async (data: SectionFormData) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      // Parse and validate the data through the schema to get the transformed output
      const validatedData = createSectionSchema.parse(data);
      await api.put(`/admin/sections/${section.id}`, validatedData);
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      console.error('Error updating section:', err);
      setApiError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update section. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Edit Section">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Section Title <span className="text-red-500">*</span>
          </label>
          <Input {...register('title')} />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Order <span className="text-red-500">*</span>
          </label>
          <Input type="number" min="1" {...register('order')} />
          {errors.order && (
            <p className="mt-1 text-sm text-red-500">{errors.order.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Duration (minutes, Optional)
          </label>
          <Input type="number" min="1" {...register('durationMins')} disabled={timingMode === 'OVERALL_ONLY'} />
          {timingMode === 'OVERALL_ONLY' && (
            <p className="mt-1 text-xs text-primary/60">Section timing is disabled in Overall Only mode.</p>
          )}
        </div>

        {apiError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            <strong>Error:</strong> {apiError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Manage Section Questions Modal
function ManageSectionQuestionsModal({
  section,
  availableQuestions,
  open,
  onOpenChange,
  onSuccess,
}: {
  section: Section;
  availableQuestions: Question[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  useEffect(() => {
    // Initialize with existing questions in section
    const existingIds = section.questions.map((q) => q.questionId);
    setSelectedQuestionIds(existingIds);
  }, [section]);

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const questions = selectedQuestionIds.map((questionId, index) => ({
        questionId,
        order: index + 1,
      }));

      await api.post(`/admin/sections/${section.id}/questions`, {
        questions,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      console.error('Error updating section questions:', err);
      setApiError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update section questions. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const allQuestions = useMemo(() => {
    const merged = [...availableQuestions, ...section.questions.map((sq) => sq.question)];
    const seen = new Set<string>();
    const unique: Question[] = [];
    for (const q of merged) {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        unique.push(q);
      }
    }
    return unique;
  }, [availableQuestions, section.questions]);

  const questionTypes = useMemo(() => {
    return ['ALL', ...Array.from(new Set(allQuestions.map((q) => q.type)))];
  }, [allQuestions]);

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allQuestions.filter((question) => {
      const inSection = section.questions.some((sq) => sq.questionId === question.id);
      const text = `${question.prompt || ''} ${question.type}`.toLowerCase();

      if (typeFilter !== 'ALL' && question.type !== typeFilter) return false;
      if (assignmentFilter === 'ASSIGNED' && !inSection) return false;
      if (assignmentFilter === 'UNASSIGNED' && inSection) return false;
      if (query && !text.includes(query)) return false;
      return true;
    });
  }, [allQuestions, searchQuery, typeFilter, assignmentFilter, section.questions]);

  const visibleQuestionIds = filteredQuestions.map((q) => q.id);
  const visibleSelectedCount = visibleQuestionIds.filter((id) => selectedQuestionIds.includes(id)).length;

  const selectAllVisible = () => {
    setSelectedQuestionIds((prev) => {
      const set = new Set(prev);
      visibleQuestionIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const clearVisibleSelection = () => {
    setSelectedQuestionIds((prev) => prev.filter((id) => !visibleQuestionIds.includes(id)));
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Manage Questions - ${section.title}`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-primary/70 mb-3">
            Search, filter, and bulk-select questions for this section. The save order follows your current selected list order.
          </p>
          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-primary/50 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  placeholder="Search by prompt or type"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-md border border-primary/20 bg-primary/10 px-3 text-sm text-primary"
              >
                {questionTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as 'ALL' | 'ASSIGNED' | 'UNASSIGNED')}
                className="h-10 rounded-md border border-primary/20 bg-primary/10 px-3 text-sm text-primary"
              >
                <option value="ALL">All</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="UNASSIGNED">Unassigned</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button type="button" onClick={selectAllVisible} className="px-2.5 py-1 rounded border border-primary/20 bg-white text-primary hover:bg-primary/10">
                Select all visible
              </button>
              <button type="button" onClick={clearVisibleSelection} className="px-2.5 py-1 rounded border border-primary/20 bg-white text-primary hover:bg-primary/10">
                Clear visible
              </button>
              <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                Selected {selectedQuestionIds.length} total ({visibleSelectedCount} visible)
              </span>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2 border border-primary/20 rounded-md p-3">
            {filteredQuestions.length === 0 ? (
              <p className="text-sm text-primary/60 text-center py-4">
                No questions matched your filters.
              </p>
            ) : (
              filteredQuestions.map((question) => {
                const isSelected = selectedQuestionIds.includes(question.id);
                const isInSection = section.questions.some((sq) => sq.questionId === question.id);
                return (
                  <div
                    key={question.id}
                    onClick={() => handleToggleQuestion(question.id)}
                    className={`flex items-center gap-3 p-2 bg-primary/5 rounded border cursor-pointer transition-colors ${isSelected ? 'border-primary/40 bg-primary/10' : 'border-primary/10 hover:bg-primary/10'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleQuestion(question.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {question.prompt || 'Untitled Question'}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          {question.type}
                        </span>
                        <span className="text-xs text-primary/60 border border-primary/20 bg-white px-2 py-0.5 rounded">
                          {question.points} pts
                        </span>
                        {isInSection && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            In Section
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {apiError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            <strong>Error:</strong> {apiError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Questions'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

