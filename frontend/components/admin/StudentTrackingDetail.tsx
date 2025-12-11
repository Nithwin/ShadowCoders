'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Eye, X, Clock, CheckCircle2, AlertCircle, FileText, Code, MessageSquare, Mic, Headphones, BookOpen, Edit } from 'lucide-react';

interface Question {
  id: string;
  type: string;
  prompt: string;
  order: number;
  points: number;
}

interface Response {
  questionId: string;
  answer: any;
  question?: Question;
}

interface Attempt {
  id: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  responses: Response[];
  student: {
    id: string;
    name: string;
    email: string;
    reg_no: string | null;
  };
  exam: {
    id: string;
    title: string;
  };
}

interface StudentTrackingDetailProps {
  attemptId: string;
  examId: string;
  onClose: () => void;
}

export default function StudentTrackingDetail({ attemptId, examId, onClose }: StudentTrackingDetailProps) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!attemptId) return;
    
    fetchAttemptDetails();
    // Refresh every 5 seconds to get latest answers (only if attempt exists)
    const interval = setInterval(() => {
      if (attemptId && !error) {
        fetchAttemptDetails();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [attemptId, error]);

  const fetchAttemptDetails = async () => {
    if (!attemptId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch attempt details
      const attemptRes = await api.get<Attempt>(`/admin/attempts/${attemptId}`);
      setAttempt(attemptRes.data);

      // Fetch all exam questions
      try {
        const questionsRes = await api.get<Question[]>(`/admin/exams/${examId}/questions`);
        setQuestions(questionsRes.data || []);
      } catch (questionsErr) {
        console.warn('Could not fetch exam questions:', questionsErr);
        // Fallback: Extract questions from responses if available
        if (attemptRes.data.responses && attemptRes.data.responses.length > 0) {
          const questionsFromResponses = attemptRes.data.responses
            .filter(r => r.question)
            .map(r => r.question!)
            .filter((q, index, self) => self.findIndex(q2 => q2.id === q.id) === index); // Remove duplicates
          setQuestions(questionsFromResponses);
        }
      }
    } catch (err: any) {
      // Handle 404 errors gracefully
      if (err.response?.status === 404) {
        setError('Attempt not found. The student may have deleted their attempt or it was removed.');
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching attempt details:', err);
        }
        setError(err.response?.data?.error?.message || 'Failed to load student tracking details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'MCQ':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'CODING':
        return <Code className="w-4 h-4" />;
      case 'ESSAY':
        return <FileText className="w-4 h-4" />;
      case 'SPEAKING':
        return <Mic className="w-4 h-4" />;
      case 'LISTENING':
        return <Headphones className="w-4 h-4" />;
      case 'READING':
        return <BookOpen className="w-4 h-4" />;
      case 'FILL':
        return <Edit className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatAnswer = (answer: any, type: string): string => {
    if (!answer) return 'No answer';
    
    if (type === 'MCQ') {
      if (Array.isArray(answer)) {
        return answer.join(', ');
      }
      return String(answer);
    }
    
    if (type === 'CODING') {
      if (typeof answer === 'object' && answer.code) {
        return answer.code.substring(0, 200) + (answer.code.length > 200 ? '...' : '');
      }
      return String(answer);
    }
    
    if (type === 'ESSAY' || type === 'FILL') {
      if (typeof answer === 'object' && answer.text) {
        return answer.text.substring(0, 200) + (answer.text.length > 200 ? '...' : '');
      }
      if (typeof answer === 'string') {
        return answer.substring(0, 200) + (answer.length > 200 ? '...' : '');
      }
      return String(answer);
    }
    
    if (type === 'SPEAKING') {
      if (typeof answer === 'object' && answer.audioAssetId) {
        return `Audio recording (ID: ${answer.audioAssetId})`;
      }
      return 'Audio recording';
    }
    
    return JSON.stringify(answer).substring(0, 200);
  };

  const getAnswerStatus = (questionId: string): 'answered' | 'not-answered' => {
    const response = attempt?.responses?.find(r => r.questionId === questionId);
    return response && response.answer ? 'answered' : 'not-answered';
  };

  const getTimeSpent = (): string => {
    if (!attempt?.startedAt) return '0m 0s';
    const start = new Date(attempt.startedAt);
    const end = attempt.submittedAt ? new Date(attempt.submittedAt) : new Date();
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading && !attempt) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="animate-pulse text-center">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Details</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const answeredCount = attempt?.responses?.filter(r => r.answer).length || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Student Tracking Details</h2>
            {attempt && (
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Student:</span> {attempt.student.name} ({attempt.student.email})
                </div>
                {attempt.student.reg_no && (
                  <div>
                    <span className="font-medium">Reg No:</span> {attempt.student.reg_no}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Time Spent: {getTimeSpent()}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  attempt.status === 'SUBMITTED' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {attempt.status}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Summary */}
        {attempt && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{answeredCount}</div>
                <div className="text-sm text-gray-600">Answered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{questions.length - answeredCount}</div>
                <div className="text-sm text-gray-600">Not Answered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{questions.length}</div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No questions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedQuestions.map((question, index) => {
                const response = attempt?.responses?.find(r => r.questionId === question.id);
                const isAnswered = response && response.answer;
                
                return (
                  <div
                    key={question.id}
                    className={`border rounded-lg p-4 ${
                      isAnswered ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${
                          isAnswered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getQuestionTypeIcon(question.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              Question {index + 1} ({question.type})
                            </span>
                            {isAnswered ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {question.points} point{question.points !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {question.prompt.substring(0, 300)}
                        {question.prompt.length > 300 && '...'}
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded ${
                      isAnswered ? 'bg-white border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="text-sm font-medium text-gray-700 mb-1">Answer:</div>
                      <div className="text-gray-900 font-mono text-sm">
                        {isAnswered ? formatAnswer(response.answer, question.type) : 'Not answered yet'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

