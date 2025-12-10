'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Pause, Trash2, Upload, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';

type SpeakingQuestionProps = {
  questionId: string;
  prompt: string;
  points: number;
  attemptId: string;
  maxDurationSec?: number;
  maxReattempts?: number;
  answer?: { audioAssetId?: string };
  onChange: (answer: { audioAssetId: string }) => void;
  onNext?: () => void;
  onPrev?: () => void;
  canGoNext?: boolean;
  canGoPrev?: boolean;
  isLastQuestion?: boolean;
  onSubmit?: () => void;
};

export default function SpeakingQuestion({
  questionId,
  prompt,
  points,
  attemptId,
  maxDurationSec,
  maxReattempts,
  answer,
  onChange,
  onNext,
  onPrev,
  canGoNext = false,
  canGoPrev = false,
  isLastQuestion = false,
  onSubmit,
}: SpeakingQuestionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Note: Microphone access is now requested before starting the exam
  // This useEffect is kept for backward compatibility but should not be needed

  useEffect(() => {
    // Initialize audio element for playback
    if (audioUrl && !audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Clean up any active stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      // Start timer
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setRecordingTime(elapsed);
          
          // Check max duration
          if (maxDurationSec && elapsed >= maxDurationSec) {
            stopRecording();
          }
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
    }
  };

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          console.error('Error playing audio:', err);
          setError('Failed to play recording.');
        });
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setRecordedBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!recordedBlob) {
      setError('Please record your answer first.');
      return;
    }

    if (maxReattempts !== undefined && attemptCount >= maxReattempts) {
      setError(`Maximum reattempt limit (${maxReattempts}) reached.`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Convert blob to File
      const audioFile = new File([recordedBlob], `recording-${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      // Upload to student assets endpoint
      const formData = new FormData();
      formData.append('assetFile', audioFile);
      formData.append('kind', 'AUDIO');

      const { data: asset } = await api.post('/student/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Submit answer with audioAssetId
      await api.post(`/student/attempts/${attemptId}/responses`, {
        questionId,
        answer: { audioAssetId: asset.id },
      });

      onChange({ audioAssetId: asset.id });
      setSuccess(true);
      setAttemptCount((prev) => prev + 1);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setError(error?.response?.data?.message || error?.message || 'Failed to submit recording. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canReattempt = maxReattempts === undefined || attemptCount < maxReattempts;
  const remainingAttempts = maxReattempts !== undefined ? maxReattempts - attemptCount : null;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Mic className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Speaking Question</h2>
          </div>
          <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-300 shadow-sm">
            {points} {points === 1 ? 'point' : 'points'}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Prompt */}
        <div className="border-r border-gray-300 flex flex-col overflow-hidden bg-white shadow-lg w-[45%]">
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-white">
            <div className="prose prose-lg max-w-none">
              <div
                className="text-gray-900 whitespace-pre-wrap leading-relaxed text-base font-medium"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    let html = prompt;
                    const lines = html.split('\n');
                    const processedLines = lines.map((line) => {
                      if (/^###\s+(.+)$/.test(line)) {
                        return line.replace(/^###\s+(.+)$/, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>');
                      }
                      if (/^##\s+(.+)$/.test(line)) {
                        return line.replace(/^##\s+(.+)$/, '<h2 class="text-xl font-bold text-gray-900 mt-7 mb-4">$1</h2>');
                      }
                      if (/^#\s+(.+)$/.test(line)) {
                        return line.replace(/^#\s+(.+)$/, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-5">$1</h1>');
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

        {/* Right Panel - Recording Interface */}
        <div className="flex flex-col overflow-hidden bg-white shadow-lg w-[55%]">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Recording Controls */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-8 shadow-lg">
                <div className="flex flex-col items-center gap-6">
                  {/* Record Button */}
                  {!recordedBlob && (
                    <div className="text-center space-y-4">
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={!canReattempt && !recordedBlob}
                        className={`
                          w-24 h-24 rounded-full flex items-center justify-center
                          transition-all duration-200 shadow-lg
                          ${isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                            : canReattempt
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'bg-gray-400 cursor-not-allowed text-white'
                          }
                        `}
                      >
                        {isRecording ? (
                          <MicOff className="w-10 h-10" />
                        ) : (
                          <Mic className="w-10 h-10" />
                        )}
                      </button>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-gray-700">
                          {isRecording ? 'Recording...' : 'Click to Start Recording'}
                        </p>
                        {isRecording && (
                          <div className="flex items-center justify-center gap-2 text-red-600">
                            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                            <span className="font-mono text-xl font-bold">
                              {formatTime(recordingTime)}
                            </span>
                            {maxDurationSec && (
                              <span className="text-sm text-gray-600">
                                / {formatTime(maxDurationSec)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Playback Controls */}
                  {recordedBlob && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={playRecording}
                          className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all"
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6" />
                          ) : (
                            <Play className="w-6 h-6 ml-1" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={deleteRecording}
                          disabled={!canReattempt}
                          className={`
                            w-16 h-16 rounded-full flex items-center justify-center
                            transition-all duration-200 shadow-lg
                            ${canReattempt
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-gray-400 cursor-not-allowed text-white'
                            }
                          `}
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                      <p className="text-center text-sm text-gray-600">
                        {isPlaying ? 'Playing your recording...' : 'Review your recording'}
                      </p>
                    </div>
                  )}

                  {/* Info Messages */}
                  {maxDurationSec && (
                    <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Clock className="w-4 h-4" />
                        <span>Maximum duration: {formatTime(maxDurationSec)}</span>
                      </div>
                    </div>
                  )}

                  {maxReattempts !== undefined && (
                    <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-yellow-800">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          {remainingAttempts !== null && remainingAttempts > 0
                            ? `${remainingAttempts} reattempt${remainingAttempts !== 1 ? 's' : ''} remaining`
                            : 'No reattempts remaining'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  {recordedBlob && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isUploading || success || (!canReattempt && attemptCount >= (maxReattempts || 0))}
                      className={`
                        w-full px-6 py-3 rounded-lg font-semibold text-white
                        transition-all duration-200 shadow-lg
                        flex items-center justify-center gap-2
                        ${success
                          ? 'bg-green-600'
                          : isUploading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700'
                        }
                      `}
                    >
                      {isUploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : success ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Submitted Successfully
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Submit Recording
                        </>
                      )}
                    </button>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-red-800">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-green-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Your recording has been submitted successfully!</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canGoPrev}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${canGoPrev
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              Previous
            </button>
            <div className="flex gap-3">
              {!isLastQuestion && (
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canGoNext}
                  className={`
                    px-6 py-2 rounded-lg font-medium transition-all
                    ${canGoNext
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  Next
                </button>
              )}
              {isLastQuestion && onSubmit && (
                <button
                  type="button"
                  onClick={onSubmit}
                  className="px-6 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-all"
                >
                  Submit Exam
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

