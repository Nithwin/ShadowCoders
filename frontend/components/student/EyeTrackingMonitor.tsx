'use client';

import React from 'react';
import { Eye, Camera, AlertTriangle, CheckCircle } from 'lucide-react';

interface EyeTrackingMonitorProps {
  isTracking: boolean;
  cameraPermission: 'granted' | 'denied' | 'prompt';
  violationCount: number;
  showWarning: boolean;
  warningMessage: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function EyeTrackingMonitor({
  isTracking,
  cameraPermission,
  violationCount,
  showWarning,
  warningMessage,
  videoRef,
  canvasRef,
}: EyeTrackingMonitorProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact Status Indicator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Eye className={`w-4 h-4 ${isTracking ? 'text-green-500' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Proctoring
            </span>
          </div>
          {isTracking && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">Active</span>
            </div>
          )}
        </div>

        {/* Camera Status */}
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
          <Camera className="w-3 h-3" />
          {cameraPermission === 'granted' && <span>Camera connected</span>}
          {cameraPermission === 'denied' && (
            <span className="text-red-500">Camera access denied</span>
          )}
          {cameraPermission === 'prompt' && <span>Requesting camera...</span>}
        </div>

        {/* Violation Count */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">Violations:</span>
          <span className={`font-semibold ${
            violationCount === 0 ? 'text-green-600' :
            violationCount < 3 ? 'text-yellow-600' :
            violationCount < 5 ? 'text-orange-600' :
            'text-red-600'
          }`}>
            {violationCount}
          </span>
        </div>

        {/* Hidden Video and Canvas Elements */}
        <video
          ref={videoRef}
          className="hidden"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>

      {/* Warning Overlay */}
      {showWarning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg shadow-xl p-4 max-w-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Proctoring Warning
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {warningMessage}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                  Total violations: {violationCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
