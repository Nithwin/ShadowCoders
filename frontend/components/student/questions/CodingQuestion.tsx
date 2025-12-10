'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, Terminal, Info, Code, FileText, ArrowLeft, ArrowRight, Send, RotateCcw } from 'lucide-react';
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
  allowedLanguages?: string[] | null;
  reportButton?: React.ReactNode;
};

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'python', label: 'Python 3', monacoLang: 'python' },
  { value: 'java', label: 'Java', monacoLang: 'java' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'c', label: 'C', monacoLang: 'c' },
  { value: 'csharp', label: 'C#', monacoLang: 'csharp' },
  { value: 'sql', label: 'SQL (SQLite)', monacoLang: 'sql' },
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
  allowedLanguages,
  reportButton,
}: CodingQuestionProps) {
  // Filter available languages based on exam's allowedLanguages
  const availableLanguages = allowedLanguages && allowedLanguages.length > 0
    ? LANGUAGES.filter(lang => allowedLanguages.includes(lang.value))
    : LANGUAGES; // If no restrictions, show all languages

  // Ensure the default language is in the allowed list
  const defaultLanguage = availableLanguages.length > 0 
    ? (answer?.language && availableLanguages.some(l => l.value === answer.language) 
        ? answer.language 
        : availableLanguages[0].value)
    : 'javascript';

  const [code, setCode] = useState(answer?.code || starterCode || '');
  const [language, setLanguage] = useState(defaultLanguage);
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
  const [isSubmitMode, setIsSubmitMode] = useState(false); // Track if we're in submit mode (hide detailed results)
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [submitCooldown, setSubmitCooldown] = useState(0); // Cooldown in seconds
  const isInitialMount = useRef(true);
  const editorRef = useRef<{ updateOptions: (options: Record<string, unknown>) => void } | null>(null);
  const previousQuestionIdRef = useRef<string>(questionId);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get Monaco language for current language
  const monacoLanguage = availableLanguages.find(lang => lang.value === language)?.monacoLang || availableLanguages[0]?.monacoLang || 'javascript';

  // Reset state when question changes
  useEffect(() => {
    if (previousQuestionIdRef.current !== questionId) {
      // Question changed - reset all state
      previousQuestionIdRef.current = questionId;
      setTestResults(null);
      setOutput('');
      setError('');
      setQueueStatus(null);
      setIsRunning(false);
      setIsSubmitting(false);
      setIsSubmitMode(false);
      
      // Reset code and language from answer or starter code
      if (answer?.code !== undefined) {
        setCode(answer.code);
      } else if (starterCode) {
        setCode(starterCode);
      } else {
        setCode('');
      }
      
      if (answer?.language !== undefined && availableLanguages.some(l => l.value === answer.language)) {
        setLanguage(answer.language);
      } else {
        setLanguage(defaultLanguage);
      }
      
      // Reset cooldown when question changes
      setSubmitCooldown(0);
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      
      // Reset initial mount flag for new question
      isInitialMount.current = true;
    }
  }, [questionId, answer?.code, answer?.language, starterCode, availableLanguages, defaultLanguage]);

  // Sync with answer prop changes from parent ONLY on initial mount (not after user edits)
  // This prevents server responses from overwriting user edits after submission
  useEffect(() => {
    if (previousQuestionIdRef.current === questionId && isInitialMount.current && answer) {
      if (answer.code !== undefined && answer.code !== code) {
        setCode(answer.code);
      }
      if (answer.language !== undefined && answer.language !== language) {
        // Only update if the language is in the allowed list
        if (availableLanguages.some(l => l.value === answer.language)) {
          setLanguage(answer.language);
        }
      }
      // Mark as no longer initial mount to prevent future syncing
      isInitialMount.current = false;
    } else if (previousQuestionIdRef.current === questionId && !isInitialMount.current) {
      // After initial mount, don't sync - let user edits persist
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer?.code, answer?.language, availableLanguages]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (submitCooldown > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setSubmitCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [submitCooldown]);

  // Fetch queue status periodically when running
  useEffect(() => {
    if (!isRunning) return;

    const fetchQueueStatus = async () => {
      try {
        const response = await api.get('/queue/status');
        setQueueStatus(response.data);
      } catch (err) {
        // Silently fail - queue status is not critical
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch queue status:', err);
        }
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
    
    // Mark that user has made edits - don't let answer prop overwrite
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    
    // Debounce the onChange callback
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange({ code: newCode, language });
    }, 500); // 500ms debounce for code
  };

  // Handle clear button - reset to starter code or empty
  const handleClearCode = useCallback(() => {
    const newCode = starterCode || '';
    setCode(newCode);
    setError('');
    setOutput('');
    setTestResults(null);
    setIsSubmitMode(false);
    // Mark as no longer initial mount
    isInitialMount.current = false;
    // Immediately update parent
    onChange({ code: newCode, language });
  }, [starterCode, language, onChange]);

  // Run code with visible test cases only (for testing) - memoized to prevent flicker
  const handleRunCode = useCallback(async () => {
    if (!code.trim()) {
      setError('Please write some code before running.');
      return;
    }

    setIsRunning(true);
    setIsSubmitMode(false); // Reset submit mode when running
    setError('');
    setOutput('');
    setTestResults(null);

    try {
      const response = await api.post(`/student/attempts/${attemptId}/run-code`, {
        questionId,
        code,
        language,
        customInput: showCustomInput ? customInput : undefined,
      });

      const result = response.data;
      setTestResults(result);
      setOutput(result.message || '');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      if (process.env.NODE_ENV === 'development') {
        console.error('Error running code:', err);
      }
      setError(error.response?.data?.message || 'Failed to run code. Please try again.');
    } finally {
      setIsRunning(false);
    }
  }, [code, language, questionId, attemptId, showCustomInput, customInput]);

  // Submit code (runs ALL test cases including hidden ones, then saves) - memoized to prevent flicker
  const handleSubmitCode = useCallback(async () => {
    if (!code.trim()) {
      setError('Please write some code before submitting.');
      return;
    }

    // Check if cooldown is active
    if (submitCooldown > 0) {
      setError(`Please wait ${submitCooldown} second${submitCooldown !== 1 ? 's' : ''} before submitting again.`);
      return;
    }

    setIsSubmitting(true);
    setIsSubmitMode(true); // Enable submit mode to hide detailed results
    setError('');
    setOutput('');

    try {
      // First, run the code with ALL test cases (including hidden ones)
      // Note: Backend needs to support runAllTests parameter to run hidden test cases
      // For now, this will run visible test cases, but UI will hide details
      const runResponse = await api.post(`/student/attempts/${attemptId}/run-code`, {
        questionId,
        code,
        language,
        runAllTests: true, // Request to run all test cases (backend support needed)
      });

      const runResult = runResponse.data;
      setTestResults(runResult);
      
      // In submit mode, only show summary message, not detailed output
      const passed = runResult.passed;
      const total = runResult.total;
      const failed = total - passed;
      
      if (passed === total) {
        setOutput(`✅ All ${total} test case${total !== 1 ? 's' : ''} passed! Your code has been submitted.`);
      } else {
        setOutput(`⚠️ ${passed} test case${passed !== 1 ? 's' : ''} passed, ${failed} test case${failed !== 1 ? 's' : ''} failed. Your code has been submitted.`);
      }
      
      // Then save the answer to the parent component and server
      onChange({ code, language });
      
      // Save to server via API
      await api.post(`/student/attempts/${attemptId}/responses`, {
        questionId,
        answer: {
          code: code.trim(),
          language: language,
        },
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      if (process.env.NODE_ENV === 'development') {
        console.error('Error submitting code:', err);
      }
      
      // Try to save anyway even if run fails
      try {
        onChange({ code, language });
        await api.post(`/student/attempts/${attemptId}/responses`, {
          questionId,
          answer: {
            code: code.trim(),
            language: language,
          },
        });
        setError('Failed to run tests, but your code has been saved. ' + (error.response?.data?.message || 'Please try running code manually.'));
      } catch (saveErr) {
        setError(error.response?.data?.message || 'Failed to submit code. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      // Start 1-minute cooldown after submission
      setSubmitCooldown(60);
    }
  }, [code, language, questionId, attemptId, onChange, submitCooldown]);

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
            <div className="flex items-center gap-3">
              {reportButton}
              <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-300">
                {points} {points === 1 ? 'point' : 'points'}
              </div>
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
                  // Split by lines to process headers properly
                  const lines = html.split(/\r?\n/);
                  const processedLines = lines.map((line) => {
                    // Check for headers (must check in order: ###, ##, #)
                    // Trim line for regex check to be safe
                    const trimmedLine = line.trim();
                    if (/^###\s+(.+)$/.test(trimmedLine)) {
                      return trimmedLine.replace(/^###\s+(.+)$/, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>');
                    }
                    if (/^##\s+(.+)$/.test(trimmedLine)) {
                      return trimmedLine.replace(/^##\s+(.+)$/, '<h2 class="text-xl font-bold text-gray-900 mt-5 mb-3">$1</h2>');
                    }
                    if (/^#\s+(.+)$/.test(trimmedLine)) {
                      return trimmedLine.replace(/^#\s+(.+)$/, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>');
                    }
                    return line; // Return original line content (preserves indentation/spaces if not header)
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
                  <li><strong>Run Code:</strong> Tests your code with sample test cases and shows detailed results</li>
                  <li><strong>Submit:</strong> Runs ALL test cases (including hidden ones) and shows only pass/fail summary</li>
                  <li>Hidden test cases are included when you submit, but details are hidden</li>
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
        {/* LeetCode-style Editor Header - Compact with Language, Theme, and Actions */}
        <div className="bg-[#1e1e1e] border-b border-gray-700 flex items-center justify-between px-4 py-2.5 flex-shrink-0">
          {/* Left: Editor Label */}
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Code Editor</span>
          </div>
          
          {/* Right: Language, Theme, and Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Language Selector - LeetCode style */}
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value;
                  // Ensure the selected language is in the allowed list
                  if (availableLanguages.some(l => l.value === newLang)) {
                    setLanguage(newLang);
                    // Mark that user has made changes
                    if (isInitialMount.current) {
                      isInitialMount.current = false;
                    }
                    // Update parent with new language
                    onChange({ code, language: newLang });
                  }
                }}
                className="px-3 py-1.5 bg-[#2d2d2d] text-gray-200 border border-gray-600 rounded text-sm font-medium cursor-pointer hover:bg-[#3d3d3d] hover:border-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang.value} value={lang.value} className="bg-[#2d2d2d]">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Display - LeetCode style */}
            <div className="px-3 py-1.5 bg-[#2d2d2d] text-gray-400 border border-gray-600 rounded text-sm font-medium">
              Dark
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-600"></div>

            {/* Action Buttons - Compact LeetCode style */}
            <button
              onClick={handleClearCode}
              disabled={isRunning || isSubmitting}
              type="button"
              className="px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-200 border border-gray-600 rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 disabled:hover:bg-[#2d2d2d]"
              title="Clear code and reset to starter code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
            
            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting || !code.trim()}
              type="button"
              className="px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-200 border border-gray-600 rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 disabled:hover:bg-[#2d2d2d]"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {queueStatus && queueStatus.queued > 0 ? 'Queued' : 'Running'}
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run
                </>
              )}
            </button>
            
            <button
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting || !code.trim() || submitCooldown > 0}
              type="button"
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white border border-green-700 rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 disabled:hover:bg-green-600"
              title={submitCooldown > 0 ? `Please wait ${submitCooldown} second${submitCooldown !== 1 ? 's' : ''} before submitting again` : 'Submit your code'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting
                </>
              ) : submitCooldown > 0 ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Wait {submitCooldown}s
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Submit
                </>
              )}
            </button>
          </div>
        </div>

        {/* Queue Status Indicator - Compact */}
        {queueStatus && queueStatus.queued > 0 && (
          <div className="bg-blue-900/30 border-b border-blue-700/50 px-4 py-2 flex items-center gap-2 text-xs text-blue-300 flex-shrink-0">
            <Info className="w-3.5 h-3.5" />
            <span>
              {queueStatus.queued} job{queueStatus.queued !== 1 ? 's' : ''} in queue
              {queueStatus.estimatedWaitTimeMs > 0 && (
                <> • Est. wait: {Math.ceil(queueStatus.estimatedWaitTimeMs / 1000)}s</>
              )}
            </span>
          </div>
        )}

        {/* Monaco Code Editor - LeetCode style dark container */}
        <div className="flex-1 min-h-0 relative bg-[#1e1e1e]">
          <div className="absolute inset-0">
            <MonacoEditor
              height="100%"
              language={monacoLanguage}
              theme={theme}
              value={code}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
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
                <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Loading code editor...</p>
                  </div>
                </div>
              }
            />
          </div>
        </div>

        {/* Output/Results Panel - Dark Theme */}
        <div className="border-t border-gray-700 bg-[#1e1e1e] flex flex-col max-h-[40%] min-h-[250px]">
          <div className="bg-[#252526] border-b border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-gray-300" />
              <span className="text-sm font-bold text-gray-200">Test Results</span>
            </div>
            
            {/* Custom Input Toggle */}
            <div className="flex items-center gap-2">
               <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showCustomInput} 
                  onChange={(e) => setShowCustomInput(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-[#2d2d2d] text-blue-600 focus:ring-blue-500 focus:ring-offset-[#252526]"
                />
                <span className="text-xs font-medium text-gray-300">Custom Input</span>
              </label>
            </div>
          </div>
          
          {/* Custom Input Area */}
          {showCustomInput && (
            <div className="bg-[#1e1e1e] p-4 border-b border-gray-700">
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Input</label>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="w-full h-24 bg-[#0d0d0d] text-gray-300 border border-gray-700 rounded p-3 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Enter your custom input here..."
              />
            </div>
          )}

          <div className="bg-[#252526] border-b border-gray-700 px-6 py-2 flex items-center gap-3 flex-shrink-0">
            {testResults && (
              <span className={`ml-auto text-xs font-bold px-4 py-1.5 rounded-full ${
                testResults.passed === testResults.total
                  ? 'bg-emerald-600 text-white border border-emerald-500'
                  : 'bg-amber-600 text-white border border-amber-500'
              }`}>
                {testResults.passed}/{testResults.total} passed
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#1e1e1e]">
            {error && (
              <div className="bg-red-900/30 border-l-4 border-red-500 rounded-lg p-5 text-red-300 shadow-md mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <p className="font-bold mb-2 text-red-300">Execution Error</p>
                    <p className="text-sm whitespace-pre-wrap text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}
            {testResults && (
              <div className="space-y-5">
                {/* Summary Card - Dark Theme */}
                <div className={`p-6 rounded-xl border-2 ${
                  testResults.passed === testResults.total
                    ? 'bg-emerald-900/20 border-emerald-600/50'
                    : 'bg-amber-900/20 border-amber-600/50'
                }`}>
                  <div className={`flex items-center gap-4 text-xl font-bold ${
                    testResults.passed === testResults.total ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {testResults.passed === testResults.total ? (
                      <>
                        <div className="p-2 bg-emerald-600 rounded-full">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <span>
                          All {testResults.total} test case{testResults.total !== 1 ? 's' : ''} passed! 🎉
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-amber-600 rounded-full">
                          <XCircle className="w-6 h-6 text-white" />
                        </div>
                        <span>
                          {testResults.passed} passed, {testResults.total - testResults.passed} failed out of {testResults.total} test case{testResults.total !== 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </div>
                  {!isSubmitMode && (
                    <p className="text-sm mt-4 text-gray-300 font-medium bg-[#2d2d2d] rounded-lg p-3 border border-gray-700">
                      {testResults.message}
                    </p>
                  )}
                </div>

                {/* Detailed Results - Only show if NOT in submit mode */}
                {!isSubmitMode && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                      Detailed Results
                    </h4>
                    {testResults.testResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-5 rounded-xl border-2 ${
                          result.passed
                            ? 'bg-emerald-900/10 border-emerald-600/30'
                            : 'bg-red-900/10 border-red-600/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          {result.passed ? (
                            <div className="p-2 bg-emerald-600 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                            </div>
                          ) : (
                            <div className="p-2 bg-red-600 rounded-lg">
                              <XCircle className="w-5 h-5 text-white flex-shrink-0" />
                            </div>
                          )}
                          <span className="font-bold text-base text-gray-200">
                            Test Case {index + 1}: {result.passed ? '✅ Passed' : '❌ Failed'}
                          </span>
                          <span className="ml-auto text-xs font-bold text-gray-300 bg-[#2d2d2d] px-3 py-1.5 rounded-full border border-gray-600">{result.status}</span>
                        </div>
                        {result.actualOutput !== null && (
                          <div className="space-y-3">
                            <div>
                              <span className="font-bold text-sm text-gray-300 mb-2 block flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                Your Output:
                              </span>
                              <pre className="mt-2 p-4 bg-[#0d0d0d] text-green-400 rounded-lg font-mono text-sm overflow-x-auto border-2 border-gray-800">
                                {result.actualOutput || '(empty)'}
                              </pre>
                            </div>
                            {!result.passed && (
                              <div>
                                <span className="font-bold text-sm text-gray-300 mb-2 block flex items-center gap-2">
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                  Expected Output:
                                </span>
                                <pre className="mt-2 p-4 bg-indigo-900/20 text-indigo-300 rounded-lg font-mono text-sm overflow-x-auto border-2 border-indigo-700/50">
                                  {result.expectedOutput}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                        {result.error && (
                          <div className="mt-3 p-4 bg-red-900/20 rounded-xl border-2 border-red-600/30">
                            <span className="font-bold text-red-400 text-sm block mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Error:
                            </span>
                            <pre className="mt-2 text-red-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap bg-[#0d0d0d] p-3 rounded border border-red-800/50">
                              {result.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {output && !testResults && !error && (
              <div className="bg-[#2d2d2d] p-5 rounded-xl border-2 border-gray-700">
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{output}</pre>
              </div>
            )}
            {!testResults && !output && !error && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2d2d2d] rounded-full mb-4">
                  <Terminal className="w-10 h-10 text-gray-500 opacity-60" />
                </div>
                <p className="text-base font-semibold text-gray-400 mb-2">No test results yet</p>
                <p className="text-sm text-gray-500">Click &quot;Run&quot; to test your solution</p>
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
