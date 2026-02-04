'use client';

import { useEffect, useState } from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  animate?: boolean;
}

export function CircularProgress({
  percentage,
  size = 200,
  strokeWidth = 12,
  className = '',
  showLabel = true,
  animate = true,
}: CircularProgressProps) {
  const [displayPercentage, setDisplayPercentage] = useState(animate ? 0 : percentage);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayPercentage / 100) * circumference;

  useEffect(() => {
    if (animate) {
      const duration = 1500; // 1.5 seconds
      const steps = 60;
      const increment = percentage / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= percentage) {
          setDisplayPercentage(percentage);
          clearInterval(timer);
        } else {
          setDisplayPercentage(current);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [percentage, animate]);

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 90) return '#10b981'; // green-500
    if (percentage >= 80) return '#3b82f6'; // blue-500
    if (percentage >= 70) return '#8b5cf6'; // violet-500
    if (percentage >= 60) return '#f59e0b'; // amber-500
    if (percentage >= 50) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const color = getColor();

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.1))',
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className="text-5xl font-bold transition-all duration-300"
            style={{ color }}
          >
            {Math.round(displayPercentage)}%
          </span>
          <span className="text-sm text-gray-500 mt-1">Score</span>
        </div>
      )}
    </div>
  );
}
