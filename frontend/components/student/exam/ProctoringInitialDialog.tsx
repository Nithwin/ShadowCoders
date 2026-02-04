'use client';

import { useState, useEffect } from 'react';
import { Camera, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ProctoringInitialDialogProps {
  onProctoringReady: () => void;
  onCancel: () => void;
  attemptId: string;
}

export function ProctoringInitialDialog({ onProctoringReady, onCancel, attemptId }: ProctoringInitialDialogProps) {
  const [stage, setStage] = useState<'info' | 'requesting' | 'granted' | 'denied'>('info');
  const [error, setError] = useState<string | null>(null);

  const handleRequestCamera = async () => {
    setStage('requesting');
    setError(null);
    console.log('Requesting camera permission...');

    try {
      console.log('Calling getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('Camera stream obtained successfully', stream);
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());

      setStage('granted');
      // Wait a bit for user to see the success message
      setTimeout(() => {
        console.log('Camera permission granted, proceeding...');
        onProctoringReady();
      }, 1500);
    } catch (err: any) {
      console.error('Camera permission error:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      
      let errorMsg = 'Failed to access camera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings to continue.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera device found. Please ensure your device has a camera.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is already in use by another application. Please close it and try again.';
      }
      
      setError(errorMsg);
      setStage('denied');
    }
  };

  if (stage === 'granted') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-secondary rounded-lg p-8 max-w-md shadow-xl border border-primary/10 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary mb-2">Camera Access Granted</h2>
          <p className="text-primary/70 mb-6">Your camera is ready for proctoring. Starting exam...</p>
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (stage === 'denied') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-secondary rounded-lg p-8 max-w-md shadow-xl border border-red-500/20">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary mb-2">Camera Access Required</h2>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <p className="text-sm text-primary/70 mb-6">
            To enable proctoring for this exam, you need to allow camera access. 
            <br/><br/>
            <strong>How to fix:</strong>
            <br/>
            1. Click the camera icon in your browser address bar
            <br/>
            2. Select "Always allow"
            <br/>
            3. Try again
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              Exit Exam
            </Button>
            <Button 
              onClick={handleRequestCamera}
              className="flex-1"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'requesting') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-secondary rounded-lg p-8 max-w-md shadow-xl border border-primary/10 text-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary mb-2">Requesting Camera Access</h2>
          <p className="text-primary/70">Please grant camera permission in the browser prompt...</p>
        </div>
      </div>
    );
  }

  // Info stage
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-secondary rounded-lg p-8 max-w-md shadow-xl border border-primary/10">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-primary/10">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Proctoring Enabled</h2>
            <p className="text-sm text-primary/70">Camera required for this exam</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2 text-sm">This exam has AI proctoring enabled:</h3>
            <ul className="space-y-2 text-sm text-primary/80">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>Real-time AI monitoring of eye and head movement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>Automated violation detection (looking away, head turns)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>Events are recorded instantly for instructor review</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Note:</strong> You must grant camera permission to start this exam. Camera access is only used during the exam and will stop when you submit.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            Cancel Exam
          </Button>
          <Button 
            onClick={handleRequestCamera}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Camera className="w-4 h-4 mr-2" />
            Enable Camera
          </Button>
        </div>
      </div>
    </div>
  );
}
