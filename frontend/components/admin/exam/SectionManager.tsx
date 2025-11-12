'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Edit, Trash2, Loader2, X, Plus } from 'lucide-react';
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

export default function SectionManager({ examId, questions }: SectionManagerProps) {
  const { confirm } = useConfirmationDialog();
  const toast = useToastNotification();
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);


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
    const available = questions.filter((q) => !sectionQuestionIds.has(q.id));
    setAvailableQuestions(available);
  }, [sections, questions]);

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
            Default sections are automatically created. Assign questions to each section below.
          </p>
        </div>
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

      {!isLoading && !error && (
        <div className="space-y-4">
          {sections.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
              <p className="text-primary/60 text-lg mb-2">Loading sections...</p>
              <p className="text-primary/50 text-sm">
                Default sections will be created automatically
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="border border-primary/20 rounded-lg p-4 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-primary">
                        {section.title}
                      </h3>
                    </div>
                    {section.description && (
                      <p className="text-sm text-primary/70 mb-3">{section.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                      </span>
                      {section.durationMins && (
                        <span className="text-xs text-primary/60">
                          {section.durationMins} mins
                        </span>
                      )}
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
                    <Button
                      onClick={() => setSelectedSection(section)}
                      className="w-full bg-white border border-primary/20 text-primary hover:bg-primary/10"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Manage Questions
                    </Button>
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
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
          onSuccess={() => {
            fetchSections();
            setEditingSection(null);
          }}
        />
      )}

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
  open,
  onOpenChange,
  onSuccess,
  defaultOrder,
}: {
  examId: string;
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
      description: '',
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
            Description (Optional)
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
            placeholder="Section description or instructions"
          />
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
          />
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
  open,
  onOpenChange,
  onSuccess,
}: {
  section: Section;
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
      description: section.description || '',
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
            Description (Optional)
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Duration (minutes, Optional)
          </label>
          <Input type="number" min="1" {...register('durationMins')} />
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
  const [questionOrders, setQuestionOrders] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize with existing questions in section
    const existingIds = section.questions.map((q) => q.questionId);
    const existingOrders: Record<string, number> = {};
    section.questions.forEach((q) => {
      existingOrders[q.questionId] = q.order;
    });
    setSelectedQuestionIds(existingIds);
    setQuestionOrders(existingOrders);
  }, [section]);

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(questionId)) {
        const newOrders = { ...questionOrders };
        delete newOrders[questionId];
        setQuestionOrders(newOrders);
        return prev.filter((id) => id !== questionId);
      } else {
        setQuestionOrders((prev) => ({
          ...prev,
          [questionId]: Object.keys(prev).length + 1,
        }));
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
        order: questionOrders[questionId] || index + 1,
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

  const allQuestions = availableQuestions.concat(
    section.questions.map((sq) => sq.question)
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Manage Questions - ${section.title}`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-primary/70 mb-3">
            Select questions to include in this section. Questions already in this section are checked.
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2 border border-primary/20 rounded-md p-3">
            {allQuestions.length === 0 ? (
              <p className="text-sm text-primary/60 text-center py-4">
                No questions available. Add questions first in the Questions tab.
              </p>
            ) : (
              allQuestions.map((question) => {
                const isSelected = selectedQuestionIds.includes(question.id);
                const isInSection = section.questions.some((sq) => sq.questionId === question.id);
                return (
                  <div
                    key={question.id}
                    className="flex items-center gap-3 p-2 bg-primary/5 rounded border border-primary/10"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleQuestion(question.id)}
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
                        <span className="text-xs text-primary/60">
                          {question.points} pts
                        </span>
                        {isInSection && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            In Section
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Input
                        type="number"
                        min="1"
                        value={questionOrders[question.id] || ''}
                        onChange={(e) =>
                          setQuestionOrders((prev) => ({
                            ...prev,
                            [question.id]: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="w-20"
                        placeholder="Order"
                      />
                    )}
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

