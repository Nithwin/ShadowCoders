import { useEffect, useState, useRef } from 'react';
import { Attempt } from '@/types/exam';

export function useCheatingPrevention(
  attempt: Attempt | null,
  onAutoSubmit: () => void
) {
  const [warningCount, setWarningCount] = useState(0);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const handleSubmitExamRef = useRef<(() => void) | null>(null);
  const lastFocusTimeRef = useRef<number>(Date.now());
  const devToolsOpenRef = useRef<boolean>(false);
  const screenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store submit function in ref for access in other effects
  useEffect(() => {
    handleSubmitExamRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  // Increment warning and auto-submit if needed (defined as ref callback to avoid dependency issues)
  const incrementWarningRef = useRef<() => void>();
  
  useEffect(() => {
    incrementWarningRef.current = () => {
      setWarningCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          if (handleSubmitExamRef.current) {
            handleSubmitExamRef.current();
          }
        } else {
          setFullscreenWarning(true);
          setTimeout(() => setFullscreenWarning(false), 3000);
        }
        return newCount;
      });
    };
  }, []);

  // 1. Detect page visibility changes (tab switching, window minimize)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        incrementWarningRef.current?.();
      }
    };

    const handleBlur = () => {
      // Window lost focus (switched to another app/window)
      incrementWarningRef.current?.();
    };

    const handleFocus = () => {
      // Check if focus was lost for too long
      const timeDiff = Date.now() - lastFocusTimeRef.current;
      if (timeDiff > 2000) {
        incrementWarningRef.current?.();
      }
      lastFocusTimeRef.current = Date.now();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [attempt]);

  // 2. Prevent context menu (right-click)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      incrementWarningRef.current?.();
      return false;
    };

    // Also prevent on touch devices
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        incrementWarningRef.current?.();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [attempt]);

  // 3. Block keyboard shortcuts (Ctrl+Shift+T, Ctrl+T, Ctrl+W, F12, etc.)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block developer tools shortcuts
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'K')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'T') || // Reopen closed tab
        (e.ctrlKey && e.key === 'U') || // View source
        (e.ctrlKey && e.key === 'S') || // Save page
        (e.ctrlKey && e.key === 'P') || // Print
        (e.ctrlKey && e.key === 'W') || // Close tab
        (e.ctrlKey && e.key === 'T') || // New tab
        (e.ctrlKey && e.key === 'N') || // New window
        (e.ctrlKey && e.shiftKey && e.key === 'N') || // New incognito window
        (e.altKey && e.key === 'Tab') || // Alt+Tab
        (e.key === 'PrintScreen') || // Print screen
        (e.shiftKey && e.key === 'PrintScreen') // Shift+PrintScreen
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        incrementWarningRef.current?.();
        return false;
      }

      // Block copy shortcuts (but allow within exam content)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        // Only block if not in input/textarea (allow normal typing)
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        const isContentEditable = target.isContentEditable;
        
        if (!isInput && !isContentEditable) {
          e.preventDefault();
          e.stopPropagation();
          incrementWarningRef.current?.();
          return false;
        }
      }

      // Block paste shortcuts (but allow within exam content)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        // Only block if not in input/textarea (allow normal typing)
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        const isContentEditable = target.isContentEditable;
        
        if (!isInput && !isContentEditable) {
          e.preventDefault();
          e.stopPropagation();
          incrementWarningRef.current?.();
          return false;
        }
      }

      // Block cut shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        const isContentEditable = target.isContentEditable;
        
        if (!isInput && !isContentEditable) {
          e.preventDefault();
          e.stopPropagation();
          incrementWarningRef.current?.();
          return false;
        }
      }

      // Block select all (but allow in inputs)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        const isContentEditable = target.isContentEditable;
        
        if (!isInput && !isContentEditable) {
          e.preventDefault();
          e.stopPropagation();
          incrementWarningRef.current?.();
          return false;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [attempt]);

  // 4. Prevent text selection (except in input fields)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      if (!isInput && !isContentEditable) {
        e.preventDefault();
        return false;
      }
    };

    const handleSelect = (e: Event) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      if (!isInput && !isContentEditable) {
        window.getSelection()?.removeAllRanges();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      if (!isInput && !isContentEditable) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('select', handleSelect);
    document.addEventListener('dragstart', handleDragStart);

    // Disable text selection via CSS
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';

    // Allow selection in inputs and textareas
    const style = document.createElement('style');
    style.textContent = `
      input, textarea, [contenteditable="true"] {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('select', handleSelect);
      document.removeEventListener('dragstart', handleDragStart);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
      document.head.removeChild(style);
    };
  }, [attempt]);

  // 5. Block clipboard API
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      if (!isInput && !isContentEditable) {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', '');
        incrementWarningRef.current?.();
        return false;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      if (!isInput && !isContentEditable) {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', '');
        incrementWarningRef.current?.();
        return false;
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      if (!isInput && !isContentEditable) {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', '');
        incrementWarningRef.current?.();
        return false;
      }
    };

    document.addEventListener('copy', handleCopy, { capture: true });
    document.addEventListener('paste', handlePaste, { capture: true });
    document.addEventListener('cut', handleCut, { capture: true });

    return () => {
      document.removeEventListener('copy', handleCopy, { capture: true });
      document.removeEventListener('paste', handlePaste, { capture: true });
      document.removeEventListener('cut', handleCut, { capture: true });
    };
  }, [attempt]);

  // 6. Detect developer tools (F12, console, etc.)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    let devToolsCheckInterval: NodeJS.Timeout;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        if (!devToolsOpenRef.current) {
          devToolsOpenRef.current = true;
          incrementWarningRef.current?.();
        }
      } else {
        devToolsOpenRef.current = false;
      }
    };

    // Check periodically
    devToolsCheckInterval = setInterval(checkDevTools, 500);

    // Also check on resize
    const handleResize = () => {
      checkDevTools();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(devToolsCheckInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, [attempt]);

  // 7. Detect dual screen/monitor (window position changes)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    let lastScreenX = window.screenX;
    let lastScreenY = window.screenY;
    let lastScreenWidth = window.screen.width;
    let lastScreenHeight = window.screen.height;

    const checkScreenChange = () => {
      const currentScreenX = window.screenX;
      const currentScreenY = window.screenY;
      const currentScreenWidth = window.screen.width;
      const currentScreenHeight = window.screen.height;

      // Detect if window moved to different screen
      if (
        Math.abs(currentScreenX - lastScreenX) > 100 ||
        Math.abs(currentScreenY - lastScreenY) > 100 ||
        currentScreenWidth !== lastScreenWidth ||
        currentScreenHeight !== lastScreenHeight
      ) {
        incrementWarningRef.current?.();
      }

      lastScreenX = currentScreenX;
      lastScreenY = currentScreenY;
      lastScreenWidth = currentScreenWidth;
      lastScreenHeight = currentScreenHeight;
    };

    screenCheckIntervalRef.current = setInterval(checkScreenChange, 1000);

    return () => {
      if (screenCheckIntervalRef.current) {
        clearInterval(screenCheckIntervalRef.current);
      }
    };
  }, [attempt]);

  // 8. Prevent print screen and screenshot attempts
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.shiftKey && e.key === 'PrintScreen')) {
        e.preventDefault();
        incrementWarningRef.current?.();
        // Clear clipboard
        navigator.clipboard?.writeText('').catch(() => {});
      }
    };

    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [attempt]);

  // 9. Disable common browser features
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    // Disable image drag
    const handleImageDrag = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault();
        return false;
      }
    };

    // Disable link opening in new tab
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
        e.preventDefault();
        incrementWarningRef.current?.();
        return false;
      }
    };

    document.addEventListener('dragstart', handleImageDrag);
    document.addEventListener('click', handleLinkClick, { capture: true });

    return () => {
      document.removeEventListener('dragstart', handleImageDrag);
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [attempt]);

  // 10. Monitor for iframe injection (cheating attempts)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const checkForIframes = () => {
      const iframes = document.querySelectorAll('iframe');
      if (iframes.length > 0) {
        // Iframes detected - potential cheating
        incrementWarningRef.current?.();
        iframes.forEach(iframe => {
          iframe.remove();
        });
      }
    };

    const observer = new MutationObserver(checkForIframes);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also check periodically
    const checkInterval = setInterval(checkForIframes, 2000);

    return () => {
      observer.disconnect();
      clearInterval(checkInterval);
    };
  }, [attempt]);

  return {
    warningCount,
    fullscreenWarning,
    setFullscreenWarning,
  };
}

