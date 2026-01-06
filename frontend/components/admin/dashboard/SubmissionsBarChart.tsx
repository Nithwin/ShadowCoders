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
  data: { name: string; submissions: number }[];
};

export default function SubmissionsBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-primary/50">
        <p>No submissions yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} angle={-45} textAnchor="end" height={80} />
        <YAxis stroke="#9ca3af" fontSize={12} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#f3f4f6' }}
        />
        <Bar dataKey="submissions" fill="#10b981" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
