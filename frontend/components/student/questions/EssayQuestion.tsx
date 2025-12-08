'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, AlertCircle, ArrowLeft, ArrowRight, Send, Loader2, X, Save } from 'lucide-react';
import { api } from '@/lib/api';

type EssayQuestionProps = {
  questionId: string;
  prompt: string;
  wordLimit?: number | null;
  points: number;
  attemptId: string;
  answer?: { textAnswer: string };
  onChange: (answer: { textAnswer: string }) => void;
  onNext?: () => void;
  onPrev?: () => void;
  canGoNext?: boolean;
  canGoPrev?: boolean;
  isLastQuestion?: boolean;
  onSubmit?: () => void;
  reportButton?: React.ReactNode;
};

export default function EssayQuestion({
  prompt,
  wordLimit,
  points,
  attemptId,
  questionId,
  answer,
  onChange,
  onNext,
  onPrev,
  canGoNext = false,
  canGoPrev = false,
  isLastQuestion = false,
  onSubmit,
  reportButton,
}: EssayQuestionProps) {
  const [text, setText] = useState(answer?.textAnswer || '');
  const [textareaWidth, setTextareaWidth] = useState(50); // Percentage width for textarea (50% default)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousQuestionIdRef = useRef<string>(questionId);

  // Reset state when question changes
  useEffect(() => {
    if (previousQuestionIdRef.current !== questionId) {
      // Question changed - reset all state
      previousQuestionIdRef.current = questionId;
      setIsSubmitting(false);
      setSubmitError('');
      setSubmitSuccess(false);
      
      // Reset text from answer or empty string
      if (answer?.textAnswer !== undefined) {
        setText(answer.textAnswer);
      } else {
        setText('');
      }
      
      // Reset initial mount flag for the new question
      isInitialMount.current = true;
    }
  }, [questionId, answer?.textAnswer]);

  // Sync with answer prop changes (only from external updates) - only if question hasn't changed
  // This handles cases where the answer is loaded asynchronously after component mounts
  useEffect(() => {
    // Only sync if we're still on the same question and this is the initial mount
    if (previousQuestionIdRef.current === questionId && isInitialMount.current) {
      if (answer?.textAnswer !== undefined && answer.textAnswer !== text) {
        setText(answer.textAnswer);
      }
      isInitialMount.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer?.textAnswer, questionId]);

  // Debounced onChange to prevent performance issues
  const debouncedOnChange = useCallback((value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (!isInitialMount.current) {
        onChange({ textAnswer: value });
      }
    }, 300); // 300ms debounce
  }, [onChange]);

  // Update parent when text changes (debounced)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    debouncedOnChange(text);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [text, debouncedOnChange]);

  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const isOverLimit = wordLimit && wordCount > wordLimit;

  // Handle submit - saves answer to server
  const handleSubmit = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!text.trim()) {
      setSubmitError('Please write an answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      // Save to parent component
      onChange({ textAnswer: text.trim() });
      
      // Save to server via API
      await api.post(`/student/attempts/${attemptId}/responses`, {
        questionId,
        answer: {
          textAnswer: text.trim(),
        },
      });
      
      setSubmitSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error('Error submitting essay answer:', err);
      setSubmitError(error.response?.data?.message || 'Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [text, questionId, attemptId, onChange]);

  // Handle clear - clears the textarea
  const handleClear = useCallback(() => {
    setText('');
    setSubmitError('');
    setSubmitSuccess(false);
    // Also update parent immediately
    onChange({ textAnswer: '' });
  }, [onChange]);

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left Panel - Question */}
      <div 
        className="border-r border-gray-300 flex flex-col overflow-hidden bg-white shadow-lg transition-all"
        style={{ width: `${100 - textareaWidth}%` }}
      >
        {/* Question Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Essay Question</h2>
            </div>
            <div className="flex items-center gap-3">
              {reportButton}
              <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-300">
                {points} {points === 1 ? 'point' : 'points'}
              </div>
            </div>
          </div>
          {wordLimit && (
            <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold border border-blue-300 inline-block">
              <strong>Word Limit:</strong> {wordLimit}
            </div>
          )}
        </div>

        {/* Question Prompt - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          <div className="prose prose-lg max-w-none">
            <div
              className="text-gray-900 whitespace-pre-wrap leading-relaxed mb-6 text-base font-medium"
              dangerouslySetInnerHTML={{ 
                __html: (() => {
                  let html = prompt;
                  // Split by lines to process headers properly
                  const lines = html.split('\n');
                  const processedLines = lines.map((line) => {
                    // Check for headers (must check in order: ###, ##, #)
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
                  
                  // Bold markdown **text**
                  html = html.replace(/\*\*(.*?)\*\*/g, (match, content) => {
                    // Don't replace if it's inside an HTML tag
                    if (match.includes('<') || match.includes('>')) return match;
                    return `<strong class="font-bold">${content}</strong>`;
                  });
                  // Italic markdown *text* (but not bold)
                  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em class="italic">$1</em>');
                  // Code blocks `code`
                  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>');
                  // Line breaks (but preserve headers on their own line)
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
        <input
          type="range"
          min="30"
          max="70"
          value={textareaWidth}
          onChange={(e) => setTextareaWidth(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize"
          style={{ writingMode: 'vertical-lr' }}
        />
      </div>

      {/* Right Panel - Answer Textarea */}
      <div 
        className="flex flex-col overflow-hidden bg-white shadow-lg transition-all"
        style={{ width: `${textareaWidth}%` }}
      >
        {/* Textarea Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">Your Answer</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Word Count / Word Limit */}
            {wordLimit && (
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-lg font-semibold text-sm border ${
                  isOverLimit 
                    ? 'bg-red-50 text-red-800 border-red-300' 
                    : wordCount >= wordLimit * 0.9 
                      ? 'bg-yellow-50 text-yellow-800 border-yellow-300' 
                      : 'bg-green-50 text-green-800 border-green-300'
                }`}>
                  {wordCount} / {wordLimit} words
                </div>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all rounded-full ${
                      isOverLimit 
                        ? 'bg-red-500' 
                        : wordCount >= wordLimit * 0.9 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((wordCount / wordLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {!wordLimit && (
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold border border-gray-300">
                Word Count: {wordCount}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleClear}
                disabled={isSubmitting || !text.trim()}
                type="button"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-400 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 disabled:hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !text.trim()}
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 disabled:hover:bg-blue-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Answer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="bg-green-50 border-t border-green-300 px-6 py-3 text-green-800 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span className="text-sm font-semibold">✅ Answer saved successfully!</span>
            </div>
          </div>
        )}
        {submitError && (
          <div className="bg-red-50 border-t border-red-300 px-6 py-3 text-red-800 shadow-sm flex-shrink-0">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-semibold">{submitError}</span>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // Clear success/error messages when user starts typing
              if (submitSuccess) setSubmitSuccess(false);
              if (submitError) setSubmitError('');
            }}
            className="flex-1 w-full p-6 bg-white text-gray-900 focus:outline-none resize-none leading-relaxed text-base border-0 custom-scrollbar"
            placeholder="Write your answer here... Be clear, concise, and address all aspects of the question."
          />
        </div>

        {/* Warning Message */}
        {isOverLimit && (
          <div className="bg-red-50 border-t border-red-300 px-6 py-4 text-red-800 shadow-sm flex-shrink-0">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">⚠️ Word Limit Exceeded</p>
                <p className="text-sm">You have exceeded the word limit. Please reduce your answer to {wordLimit} words or less.</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons for Essay Questions */}
        {(onNext || onPrev || onSubmit) && (
          <div className="border-t border-gray-300 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={!canGoPrev}
              type="button"
              className="border-2 border-gray-400 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all min-w-[140px] flex items-center justify-center"
              style={{ color: '#1f2937', backgroundColor: '#ffffff', borderColor: '#9ca3af' }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>
            
            {isLastQuestion && onSubmit ? (
              <button
                onClick={onSubmit}
                disabled={false}
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white border-0 px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all min-w-[140px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Exam
              </button>
            ) : (
              <button
                onClick={onNext}
                disabled={!canGoNext}
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all min-w-[140px] flex items-center justify-center"
              >
                Next Question
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

