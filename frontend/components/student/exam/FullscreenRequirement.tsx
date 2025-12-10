'use client';

import { useState, useEffect } from 'react';
import { Maximize, AlertCircle, X, RefreshCw } from 'lucide-react';
import { detectBrowserExtensions, waitForExtensionsRemoval } from '@/utils/extensionDetection';

interface FullscreenRequirementProps {
  onEnterFullscreen: () => void;
}

export default function FullscreenRequirement({ onEnterFullscreen }: FullscreenRequirementProps) {
  const [extensionCheck, setExtensionCheck] = useState<{
    hasExtensions: boolean;
    detectedExtensions: string[];
    message: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    // Check for extensions on mount
    const checkExtensions = () => {
      setIsChecking(true);
      const result = detectBrowserExtensions();
      setExtensionCheck(result);
      setCanProceed(!result.hasExtensions);
      setIsChecking(false);
    };

    checkExtensions();

    // Re-check periodically
    const interval = setInterval(checkExtensions, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleEnterFullscreen = async () => {
    if (!canProceed) {
      return;
    }
    onEnterFullscreen();
  };

  const handleWaitForRemoval = async () => {
    setIsChecking(true);
    const removed = await waitForExtensionsRemoval(1000, 60000); // Check every second, max 1 minute
    if (removed) {
      const result = detectBrowserExtensions();
      setExtensionCheck(result);
      setCanProceed(!result.hasExtensions);
    }
    setIsChecking(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-9999 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl mx-4 border-4 border-red-500">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Fullscreen Required
          </h2>
          
          <p className="text-lg text-gray-700 mb-2">
            You must enter fullscreen mode to continue with the exam.
          </p>
          
          <p className="text-base text-gray-600 mb-6">
            The exam timer will only run when you are in fullscreen mode.
          </p>

          {/* Extension Detection */}
          {isChecking ? (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6 text-left">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                <p className="text-sm text-blue-900 font-semibold">Checking for browser extensions...</p>
              </div>
            </div>
          ) : extensionCheck?.hasExtensions ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-900 mb-2 text-sm">⚠️ Browser Extensions Detected:</p>
                  <p className="text-xs text-red-800 mb-3">{extensionCheck.message}</p>
                  {extensionCheck.detectedExtensions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-red-900 mb-1">Detected Extensions:</p>
                      <ul className="text-xs text-red-800 list-disc list-inside space-y-1">
                        {extensionCheck.detectedExtensions.map((ext, idx) => (
                          <li key={idx}>{ext}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                    <p className="text-xs font-bold text-red-900 mb-2">How to Remove Extensions:</p>
                    <ol className="text-xs text-red-800 list-decimal list-inside space-y-1">
                      <li>Open your browser&apos;s extension settings</li>
                      <li>Disable or remove all extensions</li>
                      <li>Refresh this page</li>
                      <li>Click &quot;Check Again&quot; below</li>
                    </ol>
                  </div>
                  <button
                    onClick={handleWaitForRemoval}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Check Again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-6 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-green-900 mb-1 text-sm">✅ No Browser Extensions Detected</p>
                  <p className="text-xs text-green-800">You can proceed to start the exam.</p>
                </div>
              </div>
            </div>
          )}

          {/* Security Warnings */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-900 mb-2 text-sm">⚠️ Important Security & Browser Restrictions:</p>
                <ul className="text-xs text-amber-900 space-y-1.5 list-disc list-inside">
                  <li><strong>Editor Shortcuts:</strong> Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Ctrl+Y are <strong>allowed</strong> inside code and essay editors only.</li>
                  <li><strong>Blocked:</strong> Tab switching (Ctrl+T), Dev tools (F12), Print Screen, and other shortcuts</li>
                  <li><strong>Warning:</strong> Switching tabs/windows may trigger warnings and auto-submit after 3 warnings</li>
                  <li><strong>Required:</strong> Stay in fullscreen mode throughout the exam</li>
                </ul>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleEnterFullscreen}
            disabled={!canProceed}
            className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            <Maximize className="w-6 h-6" />
            Enter Fullscreen to Start Exam
          </button>
          
          <p className="text-sm text-gray-500 mt-6">
            Press F11 or click the button above to enter fullscreen mode
          </p>
        </div>
      </div>
    </div>
  );
}

