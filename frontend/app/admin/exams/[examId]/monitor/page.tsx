'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useExamMonitoring, type ExamStats } from '@/hooks/useExamMonitoring';
import { ArrowLeft, Users, Activity, Clock, CheckCircle2, AlertCircle, TrendingUp, Eye, Search, Loader2, XCircle, Award, RefreshCw, User, Bell } from 'lucide-react';
import Link from 'next/link';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useViolationNotifications } from '@/context/ViolationNotificationContext';

type Exam = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  durationMins: number;
  status: string;
};

interface KeyboardViolation {
  attemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  timestamp: Date;
  examId: string;
}

interface AttemptDetails {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  submittedAt: string | null;
}

export default function ExamMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.examId as string;
  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'idle' | 'submitted'>('all');
  const [keyboardViolations, setKeyboardViolations] = useState<Map<string, KeyboardViolation>>(new Map());
  const [attemptDetails, setAttemptDetails] = useState<Map<string, AttemptDetails>>(new Map());
  const { confirm } = useConfirmationDialog();
  const { accessToken } = useAuth();
  const { violations: globalViolations, addViolation, removeViolation } = useViolationNotifications();

  // Fetch attempt details from database to get correct status and score
  const fetchAttemptDetails = useCallback(async (attemptId: string) => {
    try {
      const res = await api.get<AttemptDetails>(`/admin/attempts/${attemptId}`);
      setAttemptDetails(prev => {
        const newMap = new Map(prev);
        newMap.set(attemptId, res.data);
        return newMap;
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching attempt details:', err);
      }
    }
  }, []);

  const { stats, isConnected } = useExamMonitoring({
    examId,
    onActivityUpdate: (updatedStats) => {
      // Fetch actual attempt details from database for each activity
      updatedStats.activities.forEach(activity => {
        fetchAttemptDetails(activity.attemptId);
      });
    },
  });

  // Listen for keyboard violations
  useEffect(() => {
    if (!accessToken || !examId) return;

    const socket = socketService.connect(accessToken);
    
    const handleViolation = (data: KeyboardViolation) => {
      setKeyboardViolations(prev => {
        const newMap = new Map(prev);
        newMap.set(data.attemptId, data);
        return newMap;
      });
      // Also add to global violations context
      addViolation(data);
    };

    const handleResolved = (data: { attemptId: string; action: string }) => {
      setKeyboardViolations(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.attemptId);
        return newMap;
      });
      // Also remove from global violations context
      removeViolation(data.attemptId);
      // Refresh attempt details after resolution
      if (data.attemptId) {
        fetchAttemptDetails(data.attemptId);
      }
    };

    socket.on('keyboard-violation', handleViolation);
    socket.on('violation-resolved', handleResolved);

    return () => {
      socket.off('keyboard-violation', handleViolation);
      socket.off('violation-resolved', handleResolved);
    };
  }, [accessToken, examId, fetchAttemptDetails]);

  // Filter activities based on search query
  // Filter activities based on search query and status
  const filteredActivities = stats?.activities.filter((activity) => {
    // Status Filter
    if (filterStatus !== 'all') {
        if (filterStatus === 'submitted') {
            const actualStatus = getActualStatus(activity);
            if (actualStatus !== 'SUBMITTED') return false;
        } else if (activity.status !== filterStatus) {
            return false;
        }
    }

    // Search Filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      activity.studentName.toLowerCase().includes(query) ||
      activity.studentEmail.toLowerCase().includes(query)
    );
  }) || [];

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await api.get<Exam>(`/admin/exams/${examId}`);
        setExam(response.data);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching exam:', err);
        }
        setError('Failed to load exam details');
      } finally {
        setIsLoading(false);
      }
    };

    if (examId) {
      fetchExam();
    }
  }, [examId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <span className="ml-3 text-lg font-medium text-primary/70">Loading monitor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-semibold">{error || 'Exam not found'}</p>
            </div>
            <Link
              href="/admin/exams"
              className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Exams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const handleResolveViolation = async (violation: KeyboardViolation, action: 'force-submit' | 'continue') => {
    const confirmed = await confirm({
      title: action === 'force-submit' ? 'Force Submit Exam?' : 'Allow Student to Continue?',
      message: action === 'force-submit' 
        ? `Are you sure you want to force submit the exam for ${violation.studentName}? This action cannot be undone.`
        : `Allow ${violation.studentName} to continue the exam?`,
      confirmText: action === 'force-submit' ? 'Force Submit' : 'Continue',
      cancelText: 'Cancel',
      variant: action === 'force-submit' ? 'danger' : 'default',
    });

    if (!confirmed) return;

    try {
      if (action === 'force-submit') {
        await api.post(`/admin/attempts/${violation.attemptId}/force-submit`, {
          submissionReason: 'Force submitted by admin due to keyboard violation',
        });
      }

      // Emit resolution event
      const socket = socketService.getSocket();
      if (socket?.connected) {
        socket.emit('resolve-keyboard-violation', {
          attemptId: violation.attemptId,
          action,
        });
      }

      // Refresh attempt details
      fetchAttemptDetails(violation.attemptId);
    } catch (err: any) {
      console.error('Error resolving violation:', err);
      alert(err.response?.data?.error?.message || 'Failed to resolve violation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'idle':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActualStatus = (activity: any): string => {
    const details = attemptDetails.get(activity.attemptId);
    if (details) {
      return details.status;
    }
    // Fallback to socket status
    return activity.status === 'submitted' ? 'SUBMITTED' : activity.status === 'active' ? 'IN_PROGRESS' : 'IN_PROGRESS';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 text-primary">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/exams"
            className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Exams
          </Link>
          <div className="mb-6">
            <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Exam Monitor
            </h1>
            <p className="text-lg text-primary/70 font-medium">{exam.title}</p>
            {exam.description && (
              <p className="text-sm text-primary/60 mt-2">{exam.description}</p>
            )}
          </div>

          {/* Connection Status */}
          <div className={`mb-6 p-4 rounded-xl border-2 shadow-lg transition-all duration-300 ${
            isConnected 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
              : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full shadow-lg ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-semibold ${isConnected ? 'text-green-800' : 'text-red-800'}`}>
                {isConnected ? '✓ Connected to live monitoring' : '⚠ Disconnected - Reconnecting...'}
              </span>
            </div>
            {/* Notification Icon */}
            {keyboardViolations.size > 0 && (
                <div className="absolute top-4 right-4 flex items-center justify-center">
                    <div className="relative p-2 bg-red-100 rounded-full animate-bounce">
                        <Bell className="w-6 h-6 text-red-600" />
                        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full border-2 border-white">
                            {keyboardViolations.size}
                        </span>
                    </div>
                </div>
            )}
          </div>
        </div>

            {/* Keyboard Violation Notifications */}
            {keyboardViolations.size > 0 && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <Bell className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-red-900">Keyboard Violations Detected</h3>
                      <p className="text-sm text-red-700">{keyboardViolations.size} pending violation{keyboardViolations.size !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {Array.from(keyboardViolations.values()).map((violation) => (
                    <div key={violation.attemptId} className="bg-white rounded-lg p-4 border-2 border-red-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <p className="font-bold text-gray-900 text-lg">{violation.studentName}</p>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{violation.studentEmail}</p>
                          <p className="text-xs text-gray-500">
                            Detected at {new Date(violation.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <button
                            onClick={() => handleResolveViolation(violation, 'continue')}
                            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Allow Resume
                          </button>
                          <button
                            onClick={() => handleResolveViolation(violation, 'force-submit')}
                            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Force Submit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics Cards */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-6 border border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-primary mb-1">{stats.totalStudents}</p>
                <p className="text-sm text-primary/60 font-medium">Total Students</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-xl p-6 border border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-green-500/20 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-primary mb-1">{stats.activeStudents}</p>
                <p className="text-sm text-primary/60 font-medium">Active Students</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/5 rounded-xl p-6 border border-yellow-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-yellow-500/20 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-primary mb-1">{stats.idleStudents}</p>
                <p className="text-sm text-primary/60 font-medium">Idle Students</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-6 border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-primary mb-1">{stats.averageProgress}%</p>
                <p className="text-sm text-primary/60 font-medium">Average Progress</p>
              </div>
            </div>

            {/* Search Section */}
            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-primary/10">
              <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/40 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-primary/5 border border-primary/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 bg-primary/5 border border-primary/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="idle">Idle</option>
                  <option value="submitted">Submitted</option>
                </select>
              </div>

              <div className="flex gap-2">
                  <button
                  onClick={() => {
                      if (window.confirm('Are you sure you want to FORCE STOP ALL active exams? This action cannot be undone.')) {
                          filteredActivities.forEach(activity => {
                              if (activity.status === 'active' || activity.status === 'idle') {
                                   const violation = keyboardViolations.get(activity.attemptId);
                                   const mockViolation = violation || {
                                        attemptId: activity.attemptId,
                                        studentId: activity.studentId,
                                        studentName: activity.studentName,
                                        studentEmail: activity.studentEmail,
                                        timestamp: new Date(),
                                        examId: examId,
                                    } as KeyboardViolation;
                                   handleResolveViolation(mockViolation, 'force-submit');
                              }
                          });
                      }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                  >
                  <XCircle className="w-4 h-4" />
                  Force Stop All
                  </button>
              </div>
            </div>

            {/* Student Activity List */}
            <div className="bg-secondary rounded-2xl shadow-xl border-2 border-primary/10 overflow-hidden">
              <div className="p-6 border-b-2 border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">Student Activity</h2>
                    <p className="text-sm text-primary/60 mt-1">Real-time tracking of student progress</p>
                  </div>
                  {stats.activities.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-primary/60">
                      <Activity className="w-4 h-4" />
                      <span>{filteredActivities.length} active</span>
                    </div>
                  )}
                </div>
              </div>

              {filteredActivities.length === 0 ? (
                <div className="p-16 text-center">
                  <Users className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-primary mb-2">
                    {searchQuery ? 'No students found' : 'No students currently taking this exam'}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="text-sm text-primary/60 hover:text-primary mt-2 underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-primary/5 border-b-2 border-primary/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-primary/70 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-primary/70 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-primary/70 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-primary/70 uppercase tracking-wider">
                          Current Question
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-primary/70 uppercase tracking-wider">
                          Time Spent
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-primary/70 uppercase tracking-wider">
                          Last Activity
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-primary/70 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-secondary divide-y divide-primary/10">
                      {filteredActivities.map((activity) => {
                        const progress = Math.round((activity.answeredCount / activity.totalQuestions) * 100);
                        const lastActivity = new Date(activity.lastActivity);
                        const timeSince = Math.floor((new Date().getTime() - lastActivity.getTime()) / 1000);
                        const timeSinceText = timeSince < 60 
                          ? `${timeSince}s ago` 
                          : timeSince < 3600 
                          ? `${Math.floor(timeSince / 60)}m ago`
                          : `${Math.floor(timeSince / 3600)}h ago`;

                        const hasViolation = keyboardViolations.has(activity.attemptId);
                        const violation = keyboardViolations.get(activity.attemptId);

                        return (
                          <tr key={activity.attemptId} className="hover:bg-primary/5 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-primary">
                                    {activity.studentName}
                                  </div>
                                  <div className="text-xs text-primary/60">{activity.studentEmail}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {(() => {
                                const actualStatus = getActualStatus(activity);
                                const isSubmitted = actualStatus === 'SUBMITTED';
                                const details = attemptDetails.get(activity.attemptId);
                                const hasViolation = keyboardViolations.has(activity.attemptId);
                                
                                return (
                                  <div className="space-y-1">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border shadow-sm ${
                                      isSubmitted
                                        ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-700 border-blue-500/30'
                                        : activity.status === 'active'
                                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 border-green-500/30'
                                        : activity.status === 'idle'
                                        ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 border-yellow-500/30'
                                        : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-700 border-gray-500/30'
                                    }`}>
                                      {isSubmitted && (
                                        <CheckCircle2 className="w-3 h-3" />
                                      )}
                                      {!isSubmitted && activity.status === 'active' && (
                                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                                      )}
                                      {!isSubmitted && activity.status === 'idle' && (
                                        <Clock className="w-3 h-3" />
                                      )}
                                      {isSubmitted ? 'SUBMITTED' : activity.status.toUpperCase()}
                                    </span>
                                    {isSubmitted && details && (
                                      <div className="text-xs text-gray-600 font-medium">
                                        Score: {details.score !== null && details.maxScore !== null 
                                          ? `${details.score} / ${details.maxScore} (${Math.round((Number(details.score) / Number(details.maxScore)) * 100)}%)`
                                          : 'Not graded'}
                                      </div>
                                    )}
                                    {hasViolation && (
                                      <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Violation
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-32 bg-primary/10 rounded-full h-2.5 overflow-hidden shadow-inner">
                                  <div
                                    className={`h-2.5 rounded-full bg-gradient-to-r ${
                                      progress >= 75 ? 'from-green-500 to-emerald-600' :
                                      progress >= 50 ? 'from-blue-500 to-blue-600' :
                                      progress >= 25 ? 'from-yellow-400 to-orange-500' :
                                      'from-red-500 to-red-700'
                                    } transition-all duration-500`}
                                    style={{ width: `${Math.max(progress, 5)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-primary min-w-[45px]">{progress}%</span>
                              </div>
                              <div className="text-xs text-primary/60 font-medium">
                                {activity.answeredCount} / {activity.totalQuestions} answered
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="px-2.5 py-1 bg-primary/10 rounded-lg border border-primary/20">
                                  <span className="text-sm font-bold text-primary">
                                    Q{activity.currentQuestionIndex + 1}
                                  </span>
                                </div>
                                {activity.currentSection && (
                                  <div className="text-xs text-primary/60 font-medium">
                                    {activity.currentSection}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <Clock className="w-4 h-4 text-primary/50" />
                                {formatTime(activity.timeSpent)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-primary/70">
                                {timeSinceText}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => router.push(`/admin/exams/${examId}/monitor/${activity.attemptId}`)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold rounded-lg transition-all duration-300 shadow-sm hover:shadow-md w-full justify-center"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </button>
                                
                                {(activity.status === 'active' || activity.status === 'idle') && (
                                  <>
                                     {hasViolation && violation && (
                                        <button
                                          onClick={() => handleResolveViolation(violation, 'continue')}
                                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-semibold rounded-lg transition-all duration-300 shadow-sm hover:shadow-md w-full justify-center"
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                          Resume
                                        </button>
                                     )}

                                    <button
                                      onClick={() => {
                                          const mockViolation = violation || {
                                              attemptId: activity.attemptId,
                                              studentId: activity.studentId,
                                              studentName: activity.studentName,
                                              studentEmail: activity.studentEmail,
                                              timestamp: new Date(),
                                              examId: examId,
                                          } as KeyboardViolation;
                                          handleResolveViolation(mockViolation, 'force-submit');
                                      }}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs font-semibold rounded-lg transition-all duration-300 shadow-sm hover:shadow-md w-full justify-center"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      Force Stop
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {!stats && (
          <div className="bg-secondary rounded-2xl shadow-xl border-2 border-primary/10 p-16 text-center">
            <Activity className="w-16 h-16 text-primary/30 mx-auto mb-4 animate-pulse" />
            <p className="text-lg font-semibold text-primary mb-2">Waiting for student activity...</p>
            <p className="text-sm text-primary/60">No students have started this exam yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

