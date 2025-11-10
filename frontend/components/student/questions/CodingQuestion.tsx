'use client';

import { useState, useEffect } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, Terminal, Info, Code, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

type TestCase = {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
};

type CodingQuestionProps = {
  questionId: string;
  prompt: string;
  starterCode?: string | null;
  testCases?: TestCase[];
  points: number;
  attemptId: string;
  answer?: { code?: string; language?: string };
  onChange: (answer: { code: string; language: string }) => void;
  onNext?: () => void;
  onPrev?: () => void;
  canGoNext?: boolean;
  canGoPrev?: boolean;
  isLastQuestion?: boolean;
  onSubmit?: () => void;
};

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python 3' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
];

type TestResult = {
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
  error?: string;
  status: string;
};

export default function CodingQuestion({
  questionId,
  prompt,
  starterCode,
  testCases = [],
  points,
  attemptId,
  answer,
  onChange,
  onNext,
  onPrev,
  canGoNext = false,
  canGoPrev = false,
  isLastQuestion = false,
  onSubmit,
}: CodingQuestionProps) {
  const [code, setCode] = useState(answer?.code || starterCode || '');
  const [language, setLanguage] = useState(answer?.language || 'javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    passed: number;
    total: number;
    testResults: TestResult[];
    message: string;
  } | null>(null);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Update parent when code or language changes
  useEffect(() => {
    onChange({ code, language });
  }, [code, language, onChange]);

  // Filter visible test cases (for display)
  const visibleTestCases = testCases.filter((tc) => !tc.isHidden);

  const handleRunCode = async () => {
    if (!code.trim()) {
      setError('Please write some code before running.');
      return;
    }

    setIsRunning(true);
    setError('');
    setOutput('');
    setTestResults(null);

    try {
      const response = await api.post(`/student/attempts/${attemptId}/run-code`, {
        questionId,
        code,
        language,
      });

      const result = response.data;
      setTestResults(result);
      setOutput(result.message || '');
    } catch (err: any) {
      console.error('Error running code:', err);
      setError(err.response?.data?.message || 'Failed to run code. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Question and Test Cases */}
      <div className="w-1/2 border-r border-primary/20 flex flex-col overflow-hidden bg-gradient-to-br from-secondary to-primary/5">
        {/* Question Header */}
        <div className="p-6 border-b border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-primary">Coding Question</h2>
            </div>
            <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-semibold border border-yellow-300">
              {points} {points === 1 ? 'point' : 'points'}
            </div>
          </div>
          
          {/* Language Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-primary">Language:</label>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                onChange({ code, language: e.target.value });
              }}
              className="px-4 py-2 bg-secondary rounded-lg border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 text-primary text-sm font-medium"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Question Prompt - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="prose prose-lg max-w-none">
            <div
              className="text-primary whitespace-pre-wrap leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: prompt.replace(/\n/g, '<br />') }}
            />
          </div>

          {/* Sample Test Cases */}
          {visibleTestCases.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Sample Test Cases
              </h3>
              <div className="space-y-4">
                {visibleTestCases.map((testCase, index) => (
                  <div key={index} className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                    <div className="text-sm font-semibold text-primary/70 mb-2">Example {index + 1}:</div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-semibold text-primary/60 mb-1">Input:</div>
                        <pre className="text-sm text-primary font-mono bg-secondary p-3 rounded border border-primary/10 overflow-x-auto">
                          {testCase.input}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-primary/60 mb-1">Output:</div>
                        <pre className="text-sm text-primary font-mono bg-secondary p-3 rounded border border-primary/10 overflow-x-auto">
                          {testCase.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">💡 Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Test your code with the sample test cases before submitting</li>
                  <li>Hidden test cases will be used for final grading</li>
                  <li>Make sure your code handles edge cases</li>
                  <li>Test thoroughly before submitting your final answer</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Code Editor and Output */}
      <div className="w-1/2 flex flex-col overflow-hidden bg-secondary">
        {/* Editor Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-6 py-4 border-b border-primary/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Code Editor</span>
            {code.trim() && (
              <span className="text-xs text-primary/60 px-2 py-1 bg-primary/10 rounded">
                {code.split('\n').length} lines
              </span>
            )}
          </div>
          <Button
            onClick={handleRunCode}
            disabled={isRunning || !code.trim()}
            className="bg-green-600 hover:bg-green-700 text-white border-0 text-sm px-4 py-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Code
              </>
            )}
          </Button>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              onChange({ code: e.target.value, language });
            }}
            className="flex-1 w-full p-6 bg-secondary font-mono text-sm text-primary focus:outline-none resize-none leading-relaxed border-none"
            placeholder="// Write your code here...&#10;// Use the sample test cases to test your solution"
            spellCheck={false}
          />
        </div>

        {/* Output/Results Panel */}
        <div className="border-t border-primary/20 bg-secondary flex flex-col max-h-[40%] min-h-[200px]">
          <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-6 py-3 border-b border-primary/20 flex items-center gap-2 flex-shrink-0">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Test Results</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Execution Error</p>
                    <p className="text-xs">{error}</p>
                  </div>
                </div>
              </div>
            )}
            {testResults && (
              <div className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-lg border-2 ${
                  testResults.passed === testResults.total
                    ? 'bg-green-50 border-green-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <div className={`flex items-center gap-2 text-lg font-bold ${
                    testResults.passed === testResults.total ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {testResults.passed === testResults.total ? (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        <span>All test cases passed! ✅</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6" />
                        <span>{testResults.passed}/{testResults.total} test cases passed</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm mt-2 opacity-80">
                    {testResults.message}
                  </p>
                </div>

                {/* Detailed Results */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary/70">Detailed Results:</h4>
                  {testResults.testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        result.passed
                          ? 'bg-green-50/50 border-green-200'
                          : 'bg-red-50/50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {result.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-semibold text-sm">
                          Test Case {index + 1}: {result.passed ? '✅ Passed' : '❌ Failed'}
                        </span>
                        <span className="ml-auto text-xs text-primary/60">{result.status}</span>
                      </div>
                      {result.actualOutput !== null && (
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-semibold text-primary/70">Your Output:</span>
                            <pre className="mt-1 p-3 bg-white rounded-lg font-mono text-xs overflow-x-auto border border-primary/10">
                              {result.actualOutput || '(empty)'}
                            </pre>
                          </div>
                          {!result.passed && (
                            <div>
                              <span className="font-semibold text-primary/70">Expected Output:</span>
                              <pre className="mt-1 p-3 bg-white rounded-lg font-mono text-xs overflow-x-auto border border-primary/10">
                                {result.expectedOutput}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      {result.error && (
                        <div className="mt-2 p-3 bg-red-100 rounded-lg border border-red-200">
                          <span className="font-semibold text-red-800 text-xs">Error:</span>
                          <pre className="mt-1 text-red-700 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                            {result.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {output && !testResults && !error && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <pre className="text-sm text-primary font-mono whitespace-pre-wrap">{output}</pre>
              </div>
            )}
            {!testResults && !output && !error && (
              <div className="text-center text-primary/50 py-8">
                <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Run your code to see test results here</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons for Coding Questions */}
        {(onNext || onPrev || onSubmit) && (
          <div className="border-t border-primary/20 bg-secondary px-6 py-4 flex items-center justify-between flex-shrink-0">
            <Button
              onClick={onPrev}
              disabled={!canGoPrev}
              className="border-2 border-primary/20 hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {isLastQuestion && onSubmit ? (
              <Button
                onClick={onSubmit}
                className="bg-green-600 hover:bg-green-700 text-white border-0"
              >
                Submit Exam
              </Button>
            ) : (
              <Button
                onClick={onNext}
                disabled={!canGoNext}
                className="bg-primary text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Question
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
