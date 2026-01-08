'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToastNotification } from '@/context/ToastContext';
import { Download, Loader2, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Exam = {
  id: string;
  title: string;
  status: string;
};

type ExportField =
  | 'studentName'
  | 'email'
  | 'regNo'
  | 'startedAt'
  | 'submittedAt'
  | 'score'
  | 'maxScore'
  | 'percentage'
  | 'questionScores'
  | 'questionAnswers'
  | 'questionVerdicts';

const FIELD_LABELS: Record<ExportField, string> = {
  studentName: 'Student Name',
  email: 'Email',
  regNo: 'Registration Number',
  startedAt: 'Started At',
  submittedAt: 'Submitted At',
  score: 'Score',
  maxScore: 'Max Score',
  percentage: 'Percentage',
  questionScores: 'Question Scores',
  questionAnswers: 'Question Answers',
  questionVerdicts: 'Question Verdicts',
};

const FIELD_DESCRIPTIONS: Record<ExportField, string> = {
  studentName: 'Student full name',
  email: 'Student email address',
  regNo: 'Student registration number',
  startedAt: 'When the exam was started',
  submittedAt: 'When the exam was submitted',
  score: 'Points earned by student',
  maxScore: 'Maximum possible points',
  percentage: 'Score as percentage',
  questionScores: 'Individual question scores (earned/max)',
  questionAnswers: 'Student answers for each question',
  questionVerdicts: 'Grading verdict for each question',
};

const DEFAULT_FIELDS: ExportField[] = [
  'studentName',
  'email',
  'regNo',
  'startedAt',
  'submittedAt',
  'score',
  'maxScore',
  'percentage',
  'questionScores',
];

export default function CustomExportPage() {
  useAuth();
  const toast = useToastNotification();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<ExportField[]>(DEFAULT_FIELDS);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeExamInfo, setIncludeExamInfo] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreselected, setIsPreselected] = useState(false);
  const [roundScores, setRoundScores] = useState(false);
  const [sortBy, setSortBy] = useState('submittedAt_desc');

  useEffect(() => {
    fetchExams();
  }, []);

  // Get examId from URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const examIdFromUrl = params.get('examId');
      if (examIdFromUrl) {
        setSelectedExamId(examIdFromUrl);
        setIsPreselected(true);
      }
    }
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ data: Exam[] }>('/admin/exams?pageSize=100');
      setExams(res.data.data.filter(e => e.status === 'PUBLISHED' || e.status === 'CLOSED'));

      // Only set default if NO exam ID is in URL (to avoid overwriting pre-selection)
      const params = new URLSearchParams(window.location.search);
      if (!params.get('examId') && res.data.data.length > 0) {
        setSelectedExamId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      toast.error('Failed to fetch exams');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleField = (field: ExportField) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(Object.keys(FIELD_LABELS) as ExportField[]);
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  const resetToDefaults = () => {
    setSelectedFields(DEFAULT_FIELDS);
  };

  const handleExport = async () => {
    if (!selectedExamId) {
      toast.error('Please select an exam');
      return;
    }

    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('fields', selectedFields.join(','));
      if (!includeSummary) params.append('includeSummary', 'false');
      if (!includeExamInfo) params.append('includeExamInfo', 'false');
      if (roundScores) params.append('roundScores', 'true');
      if (sortBy) params.append('sortBy', sortBy);

      const response = await api.get(`/admin/exams/${selectedExamId}/export?${params.toString()}`, {
        responseType: 'blob',
      });

      if (!response.data || response.data.size === 0) {
        throw new Error('Empty response from server');
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const selectedExam = exams.find(e => e.id === selectedExamId);
      const safeTitle = selectedExam?.title.replace(/[^a-z0-9]/gi, '_') || selectedExamId;
      link.download = `exam_results_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Excel file downloaded successfully!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Error exporting Excel:', err);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to export Excel file';
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-primary/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary">
      <div className="mb-6">
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-2 text-primary/70 hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Submissions
        </Link>
        <h1 className="text-4xl font-bold font-alan-sans mb-2">Custom Excel Export</h1>
        <p className="text-primary/70">Select fields and options to customize your Excel export</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exam Selection */}
          <div className="bg-secondary rounded-xl p-6 border border-primary/10">
            <h2 className="text-xl font-semibold text-primary mb-4">Exam Context</h2>
            {isPreselected ? (
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="bg-primary/10 p-2 rounded-full">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-primary/60">Exporting data for:</p>
                  <p className="text-lg font-bold text-primary">
                    {exams.find(e => e.id === selectedExamId)?.title || 'Loading...'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-primary/60 mb-2">Select the exam you want to export data from:</p>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Select an exam --</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} ({exam.status})
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Field Selection */}
          <div className="bg-secondary rounded-xl p-6 border border-primary/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-primary">Select Fields</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllFields}
                  className="text-xs px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllFields}
                  className="text-xs px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                >
                  Deselect All
                </button>
                <button
                  onClick={resetToDefaults}
                  className="text-xs px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(Object.keys(FIELD_LABELS) as ExportField[]).map((field) => (
                <div
                  key={field}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => toggleField(field)}
                >
                  <div className="mt-0.5">
                    {selectedFields.includes(field) ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-primary/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-primary">{FIELD_LABELS[field]}</div>
                    <div className="text-sm text-primary/60">{FIELD_DESCRIPTIONS[field]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="bg-secondary rounded-xl p-6 border border-primary/10">
            <h2 className="text-xl font-semibold text-primary mb-4">Additional Options</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="w-5 h-5 rounded border-primary/20 text-primary focus:ring-primary/50"
                />
                <div>
                  <div className="font-medium text-primary">Include Summary Row</div>
                  <div className="text-sm text-primary/60">Add average scores and totals at the bottom</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExamInfo}
                  onChange={(e) => setIncludeExamInfo(e.target.checked)}
                  className="w-5 h-5 rounded border-primary/20 text-primary focus:ring-primary/50"
                />
                <div>
                  <div className="font-medium text-primary">Include Exam Info Sheet</div>
                  <div className="text-sm text-primary/60">Add a separate sheet with exam details</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundScores}
                  onChange={(e) => setRoundScores(e.target.checked)}
                  className="w-5 h-5 rounded border-primary/20 text-primary focus:ring-primary/50"
                />
                <div>
                  <div className="font-medium text-primary">Round Scores</div>
                  <div className="text-sm text-primary/60">Export whole numbers (no decimals)</div>
                </div>
              </label>

              <div className="space-y-2 mt-4">
                <h3 className="font-medium text-primary">Sort Order</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="submittedAt_desc">Submitted Date (Newest First)</option>
                  <option value="score_desc">Score (High to Low)</option>
                  <option value="score_asc">Score (Low to High)</option>
                  <option value="studentName_asc">Student Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Preview & Export */}
        <div className="space-y-6">
          {/* Selected Fields Preview */}
          <div className="bg-secondary rounded-xl p-6 border border-primary/10">
            <h2 className="text-xl font-semibold text-primary mb-4">Selected Fields</h2>
            {selectedFields.length === 0 ? (
              <p className="text-primary/50 text-sm">No fields selected</p>
            ) : (
              <div className="space-y-2">
                {selectedFields.map((field) => (
                  <div
                    key={field}
                    className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg"
                  >
                    <CheckSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary">{FIELD_LABELS[field]}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-primary/10">
              <div className="text-sm text-primary/60">
                Total: <span className="font-semibold text-primary">{selectedFields.length}</span> field{selectedFields.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-semibold text-primary">Ready to Export</h2>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting || !selectedExamId || selectedFields.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Export to Excel
                </>
              )}
            </Button>
            {selectedFields.length === 0 && (
              <p className="text-xs text-red-500 mt-2">Please select at least one field</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

