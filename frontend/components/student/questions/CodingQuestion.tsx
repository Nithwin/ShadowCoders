'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, Terminal, Info, Code, FileText, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'python', label: 'Python 3', monacoLang: 'python' },
  { value: 'java', label: 'Java', monacoLang: 'java' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'c', label: 'C', monacoLang: 'c' },
  { value: 'csharp', label: 'C#', monacoLang: 'csharp' },
];

// Theme is fixed to 'vs-dark' (dark theme only)

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
  const [theme] = useState('vs-dark'); // Fixed to dark theme only, no state changes to prevent flicker
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<{
    passed: number;
    total: number;
    testResults: TestResult[];
    message: string;
  } | null>(null);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [queueStatus, setQueueStatus] = useState<{
    running: number;
    queued: number;
    estimatedWaitTimeMs: number;
  } | null>(null);
  const [editorWidth, setEditorWidth] = useState(50); // Percentage width for editor (50% default)
  const isInitialMount = useRef(true);
  const editorRef = useRef<{ updateOptions: (options: Record<string, unknown>) => void } | null>(null);

  // Get Monaco language for current language
  const monacoLanguage = LANGUAGES.find(lang => lang.value === language)?.monacoLang || 'javascript';

  // Sync with answer prop changes from parent (external updates)
  useEffect(() => {
    if (answer) {
      if (answer.code !== undefined && answer.code !== code) {
        setCode(answer.code);
      }
      if (answer.language !== undefined && answer.language !== language) {
        setLanguage(answer.language);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer?.code, answer?.language]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Fetch queue status periodically when running
  useEffect(() => {
    if (!isRunning) return;

    const fetchQueueStatus = async () => {
      try {
        const response = await api.get('/queue/status');
        setQueueStatus(response.data);
      } catch (err) {
        // Silently fail - queue status is not critical
        console.error('Failed to fetch queue status:', err);
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [isRunning]);

  // Filter visible test cases (for display and run code)
  const visibleTestCases = testCases.filter((tc) => !tc.isHidden);

  // Handle editor mount
  const handleEditorDidMount = (editor: { updateOptions: (options: Record<string, unknown>) => void }, monaco: { languages: { setLanguageConfiguration: (language: string, config: Record<string, unknown>) => void } }) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      formatOnPaste: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true,
      },
    });

    // Enable autocomplete for different languages
    monaco.languages.setLanguageConfiguration(monacoLanguage, {
      comments: {
        lineComment: language === 'python' ? '#' : '//',
        blockComment: language === 'python' ? ['"""', '"""'] : ['/*', '*/'],
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });
  };

  // Debounce timer for code changes
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle code change from editor (debounced to prevent performance issues)
  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    
    // Debounce the onChange callback
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (!isInitialMount.current) {
        onChange({ code: newCode, language });
      }
    }, 500); // 500ms debounce for code
  };

  // Run code with visible test cases only (for testing) - memoized to prevent flicker
  const handleRunCode = useCallback(async () => {
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error('Error running code:', err);
      setError(error.response?.data?.message || 'Failed to run code. Please try again.');
    } finally {
      setIsRunning(false);
    }
  }, [code, language, questionId, attemptId]);

  // Submit code (saves answer only - no execution) - memoized to prevent flicker
  const handleSubmitCode = useCallback(async () => {
    if (!code.trim()) {
      setError('Please write some code before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Save the answer to the parent component and server
      onChange({ code, language });
      
      // Save to server via API
      await api.post(`/student/attempts/${attemptId}/responses`, {
        questionId,
        answer: {
          code: code.trim(),
          language: language,
        },
      });
      
      // Show success message
      setTestResults(null);
      setOutput('Code saved successfully! Your answer has been submitted. You can continue to the next question or submit the exam when ready.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error('Error submitting code:', err);
      setError(error.response?.data?.message || 'Failed to submit code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, language, questionId, attemptId, onChange]);

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left Panel - Question and Test Cases */}
      <div 
        className="border-r border-gray-300 flex flex-col overflow-hidden bg-white shadow-lg transition-all"
        style={{ width: `${100 - editorWidth}%` }}
      >
        {/* Question Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Code className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Coding Question</h2>
            </div>
            <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-300">
              {points} {points === 1 ? 'point' : 'points'}
            </div>
          </div>
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
                  
                  // Bold markdown **text** (but not inside headers)
                  html = html.replace(/(?<!>)\*\*(.*?)\*\*(?!<)/g, '<strong class="font-bold">$1</strong>');
                  // Fallback if lookbehind doesn't work
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

          {/* Sample Test Cases */}
          {visibleTestCases.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
                Sample Test Cases
              </h3>
              <div className="space-y-4">
                {visibleTestCases.map((testCase, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow transition-shadow">
                    <div className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">Example {index + 1}</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Input:</div>
                        <pre className="text-sm text-gray-800 font-mono bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto">
                          {testCase.input || '(empty)'}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Expected Output:</div>
                        <pre className="text-sm text-gray-800 font-mono bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto">
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
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-3 text-base">💡 Important Notes:</p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong>Run Code:</strong> Tests your code with sample test cases and shows output</li>
                  <li><strong>Submit:</strong> Saves your answer without running tests (for final submission)</li>
                  <li>Hidden test cases will be used for final grading after exam submission</li>
                  <li>Test thoroughly using &quot;Run Code&quot; before submitting your final answer</li>
                </ul>
              </div>
            </div>
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
          value={editorWidth}
          onChange={(e) => setEditorWidth(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize"
          style={{ writingMode: 'vertical-lr' }}
        />
      </div>

      {/* Right Panel - Code Editor and Output */}
      <div 
        className="flex flex-col overflow-hidden bg-white shadow-lg transition-all"
        style={{ width: `${editorWidth}%` }}
      >
        {/* Editor Header with Language and Theme Selectors */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col gap-3 flex-shrink-0">
          {/* Top Row: Language and Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold text-gray-900">Code Editor</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Language:</label>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                  className="px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-all shadow-sm"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme Display (Fixed to Dark) */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Theme:</label>
                <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 text-sm font-semibold">
                  Dark
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Queue Status Indicator */}
            {queueStatus && queueStatus.queued > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">
                  {queueStatus.queued} job{queueStatus.queued !== 1 ? 's' : ''} in queue
                  {queueStatus.estimatedWaitTimeMs > 0 && (
                    <> • Est. wait: {Math.ceil(queueStatus.estimatedWaitTimeMs / 1000)}s</>
                  )}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting || !code.trim()}
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-6 py-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold rounded-lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {queueStatus && queueStatus.queued > 0 ? 'Queued...' : 'Running...'}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Code
                  </>
                )}
              </button>
            
            <button
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting || !code.trim()}
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white border-0 px-6 py-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold rounded-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit
                </>
              )}
            </button>
          </div>
          </div>
        </div>

        {/* Monaco Code Editor */}
        <div className="flex-1 min-h-0 border-b border-gray-200 relative">
          <div className="absolute inset-0">
            <MonacoEditor
              height="100%"
              language={monacoLanguage}
              theme={theme}
              value={code}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 15,
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: {
                  other: true,
                  comments: true,
                  strings: true,
                },
                acceptSuggestionOnCommitCharacter: true,
                acceptSuggestionOnEnter: 'on',
                snippetSuggestions: 'top',
                suggestSelection: 'first',
                wordBasedSuggestions: 'allDocuments',
                parameterHints: { enabled: true },
                bracketPairColorization: { enabled: true },
                guides: {
                  bracketPairs: true,
                  indentation: true,
                },
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                contextmenu: true,
                mouseWheelZoom: true,
                multiCursorModifier: 'ctrlCmd',
                accessibilitySupport: 'auto',
              }}
              loading={
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading code editor...</p>
                  </div>
                </div>
              }
            />
          </div>
        </div>

        {/* Output/Results Panel */}
        <div className="border-t border-gray-200 bg-gray-50 flex flex-col max-h-[40%] min-h-[250px]">
          <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
            <Terminal className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">Test Results</span>
            {testResults && (
              <span className="ml-auto text-xs font-semibold text-gray-700 bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                {testResults.passed}/{testResults.total} passed
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Execution Error</p>
                    <p className="text-xs whitespace-pre-wrap">{error}</p>
                  </div>
                </div>
              </div>
            )}
            {testResults && (
              <div className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-lg border ${
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
                  <p className="text-sm mt-2 text-gray-600">
                    {testResults.message}
                  </p>
                </div>

                {/* Detailed Results */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Detailed Results:</h4>
                  {testResults.testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border transition-all ${
                        result.passed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {result.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-semibold text-sm text-gray-900">
                          Test Case {index + 1}: {result.passed ? '✅ Passed' : '❌ Failed'}
                        </span>
                        <span className="ml-auto text-xs text-gray-500">{result.status}</span>
                      </div>
                      {result.actualOutput !== null && (
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-semibold text-gray-700">Your Output:</span>
                            <pre className="mt-1 p-3 bg-white rounded-lg font-mono text-xs overflow-x-auto border border-gray-200">
                              {result.actualOutput || '(empty)'}
                            </pre>
                          </div>
                          {!result.passed && (
                            <div>
                              <span className="font-semibold text-gray-700">Expected Output:</span>
                              <pre className="mt-1 p-3 bg-white rounded-lg font-mono text-xs overflow-x-auto border border-gray-200">
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
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{output}</pre>
              </div>
            )}
            {!testResults && !output && !error && (
              <div className="text-center text-gray-400 py-8">
                <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Run your code to see test results here</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons for Coding Questions */}
        {(onNext || onPrev || onSubmit) && (
          <div className="border-t border-gray-300 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={!canGoPrev || isRunning || isSubmitting}
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
                disabled={isRunning || isSubmitting}
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white border-0 px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all min-w-[140px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={onNext}
                disabled={!canGoNext || isRunning || isSubmitting}
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
