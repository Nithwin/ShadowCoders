'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Users, 
  FileText, 
  ClipboardCheck, 
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Loader2, 
  Plus
} from 'lucide-react';

// Lazy load chart components
const StatusPieChart = dynamic(() => import('@/components/admin/dashboard/StatusPieChart'), { 
  loading: () => <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>,
  ssr: false 
});
const SubmissionsAreaChart = dynamic(() => import('@/components/admin/dashboard/SubmissionsAreaChart'), { 
  loading: () => <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>,
  ssr: false 
});
const SubmissionsBarChart = dynamic(() => import('@/components/admin/dashboard/SubmissionsBarChart'), { 
  loading: () => <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>,
  ssr: false 
});
const PerformanceBarChart = dynamic(() => import('@/components/admin/dashboard/PerformanceBarChart'), { 
  loading: () => <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>,
  ssr: false 
});

type Exam = {
  id: string;
  title: string;
  status: string;
  startAt: string;
  updatedAt: string;
  _count?: {
    attempts: number;
    assignments: number;
  };
};

type Attempt = {
  id: string;
  exam: {
    id: string;
    title: string;
  };
  student: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  score: number | string | null;
  maxScore: number | string | null;
  submittedAt: string | null;
};

export default function AdminDashboardPage() {
  useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch exams
      const examsRes = await api.get<{ data: Exam[]; meta: any }>('/admin/exams?pageSize=100');
      setExams(examsRes.data.data);

      // Fetch recent attempts (we'll get from all exams)
      const allAttempts: Attempt[] = [];
      for (const exam of examsRes.data.data.slice(0, 10)) {
        try {
          const attemptsRes = await api.get<{ data: Attempt[] }>(`/admin/attempts/exam/${exam.id}?pageSize=5`);
          allAttempts.push(...attemptsRes.data.data);
        } catch (err) {
          // Skip if fails
        }
      }
      // Sort by submittedAt and take most recent
      allAttempts.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
      setRecentAttempts(allAttempts.slice(0, 10));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to fetch dashboard data.');
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
    const totalExams = exams.length;
    const publishedExams = exams.filter(e => e.status === 'PUBLISHED').length;
    const totalSubmissions = exams.reduce((sum, e) => sum + (e._count?.attempts || 0), 0);
    const totalStudents = new Set(recentAttempts.map(a => a.student.id)).size;

    return {
      totalExams,
      publishedExams,
      totalSubmissions,
      totalStudents
    };
  }, [exams, recentAttempts]);

  // Exam status distribution
  const examStatusData = useMemo(() => {
    const statusCounts = {
      'PUBLISHED': 0,
      'DRAFT': 0,
      'CLOSED': 0
    };
    
    exams.forEach(exam => {
      if (exam.status in statusCounts) {
        statusCounts[exam.status as keyof typeof statusCounts]++;
      }
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [exams]);

  // Submissions over time (by exam)
  const submissionsByExam = useMemo(() => {
    return exams
      .filter(e => e._count && e._count.attempts > 0)
      .map(exam => ({
        name: exam.title.length > 15 ? exam.title.substring(0, 15) + '...' : exam.title,
        submissions: exam._count?.attempts || 0
      }))
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, 8);
  }, [exams]);

  // Performance distribution
  const performanceDistribution = useMemo(() => {
    const submittedAttempts = recentAttempts.filter(
      a => a.status === 'SUBMITTED' && a.score !== null && a.maxScore !== null
    );
    
    const distribution = {
      'Excellent (90-100)': 0,
      'Good (80-89)': 0,
      'Average (70-79)': 0,
      'Below Average (60-69)': 0,
      'Needs Improvement (<60)': 0
    };
    
    submittedAttempts.forEach(attempt => {
      const percentage = getScorePercentage(attempt.score, attempt.maxScore);
      if (percentage >= 90) distribution['Excellent (90-100)']++;
      else if (percentage >= 80) distribution['Good (80-89)']++;
      else if (percentage >= 70) distribution['Average (70-79)']++;
      else if (percentage >= 60) distribution['Below Average (60-69)']++;
      else distribution['Needs Improvement (<60)']++;
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [recentAttempts]);

  // Recent submissions timeline
  const recentSubmissions = useMemo(() => {
    return recentAttempts
      .filter(a => a.submittedAt)
      .slice(0, 7)
      .map(attempt => ({
        name: new Date(attempt.submittedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: 1
      }))
      .reduce((acc, curr) => {
        const existing = acc.find(item => item.name === curr.name);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push(curr);
        }
        return acc;
      }, [] as { name: string; count: number }[])
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [recentAttempts]);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold font-alan-sans mb-2">Dashboard</h1>
          <p className="text-primary/70">Overview of exams and student performance</p>
        </div>
        <Link
          href="/admin/exams/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary rounded-lg shadow-md hover:bg-primary/80 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New Exam
        </Link>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Stat Card 1 - Total Exams */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-6 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-primary mb-1">{stats.totalExams}</h3>
          <p className="text-sm text-primary/60">Total Exams</p>
        </div>

        {/* Stat Card 2 - Published Exams */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-primary mb-1">{stats.publishedExams}</h3>
          <p className="text-sm text-primary/60">Published Exams</p>
        </div>

        {/* Stat Card 3 - Total Submissions */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-6 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-primary mb-1">{stats.totalSubmissions}</h3>
          <p className="text-sm text-primary/60">Total Submissions</p>
        </div>

        {/* Stat Card 4 - Active Students */}
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-6 border border-orange-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Users className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-primary mb-1">{stats.totalStudents}</h3>
          <p className="text-sm text-primary/60">Active Students</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Exam Status Distribution */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Exam Status</h2>
          </div>
          <StatusPieChart data={examStatusData} />
        </div>

        {/* Submissions Timeline */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Recent Submissions</h2>
          </div>
          <SubmissionsAreaChart data={recentSubmissions} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Submissions by Exam */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Submissions by Exam</h2>
          </div>
          <SubmissionsBarChart data={submissionsByExam} />
        </div>

        {/* Performance Distribution */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Performance Distribution</h2>
          </div>
          <PerformanceBarChart data={performanceDistribution} />
        </div>
      </div>
    </div>
  );
}
