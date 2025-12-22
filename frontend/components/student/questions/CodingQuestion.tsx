'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, Terminal, Info, Code, FileText, ArrowLeft, ArrowRight, Send, RotateCcw, ChevronDown, ChevronUp, Eye, EyeOff, Maximize2, Minimize2, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SchemaVisualization from '@/components/student/SchemaVisualization';

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
  sqlDdl?: string;
};

// ... (LANGUAGES array remains same)
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
  sqlDdl,
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
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false); // Toggle between 50% and 100% (fullscreen)
  const [isSubmitMode, setIsSubmitMode] = useState(false); // Track if we're in submit mode (hide detailed results)
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [submitCooldown, setSubmitCooldown] = useState(0); // Cooldown in seconds
  const [showTestResults, setShowTestResults] = useState(true); // Toggle to show/hide test results
  const isInitialMount = useRef(true);
  const editorRef = useRef<{ updateOptions: (options: Record<string, unknown>) => void } | null>(null);
  const previousQuestionIdRef = useRef<string>(questionId);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Toggle editor fullscreen
  const toggleEditorFullscreen = () => {
    setIsEditorFullscreen(prev => !prev);
  };

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
    const interval = setInterval(fetchQueueStatus, 5000); // Poll every 5 seconds

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
    
    // Debounce the onChange callback with 1 second delay for auto-save
    // Reduced from 5 seconds to prevent cursor jumping when typing fast
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange({ code: newCode, language });
    }, 1000); // 1 second debounce for code auto-save
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
      
      // Debug: Log the result structure

      
      // Ensure testResults is always an array
      if (result && !Array.isArray(result.testResults)) {

        result.testResults = [];
      }
      
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
      
      // In submit mode, show summary message but test cases will be displayed below
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
      // Start 30-second cooldown after submission
      setSubmitCooldown(30);
    }
  }, [code, language, questionId, attemptId, onChange, submitCooldown]);

  // Calculate widths based on fullscreen state
  const editorWidth = isEditorFullscreen ? 100 : 50;
  const questionWidth = isEditorFullscreen ? 0 : 50;

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden bg-gray-50">
      {/* Left Panel - Question and Test Cases */}
      {!isEditorFullscreen && (
        <div 
          className="border-r border-gray-300 flex flex-col overflow-hidden bg-white shadow-lg transition-all"
          style={{ width: `${questionWidth}%` }}
        >
        {/* Question Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${sqlDdl ? 'bg-purple-100' : 'bg-blue-100'}`}>
                {sqlDdl ? (
                  <Database className="w-5 h-5 text-purple-600" />
                ) : (
                  <Code className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {sqlDdl ? 'SQL Question' : 'Coding Question'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {reportButton}
              <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold border border-amber-300 shadow-sm">
                {points} {points === 1 ? 'point' : 'points'}
              </div>
            </div>
          </div>
        </div>

        {/* Question Prompt - Scrollable with Markdown */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-white">
          <div className="text-gray-900 leading-relaxed text-base">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-5" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-900 mt-7 mb-4" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3" {...props} />,
                p: ({node, ...props}) => <p className="text-gray-900 leading-relaxed mb-4" {...props} />,
                // Unified code block styling
                code(props) {
                  const {children, className, node, ...rest} = props
                  const match = /language-(\w+)/.exec(className || '')
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
                  
                  // Block code content
                  return (
                    <code {...rest} className="bg-transparent text-inherit p-0 border-none">
                      {children}
                    </code>
                  )
                },
                // Style the pre container for block code
                pre: ({node, ...props}) => (
                  <div className="my-5 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                    <pre {...props} className="p-4 overflow-x-auto text-gray-800 text-sm font-mono m-0 bg-white" />
                  </div>
                ),
                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-900 pl-4" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-900 pl-4" {...props} />,
                li: ({node, ...props}) => <li className="text-gray-900 pl-1 mb-1" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-700 my-4 bg-blue-50/50 py-3 rounded-r" {...props} />,
                table: ({node, ...props}) => (
                   <div className="overflow-x-auto my-5 border border-gray-200 rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200" {...props} />
                   </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" {...props} />,
                td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-t border-gray-100" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors" {...props} />,
              }}
            >
              {prompt}
            </ReactMarkdown>
          </div>


          {/* SQL Database Schema - Structured Table Visualization */}
          {sqlDdl && (
            <div className="mt-8">
              <SchemaVisualization ddl={sqlDdl} />
            </div>
          )}

          {/* Sample Test Cases */}
          {visibleTestCases.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2.5 mb-5">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                Sample Test Cases
              </h3>
              <div className="space-y-4">
                {visibleTestCases.map((testCase, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs">Example {index + 1}</span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-bold text-gray-600 mb-2.5 uppercase tracking-wide">Input:</div>
                        <pre className="text-sm text-gray-800 font-mono bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto">
                          {testCase.input || '(empty)'}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 mb-2.5 uppercase tracking-wide">Expected Output:</div>
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
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0 mt-0.5">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-3 text-base">💡 Important Notes:</p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong>{sqlDdl ? 'Run Query' : 'Run Code'}:</strong> Tests your {sqlDdl ? 'query' : 'code'} with sample test cases and shows detailed results</li>
                  <li><strong>Submit:</strong> Runs ALL test cases (including hidden ones) and shows only pass/fail summary</li>
                  <li>Hidden test cases are included when you submit, but details are hidden</li>
                  <li>Test thoroughly using &quot;{sqlDdl ? 'Run Query' : 'Run Code'}&quot; before submitting your final answer</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Right Panel - Code Editor and Output */}
      <div 
        className="flex flex-col overflow-hidden bg-[#1e1e1e] shadow-lg transition-all duration-300 ease-out"
        style={{ width: `${editorWidth}%` }}
      >
        {/* Editor Header - Reverted to Original Layout with Icon Fix */}
        <div className="bg-[#1e1e1e] border-b border-gray-700 flex items-center justify-end px-4 py-2.5 flex-shrink-0 gap-2 overflow-x-auto">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              if (availableLanguages.some(l => l.value === newLang)) {
                setLanguage(newLang);
                if (isInitialMount.current) {
                  isInitialMount.current = false;
                }
                onChange({ code, language: newLang });
              }
            }}
            className="px-3 py-1.5 bg-[#2d2d2d] text-gray-200 border border-gray-600 rounded text-sm font-medium cursor-pointer hover:bg-[#3d3d3d] hover:border-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all flex-shrink-0"
          >
            {availableLanguages.map((lang) => (
              <option key={lang.value} value={lang.value} className="bg-[#2d2d2d]">
                {lang.label}
              </option>
            ))}
          </select>

          {/* Fullscreen Toggle Button - Increased Visibility */}
          <button
            onClick={toggleEditorFullscreen}
            type="button"
            className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-white border border-gray-500 rounded text-xs font-medium transition-all flex items-center justify-center w-9 h-9 flex-shrink-0 relative z-10 shadow-sm"
            title={isEditorFullscreen ? 'Show question panel' : 'Full screen editor'}
          >
            {isEditorFullscreen ? (
              <Minimize2 className="w-5 h-5 text-white" strokeWidth={2} />
            ) : (
              <Maximize2 className="w-5 h-5 text-white" strokeWidth={2} />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-600 flex-shrink-0"></div>

          {/* Clear Button */}
          <button
            onClick={handleClearCode}
            disabled={isRunning || isSubmitting}
            type="button"
            className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-200 border border-gray-600 rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 disabled:hover:bg-[#2d2d2d] flex-shrink-0 w-[85px]"
            title={sqlDdl ? "Clear query and reset" : "Clear code and reset to starter code"}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-xs">Clear</span>
          </button>
          
          {/* Run Button - Fixed width, larger icon */}
          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting || !code.trim()}
            type="button"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 disabled:hover:bg-blue-600 flex-shrink-0 w-[90px]"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
              </>
            )}
            <span className="text-xs">{sqlDdl ? 'Run Query' : 'Run Code'}</span>
          </button>
          
          {/* Submit Button - Fixed width, larger icon */}
          <button
            onClick={handleSubmitCode}
            disabled={isRunning || isSubmitting || !code.trim() || submitCooldown > 0}
            type="button"
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white border border-green-700 rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 disabled:hover:bg-green-600 flex-shrink-0 w-[100px]"
            title={submitCooldown > 0 ? `Please wait ${submitCooldown} second${submitCooldown !== 1 ? 's' : ''} before submitting again` : (sqlDdl ? 'Submit your query' : 'Submit your code')}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
              </>
            ) : submitCooldown > 0 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
              </>
            )}
            <span className="text-xs">
              {isSubmitting ? 'Submit' : submitCooldown > 0 ? `Wait ${submitCooldown}s` : 'Submit'}
            </span>
          </button>
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
        <div className={`relative bg-[#1e1e1e] pr-6 transition-all duration-300 ${showTestResults ? 'flex-1 min-h-0' : 'flex-1'}`}>
          <div className="absolute inset-0 pr-6">
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

        {/* Output/Results Panel - Dark Theme with Toggle */}
        {showTestResults && (
          <div className="border-t border-gray-700 bg-[#1e1e1e] flex flex-col max-h-[40%] min-h-[200px] transition-all duration-300">
            <div className="bg-[#252526] border-b border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-gray-300" />
                <span className="text-sm font-bold text-gray-200">Test Results</span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Custom Input Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showCustomInput} 
                    onChange={(e) => setShowCustomInput(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-[#2d2d2d] text-blue-600 focus:ring-blue-500 focus:ring-offset-[#252526]"
                  />
                  <span className="text-xs font-medium text-gray-300">Custom Input</span>
                </label>
                
                {/* Hide/Show Toggle Button */}
                <button
                  onClick={() => setShowTestResults(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 border border-gray-600 rounded text-xs font-medium transition-all"
                  title="Hide test results to see more code"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Hide
                </button>
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
                {(() => {
                  // Check if this is a custom input result
                  const isCustomInputResult = testResults.testResults && testResults.testResults.length > 0 && 
                    testResults.testResults.some((r: any) => r.expectedOutput === '(Custom Input)');
                  
                  return (
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
                              {isCustomInputResult 
                                ? 'Custom Input Execution Successful! ✅'
                                : `All ${testResults.total} test case${testResults.total !== 1 ? 's' : ''} passed! 🎉`}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="p-2 bg-amber-600 rounded-full">
                              <XCircle className="w-6 h-6 text-white" />
                            </div>
                            <span>
                              {isCustomInputResult
                                ? 'Custom Input Execution Failed'
                                : `${testResults.passed} passed, ${testResults.total - testResults.passed} failed out of ${testResults.total} test case${testResults.total !== 1 ? 's' : ''}`}
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
                  );
                })()}

                {/* Detailed Results - Show all test cases, including hidden ones */}
                {(() => {
                  // Check if this is a custom input result by checking the message or testResults
                  const isCustomInputResult = testResults.testResults && testResults.testResults.length > 0 && 
                    testResults.testResults.some((r: any) => r.expectedOutput === '(Custom Input)');
                  
                  // Always show detailed results if testResults exist OR if it's a custom input
                  const shouldShowDetails = (testResults.testResults && testResults.testResults.length > 0) || isCustomInputResult;
                  
                  if (!shouldShowDetails) return null;
                  
                  // Ensure testResults.testResults exists and is an array
                  const resultsArray = Array.isArray(testResults.testResults) ? testResults.testResults : [];
                  
                  // If no results but it's custom input, create a placeholder
                  if (resultsArray.length === 0 && isCustomInputResult) {
                    return (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                          Custom Input Results
                        </h4>
                        <div className="p-5 rounded-xl border-2 bg-amber-900/10 border-amber-600/30">
                          <p className="text-gray-300">No detailed results available. Check console for debug info.</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                        {isSubmitMode ? 'Test Case Results' : 'Detailed Results'}
                      </h4>
                      {(() => {
                        // Sort test results by testCaseIndex if available, otherwise use array index
                        const sortedResults = [...resultsArray].sort((a, b) => {
                          const aIdx = (a as any).testCaseIndex !== undefined ? (a as any).testCaseIndex : 999;
                          const bIdx = (b as any).testCaseIndex !== undefined ? (b as any).testCaseIndex : 999;
                          return aIdx - bIdx;
                        });
                    
                    return sortedResults.map((result, index) => {
                      const testCaseNum = (result as any).testCaseIndex !== undefined 
                        ? (result as any).testCaseIndex + 1 
                        : index + 1;
                      const isHidden = (result as any).isHidden || false;
                      const errorType = (result as any).errorType || result.status;
                      // Check if this is a custom input result
                      const isCustomInput = result.expectedOutput === '(Custom Input)';
                      
                      // Determine error type color and label
                      let errorTypeColor = 'bg-gray-600';
                      let errorTypeLabel = result.status;
                      if (errorType === 'TLE' || errorType === 'Time Limit Exceeded') {
                        errorTypeColor = 'bg-orange-600';
                        errorTypeLabel = 'TLE';
                      } else if (errorType === 'Runtime Error') {
                        errorTypeColor = 'bg-red-600';
                        errorTypeLabel = 'Runtime Error';
                      } else if (errorType === 'Compilation Error') {
                        errorTypeColor = 'bg-purple-600';
                        errorTypeLabel = 'Compilation Error';
                      } else if (errorType === 'Wrong Answer') {
                        errorTypeColor = 'bg-yellow-600';
                        errorTypeLabel = 'Wrong Answer';
                      } else if (errorType === 'Accepted' && result.passed) {
                        errorTypeColor = 'bg-emerald-600';
                        errorTypeLabel = 'Accepted';
                      }
                      
                      return (
                        <div
                          key={index}
                          className={`p-5 rounded-xl border-2 ${
                            result.passed
                              ? 'bg-emerald-900/10 border-emerald-600/30'
                              : 'bg-red-900/10 border-red-600/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-4 flex-wrap">
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
                              {isCustomInput ? 'Custom Input Test' : `Test Case ${testCaseNum}`}: {result.passed ? '✅ Passed' : '❌ Failed'}
                            </span>
                            {isHidden && (
                              <span className="text-xs font-bold text-amber-300 bg-amber-900/30 px-2.5 py-1 rounded-full border border-amber-600/50">
                                🔒 Hidden
                              </span>
                            )}
                            <span className={`ml-auto text-xs font-bold text-white ${errorTypeColor} px-3 py-1.5 rounded-full border border-opacity-50`}>
                              {errorTypeLabel}
                            </span>
                          </div>
                        {(() => {
                          // Check if this is a custom input result
                          const isCustomInput = result.expectedOutput === '(Custom Input)';
                          // Check if we should hide details for hidden test cases in submit mode
                          const shouldHideDetails = isSubmitMode && isHidden && !isCustomInput;
                          
                          return (
                            <div className="space-y-3">
                              {shouldHideDetails ? (
                                /* For hidden test cases in submit mode, show locked message */
                                <div className="p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg">
                                  <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-sm font-medium">🔒 Test case is hidden</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Input and output are hidden. Only pass/fail status is shown.
                                  </p>
                                </div>
                              ) : (
                                <>
                                  {/* For custom input, ALWAYS show input section */}
                                  {isCustomInput ? (
                                    <div>
                                      <span className="font-bold text-sm text-gray-300 mb-2 block flex items-center gap-2">
                                        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                                        Custom Input:
                                      </span>
                                      <pre className="mt-2 p-4 bg-[#0d0d0d] text-cyan-300 rounded-lg font-mono text-sm overflow-x-auto border-2 border-cyan-800/50">
                                        {result.input !== undefined && result.input !== null ? result.input : '(empty)'}
                                      </pre>
                                    </div>
                                  ) : (
                                    /* For regular test cases, show input if it exists */
                                    result.input && (
                                      <div>
                                        <span className="font-bold text-sm text-gray-300 mb-2 block flex items-center gap-2">
                                          <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                                          Input:
                                        </span>
                                        <pre className="mt-2 p-4 bg-[#0d0d0d] text-cyan-300 rounded-lg font-mono text-sm overflow-x-auto border-2 border-cyan-800/50">
                                          {result.input}
                                        </pre>
                                      </div>
                                    )
                                  )}
                                  
                                  {/* For custom input, ALWAYS show output section */}
                                  {isCustomInput ? (
                                    <div>
                                      <span className="font-bold text-sm text-gray-300 mb-2 block flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        Your Output:
                                      </span>
                                      <pre className="mt-2 p-4 bg-[#0d0d0d] text-green-400 rounded-lg font-mono text-sm overflow-x-auto border-2 border-gray-800">
                                        {result.actualOutput !== undefined && result.actualOutput !== null && result.actualOutput !== '' 
                                          ? result.actualOutput 
                                          : '(no output)'}
                                      </pre>
                                    </div>
                                  ) : (
                                    /* For regular test cases, show output if available */
                                    result.actualOutput !== null && result.actualOutput !== undefined && (
                                      <div>
                                        <span className="font-bold text-sm text-gray-300 mb-2 block flex items-center gap-2">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                          Your Output:
                                        </span>
                                        <pre className="mt-2 p-4 bg-[#0d0d0d] text-green-400 rounded-lg font-mono text-sm overflow-x-auto border-2 border-gray-800">
                                          {result.actualOutput || '(empty)'}
                                        </pre>
                                      </div>
                                    )
                                  )}
                                  
                                  {/* Show expected output for test cases (not custom input) when failed */}
                                  {!isCustomInput && !result.passed && result.expectedOutput && (
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
                                </>
                              )}
                            </div>
                          );
                        })()}
                          {result.error && (
                            <div className="mt-3 p-4 bg-red-900/20 rounded-xl border-2 border-red-600/30">
                              <span className="font-bold text-red-400 text-sm block mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {errorType === 'TLE' || errorType === 'Time Limit Exceeded' 
                                  ? 'Time Limit Exceeded' 
                                  : errorType === 'Compilation Error'
                                  ? 'Compilation Error'
                                  : 'Runtime Error'}:
                              </span>
                              <pre className="mt-2 text-red-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap bg-[#0d0d0d] p-3 rounded border border-red-800/50">
                                {result.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    });
                    })()}
                    </div>
                  );
                })()}
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
        )}

        {/* Show Test Results Button (when hidden) */}
        {!showTestResults && (
          <div className="border-t border-gray-700 bg-[#252526] px-6 py-3 flex items-center justify-center flex-shrink-0">
            <button
              onClick={() => setShowTestResults(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 border border-gray-600 rounded text-sm font-medium transition-all"
              title="Show test results"
            >
              <Eye className="w-4 h-4" />
              <span>Show Test Results</span>
            </button>
          </div>
        )}

        {/* Navigation Buttons for Coding Questions - Fixed at bottom */}
        {(onNext || onPrev || onSubmit) && (
          <div className="border-t border-gray-700 bg-[#1e1e1e] px-6 py-4 flex items-center justify-between flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={!canGoPrev || isRunning || isSubmitting}
              type="button"
              className="px-6 py-2.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-200 border border-gray-600 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onNext}
                disabled={!canGoNext || isRunning || isSubmitting}
                type="button"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium shadow-md hover:shadow-lg transition-all min-w-[140px] flex items-center justify-center gap-2"
              >
                Next Question
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
