import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';

// MediaPipe Face Landmarker imports
let FaceLandmarker: any;
let FilesetResolver: any;
let DrawingUtils: any;

// Dynamically import MediaPipe (browser-only)
if (typeof window !== 'undefined') {
  import('@mediapipe/tasks-vision').then((module) => {
    FaceLandmarker = module.FaceLandmarker;
    FilesetResolver = module.FilesetResolver;
    DrawingUtils = module.DrawingUtils;
  });
}

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

// Eye landmark indices for EAR calculation
const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

// Nose tip landmark for gaze estimation
const NOSE_TIP = 1;
const LEFT_EYE_CENTER = 468;
const RIGHT_EYE_CENTER = 473;

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastViolationTimeRef = useRef<number>(0);
  const violationCountRef = useRef(0);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const modelLoadingRef = useRef<boolean>(false);
  const useFallbackRef = useRef<boolean>(false);
  
  // Eye closure tracking for blink detection
  const eyeClosureStartRef = useRef<number | null>(null); // When eyes closed timestamp
  const lastEyeClosureViolationRef = useRef<number>(0); // Debounce eye closure violations

  /**
   * Calculate Eye Aspect Ratio (EAR) for blink/closed eye detection
   */
  const calculateEAR = useCallback((landmarks: any[], indices: number[]): number => {
    try {
      // EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
      const p1 = landmarks[indices[0]];
      const p2 = landmarks[indices[1]];
      const p3 = landmarks[indices[2]];
      const p4 = landmarks[indices[3]];
      const p5 = landmarks[indices[4]];
      const p6 = landmarks[indices[5]];

      const vertical1 = Math.sqrt(
        Math.pow(p2.x - p6.x, 2) +
        Math.pow(p2.y - p6.y, 2) +
        Math.pow(p2.z - p6.z, 2)
      );

      const vertical2 = Math.sqrt(
        Math.pow(p3.x - p5.x, 2) +
        Math.pow(p3.y - p5.y, 2) +
        Math.pow(p3.z - p5.z, 2)
      );

      const horizontal = Math.sqrt(
        Math.pow(p1.x - p4.x, 2) +
        Math.pow(p1.y - p4.y, 2) +
        Math.pow(p1.z - p4.z, 2)
      );

      return (vertical1 + vertical2) / (2.0 * horizontal);
    } catch (error) {
      return 0.3; // Return normal EAR if calculation fails
    }
  }, []);

  /**
   * Calculate head pose angles (yaw, pitch)
   */
  const calculateHeadPose = useCallback((landmarks: any[]): { yaw: number; pitch: number } => {
    try {
      // Use nose tip and eye centers to estimate head rotation
      const noseTip = landmarks[NOSE_TIP];
      const leftEye = landmarks[LEFT_EYE_CENTER];
      const rightEye = landmarks[RIGHT_EYE_CENTER];

      // Calculate yaw (horizontal rotation) based on eye positions relative to nose
      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const yaw = (noseTip.x - eyeCenterX) * 100; // Scale for degrees

      // Calculate pitch (vertical tilt) based on nose y position
      const eyeCenterY = (leftEye.y + rightEye.y) / 2;
      const pitch = (noseTip.y - eyeCenterY) * 100;

      return { yaw, pitch };
    } catch (error) {
      return { yaw: 0, pitch: 0 };
    }
  }, []);

  /**
   * Calculate gaze direction estimation
   */
  const calculateGazeDirection = useCallback((landmarks: any[]): { horizontal: number; vertical: number } => {
    try {
      const noseTip = landmarks[NOSE_TIP];
      const leftEye = landmarks[LEFT_EYE_CENTER];
      const rightEye = landmarks[RIGHT_EYE_CENTER];

      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const eyeCenterY = (leftEye.y + rightEye.y) / 2;

      // Calculate deviation from center
      const horizontal = Math.abs(noseTip.x - eyeCenterX);
      const vertical = Math.abs(noseTip.y - eyeCenterY);

      return { horizontal, vertical };
    } catch (error) {
      return { horizontal: 0, vertical: 0 };
    }
  }, []);

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
      await api.post('/proctoring/events', {
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
   * Analyze frame for face and eye detection using MediaPipe Face Landmarker
   */
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('⚠️ No video or canvas ref');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.log('⚠️ Video not ready, readyState:', video.readyState);
      return;
    }

    // Check if we should use MediaPipe or fallback to basic detection
    if (useFallbackRef.current || !faceLandmarkerRef.current) {
      console.log('⚠️ Using fallback detection (MediaPipe not loaded)');
      // Use basic fallback detection
      analyzeFrameBasic();
      return;
    }

    try {
      const startTimeMs = performance.now();
      
      // Detect for video mode
      if (video.currentTime === lastVideoTimeRef.current) {
        return; // Same frame, skip
      }
      lastVideoTimeRef.current = video.currentTime;

      const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

      // Check number of faces detected
      if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
        handleViolation(
          'FACE_NOT_DETECTED',
          'No face detected - please ensure you are visible in the camera',
          'high'
        );
        return;
      }

      if (results.faceLandmarks.length > 1) {
        handleViolation(
          'MULTIPLE_FACES_DETECTED',
          'Multiple faces detected - only you should be visible',
          'critical'
        );
        return;
      }

      // Analyze the detected face
      const landmarks = results.faceLandmarks[0];

      // 1. Eye Aspect Ratio - Detect sustained eye closure (not blinks)
      const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
      const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
      const avgEAR = (leftEAR + rightEAR) / 2;

      // Eyes are closed if EAR < 0.18
      const eyesClosed = avgEAR < 0.18;
      const now = Date.now();

      if (eyesClosed) {
        // Eyes just closed - start tracking
        if (eyeClosureStartRef.current === null) {
          eyeClosureStartRef.current = now;
        }

        // Check if eyes have been closed for more than 1 second (not a blink)
        const closureDuration = now - eyeClosureStartRef.current;
        if (closureDuration > 1000) {
          // Only report violation once per closure event (debounce)
          if (now - lastEyeClosureViolationRef.current > 3000) {
            handleViolation(
              'EYES_CLOSED',
              'Eyes appear to be closed - please keep your eyes open',
              'medium'
            );
            lastEyeClosureViolationRef.current = now;
          }
        }
      } else {
        // Eyes are open - reset closure timer
        eyeClosureStartRef.current = null;
      }

      // 2. Gaze Direction - Detect looking away
      const gazeDirection = calculateGazeDirection(landmarks);
      if (gazeDirection.horizontal > 0.15 || gazeDirection.vertical > 0.15) {
        handleViolation(
          'LOOKING_AWAY',
          'Please keep your eyes on the screen',
          'medium'
        );
      }

      // 3. Head Pose - Detect head turned away
      const headPose = calculateHeadPose(landmarks);
      if (Math.abs(headPose.yaw) > 35) {
        handleViolation(
          'HEAD_TURNED_AWAY',
          'Please keep your head facing forward',
          'medium'
        );
      }

      if (Math.abs(headPose.pitch) > 30) {
        handleViolation(
          'HEAD_TURNED_AWAY',
          'Please keep your head level with the camera',
          'medium'
        );
      }

    } catch (error) {
      console.error('Error in MediaPipe face detection:', error);
      // Fall back to basic detection on error
      useFallbackRef.current = true;
      analyzeFrameBasic();
    }
  }, [handleViolation, calculateEAR, calculateGazeDirection, calculateHeadPose]);

  /**
   * Basic fallback face detection using brightness analysis
   */
  const analyzeFrameBasic = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
          'low'
        );
      } else if (darkRatio > 0.6) {
        handleViolation(
          'FACE_NOT_DETECTED',
          'Face not detected - please ensure proper lighting',
          'medium'
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
          'low'
        );
      }
    } catch (error) {
      console.error('Error in basic face detection:', error);
    }
  }, [handleViolation]);

  /**
   * Load MediaPipe Face Landmarker model
   */
  const loadFaceLandmarker = useCallback(async () => {
    if (modelLoadingRef.current || faceLandmarkerRef.current || !FaceLandmarker || !FilesetResolver) {
      return;
    }

    modelLoadingRef.current = true;

    try {
      console.log('Loading MediaPipe Face Landmarker...');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 2, // Detect up to 2 faces (to catch multiple people)
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      console.log('✅ MediaPipe Face Landmarker loaded successfully');
      useFallbackRef.current = false;
      modelLoadingRef.current = false;
      return true;
    } catch (error) {
      console.error('❌ Failed to load MediaPipe Face Landmarker:', error);
      console.log('⚠️ Falling back to basic face detection');
      useFallbackRef.current = true;
      faceLandmarkerRef.current = null;
      modelLoadingRef.current = false;
      return false;
    }
  }, []);

  /**
   * Start camera and tracking
   */
  const startTracking = useCallback(async () => {
    try {
      // Load MediaPipe model first
      await loadFaceLandmarker();

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

      console.log('✅ Camera started successfully');

      // Start frame analysis at 3 FPS (every 333ms) for good balance of accuracy and performance
      detectionIntervalRef.current = setInterval(() => {
        console.log('🔍 Analyzing frame...');
        analyzeFrame();
      }, 333);

      console.log('✅ Detection interval started (3 FPS)');

    } catch (error: any) {
      console.error('Failed to access camera:', error);
      setCameraPermission('denied');
      
      let errorDesc = 'Camera access denied or unavailable';
      if (error.name === 'NotReadableError') {
        errorDesc = 'Camera is in use by another application';
      } else if (error.name === 'NotAllowedError') {
        errorDesc = 'Camera permission denied';
      }

      // Record permission denial
      recordViolation(
        'FACE_NOT_DETECTED',
        'critical',
        errorDesc,
        { error: error.message, name: error.name }
      );
    }
  }, [analyzeFrame, recordViolation, loadFaceLandmarker]);

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

    // Clean up MediaPipe resources
    if (faceLandmarkerRef.current) {
      try {
        faceLandmarkerRef.current.close();
      } catch (error) {
        console.error('Error closing face landmarker:', error);
      }
      faceLandmarkerRef.current = null;
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
      console.log('🎥 Starting eye tracking for attempt:', attemptId);
      console.log('📹 Waiting for video element to be ready...');
      
      // Wait a bit for React to render the video element in EyeTrackingMonitor
      const timer = setTimeout(() => {
        if (videoRef.current) {
          console.log('✅ Video element found, starting tracking');
          startTracking();
        } else {
          console.error('❌ Video element not found after waiting');
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        console.log('🛑 Stopping eye tracking');
        stopTracking();
      };
    }
  }, [enabled, attemptId]); // Remove function dependencies to prevent infinite loop

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
