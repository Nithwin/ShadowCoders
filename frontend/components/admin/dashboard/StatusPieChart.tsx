'use client';

import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type Props = {
  data: { name: string; value: number }[];
};

export default function StatusPieChart({ data }: Props) {
  if (!data.some(d => d.value > 0)) {
    return (
      <div className="h-[300px] flex items-center justify-center text-primary/50">
        <p>No exams yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151', 
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            labelStyle={{ color: '#f3f4f6', marginBottom: '4px' }}
            formatter={(value: number, name: string) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Custom Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 px-2">
        {data.map((entry, index) => {
          const total = data.reduce((sum, d) => sum + d.value, 0);
          const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
          return (
            <div 
              key={entry.name} 
              className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm text-primary/80 font-medium truncate">
                  {entry.name}
                </div>
                <div className="text-xs text-primary/60">
                  {entry.value} exam{entry.value !== 1 ? 's' : ''} • {percentage}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
