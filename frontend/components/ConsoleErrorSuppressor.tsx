'use client';

import { useEffect } from 'react';

/**
 * Global console error suppressor for expected errors
 * Suppresses:
 * - 404 errors for attempt endpoints (attempts may not exist or be deleted)
 * - Socket transport close messages (normal during navigation/reload)
 * - CSS parsing errors from Tailwind CSS v4 (expected in development)
 * - WebSocket connection errors (handled by reconnection logic)
 */
export default function ConsoleErrorSuppressor() {
  useEffect(() => {
    // Store original console methods
    const originalError = console.error;
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    // Override console.error to filter expected errors
    console.error = (...args: any[]) => {
      // Convert all args to strings for pattern matching
      const errorStr = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            // Check for AxiosError properties
            if (arg.response?.status === 404 || arg.code === 'ERR_BAD_REQUEST') {
              return 'AXIOS_404_ERROR';
            }
            // Check URL in config
            if (arg.config?.url?.includes('/admin/attempts/') || 
                arg.config?.url?.includes('/api/admin/attempts/')) {
              return 'ATTEMPT_ENDPOINT';
            }
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      // Suppress CSS parsing errors (common with Tailwind CSS v4)
      const isCSSParsingError = errorStr.includes('Error in parsing value for') ||
                                errorStr.includes('Declaration dropped') ||
                                errorStr.includes('-webkit-text-size-adjust') ||
                                errorStr.includes('letter-spacing') ||
                                errorStr.includes('font-size');
      if (isCSSParsingError) {
        return; // Don't log CSS parsing errors - they're expected with Tailwind CSS v4
      }
      
      // Suppress WebSocket connection errors (handled by reconnection logic)
      const isWebSocketError = errorStr.includes('WebSocket') ||
                               errorStr.includes('websocket') ||
                               errorStr.includes('socket.io') ||
                               errorStr.includes('ws://') ||
                               errorStr.includes('wss://') ||
                               errorStr.includes('Connection error') ||
                               errorStr.includes('can\'t establish a connection');
      if (isWebSocketError) {
        return; // Don't log WebSocket errors - they're handled by reconnection logic
      }
      
      // Check if this is a 404 error for attempt endpoints
      const firstArg = args[0];
      const is404 = firstArg?.response?.status === 404 || 
                    firstArg?.code === 'ERR_BAD_REQUEST' ||
                    errorStr.includes('404') ||
                    errorStr.includes('ERR_BAD_REQUEST') ||
                    errorStr.includes('Request failed with status code 404') ||
                    errorStr === 'AXIOS_404_ERROR';
      const isAttemptEndpoint = firstArg?.config?.url?.includes('/admin/attempts/') ||
                               firstArg?.config?.url?.includes('/api/admin/attempts/') ||
                               errorStr.includes('/admin/attempts/') ||
                               errorStr.includes('/api/admin/attempts/') ||
                               errorStr.includes('Error fetching attempt details') ||
                               errorStr.includes('attempts/') ||
                               errorStr === 'ATTEMPT_ENDPOINT';
      
      // Suppress 404 errors specifically for attempt endpoints
      if (is404 && isAttemptEndpoint) {
        return; // Don't log this error - it's expected behavior
      }
      
      // Suppress "Violation not found" socket errors - these are expected when force-submitting
      const isViolationNotFound = errorStr.includes('Violation not found') || 
                                  errorStr.includes('violation not found');
      if (isViolationNotFound) {
        return; // Don't log this error - it's expected when force-submitting via API
      }
      
      // Suppress 403 errors for already submitted attempts (expected when admin force-submits or race conditions)
      const is403 = firstArg?.response?.status === 403 || 
                    errorStr.includes('403') ||
                    errorStr.includes('Request failed with status code 403');
      const submitUrl = firstArg?.config?.url || '';
      const isSubmitEndpoint = (submitUrl.includes('/attempts/') && submitUrl.includes('/submit')) ||
                               submitUrl.includes('/student/attempts/') ||
                               errorStr.includes('/attempts/') && errorStr.includes('/submit') ||
                               errorStr.includes('useExamSubmission');
      const isAlreadySubmitted = errorStr.includes('already been submitted') ||
                                 errorStr.includes('already submitted') ||
                                 errorStr.includes('already been') ||
                                 firstArg?.response?.data?.message?.includes('already');
      
      if (is403 && (isSubmitEndpoint || isAlreadySubmitted)) {
        return; // Don't log this error - it's expected when attempt is already submitted
      }
      
      // Suppress TensorFlow Lite XNNPACK delegate info messages (from MediaPipe)
      const isTensorFlowInfo = errorStr.includes('TensorFlow Lite XNNPACK delegate') ||
                               errorStr.includes('INFO: Created TensorFlow') ||
                               errorStr.includes('XNNPACK delegate for CPU');
      if (isTensorFlowInfo) {
        return; // Don't log TensorFlow info - it's just informational from MediaPipe
      }
      
      // Log all other errors normally
      originalError.apply(console, args);
    };

    // Override console.log to suppress socket transport close messages and Fast Refresh messages
    console.log = (...args: any[]) => {
      const message = String(args[0] || '');
      // Suppress socket transport close messages
      if (message.includes('[Socket] Disconnected from server: transport close') ||
          message.includes('transport close') ||
          message.includes('[Socket] Connection error') ||
          message.includes('[Socket] Disconnected from server: transport error')) {
        return; // Don't log transport close - it's normal
      }
      // Suppress Fast Refresh messages (development only)
      if (message.includes('[Fast Refresh]')) {
        return; // Don't log Fast Refresh messages - they're informational
      }
      originalLog.apply(console, args);
    };

    // Override console.warn to suppress WebSocket warnings
    console.warn = (...args: any[]) => {
      const message = String(args[0] || '');
      // Suppress WebSocket connection warnings
      if (message.includes('WebSocket') ||
          message.includes('websocket') ||
          message.includes('socket.io') ||
          message.includes('can\'t establish a connection') ||
          message.includes('was interrupted')) {
        return; // Don't log WebSocket warnings - they're handled by reconnection logic
      }
      originalWarn.apply(console, args);
    };

    // Cleanup: restore original console methods on unmount
    return () => {
      console.error = originalError;
      console.log = originalLog;
      console.warn = originalWarn;
    };
  }, []);

  return null; // This component doesn't render anything
}

