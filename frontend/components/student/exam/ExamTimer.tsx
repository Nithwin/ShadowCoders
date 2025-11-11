'use client';

import { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

interface ExamTimerProps {
  durationMins: number;
  startedAt: string;
  onTimeUp: () => void;
  status: string;
}

export default function ExamTimer({
  durationMins,
  startedAt,
  onTimeUp,
  status,
}: ExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // Update ref when callback changes
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (status !== 'IN_PROGRESS') {
      // Clear timer if exam is not in progress
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimeRemaining(0);
      return;
    }

    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Validate inputs - wait for data to load
    if (!startedAt || !durationMins) {
      console.warn('Timer data not yet loaded:', { startedAt, durationMins });
      return;
    }

    // Validate duration and start time
    const duration = Number(durationMins);
    if (!Number.isFinite(duration) || duration <= 0) {
      console.error('Invalid exam duration:', durationMins);
      setTimeRemaining(0);
      return;
    }

    const durationSeconds = duration * 60;
    const startTime = new Date(startedAt).getTime();
    
    // Validate start time
    if (!Number.isFinite(startTime) || isNaN(startTime) || startTime === 0) {
      console.error('Invalid start time:', startedAt);
      setTimeRemaining(0);
      return;
    }

    const endTime = startTime + durationSeconds * 1000;
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      // Ensure remaining is a valid number
      if (!Number.isFinite(remaining)) {
        console.error('Invalid time remaining calculated:', remaining);
        setTimeRemaining(0);
        return;
      }
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        // Time is up - call callback
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (onTimeUpRef.current) {
          onTimeUpRef.current();
        }
      }
    };

    // Update immediately
    updateTimer();
    
    // Set up interval to update every second
    timerIntervalRef.current = setInterval(updateTimer, 1000);

    // Cleanup
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [durationMins, startedAt, status]);

  const formatTime = (seconds: number) => {
    // Handle NaN or invalid values
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-base md:text-lg font-bold border transition-all ${
      timeRemaining < 300 ? 'bg-red-50 text-red-700 border-red-300 animate-pulse' :
      timeRemaining < 600 ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
      'bg-green-50 text-green-700 border-green-300'
    }`}>
      <Clock className="w-5 h-5" />
      <span>{formatTime(timeRemaining)}</span>
    </div>
  );
}

