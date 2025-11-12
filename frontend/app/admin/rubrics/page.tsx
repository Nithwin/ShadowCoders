'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Loader2, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';
import { AdminAPI } from '@/lib/api-admin';

type Criterion = {
  id: string;
  label: string;
  maxPoints: number;
  descriptor?: string;
  weight?: number;
};

type Rubric = {
  id: string;
  name: string;
  criteria: Criterion[];
  createdAt: string;
  _count?: {
    questions: number;
    evaluations: number;
  };
};

type ApiMeta = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type ApiResponse = {
  data: Rubric[];
  meta: ApiMeta;
};

type RubricFormData = {
  name: string;
  criteria: Criterion[];
};

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirm } = useConfirmationDialog();
  const toast = useToastNotification();

  const [formData, setFormData] = useState<RubricFormData>({
    name: '',
    criteria: [{ id: '1', label: '', maxPoints: 10, descriptor: '', weight: 1 }],
  });

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    fetchRubrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery]);

  const fetchRubrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('pageSize', '10');
      if (searchQuery) {
        params.append('q', searchQuery);
      }

      const res = await api.get<ApiResponse>(`/admin/rubrics?${params.toString()}`);
      setRubrics(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to fetch rubrics.');
      toast.error('Failed to fetch rubrics.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRubric(null);
    setFormData({
      name: '',
      criteria: [{ id: '1', label: '', maxPoints: 10, descriptor: '', weight: 1 }],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setFormData({
      name: rubric.name,
      criteria: rubric.criteria.length > 0 
        ? rubric.criteria 
        : [{ id: '1', label: '', maxPoints: 10, descriptor: '', weight: 1 }],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (rubric: Rubric) => {
    const confirmed = await confirm({
      title: 'Delete Rubric',
      message: `Are you sure you want to delete "${rubric.name}"? This action cannot be undone.${
        (rubric._count?.questions || 0) > 0 || (rubric._count?.evaluations || 0) > 0
          ? ' Note: This rubric is being used and cannot be deleted.'
          : ''
      }`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await AdminAPI.deleteRubric(rubric.id);
      toast.success('Rubric deleted successfully!');
      fetchRubrics();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      toast.error(error.response?.data?.error?.message || 'Failed to delete rubric.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Rubric name is required.');
      return;
    }

    if (formData.criteria.length === 0) {
      toast.error('At least one criterion is required.');
      return;
    }

    // Validate criteria
    for (const criterion of formData.criteria) {
      if (!criterion.label.trim()) {
        toast.error('All criteria must have a label.');
        return;
      }
      if (criterion.maxPoints <= 0) {
        toast.error('All criteria must have a positive max points value.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingRubric) {
        await AdminAPI.updateRubric(editingRubric.id, formData);
        toast.success('Rubric updated successfully!');
      } else {
        await AdminAPI.createRubric(formData);
        toast.success('Rubric created successfully!');
      }
      setIsModalOpen(false);
      fetchRubrics();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      toast.error(error.response?.data?.error?.message || 'Failed to save rubric.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCriterion = () => {
    setFormData({
      ...formData,
      criteria: [
        ...formData.criteria,
        {
          id: String(Date.now()),
          label: '',
          maxPoints: 10,
          descriptor: '',
          weight: 1,
        },
      ],
    });
  };

  const removeCriterion = (index: number) => {
    if (formData.criteria.length <= 1) {
      toast.error('At least one criterion is required.');
      return;
    }
    setFormData({
      ...formData,
      criteria: formData.criteria.filter((_, i) => i !== index),
    });
  };

  const updateCriterion = (index: number, field: keyof Criterion, value: string | number) => {
    const updatedCriteria = [...formData.criteria];
    updatedCriteria[index] = {
      ...updatedCriteria[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      criteria: updatedCriteria,
    });
  };

  const calculateTotalPoints = () => {
    return formData.criteria.reduce((sum, c) => sum + c.maxPoints, 0);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (meta?.totalPages || 1)) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="text-primary">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-alan-sans mb-2">Rubrics</h1>
            <p className="text-primary/70">Create and manage grading rubrics for essay and speaking questions.</p>
          </div>
          <Button
            onClick={handleCreate}
            className="bg-primary text-secondary hover:bg-primary/80 border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Rubric
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search rubrics..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Rubrics List */}
      <div className="bg-secondary rounded-lg shadow-md overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-primary/70">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading rubrics...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-red-500">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && rubrics.length === 0 && (
          <div className="p-8 text-center text-primary/60">
            <BookMarked className="w-12 h-12 mx-auto mb-4 text-primary/40" />
            <p className="text-lg mb-2">No rubrics found</p>
            <p className="text-sm">Create your first rubric to get started.</p>
          </div>
        )}

        {!isLoading && !error && rubrics.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-primary/5 border-b border-primary/10">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Name
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Criteria
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Total Points
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Usage
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Created
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {rubrics.map((rubric) => {
                  const totalPoints = rubric.criteria.reduce((sum, c) => sum + c.maxPoints, 0);
                  return (
                    <tr key={rubric.id} className="hover:bg-primary/5">
                      <td className="p-3">
                        <p className="font-medium text-primary">{rubric.name}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-primary/70">{rubric.criteria.length} criterion/rubric</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-medium text-primary">{totalPoints} points</p>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-primary/70">
                          {rubric._count?.questions || 0} question(s)
                          {rubric._count?.evaluations ? `, ${rubric._count.evaluations} evaluation(s)` : ''}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-primary/70">
                        {new Date(rubric.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleEdit(rubric)}
                            className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-sm px-3 py-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(rubric)}
                            disabled={(rubric._count?.questions || 0) > 0 || (rubric._count?.evaluations || 0) > 0}
                            className="bg-red-600 hover:bg-red-700 text-white border-0 text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-primary/70">
            Showing page {meta.page} of {meta.totalPages} ({meta.totalCount} total rubrics)
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            >
              Previous
            </Button>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === (meta?.totalPages || 1)}
              className="text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">
                  {editingRubric ? 'Edit Rubric' : 'Create Rubric'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-primary/70 hover:text-primary"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Rubric Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-primary mb-2">
                  Rubric Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Essay Grading Rubric"
                  className="w-full px-4 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-primary"
                  required
                />
              </div>

              {/* Criteria */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-primary">
                    Criteria *
                  </label>
                  <Button
                    type="button"
                    onClick={addCriterion}
                    className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Criterion
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.criteria.map((criterion, index) => (
                    <div
                      key={criterion.id}
                      className="p-4 bg-primary/5 rounded-lg border border-primary/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-primary">Criterion {index + 1}</h3>
                        {formData.criteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCriterion(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-primary/70 mb-1">
                            Label *
                          </label>
                          <input
                            type="text"
                            value={criterion.label}
                            onChange={(e) => updateCriterion(index, 'label', e.target.value)}
                            placeholder="e.g., Clarity and Cohesion"
                            className="w-full px-3 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-primary text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-primary/70 mb-1">
                            Max Points *
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={criterion.maxPoints}
                            onChange={(e) => updateCriterion(index, 'maxPoints', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-primary text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs font-medium text-primary/70 mb-1">
                          Descriptor (Optional)
                        </label>
                        <textarea
                          value={criterion.descriptor || ''}
                          onChange={(e) => updateCriterion(index, 'descriptor', e.target.value)}
                          placeholder="e.g., Student expresses ideas clearly and coherently..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-primary text-sm"
                        />
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs font-medium text-primary/70 mb-1">
                          Weight (Optional, 0-1)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={criterion.weight || 1}
                          onChange={(e) => updateCriterion(index, 'weight', parseFloat(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-primary text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-primary/70">
                    Total Points: <span className="font-medium text-primary">{calculateTotalPoints()}</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-primary/10">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-secondary hover:bg-primary/80 border-0 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingRubric ? 'Update Rubric' : 'Create Rubric'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
