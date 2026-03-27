"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Github, ExternalLink, Activity, GitFork, Star, Users, FileCode2 } from 'lucide-react';
import { useToastNotification } from '@/context/ToastContext';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const toast = useToastNotification();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubStats, setGithubStats] = useState<any | null>(null);
  const [isLoadingGithubStats, setIsLoadingGithubStats] = useState(false);
  const [githubStatsError, setGithubStatsError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    reg_no: '',
    department: '',
    year: '',
    section: '',
    leetcodeId: '',
    githubUrl: '',
    points: '',
    pictureUrl: '',
  });

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/users/${userId}`);
      const user = res.data;
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'STUDENT',
        reg_no: user.reg_no || '',
        department: user.department || '',
        year: user.year ? String(user.year) : '',
        section: user.section || '',
        leetcodeId: user.leetcodeId || '',
        githubUrl: user.githubUrl || '',
        points: user.points ? String(user.points) : '0',
        pictureUrl: user.pictureUrl || '',
      });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch user details.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGithubStats = async () => {
    setIsLoadingGithubStats(true);
    setGithubStatsError(null);
    try {
      const res = await api.get(`/users/${userId}/github-stats`);
      setGithubStats(res.data);
    } catch (err: any) {
      console.error(err);
      setGithubStats(null);
      setGithubStatsError(
        err?.response?.data?.message ||
        'Failed to load GitHub stats. Please check that a GitHub URL is linked and try refresh.'
      );
    } finally {
      setIsLoadingGithubStats(false);
    }
  };

  useEffect(() => {
    fetchGithubStats();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        // email: formData.email, // Email usually shouldn't be changed or needs verification
        role: formData.role,
      };

      // Only include name if provided, otherwise null
      payload.name = formData.name?.trim() || null;

      if (formData.password) {
        payload.password = formData.password;
      }

      // LeetCode ID - available for all users
      payload.leetcodeId = formData.leetcodeId?.trim() || null;
      payload.githubUrl = formData.githubUrl?.trim() || null;

      // Points - available for all users
      payload.points = formData.points ? parseInt(formData.points) : 0;

      // Picture URL - available for all users
      payload.pictureUrl = formData.pictureUrl?.trim() || null;

      if (formData.role === 'STUDENT') {
        // Only include reg_no if provided, otherwise null
        payload.reg_no = formData.reg_no?.trim() || null;
        payload.department = formData.department?.trim() || null;
        payload.year = formData.year ? parseInt(formData.year) : null;
        payload.section = formData.section?.trim() || null;
      } else {
        // Clear student-specific fields if role is STAFF
        payload.reg_no = null;
        payload.department = null;
        payload.year = null;
        payload.section = null;
      }

      await api.put(`/users/${userId}`, payload);
      await fetchGithubStats();
      toast.success('User updated successfully!');
      router.push('/admin/users');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to update user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-primary/70">Loading user details...</div>;
  }

  return (
    <div className="text-primary max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/users"
          className="p-2 rounded-full hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold font-alan-sans">Edit User</h1>
      </div>

      <div className="bg-secondary rounded-lg shadow-md p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                readOnly
                className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 opacity-60 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">
                New Password (Optional)
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                minLength={6}
                className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Leave blank to keep current"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff (Admin)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">
                LeetCode ID
              </label>
              <input
                type="text"
                name="leetcodeId"
                value={formData.leetcodeId}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., username123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">
                GitHub Profile URL
              </label>
              <input
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="https://github.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">
                Points
              </label>
              <input
                type="number"
                name="points"
                value={formData.points}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">
                Profile Picture URL
              </label>
              <input
                type="url"
                name="pictureUrl"
                value={formData.pictureUrl}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="https://example.com/picture.jpg"
              />
            </div>
          </div>

          {formData.role === 'STUDENT' && (
            <>
              <div className="border-t border-primary/10 pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-primary/80">Student Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary/70 mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      name="reg_no"
                      value={formData.reg_no}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary/70 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary/70 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      min="1"
                      max="4"
                      className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary/70 mb-1">
                      Section
                    </label>
                    <input
                      type="text"
                      name="section"
                      value={formData.section}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-secondary rounded-lg shadow-md hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div id="github-details" className="mt-8 border-t border-primary/10 pt-6 scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary/90 flex items-center gap-2">
              <Github className="w-5 h-5" /> GitHub Details
            </h3>
            <button
              type="button"
              onClick={fetchGithubStats}
              className="text-sm px-3 py-1.5 rounded-md border border-primary/20 hover:bg-primary/5"
            >
              Refresh
            </button>
          </div>

          {isLoadingGithubStats && (
            <p className="text-sm text-primary/60">Loading GitHub stats...</p>
          )}

          {!isLoadingGithubStats && githubStatsError && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {githubStatsError}
            </div>
          )}

          {!isLoadingGithubStats && !githubStatsError && githubStats?.hasGithub === false && (
            <div className="p-4 rounded-lg border border-primary/10 bg-primary/5 text-sm text-primary/70">
              {githubStats?.message || 'No GitHub profile linked.'}
            </div>
          )}

          {!isLoadingGithubStats && !githubStatsError && githubStats?.hasGithub && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-primary/10 bg-primary/5">
                <div>
                  <p className="font-semibold text-primary">@{githubStats.github.username}</p>
                  <a
                    href={githubStats.github.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Open GitHub Profile <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-primary/60">{githubStats.github.note}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-primary/10 bg-white">
                  <p className="text-xs text-primary/60 flex items-center gap-1"><FileCode2 className="w-3 h-3" /> Repos</p>
                  <p className="text-lg font-semibold text-primary">{githubStats.github.publicRepos}</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/10 bg-white">
                  <p className="text-xs text-primary/60 flex items-center gap-1"><Users className="w-3 h-3" /> Followers</p>
                  <p className="text-lg font-semibold text-primary">{githubStats.github.followers}</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/10 bg-white">
                  <p className="text-xs text-primary/60 flex items-center gap-1"><Star className="w-3 h-3" /> Stars</p>
                  <p className="text-lg font-semibold text-primary">{githubStats.github.totals.stars}</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/10 bg-white">
                  <p className="text-xs text-primary/60 flex items-center gap-1"><GitFork className="w-3 h-3" /> Forks</p>
                  <p className="text-lg font-semibold text-primary">{githubStats.github.totals.forks}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-primary/10 bg-white">
                  <p className="text-xs text-primary/60">Repo Size (KB)</p>
                  <p className="text-lg font-semibold text-primary">{githubStats.github.totals.repoSizeKB}</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/10 bg-white">
                  <p className="text-xs text-primary/60">Estimated Lines</p>
                  <p className="text-lg font-semibold text-primary">{githubStats.github.totals.estimatedLines}</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/10 bg-white">
                  <p className="text-xs text-primary/60 flex items-center gap-1"><Activity className="w-3 h-3" /> Pushes (30d)</p>
                  <p className="text-lg font-semibold text-primary">{githubStats.github.recentActivity.pushEventsLast30d}</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/10 bg-white">
                  <p className="text-xs text-primary/60">Commits (30d)</p>
                  <p className="text-lg font-semibold text-primary">{githubStats.github.recentActivity.commitsLast30d}</p>
                </div>
              </div>
            </div>
          )}

          {!isLoadingGithubStats && !githubStatsError && !githubStats && (
            <div className="p-4 rounded-lg border border-primary/10 bg-primary/5 text-sm text-primary/70">
              No GitHub stats available yet. Click Refresh to fetch latest details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
