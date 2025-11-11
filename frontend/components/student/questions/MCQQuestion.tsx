'use client';

import { CheckCircle2 } from 'lucide-react';

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
};

export default function MCQQuestion({
  prompt,
  options,
  points,
  answer,
  onChange,
}: MCQQuestionProps) {
  const chosenOptionIds = answer?.chosenOptionIds || [];

  const toggleOption = (optionId: string) => {
    const current = chosenOptionIds;
    const newSelection = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    onChange({ chosenOptionIds: newSelection });
  };

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
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = chosenOptionIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={`
                flex items-start p-5 rounded-lg border-2 cursor-pointer transition-all duration-200 group
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.01]'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm bg-white'
                }
              `}
            >
              <div className={`
                flex items-center justify-center w-6 h-6 rounded-full border-2 mr-4 mt-0.5 flex-shrink-0 transition-all
                ${isSelected 
                  ? 'bg-blue-600 border-blue-600' 
                  : 'border-gray-300 group-hover:border-blue-400 bg-white'
                }
              `}>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOption(option.id)}
                className="sr-only"
              />
              <div className="flex-1">
                <span className={`font-medium text-base ${
                  isSelected ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  <span className="font-bold text-blue-600 mr-2">{String.fromCharCode(65 + index)}.</span>
                  {option.text}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Points Info */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Points:</span> {points}
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Selected:</span> {chosenOptionIds.length} {chosenOptionIds.length === 1 ? 'option' : 'options'}
        </div>
      </div>
    </div>
  );
}

