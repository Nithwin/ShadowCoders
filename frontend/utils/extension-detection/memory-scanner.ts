/**
 * Memory Scanner
 * Scans browser memory for extension IDs
 */

import { INTERNAL_CHROME_IDS } from './constants';

/**
 * Recursively scans the chrome object for 32-character extension IDs
 */
export function findExtensionIdsInChrome(): string[] {
  const extensionIds: string[] = [];
  
  if (typeof window === 'undefined' || !(window as any).chrome) {
    return extensionIds;
  }

  try {
    const scanObject = (obj: any, depth = 0, visited = new WeakSet(), path = ''): void => {
      if (depth > 5 || !obj || typeof obj !== 'object') return;
      
      if (visited.has(obj)) return;
      visited.add(obj);

      const allKeys = Object.getOwnPropertyNames(obj);
      
      allKeys.forEach((key) => {
        const extensionIdPattern = /^[a-z]{32}$/;
        
        // Avoid scanning the detection script's own internal lists
        if (key === 'PROBE_EXTENSION_IDS' || key === 'extensionIds') return;

        // Test the key itself
        if (extensionIdPattern.test(key)) {
          if (!extensionIds.includes(key)) extensionIds.push(key);
        }
        
        // Recursively scan nested objects and check values
        try {
          const value = obj[key];
          if (typeof value === 'string' && extensionIdPattern.test(value)) {
            if (!extensionIds.includes(value)) extensionIds.push(value);
          }
          
          if (typeof value === 'object' && value !== null) {
            scanObject(value, depth + 1, visited, `${path}.${key}`);
          }
        } catch (e) {
          // Ignore errors accessing restricted properties
        }
      });
    };

    scanObject((window as any).chrome);
    
    if (typeof navigator !== 'undefined') {
      scanObject(navigator);
    }
    
    if (typeof document !== 'undefined') {
      scanObject(document);
    }
  } catch (e) {
    // Ignore errors
  }
  
  return extensionIds.filter(id => !INTERNAL_CHROME_IDS.includes(id));
}
