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
  granularContest: boolean;
  contestDetails: boolean; // Q1-Q4 solved status
}

type ExportType = 'all' | 'weekly' | 'biweekly' | 'latest';

export default function LeetCodeDashboard() {
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'overview' | 'contest'>('overview');
  const [selectedContestTitle, setSelectedContestTitle] = useState<string>('');
  
  // Filters
  const [exportDeptFilter, setExportDeptFilter] = useState<string>('all');
  const [exportYearFilter, setExportYearFilter] = useState<string>('all');
  
  // Options for Overview Mode
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    basicInfo: true,
    problemStats: true,
    contestStats: true,
    granularContest: true,
    contestDetails: false
  });

  // Derived state for available contests
  const availableContests = React.useMemo(() => {
    const contests = new Set<string>();
    students.forEach(student => {
      const weekly = student.leetcodeStats?.contest?.weeklyContests || [];
      const biweekly = student.leetcodeStats?.contest?.biweeklyContests || [];
      [...weekly, ...biweekly].forEach(c => {
        if (c.title) contests.add(c.title);
      });
    });
    return Array.from(contests).sort(); // You might want a better sort based on contest ID/Date
  }, [students]);

  const { showToast } = useToast();

  // ... (keep pagination state) ...
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
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
      fetchData(); 
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
      // Apply filters first
      let studentsToExport = filteredStudents;
      if (exportDeptFilter !== 'all') {
        studentsToExport = studentsToExport.filter(s => s.department === exportDeptFilter);
      }
      if (exportYearFilter !== 'all') {
        studentsToExport = studentsToExport.filter(s => s.year?.toString() === exportYearFilter);
      }

      let dataToExport: any[] = [];
      let fileName = '';

      if (exportMode === 'overview') {
        // --- GENERAL OVERVIEW EXPORT ---
        fileName = `leetcode_overview_${new Date().toISOString().split('T')[0]}.xlsx`;
        dataToExport = studentsToExport.map(student => {
          const stats = student.leetcodeStats;
          const row: any = {};

          if (exportOptions.basicInfo) {
            row['Name'] = student.name;
            row['Reg No'] = student.reg_no;
            row['Department'] = student.department;
            row['Year'] = student.year;
            row['LeetCode ID'] = student.leetcodeId || 'N/A';
          }
          if (exportOptions.problemStats) {
            row['Total Solved'] = stats?.total || 0;
            row['Easy'] = stats?.easy || 0;
            row['Medium'] = stats?.medium || 0;
            row['Hard'] = stats?.hard || 0;
          }
          if (exportOptions.contestStats) {
            row['Rating'] = stats?.contest?.rating ? Math.round(stats.contest.rating) : 'N/A';
            row['Global Ranking'] = stats?.contest?.globalRanking || 'N/A';
            row['Total Attended'] = stats?.contest?.attended || 0;
          }
          if (exportOptions.granularContest) {
            row['Weekly Attended'] = stats?.contest?.weeklyAttended || 0;
            row['Bi-Weekly Attended'] = stats?.contest?.biweeklyAttended || 0;
          }
           // Add Latest Contest Overview
           const latest = stats?.contest?.latestWeekly || stats?.contest?.latestBiweekly;
           if (latest) {
             row['Latest Contest'] = latest.title;
             row['Latest Rank'] = latest.ranking;
           }
          
          row['Last Updated'] = stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'N/A';
          return row;
        });

        // Add Summary Row for Overview
        if (dataToExport.length > 0) {
          const summaryRow: any = { 'Name': `SUMMARY (${dataToExport.length} Students)` };
          
          const sum = (field: string) => dataToExport.reduce((acc, curr) => acc + (curr[field] || 0), 0);
          const avg = (field: string) => Math.round(sum(field) / dataToExport.length);

          if (exportOptions.problemStats) {
            summaryRow['Total Solved'] = `${sum('Total Solved')} (Avg: ${avg('Total Solved')})`;
            summaryRow['Easy'] = `${sum('Easy')} (Avg: ${avg('Easy')})`;
            summaryRow['Medium'] = `${sum('Medium')} (Avg: ${avg('Medium')})`;
            summaryRow['Hard'] = `${sum('Hard')} (Avg: ${avg('Hard')})`;
          }
          if (exportOptions.contestStats) {
             const ratedStudents = dataToExport.filter(r => r['Rating'] !== 'N/A');
             const avgRating = ratedStudents.length ? ratedStudents.reduce((acc, curr) => acc + curr['Rating'], 0) / ratedStudents.length : 0;
             summaryRow['Rating'] = `Avg: ${Math.round(avgRating)}`;
             summaryRow['Total Attended'] = `${sum('Total Attended')} (Avg: ${avg('Total Attended')})`;
          }
          dataToExport.push({}); // Empty row
          dataToExport.push(summaryRow);
        }

      } else {
        // --- CONTEST ANALYSIS EXPORT ---
        if (!selectedContestTitle) {
          showToast('Please select a contest to export', 'error');
          return;
        }
        fileName = `leetcode_contest_${selectedContestTitle.replace(/\s+/g, '_')}.xlsx`;

        dataToExport = studentsToExport.map(student => {
          const stats = student.leetcodeStats;
          // Find the specific contest in the student's history
          const allContests = [
            ...(stats?.contest?.weeklyContests || []),
            ...(stats?.contest?.biweeklyContests || [])
          ];
          const contestData = allContests.find(c => c.title === selectedContestTitle);

          return {
            'Name': student.name,
            'Reg No': student.reg_no,
            'Department': student.department,
            'Contest': selectedContestTitle,
            'Attended': contestData ? 'Yes' : 'No',
            'Rank': contestData?.ranking || 'N/A',
            'Problems Solved': contestData?.problemsSolved || 0,
            'Q1': contestData ? (contestData.q1 ? 1 : 0) : 0,
            'Q2': contestData ? (contestData.q2 ? 1 : 0) : 0,
            'Q3': contestData ? (contestData.q3 ? 1 : 0) : 0,
            'Q4': contestData ? (contestData.q4 ? 1 : 0) : 0,
            'Finish Time (Sec)': contestData?.finishTimeInSeconds || 0,
            'Rating After': contestData?.rating ? Math.round(contestData.rating) : 'N/A'
          };
        });

        // Add Summary Row for Contest Analysis
        if (dataToExport.length > 0) {
          const attendedCount = dataToExport.filter(r => r['Attended'] === 'Yes').length;
          const totalQ1 = dataToExport.reduce((acc, curr) => acc + curr['Q1'], 0);
          const totalQ2 = dataToExport.reduce((acc, curr) => acc + curr['Q2'], 0);
          const totalQ3 = dataToExport.reduce((acc, curr) => acc + curr['Q3'], 0);
          const totalQ4 = dataToExport.reduce((acc, curr) => acc + curr['Q4'], 0);
          const totalSolved = dataToExport.reduce((acc, curr) => acc + curr['Problems Solved'], 0);
          const avgSolved = attendedCount ? totalSolved / attendedCount : 0;

          // Convert 1/0 back to checkmarks for main data, but keep numbers for calculation above if needed
          // Actually, let's remap the main data to checkmarks NOW, before export
          dataToExport = dataToExport.map(row => ({
            ...row,
            'Q1': row['Q1'] === 1 ? '✅' : '❌',
            'Q2': row['Q2'] === 1 ? '✅' : '❌',
            'Q3': row['Q3'] === 1 ? '✅' : '❌',
            'Q4': row['Q4'] === 1 ? '✅' : '❌',
          }));

          const summaryRow = {
            'Name': `SUMMARY (${attendedCount} Attended)`,
            'Attended': `${attendedCount}/${dataToExport.length} (${Math.round((attendedCount / dataToExport.length) * 100)}%)`,
            'Problems Solved': `${totalSolved} (Avg: ${avgSolved.toFixed(1)})`,
            'Q1': `${totalQ1} (${Math.round(totalQ1/attendedCount*100)}%)`,
            'Q2': `${totalQ2} (${Math.round(totalQ2/attendedCount*100)}%)`,
            'Q3': `${totalQ3} (${Math.round(totalQ3/attendedCount*100)}%)`,
            'Q4': `${totalQ4} (${Math.round(totalQ4/attendedCount*100)}%)`,
          };

          dataToExport.push({}); // Empty row
          dataToExport.push(summaryRow);
        }
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Export Data");
      XLSX.writeFile(wb, fileName);
      
      showToast(`Exported ${dataToExport.length} records successfully`, 'success');
      setShowExportModal(false);

    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export data', 'error');
    }
  };

  // ... (keep search/filter logic same as before) ...
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

  // ... (keep pagination logic same as before) ...
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <div className="space-y-8">
      {/* Header, Stats Cards, Filters (Table) - Keep exactly as is from previous render */}
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
                {students.reduce((acc, s) => acc + (s.leetcodeStats?.total || 0), 0).toLocaleString()}
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
                          <span className="font-bold text-primary">{student.leetcodeStats.total}</span>
                          <div className="flex gap-1 text-[10px]">
                            <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded">{student.leetcodeStats.easy}</span>
                            <span className="text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">{student.leetcodeStats.medium}</span>
                            <span className="text-red-600 bg-red-100 px-1.5 py-0.5 rounded">{student.leetcodeStats.hard}</span>
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
                          {student.leetcodeStats.contest.attended}
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


      {/* NEW EXPORT MODAL DESIGN */}
      <Modal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        title="Export Data"
      >
        <div className="space-y-6">
          {/* Mode Switching Tabs */}
          <div className="flex p-1 bg-secondary/30 rounded-xl">
            <button
              onClick={() => setExportMode('overview')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                exportMode === 'overview' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-primary/60 hover:text-primary'
              }`}
            >
              📊 General Overview
            </button>
            <button
              onClick={() => setExportMode('contest')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                exportMode === 'contest' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-primary/60 hover:text-primary'
              }`}
            >
              🏆 Contest Analysis
            </button>
          </div>

          {/* Common Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Department</label>
              <select
                value={exportDeptFilter}
                onChange={(e) => setExportDeptFilter(e.target.value)}
                className="w-full px-4 py-2 bg-secondary/50 border border-primary/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Year</label>
              <select
                value={exportYearFilter}
                onChange={(e) => setExportYearFilter(e.target.value)}
                className="w-full px-4 py-2 bg-secondary/50 border border-primary/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Years</option>
                {YEARS.map(year => <option key={year} value={year}>Year {year}</option>)}
              </select>
            </div>
          </div>
          
          {/* Mode Specific Options */}
          {exportMode === 'overview' ? (
            <div className="space-y-3 p-4 bg-secondary/10 rounded-xl border border-primary/5">
              <h4 className="text-sm font-semibold text-primary mb-2">Include Columns:</h4>
              <div className="grid grid-cols-2 gap-3">
                 <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={exportOptions.basicInfo} onChange={e => setExportOptions({...exportOptions, basicInfo: e.target.checked})} className="rounded text-primary" />
                  Basic Info
                 </label>
                 <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={exportOptions.problemStats} onChange={e => setExportOptions({...exportOptions, problemStats: e.target.checked})} className="rounded text-primary" />
                  Problem Stats
                 </label>
                 <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={exportOptions.contestStats} onChange={e => setExportOptions({...exportOptions, contestStats: e.target.checked})} className="rounded text-primary" />
                  Contest Stats
                 </label>
                 <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={exportOptions.granularContest} onChange={e => setExportOptions({...exportOptions, granularContest: e.target.checked})} className="rounded text-primary" />
                  Granular Contests
                 </label>
              </div>
            </div>
          ) : (
             <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-primary mb-2">Select Contest</label>
                  <select
                    value={selectedContestTitle}
                    onChange={(e) => setSelectedContestTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Select a contest --</option>
                    {availableContests.map(title => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                  <p className="text-xs text-primary/60 mt-2">
                    Select a specific contest to analyze student performance, including rank and Q1-Q4 solve status.
                  </p>
               </div>
             </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-primary/10">
             <button
              onClick={() => setShowExportModal(false)}
              className="px-4 py-2 text-primary/70 hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeExport}
              disabled={exportMode === 'contest' && !selectedContestTitle}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
