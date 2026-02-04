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
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-primary/60">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
    if (rank === 2) return 'from-gray-400/20 to-gray-500/10 border-gray-400/30';
    if (rank === 3) return 'from-amber-500/20 to-amber-600/10 border-amber-500/30';
    return 'from-primary/5 to-primary/10 border-primary/10';
  };

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-primary/50">
        <Trophy className="w-16 h-16 mb-4 text-primary/30" />
        <p className="text-lg font-medium">No leaderboard data yet</p>
        <p className="text-sm mt-1">Students will appear here after completing exams</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((entry) => (
        <div
          key={entry.studentId}
          className={`flex items-center gap-4 p-4 bg-gradient-to-r ${getRankBg(entry.rank)} rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
        >
          {/* Rank */}
          <div className="flex-shrink-0 w-12 flex items-center justify-center">
            {getRankIcon(entry.rank)}
          </div>

          {/* Avatar */}
          <div className="flex-shrink-0">
            {entry.pictureUrl ? (
              <img
                src={entry.pictureUrl}
                alt={entry.studentName}
                className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/20">
                <span className="text-lg font-bold text-primary">
                  {entry.studentName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-primary truncate">{entry.studentName}</p>
            <p className="text-sm text-primary/60 truncate">
              {entry.studentRegNo || entry.studentEmail}
            </p>
          </div>

          {/* Stats */}
          <div className="flex-shrink-0 text-right">
            <p className="text-2xl font-bold text-primary">{entry.averageScore}%</p>
            <p className="text-xs text-primary/60">{entry.totalExams} exams</p>
          </div>
        </div>
      ))}
    </div>
  );
}
