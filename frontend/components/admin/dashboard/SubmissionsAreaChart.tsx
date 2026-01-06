'use client';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

type Props = {
  data: { name: string; count: number }[];
};

export default function SubmissionsAreaChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-primary/50">
        <p>No submissions yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
        <YAxis stroke="#9ca3af" fontSize={12} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#f3f4f6' }}
        />
        <Area 
          type="monotone" 
          dataKey="count" 
          stroke="#10b981" 
          fillOpacity={1} 
          fill="url(#colorSubmissions)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
