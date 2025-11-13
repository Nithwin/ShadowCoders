'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Headphones, Play, Pause, Volume2, AlertCircle } from 'lucide-react';

type Option = {
  id: string;
  text: string;
};

type ListeningQuestionProps = {
  questionId: string;
  prompt: string;
  options: Option[];
  points: number;
  audioUrl: string;
  maxListenCount?: number;
  answer?: { chosenOptionIds: string[] };
  onChange: (answer: { chosenOptionIds: string[] }) => void;
};

export default function ListeningQuestion({
  questionId,
  prompt,
  options,
  points,
  audioUrl,
  maxListenCount,
  answer,
  onChange,
}: ListeningQuestionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [listenCount, setListenCount] = useState(0);
  const [canListen, setCanListen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chosenOptionIds = answer?.chosenOptionIds || [];

  useEffect(() => {
    // Initialize audio element
    if (audioRef.current) {
      // Clean up previous audio
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        console.error('Audio URL:', audioUrl);
        console.error('Audio element error:', audioRef.current?.error);
        setError(`Failed to load audio. Please check if the file exists. (URL: ${audioUrl})`);
        setIsPlaying(false);
      });
      audioRef.current.addEventListener('loadstart', () => {
        setError(null); // Clear error when loading starts
      });
      audioRef.current.addEventListener('canplay', () => {
        setError(null); // Clear error when audio can play
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.removeEventListener('error', () => {});
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const handlePlay = () => {
    if (!audioRef.current) return;

    if (maxListenCount && listenCount >= maxListenCount) {
      setCanListen(false);
      return;
    }

    if (isPlaying) {
      // Pause is disabled, but we can stop by reloading
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      // Start playing from beginning
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio. Please try again.');
        setIsPlaying(false);
      });
      setIsPlaying(true);
      setListenCount((prev) => prev + 1);
      
      if (maxListenCount && listenCount + 1 >= maxListenCount) {
        setCanListen(false);
      }
    }
  };

  const selectOption = (optionId: string) => {
    onChange({ chosenOptionIds: [optionId] });
  };

  const remainingListens = maxListenCount ? maxListenCount - listenCount : null;

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left Panel - Audio Player & Prompt */}
      <div className="border-r border-gray-300 flex flex-col overflow-hidden bg-white shadow-lg w-[45%]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Headphones className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Listening Question</h2>
            </div>
            <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-300">
              {points} {points === 1 ? 'point' : 'points'}
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-md">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-center mb-4">
                  <button
                    type="button"
                    onClick={handlePlay}
                    disabled={!canListen || !!error}
                    className={`
                      w-20 h-20 rounded-full flex items-center justify-center
                      transition-all duration-200 shadow-lg
                      ${canListen && !error
                        ? isPlaying
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-400 cursor-not-allowed text-white'
                      }
                    `}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </button>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-700">
                    {isPlaying ? 'Playing...' : canListen ? 'Click to Play' : 'No more listens available'}
                  </p>
                  {maxListenCount && (
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                      <Volume2 className="w-4 h-4" />
                      <span>
                        {remainingListens !== null && remainingListens > 0
                          ? `${remainingListens} listen${remainingListens !== 1 ? 's' : ''} remaining`
                          : 'No listens remaining'}
                      </span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center justify-center gap-2 text-red-600 text-xs mt-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="w-full max-w-md">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Important:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>You cannot pause or seek the audio</li>
                      <li>Audio will play from the beginning each time</li>
                      {maxListenCount && <li>You have {maxListenCount} listen{maxListenCount !== 1 ? 's' : ''} total</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          <div className="prose prose-lg max-w-none">
            <div
              className="text-gray-900 whitespace-pre-wrap leading-relaxed text-base font-medium"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  let html = prompt;
                  const lines = html.split('\n');
                  const processedLines = lines.map((line) => {
                    if (/^###\s+(.+)$/.test(line)) {
                      return line.replace(/^###\s+(.+)$/, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>');
                    }
                    if (/^##\s+(.+)$/.test(line)) {
                      return line.replace(/^##\s+(.+)$/, '<h2 class="text-xl font-bold text-gray-900 mt-5 mb-3">$1</h2>');
                    }
                    if (/^#\s+(.+)$/.test(line)) {
                      return line.replace(/^#\s+(.+)$/, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>');
                    }
                    return line;
                  });
                  html = processedLines.join('\n');
                  html = html.replace(/\*\*(.*?)\*\*/g, (match, content) => {
                    if (match.includes('<') || match.includes('>')) return match;
                    return `<strong class="font-bold">${content}</strong>`;
                  });
                  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em class="italic">$1</em>');
                  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>');
                  html = html.replace(/\n/g, '<br />');
                  return html;
                })()
              }}
            />
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors relative group">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-12 bg-gray-400 group-hover:bg-blue-500 rounded-full transition-colors" />
        </div>
      </div>

      {/* Right Panel - Options */}
      <div className="flex flex-col overflow-hidden bg-white shadow-lg w-[55%]">
        {/* Options Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">Select Your Answer</span>
          </div>
          {chosenOptionIds.length > 0 ? (
            <span className="text-sm font-semibold text-green-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Answer Selected
            </span>
          ) : (
            <span className="text-sm font-semibold text-gray-500">No answer selected</span>
          )}
        </div>

        {/* Options List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-3">
            {options.map((option, index) => {
              const isSelected = chosenOptionIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectOption(option.id)}
                  className={`
                    w-full flex items-center justify-start p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 text-left
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm bg-white'
                    }
                  `}
                >
                  <div className={`
                    flex items-center justify-center w-6 h-6 rounded-full border-2 mr-4 flex-shrink-0 transition-all
                    ${isSelected
                      ? 'bg-blue-600 border-blue-600 shadow-sm'
                      : 'border-gray-300 bg-white'
                    }
                  `}>
                    {isSelected && (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`font-semibold text-base leading-relaxed ${
                      isSelected ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      <span className="font-bold text-blue-600 mr-3 text-lg">{String.fromCharCode(65 + index)}.</span>
                      {option.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

