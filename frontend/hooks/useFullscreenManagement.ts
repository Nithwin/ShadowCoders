import { useState, useEffect, useCallback, useRef } from 'react';
import { enterFullscreen as enterFullscreenUtil, exitFullscreen as exitFullscreenUtil, isFullscreen as isFullscreenUtil } from '@/utils/fullscreenUtils';
import { Attempt } from '@/types/exam';

export function useFullscreenManagement(
  containerRef: React.RefObject<HTMLDivElement | null>,
  attempt: Attempt | null,
  onAutoSubmit: () => void
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const handleSubmitExamRef = useRef<(() => void) | null>(null);

  // Store submit function in ref for access in other effects
  useEffect(() => {
    handleSubmitExamRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    await enterFullscreenUtil(containerRef.current);
  }, [containerRef]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    await exitFullscreenUtil();
  }, []);

  // Check fullscreen on mount and require it
  useEffect(() => {
    const checkFullscreen = () => {
      const isCurrentlyFullscreen = isFullscreenUtil();
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (attempt?.status === 'IN_PROGRESS' && isCurrentlyFullscreen && !hasStarted) {
        setHasStarted(true);
      }
    };

    // Check immediately on mount
    checkFullscreen();
    
    // Also check after a short delay to catch any race conditions
    const timeoutId = setTimeout(checkFullscreen, 100);
    
    return () => clearTimeout(timeoutId);
  }, [attempt, hasStarted]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = isFullscreenUtil();

      const wasFullscreen = isFullscreen;
      setIsFullscreen(isCurrentlyFullscreen);

      if (attempt?.status === 'IN_PROGRESS') {
        if (isCurrentlyFullscreen && !hasStarted) {
          setHasStarted(true);
        } else if (wasFullscreen && !isCurrentlyFullscreen && hasStarted) {
          // If they exit fullscreen after starting, auto-submit
          if (handleSubmitExamRef.current) {
            handleSubmitExamRef.current();
          }
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
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

