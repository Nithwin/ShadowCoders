'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

type AnimatedStatCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;       // any hex, e.g. "#2563eb"
  suffix?: string;
  growth?: number;
  idx?: number;        // stagger index
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.42, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  }),
};

export default function AnimatedStatCard({
  title,
  value,
  icon: Icon,
  color,
  suffix = '',
  growth,
  idx = 0,
}: AnimatedStatCardProps) {
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = countRef.current;
    if (!el) return;
    const dur = 1100;
    const start = Date.now();
    const animate = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.floor(value * ease).toString();
      if (p < 1) requestAnimationFrame(animate);
      else el.textContent = value.toString();
    };
    animate();
  }, [value]);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={idx}
      className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_26px_rgba(2,6,23,0.35)] p-5 flex flex-col justify-between group hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_14px_30px_rgba(2,6,23,0.45)] transition-shadow duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
          style={{ backgroundColor: color + '12' }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>

        {growth !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
              growth >= 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {growth >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(growth)}%
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1">
          <span ref={countRef} className="text-[28px] font-extrabold tracking-tight text-gray-900 dark:text-slate-100">
            {value}
          </span>
          {suffix && (
            <span className="text-sm font-semibold text-gray-400 dark:text-slate-400">{suffix}</span>
          )}
        </div>
        <p className="text-[13px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">{title}</p>
      </div>
    </motion.div>
  );
}
