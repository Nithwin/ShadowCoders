import { useEffect, useState, useRef } from 'react';
import { Attempt } from '@/types/exam';

export function useCheatingPrevention(
  attempt: Attempt | null,
  onAutoSubmit: () => void
) {
  const [warningCount, setWarningCount] = useState(0);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const handleSubmitExamRef = useRef<(() => void) | null>(null);

  // Store submit function in ref for access in other effects
  useEffect(() => {
    handleSubmitExamRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  // Detect page visibility changes (tab switching)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            if (handleSubmitExamRef.current) {
              handleSubmitExamRef.current();
            }
          } else {
            setFullscreenWarning(true);
            setTimeout(() => setFullscreenWarning(false), 2000);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attempt]);

  // Prevent context menu and certain keys
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        setWarningCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            if (handleSubmitExamRef.current) {
              handleSubmitExamRef.current();
            }
          }
          return newCount;
        });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [attempt]);

  return {
    warningCount,
    fullscreenWarning,
    setFullscreenWarning,
  };
}

