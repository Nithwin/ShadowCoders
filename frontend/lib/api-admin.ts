import { api } from '@/lib/api';

// Minimal types for admin usage
export interface Exam {
  id: string;
  title: string;
  description?: string | null;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListExamsParams {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: 'PUBLISHED' | 'DRAFT';
}

export const AdminAPI = {
  // Exams
  async listExams(params: ListExamsParams = {}) {
    const { data } = await api.get('/admin/exams', { params });
    return data as { data: Exam[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } };
  },

  async publishExam(examId: string) {
    const { data } = await api.post(`/admin/exams/${examId}/publish`);
    return data;
  },

  async deleteExam(examId: string) {
    const { data } = await api.delete(`/admin/exams/${examId}`);
    return data;
  },

  async updateExam(examId: string, payload: Partial<Exam>) {
    const { data } = await api.put(`/admin/exams/${examId}`, payload);
    return data;
  },

  async assignExam(examId: string, payload: Record<string, unknown>) {
    const { data } = await api.post(`/admin/exams/${examId}/assign`, payload);
    return data;
  },

  // Attempts
  async listAttemptsForExam(examId: string, params?: { page?: number; pageSize?: number }) {
    const { data } = await api.get(`/admin/attempts/exam/${examId}`, { params });
    return data;
  },

  async getAttempt(attemptId: string) {
    const { data } = await api.get(`/admin/attempts/${attemptId}`);
    return data;
  },

  // Assets
  async uploadAsset(form: FormData) {
    const { data } = await api.post('/admin/assets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Sections
  async createSection(examId: string, payload: Record<string, unknown>) {
    const { data } = await api.post(`/admin/exams/${examId}/sections`, payload);
    return data;
  },

  async addQuestionsToSection(sectionId: string, payload: Record<string, unknown>) {
    const { data } = await api.post(`/admin/sections/${sectionId}/questions`, payload);
    return data;
  },

  async updateSection(sectionId: string, payload: Record<string, unknown>) {
    const { data } = await api.put(`/admin/sections/${sectionId}`, payload);
    return data;
  },

  async deleteSection(sectionId: string) {
    const { data } = await api.delete(`/admin/sections/${sectionId}`);
    return data;
  },

  async removeQuestionFromSection(sectionId: string, questionId: string) {
    const { data } = await api.delete(`/admin/sections/${sectionId}/questions/${questionId}`);
    return data;
  },

  // Questions
  async addQuestionsToExam(examId: string, payload: Record<string, unknown>) {
    const { data } = await api.post(`/admin/exams/${examId}/questions`, payload);
    return data;
  },

  async updateQuestion(questionId: string, payload: Record<string, unknown>) {
    const { data } = await api.put(`/admin/questions/${questionId}`, payload);
    return data;
  },

  async deleteQuestion(questionId: string) {
    const { data } = await api.delete(`/admin/questions/${questionId}`);
    return data;
  },

  // Rubrics
  async createRubric(payload: Record<string, unknown>) {
    const { data } = await api.post('/admin/rubrics', payload);
    return data;
  },
};
