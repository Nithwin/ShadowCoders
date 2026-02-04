'use client';

import React from 'react';
import { Eye, Camera, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[240px] overflow-hidden">
        {/* Camera Preview */}
        <div className="relative mb-3 rounded-md overflow-hidden bg-black aspect-video group">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover mirror ${isTracking ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {!isTracking && cameraPermission !== 'denied' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
            </div>
          )}

          {cameraPermission === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gray-900/80">
              <Camera className="w-6 h-6 text-red-500 mb-2" />
              <span className="text-[10px] text-white">Camera Denied</span>
            </div>
          )}

          {isTracking && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">Live AI Monitoring</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className={`w-4 h-4 ${isTracking ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                AI PROCTORING
              </span>
            </div>
            {isTracking ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold uppercase tracking-wider">
                Active
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                Standby
              </span>
            )}
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700" />

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">Malpractice Alerts:</span>
            <span className={`font-bold px-2 py-0.5 rounded-full ${
              violationCount === 0 ? 'bg-green-50 text-green-700' :
              violationCount < 3 ? 'bg-yellow-50 text-yellow-700' :
              'bg-red-50 text-red-700'
            }`}>
              {violationCount}
            </span>
          </div>
          
          <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">
            AI is analyzing eye movement and head position for exam integrity.
          </p>
        </div>
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
