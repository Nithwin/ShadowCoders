'use client';

import { Maximize, AlertCircle } from 'lucide-react';

interface FullscreenRequirementProps {
  onEnterFullscreen: () => void;
}

export default function FullscreenRequirement({ onEnterFullscreen }: FullscreenRequirementProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
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
          
          <p className="text-base text-gray-600 mb-8">
            The exam timer will only run when you are in fullscreen mode.
          </p>
          
          <button
            onClick={onEnterFullscreen}
            className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mx-auto"
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

