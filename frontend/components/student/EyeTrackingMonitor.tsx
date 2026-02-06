'use client';

import React, { useEffect } from 'react';
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
  useEffect(() => {
    console.log('👁️ EyeTrackingMonitor mounted');
    console.log('📹 Video ref:', videoRef.current ? 'Available' : 'Not available');
    console.log('🎨 Canvas ref:', canvasRef.current ? 'Available' : 'Not available');
    console.log('📊 isTracking:', isTracking);
    console.log('📷 cameraPermission:', cameraPermission);
    
    return () => {
      console.log('👁️ EyeTrackingMonitor unmounted');
    };
  }, []);

  useEffect(() => {
    console.log('📹 Refs updated - Video:', videoRef.current ? 'Available' : 'Not available', 
                'Canvas:', canvasRef.current ? 'Available' : 'Not available');
  }, [videoRef.current, canvasRef.current]);

  return (
    <>
      {/* Camera Preview - Bottom Left */}
      <div className="fixed bottom-6 left-6 z-50">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl border-2 border-gray-700 overflow-hidden" style={{ width: '280px' }}>
          {/* Camera Video */}
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover mirror ${isTracking ? 'opacity-100' : 'opacity-30'}`}
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {!isTracking && cameraPermission !== 'denied' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            )}

            {cameraPermission === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80">
                <Camera className="w-8 h-8 text-red-300 mb-2" />
                <span className="text-xs text-white font-medium">Camera Access Denied</span>
              </div>
            )}

            {/* Live Indicator */}
            {isTracking && (
              <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">Live</span>
              </div>
            )}

            {/* AI Icon Overlay */}
            {isTracking && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/90 backdrop-blur-sm">
                <Eye className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white">AI Monitoring</span>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-2.5 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isTracking ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
                <span className="text-xs font-bold text-gray-200">
                  {isTracking ? 'Active' : 'Initializing...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">Alerts:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  violationCount === 0 ? 'bg-green-500/20 text-green-300' :
                  violationCount < 3 ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {violationCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Overlay - Top Center */}
      {showWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-in slide-in-from-top duration-300 max-w-md mx-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-500 rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-500 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-1 text-base">
                  ⚠️ Proctoring Alert
                </h3>
                <p className="text-xs text-gray-800 font-medium break-words">
                  {warningMessage}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-600">
                    Violations: <span className="font-bold text-red-600">{violationCount}</span>
                  </p>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                    Warning #{violationCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
