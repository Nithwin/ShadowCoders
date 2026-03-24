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
          // DISABLED: Auto-submit on warning limit reached
          // if (handleSubmitExamRef.current) {
          //   handleSubmitExamRef.current(`Auto-submitted due to: ${reason} (Warning limit reached)`);
          // }
          setWarningMessage(`${reason} (Warning limit reached - Please stay on this page!)`);
          setFullscreenWarning(true);
          setTimeout(() => setFullscreenWarning(false), 5000);
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

    // Check if we're in the initial load phase (first 5 seconds) - likely a reload or system noise
    const isInitialLoad = () => {
      return Date.now() - initialLoadTimeRef.current < 5000;
    };

    const handleVisibilityChange = () => {
      // Don't trigger warnings during page reload or initial load
      // Only warn for actual tab switches, not page reloads
      if (isInitialLoad() || isPageReload()) return;

      // WHITELIST: If a dialog/modal is open (like Report Issue), ignore
      if (document.querySelector('[role="dialog"]') || document.querySelector('[data-state="open"]')) {
        return;
      }

      if (document.hidden) {
        incrementWarningRef.current?.('Tab switching or window minimized');
      }
    };

    const handleBlur = () => {
      // Don't trigger warnings during page reload or initial load
      // Only warn for actual tab/window switches, not page reloads
      if (isInitialLoad()) return;

      // WHITELIST: If a dialog/modal is open (like Report Issue), ignore
      if (document.querySelector('[role="dialog"]') || document.querySelector('[data-state="open"]')) {
        return;
      }

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
      // 1. ALLOWED KEYS - Modifier keys alone, Caps Lock, Shift + alphabet
      const modifierKeys = ['Control', 'Ctrl', 'Shift', 'Alt', 'Meta', 'OS'];
      const isModifierKeyOnly = modifierKeys.includes(e.key);

      // Allow modifier keys when pressed alone
      if (isModifierKeyOnly) {
        return; // Allow Ctrl alone, Shift alone, etc.
      }

      // Allow Caps Lock key
      if (e.key === 'CapsLock' || e.key === 'Caps') {
        return; // Allow Caps Lock
      }

      // Allow Shift + alphabet keys (for capitalization)
      if (e.shiftKey && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        return; // Allow Shift + A-Z for capital letters
      }

      // 2. ALLOWED CTRL SHORTCUTS - Allow Ctrl+V, Ctrl+C, Ctrl+A, Ctrl+Z, Ctrl+Y everywhere
      if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        // Allow these shortcuts everywhere (not just in editors)
        if (key === 'v' || key === 'c' || key === 'a' || key === 'z' || key === 'y') {
          return; // Allow - don't block these shortcuts
        }

        // Block Ctrl+S (Save page) even in editors
        if (key === 's') {
          e.preventDefault(); // Prevent browser save dialog
          return; // Don't show warning, just prevent
        }
      }

      // 3. ALLOWED NAVIGATION AND TYPING KEYS - Allow these everywhere
      const allowedNavigationKeys = [
        // Navigation keys
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Home', 'End', 'PageUp', 'PageDown',
        // Editing keys
        'Backspace', 'Delete', 'Insert',
        'Tab', 'Enter', 'Escape',
        // Numbers
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        // Special characters (common ones)
        ' ', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')',
        '-', '_', '=', '+', '[', ']', '{', '}', '\\', '|',
        ';', ':', "'", '"', ',', '.', '<', '>', '/', '?',
        '`', '~',
      ];

      // Allow navigation and editing keys
      if (allowedNavigationKeys.includes(e.key)) {
        return; // Allow these keys
      }

      // 4. ALLOWED SHORTCUTS (Whitelist)
      // Allow standard typing and navigation keys without modifiers
      // This includes all single characters (letters, numbers, special chars)
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        return;
      }

      // 4. BLOCK EVERYTHING ELSE WITH MODIFIERS
      // This catches Alt+S (Blackbox), Ctrl+Shift+I (DevTools), Ctrl+P (Print), etc.
      // Note: Modifier keys alone are already handled above, so we only get here if
      // a modifier is pressed WITH another non-modifier key
      // Examples: Ctrl+T, Ctrl+Shift+I, Alt+Tab, Ctrl+Space, etc.
      // BUT: Allow specific Ctrl shortcuts (V, C, A, Z, Y) - already handled above
      if (e.ctrlKey || e.altKey || e.metaKey) {
        // Double-check: Allow Ctrl+V, Ctrl+C, Ctrl+A, Ctrl+Z, Ctrl+Y (already allowed above, but check again)
        if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
          const key = e.key.toLowerCase();
          if (key === 'v' || key === 'c' || key === 'a' || key === 'z' || key === 'y') {
            return; // Allow these shortcuts - don't block
          }
        }

        // BLOCK: Ctrl+Space, Alt+Space, Ctrl+Shift (any key with Ctrl+Shift)
        if ((e.ctrlKey && (e.key === ' ' || e.key === 'Space')) ||
          (e.altKey && (e.key === ' ' || e.key === 'Space')) ||
          (e.ctrlKey && e.shiftKey)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          incrementWarningRef.current?.(
            e.ctrlKey && e.shiftKey
              ? 'Restricted shortcut: Ctrl+Shift'
              : e.ctrlKey
                ? 'Restricted shortcut: Ctrl+Space'
                : 'Restricted shortcut: Alt+Space'
          );
          return false;
        }

        // Handle Space key explicitly (can be ' ' or 'Space')
        const keyName = e.key === ' ' || e.key === 'Space' ? 'Space' : e.key;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Specific messages for clarity
        let reason = 'Restricted shortcut used';

        // Detailed logging for clearer feedback
        if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
          reason = 'Screenshot Shortcut (Win+Shift+S)';
        } else if (e.ctrlKey && (e.key === ' ' || e.key === 'Space')) {
          reason = 'Restricted shortcut: Ctrl+Space';
        } else if (e.altKey) {
          reason = 'Browser extension shortcuts are disabled (Alt key)';
        } else if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')) {
          reason = 'Developer Tools are disabled';
        } else {
          // Construct readable shortcut name
          const parts = [];
          if (e.ctrlKey) parts.push('Ctrl');
          if (e.altKey) parts.push('Alt');
          if (e.metaKey) parts.push('Win/Cmd');
          if (e.shiftKey) parts.push('Shift');
          if (keyName && !modifierKeys.includes(keyName)) {
            parts.push(keyName === 'Space' ? 'Space' : keyName.toUpperCase());
          }
          reason = `Restricted shortcut: ${parts.join('+')}`;
        }

        incrementWarningRef.current?.(reason);
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
      navigator.clipboard?.writeText('').catch(() => { });
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
        navigator.clipboard?.writeText('').catch(() => { });
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

