import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CompanyEmployee, LeaveRecord, LeaveType } from '../types';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  Download,
  Eye,
  Edit2,
  Clock,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  User,
  Building2,
  Briefcase,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
  ShieldCheck,
  History
} from 'lucide-react';

interface ConsolidatedLeaveTrackerProps {
  onNavigateToPayroll?: () => void;
}

export const ConsolidatedLeaveTracker: React.FC<ConsolidatedLeaveTrackerProps> = () => {
  const {
    employees,
    leaveRecords,
    addLeaveRecord,
    updateLeaveStatus,
    deleteLeaveRecord,
    updateEmployee,
    addAuditLog
  } = useData();

  const { currentUser, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMINISTRATOR' || currentUser?.role === 'MANAGER';

  // Find linked CompanyEmployee for current logged-in user
  const loggedInEmployee: CompanyEmployee | undefined = useMemo(() => {
    if (!currentUser) return undefined;
    const byName = employees.find(
      e => e.fullName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()
    );
    if (byName) return byName;
    const byNo = employees.find(
      e => e.employeeNo?.toLowerCase() === currentUser.username.toLowerCase()
    );
    if (byNo) return byNo;
    return employees[0];
  }, [currentUser, employees]);

  // Active View: 'consolidated' (Per-Employee Summary) | 'history' (Applications List)
  const [viewMode, setViewMode] = useState<'consolidated' | 'history'>('consolidated');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Has Pending' | 'Low Balance' | 'Active'>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Modals state
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedEmployeeForLedger, setSelectedEmployeeForLedger] = useState<CompanyEmployee | null>(null);
  const [adjustingEmployee, setAdjustingEmployee] = useState<CompanyEmployee | null>(null);
  const [adjustSil, setAdjustSil] = useState<number>(5);
  const [adjustVl, setAdjustVl] = useState<number>(12);
  const [adjustSl, setAdjustSl] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('Annual Leave Credit Reset / Adjustment');

  // File Leave Form State
  const [leaveForm, setLeaveForm] = useState<{
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    isPaid: boolean;
  }>({
    employeeId: employees[0]?.id || '',
    leaveType: 'Vacation Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    totalDays: 1,
    reason: '',
    isPaid: true
  });

  // Calculate days when date range changes
  const handleStartDateChange = (start: string) => {
    const end = leaveForm.endDate < start ? start : leaveForm.endDate;
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setLeaveForm(prev => ({
      ...prev,
      startDate: start,
      endDate: end,
      totalDays: Math.max(1, diffDays)
    }));
  };

  const handleEndDateChange = (end: string) => {
    const start = leaveForm.startDate > end ? end : leaveForm.startDate;
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setLeaveForm(prev => ({
      ...prev,
      startDate: start,
      endDate: end,
      totalDays: Math.max(1, diffDays)
    }));
  };

  // Distinct Departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts);
  }, [employees]);

  // Consolidated Per-Employee Data Aggregation
  const consolidatedEmployeeLeaves = useMemo(() => {
    return employees.map(emp => {
      const empLeaves = leaveRecords.filter(l => l.employeeId === emp.id);
      const approvedLeaves = empLeaves.filter(l => l.status === 'Approved');
      const pendingLeaves = empLeaves.filter(l => l.status === 'Pending');
      const rejectedLeaves = empLeaves.filter(l => l.status === 'Rejected');

      // Breakdown by leave type (Approved)
      const silUsed = approvedLeaves
        .filter(l => l.leaveType === 'Service Incentive Leave (SIL)' && l.isPaid)
        .reduce((sum, l) => sum + l.totalDays, 0);

      const vlUsed = approvedLeaves
        .filter(l => l.leaveType === 'Vacation Leave' && l.isPaid)
        .reduce((sum, l) => sum + l.totalDays, 0);

      const slUsed = approvedLeaves
        .filter(l => l.leaveType === 'Sick Leave' && l.isPaid)
        .reduce((sum, l) => sum + l.totalDays, 0);

      const emergencyUsed = approvedLeaves
        .filter(l => l.leaveType === 'Emergency Leave')
        .reduce((sum, l) => sum + l.totalDays, 0);

      const otherPaidUsed = approvedLeaves
        .filter(l => (l.leaveType === 'Maternity Leave' || l.leaveType === 'Paternity Leave') && l.isPaid)
        .reduce((sum, l) => sum + l.totalDays, 0);

      const unpaidUsed = approvedLeaves
        .filter(l => !l.isPaid || l.leaveType === 'Unpaid Leave')
        .reduce((sum, l) => sum + l.totalDays, 0);

      const totalPaidUsed = silUsed + vlUsed + slUsed + emergencyUsed + otherPaidUsed;
      const totalLeavesUsed = totalPaidUsed + unpaidUsed;

      const silBal = emp.silBalance ?? 5;
      const vlBal = emp.vlBalance ?? 12;
      const slBal = emp.slBalance ?? 10;
      const totalAvailable = silBal + vlBal + slBal;

      // Estimated initial allocated total
      const totalInitialAllocated = totalAvailable + totalPaidUsed;
      const utilizationRate = totalInitialAllocated > 0 ? (totalPaidUsed / totalInitialAllocated) * 100 : 0;

      return {
        employee: emp,
        silBalance: silBal,
        vlBalance: vlBal,
        slBalance: slBal,
        silUsed,
        vlUsed,
        slUsed,
        emergencyUsed,
        otherPaidUsed,
        unpaidUsed,
        totalPaidUsed,
        totalLeavesUsed,
        totalAvailable,
        totalInitialAllocated,
        utilizationRate,
        allLeavesCount: empLeaves.length,
        approvedCount: approvedLeaves.length,
        pendingCount: pendingLeaves.length,
        rejectedCount: rejectedLeaves.length,
        pendingLeaves,
        approvedLeaves,
        empLeaves
      };
    });
  }, [employees, leaveRecords]);

  // Filtered Consolidated Employees
  const filteredConsolidated = useMemo(() => {
    return consolidatedEmployeeLeaves.filter(item => {
      const emp = item.employee;

      // Department Filter
      if (departmentFilter !== 'All' && emp.department !== departmentFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'Has Pending' && item.pendingCount === 0) return false;
      if (statusFilter === 'Low Balance' && item.totalAvailable > 3) return false;
      if (statusFilter === 'Active' && emp.status !== 'Active') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchNo = (emp.employeeNo || '').toLowerCase().includes(q);
        const matchPos = (emp.position || '').toLowerCase().includes(q);
        const matchDept = (emp.department || '').toLowerCase().includes(q);
        return matchName || matchNo || matchPos || matchDept;
      }

      return true;
    });
  }, [consolidatedEmployeeLeaves, departmentFilter, statusFilter, searchQuery]);

  // Filtered Applications History
  const filteredHistory = useMemo(() => {
    return leaveRecords.filter(leave => {
      // Type Filter
      if (typeFilter !== 'All' && leave.leaveType !== typeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = leave.employeeName.toLowerCase().includes(q);
        const matchReason = (leave.reason || '').toLowerCase().includes(q);
        const matchStatus = leave.status.toLowerCase().includes(q);
        return matchName || matchReason || matchStatus;
      }

      return true;
    });
  }, [leaveRecords, typeFilter, searchQuery]);

  // Overall Firm Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalSilBal = 0;
    let totalVlBal = 0;
    let totalSlBal = 0;
    let totalSilUsed = 0;
    let totalVlUsed = 0;
    let totalSlUsed = 0;
    let totalUnpaidUsed = 0;
    let totalPending = 0;

    consolidatedEmployeeLeaves.forEach(item => {
      totalSilBal += item.silBalance;
      totalVlBal += item.vlBalance;
      totalSlBal += item.slBalance;
      totalSilUsed += item.silUsed;
      totalVlUsed += item.vlUsed;
      totalSlUsed += item.slUsed;
      totalUnpaidUsed += item.unpaidUsed;
      totalPending += item.pendingCount;
    });

    const totalAvailableAcrossFirm = totalSilBal + totalVlBal + totalSlBal;
    const totalPaidUsedAcrossFirm = totalSilUsed + totalVlUsed + totalSlUsed;
    const totalAllocatedAcrossFirm = totalAvailableAcrossFirm + totalPaidUsedAcrossFirm;
    const firmUtilizationRate = totalAllocatedAcrossFirm > 0 
      ? Math.round((totalPaidUsedAcrossFirm / totalAllocatedAcrossFirm) * 100) 
      : 0;

    return {
      totalSilBal,
      totalVlBal,
      totalSlBal,
      totalSilUsed,
      totalVlUsed,
      totalSlUsed,
      totalUnpaidUsed,
      totalPending,
      totalAvailableAcrossFirm,
      totalPaidUsedAcrossFirm,
      firmUtilizationRate
    };
  }, [consolidatedEmployeeLeaves]);

  // Pagination for Consolidated View
  const {
    currentPage: consPage,
    pageSize: consPageSize,
    totalItems: totalConsItems,
    paginatedItems: paginatedConsolidated,
    setCurrentPage: setConsPage,
    setPageSize: setConsPageSize,
    loadMore: loadMoreCons,
    hasMoreToLoad: hasMoreCons
  } = usePagination(filteredConsolidated, {
    initialPageSize: 15,
    resetOnChange: filteredConsolidated.length
  });

  // Pagination for History View
  const {
    currentPage: histPage,
    pageSize: histPageSize,
    totalItems: totalHistItems,
    paginatedItems: paginatedHistory,
    setCurrentPage: setHistPage,
    setPageSize: setHistPageSize,
    loadMore: loadMoreHist,
    hasMoreToLoad: hasMoreHist
  } = usePagination(filteredHistory, {
    initialPageSize: 15,
    resetOnChange: filteredHistory.length
  });

  // Submit New Leave Application
  const handleFileLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = isAdmin
      ? employees.find(e => e.id === leaveForm.employeeId)
      : (loggedInEmployee || employees.find(e => e.id === leaveForm.employeeId));
    if (!targetEmp) return;

    addLeaveRecord({
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      totalDays: Number(leaveForm.totalDays),
      reason: leaveForm.reason || 'Personal Leave Request',
      status: isSuperAdmin ? 'Approved' : 'Pending',
      approvedBy: isSuperAdmin ? (currentUser?.fullName || 'Super Administrator') : undefined,
      isPaid: Boolean(leaveForm.isPaid)
    });

    addAuditLog(
      'LEAVE_REQUEST',
      `Filed leave for ${targetEmp.fullName}: ${leaveForm.leaveType} (${leaveForm.totalDays} day/s from ${leaveForm.startDate} to ${leaveForm.endDate}). Status: ${isSuperAdmin ? 'Approved' : 'Pending'}.`,
      currentUser?.id,
      currentUser?.fullName
    );

    setShowFileModal(false);
    setLeaveForm({
      employeeId: loggedInEmployee?.id || employees[0]?.id || '',
      leaveType: 'Vacation Leave',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      totalDays: 1,
      reason: '',
      isPaid: true
    });
  };

  // Submit Leave Balance Adjustments
  const handleSaveAdjustments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingEmployee) return;

    updateEmployee(adjustingEmployee.id, {
      silBalance: Number(adjustSil),
      vlBalance: Number(adjustVl),
      slBalance: Number(adjustSl)
    });

    addAuditLog(
      'LEAVE_CREDIT_ADJUSTMENT',
      `Adjusted leave balances for ${adjustingEmployee.fullName} (${adjustingEmployee.employeeNo}): SIL=${adjustSil}d, VL=${adjustVl}d, SL=${adjustSl}d. Remarks: ${adjustReason}`,
      currentUser?.id,
      currentUser?.fullName
    );

    setAdjustingEmployee(null);
  };

  // Open adjust modal with pre-filled balances
  const openAdjustModal = (emp: CompanyEmployee) => {
    setAdjustingEmployee(emp);
    setAdjustSil(emp.silBalance ?? 5);
    setAdjustVl(emp.vlBalance ?? 12);
    setAdjustSl(emp.slBalance ?? 10);
    setAdjustReason('Annual Balance Adjustment / Grant');
  };

  // Export Consolidated Leaves to Excel (.xlsx)
  const exportConsolidatedLeavesToExcel = () => {
    const exportData = consolidatedEmployeeLeaves.map((item, idx) => ({
      'No.': idx + 1,
      'Employee No': item.employee.employeeNo || `EMP-00${idx + 1}`,
      'Full Legal Name': item.employee.fullName,
      'Department': item.employee.department || 'N/A',
      'Position': item.employee.position || 'Staff',
      'Employment Type': item.employee.employmentType || 'Regular',
      'Status': item.employee.status,
      'SIL Balance (Days)': item.silBalance,
      'SIL Used (Days)': item.silUsed,
      'VL Balance (Days)': item.vlBalance,
      'VL Used (Days)': item.vlUsed,
      'SL Balance (Days)': item.slBalance,
      'SL Used (Days)': item.slUsed,
      'Other Paid Used (Days)': item.emergencyUsed + item.otherPaidUsed,
      'Unpaid Leave Used (Days)': item.unpaidUsed,
      'Total Paid Days Used': item.totalPaidUsed,
      'Total Remaining Leave Credits (Days)': item.totalAvailable,
      'Utilization Rate (%)': `${item.utilizationRate.toFixed(1)}%`,
      'Pending Requests': item.pendingCount
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidated Leaves');

    // Auto fit column widths
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 14)
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `FFCSI_Consolidated_Leave_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER & ACTION BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              DOLE Statutory SIL & Internal Leave Ledger
            </span>
            <span className="text-xs text-slate-500 font-mono">Consolidated Per-Employee Matrix • Fiscal Year {selectedYear}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Consolidated Employee Leave Tracker</h2>
          <p className="text-xs text-slate-500">
            Real-time balance computation, statutory Service Incentive Leave (SIL 5-day mandate), Vacation (VL), Sick (SL), and employee leave ledger history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export to Excel */}
          <button
            type="button"
            onClick={exportConsolidatedLeavesToExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            title="Download full per-employee leave ledger in Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Leave Matrix (.xlsx)</span>
          </button>

          {/* File Leave Request Button */}
          <button
            type="button"
            onClick={() => {
              if (!isAdmin && loggedInEmployee) {
                setLeaveForm(prev => ({ ...prev, employeeId: loggedInEmployee.id }));
              }
              setShowFileModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>File Leave Application</span>
          </button>
        </div>
      </div>

      {/* TOP CONSOLIDATED SUMMARY METRIC STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Total Leave Credits Available */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Credits</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{summaryMetrics.totalAvailableAcrossFirm}</span>
            <span className="text-xs font-semibold text-slate-500">Days Firm-Wide</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>SIL: <strong className="text-blue-700 font-mono">{summaryMetrics.totalSilBal}d</strong></span>
            <span>VL: <strong className="text-purple-700 font-mono">{summaryMetrics.totalVlBal}d</strong></span>
            <span>SL: <strong className="text-emerald-700 font-mono">{summaryMetrics.totalSlBal}d</strong></span>
          </div>
        </div>

        {/* Metric 2: Total Leaves Consumed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Taken</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 font-mono">{summaryMetrics.totalPaidUsedAcrossFirm}</span>
            <span className="text-xs font-semibold text-slate-500">Paid Days Used</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>SIL: <strong className="text-slate-800 font-mono">{summaryMetrics.totalSilUsed}d</strong></span>
            <span>VL: <strong className="text-slate-800 font-mono">{summaryMetrics.totalVlUsed}d</strong></span>
            <span>SL: <strong className="text-slate-800 font-mono">{summaryMetrics.totalSlUsed}d</strong></span>
          </div>
        </div>

        {/* Metric 3: Pending Approvals */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <div className={`p-2 rounded-xl ${summaryMetrics.totalPending > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${summaryMetrics.totalPending > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {summaryMetrics.totalPending}
            </span>
            <span className="text-xs font-semibold text-slate-500">Applications Awaiting</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Requires Partner Review</span>
            {summaryMetrics.totalPending > 0 && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('history');
                  setTypeFilter('All');
                }}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Review Now →
              </button>
            )}
          </div>
        </div>

        {/* Metric 4: Firm Utilization Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firm Utilization</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 font-mono">{summaryMetrics.firmUtilizationRate}%</span>
            <span className="text-xs font-semibold text-slate-500">Credits Consumed</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, summaryMetrics.firmUtilizationRate)}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* VIEW SWITCHER & SEARCH / FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Dual-View Toggle */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('consolidated')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'consolidated'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Consolidated Per-Employee Ledger ({filteredConsolidated.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'history'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>All Leave Applications & Requests ({filteredHistory.length})</span>
              {summaryMetrics.totalPending > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {summaryMetrics.totalPending}
                </span>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={viewMode === 'consolidated' ? "Search by employee name, ID, position, or department..." : "Search leave records by employee, reason, or status..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Badges Strip */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1 uppercase tracking-wider">
            <Filter className="w-3 h-3" /> Quick Filters:
          </span>

          {viewMode === 'consolidated' ? (
            <>
              {/* Department filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="All">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* Status / Category filter chips */}
              {[
                { id: 'All' as const, label: 'All Staff' },
                { id: 'Has Pending' as const, label: 'Has Pending Requests', badge: summaryMetrics.totalPending },
                { id: 'Low Balance' as const, label: 'Low Balance (≤3 days)' },
                { id: 'Active' as const, label: 'Active Employees Only' }
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === chip.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{chip.label}</span>
                  {chip.badge !== undefined && chip.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      statusFilter === chip.id ? 'bg-white text-blue-700' : 'bg-amber-500 text-white'
                    }`}>
                      {chip.badge}
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              {/* Leave Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="All">All Leave Types</option>
                <option value="Service Incentive Leave (SIL)">Service Incentive Leave (SIL)</option>
                <option value="Vacation Leave">Vacation Leave (VL)</option>
                <option value="Sick Leave">Sick Leave (SL)</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Paternity Leave">Paternity Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
              </select>
            </>
          )}

          {(departmentFilter !== 'All' || statusFilter !== 'All' || typeFilter !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setDepartmentFilter('All');
                setStatusFilter('All');
                setTypeFilter('All');
                setSearchQuery('');
              }}
              className="text-rose-600 hover:text-rose-700 font-bold text-xs ml-auto flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

      </div>

      {/* VIEW 1: CONSOLIDATED PER-EMPLOYEE LEAVE LEDGER TABLE */}
      {viewMode === 'consolidated' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Consolidated Employee Leave Matrix
              </span>
              <span className="text-xs text-slate-500 font-mono">({filteredConsolidated.length} Employees)</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> SIL: DOLE 5-Day Standard
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> VL: Vacation
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> SL: Sick Leave
              </span>
            </div>
          </div>

          {filteredConsolidated.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm text-slate-700">No matching employee leave records found</p>
              <p className="text-xs text-slate-400">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="px-4 py-3.5">Employee Information</th>
                    <th className="px-3 py-3.5 text-center">SIL (DOLE 5d)</th>
                    <th className="px-3 py-3.5 text-center">VL (Vacation)</th>
                    <th className="px-3 py-3.5 text-center">SL (Sick Leave)</th>
                    <th className="px-3 py-3.5 text-center">Other / Unpaid</th>
                    <th className="px-4 py-3.5 text-center">Total Remaining</th>
                    <th className="px-4 py-3.5 text-center">Utilization</th>
                    <th className="px-4 py-3.5 text-right">Ledger Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {paginatedConsolidated.map((item) => {
                    const emp = item.employee;
                    return (
                      <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                        
                        {/* Employee Details Column */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                                  {emp.fullName}
                                </span>
                                <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                  {emp.employeeNo || 'EMP'}
                                </span>
                                {item.pendingCount > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    {item.pendingCount} Pending
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{emp.position || 'Staff'}</span>
                                <span>•</span>
                                <span className="text-slate-600 font-medium">{emp.department || 'Tax & Accounting'}</span>
                                <span>•</span>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-1 rounded">
                                  {emp.employmentType || 'Regular'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SIL (DOLE Statutory 5-Day) */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center p-2 rounded-xl bg-blue-50/50 border border-blue-100 min-w-[75px]">
                            <span className="font-mono font-bold text-sm text-blue-700">
                              {item.silBalance} <span className="text-[10px] text-slate-400 font-normal">/ 5d</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {item.silUsed > 0 ? <strong className="text-blue-900">{item.silUsed}d used</strong> : '0 used'}
                            </span>
                          </div>
                        </td>

                        {/* VL (Vacation Leave) */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center p-2 rounded-xl bg-purple-50/50 border border-purple-100 min-w-[75px]">
                            <span className="font-mono font-bold text-sm text-purple-700">
                              {item.vlBalance} <span className="text-[10px] text-slate-400 font-normal">/ 12d</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {item.vlUsed > 0 ? <strong className="text-purple-900">{item.vlUsed}d used</strong> : '0 used'}
                            </span>
                          </div>
                        </td>

                        {/* SL (Sick Leave) */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center p-2 rounded-xl bg-emerald-50/50 border border-emerald-100 min-w-[75px]">
                            <span className="font-mono font-bold text-sm text-emerald-700">
                              {item.slBalance} <span className="text-[10px] text-slate-400 font-normal">/ 10d</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {item.slUsed > 0 ? <strong className="text-emerald-900">{item.slUsed}d used</strong> : '0 used'}
                            </span>
                          </div>
                        </td>

                        {/* Other / Unpaid Leaves */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="space-y-0.5 text-[11px]">
                            <span className="font-mono font-bold text-slate-700 block">
                              {item.emergencyUsed + item.otherPaidUsed + item.unpaidUsed} <span className="text-[10px] text-slate-400 font-normal">day(s)</span>
                            </span>
                            {item.unpaidUsed > 0 ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                {item.unpaidUsed}d Unpaid
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">None</span>
                            )}
                          </div>
                        </td>

                        {/* Total Available Leaves */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="space-y-1">
                            <span className={`inline-block px-3 py-1 rounded-xl font-mono font-extrabold text-sm border shadow-2xs ${
                              item.totalAvailable <= 3 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : item.totalAvailable <= 7
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {item.totalAvailable} <span className="text-[10px] font-medium text-slate-500">days left</span>
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              Total Used: <strong className="text-slate-800 font-mono">{item.totalPaidUsed}d</strong>
                            </span>
                          </div>
                        </td>

                        {/* Utilization Bar */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="w-28 mx-auto space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-500">{item.totalPaidUsed} used</span>
                              <span className="font-mono text-indigo-700">{Math.round(item.utilizationRate)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  item.utilizationRate > 80 ? 'bg-rose-500' :
                                  item.utilizationRate > 50 ? 'bg-amber-500' :
                                  'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, item.utilizationRate)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* View Full Employee Leave Ledger */}
                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeForLedger(emp)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-200 cursor-pointer transition-colors"
                              title="View individual employee leave ledger, history & approvals"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ledger</span>
                            </button>

                            {/* File Leave for this employee */}
                            <button
                              type="button"
                              onClick={() => {
                                setLeaveForm(prev => ({ ...prev, employeeId: emp.id }));
                                setShowFileModal(true);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                              title="File leave application for this employee"
                            >
                              <Plus className="w-3.5 h-3.5 text-blue-600" />
                            </button>

                            {/* Adjust Leave Credits */}
                            <button
                              type="button"
                              onClick={() => openAdjustModal(emp)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                              title="Adjust / Reset leave credits for this employee"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredConsolidated.length > 0 && (
            <TablePagination
              currentPage={consPage}
              totalItems={totalConsItems}
              pageSize={consPageSize}
              onPageChange={setConsPage}
              onPageSizeChange={setConsPageSize}
              onLoadMore={loadMoreCons}
              hasMoreToLoad={hasMoreCons}
              itemLabel="employees"
            />
          )}

        </div>
      )}

      {/* VIEW 2: ALL LEAVE APPLICATIONS HISTORY */}
      {viewMode === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              All Leave Records & Approvals Ledger
            </span>
            <span className="text-xs text-slate-500 font-mono">{filteredHistory.length} Record(s)</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm text-slate-700">No leave applications recorded</p>
              <p className="text-xs text-slate-400">Click 'File Leave Application' to create a new leave entry.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedHistory.map(leave => (
                <div key={leave.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-all text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{leave.employeeName}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-200">
                        {leave.leaveType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        leave.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {leave.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${leave.isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                        {leave.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                      </span>
                    </div>

                    <p className="text-slate-700">
                      Duration: <strong className="font-mono text-slate-900">{leave.startDate}</strong> to <strong className="font-mono text-slate-900">{leave.endDate}</strong> ({leave.totalDays} day/s)
                      {leave.approvedBy && <span className="ml-2 text-slate-400 font-medium">• Approved by: {leave.approvedBy}</span>}
                    </p>
                    
                    {leave.reason && (
                      <p className="text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded border border-slate-100 inline-block">
                        "{leave.reason}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {leave.status === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateLeaveStatus(leave.id, 'Approved', currentUser?.fullName)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLeaveStatus(leave.id, 'Rejected', currentUser?.fullName)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Cancel/Delete this leave record for ${leave.employeeName}? Any deducted leave days will be refunded automatically.`)) {
                          deleteLeaveRecord(leave.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
                      title="Delete & Refund Leave Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredHistory.length > 0 && (
            <TablePagination
              currentPage={histPage}
              totalItems={totalHistItems}
              pageSize={histPageSize}
              onPageChange={setHistPage}
              onPageSizeChange={setHistPageSize}
              onLoadMore={loadMoreHist}
              hasMoreToLoad={hasMoreHist}
              itemLabel="leave records"
            />
          )}

        </div>
      )}

      {/* MODAL 1: FILE LEAVE APPLICATION */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">File Employee Leave Application</h3>
                  <p className="text-xs text-slate-500">Submit leave request with automatic balance deduction</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFileModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFileLeaveSubmit} className="space-y-4 text-xs">
              
              {/* Employee Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">Select Employee *</label>
                  {!isAdmin && (
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      <span>🔒</span> Default (Logged-in User)
                    </span>
                  )}
                </div>

                {isAdmin ? (
                  <select
                    required
                    value={leaveForm.employeeId}
                    onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeNo || 'EMP'}) — {e.position} • Available: {(e.silBalance || 0) + (e.vlBalance || 0) + (e.slBalance || 0)}d
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        {(loggedInEmployee?.fullName || currentUser?.fullName || 'U').charAt(0)}
                      </div>
                      <div>
                        <span className="text-slate-900 font-bold block">{loggedInEmployee?.fullName || currentUser?.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {loggedInEmployee?.employeeNo || currentUser?.username} • {loggedInEmployee?.position || 'Staff Member'} • Credits: {(loggedInEmployee?.silBalance || 0) + (loggedInEmployee?.vlBalance || 0) + (loggedInEmployee?.slBalance || 0)}d
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                      Current User
                    </span>
                  </div>
                )}
                {!isAdmin && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Only administrators are authorized to select and file leave on behalf of other team members.
                  </p>
                )}
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Leave Classification *</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Service Incentive Leave (SIL)">Service Incentive Leave (SIL - DOLE 5 Days)</option>
                  <option value="Vacation Leave">Vacation Leave (VL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave (Without Pay)</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Duration and Paid Status */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Duration (Days)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={leaveForm.totalDays}
                    onChange={(e) => setLeaveForm({ ...leaveForm, totalDays: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-blue-700"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <label className="block text-slate-700 font-bold mb-1">Compensation</label>
                  <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={leaveForm.isPaid}
                      onChange={(e) => setLeaveForm({ ...leaveForm, isPaid: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-bold text-slate-800">{leaveForm.isPaid ? 'With Pay (Paid Leave)' : 'Without Pay (Unpaid)'}</span>
                  </label>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason / Justification</label>
                <textarea
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Specify purpose of leave..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
                >
                  Submit Leave Request
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAILED EMPLOYEE LEAVE LEDGER MODAL */}
      {selectedEmployeeForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                  {selectedEmployeeForLedger.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{selectedEmployeeForLedger.fullName}</h3>
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {selectedEmployeeForLedger.employeeNo || 'EMP'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedEmployeeForLedger.position} • {selectedEmployeeForLedger.department} • Hired: {selectedEmployeeForLedger.dateHired || '2020-01-15'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployeeForLedger(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Cards */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-blue-900 uppercase block">SIL (DOLE Statutory)</span>
                <span className="text-xl font-bold font-mono text-blue-700 block mt-1">
                  {selectedEmployeeForLedger.silBalance ?? 5} <span className="text-xs font-normal text-slate-500">days</span>
                </span>
                <span className="text-[10px] text-blue-600">5-day statutory entitlement</span>
              </div>

              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-center">
                <span className="text-[10px] font-bold text-purple-900 uppercase block">Vacation Leave (VL)</span>
                <span className="text-xl font-bold font-mono text-purple-700 block mt-1">
                  {selectedEmployeeForLedger.vlBalance ?? 12} <span className="text-xs font-normal text-slate-500">days</span>
                </span>
                <span className="text-[10px] text-purple-600">Annual standard leave</span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-900 uppercase block">Sick Leave (SL)</span>
                <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
                  {selectedEmployeeForLedger.slBalance ?? 10} <span className="text-xs font-normal text-slate-500">days</span>
                </span>
                <span className="text-[10px] text-emerald-600">Medical emergency leave</span>
              </div>
            </div>

            {/* History Table for this Employee */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" />
                Employee Historical Applications Ledger
              </h4>

              {(() => {
                const userLeaves = leaveRecords.filter(l => l.employeeId === selectedEmployeeForLedger.id);
                if (userLeaves.length === 0) {
                  return (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      No leave records on file for this employee.
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">Date Range</th>
                          <th className="px-3 py-2.5">Type</th>
                          <th className="px-3 py-2.5">Days</th>
                          <th className="px-3 py-2.5">Paid?</th>
                          <th className="px-3 py-2.5">Reason</th>
                          <th className="px-3 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userLeaves.map(l => (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">
                              {l.startDate} {l.startDate !== l.endDate && `to ${l.endDate}`}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-800">{l.leaveType}</td>
                            <td className="px-3 py-2 font-mono font-bold text-blue-700">{l.totalDays}d</td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${l.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {l.isPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{l.reason || 'N/A'}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                l.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                l.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  openAdjustModal(selectedEmployeeForLedger);
                  setSelectedEmployeeForLedger(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Adjust Balance Credits
              </button>

              <button
                type="button"
                onClick={() => setSelectedEmployeeForLedger(null)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 cursor-pointer"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: ADJUST LEAVE CREDITS */}
      {adjustingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Adjust Leave Credits</h3>
                <p className="text-xs text-slate-500">Update balances for {adjustingEmployee.fullName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustments} className="space-y-4 text-xs">
              
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                <span className="text-slate-500 font-bold block text-[11px]">Employee Reference:</span>
                <p className="font-bold text-slate-900">{adjustingEmployee.fullName} ({adjustingEmployee.employeeNo || 'EMP'})</p>
                <p className="text-[11px] text-slate-600">{adjustingEmployee.position} • {adjustingEmployee.department}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">SIL Balance (Days)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={adjustSil}
                    onChange={(e) => setAdjustSil(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-blue-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">DOLE standard: 5d</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">VL Balance (Days)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={adjustVl}
                    onChange={(e) => setAdjustVl(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-purple-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Firm standard: 12d</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">SL Balance (Days)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={adjustSl}
                    onChange={(e) => setAdjustSl(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Firm standard: 10d</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Adjustment Reason / Audit Remark</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Annual credit reset, DOLE SIL grant, manual correction"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingEmployee(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save Adjustments
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
