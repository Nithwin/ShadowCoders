'use client';

import { Trophy, Medal, Award } from 'lucide-react';

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

type LeaderboardWidgetProps = {
  data: LeaderboardEntry[];
};

export default function LeaderboardWidget({ data }: LeaderboardWidgetProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-orange-500" />;
    return <span className="text-xs font-bold text-gray-400 dark:text-slate-400">#{rank}</span>;
  };

  const getRowBg = (rank: number) => {
    if (rank === 1) return 'bg-amber-50/60 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-700/40';
    if (rank === 2) return 'bg-gray-50/60 dark:bg-slate-800 border-gray-200/50 dark:border-slate-700';
    if (rank === 3) return 'bg-orange-50/40 dark:bg-orange-900/20 border-orange-200/40 dark:border-orange-700/40';
    return 'bg-gray-50/40 dark:bg-slate-800/70 border-gray-200/40 dark:border-slate-700/70';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    if (score >= 75) return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    if (score >= 50) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300';
  };

  if (data.length === 0) {
    return (
      <div className="h-[260px] flex flex-col items-center justify-center text-gray-400 dark:text-slate-400">
        <Trophy className="w-10 h-10 text-gray-200 dark:text-slate-700 mb-3" />
        <p className="text-sm font-medium">No leaderboard data yet</p>
        <p className="text-xs mt-1 text-gray-300 dark:text-slate-500">Students will appear here after exams</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((entry) => (
        <div
          key={entry.studentId}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-150 hover:shadow-sm ${getRowBg(entry.rank)}`}
        >
          {/* rank */}
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
            {getRankIcon(entry.rank)}
          </div>

          {/* avatar */}
          {entry.pictureUrl ? (
            <img
              src={entry.pictureUrl}
              alt={entry.studentName}
              className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#0f172a] flex items-center justify-center border-2 border-white shadow-sm shrink-0">
              <span className="text-xs font-bold text-white">
                {entry.studentName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* name */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-100 truncate">{entry.studentName}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-400 truncate">
              {entry.studentRegNo || entry.studentEmail}
            </p>
          </div>

          {/* exams count + score */}
          <span className="text-[11px] text-gray-400 dark:text-slate-400 hidden sm:inline shrink-0">{entry.totalExams} exams</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${getScoreBadge(entry.averageScore)}`}>
            {entry.averageScore}%
          </span>
        </div>
      ))}
    </div>
  );
}
