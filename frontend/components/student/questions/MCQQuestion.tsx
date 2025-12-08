'use client';

import { useState } from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';

type Option = {
  id: string;
  text: string;
};

type MCQQuestionProps = {
  questionId: string;
  prompt: string;
  options: Option[];
  points: number;
  answer?: { chosenOptionIds: string[] };
  onChange: (answer: { chosenOptionIds: string[] }) => void;
  reportButton?: React.ReactNode;
};

export default function MCQQuestion({
  questionId,
  prompt,
  options,
  points,
  answer,
  onChange,
  reportButton,
}: MCQQuestionProps) {
  const [questionWidth, setQuestionWidth] = useState(50); // Percentage width for question (50% default)
  const chosenOptionIds = answer?.chosenOptionIds || [];

  const selectOption = (optionId: string) => {
    // Only allow single selection - replace the array with just the selected option
    onChange({ chosenOptionIds: [optionId] });
  };

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left Panel - Question */}
      <div 
        className="border-r border-gray-300 flex flex-col overflow-hidden bg-white shadow-lg transition-all"
        style={{ width: `${100 - questionWidth}%` }}
      >
        {/* Question Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Multiple Choice Question</h2>
            </div>
            <div className="flex items-center gap-3">
              {reportButton}
              <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-300">
                {points} {points === 1 ? 'point' : 'points'}
              </div>
            </div>
          </div>
        </div>

        {/* Question Prompt - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-white">
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
          value={questionWidth}
          onChange={(e) => setQuestionWidth(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize"
          style={{ writingMode: 'vertical-lr' }}
        />
      </div>

      {/* Right Panel - Options */}
      <div 
        className="flex flex-col overflow-hidden bg-white shadow-lg transition-all"
        style={{ width: `${questionWidth}%` }}
      >
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

