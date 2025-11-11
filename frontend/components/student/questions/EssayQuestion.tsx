'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

type EssayQuestionProps = {
  questionId: string;
  prompt: string;
  wordLimit?: number | null;
  points: number;
  answer?: { textAnswer: string };
  onChange: (answer: { textAnswer: string }) => void;
};

export default function EssayQuestion({
  prompt,
  wordLimit,
  points,
  answer,
  onChange,
}: EssayQuestionProps) {
  const [text, setText] = useState(answer?.textAnswer || '');
  const isInitialMount = useRef(true);

  // Sync with answer prop changes
  useEffect(() => {
    if (answer?.textAnswer !== undefined && answer.textAnswer !== text) {
      setText(answer.textAnswer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer?.textAnswer]); // text is intentionally excluded to prevent infinite loop

  // Update parent when text changes (but not on initial mount to prevent infinite loop)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // Skip the first render
    }
    onChange({ textAnswer: text });
  }, [text, onChange]); // onChange is stable from parent, text triggers updates

  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const isOverLimit = wordLimit && wordCount > wordLimit;

  return (
    <div className="space-y-6">
      {/* Question Prompt */}
      <div className="prose prose-lg max-w-none bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div
          className="text-gray-900 whitespace-pre-wrap leading-relaxed font-medium"
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
        <div className="mt-4 flex items-center gap-4 text-sm flex-wrap">
          <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg font-semibold border border-amber-300">
            <strong>Points:</strong> {points}
          </span>
          {wordLimit && (
            <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-semibold border border-blue-300">
              <strong>Word Limit:</strong> {wordLimit}
            </span>
          )}
        </div>
      </div>

      {/* Answer Textarea */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">Your Answer</span>
          </div>
          {wordLimit && (
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm border ${
                isOverLimit 
                  ? 'bg-red-50 text-red-800 border-red-300' 
                  : wordCount >= wordLimit * 0.9 
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-300' 
                    : 'bg-green-50 text-green-800 border-green-300'
              }`}>
                {wordCount} / {wordLimit} words
              </div>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
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
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-96 p-6 bg-white text-gray-900 focus:outline-none resize-none leading-relaxed text-base border-0"
          placeholder="Write your answer here... Be clear, concise, and address all aspects of the question."
        />
        {!wordLimit && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 font-medium">
            Word Count: {wordCount}
          </div>
        )}
      </div>

      {isOverLimit && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-800 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">⚠️ Word Limit Exceeded</p>
              <p className="text-sm">You have exceeded the word limit. Please reduce your answer to {wordLimit} words or less.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

