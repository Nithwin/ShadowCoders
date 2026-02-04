
/**
 * Honeypot Detector
 * Creates tempting DOM elements to lure extensions into revealing themselves.
 * 
 * Many extensions (Grammarly, Gemini, etc.) scan for textareas or inputs to inject their UI.
 * By creating a bait element, we can detect their modifications.
 */

export async function detectByHoneypot(): Promise<string[]> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve([]);

    const detected: string[] = [];
    
    // Create bait element
    const bait = document.createElement('textarea');
    bait.setAttribute('placeholder', 'Type here...');
    bait.setAttribute('contenteditable', 'true');
    bait.style.position = 'fixed';
    bait.style.top = '-9999px';
    bait.style.left = '-9999px';
    bait.style.opacity = '0.01'; 
    bait.setAttribute('data-test-field', 'true'); // Some extensions ignore fields with data-test
    // But generic AI extensions usually ignore that check to be helpful everywhere
    bait.className = 'form-control input-field'; // Common classes

    document.body.appendChild(bait);

    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      if (document.body.contains(bait)) {
        document.body.removeChild(bait);
      }
      resolve(detected);
    };

    // Observe changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
           // Something injected inside?
           detected.push('AI Assistant / Writer (Injected UI into Input)');
           finish();
           return;
        }
        if (mutation.type === 'attributes') {
           // Attribute changed? (e.g. class added)
           const target = mutation.target as HTMLElement;
           // If class changed and it wasn't us
           if (target.className !== 'form-control input-field' && !target.className.includes('touched')) {
             if (!detected.includes('Extension Modifier (Class change)')) {
               detected.push(`Extension Modifier (Class change on Input: ${target.className})`);
             }
             finish();
             return;
           }
        }
      }
    });

    observer.observe(bait, { 
      childList: true, 
      attributes: true 
    });

    // Short timeout to allow extensions to react
    setTimeout(() => {
        // Also check if bait is moved (rare but possible wrapper)
        if (bait.parentElement !== document.body && !resolved) {
          detected.push('Extension Wrapper Detected (Input moved)');
        }
        finish();
    }, 2000); // 2 seconds should be enough for most listeners
  });
}
