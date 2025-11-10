'use client';

import { QType } from '@/types';

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
  questionId,
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
      <div className="prose prose-lg max-w-none bg-primary/5 p-6 rounded-xl border border-primary/10 shadow-sm">
        <div
          className="text-primary whitespace-pre-wrap leading-relaxed"
          dangerouslySetInnerHTML={{ __html: prompt.replace(/\n/g, '<br />') }}
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
                flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                ${isSelected
                  ? 'border-primary bg-gradient-to-r from-primary/15 to-primary/5 shadow-lg scale-[1.02]'
                  : 'border-primary/20 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md'
                }
              `}
            >
              <div className={`
                flex items-center justify-center w-6 h-6 rounded-full border-2 mr-4 mt-0.5 flex-shrink-0 transition-all
                ${isSelected 
                  ? 'bg-primary border-primary' 
                  : 'border-primary/40 group-hover:border-primary'
                }
              `}>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                )}
              </div>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOption(option.id)}
                className="sr-only"
              />
              <div className="flex-1">
                <span className="text-primary font-medium text-base">
                  <span className="font-bold text-primary/70 mr-2">{String.fromCharCode(65 + index)}.</span>
                  {option.text}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Points Info */}
      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
        <div className="text-sm text-primary/70">
          <span className="font-semibold">Points:</span> {points}
        </div>
        <div className="text-sm text-primary/70">
          <span className="font-semibold">Selected:</span> {chosenOptionIds.length} {chosenOptionIds.length === 1 ? 'option' : 'options'}
        </div>
      </div>
    </div>
  );
}

