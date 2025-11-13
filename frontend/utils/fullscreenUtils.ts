export async function enterFullscreen(element: HTMLElement | null) {
  try {
    const targetElement = element || document.documentElement;
    if (targetElement.requestFullscreen) {
      await targetElement.requestFullscreen();
    } else if ((targetElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
      await (targetElement as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
    } else if ((targetElement as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
      await (targetElement as HTMLElement & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
    }
  } catch (err) {
    console.error('Error entering fullscreen:', err);
  }
}

export async function exitFullscreen() {
  try {
    // Check if we're actually in fullscreen before trying to exit
    if (!isFullscreen()) {
      return; // Already not in fullscreen, nothing to do
    }

    // Check if document is ready
    // Note: 'uninitialized' is not a valid DocumentReadyState in modern browsers
    // DocumentReadyState only includes: 'loading' | 'interactive' | 'complete'
    if (document.readyState === 'loading') {
      return; // Document not ready, skip
    }

    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
      await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
    } else if ((document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
      await (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen();
    }
  } catch (err) {
    // Silently handle the error - document might not be active or already exited
    // This is expected in some scenarios (e.g., page navigation, tab switching)
    // The error "Document not active" is common when navigating away
    if (err instanceof Error && err.message.includes('not active')) {
      return; // Expected error, just return silently
    }
    // Only log unexpected errors
    if (err instanceof Error && !err.message.includes('not active')) {
      console.debug('Error exiting fullscreen:', err);
    }
  }
}

export function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ||
    (document as Document & { msFullscreenElement?: Element | null }).msFullscreenElement
  );
}

