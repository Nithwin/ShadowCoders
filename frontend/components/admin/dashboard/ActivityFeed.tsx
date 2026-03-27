'use client';

import { Clock, CheckCircle2, TrendingUp, Activity } from 'lucide-react';

type ActivityEntry = {
  id: string;
  studentName: string;
  examTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: Date | string | null;
};

type ActivityFeedProps = {
  data: ActivityEntry[];
};

export default function ActivityFeed({ data }: ActivityFeedProps) {
  const getScoreBadge = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    if (pct >= 75) return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    if (pct >= 50) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300';
  };

  const getIconColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
    if (pct >= 75) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/30';
    if (pct >= 50) return 'text-amber-500 bg-amber-50 dark:bg-amber-900/30';
    return 'text-red-500 bg-red-50 dark:bg-red-900/30';
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return 'Just now';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (data.length === 0) {
    return (
      <div className="h-[260px] flex flex-col items-center justify-center text-gray-400 dark:text-slate-400">
        <Activity className="w-10 h-10 text-gray-200 dark:text-slate-700 mb-3" />
        <p className="text-sm font-medium">No recent activity</p>
        <p className="text-xs mt-1 text-gray-300 dark:text-slate-500">Submissions appear here in real-time</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
      {data.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50/70 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700 hover:bg-gray-100/70 dark:hover:bg-slate-800 transition-colors duration-150"
        >
          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${getIconColor(a.percentage)}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-gray-700 dark:text-slate-300 leading-snug">
              <span className="font-semibold text-gray-900 dark:text-slate-100">{a.studentName}</span>{' '}
              <span className="text-gray-400 dark:text-slate-500">completed</span>{' '}
              <span className="font-medium text-gray-700 dark:text-slate-300">{a.examTitle}</span>
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(a.submittedAt)}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500">
                <TrendingUp className="w-3 h-3" />
                {a.score.toFixed(1)}/{a.maxScore.toFixed(1)}
              </span>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${getScoreBadge(a.percentage)}`}>
            {a.percentage}%
          </span>
        </div>
      ))}
    </div>
  );
}
