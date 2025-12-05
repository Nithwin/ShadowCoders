'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ExternalLink,
  Trophy,
  Target,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import * as XLSX from 'xlsx';
import Modal from '@/components/ui/Modal';
import { User, LeetCodeStats } from '@/types';

// Department options
const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL', 'AIDS', 'AIML'];
const YEARS = [1, 2, 3, 4];

interface ExportOptions {
  basicInfo: boolean;
  problemStats: boolean;
  contestStats: boolean;
  granularContest: boolean; // Weekly vs Bi-weekly
}

export default function LeetCodeDashboard() {
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Export Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    basicInfo: true,
    problemStats: true,
    contestStats: true,
    granularContest: true
  });
  
  const { showToast } = useToast();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch all users. We filter for role='STUDENT' client-side for now.
      const { data } = await api.get('/users'); 
      const studentData = data.filter((u: User) => u.role === 'STUDENT');
      setStudents(studentData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to fetch student data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await api.post('/leetcode/sync');
      showToast('LeetCode stats synced successfully', 'success');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error syncing data:', error);
      showToast('Failed to sync LeetCode stats', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const executeExport = () => {
    try {
      const dataToExport = filteredStudents.map(student => {
        const stats = student.leetcodeStats;
        const row: any = {};

        if (exportOptions.basicInfo) {
          row['Name'] = student.name;
          row['Reg No'] = student.reg_no;
          row['Department'] = student.department;
          row['Section'] = student.section;
          row['Year'] = student.year;
          row['LeetCode ID'] = student.leetcodeId || 'N/A';
        }

        if (exportOptions.problemStats) {
          row['Total Solved'] = stats?.totalSolved || 0;
          row['Easy'] = stats?.easySolved || 0;
          row['Medium'] = stats?.mediumSolved || 0;
          row['Hard'] = stats?.hardSolved || 0;
        }

        if (exportOptions.contestStats) {
          row['Rating'] = stats?.contest?.rating ? Math.round(stats.contest.rating) : 'N/A';
          row['Global Ranking'] = stats?.contest?.globalRanking || 'N/A';
          row['Top %'] = stats?.contest?.topPercentage || 'N/A';
          row['Total Attended'] = stats?.contest?.attendedContestsCount || 0;
        }

        if (exportOptions.granularContest) {
          row['Weekly Attended'] = stats?.contest?.weeklyAttended || 0;
          row['Bi-Weekly Attended'] = stats?.contest?.biweeklyAttended || 0;
        }
        
        row['Last Updated'] = stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'N/A';

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "LeetCode Stats");
      XLSX.writeFile(wb, `leetcode_stats_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showToast('Exported successfully', 'success');
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export data', 'error');
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.reg_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.leetcodeId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Dept Filter
    const matchesDept = deptFilter === 'all' || student.department === deptFilter;
    
    // Year Filter
    const matchesYear = yearFilter === 'all' || student.year?.toString() === yearFilter;

    // Link Status Filter
    let matchesLink = true;
    if (filter === 'linked') matchesLink = !!student.leetcodeId;
    if (filter === 'unlinked') matchesLink = !student.leetcodeId;

    return matchesSearch && matchesDept && matchesYear && matchesLink;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            LeetCode Dashboard
          </h1>
          <p className="text-primary/60 mt-1">
            Track and analyze student LeetCode performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Data'}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-2xl border border-primary/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary/60">Total Students</p>
              <h3 className="text-2xl font-bold text-primary">{students.length}</h3>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-primary/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary/60">Linked Profiles</p>
              <h3 className="text-2xl font-bold text-primary">
                {students.filter(s => s.leetcodeId).length}
              </h3>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-primary/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary/60">Total Solved</p>
              <h3 className="text-2xl font-bold text-primary">
                {students.reduce((acc, s) => acc + (s.leetcodeStats?.totalSolved || 0), 0).toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-primary/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary/60">Avg Rating</p>
              <h3 className="text-2xl font-bold text-primary">
                {(() => {
                  const ratedStudents = students.filter(s => s.leetcodeStats?.contest?.rating);
                  if (ratedStudents.length === 0) return 0;
                  const totalRating = ratedStudents.reduce((acc, s) => acc + (s.leetcodeStats?.contest?.rating || 0), 0);
                  return Math.round(totalRating / ratedStudents.length);
                })()}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-primary/10 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
            <input
              type="text"
              placeholder="Search by name, reg no, or leetcode ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-primary/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-4 py-2 bg-secondary/50 border border-primary/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
           <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2 bg-secondary/50 border border-primary/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Years</option>
            {YEARS.map(year => <option key={year} value={year}>Year {year}</option>)}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'all' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-secondary text-primary/70 hover:bg-secondary/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('linked')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'linked' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-secondary text-primary/70 hover:bg-secondary/80'
            }`}
          >
            Linked
          </button>
          <button
            onClick={() => setFilter('unlinked')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'unlinked' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-secondary text-primary/70 hover:bg-secondary/80'
            }`}
          >
            Unlinked
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 border-b border-primary/10">
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary/60 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary/60 uppercase tracking-wider">LeetCode ID</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-primary/60 uppercase tracking-wider">Solved</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-primary/60 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-primary/60 uppercase tracking-wider">Contests</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-primary/60 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-primary/60">
                    Loading data...
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-primary/60">
                    No students found matching your criteria
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {student.pictureUrl ? (
                            <img src={student.pictureUrl} alt={student.name || ''} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-bold text-sm">
                              {student.name?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-primary">{student.name}</p>
                          <p className="text-xs text-primary/60">{student.reg_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.leetcodeId ? (
                        <a 
                          href={`https://leetcode.com/${student.leetcodeId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {student.leetcodeId}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-primary/40 italic">Not linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {student.leetcodeStats ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-primary">{student.leetcodeStats.totalSolved}</span>
                          <div className="flex gap-1 text-[10px]">
                            <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded">{student.leetcodeStats.easySolved}</span>
                            <span className="text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">{student.leetcodeStats.mediumSolved}</span>
                            <span className="text-red-600 bg-red-100 px-1.5 py-0.5 rounded">{student.leetcodeStats.hardSolved}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-primary/40">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {student.leetcodeStats?.contest?.rating ? (
                        <span className="font-medium text-primary">
                          {Math.round(student.leetcodeStats.contest.rating)}
                        </span>
                      ) : (
                        <span className="text-primary/40">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {student.leetcodeStats?.contest ? (
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-primary">
                          {student.leetcodeStats.contest.attendedContestsCount}
                        </span>
                        <span className="text-[10px] text-primary/60">
                           W: {student.leetcodeStats.contest.weeklyAttended || 0} | B: {student.leetcodeStats.contest.biweeklyAttended || 0}
                        </span>
                      </div>
                    ) : (
                      <span className="text-primary/40">-</span>
                    )}
                  </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary/60 hover:text-primary">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-primary/10 flex items-center justify-between bg-secondary/20">
          <p className="text-sm text-primary/60">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of{' '}
            <span className="font-medium">{filteredStudents.length}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          </div>
        </div>
      </div>


      {/* Export Modal */}
      <Modal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        title="Export to Excel"
      >
        <div className="space-y-4">
          <p className="text-primary/70">Select the data columns you want to include in the export.</p>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
              <input 
                type="checkbox" 
                checked={exportOptions.basicInfo}
                onChange={(e) => setExportOptions(prev => ({ ...prev, basicInfo: e.target.checked }))}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="font-medium text-primary">Basic Info (Name, Reg No, Dept)</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
              <input 
                type="checkbox" 
                checked={exportOptions.problemStats}
                onChange={(e) => setExportOptions(prev => ({ ...prev, problemStats: e.target.checked }))}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="font-medium text-primary">Problem Stats (Easy, Medium, Hard)</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
              <input 
                type="checkbox" 
                checked={exportOptions.contestStats}
                onChange={(e) => setExportOptions(prev => ({ ...prev, contestStats: e.target.checked }))}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="font-medium text-primary">Contest Stats (Rating, Ranking, Total Attended)</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
              <input 
                type="checkbox" 
                checked={exportOptions.granularContest}
                onChange={(e) => setExportOptions(prev => ({ ...prev, granularContest: e.target.checked }))}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="font-medium text-primary">Granular Contest Data (Weekly, Bi-Weekly)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
             <button
              onClick={() => setShowExportModal(false)}
              className="px-4 py-2 text-primary/70 hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeExport}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
