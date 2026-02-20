'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

type Props = {
  data: { name: string; submissions: number }[];
};

const BAR_COLOR = '#2563eb';
const BAR_HOVER = '#1d4ed8';

/* custom tooltip */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a] text-white text-xs rounded-lg px-3.5 py-2.5 shadow-xl border border-slate-700/50">
      <p className="font-semibold mb-1 text-[13px]">{label}</p>
      <p className="text-blue-300">
        {payload[0].value} submission{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export default function SubmissionsBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
        <BarChart3 className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm font-medium">No submissions yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barCategoryGap="25%">
        <defs>
          <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BAR_COLOR} stopOpacity={0.95} />
            <stop offset="100%" stopColor={BAR_COLOR} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="#94a3b8"
          fontSize={11}
          fontWeight={500}
          tickLine={false}
          axisLine={false}
          angle={-30}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={11}
          fontWeight={500}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)', radius: 6 }} />
        <Bar dataKey="submissions" fill="url(#barFill)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
