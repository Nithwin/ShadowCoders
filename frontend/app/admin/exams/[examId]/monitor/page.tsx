'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useExamMonitoring, type ExamStats } from '@/hooks/useExamMonitoring';
import { ArrowLeft, Users, Activity, Clock, CheckCircle2, AlertCircle, TrendingUp, Eye } from 'lucide-react';
import Link from 'next/link';

type Exam = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  durationMins: number;
  status: string;
};

export default function ExamMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.examId as string;
  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { stats, isConnected } = useExamMonitoring({
    examId,
    onActivityUpdate: (updatedStats) => {
      // Stats are automatically updated via the hook
    },
  });

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await api.get<Exam>(`/admin/exams/${examId}`);
        setExam(response.data);
      } catch (err) {
        console.error('Error fetching exam:', err);
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Exam not found'}</p>
            <Link
              href="/admin/exams"
              className="mt-4 inline-flex items-center text-red-600 hover:text-red-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
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

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/exams"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exams
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
          <p className="text-gray-600 mt-2">{exam.description || 'Live Exam Monitoring'}</p>
        </div>

        {/* Connection Status */}
        <div className={`mb-6 p-4 rounded-lg border ${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Connected to live monitoring' : 'Disconnected - Reconnecting...'}
            </span>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Students</p>
                    <p className="text-3xl font-bold text-green-600">{stats.activeStudents}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Idle Students</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.idleStudents}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Average Progress</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.averageProgress}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Student Activity List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Student Activity</h2>
                <p className="text-sm text-gray-600 mt-1">Real-time tracking of student progress</p>
              </div>

              {stats.activities.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No students currently taking this exam</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Question
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.activities.map((activity) => {
                        const progress = Math.round((activity.answeredCount / activity.totalQuestions) * 100);
                        const lastActivity = new Date(activity.lastActivity);
                        const timeSince = Math.floor((new Date().getTime() - lastActivity.getTime()) / 1000);
                        const timeSinceText = timeSince < 60 
                          ? `${timeSince}s ago` 
                          : timeSince < 3600 
                          ? `${Math.floor(timeSince / 60)}m ago`
                          : `${Math.floor(timeSince / 3600)}h ago`;

                        return (
                          <tr key={activity.attemptId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {activity.studentName}
                                </div>
                                <div className="text-sm text-gray-500">{activity.studentEmail}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(activity.status)}`}>
                                {activity.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className={`h-2 rounded-full ${getProgressColor(progress)}`}
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600">{progress}%</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {activity.answeredCount} / {activity.totalQuestions} answered
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                Question {activity.currentQuestionIndex + 1}
                              </div>
                              {activity.currentSection && (
                                <div className="text-xs text-gray-500">{activity.currentSection}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatTime(activity.timeSpent)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {timeSinceText}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {activity.status === 'active' ? (
                                <button
                                  onClick={() => router.push(`/admin/exams/${examId}/monitor/${activity.attemptId}`)}
                                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm hover:shadow"
                                >
                                  <Eye className="w-4 h-4 mr-1.5" />
                                  View Details
                                </button>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1.5 bg-gray-300 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed">
                                  <Eye className="w-4 h-4 mr-1.5" />
                                  View Details
                                </span>
                              )}
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
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Waiting for student activity...</p>
          </div>
        )}
      </div>
    </div>
  );
}

