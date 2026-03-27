"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, User as UserIcon, Filter, ArrowUpDown, RefreshCw, Github, BarChart3 } from 'lucide-react';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: 'STUDENT' | 'STAFF';
  createdAt: string;
  reg_no?: string;
  department?: string;
  year?: number;
  section?: string;
  leetcodeId?: string | null;
  githubUrl?: string | null;
  points?: number;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmationDialog();
  const toast = useToastNotification();

  // Filters & Sort State
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [githubFilter, setGithubFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  
  // Search is still client-side or can be server-side if backend supports 'q' param (we didn't add 'q' yet, so keep client-side or add 'q' to backend later)
  // Actually, let's keep search client-side for now as per previous implementation, 
  // OR we can rely on the backend filters we just added. 
  // The user asked for sort/filter options.
  // Let's use server-side for filters/sort, and client-side for text search on the returned list 
  // (or ideally server-side search, but we didn't implement 'q' in backend service yet).
  // Wait, the previous implementation had client-side search. I will keep it client-side on the fetched results for now, 
  // but fetch results based on filters.
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, deptFilter, yearFilter, sortBy, sortOrder]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (deptFilter) params.append('department', deptFilter);
      if (yearFilter) params.append('year', yearFilter);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const res = await api.get<User[]>(`/users?${params.toString()}`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted successfully!');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Client-side search filtering on top of server-side filtered results
  const filteredUsers = users.filter(user => {
      const hasGithub = Boolean(user.githubUrl?.trim());

      if (githubFilter === 'linked' && !hasGithub) return false;
      if (githubFilter === 'unlinked' && hasGithub) return false;

      if (!search) return true;
      const lowerSearch = search.toLowerCase();
      return (
        (user.name?.toLowerCase() || '').includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch) ||
        (user.reg_no?.toLowerCase() || '').includes(lowerSearch) ||
        (user.leetcodeId?.toLowerCase() || '').includes(lowerSearch) ||
        (user.githubUrl?.toLowerCase() || '').includes(lowerSearch)
      );
  });

  const totalUsers = users.length;
  const linkedGithubUsers = users.filter((u) => Boolean(u.githubUrl?.trim())).length;
  const visibleUsers = filteredUsers.length;

  return (
    <div className="text-primary">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold font-alan-sans">User Management</h1>
        <div className="flex gap-2">
            <button
                onClick={fetchUsers}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-primary rounded-lg shadow-md hover:bg-secondary/80 transition-colors border border-primary/10"
            >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
            </button>
            <Link
            href="/admin/users/create"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary rounded-lg shadow-md hover:bg-primary/80 transition-colors"
            >
            <Plus className="w-5 h-5" />
            Add New User
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-secondary border border-primary/10 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-primary/50">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-primary">{totalUsers}</p>
        </div>
        <div className="bg-secondary border border-primary/10 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-primary/50 flex items-center gap-1"><Github className="w-3 h-3" /> GitHub Linked</p>
          <p className="mt-1 text-2xl font-bold text-primary">{linkedGithubUsers}</p>
        </div>
        <div className="bg-secondary border border-primary/10 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-primary/50 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Visible Rows</p>
          <p className="mt-1 text-2xl font-bold text-primary">{visibleUsers}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-secondary p-4 rounded-lg shadow-sm mb-4 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        
        <div className="flex flex-wrap gap-2 items-center flex-1">
            <div className="flex items-center gap-2 text-primary/60 mr-2">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-md bg-primary/5 border border-primary/10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
                <option value="">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff</option>
            </select>

            <select 
                value={deptFilter} 
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 rounded-md bg-primary/5 border border-primary/10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
                <option value="">All Depts</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="IT">IT</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="AIDS">AIDS</option>
            </select>

            <select 
                value={yearFilter} 
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-1.5 rounded-md bg-primary/5 border border-primary/10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
            </select>

              <select
                value={githubFilter}
                onChange={(e) => setGithubFilter(e.target.value as 'all' | 'linked' | 'unlinked')}
                className="px-3 py-1.5 rounded-md bg-primary/5 border border-primary/10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="all">All GitHub</option>
                <option value="linked">Linked Only</option>
                <option value="unlinked">Not Linked</option>
              </select>
        </div>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search visible users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="bg-secondary rounded-lg shadow-md overflow-hidden">
        {isLoading && <div className="p-6 text-center text-primary/70">Loading users...</div>}
        {error && <div className="p-6 text-center text-red-500">{error}</div>}
        {!isLoading && !error && filteredUsers.length === 0 && (
          <div className="p-6 text-center text-primary/60">No users found matching criteria.</div>
        )}

        {!isLoading && !error && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-primary/5 border-b border-primary/10">
                <tr>
                  <th 
                    className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60 cursor-pointer hover:bg-primary/10"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                        Name
                        {sortBy === 'name' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                  <th 
                    className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60 cursor-pointer hover:bg-primary/10"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1">
                        Email
                        {sortBy === 'email' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Role</th>
                  <th 
                    className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60 cursor-pointer hover:bg-primary/10"
                    onClick={() => handleSort('reg_no')}
                  >
                    <div className="flex items-center gap-1">
                        Reg No
                        {sortBy === 'reg_no' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Dept/Year/Sec</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">LeetCode ID</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">GitHub</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Points</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-primary/5">
                    <td className="p-3 font-medium flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary/70">
                            <UserIcon className="w-4 h-4" />
                        </div>
                        {user.name || 'N/A'}
                    </td>
                    <td className="p-3 text-sm">{user.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'STAFF' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{user.reg_no || '-'}</td>
                    <td className="p-3 text-sm">
                        {user.department || '-'}/{user.year || '-'}/{user.section || '-'}
                    </td>
                    <td className="p-3 text-sm">{user.leetcodeId || '-'}</td>
                    <td className="p-3 text-sm">
                      {user.githubUrl ? (
                        <span className="inline-flex items-center gap-2">
                          <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Linked
                          </a>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            READY
                          </span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          MISSING
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm">{user.points || 0}</td>
                    <td className="p-3">
                      <div className="flex gap-2 text-primary/70">
                        <Link
                          href={`/admin/users/${user.id}`}
                          title="Edit User"
                          className="p-1.5 hover:text-green-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/users/${user.id}#github-details`}
                          title="View GitHub Stats"
                          className="p-1.5 hover:text-blue-600"
                        >
                          <Github className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(user.id)}
                          title="Delete User"
                          className="p-1.5 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
