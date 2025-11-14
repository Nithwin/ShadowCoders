import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:4000';

export interface ExamActivity {
  examId: string;
  attemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  timeSpent: number;
  lastActivity: Date;
  status: 'active' | 'idle' | 'submitted';
  currentSection?: string;
}

export interface ExamStats {
  totalStudents: number;
  activeStudents: number;
  idleStudents: number;
  submittedStudents: number;
  averageProgress: number;
  activities: ExamActivity[];
}

class SocketService {
  private socket: Socket | null = null;
  private accessToken: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectCallbacks: Array<() => void> = [];
  private disconnectCallbacks: Array<() => void> = [];

  connect(token: string) {
    // If already connected with the same token, return existing socket
    if (this.socket?.connected && this.accessToken === token) {
      return this.socket;
    }

    // Disconnect existing socket if token changed
    if (this.socket && this.accessToken !== token) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.accessToken = token;
    this.socket = io(SOCKET_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
      forceNew: false,
    });

    this.socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Socket] Connected to server');
      }
      this.reconnectAttempts = 0;
      // Notify all reconnect callbacks
      this.reconnectCallbacks.forEach(cb => cb());
    });

    this.socket.on('disconnect', (reason: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Socket] Disconnected from server:', reason);
      }
      // Notify disconnect callbacks
      this.disconnectCallbacks.forEach(cb => cb());
      
      // If disconnect was not intentional, attempt to reconnect
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect manually
        this.socket?.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
      }
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Socket] Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
      }
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_error', (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Socket] Reconnection error:', error);
      }
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after maximum attempts');
      // Notify that reconnection failed
      this.disconnectCallbacks.forEach(cb => cb());
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('[Socket] Error:', error.message);
    });

    return this.socket;
  }

  onReconnect(callback: () => void) {
    this.reconnectCallbacks.push(callback);
    return () => {
      this.reconnectCallbacks = this.reconnectCallbacks.filter(cb => cb !== callback);
    };
  }

  onDisconnect(callback: () => void) {
    this.disconnectCallbacks.push(callback);
    return () => {
      this.disconnectCallbacks = this.disconnectCallbacks.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.accessToken = null;
      this.reconnectAttempts = 0;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

export const socketService = new SocketService();

