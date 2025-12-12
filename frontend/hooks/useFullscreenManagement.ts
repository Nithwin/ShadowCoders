import { useState, useEffect, useCallback, useRef } from 'react';
import { enterFullscreen as enterFullscreenUtil, exitFullscreen as exitFullscreenUtil, isFullscreen as isFullscreenUtil } from '@/utils/fullscreenUtils';
import { Attempt } from '@/types/exam';

export function useFullscreenManagement(
  containerRef: React.RefObject<HTMLDivElement | null>,
  attempt: Attempt | null,
  onAutoSubmit: (reason: string) => void,
  isSubmitting: boolean = false
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const handleSubmitExamRef = useRef<((reason: string) => void) | null>(null);
  const isSubmittingRef = useRef(isSubmitting);

  // Store submit function in ref for access in other effects
  useEffect(() => {
    handleSubmitExamRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  // Update ref when isSubmitting changes
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    // URL: Use document.documentElement instead of specific container
    // This ensures that React Portals (Modals/Dialogs) attached to body are visible
    await enterFullscreenUtil(document.documentElement);
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    await exitFullscreenUtil();
  }, []);

  // Reset hasStarted when attempt changes (important for reattempts)
  // Also reset when attempt status changes to ensure clean state
  useEffect(() => {
    if (attempt?.id) {
      setHasStarted(false);
    }
  }, [attempt?.id, attempt?.status]);

  // Check fullscreen on mount and require it
  useEffect(() => {
    const checkFullscreen = () => {
      const isCurrentlyFullscreen = isFullscreenUtil();
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Only set hasStarted if we're in fullscreen and the attempt is IN_PROGRESS
      // But use a small delay to avoid race conditions with the change handler
      if (attempt?.status === 'IN_PROGRESS' && isCurrentlyFullscreen && !hasStarted) {
        // Use a timeout to ensure this doesn't conflict with the change handler
        setTimeout(() => {
          // Double-check that we're still in fullscreen and hasn't been set by change handler
          if (isFullscreenUtil() && !hasStarted) {
            setHasStarted(true);
          }
        }, 150);
      }
    };

    // Check immediately on mount
    checkFullscreen();
    
    // Also check after a short delay to catch any race conditions
    const timeoutId = setTimeout(checkFullscreen, 200);
    
    return () => clearTimeout(timeoutId);
  }, [attempt, hasStarted]);

  // Fullscreen change handler
  useEffect(() => {
    let exitTimeoutId: NodeJS.Timeout | null = null;
    
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = isFullscreenUtil();

      const wasFullscreen = isFullscreen;
      setIsFullscreen(isCurrentlyFullscreen);

      // Clear any pending exit timeout (user might have re-entered fullscreen)
      if (exitTimeoutId) {
        clearTimeout(exitTimeoutId);
        exitTimeoutId = null;
      }

      if (attempt?.status === 'IN_PROGRESS' && !isSubmittingRef.current) {
        // Entering fullscreen - set hasStarted after a small delay
        if (isCurrentlyFullscreen && !hasStarted) {
          setTimeout(() => {
            // Double-check we're still in fullscreen before setting hasStarted
            if (isFullscreenUtil() && !isSubmittingRef.current) {
              setHasStarted(true);
            }
          }, 150);
        } 
        // Exiting fullscreen - only auto-submit if they were already in fullscreen AND had started
        else if (wasFullscreen && !isCurrentlyFullscreen && hasStarted) {
          // Use a longer delay to avoid false positives from browser fullscreen event quirks
          // Some browsers fire multiple events when entering/exiting fullscreen
          exitTimeoutId = setTimeout(() => {
            const stillNotFullscreen = !isFullscreenUtil();
            // Triple-check: still not fullscreen, not submitting, and had started
            if (stillNotFullscreen && !isSubmittingRef.current && handleSubmitExamRef.current) {
              handleSubmitExamRef.current('Exited fullscreen mode');
            }
            exitTimeoutId = null;
          }, 300);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      if (exitTimeoutId) {
        clearTimeout(exitTimeoutId);
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [attempt, isFullscreen, hasStarted, enterFullscreen]);

  return {
    isFullscreen,
    fullscreenWarning,
    setFullscreenWarning,
    hasStarted,
    enterFullscreen,
    exitFullscreen,
  };
}

