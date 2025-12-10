'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { socketService } from '@/lib/socket';
import { useAuth } from './AuthContext';

interface KeyboardViolation {
  attemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  timestamp: Date;
}

interface ViolationNotificationContextType {
  violations: Map<string, KeyboardViolation>;
  violationCount: number;
  hasPendingViolation: boolean; // For students - if they have a pending violation
  addViolation: (violation: KeyboardViolation) => void;
  removeViolation: (attemptId: string) => void;
  clearAll: () => void;
}

const ViolationNotificationContext = createContext<ViolationNotificationContextType | undefined>(undefined);

export function ViolationNotificationProvider({ children }: { children: ReactNode }) {
  const [violations, setViolations] = useState<Map<string, KeyboardViolation>>(new Map());
  const [hasPendingViolation, setHasPendingViolation] = useState(false);
  const { user, accessToken } = useAuth();

  // Listen for violations if admin
  useEffect(() => {
    if (!accessToken || !user || user.role !== 'STAFF') return;

    const socket = socketService.connect(accessToken);
    
    const handleViolation = (data: KeyboardViolation) => {
      setViolations(prev => {
        const newMap = new Map(prev);
        newMap.set(data.attemptId, data);
        return newMap;
      });
    };

    const handleResolved = (data: { attemptId: string; action: string }) => {
      setViolations(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.attemptId);
        return newMap;
      });
    };

    socket.on('keyboard-violation', handleViolation);
    socket.on('violation-resolved', handleResolved);

    return () => {
      socket.off('keyboard-violation', handleViolation);
      socket.off('violation-resolved', handleResolved);
    };
  }, [accessToken, user]);

  // Listen for violations if student (to know if they have a pending violation)
  useEffect(() => {
    if (!accessToken || !user || user.role !== 'STUDENT') return;

    const socket = socketService.connect(accessToken);
    
    const handleViolationResolved = (data: { attemptId: string; action: string }) => {
      // If resolved, clear the pending state
      setHasPendingViolation(false);
    };

    // Check if student has a pending violation by listening to their own violation
    // This is set when they trigger a violation in the exam page
    socket.on('violation-resolved', handleViolationResolved);

    return () => {
      socket.off('violation-resolved', handleViolationResolved);
    };
  }, [accessToken, user]);

  const addViolation = useCallback((violation: KeyboardViolation) => {
    setViolations(prev => {
      const newMap = new Map(prev);
      newMap.set(violation.attemptId, violation);
      return newMap;
    });
    
    // If this is the student's own violation, set pending state
    // Check both user.id and violation.studentId to handle different ID formats
    if (user?.role === 'STUDENT') {
      // For students, if they add a violation, it's their own
      setHasPendingViolation(true);
    }
  }, [user]);

  const removeViolation = useCallback((attemptId: string) => {
    setViolations(prev => {
      const newMap = new Map(prev);
      newMap.delete(attemptId);
      return newMap;
    });
    
    // If this was the student's violation, clear pending state
    if (user?.role === 'STUDENT') {
      setHasPendingViolation(false);
    }
  }, [user]);

  const clearAll = useCallback(() => {
    setViolations(new Map());
    setHasPendingViolation(false);
  }, []);

  return (
    <ViolationNotificationContext.Provider
      value={{
        violations,
        violationCount: violations.size,
        hasPendingViolation,
        addViolation,
        removeViolation,
        clearAll,
      }}
    >
      {children}
    </ViolationNotificationContext.Provider>
  );
}

export function useViolationNotifications() {
  const context = useContext(ViolationNotificationContext);
  if (!context) {
    throw new Error('useViolationNotifications must be used within ViolationNotificationProvider');
  }
  return context;
}

