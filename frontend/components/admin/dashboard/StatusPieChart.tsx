'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PUBLISHED: { label: 'Published', color: '#2563eb', bg: 'bg-blue-50 text-blue-700' },
  DRAFT:     { label: 'Draft',     color: '#94a3b8', bg: 'bg-gray-100 text-gray-600' },
  CLOSED:    { label: 'Closed',    color: '#7c3aed', bg: 'bg-violet-50 text-violet-700' },
};

type Props = {
  data: { name: string; value: number }[];
};

/* custom dark tooltip */
function CustomTooltip({ active, payload, resolvedTheme }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const cfg = STATUS_CONFIG[entry.name] || { label: entry.name, color: '#666' };
  const isDark = resolvedTheme === 'dark';
  return (
    <div className={`text-xs rounded-lg px-3.5 py-2.5 shadow-xl border ${isDark ? 'bg-[#0f172a] text-white border-slate-700/50' : 'bg-white text-slate-800 border-slate-200'}`}>
      <p className="font-semibold">{cfg.label}</p>
      <p style={{ color: cfg.color }}>{entry.value} exam{entry.value !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function StatusPieChart({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.some((d) => d.value > 0)) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center text-gray-400 dark:text-slate-400">
        <PieIcon className="w-10 h-10 text-gray-200 dark:text-slate-700 mb-3" />
        <p className="text-sm font-medium">No exams yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            dataKey="value"
            paddingAngle={4}
            cornerRadius={6}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={STATUS_CONFIG[entry.name]?.color || '#94a3b8'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip resolvedTheme={resolvedTheme} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* stat pills */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {data.map((entry) => {
          const cfg = STATUS_CONFIG[entry.name] || { label: entry.name, bg: 'bg-gray-100 text-gray-600' };
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div
              key={entry.name}
              className={`flex flex-col items-center px-4 py-2.5 rounded-xl text-center ${cfg.bg}`}
            >
              <span className="text-[11px] font-medium leading-none mb-1 opacity-80">{cfg.label}</span>
              <span className="text-xl font-bold leading-none">{entry.value}</span>
              <span className="text-[10px] opacity-60 mt-0.5">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
