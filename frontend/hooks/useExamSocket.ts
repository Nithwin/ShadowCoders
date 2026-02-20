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
      // Notify server we're leaving the exam room
      socket.emit('leave-exam', { examId, attemptId });
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
    // Emit leave-exam before disconnecting
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-exam', { examId: options.examId, attemptId: options.attemptId });
    }
    socketService.disconnect();
  }, [options.examId, options.attemptId]);

  return {
    emitActivity,
    disconnect,
    isConnected: socketRef.current?.connected || false,
    socket: socketRef.current,
  };
};

