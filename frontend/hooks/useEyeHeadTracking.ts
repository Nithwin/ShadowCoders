import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';

interface EyeTrackingOptions {
  attemptId: string;
  enabled: boolean;
  onViolation?: (type: string, description: string) => void;
  warningThreshold?: number; // Show warning after N violations
  severityLevels?: {
    low: number;
    medium: number;
    high: number;
  };
}

interface TrackingViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: number;
}

export function useEyeHeadTracking(options: EyeTrackingOptions) {
  const {
    attemptId,
    enabled,
    onViolation,
    warningThreshold = 3,
    severityLevels = { low: 2, medium: 5, high: 10 }
  } = options;

  const [violations, setViolations] = useState<TrackingViolation[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastViolationTimeRef = useRef<number>(0);
  const violationCountRef = useRef(0);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Record a violation to the backend
   */
  const recordViolation = useCallback(async (
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metadata?: Record<string, any>
  ) => {
    try {
      await axios.post('/api/proctoring/events', {
        attemptId,
        eventType,
        severity,
        description,
        metadata,
      });
    } catch (error) {
      console.error('Failed to record proctoring event:', error);
    }
  }, [attemptId]);

  /**
   * Handle a tracking violation
   */
  const handleViolation = useCallback((
    type: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    const now = Date.now();
    
    // Debounce violations (prevent spamming)
    if (now - lastViolationTimeRef.current < 2000) {
      return;
    }
    lastViolationTimeRef.current = now;

    violationCountRef.current += 1;

    const violation: TrackingViolation = {
      type,
      severity,
      description,
      timestamp: now,
    };

    setViolations(prev => [...prev, violation]);

    // Record to backend
    recordViolation(type, severity, description, {
      violationCount: violationCountRef.current,
      timestamp: new Date().toISOString(),
    });

    // Show warning
    if (violationCountRef.current >= warningThreshold) {
      setWarningMessage(description);
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
    }

    // Call optional callback
    if (onViolation) {
      onViolation(type, description);
    }
  }, [recordViolation, onViolation, warningThreshold]);

  /**
   * Analyze frame for face and eye detection using basic computer vision
   */
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Basic face detection using brightness analysis
    // This is a simplified approach - for production, consider using TensorFlow.js or face-api.js
    const { data } = imageData;
    let brightPixels = 0;
    let darkPixels = 0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const regionSize = Math.min(canvas.width, canvas.height) / 3;

    // Analyze center region for face presence
    for (let y = centerY - regionSize / 2; y < centerY + regionSize / 2; y += 2) {
      for (let x = centerX - regionSize / 2; x < centerX + regionSize / 2; x += 2) {
        const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (brightness > 150) brightPixels++;
        if (brightness < 80) darkPixels++;
      }
    }

    const totalPixels = (regionSize * regionSize) / 4;
    const brightRatio = brightPixels / totalPixels;
    const darkRatio = darkPixels / totalPixels;

    // Heuristic: If center region is mostly bright or mostly dark, face might not be centered
    if (brightRatio > 0.7) {
      handleViolation(
        'LOOKING_AWAY',
        'Please keep your face centered in the camera view',
        'medium'
      );
    } else if (darkRatio > 0.6) {
      handleViolation(
        'FACE_NOT_DETECTED',
        'Face not detected - please ensure proper lighting',
        'high'
      );
    }

    // Check for extreme brightness changes (head movement)
    const avgBrightness = data.reduce((sum, val, idx) => 
      idx % 4 === 3 ? sum : sum + val, 0
    ) / (data.length * 0.75);

    if (avgBrightness < 50) {
      handleViolation(
        'HEAD_TURNED_AWAY',
        'Please keep your head facing forward',
        'medium'
      );
    }

  }, [handleViolation]);

  /**
   * Start camera and tracking
   */
  const startTracking = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraPermission('granted');
      setIsTracking(true);

      // Start frame analysis at 2 FPS (every 500ms)
      detectionIntervalRef.current = setInterval(analyzeFrame, 500);

    } catch (error: any) {
      console.error('Failed to access camera:', error);
      setCameraPermission('denied');
      
      // Record permission denial
      recordViolation(
        'FACE_NOT_DETECTED',
        'critical',
        'Camera access denied or unavailable',
        { error: error.message }
      );
    }
  }, [analyzeFrame, recordViolation]);

  /**
   * Stop tracking and release camera
   */
  const stopTracking = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTracking(false);
  }, []);

  /**
   * Get current violation summary
   */
  const getViolationSummary = useCallback(() => {
    const eyeViolations = violations.filter(v => 
      v.type.includes('EYE') || v.type === 'LOOKING_AWAY'
    ).length;

    const headViolations = violations.filter(v => 
      v.type.includes('HEAD') || v.type === 'HEAD_TURNED_AWAY'
    ).length;

    const faceViolations = violations.filter(v => 
      v.type.includes('FACE')
    ).length;

    return {
      total: violations.length,
      eye: eyeViolations,
      head: headViolations,
      face: faceViolations,
      violations,
    };
  }, [violations]);

  /**
   * Initialize tracking when enabled
   */
  useEffect(() => {
    if (enabled && attemptId) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, attemptId, startTracking, stopTracking]);

  return {
    isTracking,
    cameraPermission,
    violations,
    violationCount: violationCountRef.current,
    showWarning,
    warningMessage,
    videoRef,
    canvasRef,
    startTracking,
    stopTracking,
    getViolationSummary,
  };
}
