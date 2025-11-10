'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Users, Loader2, CheckCircle2, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

type Assignment = {
  id: string;
  assignToAll: boolean;
  cohortYear: number | null;
  cohortDepartment: string | null;
  cohortSection: string | null;
  studentIds: string[] | null;
  createdAt?: string; // Optional since it may not exist in the schema
};

interface AssignmentManagerProps {
  examId: string;
  examStatus: string;
}

const assignExamSchema = z
  .object({
    assignToAll: z.boolean().default(false),
    cohortYear: z.coerce.number().int().min(1).max(6).optional(),
    cohortDepartment: z.string().max(50).optional(),
    cohortSection: z.string().max(10).optional(),
    studentIds: z.string().optional(), // Comma-separated string for input
  })
  .refine(
    (data) => {
      const hasCohort =
        data.cohortYear || data.cohortDepartment || data.cohortSection;
      const hasStudentIds = data.studentIds && data.studentIds.trim().length > 0;
      return data.assignToAll === true || hasCohort || hasStudentIds;
    },
    {
      message:
        'Assignment requires setting "Assign to All", providing cohort details, or a list of student IDs',
      path: ['assignToAll'],
    }
  )
  .refine(
    (data) => {
      const hasCohort =
        data.cohortYear || data.cohortDepartment || data.cohortSection;
      const hasStudentIds = data.studentIds && data.studentIds.trim().length > 0;
      if (data.assignToAll === true) {
        return !(hasCohort || hasStudentIds);
      }
      return !(hasCohort && hasStudentIds);
    },
    {
      message:
        'Cannot use "Assign to All" with other assignment methods, or mix cohort with specific student IDs',
      path: ['assignToAll'],
    }
  );

type AssignmentFormData = z.infer<typeof assignExamSchema>;

export default function AssignmentManager({
  examId,
  examStatus,
}: AssignmentManagerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [examId]);

  const fetchAssignments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch exam data which includes assignments
      const res = await api.get(`/admin/exams/${examId}`);
      setAssignments(res.data.assignments || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || 'Failed to fetch assignments.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }
    // Note: There's no delete endpoint in the backend, so we might need to handle this differently
    // For now, we'll just show an error
    alert('Assignment deletion is not yet implemented. Please contact support.');
  };

  const formatAssignment = (assignment: Assignment): string => {
    if (assignment.assignToAll) {
      return 'All Students';
    }
    if (assignment.cohortYear && assignment.cohortDepartment && assignment.cohortSection) {
      return `Cohort: Year ${assignment.cohortYear}, ${assignment.cohortDepartment}, Section ${assignment.cohortSection}`;
    }
    if (assignment.studentIds && Array.isArray(assignment.studentIds)) {
      return `${assignment.studentIds.length} specific student(s)`;
    }
    return 'Unknown assignment';
  };

  return (
    <div className="p-6 bg-secondary border border-primary/10 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold font-alan-sans text-primary">Manage Assignments</h2>
          <p className="text-sm text-primary/70 mt-1">
            Assign this exam to specific students, cohorts, or all students
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={examStatus === 'PUBLISHED'}
          title={examStatus === 'PUBLISHED' ? 'Cannot modify assignments after exam is published' : ''}
        >
          <Users className="w-4 h-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {examStatus === 'PUBLISHED' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            <p className="text-sm">
              This exam is published. Assignments cannot be modified. Create a new assignment before publishing.
            </p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center p-8 text-primary/70">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          <span>Loading assignments...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 mb-4">
          <p className="font-medium">Error:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
              <p className="text-primary/60 text-lg mb-2">No assignments yet</p>
              <p className="text-primary/50 text-sm">
                Create an assignment to make this exam available to students
              </p>
            </div>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10 hover:border-primary/20 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-primary/60" />
                    <p className="font-medium text-primary">{formatAssignment(assignment)}</p>
                  </div>
                  {assignment.createdAt && (
                    <p className="text-xs text-primary/60">
                      Created: {new Date(assignment.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {examStatus !== 'PUBLISHED' && (
                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="p-2 hover:bg-primary/10 rounded-md hover:text-red-600 transition-colors"
                    title="Remove Assignment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <CreateAssignmentModal
        examId={examId}
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          fetchAssignments();
          setSuccessMessage('Assignment created successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
        }}
      />
    </div>
  );
}

// Create Assignment Modal
function CreateAssignmentModal({
  examId,
  open,
  onOpenChange,
  onSuccess,
}: {
  examId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<'all' | 'cohort' | 'students'>('all');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignExamSchema),
    defaultValues: {
      assignToAll: false,
      cohortYear: undefined,
      cohortDepartment: '',
      cohortSection: '',
      studentIds: '',
    },
  });

  const assignToAll = watch('assignToAll');

  useEffect(() => {
    if (assignmentType === 'all') {
      setValue('assignToAll', true);
      setValue('cohortYear', undefined);
      setValue('cohortDepartment', '');
      setValue('cohortSection', '');
      setValue('studentIds', '');
    } else if (assignmentType === 'cohort') {
      setValue('assignToAll', false);
      setValue('studentIds', '');
    } else {
      setValue('assignToAll', false);
      setValue('cohortYear', undefined);
      setValue('cohortDepartment', '');
      setValue('cohortSection', '');
    }
  }, [assignmentType, setValue]);

  const onSubmit = async (data: AssignmentFormData) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload: any = {
        assignToAll: data.assignToAll || false,
      };

      if (data.assignToAll) {
        // Assign to all - no other fields needed
      } else if (assignmentType === 'cohort') {
        // Cohort assignment
        if (data.cohortYear) payload.cohortYear = data.cohortYear;
        if (data.cohortDepartment) payload.cohortDepartment = data.cohortDepartment;
        if (data.cohortSection) payload.cohortSection = data.cohortSection;
      } else if (assignmentType === 'students' && data.studentIds) {
        // Student IDs assignment - convert comma-separated string to array
        const ids = data.studentIds
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id.length > 0);
        payload.studentIds = ids;
      }

      await api.post(`/admin/exams/${examId}/assign`, payload);
      onSuccess();
      onOpenChange(false);
      reset();
      setAssignmentType('all');
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setApiError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to create assignment. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create Assignment">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-primary mb-3">
            Assignment Type <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-primary/20 rounded-md cursor-pointer hover:bg-primary/5">
              <input
                type="radio"
                value="all"
                checked={assignmentType === 'all'}
                onChange={(e) => setAssignmentType(e.target.value as 'all')}
                className="h-4 w-4 text-primary focus:ring-primary/50"
              />
              <div>
                <p className="font-medium text-primary">Assign to All Students</p>
                <p className="text-xs text-primary/60">
                  Make this exam available to all students in the system
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-primary/20 rounded-md cursor-pointer hover:bg-primary/5">
              <input
                type="radio"
                value="cohort"
                checked={assignmentType === 'cohort'}
                onChange={(e) => setAssignmentType(e.target.value as 'cohort')}
                className="h-4 w-4 text-primary focus:ring-primary/50"
              />
              <div>
                <p className="font-medium text-primary">Assign by Cohort</p>
                <p className="text-xs text-primary/60">
                  Assign to students based on year, department, and section
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-primary/20 rounded-md cursor-pointer hover:bg-primary/5">
              <input
                type="radio"
                value="students"
                checked={assignmentType === 'students'}
                onChange={(e) => setAssignmentType(e.target.value as 'students')}
                className="h-4 w-4 text-primary focus:ring-primary/50"
              />
              <div>
                <p className="font-medium text-primary">Assign to Specific Students</p>
                <p className="text-xs text-primary/60">
                  Enter student IDs separated by commas
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Cohort Fields */}
        {assignmentType === 'cohort' && (
          <div className="space-y-4 p-4 bg-primary/5 rounded-md border border-primary/20">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Year
                </label>
                <Input
                  type="number"
                  min="1"
                  max="6"
                  {...register('cohortYear')}
                  placeholder="e.g. 1"
                />
                {errors.cohortYear && (
                  <p className="mt-1 text-sm text-red-500">{errors.cohortYear.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Department
                </label>
                <Input
                  {...register('cohortDepartment')}
                  placeholder="e.g. CSE"
                />
                {errors.cohortDepartment && (
                  <p className="mt-1 text-sm text-red-500">{errors.cohortDepartment.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Section
                </label>
                <Input
                  {...register('cohortSection')}
                  placeholder="e.g. A"
                />
                {errors.cohortSection && (
                  <p className="mt-1 text-sm text-red-500">{errors.cohortSection.message}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-primary/60">
              All three fields (Year, Department, Section) are required for cohort assignment
            </p>
          </div>
        )}

        {/* Student IDs Field */}
        {assignmentType === 'students' && (
          <div className="p-4 bg-primary/5 rounded-md border border-primary/20">
            <label className="block text-sm font-semibold text-primary mb-2">
              Student IDs <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('studentIds')}
              rows={4}
              className="flex w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary placeholder:text-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none font-mono"
              placeholder="Enter student IDs separated by commas&#10;e.g. clx1234567890, clx0987654321, clx1122334455"
            />
            {errors.studentIds && (
              <p className="mt-1 text-sm text-red-500">{errors.studentIds.message}</p>
            )}
            <p className="mt-2 text-xs text-primary/60">
              Enter student IDs (CUIDs) separated by commas. You can enter up to 1000 student IDs.
            </p>
          </div>
        )}

        {errors.assignToAll && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            <strong>Validation Error:</strong> {errors.assignToAll.message}
          </div>
        )}

        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            <strong>Error:</strong> {apiError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              reset();
              setAssignmentType('all');
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Create Assignment
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

