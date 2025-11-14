'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, FileText, Code, MessageSquare, Mic, Headphones, BookOpen, Edit, User, Mail, Hash, TrendingUp } from 'lucide-react';
import Link from 'next/link';

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

export default function StudentTrackingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.examId as string;
  const attemptId = params?.attemptId as string;
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isActive, setIsActive] = useState(true);

  const fetchAttemptDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch attempt details
      const attemptRes = await api.get<Attempt>(`/admin/attempts/${attemptId}`);
      
      // Check if attempt is active (IN_PROGRESS)
      if (attemptRes.data.status !== 'IN_PROGRESS') {
        setError('This student is not currently active. Details can only be viewed for active exam attempts.');
        setIsActive(false);
        setIsLoading(false);
        return;
      }
      
      setIsActive(true);
      setAttempt(attemptRes.data);

      // Fetch all exam questions
      try {
        const questionsRes = await api.get<Question[]>(`/admin/exams/${examId}/questions`);
        setQuestions(questionsRes.data || []);
      } catch (questionsErr) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not fetch exam questions:', questionsErr);
        }
        // Fallback: Extract questions from responses if available
        if (attemptRes.data.responses && attemptRes.data.responses.length > 0) {
          const questionsFromResponses = attemptRes.data.responses
            .filter(r => r.question)
            .map(r => r.question!)
            .filter((q, index, self) => self.findIndex(q2 => q2.id === q.id) === index);
          setQuestions(questionsFromResponses);
        }
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching attempt details:', err);
      }
      setError(err.response?.data?.error?.message || 'Failed to load student tracking details');
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, examId]);

  useEffect(() => {
    if (attemptId && examId) {
      fetchAttemptDetails();
      // Refresh every 5 seconds to get latest answers (only if attempt is active)
      const interval = setInterval(() => {
        // Only refresh if attempt is still active
        if (isActive) {
          fetchAttemptDetails();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [attemptId, examId, isActive, fetchAttemptDetails]);

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'MCQ':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'CODING':
        return <Code className="w-5 h-5" />;
      case 'ESSAY':
        return <FileText className="w-5 h-5" />;
      case 'SPEAKING':
        return <Mic className="w-5 h-5" />;
      case 'LISTENING':
        return <Headphones className="w-5 h-5" />;
      case 'READING':
        return <BookOpen className="w-5 h-5" />;
      case 'FILL':
        return <Edit className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'MCQ':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CODING':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ESSAY':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'SPEAKING':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'LISTENING':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'READING':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'FILL':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
        return answer.code.substring(0, 300) + (answer.code.length > 300 ? '...' : '');
      }
      return String(answer);
    }
    
    if (type === 'ESSAY' || type === 'FILL') {
      if (typeof answer === 'object' && answer.text) {
        return answer.text.substring(0, 300) + (answer.text.length > 300 ? '...' : '');
      }
      if (typeof answer === 'string') {
        return answer.substring(0, 300) + (answer.length > 300 ? '...' : '');
      }
      return String(answer);
    }
    
    if (type === 'SPEAKING') {
      if (typeof answer === 'object' && answer.audioAssetId) {
        return `Audio recording (ID: ${answer.audioAssetId})`;
      }
      return 'Audio recording';
    }
    
    return JSON.stringify(answer).substring(0, 300);
  };

  const getTimeSpent = (): string => {
    if (!attempt?.startedAt) return '0m 0s';
    const start = new Date(attempt.startedAt);
    const end = attempt.submittedAt ? new Date(attempt.submittedAt) : new Date();
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    }
    return `${remainingMinutes}m ${remainingSeconds}s`;
  };

  if (isLoading && !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-1">
                  {error.includes('not currently active') ? 'Access Restricted' : 'Error Loading Details'}
                </h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
            <Link
              href={`/admin/exams/${examId}/monitor`}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitoring
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const answeredCount = attempt?.responses?.filter(r => r.answer).length || 0;
  const progressPercentage = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/admin/exams/${examId}/monitor`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Monitoring
            </Link>
            {attempt && (
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                attempt.status === 'SUBMITTED' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {attempt.status}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Info */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">Student Tracking Details</h1>
              {attempt && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Student Name</div>
                      <div className="font-semibold">{attempt.student.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Mail className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-semibold">{attempt.student.email}</div>
                    </div>
                  </div>
                  {attempt.student.reg_no && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Hash className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Registration Number</div>
                        <div className="font-semibold">{attempt.student.reg_no}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progress Stats */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Progress Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="text-3xl font-bold text-green-700">{answeredCount}</div>
                  <div className="text-sm text-green-600 font-medium">Answered</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                  <div className="text-3xl font-bold text-orange-700">{questions.length - answeredCount}</div>
                  <div className="text-sm text-orange-600 font-medium">Not Answered</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-700">{questions.length}</div>
                  <div className="text-sm text-blue-600 font-medium">Total Questions</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="text-3xl font-bold text-purple-700">{progressPercentage}%</div>
                  <div className="text-sm text-purple-600 font-medium">Progress</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-semibold text-gray-900">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Time Info */}
              {attempt && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-500">Time Spent</div>
                    <div className="font-semibold text-gray-900">{getTimeSpent()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Questions & Answers</h2>
            <div className="text-sm text-gray-600">
              Showing {sortedQuestions.length} question{sortedQuestions.length !== 1 ? 's' : ''}
            </div>
          </div>

          {sortedQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No questions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedQuestions.map((question, index) => {
                const response = attempt?.responses?.find(r => r.questionId === question.id);
                const isAnswered = response && response.answer;
                
                return (
                  <div
                    key={question.id}
                    className={`border-2 rounded-xl p-6 transition-all hover:shadow-md ${
                      isAnswered 
                        ? 'border-green-300 bg-gradient-to-br from-green-50 to-white' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg border-2 ${getQuestionTypeColor(question.type)}`}>
                          {getQuestionTypeIcon(question.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-lg font-bold text-gray-900">
                              Question {index + 1}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getQuestionTypeColor(question.type)}`}>
                              {question.type}
                            </span>
                            {isAnswered ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                Answered
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                <AlertCircle className="w-3 h-3" />
                                Not Answered
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {question.points} point{question.points !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {question.prompt}
                      </p>
                    </div>
                    
                    <div className={`p-4 rounded-lg border-2 ${
                      isAnswered 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className={`w-4 h-4 ${isAnswered ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className={`text-sm font-semibold ${isAnswered ? 'text-green-700' : 'text-gray-500'}`}>
                          Student Answer:
                        </span>
                      </div>
                      <div className={`font-mono text-sm whitespace-pre-wrap break-words ${
                        isAnswered ? 'text-gray-900' : 'text-gray-400 italic'
                      }`}>
                        {isAnswered ? formatAnswer(response.answer, question.type) : 'No answer provided yet'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

