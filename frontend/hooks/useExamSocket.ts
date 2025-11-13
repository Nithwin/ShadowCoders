import { useEffect, useRef, useCallback } from 'react';
import { socketService, type ExamActivity } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

export interface UseExamSocketOptions {
  examId: string;
  attemptId: string;
  onStatsUpdate?: (stats: { totalStudents: number }) => void;
}

export const useExamSocket = (options: UseExamSocketOptions) => {
  const { examId, attemptId, onStatsUpdate } = options;
  const { accessToken } = useAuth();
  const socketRef = useRef<ReturnType<typeof socketService.getSocket> | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!accessToken || !examId || !attemptId) return;

    // Connect to socket
    const socket = socketService.connect(accessToken);
    socketRef.current = socket;

    // Join exam room
    socket.emit('join-exam', { examId, attemptId });

    // Listen for exam stats
    socket.on('exam-stats', (stats: { totalStudents: number }) => {
      onStatsUpdate?.(stats);
    });

    // Listen for heartbeat acknowledgment
    socket.on('heartbeat-ack', () => {
      // Heartbeat received
    });

    // Set up heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 30000); // Every 30 seconds

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      socket.off('exam-stats');
      socket.off('heartbeat-ack');
    };
  }, [accessToken, examId, attemptId, onStatsUpdate]);

  const emitActivity = useCallback((activity: {
    currentQuestionIndex: number;
    answeredCount: number;
    timeSpent: number;
    status?: 'active' | 'idle' | 'submitted';
    currentSection?: string;
  }) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('activity-update', activity);
    }
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  return {
    emitActivity,
    disconnect,
    isConnected: socketRef.current?.connected || false,
  };
};

