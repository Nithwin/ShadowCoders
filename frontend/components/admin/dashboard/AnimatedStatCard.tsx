'use client';

import { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

type AnimatedStatCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
  suffix?: string;
  growth?: number;
};

export default function AnimatedStatCard({
  title,
  value,
  icon: Icon,
  gradient,
  iconColor,
  suffix = '',
  growth,
}: AnimatedStatCardProps) {
  const countRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = countRef.current;
    if (!element) return;

    let startValue = 0;
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (value - startValue) * easeOutQuart);
      
      element.textContent = currentValue.toString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = value.toString();
      }
    };

    animate();
  }, [value]);

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-6 border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 bg-white/20 rounded-lg`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {growth !== undefined && (
          <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
            growth >= 0 ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'
          }`}>
            {growth >= 0 ? '+' : ''}{growth}%
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <h3 ref={countRef} className="text-3xl font-bold text-primary">
          {value}
        </h3>
        {suffix && <span className="text-2xl font-bold text-primary">{suffix}</span>}
      </div>
      <p className="text-sm text-primary/60 font-medium mt-1">{title}</p>
    </div>
  );
}
