/**
 * Application Constants
 * Centralized location for magic numbers and configuration values
 */

export const TIMEOUTS = {
  /** Idle threshold for student activity (2 minutes) */
  IDLE_THRESHOLD: 2 * 60 * 1000,
  
  /** Request timeout (30 seconds) */
  REQUEST_TIMEOUT: 30 * 1000,
  
  /** Code execution timeout (10 seconds) */
  CODE_EXECUTION: 10 * 1000,
  
  /** Socket heartbeat interval (30 seconds) */
  SOCKET_HEARTBEAT: 30 * 1000,
} as const;

export const RATE_LIMITS = {
  /** Auth endpoints: 5 attempts per 15 minutes */
  AUTH: {
    windowMs: 15 * 60 * 1000,
    max: 50, // Increased for dev/testing
  },
  
  /** General API: 100 requests per 15 minutes */
  API: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
  
  /** Code execution: 20 per 15 minutes per user */
  CODE_EXECUTION: {
    windowMs: 15 * 60 * 1000,
    max: 20,
  },
} as const;

export const FILE_UPLOAD = {
  /** Maximum file size: 10MB */
  MAX_SIZE: 10 * 1024 * 1024,
  
  /** Maximum number of files per upload */
  MAX_FILES: 5,
  
  /** Allowed audio MIME types */
  ALLOWED_AUDIO: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'],
  
  /** Allowed image MIME types */
  ALLOWED_IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  /** Allowed video MIME types */
  ALLOWED_VIDEOS: ['video/mp4', 'video/webm'],
} as const;

export const SECURITY = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  
  /** JWT token expiry (15 minutes) */
  JWT_EXPIRY: '15m',
  
  /** Refresh token expiry (7 days) */
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000,
} as const;
