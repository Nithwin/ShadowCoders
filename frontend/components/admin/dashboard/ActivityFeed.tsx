'use client';

import { Clock, CheckCircle2, TrendingUp } from 'lucide-react';

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
  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-500/20';
    if (percentage >= 75) return 'text-blue-600 bg-blue-500/20';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-500/20';
    return 'text-red-600 bg-red-500/20';
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return 'Just now';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-primary/50">
        <Clock className="w-16 h-16 mb-4 text-primary/30" />
        <p className="text-lg font-medium">No recent activity</p>
        <p className="text-sm mt-1">Submissions will appear here in real-time</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {data.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-all duration-200"
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            <div className={`p-2 rounded-lg ${getScoreColor(activity.percentage)}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-primary">
              <span className="font-bold">{activity.studentName}</span> completed{' '}
              <span className="font-semibold">{activity.examTitle}</span>
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-primary/60">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(activity.submittedAt)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {activity.score.toFixed(1)} / {activity.maxScore.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Score Badge */}
          <div className="flex-shrink-0">
            <div className={`px-3 py-1 rounded-full ${getScoreColor(activity.percentage)}`}>
              <span className="text-sm font-bold">{activity.percentage}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
