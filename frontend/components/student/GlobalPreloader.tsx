'use client';

import { useEffect, useState } from 'react';

const ASSETS = {
  python: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js',
  // CheerpJ 3.0 loader
  java: 'https://cjrtnc.leaningtech.com/3.0/cj3loader.js' 
};

export default function GlobalPreloader() {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 1. Preload Python (Pyodide)
    // We can use a Worker to load it without blocking main thread
    const loadPython = () => {
      if (loaded.python) return;
      
      const worker = new Worker(new URL('../../workers/python.worker.ts', import.meta.url));
      worker.postMessage({ type: 'INIT', payload: { pyodideUrl: ASSETS.python } });
      
      worker.onmessage = (e) => {
        if (e.data.type === 'READY') {
          console.log('[Preloader] Python Runtime Cached');
          setLoaded(prev => ({ ...prev, python: true }));
          worker.terminate(); // Terminate after caching (browser cache will hold the files)
        }
      };
    };

    // 2. Preload Java (CheerpJ)
    const loadJava = () => {
        if (loaded.java) return;

        // CheerpJ is heavy, we might want to just fetch the main script to warm the cache
        // or prioritize Python first.
        // Using fetch to warm browser cache for the large loader
        fetch(ASSETS.java, { mode: 'no-cors' })
            .then(() => {
                console.log('[Preloader] Java Runtime Loader Cached');
                setLoaded(prev => ({ ...prev, java: true }));
            })
            .catch(err => console.error('[Preloader] Java Cache Failed', err));
            
        // Ideally we would start a worker, but CheerpJ worker setup is complex.
        // Simple fetch is good enough for the 10MB+ main files.
    };

    // Start loading with a slight delay to let the UI settle
    const output = setTimeout(() => {
        // Sequentially load to avoid network congestion
        loadPython();
        setTimeout(loadJava, 2000); // Start Java 2s after Python
    }, 1500);

    return () => clearTimeout(output);
  }, []);

  return null; // Invisible component
}
