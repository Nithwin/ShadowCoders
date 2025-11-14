'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Award, 
  Target,
  Users,
  FileText,
  AlertCircle,
  Download,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  ComposedChart
} from 'recharts';
import Link from 'next/link';

type AnalyticsData = {
  statistics: {
    exam: {
      id: string;
      title: string;
      durationMins: number;
      startAt: string;
      endAt: string;
    };
    totalAttempts: number;
    submittedAttempts: number;
    totalQuestions: number;
    averageScore: number;
    averagePercentage: number;
    highestScore: number;
    lowestScore: number;
    averageTimeSpent: number;
    completionRate: number;
  };
  questionMetrics: Array<{
    questionId: string;
    questionOrder: number;
    questionPrompt: string;
    questionType: string;
    totalPoints: number;
    totalAttempts: number;
    averageScore: number;
    averagePercentage: number;
    passRate: number;
    averageTimeSpent: number;
    difficulty: number | null;
    discriminationIndex: number | null;
  }>;
  performanceTrends: Array<{
    attemptNumber: number;
    studentId: string;
    studentName: string;
    studentRegNo: string | null;
    score: number;
    maxScore: number;
    percentage: number;
    submittedAt: string;
  }>;
  timeAnalysis: Array<{
    questionId: string;
    questionOrder: number;
    questionType: string;
    averageTimeSpent: number;
    minTimeSpent: number;
    maxTimeSpent: number;
    medianTimeSpent: number;
    totalResponses: number;
  }>;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ExamAnalyticsPage() {
  useAuth();
  const params = useParams();
  const router = useRouter();
  const examId = params?.examId as string;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (examId) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<AnalyticsData>(`/admin/exams/${examId}/analytics`);
      setAnalytics(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching analytics:', err);
      }
      setError(error.response?.data?.error?.message || 'Failed to fetch analytics data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format time in seconds to readable format
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Question difficulty heat map data
  const difficultyHeatMapData = useMemo(() => {
    if (!analytics?.questionMetrics) return [];
    return analytics.questionMetrics
      .filter(q => q.difficulty !== null)
      .map(q => ({
        question: `Q${q.questionOrder}`,
        difficulty: q.difficulty!,
        passRate: q.passRate,
        discrimination: q.discriminationIndex || 0,
      }))
      .sort((a, b) => a.question.localeCompare(b.question));
  }, [analytics]);

  // Performance trends chart data
  const performanceTrendsData = useMemo(() => {
    if (!analytics?.performanceTrends) return [];
    return analytics.performanceTrends.map((trend, index) => ({
      attempt: `#${index + 1}`,
      percentage: trend.percentage,
      score: trend.score,
      date: new Date(trend.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [analytics]);

  // Time spent per question chart data
  const timeSpentData = useMemo(() => {
    if (!analytics?.timeAnalysis) return [];
    return analytics.timeAnalysis
      .sort((a, b) => a.questionOrder - b.questionOrder)
      .map(q => ({
        question: `Q${q.questionOrder}`,
        average: q.averageTimeSpent,
        median: q.medianTimeSpent,
        min: q.minTimeSpent,
        max: q.maxTimeSpent,
      }));
  }, [analytics]);

  // Question type distribution
  const questionTypeDistribution = useMemo(() => {
    if (!analytics?.questionMetrics) return [];
    const typeCount: Record<string, number> = {};
    analytics.questionMetrics.forEach(q => {
      typeCount[q.questionType] = (typeCount[q.questionType] || 0) + 1;
    });
    return Object.entries(typeCount).map(([type, count]) => ({ type, count }));
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex-center min-h-screen bg-gradient-to-br from-primary/5 via-secondary to-primary/5">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-primary/70">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary to-primary/5 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Error Loading Analytics</h2>
            </div>
            <p>{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/80 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const stats = analytics.statistics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary to-primary/5 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/admin/exams/${examId}/submissions`}
            className="inline-flex items-center gap-2 text-primary/70 hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Submissions
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold font-alan-sans mb-2 text-primary">Analytics Dashboard</h1>
              <p className="text-xl text-primary/70">{stats.exam.title}</p>
            </div>
            <button
              onClick={() => {
                // Export functionality could be added here
                window.print();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary rounded-lg shadow-md hover:bg-primary/80 transition-colors"
            >
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">{stats.submittedAttempts}</h3>
            <p className="text-sm text-primary/60">Submissions</p>
            <p className="text-xs text-primary/50 mt-1">{stats.totalAttempts} total attempts</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Award className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">{stats.averagePercentage.toFixed(1)}%</h3>
            <p className="text-sm text-primary/60">Average Score</p>
            <p className="text-xs text-primary/50 mt-1">{stats.averageScore.toFixed(2)} / {stats.highestScore.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">{stats.completionRate.toFixed(1)}%</h3>
            <p className="text-sm text-primary/60">Completion Rate</p>
            <p className="text-xs text-primary/50 mt-1">{stats.totalQuestions} questions</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">{formatTime(stats.averageTimeSpent)}</h3>
            <p className="text-sm text-primary/60">Avg Time Spent</p>
            <p className="text-xs text-primary/50 mt-1">{stats.exam.durationMins} min duration</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Performance Trends */}
          <div className="bg-secondary rounded-xl p-6 border border-primary/10 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-primary">Performance Trends</h2>
            </div>
            {performanceTrendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceTrendsData}>
                  <defs>
                    <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                  <XAxis dataKey="attempt" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorPercentage)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-primary/50">
                <p>No performance data available</p>
              </div>
            )}
          </div>

          {/* Question Difficulty & Discrimination */}
          <div className="bg-secondary rounded-xl p-6 border border-primary/10 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-primary">Question Difficulty & Discrimination</h2>
            </div>
            {difficultyHeatMapData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={difficultyHeatMapData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                  <XAxis dataKey="question" stroke="#9ca3af" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} domain={[0, 1]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} domain={[-1, 1]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'difficulty') return [value.toFixed(3), 'Difficulty (p-value)'];
                      if (name === 'discrimination') return [value.toFixed(3), 'Discrimination Index'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="difficulty" fill="#3b82f6" name="Difficulty" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="discrimination" stroke="#10b981" strokeWidth={2} name="Discrimination" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-primary/50">
                <p>No question data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Time Spent Analysis */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10 shadow-md mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Time Spent per Question</h2>
          </div>
          {timeSpentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSpentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis dataKey="question" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value: number) => formatTime(value)}
                />
                <Legend />
                <Bar dataKey="average" fill="#8b5cf6" name="Average" radius={[4, 4, 0, 0]} />
                <Bar dataKey="median" fill="#ec4899" name="Median" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-primary/50">
              <p>No time data available</p>
            </div>
          )}
        </div>

        {/* Question Performance Table */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Question Performance Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-primary/10">
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Question</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Type</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Difficulty</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Discrimination</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Pass Rate</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Avg Score</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {analytics.questionMetrics.map((q) => (
                  <tr key={q.questionId} className="hover:bg-primary/5">
                    <td className="p-3">
                      <div className="font-medium">Q{q.questionOrder}</div>
                      <div className="text-xs text-primary/50 truncate max-w-xs">{q.questionPrompt}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                        {q.questionType}
                      </span>
                    </td>
                    <td className="p-3">
                      {q.difficulty !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-primary/10 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full ${
                                q.difficulty > 0.7 ? 'bg-green-500' :
                                q.difficulty > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${q.difficulty * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-primary/70 w-12 text-right">
                            {(q.difficulty * 100).toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-primary/50">N/A</span>
                      )}
                    </td>
                    <td className="p-3">
                      {q.discriminationIndex !== null ? (
                        <span className={`text-xs font-medium ${
                          q.discriminationIndex > 0.3 ? 'text-green-600' :
                          q.discriminationIndex > 0.1 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {q.discriminationIndex.toFixed(3)}
                        </span>
                      ) : (
                        <span className="text-xs text-primary/50">N/A</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-primary/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${q.passRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-primary/70 w-12 text-right">
                          {q.passRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-primary">
                        {q.averageScore.toFixed(2)} / {q.totalPoints}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-primary/70">
                        {formatTime(q.averageTimeSpent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

