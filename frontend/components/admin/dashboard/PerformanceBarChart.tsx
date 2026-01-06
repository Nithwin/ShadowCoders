'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

type Props = {
  data: { name: string; value: number }[];
};

export default function PerformanceBarChart({ data }: Props) {
  if (!data.some(d => d.value > 0)) {
    return (
      <div className="h-[300px] flex items-center justify-center text-primary/50">
        <p>No performance data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
        <XAxis type="number" stroke="#9ca3af" fontSize={12} />
        <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={120} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#f3f4f6' }}
        />
        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
