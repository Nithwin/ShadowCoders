'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { QType } from '@/types';
import { Edit, Trash2, Loader2, Wand2, Plus, Eye } from 'lucide-react';
import GenerateAiQuestionsModal from './GenerateAiQuestionsModal';
import ManualQuestionForm from './question/ManualQuestionForm';
import EditQuestionModal from './question/EditQuestionModal';
import ViewQuestionModal from './question/ViewQuestionModal';
import { Button } from '@/components/ui/Button';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';

// Define the shape of the question (it will have a real DB id)
type Question = {
  id: string; // This is the REAL database ID (a CUID)
  order: number;
  type: QType;
  prompt: string | null;
  points: number;
  options?: Array<{ id: string; text: string }>;
  correctOptionIds?: string[];
  testcases?: Array<{ input: string; expectedOutput: string; isHidden: boolean; timeoutMs: number }>;
  starterCode?: string | null;
  wordLimit?: number | null;
  config?: any;
};

interface QuestionManagerProps {
  examId: string;
}

export default function QuestionManager({ examId }: QuestionManagerProps) {
  const { confirm } = useConfirmationDialog();
  const toast = useToastNotification();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State to control the modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
  // State for when we are saving new questions
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetches all questions from the DB
  const fetchQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/exams/${examId}/questions`);
      // Normalize testcases to ensure required fields are present
      const normalizedQuestions: Question[] = res.data.map((q: Question & { testcases?: Array<{ input: string; expectedOutput: string; isHidden?: boolean; timeoutMs?: number }> }) => {
        if (q.type === QType.CODING && q.testcases) {
          return {
            ...q,
            testcases: q.testcases.map(tc => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden ?? false,
              timeoutMs: tc.timeoutMs ?? 2000,
            })),
          };
        }
        return q;
      });
      setQuestions(normalizedQuestions);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch questions.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch questions on initial load
  useEffect(() => {
    if (examId) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // 2. Handle Deleting an existing question
  const handleDelete = async (questionId: string) => {
    const confirmed = await confirm({
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      // Use the real DB ID to delete
      await api.delete(`/admin/questions/${questionId}`);
      toast.success('Question deleted successfully!');
      // Refresh the list from the DB
      fetchQuestions();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      toast.error(error.response?.data?.error?.message || 'Failed to delete question.');
    }
  };

  // Handle successful manual question creation
  const handleManualQuestionSuccess = () => {
    fetchQuestions();
    setIsManualModalOpen(false);
  };

  // Handle successful question edit
  const handleQuestionEditSuccess = () => {
    fetchQuestions();
    setEditingQuestion(null);
  };

  // 3. Handle receiving new AI questions
  const handleQuestionsGenerated = async (newQuestions: Array<Record<string, unknown>>): Promise<void> => {
    if (!newQuestions || newQuestions.length === 0) {
      setError('No questions were generated. Please try again.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      // Format questions with proper order numbers
      const formattedQuestions = newQuestions.map((q, index) => {
        const baseQuestion = {
          type: q.type,
          prompt: q.prompt,
          points: Number(q.points || 10),
          order: questions.length + index + 1,
        };

        // Add type-specific fields
        // Normalize type to enum value (backend expects QType enum)
        const questionType = q.type === 'MCQ' || q.type === QType.MCQ ? QType.MCQ :
                            q.type === 'CODING' || q.type === QType.CODING ? QType.CODING :
                            q.type === 'ESSAY' || q.type === QType.ESSAY ? QType.ESSAY :
                            q.type;
        
        if (questionType === QType.MCQ) {
          return {
            ...baseQuestion,
            type: QType.MCQ,
            options: q.options || [],
            correctOptionIds: q.correctOptionIds || [],
          };
        } else if (questionType === QType.CODING) {
          // Ensure testcases are properly formatted
          let testcases = q.testcases || [];
          
          // Validate and format testcases - CRITICAL: Ensure all testcases are included
          if (Array.isArray(testcases) && testcases.length > 0) {
            const formattedTestcases = testcases.map((tc: Record<string, unknown>) => {
              // Ensure all required fields are present
              const testcase = {
                input: String(tc.input || ''),
                expectedOutput: String(tc.expectedOutput || ''),
                isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : false,
                timeoutMs: tc.timeoutMs ? Number(tc.timeoutMs) : 2000,
              };
              
              // Validate that input and expectedOutput are not empty
              if (!testcase.input || !testcase.expectedOutput) {
                console.warn('Test case has empty input or output:', testcase);
              }
              
              return testcase;
            });
            
            testcases = formattedTestcases;

          } else {
            // If no testcases, this is a problem - log error
            console.error('⚠️ CRITICAL: Coding question has no testcases!', {
              question: q,
              testcases: q.testcases,
              testcasesType: typeof q.testcases,
              testcasesIsArray: Array.isArray(q.testcases),
            });
            // Don't fail - let backend validation catch it, but log the issue
          }
          
          return {
            ...baseQuestion,
            type: QType.CODING,
            starterCode: q.starterCode || null,
            testcases: Array.isArray(testcases) && testcases.length > 0 ? testcases : [],
          };
        } else if (questionType === QType.ESSAY) {
          return {
            ...baseQuestion,
            type: QType.ESSAY,
            wordLimit: q.wordLimit ? Number(q.wordLimit) : undefined,
          };
        } else if (questionType === QType.SQL) {
          // Ensure testcases are properly formatted
          let testcases = q.testcases || [];
          
          if (Array.isArray(testcases) && testcases.length > 0) {
            testcases = testcases.map((tc: Record<string, unknown>) => ({
              input: String(tc.input || ''),
              expectedOutput: String(tc.expectedOutput || ''),
              isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : false,
              timeoutMs: tc.timeoutMs ? Number(tc.timeoutMs) : 5000,
            }));
          }

          return {
            ...baseQuestion,
            type: QType.SQL,
            config: q.config || { ddl: '' },
            testcases: Array.isArray(testcases) ? testcases : [],
          };
        } else if (questionType === QType.FILL) {
          return {
            ...baseQuestion,
            type: QType.FILL,
            clozeTemplate: String(q.clozeTemplate || ''),
            blanks: Array.isArray(q.blanks) ? q.blanks : [],
            clozeConfig: typeof q.clozeConfig === 'object' ? q.clozeConfig : {},
          };
        }

        return baseQuestion;
      });

      // Log formatted questions for debugging (especially testcases)

      
      // Validate that coding questions have testcases
      const codingQuestions = formattedQuestions.filter((q): q is typeof q & { type: QType.CODING; testcases: unknown[] } => 
        (q.type === 'CODING' || q.type === QType.CODING) && 'testcases' in q
      );
      codingQuestions.forEach((q, idx) => {
        if (!q.testcases || !Array.isArray(q.testcases) || q.testcases.length === 0) {
          console.error(`Coding question ${idx} has no testcases:`, q);
        } else {

        }
      });
      
      // Call the API to SAVE the new questions
      // The backend now returns the created question objects with IDs
      const saveResponse = await api.post(`/admin/exams/${examId}/questions`, {
        questions: formattedQuestions,
      });
      
      const createdQuestions = saveResponse.data;
      
      // AUTO-ORGANIZE: If SQL questions were created, assign them to a "SQL Questions" section
      const createdSqlQuestions = Array.isArray(createdQuestions) 
        ? createdQuestions.filter((q: any) => q.type === QType.SQL)
        : [];
        
      if (createdSqlQuestions.length > 0) {
        try {

          // 1. Fetch sections to see if "SQL Questions" exists
          const sectionsRes = await api.get(`/admin/exams/${examId}/sections`);
          const sections = sectionsRes.data;
          
          let sqlSection = sections.find((s: any) => 
            s.title.toLowerCase().includes('sql') || s.title.toLowerCase().includes('database')
          );
          
          // 2. If not, create it
          if (!sqlSection) {

            const newSectionRes = await api.post(`/admin/exams/${examId}/sections`, {
              title: 'SQL Questions',
              order: sections.length + 1,
              description: 'Database querying questions',
            });
            // The API might return the created section or just a success message. 
            // Assuming simplified REST pattern or fetching again.
            // If the POST returns the created object:
            if (newSectionRes.data && newSectionRes.data.id) {
               sqlSection = newSectionRes.data;
            } else {
               // Fallback: fetch again (safer)
               const updatedSectionsRes = await api.get(`/admin/exams/${examId}/sections`);
               sqlSection = updatedSectionsRes.data.find((s: any) => s.title === 'SQL Questions');
            }
          }
          
          // 3. Add questions to the section
          if (sqlSection) {

            const questionsToAdd = createdSqlQuestions.map((q: any, idx: number) => ({
              questionId: q.id,
              order: idx + 1
            }));
            
            await api.post(`/admin/sections/${sqlSection.id}/questions`, {
              questions: questionsToAdd
            });
            toast.success(`Automatically moved ${createdSqlQuestions.length} SQL questions to "${sqlSection.title}" section.`);
          }
        } catch (sectionErr) {
          console.error('Failed to auto-assign SQL questions to section:', sectionErr);
          // Don't block the main success flow, just warn
          toast.error('Questions saved, but failed to auto-move to SQL section.');
        }
      }



      // Refresh the list from the DB (this gets the new real IDs)
      await fetchQuestions();
      
      // Close modal on success
      setIsAiModalOpen(false);
      
      // Clear any previous errors
      setError(null);
    } catch (err: unknown) {
      const error = err as { 
        response?: { 
          data?: { 
            error?: { message?: string };
            message?: string;
          };
        };
      };
      console.error('Error saving questions:', err);
      const errorMessage = 
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        (error as { message?: string }).message ||
        'Failed to save questions. Please try again.';
      setError(errorMessage);
      // Re-throw error so modal knows to stay open
      throw new Error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // State for selection and filtering
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('ALL');
  const [bulkPoints, setBulkPoints] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Filter questions based on selected type
  const filteredQuestions = questions.filter(q => {
    if (filterType === 'ALL') return true;
    return q.type === filterType;
  });

  // Handle Select All
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredQuestions.map(q => q.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle single selection
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle Bulk Delete
  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Selected Questions',
      message: `Are you sure you want to delete ${selectedIds.size} questions? This action cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsSaving(true);
    try {
      // Execute deletes in parallel
      await Promise.all(
        Array.from(selectedIds).map(id => api.delete(`/admin/questions/${id}`))
      );
      toast.success(`Successfully deleted ${selectedIds.size} questions.`);
      setSelectedIds(new Set());
      await fetchQuestions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete some questions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Bulk Points Update
  const handleBulkUpdatePoints = async () => {
    const points = Number(bulkPoints);
    if (isNaN(points) || points <= 0) {
      toast.error('Please enter a valid positive number for points.');
      return;
    }

    setIsBulkUpdating(true);
    try {
      // Execute updates in parallel
      await Promise.all(
        Array.from(selectedIds).map(id => api.put(`/admin/questions/${id}`, { points }))
      );
      toast.success(`Updated points for ${selectedIds.size} questions.`);
      setBulkPoints('');
      setSelectedIds(new Set()); // Optional: Deselect after update
      await fetchQuestions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update points. Please try again.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <>
      {/* Render the Modals */}
      <GenerateAiQuestionsModal
        open={isAiModalOpen}
        onOpenChange={setIsAiModalOpen}
        onQuestionsGenerated={handleQuestionsGenerated}
      />
      <ManualQuestionForm
        examId={examId}
        open={isManualModalOpen}
        onOpenChange={setIsManualModalOpen}
        onSuccess={handleManualQuestionSuccess}
        defaultOrder={questions.length + 1}
      />
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          open={!!editingQuestion}
          onOpenChange={(open) => !open && setEditingQuestion(null)}
          onSuccess={handleQuestionEditSuccess}
        />
      )}
      {viewingQuestion && (
        <ViewQuestionModal
          question={viewingQuestion}
          open={!!viewingQuestion}
          onOpenChange={(open) => !open && setViewingQuestion(null)}
        />
      )}

      <div className="p-6 bg-secondary border border-primary/10 rounded-lg shadow-md">
        {/* Header and Actions */}
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold font-alan-sans text-primary">Manage Questions</h2>
              
              {/* Exam Statistics Summary */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-primary/80 bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">Total:</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-primary/20 font-mono text-xs">
                    {questions.length} Qs
                  </span>
                </div>
                <div className="w-px h-4 bg-primary/20" />
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">Points:</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-primary/20 font-mono text-xs text-green-700 font-bold">
                    {questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)} pts
                  </span>
                </div>
                <div className="w-px h-4 bg-primary/20" />
                <div className="flex items-center gap-3 text-xs">
                  {/* MCQ Count */}
                  <div className="flex items-center gap-1.5" title="Multiple Choice Questions">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>MCQ: <b>{questions.filter(q => q.type === QType.MCQ).length}</b></span>
                  </div>
                  {/* Coding Count */}
                  <div className="flex items-center gap-1.5" title="Coding Questions">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span>Code: <b>{questions.filter(q => q.type === QType.CODING).length}</b></span>
                  </div>
                  {/* Essay Count */}
                  <div className="flex items-center gap-1.5" title="Essay Questions">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span>Essay: <b>{questions.filter(q => q.type === QType.ESSAY).length}</b></span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setIsAiModalOpen(true)}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
              <Button
                onClick={() => setIsManualModalOpen(true)}
                disabled={isSaving}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

          {/* Toolbar: Filter and Bulk Actions */}
          <div className={`flex flex-wrap items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
            selectedIds.size > 0 
              ? 'bg-accent/5 border-accent/20 shadow-sm' 
              : 'bg-primary/5 border-primary/10'
          }`}>
            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary/70">Filter:</span>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setSelectedIds(new Set()); // Clear selection on filter change
                }}
                className="h-9 rounded-md border border-primary/20 bg-secondary text-sm px-3 focus:outline-none focus:ring-2 focus:ring-accent/50 text-primary"
              >
                <option value="ALL">All Types</option>
                <option value={QType.MCQ}>Multiple Choice</option>
                <option value={QType.CODING}>Coding</option>
                <option value={QType.ESSAY}>Essay</option>
                <option value={QType.LISTENING}>Listening</option>
                <option value={QType.SPEAKING}>Speaking</option>
              </select>
            </div>

            {/* Bulk Actions (Visible when selected) */}
            {selectedIds.size > 0 && (
              <>
                <div className="h-8 w-px bg-primary/20 mx-2" />
                
                {/* Bulk Point Update */}
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-sm font-medium text-primary/70 hidden sm:inline">Bulk Points:</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Pts"
                    value={bulkPoints}
                    onChange={(e) => setBulkPoints(e.target.value)}
                    className="h-9 w-24 rounded-md border border-primary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-white"
                  />
                  <Button
                    size="sm"
                    onClick={handleBulkUpdatePoints}
                    disabled={isBulkUpdating || !bulkPoints}
                    className="h-9 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                  >
                    {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Points'}
                  </Button>
                </div>

                <div className="flex-1" />

                {/* Bulk Delete */}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isSaving}
                  className="h-9 bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm animate-in fade-in slide-in-from-right-2 duration-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedIds.size})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Question List */}
        <div className="border-t border-primary/10">
          {isSaving && (
            <div className="flex justify-center items-center p-8 text-primary/70">
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              <span>Processing...</span>
            </div>
          )}
          {isLoading && !isSaving && (
            <div className="flex justify-center items-center p-8 text-primary/70">
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              <span>Loading questions...</span>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 m-4">
              <p className="font-medium">Error:</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && !isSaving && (
            <>
              {/* List Header */}
              {filteredQuestions.length > 0 && (
                <div className="grid grid-cols-[auto_auto_1fr_auto] gap-4 p-3 border-b border-primary/10 bg-primary/5 text-xs font-semibold text-primary/70 uppercase tracking-wider">
                  <div className="flex items-center pl-2">
                    <input
                      type="checkbox"
                      checked={filteredQuestions.length > 0 && selectedIds.size === filteredQuestions.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-primary/30 text-accent focus:ring-accent/50"
                    />
                  </div>
                  <div className="w-8 text-center">#</div>
                  <div>Question</div>
                  <div className="text-right pr-12">Points</div>
                </div>
              )}

              <div className="divide-y divide-primary/10">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg m-4">
                    <p className="text-primary/60 text-lg mb-2">No questions found</p>
                    <p className="text-primary/50 text-sm">
                      {filterType !== 'ALL' ? 'Try changing the filter or add new questions' : 'Get started by adding questions manually or generating them with AI'}
                    </p>
                  </div>
                ) : (
                  filteredQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className={`grid grid-cols-[auto_auto_1fr_auto] gap-4 p-4 hover:bg-primary/5 transition-colors items-center ${
                        selectedIds.has(q.id) ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="pl-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => handleToggleSelect(q.id)}
                          className="h-4 w-4 rounded border-primary/30 text-accent focus:ring-accent/50"
                        />
                      </div>

                      {/* Number */}
                      <div className="w-8 text-center text-sm font-medium text-primary/60">
                        {index + 1}
                      </div>

                      {/* Question Details */}
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                            q.type === QType.MCQ ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            q.type === QType.CODING ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            q.type === QType.ESSAY ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {q.type}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-primary line-clamp-2" title={q.prompt || ''}>
                          {q.prompt || 'Untitled Question'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-primary w-16 text-right">
                          {q.points} pts
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingQuestion(q)}
                            title="View Question"
                            className="p-2 hover:bg-primary/10 rounded-md hover:text-blue-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingQuestion(q)}
                            title="Edit Question"
                            className="p-2 hover:bg-primary/10 rounded-md hover:text-green-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            title="Delete Question"
                            className="p-2 hover:bg-primary/10 rounded-md hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}