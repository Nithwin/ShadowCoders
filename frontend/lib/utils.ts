import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getApiBaseUrl } from './api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAbsoluteImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  const apiBase = getApiBaseUrl();
  const serverRoot = apiBase.replace(/\/api$/, '');

  if (url.startsWith('/')) {
    return `${serverRoot}${url}`;
  }
  return `${serverRoot}/${url}`;
}

/**
 * Robust copy to clipboard function that handles non-secure contexts (HTTP)
 * where navigator.clipboard might be undefined.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 1. Try modern API first (if available and secure context)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    throw new Error('Clipboard API unavailable');
  } catch (err) {
    // 2. Fallback to execCommand (deprecated but required for HTTP)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // Ensure it's not visible but part of DOM
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) return true;
      else throw new Error('execCommand failed');
    } catch (fallbackErr) {
      console.error('Failed to copy to clipboard:', fallbackErr);
      return false;
    }
  }
}
