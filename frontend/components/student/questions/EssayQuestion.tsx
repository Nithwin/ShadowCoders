'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

type EssayQuestionProps = {
  questionId: string;
  prompt: string;
  wordLimit?: number | null;
  points: number;
  answer?: { textAnswer: string };
  onChange: (answer: { textAnswer: string }) => void;
};

export default function EssayQuestion({
  questionId,
  prompt,
  wordLimit,
  points,
  answer,
  onChange,
}: EssayQuestionProps) {
  const [text, setText] = useState(answer?.textAnswer || '');

  useEffect(() => {
    onChange({ textAnswer: text });
  }, [text, onChange]);

  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const isOverLimit = wordLimit && wordCount > wordLimit;

  return (
    <div className="space-y-6">
      {/* Question Prompt */}
      <div className="prose prose-lg max-w-none bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/10 shadow-sm">
        <div
          className="text-primary whitespace-pre-wrap leading-relaxed"
          dangerouslySetInnerHTML={{ __html: prompt.replace(/\n/g, '<br />') }}
        />
        <div className="mt-4 flex items-center gap-4 text-sm text-primary/70 flex-wrap">
          <span className="px-3 py-1 bg-primary/20 rounded-lg font-semibold">
            <strong>Points:</strong> {points}
          </span>
          {wordLimit && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-semibold border border-blue-300">
              <strong>Word Limit:</strong> {wordLimit}
            </span>
          )}
        </div>
      </div>

      {/* Answer Textarea */}
      <div className="border-2 border-primary/20 rounded-xl overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-3 flex items-center justify-between border-b border-primary/20">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-primary">Your Answer</span>
          </div>
          {wordLimit && (
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-lg font-semibold text-sm border-2 ${
                isOverLimit 
                  ? 'bg-red-100 text-red-800 border-red-300' 
                  : wordCount >= wordLimit * 0.9 
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                    : 'bg-green-100 text-green-800 border-green-300'
              }`}>
                {wordCount} / {wordLimit} words
              </div>
              <div className="w-24 h-2 bg-primary/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
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
          className="w-full h-96 p-6 bg-secondary text-primary focus:outline-none resize-none leading-relaxed text-base"
          placeholder="Write your answer here... Be clear, concise, and address all aspects of the question."
        />
        {!wordLimit && (
          <div className="px-4 py-3 bg-primary/5 border-t border-primary/10 text-xs text-primary/60 font-medium">
            Word Count: {wordCount}
          </div>
        )}
      </div>

      {isOverLimit && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-4 text-red-800 shadow-md">
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

