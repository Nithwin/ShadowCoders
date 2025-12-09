'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  TrendingUp, 
  Award, 
  Target, 
  Clock, 
  BarChart3,
  PieChart,
  Activity,
  FileText,
  CheckCircle2,
  Eye,
  XCircle,
  Calendar
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

type Attempt = {
  id: string;
  exam: {
    id: string;
    title: string;
  };
  status: string;
  score: number | string | null;
  maxScore: number | string | null;
  startedAt: string;
  submittedAt: string | null;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function StudentDashboard() {
  useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttempts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<Attempt[]>('/student/attempts');
        setAttempts(res.data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string } } } };
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching dashboard data:', err);
        }
        setError(error.response?.data?.error?.message || 'Failed to fetch performance data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, []);

  const formatScore = (score: number | string | null): number => {
    if (score === null || score === undefined) return 0;
    const num = typeof score === 'string' ? parseFloat(score) : Number(score);
    return isNaN(num) ? 0 : num;
  };

  const getScorePercentage = (score: number | string | null, maxScore: number | string | null): number => {
    const scoreNum = formatScore(score);
    const maxScoreNum = formatScore(maxScore);
    if (!scoreNum || !maxScoreNum) return 0;
    return Math.round((scoreNum / maxScoreNum) * 100);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const submittedAttempts = attempts.filter(a => a.status === 'SUBMITTED' && a.score !== null && a.maxScore !== null);
    const totalExams = submittedAttempts.length;
    const avgScore = submittedAttempts.length > 0
      ? submittedAttempts.reduce((sum, a) => sum + getScorePercentage(a.score, a.maxScore), 0) / submittedAttempts.length
      : 0;
    const highestScore = submittedAttempts.length > 0
      ? Math.max(...submittedAttempts.map(a => getScorePercentage(a.score, a.maxScore)))
      : 0;
    const totalAttempts = attempts.length;

    return {
      totalExams,
      avgScore: Math.round(avgScore),
      highestScore,
      totalAttempts
    };
  }, [attempts]);

  // Prepare score trend data
  const scoreTrendData = useMemo(() => {
    const submittedAttempts = attempts
      .filter(a => a.status === 'SUBMITTED' && a.score !== null && a.maxScore !== null)
      .sort((a, b) => new Date(a.submittedAt || a.startedAt).getTime() - new Date(b.submittedAt || b.startedAt).getTime());
    
    return submittedAttempts.map((attempt, index) => ({
      name: `Exam ${index + 1}`,
      score: getScorePercentage(attempt.score, attempt.maxScore),
      date: new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  }, [attempts]);

  // Prepare performance by exam data
  const performanceByExam = useMemo(() => {
    const examMap = new Map<string, { name: string; score: number; count: number }>();
    
    attempts
      .filter(a => a.status === 'SUBMITTED' && a.score !== null && a.maxScore !== null)
      .forEach(attempt => {
        const examId = attempt.exam.id;
        const examTitle = attempt.exam.title.length > 20 
          ? attempt.exam.title.substring(0, 20) + '...' 
          : attempt.exam.title;
        const score = getScorePercentage(attempt.score, attempt.maxScore);
        
        if (examMap.has(examId)) {
          const existing = examMap.get(examId)!;
          existing.score = (existing.score * existing.count + score) / (existing.count + 1);
          existing.count += 1;
        } else {
          examMap.set(examId, { name: examTitle, score, count: 1 });
        }
      });
    
    return Array.from(examMap.values()).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [attempts]);

  // Prepare grade distribution data
  const gradeDistribution = useMemo(() => {
    const submittedAttempts = attempts.filter(a => a.status === 'SUBMITTED' && a.score !== null && a.maxScore !== null);
    const distribution = {
      'A': 0,
      'B': 0,
      'C': 0,
      'D': 0,
      'F': 0
    };
    
    const gradeRanges = {
      'A': '90-100',
      'B': '80-89',
      'C': '70-79',
      'D': '60-69',
      'F': '<60'
    };
    
    submittedAttempts.forEach(attempt => {
      const percentage = getScorePercentage(attempt.score, attempt.maxScore);
      if (percentage >= 90) distribution['A']++;
      else if (percentage >= 80) distribution['B']++;
      else if (percentage >= 70) distribution['C']++;
      else if (percentage >= 60) distribution['D']++;
      else distribution['F']++;
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ 
      name, 
      value,
      fullName: `${name} (${gradeRanges[name as keyof typeof gradeRanges]})`
    }));
  }, [attempts]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return attempts
      .filter(a => a.status === 'SUBMITTED')
      .sort((a, b) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime())
      .slice(0, 5);
  }, [attempts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium text-primary/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 text-primary">
        <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 shadow-lg">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <p className="font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Section */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            My Dashboard
          </h1>
          <p className="text-lg text-primary/70 font-medium">Track your performance and progress</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Stat Card 1 - Total Exams */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-6 border border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-blue-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">{stats.totalExams}</h3>
            <p className="text-sm text-primary/60 font-medium">Exams Completed</p>
          </div>

          {/* Stat Card 2 - Average Score */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-xl p-6 border border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-green-500/20 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">{stats.avgScore}%</h3>
            <p className="text-sm text-primary/60 font-medium">Average Score</p>
          </div>

          {/* Stat Card 3 - Highest Score */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-6 border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-purple-500/20 rounded-lg">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">{stats.highestScore}%</h3>
            <p className="text-sm text-primary/60 font-medium">Highest Score</p>
          </div>

          {/* Stat Card 4 - Total Attempts */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-6 border border-orange-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-orange-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">{stats.totalAttempts}</h3>
            <p className="text-sm text-primary/60 font-medium">Total Attempts</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Score Trend Chart */}
        <div className="bg-secondary rounded-2xl p-6 border-2 border-primary/10 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/10">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-primary">Score Trend</h2>
          </div>
          {scoreTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={scoreTrendData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#f3f4f6', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorScore)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-primary/50">
              <TrendingUp className="w-16 h-16 mb-4 text-primary/30" />
              <p className="text-lg font-medium">No data available yet</p>
              <p className="text-sm mt-1">Complete exams to see your score trend</p>
            </div>
          )}
        </div>

        {/* Grade Distribution */}
        <div className="bg-secondary rounded-2xl p-6 border-2 border-primary/10 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/10">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-primary">Grade Distribution</h2>
          </div>
          {gradeDistribution.some(d => d.value > 0) ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => value > 0 ? `${name} (${value})` : ''}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Count']}
                    labelFormatter={(label, payload) => {
                      const entry = payload?.[0]?.payload;
                      return entry?.fullName || label;
                    }}
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ color: '#f3f4f6', fontWeight: 'bold' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
                {gradeDistribution.filter(d => d.value > 0).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                    <div 
                      className="w-4 h-4 rounded shadow-sm" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-primary font-semibold">
                      {entry.fullName}: <span className="font-bold">{entry.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-primary/50">
              <PieChart className="w-16 h-16 mb-4 text-primary/30" />
              <p className="text-lg font-medium">No data available yet</p>
              <p className="text-sm mt-1">Complete exams to see grade distribution</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Exam */}
        <div className="bg-secondary rounded-2xl p-6 border-2 border-primary/10 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/10">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-primary">Performance by Exam</h2>
          </div>
          {performanceByExam.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceByExam}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#f3f4f6', fontWeight: 'bold' }}
                />
                <Bar dataKey="score" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-primary/50">
              <BarChart3 className="w-16 h-16 mb-4 text-primary/30" />
              <p className="text-lg font-medium">No data available yet</p>
              <p className="text-sm mt-1">Complete exams to see performance breakdown</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-secondary rounded-2xl p-6 border-2 border-primary/10 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/10">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-primary">Recent Activity</h2>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((attempt) => {
                const percentage = getScorePercentage(attempt.score, attempt.maxScore);
                const scoreColor = percentage >= 80 ? 'from-green-500 to-emerald-600' :
                                  percentage >= 60 ? 'from-yellow-400 to-orange-500' :
                                  percentage >= 40 ? 'from-orange-400 to-red-500' :
                                  'from-red-500 to-red-700';
                
                return (
                  <Link 
                    key={attempt.id} 
                    href={`/student/attempts/${attempt.id}/results`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl hover:bg-primary/10 border border-primary/10 hover:border-primary/20 transition-all duration-300 hover:shadow-md">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-primary truncate mb-1">{attempt.exam.title}</p>
                        <div className="flex items-center gap-2 text-sm text-primary/60">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xl font-bold text-primary">{percentage}%</p>
                            <CheckCircle2 className={`w-4 h-4 ${
                              percentage >= 60 ? 'text-green-500' : 'text-orange-500'
                            }`} />
                          </div>
                          <p className="text-xs text-primary/60 font-medium">
                            {formatScore(attempt.score).toFixed(1)} / {formatScore(attempt.maxScore).toFixed(1)}
                          </p>
                        </div>
                        <div className="w-16 bg-primary/10 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${scoreColor} transition-all duration-500`}
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        <Eye className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-primary/50">
              <Clock className="w-16 h-16 mb-4 text-primary/30" />
              <p className="text-lg font-medium">No recent activity</p>
              <p className="text-sm mt-1">Complete exams to see your activity here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
