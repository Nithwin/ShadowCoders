/**
 * DOM Scanner
 * Detects extension-injected elements in the DOM
 */

import { EXTENSION_KEYWORDS } from './constants';

/**
 * Scans the DOM for elements injected by extensions
 * Extensions often inject divs, iframes, or other elements into the page
 */
export function detectInjectedElements(): string[] {
  if (typeof document === 'undefined') return [];
  
  const suspiciousElements: string[] = [];
  
  try {
    const allElements = document.body.querySelectorAll('*');
    
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      
      // Check ID for extension patterns
      if (el.id) {
        const id = el.id.toLowerCase();
        if (EXTENSION_KEYWORDS.ids.some(keyword => id.includes(keyword))) {
          if (!suspiciousElements.includes(`Element: #${el.id}`)) {
            suspiciousElements.push(`Element: #${el.id}`);
          }
        }
      }
      
      // Check class names
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.toLowerCase().split(/\s+/);
        
        for (const cls of classes) {
          // Skip empty classes
          if (!cls) continue;

          // Check if the class ITSELF is suspicious
          const isSuspicious = EXTENSION_KEYWORDS.classes.some(keyword => {
            // Strict check: class must START with the keyword (e.g. "ext-icon", not "text-lg")
            // Or be an exact match
            if (keyword.endsWith('-')) {
              return cls.startsWith(keyword) && cls !== keyword; // e.g. "ext-helper", but not just "ext-"
            }
            return cls === keyword || cls.includes(keyword) && !cls.includes('text-'); 
          });

          // Extra safety: Explicitly ignore common Tailwind/utility classes that might look suspicious
          // "text-" contains "ext-", so we must double-check
          if (cls.startsWith('text-') || cls.startsWith('context-')) {
             continue;
          }

          if (isSuspicious) {
            if (!suspiciousElements.includes(`Element with class: ${cls}`)) {
              suspiciousElements.push(`Element with class: ${cls}`);
            }
          }
        }
      }
      
      // Check for shadow roots (extensions often use them)
      if (el.shadowRoot) {
        // Only flag Shadow DOM if it's on a suspicious element
        // OR if it's a direct child of body (extensions often inject top-level containers)
        // AND it's not a known safe element
        const isSafeElement = 
          el.tagName.toLowerCase().includes('next-route-announcer') || 
          el.id === 'nextjs-portal' ||
          el.id.startsWith('__next') ||
          el.hasAttribute('data-nextjs-dialog-overlay') ||
          el.hasAttribute('data-nextjs-toast'); // Next.js specific elements

        if (!isSafeElement && (el.parentElement === document.body || EXTENSION_KEYWORDS.ids.some(id => el.id.includes(id)))) {
           if (!suspiciousElements.includes('Suspicious Shadow DOM (Top-level)')) {
             suspiciousElements.push('Suspicious Shadow DOM (Top-level)');
           }
        }
      }
    }
  } catch (e) {}
  
  return suspiciousElements;
}

/**
 * Scans DOM attributes for extension-specific markers
 */
export function scanDOMAttributes(): string[] {
  if (typeof document === 'undefined') return [];
  
  const found: string[] = [];
  
  try {
    const allElements = document.querySelectorAll('*');
    
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      
      // Check for extension-specific attributes
      EXTENSION_KEYWORDS.attributes.forEach(attr => {
        if (el.hasAttribute(attr)) {
          if (!found.includes(`Attribute: ${attr}`)) {
            found.push(`Attribute: ${attr}`);
          }
        }
      });
      
      // Check for extension:// protocols in attributes
      Array.from(el.attributes).forEach(attr => {
        if (attr.value.includes('chrome-extension://') || attr.value.includes('moz-extension://')) {
          if (!found.includes(`Extension Protocol in ${attr.name}`)) {
            found.push(`Extension Protocol in ${attr.name}`);
          }
        }
      });
    }
  } catch (e) {}
  
  return found;
}

/**
 * Detects injected iframes from extensions
 */
export function detectInjectedIframes(): boolean {
  if (typeof document === 'undefined') return false;
  
  try {
    const iframes = document.querySelectorAll('iframe');
    
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i] as HTMLIFrameElement;
      const src = iframe.src || '';
      const id = iframe.id || '';
      
      if (
        src.includes('chrome-extension://') ||
        src.includes('moz-extension://') ||
        id.includes('extension') ||
        id.includes('ext-')
      ) {
        return true;
      }
    }
  } catch (e) {}
  
  return false;
}
