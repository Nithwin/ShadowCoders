'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ClipboardCopy, Globe, Lock, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Template {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
  };
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'public'>('all');

  useEffect(() => {
    fetchTemplates();
  }, [searchQuery, filter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      
      // If filter is 'public', we ask for public only.
      // If filter is 'mine', the backend defaults to showing mine (userId matches).
      // If filter is 'all', we want to see everything (mine + public).
      // The backend logic is: OR: [{ createdBy: userId }, ...(isPublic ? [{ isPublic: true }] : [])]
      // So if we don't send isPublic=true, we only see ours.
      // If we send isPublic=true, we see ours OR public.
      
      if (filter === 'public') {
        params.append('isPublic', 'true');
        // We might need a backend change if we want ONLY public and NOT mine, 
        // but typically "Public" filter implies "All Public Templates".
      } else if (filter === 'all') {
        // For "All", we want to see public templates AND our own.
        // So we should send isPublic=true to activate the OR clause.
        params.append('isPublic', 'true');
      }
      
      const response = await api.get(`/admin/templates?${params.toString()}`);
      
      let data = response.data.templates;
      
      // Client-side filtering to refine the results if needed
      if (filter === 'mine') {
        // Backend returns mine by default, but if we want to be sure
        // we can filter here or trust the backend.
        // The backend returns { createdBy: userId } OR ...
        // If we don't send isPublic, it returns ONLY mine. So 'mine' is fine.
      } else if (filter === 'public') {
         // If we want ONLY public (and not my private ones unless they are public),
         // we might filter client side.
         data = data.filter((t: Template) => t.isPublic);
      }

      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/admin/templates/${id}`);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  const handleCreateExam = async (templateId: string) => {
    // Navigate to create exam page with template ID
    router.push(`/admin/exams/new?templateId=${templateId}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-primary">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-alan-sans mb-2">Exam Templates</h1>
          <p className="text-primary/70">Manage and use templates to quickly create exams.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/5 transition-all shadow-sm text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/5 transition-all shadow-sm text-sm cursor-pointer"
        >
          <option value="all">All Templates</option>
          <option value="mine">My Templates</option>
          <option value="public">Public Templates</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-300 group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-gray-50 rounded-lg text-black">
                  <ClipboardCopy className="w-5 h-5" />
                </div>
                {template.isPublic ? (
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full">
                    <Globe className="w-3 h-3" /> Public
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded-full">
                    <Lock className="w-3 h-3" /> Private
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold mb-2 text-gray-900 group-hover:text-black transition-colors">{template.title}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-1 leading-relaxed">
                {template.description || 'No description provided for this template.'}
              </p>

              <div className="pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 font-medium">
                  <span className="bg-gray-50 px-2 py-1 rounded text-gray-500">{template.creator.name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{format(new Date(template.createdAt), 'MMM d, yyyy')}</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCreateExam(template.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 active:scale-[0.98] transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow"
                  >
                    <Plus className="w-4 h-4" />
                    Use Template
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-100"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
