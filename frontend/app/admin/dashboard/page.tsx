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
  Plus,
  Trophy,
  Clock
} from 'lucide-react';
import AnimatedStatCard from '@/components/admin/dashboard/AnimatedStatCard';
import LeaderboardWidget from '@/components/admin/dashboard/LeaderboardWidget';
import ActivityFeed from '@/components/admin/dashboard/ActivityFeed';

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

type DashboardOverview = {
  overview: {
    totalUsers: number;
    totalExams: number;
    totalSubmissions: number;
    totalStudents: number;
    usersThisWeek: number;
    examsThisWeek: number;
    submissionsThisWeek: number;
    userGrowth: number;
    examGrowth: number;
    submissionGrowth: number;
    avgCompletionTime: number;
  };
  recentActivity: Array<{
    id: string;
    studentName: string;
    examTitle: string;
    score: number;
    maxScore: number;
    percentage: number;
    submittedAt: Date | string | null;
  }>;
};

type LeaderboardEntry = {
  rank: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRegNo: string | null;
  pictureUrl: string | null;
  totalExams: number;
  averageScore: number;
};

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

export default function AdminDashboardPage() {
  useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch new analytics endpoints
      const [overviewRes, leaderboardRes, examsRes] = await Promise.all([
        api.get<DashboardOverview>('/admin/analytics/overview'),
        api.get<LeaderboardEntry[]>('/admin/analytics/leaderboard?limit=5'),
        api.get<{ data: Exam[]; meta: any }>('/admin/exams?pageSize=100'),
      ]);

      setOverview(overviewRes.data);
      setLeaderboard(leaderboardRes.data);
      setExams(examsRes.data.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to fetch dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Submissions by exam
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

  if (error || !overview) {
    return (
      <div className="text-primary">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <p>{error || 'Failed to load dashboard'}</p>
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

      {/* Animated Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnimatedStatCard
          title="Total Exams"
          value={overview.overview.totalExams}
          icon={FileText}
          gradient="from-blue-500/10 to-blue-600/5 border-blue-500/20"
          iconColor="text-blue-500"
          growth={overview.overview.examGrowth}
        />
        <AnimatedStatCard
          title="Total Students"
          value={overview.overview.totalStudents}
          icon={Users}
          gradient="from-green-500/10 to-green-600/5 border-green-500/20"
          iconColor="text-green-500"
          growth={overview.overview.userGrowth}
        />
        <AnimatedStatCard
          title="Total Submissions"
          value={overview.overview.totalSubmissions}
          icon={ClipboardCheck}
          gradient="from-purple-500/10 to-purple-600/5 border-purple-500/20"
          iconColor="text-purple-500"
          growth={overview.overview.submissionGrowth}
        />
        <AnimatedStatCard
          title="Avg Completion Time"
          value={Math.round(overview.overview.avgCompletionTime / 60)}
          icon={Clock}
          gradient="from-orange-500/10 to-orange-600/5 border-orange-500/20"
          iconColor="text-orange-500"
          suffix="m"
        />
      </div>

      {/* Top Row: Leaderboard + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Leaderboard */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Top Performers</h2>
          </div>
          <LeaderboardWidget data={leaderboard} />
        </div>

        {/* Activity Feed */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Recent Activity</h2>
          </div>
          <ActivityFeed data={overview.recentActivity} />
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

        {/* Submissions by Exam */}
        <div className="bg-secondary rounded-xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Submissions by Exam</h2>
          </div>
          <SubmissionsBarChart data={submissionsByExam} />
        </div>
      </div>
    </div>
  );
}
