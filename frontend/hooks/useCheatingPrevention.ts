import { useEffect, useState, useRef } from 'react';
import { Attempt } from '@/types/exam';

export function useCheatingPrevention(
  attempt: Attempt | null,
  onAutoSubmit: (reason: string) => void,
  maxTabSwitches: number | null = 3
) {
  const [warningCount, setWarningCount] = useState(0);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string>('');
  const handleSubmitExamRef = useRef<((reason: string) => void) | null>(null);
  const lastFocusTimeRef = useRef<number>(Date.now());
  const devToolsOpenRef = useRef<boolean>(false);
  const screenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadTimeRef = useRef<number>(Date.now());

  // Store submit function in ref for access in other effects
  useEffect(() => {
    handleSubmitExamRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  const lastWarningTimeRef = useRef<number>(0);

  // Increment warning and auto-submit if needed (defined as ref callback to avoid dependency issues)
  const incrementWarningRef = useRef<((reason: string) => void) | undefined>(undefined);
  
  useEffect(() => {
    incrementWarningRef.current = (reason: string) => {
      const now = Date.now();
      // Debounce warnings (prevent double counting from multiple events like blur + visibilitychange)
      if (now - lastWarningTimeRef.current < 500) {
        return;
      }
      lastWarningTimeRef.current = now;

      setWarningCount(prev => {
        const newCount = prev + 1;
        const limit = maxTabSwitches === 0 ? Infinity : (maxTabSwitches ?? 3); // 0 means unlimited
        
        if (limit !== Infinity && newCount >= limit) {
          if (handleSubmitExamRef.current) {
            handleSubmitExamRef.current(`Auto-submitted due to: ${reason} (Warning limit reached)`);
          }
        } else {
          setWarningMessage(reason);
          setFullscreenWarning(true);
          setTimeout(() => setFullscreenWarning(false), 3000);
        }
        return newCount;
      });
    };
  }, [maxTabSwitches]);


  // 1. Detect page visibility changes (tab switching, window minimize)
  // Only trigger warnings for tab switches, NOT page reloads
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    // Check if page was reloaded (only works after page loads)
    const isPageReload = () => {
      if (typeof window === 'undefined' || typeof performance === 'undefined') return false;
      
      // Modern API
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        return navigationEntries[0].type === 'reload';
      }
      
      // Fallback for older browsers
      if ('navigation' in performance && (performance as any).navigation) {
        return (performance as any).navigation.type === 1; // RELOAD = 1
      }
      
      return false;
    };

    // Check if we're in the initial load phase (first 2 seconds) - likely a reload
    const isInitialLoad = () => {
      return Date.now() - initialLoadTimeRef.current < 2000;
    };

    const handleVisibilityChange = () => {
      // Don't trigger warnings during page reload or initial load
      // Only warn for actual tab switches, not page reloads
      if (isInitialLoad() || isPageReload()) return;
      
      if (document.hidden) {
        incrementWarningRef.current?.('Tab switching or window minimized');
      }
    };

    const handleBlur = () => {
      // Don't trigger warnings during page reload or initial load
      // Only warn for actual tab/window switches, not page reloads
      if (isInitialLoad()) return;
      
      // Window lost focus (switched to another app/window or tab)
      incrementWarningRef.current?.('Window lost focus');
    };

    const handleFocus = () => {
      // Don't trigger warnings during page reload or initial load
      if (isInitialLoad()) {
        lastFocusTimeRef.current = Date.now();
        return;
      }
      
      // Check if focus was lost for too long (tab switch detection)
      // This detects when user switches tabs and comes back
      const timeDiff = Date.now() - lastFocusTimeRef.current;
      if (timeDiff > 2000) {
        incrementWarningRef.current?.('Focus lost for too long');
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
      incrementWarningRef.current?.('Right-click context menu attempted');
      return false;
    };

    // Also prevent on touch devices
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        incrementWarningRef.current?.('Multi-touch gesture attempted');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [attempt]);

  // 3. Block keyboard shortcuts (Stricter blocking for extensions)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. ALLOWED SHORTCUTS (Whitelist)
      // Allow standard typing and navigation keys without modifiers
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        return; 
      }

      // Allow Undo/Redo (Ctrl+Z, Ctrl+Y) AND Save (Ctrl+S)
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        if (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 's') {
          if (e.key.toLowerCase() === 's') {
             e.preventDefault(); // Prevent browser save dialog
          }
          return;
        }
      }

      // Allow Copy/Paste/Cut/SelectAll ONLY inside Editor/Input
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'c' || key === 'v' || key === 'x' || key === 'a') {
           const target = e.target as HTMLElement;
           const activeElement = document.activeElement as HTMLElement;
           const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
           const isContentEditable = target.isContentEditable || activeElement?.isContentEditable;
           
           // Check if inside Monaco editor
           const checkMonaco = (el: HTMLElement | null): boolean => {
             if (!el) return false;
             return el.closest('.monaco-editor') !== null ||
                    el.closest('[class*="monaco"]') !== null ||
                    el.closest('[data-uri]') !== null ||
                    (el.isContentEditable && el.closest('.view-lines') !== null) ||
                    (el.ownerDocument !== document && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA');
           };
           
           const isMonacoEditor = checkMonaco(target) || checkMonaco(activeElement);
           
           if (isInput || isContentEditable || isMonacoEditor) {
             return; // Allow inside editor
           }
        }
      }

      // 2. BLOCK EVERYTHING ELSE WITH MODIFIERS
      // This catches Alt+S (Blackbox), Ctrl+Shift+I (DevTools), Ctrl+P (Print), etc.
      if (e.ctrlKey || e.altKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Specific messages for clarity
        let reason = 'Restricted shortcut used';
        if (e.altKey) reason = 'Browser extension shortcuts are disabled (Alt key)';
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) reason = 'Developer Tools are disabled';
        
        incrementWarningRef.current?.(`${reason}: ${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key.toUpperCase()}`);
        return false;
      }

      // Block F-keys
      if (e.key.startsWith('F') && e.key.length > 1) {
         e.preventDefault();
         incrementWarningRef.current?.(`Restricted key: ${e.key}`);
         return false;
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
    // @ts-expect-error - Vendor prefix properties
    document.body.style.mozUserSelect = 'none';
    // @ts-expect-error - Vendor prefix properties
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
      // @ts-expect-error - Vendor prefix properties
      document.body.style.mozUserSelect = '';
      // @ts-expect-error - Vendor prefix properties
      document.body.style.msUserSelect = '';
      document.head.removeChild(style);
    };
  }, [attempt]);

  // 5. Block clipboard API (Strict Mode)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    // Clear clipboard on mount AND on focus
    const clearClipboard = () => {
       navigator.clipboard?.writeText('').catch(() => {});
    };
    
    clearClipboard();
    window.addEventListener('focus', clearClipboard);

    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      // Allow copy ONLY from within inputs/editors
      if (!isInput && !isContentEditable) {
        // Check if inside Monaco editor
        const isMonacoEditor = target.closest('.monaco-editor') !== null ||
                              target.closest('[class*="monaco"]') !== null ||
                              target.closest('[data-uri]') !== null ||
                              (target.ownerDocument !== document && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA');

        if (!isMonacoEditor) {
          e.preventDefault();
          e.clipboardData?.setData('text/plain', '');
          incrementWarningRef.current?.('Copying from outside editor is restricted');
          return false;
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      // We can't easily detect source of paste in web, 
      // BUT since we clear clipboard on focus (window switch), 
      // external content should be gone.
      // We just need to ensure they are pasting INTO an editor.
      
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      // Check if inside Monaco editor
      const isMonacoEditor = target.closest('.monaco-editor') !== null ||
                            target.closest('[class*="monaco"]') !== null ||
                            target.closest('[data-uri]') !== null ||
                            (target.ownerDocument !== document && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA');

      if (!isInput && !isContentEditable && !isMonacoEditor) {
          e.preventDefault();
          incrementWarningRef.current?.('Pasting outside editor is restricted');
          return false;
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      if (!isInput && !isContentEditable) {
        // Check if inside Monaco editor
        const isMonacoEditor = target.closest('.monaco-editor') !== null ||
                              target.closest('[class*="monaco"]') !== null ||
                              target.closest('[data-uri]') !== null ||
                              (target.ownerDocument !== document && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA');

        if (!isMonacoEditor) {
          e.preventDefault();
          e.clipboardData?.setData('text/plain', '');
          incrementWarningRef.current?.('Cutting from outside editor is restricted');
          return false;
        }
      }
    };

    document.addEventListener('copy', handleCopy, { capture: true });
    document.addEventListener('paste', handlePaste, { capture: true });
    document.addEventListener('cut', handleCut, { capture: true });

    return () => {
      window.removeEventListener('focus', clearClipboard);
      document.removeEventListener('copy', handleCopy, { capture: true });
      document.removeEventListener('paste', handlePaste, { capture: true });
      document.removeEventListener('cut', handleCut, { capture: true });
    };
  }, [attempt]);

  // 6. Detect developer tools (F12, console, etc.)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    let devToolsCheckInterval: NodeJS.Timeout | null = null;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        if (!devToolsOpenRef.current) {
          devToolsOpenRef.current = true;
          incrementWarningRef.current?.('Developer Tools detected');
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
      if (devToolsCheckInterval) {
        clearInterval(devToolsCheckInterval);
        devToolsCheckInterval = null; // Clear ref to prevent memory leak
      }
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
        incrementWarningRef.current?.('Screen configuration changed (External monitor?)');
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
        screenCheckIntervalRef.current = null; // Clear ref to prevent memory leak
      }
    };
  }, [attempt]);

  // 8. Prevent print screen and screenshot attempts
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.shiftKey && e.key === 'PrintScreen')) {
        e.preventDefault();
        incrementWarningRef.current?.('Screenshot attempt detected');
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
        incrementWarningRef.current?.('Opening links in new tab is restricted');
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
        incrementWarningRef.current?.('Unauthorized iframe detected');
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
    warningMessage,
    setFullscreenWarning,
  };
}

