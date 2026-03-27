'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  ClipboardCheck,
  BarChart3,
  PieChart,
  Activity,
  Loader2,
  Plus,
  Trophy,
  Clock,
  ArrowRight,
  Sparkles,
  CalendarDays,
  Zap,
  Target,
  GraduationCap,
} from 'lucide-react';
import AnimatedStatCard from '@/components/admin/dashboard/AnimatedStatCard';
import LeaderboardWidget from '@/components/admin/dashboard/LeaderboardWidget';
import ActivityFeed from '@/components/admin/dashboard/ActivityFeed';

/* ── lazy-loaded charts ── */
const StatusPieChart = dynamic(
  () => import('@/components/admin/dashboard/StatusPieChart'),
  {
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    ),
    ssr: false,
  }
);
const SubmissionsBarChart = dynamic(
  () => import('@/components/admin/dashboard/SubmissionsBarChart'),
  {
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    ),
    ssr: false,
  }
);

/* ── framer-motion helpers ── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  }),
};

/* ── types ── */
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
  _count?: { attempts: number; assignments: number };
};

/* ── card wrapper shared by every bento tile ── */
function BentoCard({
  children,
  className = '',
  custom = 0,
}: {
  children: React.ReactNode;
  className?: string;
  custom?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={custom}
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_rgba(2,6,23,0.35)] p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${iconBg}`}>
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════ PAGE ═══════════════════════════════════════ */
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
      const [overviewRes, leaderboardRes, examsRes] = await Promise.all([
        api.get<DashboardOverview>('/admin/analytics/overview'),
        api.get<LeaderboardEntry[]>('/admin/analytics/leaderboard?limit=5'),
        api.get<{ data: Exam[]; meta: any }>('/admin/exams?pageSize=100'),
      ]);
      setOverview(overviewRes.data);
      setLeaderboard(leaderboardRes.data);
      setExams(examsRes.data.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(e.response?.data?.error?.message || 'Failed to fetch dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── derived data ── */
  const examStatusData = useMemo(() => {
    const counts = { PUBLISHED: 0, DRAFT: 0, CLOSED: 0 };
    exams.forEach((e) => {
      if (e.status in counts) counts[e.status as keyof typeof counts]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [exams]);

  const submissionsByExam = useMemo(() => {
    return exams
      .filter((e) => e._count && e._count.attempts > 0)
      .map((e) => ({
        name: e.title.length > 15 ? e.title.substring(0, 15) + '...' : e.title,
        submissions: e._count?.attempts || 0,
      }))
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, 8);
  }, [exams]);

  const insights = useMemo(() => {
    if (!overview) return [];
    const o = overview.overview;
    const activeExams = exams.filter((e) => e.status === 'PUBLISHED').length;
    const avgScore =
      leaderboard.length > 0
        ? Math.round(leaderboard.reduce((s, l) => s + l.averageScore, 0) / leaderboard.length)
        : 0;
    const completionRate =
      o.totalStudents > 0
        ? Math.round(
            (o.totalSubmissions / Math.max(o.totalStudents * Math.max(exams.length, 1), 1)) * 100
          )
        : 0;
    return [
      { label: 'Active Exams', value: activeExams, icon: Zap, accent: '#2563eb' },
      { label: 'This Week', value: o.submissionsThisWeek, icon: CalendarDays, accent: '#0d9488' },
      { label: 'Avg Score', value: avgScore, icon: Target, accent: '#7c3aed', suffix: '%' },
      { label: 'Completion', value: completionRate, icon: GraduationCap, accent: '#d97706', suffix: '%' },
    ];
  }, [overview, exams, leaderboard]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  /* ── loading ── */
  if (isLoading) {
    return (
      <div className="flex-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <p className="text-gray-400 dark:text-slate-400 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6">
        <div className="p-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-red-600 dark:text-red-300 text-sm font-medium">
          {error || 'Failed to load dashboard'}
        </div>
      </div>
    );
  }

  const o = overview.overview;

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* ═══════ Hero ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-blue-50/80 dark:bg-slate-900 p-7 md:p-9 border border-blue-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_rgba(2,6,23,0.35)]"
      >
        {/* subtle dot grid */}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(#93c5fd33_1px,transparent_1px)] [background-size:16px_16px] dark:opacity-30 opacity-60" />
        </div>
        {/* soft glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-200/30 dark:bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-indigo-200/20 dark:bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-blue-500 text-sm font-medium mb-1.5">{greeting}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Dashboard Overview
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 max-w-lg leading-relaxed">
              Monitor exams, track student performance, and manage your platform.
            </p>
          </div>
          <Link
            href="/admin/exams/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-blue-600/25 self-start md:self-center"
          >
            <Plus className="w-4 h-4" />
            Create Exam
          </Link>
        </div>
      </motion.div>

      {/* ═══════ Stat Cards ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard idx={0} title="Total Exams" value={o.totalExams} icon={FileText} color="#2563eb" growth={o.examGrowth} />
        <AnimatedStatCard idx={1} title="Total Students" value={o.totalStudents} icon={Users} color="#0d9488" growth={o.userGrowth} />
        <AnimatedStatCard idx={2} title="Submissions" value={o.totalSubmissions} icon={ClipboardCheck} color="#7c3aed" growth={o.submissionGrowth} />
        <AnimatedStatCard idx={3} title="Avg Completion" value={Math.round(o.avgCompletionTime / 60)} icon={Clock} color="#d97706" suffix="min" />
      </div>

      {/* ═══════ Quick Metrics Ribbon ═══════ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={5}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {insights.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_24px_rgba(2,6,23,0.35)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_14px_30px_rgba(2,6,23,0.45)] transition-shadow duration-200"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: item.accent + '10' }}
            >
              <item.icon className="w-4 h-4" style={{ color: item.accent }} />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium leading-none mb-1">{item.label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-none">
                {item.value}
                {item.suffix && <span className="text-xs font-semibold text-gray-400 dark:text-slate-400 ml-0.5">{item.suffix}</span>}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ═══════ Bento Grid ═══════ */}
      <div className="grid grid-cols-12 gap-4 md:gap-5">
        {/* ── Bar Chart (8 cols) ── */}
        <div className="col-span-12 lg:col-span-8">
          <BentoCard custom={6} className="h-full">
            <SectionHeader
              icon={BarChart3}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              title="Submissions by Exam"
              subtitle="Total attempts per exam"
              action={
                <Link
                  href="/admin/submissions"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />
            <SubmissionsBarChart data={submissionsByExam} />
          </BentoCard>
        </div>

        {/* ── Donut (4 cols) ── */}
        <div className="col-span-12 lg:col-span-4">
          <BentoCard custom={7} className="h-full">
            <SectionHeader
              icon={PieChart}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              title="Exam Status"
              subtitle="Distribution overview"
            />
            <StatusPieChart data={examStatusData} />
          </BentoCard>
        </div>

        {/* ── Top Performers (7 cols) ── */}
        <div className="col-span-12 lg:col-span-7">
          <BentoCard custom={8} className="h-full">
            <SectionHeader
              icon={Trophy}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              title="Top Performers"
              subtitle="Highest scoring students"
              action={
                <Link
                  href="/admin/users"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  All students <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />
            <LeaderboardWidget data={leaderboard} />
          </BentoCard>
        </div>

        {/* ── Recent Activity (5 cols) ── */}
        <div className="col-span-12 lg:col-span-5">
          <BentoCard custom={9} className="h-full">
            <SectionHeader
              icon={Activity}
              iconBg="bg-teal-50"
              iconColor="text-teal-600"
              title="Recent Activity"
              subtitle="Latest submissions"
            />
            <ActivityFeed data={overview.recentActivity} />
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
