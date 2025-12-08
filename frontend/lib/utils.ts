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
