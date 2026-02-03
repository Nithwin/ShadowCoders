'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, User, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface ProctoringStats {
  totalEyeViolations: number;
  totalHeadViolations: number;
  totalViolations: number;
  eventCounts: Record<string, number>;
  events: Array<{
    id: string;
    eventType: string;
    severity: string;
    description: string | null;
    timestamp: string;
  }>;
}

interface ProctoringViolationSummaryProps {
  attemptId: string;
  onClose?: () => void;
}

export function ProctoringViolationSummary({ attemptId, onClose }: ProctoringViolationSummaryProps) {
  const [stats, setStats] = useState<ProctoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [attemptId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/proctoring/stats/${attemptId}`);
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch proctoring stats:', err);
      setError(err.response?.data?.message || 'Failed to load proctoring data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300 text-sm">
          {error || 'No proctoring data available'}
        </p>
      </div>
    );
  }

  const isClean = stats.totalViolations === 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Proctoring Summary
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Eye and head tracking results from your exam attempt
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      {/* Overall Status */}
      <div className={`rounded-lg p-4 ${
        isClean 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
          : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-center gap-3">
          {isClean ? (
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          )}
          <div>
            <h4 className={`font-semibold ${
              isClean ? 'text-green-900 dark:text-green-100' : 'text-yellow-900 dark:text-yellow-100'
            }`}>
              {isClean ? 'No Violations Detected' : `${stats.totalViolations} Violation${stats.totalViolations === 1 ? '' : 's'} Detected`}
            </h4>
            <p className={`text-sm ${
              isClean ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {isClean 
                ? 'You maintained proper exam conduct throughout the test'
                : 'Some suspicious activities were detected during your exam'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Violation Breakdown */}
      {!isClean && (
        <div className="grid grid-cols-2 gap-4">
          {/* Eye Tracking Violations */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">Eye Tracking</h4>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalEyeViolations}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Looking away or eyes closed
            </p>
          </div>

          {/* Head Tracking Violations */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">Head Position</h4>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalHeadViolations}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Head turned or face not detected
            </p>
          </div>
        </div>
      )}

      {/* Event Type Breakdown */}
      {!isClean && Object.keys(stats.eventCounts).length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Violation Types
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.eventCounts).map(([eventType, count]) => (
              <div key={eventType} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events Timeline (optional - show last 5) */}
      {!isClean && stats.events.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Recent Events
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stats.events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 text-sm p-2 rounded bg-gray-50 dark:bg-gray-700/30"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  event.severity === 'critical' ? 'bg-red-500' :
                  event.severity === 'high' ? 'bg-orange-500' :
                  event.severity === 'medium' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {event.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  {event.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                      {event.description}
                    </p>
                  )}
                  <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p>
          This data is recorded for academic integrity purposes. If you believe there's an error, 
          please contact your instructor.
        </p>
      </div>
    </div>
  );
}
