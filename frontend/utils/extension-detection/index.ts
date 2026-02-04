/**
 * Extension Detection System
 * Main orchestrator that combines all detection methods
 */

import type { ExtensionDetectionResult } from './types';
import { PROBE_EXTENSION_IDS } from './constants';
import { detectInjectedElements, scanDOMAttributes, detectInjectedIframes } from './dom-scanner';
import { findExtensionIdsInChrome } from './memory-scanner';
import { checkExtensionByResource } from './resource-checker';
import {
  setupCSPViolationListener,
  detectDevTools,
  detectViaStackTrace,
  checkResourceTiming,
  checkStylesheets,
  getChromeExtensions,
} from './advanced-detectors';
import { detectByHoneypot } from './honeypot-detector';

/**
 * Synchronous extension detection
 * Runs all immediate checks and returns results
 */
export function detectBrowserExtensions(): ExtensionDetectionResult {
  const detectedExtensions: string[] = [];
  let hasExtensions = false;

  // Method 0: Check for navigator.webdriver
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    hasExtensions = true;
    detectedExtensions.push('WebDriver Detected');
  }

  // Method 0.5: chrome.management.getAll() - Most reliable but async
  // This will be handled in the async version

  // Method 0.6: CSP Violation Monitoring
  setupCSPViolationListener((extensionUrl) => {
    if (!detectedExtensions.includes('Extension (CSP Violation)')) {
      detectedExtensions.push('Extension (CSP Violation)');
    }
  });

  // Method 0.7: DevTools Detection
  if (detectDevTools()) {
    hasExtensions = true;
    if (!detectedExtensions.includes('DevTools Open')) {
      detectedExtensions.push('DevTools Open');
    }
  }

  // Method 0.8: Injected DOM Element Detection
  const injectedElements = detectInjectedElements();
  if (injectedElements.length > 0) {
    hasExtensions = true;
    injectedElements.forEach(el => {
      if (!detectedExtensions.includes(el)) {
        detectedExtensions.push(el);
      }
    });
  }

  // Method 1: Check for Extension IDs (32-char lowercase strings)
  const foundIds = findExtensionIdsInChrome();
  if (foundIds.length > 0) {
    hasExtensions = true;
    foundIds.forEach(id => {
      if (!detectedExtensions.includes(`Extension ID: ${id}`)) {
        detectedExtensions.push(`Extension ID: ${id}`);
      }
    });
  }

  // Method 2: Scan DOM for extension protocols
  const domAttributes = scanDOMAttributes();
  if (domAttributes.length > 0) {
    hasExtensions = true;
    domAttributes.forEach(attr => {
      // Clean up the attribute name to be more readable if possible
      // e.g. "data-extension-id" -> "Extension: data-extension-id"
      const name = attr.startsWith('data-') ? attr.replace('data-', '') : attr;
      const formatted = `Extension Injector: ${name}`;
      if (!detectedExtensions.includes(formatted)) {
        detectedExtensions.push(formatted);
      }
    });
  }

  // Method 3: Check for injected iframes
  if (detectInjectedIframes()) {
    hasExtensions = true;
    if (!detectedExtensions.includes('Extension Iframe')) {
      detectedExtensions.push('Extension Iframe');
    }
  }

  // Method 4: Resource Timing API
  if (checkResourceTiming()) {
    hasExtensions = true;
    if (!detectedExtensions.includes('Extension (Resource Timing)')) {
      detectedExtensions.push('Extension (Resource Timing)');
    }
  }

  // Method 5: Stylesheet Injection Check
  if (checkStylesheets()) {
    hasExtensions = true;
    if (!detectedExtensions.includes('Extension Stylesheet')) {
      detectedExtensions.push('Extension Stylesheet');
    }
  }

  // Method 6: Stack Trace Analysis
  if (detectViaStackTrace()) {
    hasExtensions = true;
    if (!detectedExtensions.includes('Injected Script (Stack Trace)')) {
      detectedExtensions.push('Injected Script (Stack Trace)');
    }
  }

  // Final Result
  if (hasExtensions || detectedExtensions.length > 0) {
    return {
      hasExtensions: true,
      detectedExtensions: detectedExtensions.length > 0 ? detectedExtensions : ['Unidentified Extension'],
      message: 'Security Alert: Browser extensions detected. You must disable ALL extensions or use an Incognito/Private window (with extensions disabled) to start the exam.',
    };
  }

  return {
    hasExtensions: false,
    detectedExtensions: [],
    message: '',
  };
}

/**
 * Asynchronous extension detection
 * Includes resource probing and chrome.management API
 */
export async function detectBrowserExtensionsAsync(): Promise<ExtensionDetectionResult> {
  return new Promise((resolve) => {
    let detectedExtensions: string[] = [];
    let hasExtensions = false;

    // First, do an immediate synchronous check
    const immediateResult = detectBrowserExtensions();
    if (immediateResult.hasExtensions) {
      detectedExtensions = [...immediateResult.detectedExtensions];
      hasExtensions = true;
    }

    // Method 0.5: chrome.management.getAll() - Most reliable
    getChromeExtensions().then(extensions => {
      if (extensions.length > 0) {
        hasExtensions = true;
        extensions.forEach(name => {
          if (!detectedExtensions.includes(name)) {
            detectedExtensions.push(name);
          }
        });
      }

      // Method: Probe known extension IDs
      const probePromises = PROBE_EXTENSION_IDS.map(id => checkExtensionByResource(id));
      
      // Method: Honeypot Detection (Async)
      const honeypotPromise = detectByHoneypot();

      Promise.all([...probePromises, honeypotPromise]).then(results => {
        // Handle probe results (indices 0 to length-2)
        const probeResults = results.slice(0, PROBE_EXTENSION_IDS.length);
        probeResults.forEach((exists, index) => {
          if (exists === true) {
            hasExtensions = true;
            const extensionId = PROBE_EXTENSION_IDS[index];
            if (!detectedExtensions.includes(`Probed Extension: ${extensionId}`)) {
              detectedExtensions.push(`Probed Extension: ${extensionId}`);
            }
          }
        });

        // Handle honeypot result (last item)
        const honeypotResult = results[results.length - 1] as string[];
        if (Array.isArray(honeypotResult) && honeypotResult.length > 0) {
           hasExtensions = true;
           honeypotResult.forEach(item => {
             if (!detectedExtensions.includes(item)) {
               detectedExtensions.push(item);
             }
           });
        }

        // Return final result
        if (hasExtensions || detectedExtensions.length > 0) {
          resolve({
            hasExtensions: true,
            detectedExtensions: detectedExtensions.length > 0 ? detectedExtensions : ['Unidentified Extension'],
            message: 'Security Alert: Browser extensions detected. You must disable ALL extensions or use an Incognito/Private window (with extensions disabled) to start the exam.',
          });
        } else {
          resolve({
            hasExtensions: false,
            detectedExtensions: [],
            message: '',
          });
        }
      });
    });
  });
}

// Re-export types for convenience
export type { ExtensionDetectionResult } from './types';
