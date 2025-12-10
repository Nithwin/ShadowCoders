'use client';

import { useMemo, useState } from 'react';

interface ActivityData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
  year?: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ActivityHeatmap({ data, year = new Date().getFullYear() }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(item => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      map.set(dateKey, item.count);
    });
    return map;
  }, [data]);

  const { weeks, monthLabels } = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const today = new Date();
    
    // Get the day of week for Jan 1st (0 = Sunday, 6 = Saturday)
    const startDay = startDate.getDay();
    
    // Create array of all days in the year
    const allDays: Array<{ date: Date; count: number; dateStr: string }> = [];
    const currentDate = new Date(startDate);
    
    // Add empty squares for days before Jan 1st to align with Sunday
    for (let i = 0; i < startDay; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() - (startDay - i));
      allDays.push({
        date: new Date(date),
        count: 0,
        dateStr: date.toISOString().split('T')[0],
      });
    }
    
    // Add all days of the year
    while (currentDate <= endDate && currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      allDays.push({
        date: new Date(currentDate),
        count: activityMap.get(dateStr) || 0,
        dateStr,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Group into weeks (7 days per week)
    const weeks: Array<Array<{ date: Date; count: number; dateStr: string }>> = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }
    
    // Create month labels
    const monthLabels: Array<{ month: number; weekIndex: number }> = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      week.forEach(day => {
        if (day.date >= startDate && day.date <= endDate) {
          const month = day.date.getMonth();
          if (month !== lastMonth) {
            // Check if this month label already exists for this week
            const existing = monthLabels.find(m => m.weekIndex === weekIndex);
            if (!existing) {
              monthLabels.push({ month, weekIndex });
              lastMonth = month;
            }
          }
        }
      });
    });
    
    return { weeks, monthLabels };
  }, [year, activityMap]);

  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-400';
    if (count >= 3 && count < 5) return 'bg-green-500';
    if (count >= 5 && count < 10) return 'bg-green-600';
    return 'bg-green-700';
  };

  const getIntensityLabel = (count: number): string => {
    if (count === 0) return 'No activity';
    if (count === 1) return '1 activity';
    return `${count} activities`;
  };

  const totalCount = weeks.flat().reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Activity Heatmap {year}
          </h3>
          <span className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? 'activity' : 'activities'} in {year}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-2 ml-7 relative" style={{ height: '20px' }}>
            {monthLabels.map(({ month, weekIndex }, idx) => {
              const prevWeekIndex = idx > 0 ? monthLabels[idx - 1].weekIndex : 0;
              const spacing = idx === 0 ? weekIndex * 11 : (weekIndex - prevWeekIndex) * 11;
              return (
                <div
                  key={`${month}-${weekIndex}`}
                  className="text-xs text-gray-500 absolute"
                  style={{ left: `${weekIndex * 11}px` }}
                >
                  {MONTHS[month]}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-2">
              {DAYS.map((day, idx) => {
                if (idx % 2 === 0) {
                  return (
                    <div key={day} className="h-3.5 text-xs text-gray-500 flex items-center">
                      {day}
                    </div>
                  );
                }
                return <div key={day} className="h-3.5" />;
              })}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => {
                    const dateStr = day.date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    
                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-gray-400 hover:scale-110 relative ${getIntensity(day.count)}`}
                        style={{
                          opacity: day.count === 0 ? 0.3 : 1,
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10,
                            text: `${getIntensityLabel(day.count)} on ${dateStr}`,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3.5 h-3.5 rounded-sm bg-gray-100" />
          <div className="w-3.5 h-3.5 rounded-sm bg-green-200" />
          <div className="w-3.5 h-3.5 rounded-sm bg-green-400" />
          <div className="w-3.5 h-3.5 rounded-sm bg-green-500" />
          <div className="w-3.5 h-3.5 rounded-sm bg-green-600" />
          <div className="w-3.5 h-3.5 rounded-sm bg-green-700" />
        </div>
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}
