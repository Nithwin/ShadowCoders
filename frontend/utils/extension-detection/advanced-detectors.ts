/**
 * Advanced Detectors
 * Sophisticated detection methods including CSP violations, DevTools, and more
 */

/**
 * Sets up a listener for CSP violations that might indicate extension activity
 */
export function setupCSPViolationListener(callback: (extensionUrl: string) => void): void {
  if (typeof document === 'undefined') return;
  
  document.addEventListener('securitypolicyviolation', (e) => {
    const blockedUri = e.blockedURI || '';
    
    if (blockedUri.includes('chrome-extension://') || blockedUri.includes('moz-extension://')) {
      callback(blockedUri);
    }
  });
}

/**
 * Detects if DevTools is open by checking window dimensions
 * This is a "heartbeat" check for developer tools
 */
export function detectDevTools(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const widthThreshold = 160;
    const heightThreshold = 160;
    
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    
    return widthDiff > widthThreshold || heightDiff > heightThreshold;
  } catch (e) {
    return false;
  }
}

/**
 * Analyzes stack traces for extension-injected scripts
 */
export function detectViaStackTrace(): boolean {
  try {
    const err = new Error('stack_trace_check');
    if (err.stack) {
      return err.stack.includes('chrome-extension://') || err.stack.includes('moz-extension://');
    }
  } catch (e) {}
  
  return false;
}

/**
 * Checks Resource Timing API for extension requests
 */
export function checkResourceTiming(): boolean {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) return false;
  
  try {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    return resources.some(resource => {
      const name = resource.name || '';
      return name.includes('chrome-extension://') || name.includes('moz-extension://');
    });
  } catch (e) {
    return false;
  }
}

/**
 * Scans stylesheets for extension-injected CSS
 */
export function checkStylesheets(): boolean {
  if (typeof document === 'undefined') return false;
  
  try {
    const sheets = document.styleSheets;
    
    for (let i = 0; i < sheets.length; i++) {
      try {
        const sheet = sheets[i];
        const href = sheet.href || '';
        
        if (href.includes('chrome-extension://') || href.includes('moz-extension://')) {
          return true;
        }
      } catch (e) {
        // Cross-origin stylesheets will throw - this itself can indicate an extension
        continue;
      }
    }
  } catch (e) {}
  
  return false;
}

/**
 * Uses chrome.management API to get all installed extensions
 * This is the most reliable method but requires permissions
 */
export async function getChromeExtensions(): Promise<string[]> {
  if (typeof chrome === 'undefined' || !chrome.management) {
    return [];
  }
  
  try {
    const extensions = await chrome.management.getAll();
    return extensions
      .filter(ext => ext.enabled && ext.type === 'extension')
      .map(ext => ext.name);
  } catch (e) {
    return [];
  }
}
