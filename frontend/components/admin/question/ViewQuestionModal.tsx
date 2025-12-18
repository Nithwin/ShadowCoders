'use client';

import { X, Code, FileText, CheckCircle2, Eye } from 'lucide-react';
import { QType } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Question = {
  id: string;
  order: number;
  type: QType;
  prompt: string | null;
  points: number;
  options?: Array<{ id: string; text: string }>;
  correctOptionIds?: string[];
  testcases?: Array<{ input: string; expectedOutput: string; isHidden: boolean; timeoutMs: number }>;
  starterCode?: string | null;
  wordLimit?: number | null;
};

interface ViewQuestionModalProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewQuestionModal({ question, open, onOpenChange }: ViewQuestionModalProps) {
  if (!open || !question) return null;

  const getQuestionTypeIcon = () => {
    switch (question.type) {
      case QType.CODING:
        return <Code className="w-6 h-6 text-purple-600" />;
      case QType.ESSAY:
        return <FileText className="w-6 h-6 text-orange-600" />;
      case QType.MCQ:
        return <CheckCircle2 className="w-6 h-6 text-blue-600" />;
      default:
        return <FileText className="w-6 h-6 text-gray-600" />;
    }
  };

  const getQuestionTypeColor = () => {
    switch (question.type) {
      case QType.CODING:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case QType.ESSAY:
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case QType.MCQ:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg border-2 ${getQuestionTypeColor()}`}>
              {getQuestionTypeIcon()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">View Question</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getQuestionTypeColor()}`}>
                  {question.type}
                </span>
                <span className="text-sm text-gray-600">
                  Question #{question.order} • {question.points} {question.points === 1 ? 'point' : 'points'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Question Prompt */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-500" />
              Question Prompt
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              {question.type === QType.CODING ? (
                // Removed 'prose' entirely to have full control over styling
                <div className="text-gray-900 leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-900 mt-5 mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="text-gray-900 leading-relaxed mb-4" {...props} />,
                      // Standardized code/pre handling
                      code(props) {
                        const {children, className, node, ...rest} = props
                        const match = /language-(\w+)/.exec(className || '')
                        // Check if it's rendered inside a pre (block) or inline
                        // react-markdown passes 'inline' prop, but types can be loose, so we rely on context or absence of newline for heuristics if needed.
                        // Actually, just check if it has a match or if it's being rendered as inline.
                        // The reliable way in updated react-markdown is usually checking the node or specific props, but standard styling works if we just split logic.
                        
                        // If we are inside a 'pre', this is a block. 
                        // But here 'code' transforms the *content* of the code.
                        // We'll style 'pre' for the box, and 'code' just cleans up.
                        
                        // However, to strictly catch inline `code`, we can check if it's NOT inside a pre.
                        // But react-markdown separates them well.
                        
                        const isInline = !match && !String(children).includes('\n')

                        if (isInline) {
                          return (
                            <code 
                              {...rest}
                              className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-sm font-mono border border-blue-100 align-middle inline-block mx-0.5"
                              style={{ 
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                              }}
                            >
                              {children}
                            </code>
                          )
                        }

                        // Block code content - let pre handle the container
                        return (
                          <code {...rest} className="bg-transparent text-inherit p-0 border-none">
                            {children}
                          </code>
                        )
                      },
                      // Style the pre container for block code
                      pre: ({node, ...props}) => (
                        <div className="my-4 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                          <pre {...props} className="p-4 overflow-x-auto text-gray-800 text-sm font-mono m-0 bg-white" />
                        </div>
                      ),
                      ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-3 text-gray-900 pl-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-900 pl-4" {...props} />,
                      li: ({node, ...props}) => <li className="text-gray-900 mb-1" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-700 my-4 bg-blue-50/50 py-2 rounded-r" {...props} />,
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-4 border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-t border-gray-100" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline transition-colors" {...props} />,
                    }}
                  >
                    {question.prompt || 'No prompt provided'}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {question.prompt || 'No prompt provided'}
                </div>
              )}
            </div>
          </div>

          {/* Type-specific content */}
          {question.type === QType.MCQ && question.options && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Options</h3>
              <div className="space-y-2">
                {question.options.map((option, index) => {
                  const isCorrect = question.correctOptionIds?.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      className={`p-4 rounded-lg border-2 ${
                        isCorrect
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`font-semibold ${
                          isCorrect ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span className={`flex-1 ${isCorrect ? 'text-green-900 font-medium' : 'text-gray-900'}`}>
                          {option.text}
                        </span>
                        {isCorrect && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">
                            Correct
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {question.type === QType.CODING && (
            <>
              {question.starterCode && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Starter Code</h3>
                  <div className="bg-[#1e1e1e] border border-gray-300 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100 font-mono">
                      <code>{question.starterCode}</code>
                    </pre>
                  </div>
                </div>
              )}

              {question.testcases && question.testcases.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Test Cases ({question.testcases.length})
                  </h3>
                  <div className="space-y-4">
                    {question.testcases.map((testcase, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            Test Case {index + 1}
                          </span>
                          {testcase.isHidden && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                              Hidden
                            </span>
                          )}
                          {testcase.timeoutMs && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                              Timeout: {testcase.timeoutMs}ms
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-1 uppercase">Input</div>
                            <pre className="bg-white border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto">
                              {testcase.input || '(empty)'}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-1 uppercase">Expected Output</div>
                            <pre className="bg-white border border-gray-200 rounded p-3 text-sm font-mono text-gray-800 overflow-x-auto">
                              {testcase.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {question.type === QType.ESSAY && question.wordLimit && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Word Limit</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <span className="text-gray-900 font-medium">{question.wordLimit} words</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

