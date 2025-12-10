/**
 * Utility functions to detect browser extensions
 * Note: Extension detection is limited by browser security, but we can detect some common patterns
 */

export interface ExtensionDetectionResult {
  hasExtensions: boolean;
  detectedExtensions: string[];
  message: string;
}

/**
 * Detects browser extensions by checking for common extension indicators
 * This is not 100% reliable but can catch many extensions
 */
export function detectBrowserExtensions(): ExtensionDetectionResult {
  const detectedExtensions: string[] = [];
  let hasExtensions = false;

  // Check for Chrome extensions (most common)
  if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
    try {
      // Try to access chrome.runtime.id - extensions have this
      // If we can access it without error, extensions might be present
      // Note: This is not foolproof but can indicate extension presence
      
      // Check for common extension indicators in DOM
      const extensionIndicators = [
        // Grammarly
        document.querySelector('[data-gramm]'),
        document.querySelector('.grammarly-desktop-integration'),
        // LastPass
        document.querySelector('#lpiframe'),
        document.querySelector('#lpiframe-container'),
        // 1Password
        document.querySelector('[data-1p-ignore]'),
        // Honey
        document.querySelector('[data-honey-extension]'),
        // Ad blockers (common patterns)
        document.querySelector('[id*="adblock"]'),
        document.querySelector('[class*="adblock"]'),
      ];

      extensionIndicators.forEach((indicator, index) => {
        if (indicator) {
          const extensionNames = [
            'Grammarly',
            'Grammarly',
            'LastPass',
            'LastPass',
            '1Password',
            'Honey',
            'Ad Blocker',
            'Ad Blocker',
          ];
          if (!detectedExtensions.includes(extensionNames[index])) {
            detectedExtensions.push(extensionNames[index]);
          }
        }
      });

      // Check for extension-injected scripts
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach((script) => {
        const src = (script as HTMLScriptElement).src;
        if (
          src.includes('extension://') ||
          src.includes('chrome-extension://') ||
          src.includes('moz-extension://') ||
          src.includes('safari-extension://')
        ) {
          hasExtensions = true;
          if (!detectedExtensions.includes('Unknown Extension')) {
            detectedExtensions.push('Unknown Extension');
          }
        }
      });

      // Check for extension-modified DOM elements
      // Some extensions add attributes or modify elements
      const bodyAttributes = Array.from(document.body.attributes);
      bodyAttributes.forEach((attr) => {
        if (
          attr.name.includes('grammarly') ||
          attr.name.includes('lastpass') ||
          attr.name.includes('1password') ||
          attr.name.includes('honey')
        ) {
          hasExtensions = true;
          const extName = attr.name
            .replace(/[^a-zA-Z]/g, ' ')
            .split(' ')
            .filter((w) => w.length > 0)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          if (extName && !detectedExtensions.includes(extName)) {
            detectedExtensions.push(extName);
          }
        }
      });

      // Check window object for extension properties
      const windowKeys = Object.keys(window);
      const extensionKeywords = ['grammarly', 'lastpass', '1password', 'honey', 'adblock'];
      windowKeys.forEach((key) => {
        extensionKeywords.forEach((keyword) => {
          if (key.toLowerCase().includes(keyword)) {
            hasExtensions = true;
            const extName = keyword
              .split('')
              .map((c, i) => (i === 0 ? c.toUpperCase() : c))
              .join('');
            if (!detectedExtensions.includes(extName)) {
              detectedExtensions.push(extName);
            }
          }
        });
      });

      // Check for iframes injected by extensions
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        const src = (iframe as HTMLIFrameElement).src;
        if (
          src.includes('extension://') ||
          src.includes('chrome-extension://') ||
          src.includes('moz-extension://')
        ) {
          hasExtensions = true;
          if (!detectedExtensions.includes('Extension iframe')) {
            detectedExtensions.push('Extension iframe');
          }
        }
      });
    } catch (error) {
      // Silently fail - extension detection is not critical
      if (process.env.NODE_ENV === 'development') {
        console.warn('Extension detection error:', error);
      }
    }
  }

  // Additional check: Look for common extension CSS classes
  const styleSheets = Array.from(document.styleSheets);
  styleSheets.forEach((sheet) => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      rules.forEach((rule) => {
        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText;
          if (
            selector &&
            (selector.includes('grammarly') ||
              selector.includes('lastpass') ||
              selector.includes('1password') ||
              selector.includes('honey'))
          ) {
            hasExtensions = true;
            const match = selector.match(/(grammarly|lastpass|1password|honey)/i);
            if (match) {
              const extName = match[1]
                .split('')
                .map((c, i) => (i === 0 ? c.toUpperCase() : c))
                .join('');
              if (!detectedExtensions.includes(extName)) {
                detectedExtensions.push(extName);
              }
            }
          }
        }
      });
    } catch (error) {
      // Cross-origin stylesheets will throw errors, ignore them
    }
  });

  // If we detected any extensions
  if (detectedExtensions.length > 0 || hasExtensions) {
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

