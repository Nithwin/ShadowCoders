'use client';

import { useState, useEffect, useCallback } from 'react';
import { detectBrowserExtensionsAsync, detectBrowserExtensions, type ExtensionDetectionResult } from '@/utils/extension-detection';

export function useExtensionSecurity(enabled: boolean = true) {
  const [detectionResult, setDetectionResult] = useState<ExtensionDetectionResult>({
    hasExtensions: false,
    detectedExtensions: [],
    message: ''
  });
  const [isScanning, setIsScanning] = useState(true);

  const scan = useCallback(async () => {
    if (!enabled) {
      setDetectionResult({ hasExtensions: false, detectedExtensions: [], message: '' });
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    try {
      // First do a quick sync scan
      const syncResult = detectBrowserExtensions();
      setDetectionResult(syncResult);
      
      // Then do a thorough async scan
      const asyncResult = await detectBrowserExtensionsAsync();
      setDetectionResult(asyncResult);
    } catch (err) {
      console.error('Extension detection failed:', err);
    } finally {
      setIsScanning(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setDetectionResult({ hasExtensions: false, detectedExtensions: [], message: '' });
      setIsScanning(false);
      return;
    }

    scan();
    
    // Also set up a periodic check (less frequent)
    const interval = setInterval(() => {
      const syncResult = detectBrowserExtensions();
      if (syncResult.hasExtensions) {
        setDetectionResult(syncResult);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [scan, enabled]);

  return {
    ...detectionResult,
    isScanning,
    reScan: scan
  };
}
