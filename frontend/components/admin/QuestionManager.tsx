'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { QType } from '@/types';
import { Edit, Trash2, Loader2, Wand2, Plus } from 'lucide-react';
import GenerateAiQuestionsModal from './GenerateAiQuestionsModal';
import ManualQuestionForm from './question/ManualQuestionForm';
import EditQuestionModal from './question/EditQuestionModal';
import { Button } from '@/components/ui/Button';

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
};

interface QuestionManagerProps {
  examId: string;
}

export default function QuestionManager({ examId }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State to control the modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
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
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }
    try {
      // Use the real DB ID to delete
      await api.delete(`/admin/questions/${questionId}`);
      // Refresh the list from the DB
      fetchQuestions();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      alert(error.response?.data?.error?.message || 'Failed to delete question.');
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
            console.log(`Formatted ${formattedTestcases.length} testcases for coding question:`, formattedTestcases);
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
        }

        return baseQuestion;
      });

      // Log formatted questions for debugging (especially testcases)
      console.log('Formatted questions to save:', JSON.stringify(formattedQuestions, null, 2));
      
      // Validate that coding questions have testcases
      const codingQuestions = formattedQuestions.filter((q): q is typeof q & { type: QType.CODING; testcases: unknown[] } => 
        (q.type === 'CODING' || q.type === QType.CODING) && 'testcases' in q
      );
      codingQuestions.forEach((q, idx) => {
        if (!q.testcases || !Array.isArray(q.testcases) || q.testcases.length === 0) {
          console.error(`Coding question ${idx} has no testcases:`, q);
        } else {
          console.log(`Coding question ${idx} has ${q.testcases.length} testcases:`, q.testcases);
        }
      });
      
      // Call the API to SAVE the new questions
      const saveResponse = await api.post(`/admin/exams/${examId}/questions`, {
        questions: formattedQuestions,
      });
      
      console.log('Save response:', saveResponse.data);

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

      <div className="p-6 bg-secondary border border-primary/10 rounded-lg shadow-md">
        {/* Header and "Add" buttons */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold font-alan-sans text-primary">Manage Questions</h2>
            <p className="text-sm text-primary/70 mt-1">
              Add questions manually or generate them using AI
            </p>
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
              Add Manually
            </Button>
          </div>
        </div>

        {/* Question List */}
        <div className="border-t border-primary/10 pt-4">
          {isSaving && (
            <div className="flex justify-center items-center p-8 text-primary/70">
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              <span>Saving questions...</span>
            </div>
          )}
          {isLoading && !isSaving && (
            <div className="flex justify-center items-center p-8 text-primary/70">
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              <span>Loading questions...</span>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 mb-4">
              <p className="font-medium">Error:</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && !isSaving && (
            <div className="space-y-3">
              {questions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
                  <p className="text-primary/60 text-lg mb-2">No questions yet</p>
                  <p className="text-primary/50 text-sm">
                    Get started by adding questions manually or generating them with AI
                  </p>
                </div>
              ) : (
                questions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold bg-primary/20 text-primary py-1 px-2 rounded-full">
                          {q.type}
                        </span>
                        <span className="text-xs font-medium text-primary/60">
                          {q.points} points
                        </span>
                      </div>
                      <p className="font-medium text-primary line-clamp-2">
                        {q.prompt || 'Untitled Question'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-primary/70 shrink-0 ml-4">
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
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}