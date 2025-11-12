'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Search, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToastNotification } from '@/context/ToastContext';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { Exam } from '@/types';

type Student = {
  id: string;
  name: string;
  email: string;
  reg_no: string | null;
};

type ApiMeta = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type ApiResponse = {
  data: Exam[];
  meta: ApiMeta;
};

type AttemptResponse = {
  data: Array<{
    id: string;
    status: string;
    student: Student;
  }>;
  meta: ApiMeta;
};

export default function ReattemptsPage() {
  const toast = useToastNotification();
  const { confirm } = useConfirmationDialog();

  const [exams, setExams] = useState<Exam[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [resetAll, setResetAll] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch exams
  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch students when exam is selected
  useEffect(() => {
    if (selectedExamId) {
      fetchStudents();
    } else {
      setStudents([]);
      setSelectedStudents(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId]);

  const fetchExams = async () => {
    setIsLoadingExams(true);
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('pageSize', '100');
      params.append('status', 'PUBLISHED');
      
      const res = await api.get<ApiResponse>(`/admin/exams?${params.toString()}`);
      setExams(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      toast.error(error.response?.data?.error?.message || 'Failed to fetch exams.');
    } finally {
      setIsLoadingExams(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedExamId) return;
    
    setIsLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('pageSize', '100');
      
      const res = await api.get<AttemptResponse>(`/admin/attempts/exam/${selectedExamId}?${params.toString()}`);
      
      // Get unique students who have submitted attempts
      const studentMap = new Map<string, Student>();
      res.data.data.forEach(attempt => {
        if (attempt.status === 'SUBMITTED' && !studentMap.has(attempt.student.id)) {
          studentMap.set(attempt.student.id, attempt.student);
        }
      });
      
      setStudents(Array.from(studentMap.values()));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      toast.error(error.response?.data?.error?.message || 'Failed to fetch students.');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleResetAttempts = async () => {
    if (!selectedExamId) {
      toast.error('Please select an exam first.');
      return;
    }

    if (!resetAll && selectedStudents.size === 0) {
      toast.error('Please select at least one student or choose "Reset All".');
      return;
    }

    const confirmed = await confirm({
      title: 'Reset Attempts',
      message: resetAll
        ? `Are you sure you want to reset ALL submitted attempts for this exam? This action cannot be undone.`
        : `Are you sure you want to reset attempts for ${selectedStudents.size} selected student(s)? This action cannot be undone.`,
      confirmText: 'Reset Attempts',
      cancelText: 'Cancel',
      variant: 'warning',
    });

    if (!confirmed) return;

    setIsResetting(true);
    try {
      await api.post('/admin/attempts/reset', {
        examId: selectedExamId,
        studentIds: resetAll ? undefined : Array.from(selectedStudents),
        resetAll: resetAll,
      });

      toast.success(resetAll 
        ? 'All attempts have been reset successfully!' 
        : `Attempts for ${selectedStudents.size} student(s) have been reset successfully!`
      );
      
      // Refresh students list
      await fetchStudents();
      setSelectedStudents(new Set());
      setResetAll(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      toast.error(error.response?.data?.error?.message || 'Failed to reset attempts.');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.reg_no && student.reg_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="text-primary">
      <div className="mb-6">
        <h1 className="text-4xl font-bold font-alan-sans mb-2">Enable Reattempt</h1>
        <p className="text-primary/70">Reset submitted attempts to allow students to retake exams.</p>
      </div>

      {/* Exam Selection */}
      <div className="bg-secondary rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-primary mb-2">
          Select Exam
        </label>
        {isLoadingExams ? (
          <div className="flex items-center gap-2 text-primary/70">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading exams...</span>
          </div>
        ) : (
          <select
            value={selectedExamId || ''}
            onChange={(e) => {
              setSelectedExamId(e.target.value || null);
              setSelectedStudents(new Set());
              setResetAll(false);
            }}
            className="w-full md:w-96 px-4 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-primary"
          >
            <option value="">-- Select an exam --</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>
        )}
        {selectedExam && (
          <p className="mt-2 text-sm text-primary/60">
            Selected: <span className="font-medium">{selectedExam.title}</span>
          </p>
        )}
      </div>

      {/* Students Selection */}
      {selectedExamId && (
        <div className="bg-secondary rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Select Students</h2>
            {students.length > 0 && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetAll}
                    onChange={(e) => {
                      setResetAll(e.target.checked);
                      if (e.target.checked) {
                        setSelectedStudents(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Reset All Students</span>
                </label>
              </div>
            )}
          </div>

          {isLoadingStudents ? (
            <div className="flex items-center justify-center py-8 text-primary/70">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-primary/60">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-primary/40" />
              <p>No students with submitted attempts found for this exam.</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search by name, email, or registration number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Students List */}
              {!resetAll && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-primary/70">
                      {filteredStudents.length} student(s) found
                    </span>
                    <Button
                      onClick={handleSelectAll}
                      className="text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                    >
                      {selectedStudents.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div className="max-h-96 overflow-y-auto border border-primary/10 rounded-lg">
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-primary/60">
                        No students match your search.
                      </div>
                    ) : (
                      <div className="divide-y divide-primary/10">
                        {filteredStudents.map((student) => (
                          <label
                            key={student.id}
                            className="flex items-center gap-3 p-3 hover:bg-primary/5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(student.id)}
                              onChange={() => handleStudentToggle(student.id)}
                              className="w-4 h-4 rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-primary">{student.name}</p>
                              <p className="text-sm text-primary/60">{student.email}</p>
                              {student.reg_no && (
                                <p className="text-xs text-primary/50">Reg: {student.reg_no}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {resetAll && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Reset All Students</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        This will reset all submitted attempts for this exam. All students will be able to retake the exam.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleResetAttempts}
                  disabled={isResetting || (!resetAll && selectedStudents.size === 0)}
                  className="bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {resetAll 
                        ? 'Reset All Attempts' 
                        : `Reset Attempts (${selectedStudents.size} selected)`
                      }
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

