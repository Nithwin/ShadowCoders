'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle2, AlertCircle, Loader2, Eye, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CameraPreviewProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export function CameraPreview({ onPermissionGranted, onPermissionDenied }: CameraPreviewProps) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped camera track:', track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  }, []); // Empty deps - function never recreates

  const requestCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setStatus('requesting');
    setError(null);
    setIsVideoReady(false);

    try {
      // Stop any existing stream first
      stopCamera();
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      console.log('=== Camera Request Start ===');
      
      // Check current permission state
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Camera permission state:', permissionStatus.state);
        
        if (permissionStatus.state === 'denied') {
          throw { 
            name: 'NotAllowedError', 
            message: 'Camera permission was previously denied. Please reset it in your browser settings.' 
          };
        }
      } catch (permErr) {
        console.log('Permission query not supported, proceeding with getUserMedia');
      }

      console.log('Requesting camera stream...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('✅ Stream obtained:', stream.id, 'Active:', stream.active);
      console.log('Video tracks:', stream.getVideoTracks().map(t => `${t.label} (${t.readyState})`));

      if (!mountedRef.current) {
        console.log('Component unmounted, cleaning up stream');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      
      // Set status to granted first so video element renders
      setStatus('granted');
      
      // Wait for next render cycle for video element to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current) {
        console.error('❌ Video element ref is null after waiting!');
        throw new Error('Video element not ready');
      }
      
      console.log('Setting stream to video element...');
      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      
      // Wait for video to be ready
      videoElement.onloadedmetadata = async () => {
        console.log('✅ Video metadata loaded');
        console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        console.log('Video ready state:', videoElement.readyState);
        
        setIsVideoReady(true);
        
        // Try to play
        try {
          await videoElement.play();
          console.log('✅ Video playing');
          setRetryCount(0);
          onPermissionGranted?.();
        } catch (playErr) {
          console.error('❌ Play failed:', playErr);
        }
      };

      videoElement.onerror = (e) => {
        console.error('❌ Video element error:', e);
      };

      // Trigger load
      videoElement.load();
      console.log('Video load() called, srcObject set:', !!videoElement.srcObject);

      // Fallback: If metadata doesn't load in 3 seconds, try to play anyway
      setTimeout(() => {
        if (videoElement && !isVideoReady && streamRef.current?.active) {
          console.log('⚠️ Metadata timeout, forcing play...');
          setIsVideoReady(true);
          videoElement.play().then(() => {
            console.log('✅ Force play succeeded');
            setRetryCount(0);
            onPermissionGranted?.();
          }).catch(err => {
            console.error('❌ Force play failed:', err);
          });
        }
      }, 3000);

    } catch (err: any) {
      if (!mountedRef.current) return;
      
      console.error('❌ Camera error:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      
      let errorMsg = 'Failed to access camera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied.\n\n1. Click the camera icon 🎥 in your address bar\n2. Change permission to "Allow"\n3. Refresh this page';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found. Please connect a camera device.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is busy.\n\n1. Close ALL other browser tabs\n2. Close Zoom, Teams, Skype, etc.\n3. Wait 10 seconds\n4. Click Retry below';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setStatus('denied');
      setRetryCount(prev => prev + 1);
      onPermissionDenied?.();
    }
  }, [stopCamera, onPermissionGranted, onPermissionDenied, isVideoReady]);
  // Mount effect
  useEffect(() => {
    mountedRef.current = true;
    
    // Single camera request on mount
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        requestCamera();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Requesting state
  if (status === 'requesting') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">AI Eye Tracking Setup</h3>
            <p className="text-sm text-gray-600">Initializing camera...</p>
          </div>
        </div>
        
        <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-300 text-base font-medium">Requesting camera permission...</p>
            <p className="text-gray-500 text-sm mt-2">Please allow camera access when prompted</p>
          </div>
        </div>
      </div>
    );
  }

  // Denied state
  if (status === 'denied') {
    return (
      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border-2 border-red-300 p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-500 rounded-xl shadow-lg">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Camera Access Required</h3>
            <p className="text-sm text-gray-600">Eye tracking needs camera permission</p>
          </div>
        </div>
        
        <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 mb-6">
          <p className="text-red-900 text-sm font-medium whitespace-pre-line leading-relaxed">{error}</p>
          {retryCount > 0 && (
            <p className="text-red-700 text-xs mt-3 font-semibold">
              ⚠️ Retry attempt #{retryCount}. If this persists, restart your browser.
            </p>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-6">
          <div className="text-center px-4">
            <Camera className="w-16 h-16 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-base font-medium">Camera access denied</p>
          </div>
        </div>

        <Button
          onClick={requestCamera}
          variant="outline"
          className="w-full bg-red-500 hover:bg-red-600 text-white border-red-600 py-3 text-base font-semibold"
        >
          <Camera className="w-5 h-5 mr-2" />
          Retry Camera Access
        </Button>

        <div className="mt-6 bg-white rounded-lg p-4 text-sm text-gray-700">
          <p className="font-bold mb-2">How to enable camera:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Click the camera icon 🎥 in your browser's address bar</li>
            <li>Select "Allow" for camera access</li>
            <li>Refresh the page if needed</li>
          </ul>
        </div>
      </div>
    );
  }

  // Granted state
  if (status === 'granted') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-green-500 rounded-xl shadow-lg animate-pulse">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800">✅ Camera Active</h3>
            <p className="text-sm text-gray-600">Position your face in the center of the frame</p>
          </div>
        </div>
        
        <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl mb-6" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover mirror"
            autoPlay
            playsInline
            muted
          />
          
          {!isVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-green-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-300 text-base font-medium">Initializing video...</p>
              </div>
            </div>
          )}

          {/* Live indicator */}
          {isVideoReady && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Live</span>
            </div>
          )}

          {/* Face guide overlay */}
          {isVideoReady && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-80 border-4 border-green-400/50 rounded-full shadow-lg" />
            </div>
          )}
        </div>

        <div className="bg-green-100 border-2 border-green-300 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div className="space-y-3 text-sm flex-1">
              <p className="font-bold text-green-900 text-base">Camera is working! Please ensure:</p>
              <ul className="space-y-2 text-green-800">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                  <span>Your face is centered in the green oval</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                  <span>Good lighting on your face (avoid backlighting)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                  <span>No other people visible in the frame</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                  <span>Camera is at eye level</span>
                </li>
              </ul>
              <div className="bg-green-200/50 rounded-lg p-3 mt-3">
                <p className="text-xs text-green-700 font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  AI will monitor your face, eyes, and head position during the exam
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
