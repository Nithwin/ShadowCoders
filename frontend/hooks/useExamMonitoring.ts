import { useEffect, useState, useRef, useCallback } from 'react';
import { socketService, type ExamActivity, type ExamStats } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

// Re-export ExamStats for convenience
export type { ExamStats };

export interface UseExamMonitoringOptions {
  examId: string;
  onActivityUpdate?: (stats: ExamStats) => void;
}

export const useExamMonitoring = (options: UseExamMonitoringOptions) => {
  const { examId, onActivityUpdate } = options;
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof socketService.getSocket> | null>(null);
  const onActivityUpdateRef = useRef(onActivityUpdate);

  // Update ref when callback changes
  useEffect(() => {
    onActivityUpdateRef.current = onActivityUpdate;
  }, [onActivityUpdate]);

  useEffect(() => {
    if (!accessToken || !examId) {
      setIsConnected(false);
      return;
    }

    // Connect to socket
    const socket = socketService.connect(accessToken);
    socketRef.current = socket;

    // Track connection status
    const updateConnectionStatus = () => {
      setIsConnected(socket.connected);
    };

    // Set initial connection status
    updateConnectionStatus();

    // Handle connection events
    socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Monitoring] Socket connected');
      }
      setIsConnected(true);
      // Join admin monitoring room after connection is established
      socket.emit('admin-join-exam', { examId });
    });

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Monitoring] Socket disconnected');
      }
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Monitoring] Connection error:', error);
      }
      setIsConnected(false);
    });

    // If already connected, join immediately
    if (socket.connected) {
      socket.emit('admin-join-exam', { examId });
    }

    // Listen for initial exam activity
    socket.on('exam-activity', (data: { totalStudents: number; activities: ExamActivity[] }) => {
      // Deduplicate activities by attemptId (keep the latest one if duplicates exist)
      const activitiesMap = new Map<string, ExamActivity>();
      data.activities.forEach(activity => {
        // If activity already exists, keep the one with more recent lastActivity or keep existing
        const existing = activitiesMap.get(activity.attemptId);
        if (!existing || new Date(activity.lastActivity) > new Date(existing.lastActivity)) {
          activitiesMap.set(activity.attemptId, activity);
        }
      });
      const deduplicatedActivities = Array.from(activitiesMap.values());
      
      const newStats: ExamStats = {
        totalStudents: deduplicatedActivities.length,
        activeStudents: deduplicatedActivities.filter(a => a.status === 'active').length,
        idleStudents: deduplicatedActivities.filter(a => a.status === 'idle').length,
        submittedStudents: deduplicatedActivities.filter(a => a.status === 'submitted').length,
        averageProgress: deduplicatedActivities.length > 0
          ? Math.round((deduplicatedActivities.reduce((sum, a) => sum + (a.answeredCount / a.totalQuestions), 0) / deduplicatedActivities.length) * 100)
          : 0,
        activities: deduplicatedActivities,
      };
      setStats(newStats);
      onActivityUpdateRef.current?.(newStats);
    });

    // Listen for activity updates
    socket.on('activity-update', (data: { attemptId: string; activity: ExamActivity }) => {
      setStats(prev => {
        // Initialize stats if they don't exist
        if (!prev) {
          const newStats: ExamStats = {
            totalStudents: 1,
            activeStudents: data.activity.status === 'active' ? 1 : 0,
            idleStudents: data.activity.status === 'idle' ? 1 : 0,
            submittedStudents: data.activity.status === 'submitted' ? 1 : 0,
            averageProgress: data.activity.totalQuestions > 0
              ? Math.round((data.activity.answeredCount / data.activity.totalQuestions) * 100)
              : 0,
            activities: [data.activity],
          };
          onActivityUpdateRef.current?.(newStats);
          return newStats;
        }

        // Deduplicate activities by attemptId before updating
        const activitiesMap = new Map<string, ExamActivity>();
        // First, add all existing activities
        prev.activities.forEach(activity => {
          activitiesMap.set(activity.attemptId, activity);
        });
        // Then update or add the new activity
        activitiesMap.set(data.attemptId, data.activity);
        const activities = Array.from(activitiesMap.values());
        const newStats: ExamStats = {
          totalStudents: activities.length,
          activeStudents: activities.filter(a => a.status === 'active').length,
          idleStudents: activities.filter(a => a.status === 'idle').length,
          submittedStudents: activities.filter(a => a.status === 'submitted').length,
          averageProgress: activities.length > 0
            ? Math.round((activities.reduce((sum, a) => sum + (a.answeredCount / a.totalQuestions), 0) / activities.length) * 100)
            : 0,
          activities,
        };
        onActivityUpdateRef.current?.(newStats);
        return newStats;
      });
    });

    // Listen for student joining - activity-update events will handle new students
    // No need to re-join exam room as we're already monitoring it
    socket.on('student-joined', (data: { attemptId: string; studentId: string; studentName: string; timestamp: Date }) => {
      // The server will automatically send activity-update events for new students
      // No need to request full exam-activity again (which could cause duplicates)
    });

    // Listen for student disconnecting - remove or update their activity
    socket.on('student-disconnected', (data: { attemptId: string; timestamp: Date }) => {
      setStats(prev => {
        if (!prev) return prev;
        
        const activities = prev.activities.filter(a => a.attemptId !== data.attemptId);
        
        // If no activities left, return null or empty stats
        if (activities.length === 0) {
          const emptyStats: ExamStats = {
            totalStudents: 0,
            activeStudents: 0,
            idleStudents: 0,
            submittedStudents: 0,
            averageProgress: 0,
            activities: [],
          };
          onActivityUpdateRef.current?.(emptyStats);
          return emptyStats;
        }

        const newStats: ExamStats = {
          totalStudents: activities.length,
          activeStudents: activities.filter(a => a.status === 'active').length,
          idleStudents: activities.filter(a => a.status === 'idle').length,
          submittedStudents: activities.filter(a => a.status === 'submitted').length,
          averageProgress: activities.length > 0
            ? Math.round((activities.reduce((sum, a) => sum + (a.answeredCount / a.totalQuestions), 0) / activities.length) * 100)
            : 0,
          activities,
        };
        onActivityUpdateRef.current?.(newStats);
        return newStats;
      });
    });

    // Listen for errors
    socket.on('error', (error: { message: string }) => {
      // Suppress "Violation not found" errors - these are expected when force-submitting via API first
      if (error.message?.includes('Violation not found')) {
        // This is expected behavior when force-submitting - violation might not exist in socket map
        return;
      }
      // Log other socket errors for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('[Monitoring] Socket error:', error.message);
      }
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('exam-activity');
      socket.off('activity-update');
      socket.off('student-joined');
      socket.off('student-disconnected');
      socket.off('error');
    };
  }, [accessToken, examId]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
  }, []);

  return {
    stats,
    disconnect,
    isConnected,
  };
};

