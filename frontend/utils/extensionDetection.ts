/**
 * Utility functions to detect browser extensions
 * Based on methods from: https://stackoverflow.com/questions/6293498/check-whether-user-has-a-chrome-extension-installed
 * Uses resource checking, chrome.runtime scanning, and DOM observation
 */

export interface ExtensionDetectionResult {
  hasExtensions: boolean;
  detectedExtensions: string[];
  message: string;
}

declare global {
  interface Window {
    chrome: any;
  }
}

/**
 * Tries to detect an extension by attempting to fetch a resource from it
 * Based on: https://stackoverflow.com/questions/6293498/check-whether-user-has-a-chrome-extension-installed
 */
async function checkExtensionByResource(extensionId: string, resourcePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = `chrome-extension://${extensionId}/${resourcePath}`;
    // Timeout after 500ms
    setTimeout(() => resolve(false), 500);
  });
}

/**
 * Scans chrome object for extension IDs (32-character lowercase strings)
 * This is the most reliable method for detecting installed extensions
 */
function findExtensionIdsInChrome(): string[] {
  const extensionIds: string[] = [];
  
  if (typeof window === 'undefined' || !window.chrome) {
    return extensionIds;
  }

  try {
    const scanObject = (obj: any, depth = 0, visited = new WeakSet(), path = ''): void => {
      if (depth > 5) return; // Limit depth
      if (!obj || typeof obj !== 'object') return;
      if (visited.has(obj)) return;
      visited.add(obj);
      
      try {
        // Get all keys including non-enumerable ones
        const keys = Object.keys(obj);
        const allKeys = new Set(keys);
        
        // Also try to get property names
        try {
          const propNames = Object.getOwnPropertyNames(obj);
          propNames.forEach(key => allKeys.add(key));
        } catch (e) {
          // Ignore
        }
        
        allKeys.forEach((key) => {
          // Extension IDs are exactly 32 lowercase characters
          if (key.length === 32 && /^[a-z]{32}$/.test(key)) {
            if (!extensionIds.includes(key)) {
              extensionIds.push(key);
            }
          }
          
          // Recursively scan nested objects
          try {
            const value = obj[key];
            if (value && typeof value === 'object' && value !== null && depth < 5) {
              scanObject(value, depth + 1, visited, path + '.' + key);
            }
          } catch (e) {
            // Ignore errors from restricted properties
          }
        });
      } catch (e) {
        // Ignore errors
      }
    };
    
    // Scan chrome object thoroughly
    scanObject(window.chrome);
    
    // Also scan window object for extension IDs
    scanObject(window);
    
    // Scan document object
    if (typeof document !== 'undefined') {
      scanObject(document);
    }
  } catch (e) {
    // Ignore errors
  }
  
  return extensionIds;
}

/**
 * Detects browser extensions by checking for common extension indicators
 * Returns a promise to allow async detection methods
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

    // Find extension IDs in chrome object
    const extensionIds = findExtensionIdsInChrome();
    if (extensionIds.length > 0) {
      hasExtensions = true;
      if (!detectedExtensions.includes('Browser Extension')) {
        detectedExtensions.push('Browser Extension');
      }
    }

    // Try to verify extensions by checking their resources
    // Common web_accessible_resources that extensions might expose
    const commonResources = ['icon.png', 'icon16.png', 'icon48.png', 'icon128.png', 'manifest.json', 'content.js', 'background.js'];
    
    const checkPromises = extensionIds.map(async (extId) => {
      for (const resource of commonResources) {
        const exists = await checkExtensionByResource(extId, resource);
        if (exists) {
          hasExtensions = true;
          if (!detectedExtensions.includes('Browser Extension')) {
            detectedExtensions.push('Browser Extension');
          }
          return true;
        }
      }
      return false;
    });

    // Set up MutationObserver to catch extensions that inject content asynchronously
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const element = node as Element;
            
            // Check for extension URLs
            Array.from(element.attributes).forEach((attr) => {
              const value = attr.value.toLowerCase();
              if (value.includes('chrome-extension://') ||
                  value.includes('moz-extension://') ||
                  value.includes('safari-extension://')) {
                hasExtensions = true;
                if (!detectedExtensions.includes('Browser Extension')) {
                  detectedExtensions.push('Browser Extension');
                }
              }
            });

            // Check for extension IDs in element properties
            const id = (element as HTMLElement).id?.toLowerCase() || '';
            if (id.length === 32 && /^[a-z]{32}$/.test(id)) {
              hasExtensions = true;
              if (!detectedExtensions.includes('Browser Extension')) {
                detectedExtensions.push('Browser Extension');
              }
            }

            // Check for known extension patterns
            const extensionPatterns = [
              'grammarly', 'lastpass', '1password', 'honey', 'dashlane',
              'bitwarden', 'adblock', 'ublock', 'paste', 'gemini', 'assistant'
            ];
            
            extensionPatterns.forEach((pattern) => {
              const className = (element as HTMLElement).className?.toString().toLowerCase() || '';
              if (id.includes(pattern) || className.includes(pattern)) {
                hasExtensions = true;
                const extName = pattern.charAt(0).toUpperCase() + pattern.slice(1);
                if (!detectedExtensions.includes(extName)) {
                  detectedExtensions.push(extName);
                }
              }
            });
          }
        });
      });
    });

    // Start observing
    if (typeof document !== 'undefined' && document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['id', 'class', 'src', 'href', 'data-*'],
      });
    }

    // Wait and check multiple times
    let checkCount = 0;
    const maxChecks = 6;
    const checkInterval = 500; // Check every 500ms

    const intervalId = setInterval(() => {
      checkCount++;
      
      // Do another synchronous check
      const newResult = detectBrowserExtensions();
      if (newResult.hasExtensions) {
        newResult.detectedExtensions.forEach((ext) => {
          if (!detectedExtensions.includes(ext)) {
            detectedExtensions.push(ext);
          }
        });
        hasExtensions = true;
      }

      // Re-scan for extension IDs
      const newExtensionIds = findExtensionIdsInChrome();
      if (newExtensionIds.length > 0) {
        hasExtensions = true;
        if (!detectedExtensions.includes('Browser Extension')) {
          detectedExtensions.push('Browser Extension');
        }
      }

      // If we've detected something or reached max checks, resolve
      if (hasExtensions || checkCount >= maxChecks) {
        clearInterval(intervalId);
        observer.disconnect();
        
        const finalResult = {
          hasExtensions: hasExtensions || detectedExtensions.length > 0,
          detectedExtensions: detectedExtensions.length > 0 
            ? detectedExtensions 
            : hasExtensions ? ['Browser Extension'] : [],
          message: detectedExtensions.length > 0
            ? `The following browser extensions were detected: ${detectedExtensions.join(', ')}. Please disable or remove them before starting the exam.`
            : hasExtensions
            ? 'Browser extensions were detected. Please disable or remove all browser extensions before starting the exam.'
            : '',
        };



        resolve(finalResult);
      }
    }, checkInterval);

    // Also wait for resource checks to complete
    Promise.all(checkPromises).then(() => {
      // Resource checks completed
    });
  });
}

/**
 * Detects browser extensions using synchronous methods
 */
export function detectBrowserExtensions(): ExtensionDetectionResult {
  const detectedExtensions: string[] = [];
  let hasExtensions = false;

  // Only check if we're in a browser environment
  if (typeof window === 'undefined' || !window.chrome) {
    return {
      hasExtensions: false,
      detectedExtensions: [],
      message: '',
    };
  }

  try {
    // Method 1: Find extension IDs in chrome object (most reliable)
    const extensionIds = findExtensionIdsInChrome();
    if (extensionIds.length > 0) {
      hasExtensions = true;
      if (!detectedExtensions.includes('Browser Extension')) {
        detectedExtensions.push('Browser Extension');
      }
    }

    // Method 2: Check for extension URLs in page content
    try {
      // Check all scripts
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach((script) => {
        const src = (script as HTMLScriptElement).src;
        if (src.includes('chrome-extension://') || 
            src.includes('moz-extension://') ||
            src.includes('safari-extension://')) {
          hasExtensions = true;
          if (!detectedExtensions.includes('Browser Extension')) {
            detectedExtensions.push('Browser Extension');
          }
        }
      });

      // Check all iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        const src = (iframe as HTMLIFrameElement).src;
        if (src.includes('chrome-extension://') || 
            src.includes('moz-extension://')) {
          hasExtensions = true;
          if (!detectedExtensions.includes('Browser Extension')) {
            detectedExtensions.push('Browser Extension');
          }
        }
      });

      // Check all links and images
      const links = document.querySelectorAll('a[href], img[src], link[href]');
      links.forEach((link) => {
        const href = (link as HTMLAnchorElement).href || (link as HTMLLinkElement).href || (link as HTMLImageElement).src;
        if (href && (href.includes('chrome-extension://') || 
            href.includes('moz-extension://'))) {
          hasExtensions = true;
          if (!detectedExtensions.includes('Browser Extension')) {
            detectedExtensions.push('Browser Extension');
          }
        }
      });
    } catch (e) {
      // Ignore errors
    }

    // Method 3: Check page HTML for extension URLs and IDs
    try {
      const pageHTML = document.documentElement.innerHTML;
      
      // Check for extension URLs
      if (pageHTML.includes('chrome-extension://') ||
          pageHTML.includes('moz-extension://') ||
          pageHTML.includes('safari-extension://')) {
        hasExtensions = true;
        if (!detectedExtensions.includes('Browser Extension')) {
          detectedExtensions.push('Browser Extension');
        }
      }

      // Look for extension IDs in HTML (32-char lowercase strings)
      const extensionIdPattern = /\b[a-z]{32}\b/g;
      const matches = pageHTML.match(extensionIdPattern);
      if (matches) {
        matches.forEach((match) => {
          if (match.length === 32 && /^[a-z]{32}$/.test(match)) {
            hasExtensions = true;
            if (!detectedExtensions.includes('Browser Extension')) {
              detectedExtensions.push('Browser Extension');
            }
          }
        });
      }
    } catch (e) {
      // Ignore errors
    }

    // Method 4: Check for known extension patterns in DOM
    const knownExtensions = [
      { patterns: ['grammarly', 'data-gramm', 'grammarly-'], name: 'Grammarly' },
      { patterns: ['lastpass', 'lpiframe', 'lastpass-'], name: 'LastPass' },
      { patterns: ['1password', 'data-1p', '1password-'], name: '1Password' },
      { patterns: ['honey', 'data-honey', 'honey-'], name: 'Honey' },
      { patterns: ['dashlane', 'data-dashlane'], name: 'Dashlane' },
      { patterns: ['bitwarden', 'data-bitwarden'], name: 'Bitwarden' },
      { patterns: ['adblock', 'adblock-'], name: 'Ad Blocker' },
      { patterns: ['ublock', 'ublock-'], name: 'uBlock Origin' },
      { patterns: ['paste', 'paste-', 'dont.*paste'], name: 'Paste Extension' },
      { patterns: ['gemini', 'gemini-'], name: 'Gemini Assistant' },
      { patterns: ['assistant', 'assistant-'], name: 'Assistant Extension' },
    ];

    try {
      // Check all elements
      const allElements = document.querySelectorAll('*');
      allElements.forEach((element) => {
        const id = (element as HTMLElement).id?.toLowerCase() || '';
        const className = (element as HTMLElement).className?.toString().toLowerCase() || '';
        const tagName = element.tagName?.toLowerCase() || '';
        
        // Check attributes
        Array.from(element.attributes).forEach((attr) => {
          const attrName = attr.name.toLowerCase();
          const attrValue = attr.value.toLowerCase();
          
          knownExtensions.forEach(({ patterns, name }) => {
            patterns.forEach((pattern) => {
              if (id.includes(pattern) || 
                  className.includes(pattern) || 
                  attrName.includes(pattern) || 
                  attrValue.includes(pattern) ||
                  tagName.includes(pattern)) {
                hasExtensions = true;
                if (!detectedExtensions.includes(name)) {
                  detectedExtensions.push(name);
                }
              }
            });
          });
        });
      });
    } catch (e) {
      // Ignore errors
    }

    // Method 5: Check chrome.runtime for extension indicators
    try {
      if (window.chrome && window.chrome.runtime) {
        const runtimeKeys = Object.keys(window.chrome.runtime);
        
        // Check for extension IDs in runtime keys
        runtimeKeys.forEach((key) => {
          if (key.length === 32 && /^[a-z]{32}$/.test(key)) {
            hasExtensions = true;
            if (!detectedExtensions.includes('Browser Extension')) {
              detectedExtensions.push('Browser Extension');
            }
          }
        });

        // Check for non-standard properties that might indicate extensions
        const standardProps = ['onConnect', 'onMessage', 'connect', 'sendMessage', 'getURL', 'getManifest', 'id', 'onInstalled', 'onStartup', 'lastError', 'onConnectExternal', 'onMessageExternal', 'sendMessageExternal'];
        const nonStandardProps = runtimeKeys.filter(key => !standardProps.includes(key));
        
        // If there are many non-standard properties, might indicate extensions
        // But this alone isn't reliable, so we use it as a hint
      }
    } catch (e) {
      // Ignore errors
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Extension detection error:', error);
    }
  }



  // Return result
  if (hasExtensions || detectedExtensions.length > 0) {
    return {
      hasExtensions: true,
      detectedExtensions: detectedExtensions.length > 0 
        ? detectedExtensions 
        : ['Browser Extension'],
      message: detectedExtensions.length > 0
        ? `The following browser extensions were detected: ${detectedExtensions.join(', ')}. Please disable or remove them before starting the exam.`
        : 'Browser extensions were detected. Please disable or remove all browser extensions before starting the exam.',
    };
  }

  return {
    hasExtensions: false,
    detectedExtensions: [],
    message: '',
  };
}

/**
 * Continuously monitors for extensions and returns a promise that resolves when extensions are removed
 */
export function waitForExtensionsRemoval(
  checkInterval: number = 1000,
  maxWaitTime: number = 300000 // 5 minutes max
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkIntervalId = setInterval(() => {
      const result = detectBrowserExtensions();
      
      if (!result.hasExtensions) {
        clearInterval(checkIntervalId);
        resolve(true);
        return;
      }

      // Check if max wait time exceeded
      if (Date.now() - startTime > maxWaitTime) {
        clearInterval(checkIntervalId);
        resolve(false);
        return;
      }
    }, checkInterval);
  });
}
