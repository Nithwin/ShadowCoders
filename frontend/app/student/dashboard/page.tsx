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
  FileText
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
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<Attempt[]>('/student/attempts');
      setAttempts(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to fetch performance data.');
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="flex-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-primary/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-primary">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary">
      <div className="mb-6">
        <h1 className="text-4xl font-bold font-alan-sans mb-2">My Dashboard</h1>
        <p className="text-primary/70">Track your performance and progress</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Stat Card 1 - Total Exams */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-6 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-primary mb-1">{stats.totalExams}</h3>
          <p className="text-sm text-primary/60">Exams Completed</p>
        </div>

        {/* Stat Card 2 - Average Score */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Target className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-primary mb-1">{stats.avgScore}%</h3>
          <p className="text-sm text-primary/60">Average Score</p>
        </div>

        {/* Stat Card 3 - Highest Score */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-6 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Award className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-primary mb-1">{stats.highestScore}%</h3>
          <p className="text-sm text-primary/60">Highest Score</p>
        </div>

        {/* Stat Card 4 - Total Attempts */}
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-6 border border-orange-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-primary mb-1">{stats.totalAttempts}</h3>
          <p className="text-sm text-primary/60">Total Attempts</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Score Trend Chart */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Score Trend</h2>
          </div>
          {scoreTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={scoreTrendData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorScore)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-primary/50">
              <p>No data available yet</p>
            </div>
          )}
        </div>

        {/* Grade Distribution */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Grade Distribution</h2>
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
                    outerRadius={80}
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
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
                {gradeDistribution.filter(d => d.value > 0).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-primary/80 font-medium">
                      {entry.fullName}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-primary/50">
              <p>No data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Performance by Exam */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Performance by Exam</h2>
          </div>
          {performanceByExam.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceByExam}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-primary/50">
              <p>No data available yet</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Recent Activity</h2>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((attempt) => {
                const percentage = getScorePercentage(attempt.score, attempt.maxScore);
                return (
                  <div key={attempt.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-primary">{attempt.exam.title}</p>
                      <p className="text-sm text-primary/60">
                        {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{percentage}%</p>
                      <p className="text-xs text-primary/60">
                        {formatScore(attempt.score).toFixed(1)} / {formatScore(attempt.maxScore).toFixed(1)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-primary/50">
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
