/**
 * Extension Detection Types
 * Shared type definitions for the extension detection system
 */

export interface ExtensionDetectionResult {
  hasExtensions: boolean;
  detectedExtensions: string[];
  message: string;
}
