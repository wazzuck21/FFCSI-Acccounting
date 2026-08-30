import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CompanyEmployee, ValeRecord, ValeRepayment } from '../types';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import {
  Banknote,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Trash2,
  Download,
  Eye,
  Edit2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
  ShieldCheck,
  History,
  X,
  CreditCard,
  Building,
  UserCheck
} from 'lucide-react';

interface ConsolidatedValeTrackerProps {
  onNavigateToPayroll?: () => void;
}

export const ConsolidatedValeTracker: React.FC<ConsolidatedValeTrackerProps> = ({ onNavigateToPayroll }) => {
  const {
    employees,
    valeRecords,
    addValeRecord,
    addValeRepayment,
    deleteValeRecord,
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

  // Active View: 'consolidated' (Per-Employee Summary) | 'vouchers' (All Individual Loans)
  const [viewMode, setViewMode] = useState<'consolidated' | 'vouchers'>('consolidated');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active Balance' | 'Fully Settled' | 'No History'>('All');
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<string>('All');

  // Modals state
  const [showIssueValeModal, setShowIssueValeModal] = useState(false);
  const [selectedEmployeeForLedger, setSelectedEmployeeForLedger] = useState<CompanyEmployee | null>(null);
  const [repaymentModalEmployee, setRepaymentModalEmployee] = useState<CompanyEmployee | null>(null);
  const [adjustDeductionEmployee, setAdjustDeductionEmployee] = useState<CompanyEmployee | null>(null);
  const [newDeductionAmount, setNewDeductionAmount] = useState<number>(500);

  // Manual Repayment Form State
  const [manualRepaymentAmount, setManualRepaymentAmount] = useState<number>(500);
  const [manualRepaymentRemarks, setManualRepaymentRemarks] = useState<string>('Direct Cash Return / Voluntary Over-The-Counter Repayment');
  const [selectedValeForRepayment, setSelectedValeForRepayment] = useState<string>('');

  // Issue Vale Form State
  const [valeForm, setValeForm] = useState<{
    employeeId: string;
    advanceType: 'Cash Advance' | 'Vale';
    amountGiven: number;
    dateGiven: string;
    purpose: string;
    cutoffDeductionAmount: number;
  }>({
    employeeId: employees[0]?.id || '',
    advanceType: 'Vale',
    amountGiven: 3000,
    dateGiven: new Date().toISOString().split('T')[0],
    purpose: 'Emergency Family & Medical Support',
    cutoffDeductionAmount: 500
  });

  // Distinct Departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts);
  }, [employees]);

  // Consolidated Per-Employee Data Aggregation
  const consolidatedEmployeeVales = useMemo(() => {
    return employees.map(emp => {
      const empVales = valeRecords.filter(v => v.employeeId === emp.id);
      const activeVales = empVales.filter(v => v.status === 'Active');
      const settledVales = empVales.filter(v => v.status === 'Fully Paid');

      // Total principal advanced to date
      const totalPrincipalGranted = empVales.reduce((sum, v) => sum + v.amountGiven, 0);

      // Total principal on active loans
      const activePrincipalGranted = activeVales.reduce((sum, v) => sum + v.amountGiven, 0);

      // Remaining live balance
      const currentOutstandingBalance = activeVales.reduce((sum, v) => sum + v.remainingBalance, 0);

      // Total Repaid (computed from repayments across all records)
      let totalRepaid = 0;
      empVales.forEach(v => {
        if (v.repayments && Array.isArray(v.repayments)) {
          v.repayments.forEach(r => {
            totalRepaid += r.amountPaid;
          });
        } else {
          totalRepaid += (v.amountGiven - v.remainingBalance);
        }
      });

      // Default Cutoff Deduction
      const cutoffDeduction = emp.defaultValeDeduction || (activeVales[0]?.cutoffDeductionAmount) || 500;

      // Estimated Payoff Time (Cutoffs & Months)
      const estimatedCutoffs = cutoffDeduction > 0 && currentOutstandingBalance > 0
        ? Math.ceil(currentOutstandingBalance / cutoffDeduction)
        : 0;

      const estimatedMonths = (estimatedCutoffs / 2).toFixed(1);

      // Repayment Progress Percentage
      const repaymentProgress = totalPrincipalGranted > 0
        ? Math.min(100, Math.round((totalRepaid / totalPrincipalGranted) * 100))
        : (empVales.length > 0 ? 100 : 0);

      // Collect all flat repayments for ledger
      const allRepayments: (ValeRepayment & { valePurpose: string; valeId: string })[] = [];
      empVales.forEach(v => {
        if (v.repayments) {
          v.repayments.forEach(r => {
            allRepayments.push({
              ...r,
              valePurpose: v.purpose,
              valeId: v.id
            });
          });
        }
      });
      allRepayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        employee: emp,
        empVales,
        activeVales,
        settledVales,
        totalPrincipalGranted,
        activePrincipalGranted,
        totalRepaid,
        currentOutstandingBalance,
        cutoffDeduction,
        estimatedCutoffs,
        estimatedMonths,
        repaymentProgress,
        allRepayments,
        activeLoansCount: activeVales.length,
        settledLoansCount: settledVales.length,
        totalLoansCount: empVales.length,
        hasHistory: empVales.length > 0,
        hasActiveBalance: currentOutstandingBalance > 0
      };
    });
  }, [employees, valeRecords]);

  // Filtered Consolidated Employees
  const filteredConsolidated = useMemo(() => {
    return consolidatedEmployeeVales.filter(item => {
      const emp = item.employee;

      // Department Filter
      if (departmentFilter !== 'All' && emp.department !== departmentFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'Active Balance' && !item.hasActiveBalance) return false;
      if (statusFilter === 'Fully Settled' && (item.hasActiveBalance || !item.hasHistory)) return false;
      if (statusFilter === 'No History' && item.hasHistory) return false;

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
  }, [consolidatedEmployeeVales, departmentFilter, statusFilter, searchQuery]);

  // Filtered Individual Vouchers
  const filteredVouchers = useMemo(() => {
    return valeRecords.filter(v => {
      // Advance Type / Status Filter
      if (voucherStatusFilter === 'Cash Advance') {
        const isCashAdvance = v.advanceType === 'Cash Advance' || v.repaymentMode === 'Full Next Cutoff';
        if (!isCashAdvance) return false;
      } else if (voucherStatusFilter === 'Vale') {
        const isCashAdvance = v.advanceType === 'Cash Advance' || v.repaymentMode === 'Full Next Cutoff';
        if (isCashAdvance) return false;
      } else if (voucherStatusFilter !== 'All' && v.status !== voucherStatusFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.employeeName.toLowerCase().includes(q);
        const matchPurpose = (v.purpose || '').toLowerCase().includes(q);
        const matchStatus = v.status.toLowerCase().includes(q);
        const matchType = (v.advanceType || '').toLowerCase().includes(q);
        return matchName || matchPurpose || matchStatus || matchType;
      }

      return true;
    });
  }, [valeRecords, voucherStatusFilter, searchQuery]);

  // Firm-Wide Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalGrantedLifetime = 0;
    let totalRepaidLifetime = 0;
    let totalOutstandingLiability = 0;
    let activeBorrowersCount = 0;
    let upcomingCutoffInflow = 0;

    consolidatedEmployeeVales.forEach(item => {
      totalGrantedLifetime += item.totalPrincipalGranted;
      totalRepaidLifetime += item.totalRepaid;
      totalOutstandingLiability += item.currentOutstandingBalance;
      if (item.hasActiveBalance) {
        activeBorrowersCount++;
        upcomingCutoffInflow += Math.min(item.currentOutstandingBalance, item.cutoffDeduction);
      }
    });

    const firmRepaymentRate = totalGrantedLifetime > 0
      ? Math.round((totalRepaidLifetime / totalGrantedLifetime) * 100)
      : 0;

    return {
      totalGrantedLifetime,
      totalRepaidLifetime,
      totalOutstandingLiability,
      activeBorrowersCount,
      upcomingCutoffInflow,
      firmRepaymentRate
    };
  }, [consolidatedEmployeeVales]);

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

  // Pagination for Vouchers View
  const {
    currentPage: vouchPage,
    pageSize: vouchPageSize,
    totalItems: totalVouchItems,
    paginatedItems: paginatedVouchers,
    setCurrentPage: setVouchPage,
    setPageSize: setVouchPageSize,
    loadMore: loadMoreVouch,
    hasMoreToLoad: hasMoreVouch
  } = usePagination(filteredVouchers, {
    initialPageSize: 15,
    resetOnChange: filteredVouchers.length
  });

  // Handle Issuing a New Vale Loan or Cash Advance
  const handleIssueValeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = isAdmin
      ? employees.find(e => e.id === valeForm.employeeId)
      : (loggedInEmployee || employees.find(e => e.id === valeForm.employeeId));
    if (!targetEmp) return;

    const isCashAdvance = valeForm.advanceType === 'Cash Advance';
    const finalCutoffDeduction = isCashAdvance 
      ? Number(valeForm.amountGiven) 
      : Math.max(50, Number(valeForm.cutoffDeductionAmount));

    addValeRecord({
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      advanceType: valeForm.advanceType,
      repaymentMode: isCashAdvance ? 'Full Next Cutoff' : 'Installment',
      amountGiven: Number(valeForm.amountGiven),
      dateGiven: valeForm.dateGiven,
      purpose: valeForm.purpose || (isCashAdvance ? 'Emergency Cash Advance (Next Cutoff Payoff)' : 'Staff Vale Loan'),
      cutoffDeductionAmount: finalCutoffDeduction,
      remainingBalance: Number(valeForm.amountGiven)
    });

    const auditMessage = isCashAdvance
      ? `Issued Cash Advance to ${targetEmp.fullName} (${targetEmp.employeeNo}): ₱${Number(valeForm.amountGiven).toLocaleString()} (Full deduction scheduled on immediate next cutoff). Purpose: ${valeForm.purpose}`
      : `Issued Vale to ${targetEmp.fullName} (${targetEmp.employeeNo}): ₱${Number(valeForm.amountGiven).toLocaleString()} with monthly/cutoff deduction ₱${finalCutoffDeduction.toLocaleString()}. Purpose: ${valeForm.purpose}`;

    addAuditLog(
      'VALE_ISSUANCE',
      auditMessage,
      currentUser?.id,
      currentUser?.fullName
    );

    setShowIssueValeModal(false);
    setValeForm({
      employeeId: loggedInEmployee?.id || employees[0]?.id || '',
      advanceType: 'Vale',
      amountGiven: 3000,
      dateGiven: new Date().toISOString().split('T')[0],
      purpose: 'Emergency Family & Medical Support',
      cutoffDeductionAmount: 500
    });
  };

  // Open Repayment Modal for a specific employee
  const openRepaymentModal = (emp: CompanyEmployee) => {
    setRepaymentModalEmployee(emp);
    const activeVales = valeRecords.filter(v => v.employeeId === emp.id && v.status === 'Active');
    if (activeVales.length > 0) {
      setSelectedValeForRepayment(activeVales[0].id);
      setManualRepaymentAmount(Math.min(activeVales[0].remainingBalance, activeVales[0].cutoffDeductionAmount || 500));
    } else {
      setSelectedValeForRepayment('');
      setManualRepaymentAmount(500);
    }
    setManualRepaymentRemarks('Direct Cash Return / Over-the-counter settlement');
  };

  // Handle Submitting Manual Repayment
  const handleManualRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValeForRepayment || !manualRepaymentAmount || manualRepaymentAmount <= 0) return;

    addValeRepayment(
      selectedValeForRepayment,
      Number(manualRepaymentAmount),
      manualRepaymentRemarks || 'Direct Over-The-Counter Repayment'
    );

    const targetVale = valeRecords.find(v => v.id === selectedValeForRepayment);
    addAuditLog(
      'VALE_REPAYMENT',
      `Recorded manual cash repayment of ₱${Number(manualRepaymentAmount).toLocaleString()} for ${targetVale?.employeeName || 'Staff'}. Remarks: ${manualRepaymentRemarks}`,
      currentUser?.id,
      currentUser?.fullName
    );

    setRepaymentModalEmployee(null);
  };

  // Open Adjust Deduction Modal
  const openAdjustDeductionModal = (emp: CompanyEmployee) => {
    setAdjustDeductionEmployee(emp);
    setNewDeductionAmount(emp.defaultValeDeduction || 500);
  };

  // Save Adjust Deduction
  const handleSaveDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustDeductionEmployee) return;

    updateEmployee(adjustDeductionEmployee.id, {
      defaultValeDeduction: Number(newDeductionAmount)
    });

    addAuditLog(
      'VALE_DEDUCTION_UPDATE',
      `Updated default cutoff vale deduction for ${adjustDeductionEmployee.fullName} to ₱${Number(newDeductionAmount).toLocaleString()}`,
      currentUser?.id,
      currentUser?.fullName
    );

    setAdjustDeductionEmployee(null);
  };

  // Export Consolidated Vale Report to Excel (.xlsx)
  const exportConsolidatedValeToExcel = () => {
    const exportData = consolidatedEmployeeVales.map((item, idx) => ({
      'No.': idx + 1,
      'Employee No': item.employee.employeeNo || `EMP-00${idx + 1}`,
      'Full Legal Name': item.employee.fullName,
      'Department': item.employee.department || 'N/A',
      'Position': item.employee.position || 'Staff',
      'Total Principal Granted (₱)': item.totalPrincipalGranted,
      'Total Repaid to Date (₱)': item.totalRepaid,
      'Current Outstanding Balance (₱)': item.currentOutstandingBalance,
      'Default Cutoff Installment (₱)': item.cutoffDeduction,
      'Active Loans Count': item.activeLoansCount,
      'Settled Loans Count': item.settledLoansCount,
      'Repayment Rate (%)': `${item.repaymentProgress}%`,
      'Estimated Cutoffs to Payoff': item.hasActiveBalance ? `${item.estimatedCutoffs} cutoff(s)` : 'Settled',
      'Status': item.hasActiveBalance ? 'Active Balance' : (item.hasHistory ? 'Fully Settled' : 'No Advances')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidated Vale');

    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 15)
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `FFCSI_Consolidated_Vale_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER & ACTION BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              Company Staff Vale & Cash Advances Ledger
            </span>
            <span className="text-xs text-slate-500 font-mono">Consolidated Per-Employee Ledger • Live Payroll Deduction Sync</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Consolidated Employee Vale Tracker</h2>
          <p className="text-xs text-slate-500">
            Monitor cumulative loans granted, total repayments collected via payroll cutoff deductions, outstanding principal balances, and payoff timelines per employee.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export to Excel */}
          <button
            type="button"
            onClick={exportConsolidatedValeToExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            title="Download full per-employee cash advance ledger in Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Vale Matrix (.xlsx)</span>
          </button>

          {/* Issue New Vale Button */}
          <button
            type="button"
            onClick={() => {
              if (!isAdmin && loggedInEmployee) {
                setValeForm(prev => ({ ...prev, employeeId: loggedInEmployee.id }));
              }
              setShowIssueValeModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Grant Cash Advance (Vale)</span>
          </button>
        </div>
      </div>

      {/* AUTOMATIC PAYROLL SETTLEMENT LIVE NOTICE */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 p-4 rounded-2xl border border-blue-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm">Automated Payroll Deduction & Settlement Sync</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ⚡ Auto-Updated via Payroll
              </span>
            </div>
            <p className="text-slate-600 mt-0.5 leading-relaxed text-[11px]">
              Cash advance (Vale) repayment balances and payment statuses are <strong>automatically updated whenever a payroll run is approved or generated</strong>. Installments and lump-sum cash advances deduct straight from the employee's cutoff payslip without manual accounting steps.
            </p>
          </div>
        </div>
        {onNavigateToPayroll && (
          <button
            type="button"
            onClick={onNavigateToPayroll}
            className="shrink-0 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <span>View Payroll Runs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* TOP CONSOLIDATED SUMMARY METRIC STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Total Outstanding Vale Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-bold">₱</span>
            <span className="text-2xl font-black text-amber-600 font-mono">
              {summaryMetrics.totalOutstandingLiability.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Active Borrowers: <strong className="text-slate-800">{summaryMetrics.activeBorrowersCount} of {employees.length}</strong></span>
            <span className="text-amber-700 font-bold">Open Receivables</span>
          </div>
        </div>

        {/* Metric 2: Total Repayments Collected */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repaid to Date</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-bold">₱</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {summaryMetrics.totalRepaidLifetime.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Recovery Rate: <strong className="text-emerald-700 font-mono">{summaryMetrics.firmRepaymentRate}%</strong></span>
            <span>Lifetime Collections</span>
          </div>
        </div>

        {/* Metric 3: Upcoming Cutoff Inflow */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Next Cutoff</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-bold">₱</span>
            <span className="text-2xl font-black text-blue-700 font-mono">
              {summaryMetrics.upcomingCutoffInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Auto Payroll Deduction Inflow</span>
            <span className="font-semibold text-blue-600">15th / 30th</span>
          </div>
        </div>

        {/* Metric 4: Total Cumulative Advanced */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Disbursed</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-bold">₱</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {summaryMetrics.totalGrantedLifetime.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Total Advances Granted</span>
            <span className="font-mono font-bold text-slate-700">{valeRecords.length} Vouchers</span>
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
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Consolidated Per-Employee Ledger ({filteredConsolidated.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('vouchers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'vouchers'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>All Vale Vouchers & Loans ({filteredVouchers.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={viewMode === 'consolidated' ? "Search employee name, ID, position, or department..." : "Search vouchers by employee, purpose, or status..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
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
                { id: 'Active Balance' as const, label: 'Has Active Balance', badge: summaryMetrics.activeBorrowersCount },
                { id: 'Fully Settled' as const, label: 'Fully Settled' },
                { id: 'No History' as const, label: 'No Vale History' }
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === chip.id
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{chip.label}</span>
                  {chip.badge !== undefined && chip.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      statusFilter === chip.id ? 'bg-white text-amber-700' : 'bg-amber-500 text-white'
                    }`}>
                      {chip.badge}
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              {/* Voucher Status & Type Filter */}
              <select
                value={voucherStatusFilter}
                onChange={(e) => setVoucherStatusFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="All">All Vouchers</option>
                <option value="Cash Advance">⚡ Cash Advance (Pay Full Next Cutoff)</option>
                <option value="Vale">🔄 Vale (Monthly / Cutoff Deduction)</option>
                <option value="Active">Active (Unsettled)</option>
                <option value="Fully Paid">Fully Paid / Settled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </>
          )}

          {(departmentFilter !== 'All' || statusFilter !== 'All' || voucherStatusFilter !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setDepartmentFilter('All');
                setStatusFilter('All');
                setVoucherStatusFilter('All');
                setSearchQuery('');
              }}
              className="text-rose-600 hover:text-rose-700 font-bold text-xs ml-auto flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

      </div>

      {/* VIEW 1: CONSOLIDATED PER-EMPLOYEE VALE LEDGER TABLE */}
      {viewMode === 'consolidated' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Consolidated Per-Employee Vale Accounts
              </span>
              <span className="text-xs text-slate-500 font-mono">({filteredConsolidated.length} Employees)</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Active Balance
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Fully Settled
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> No Advances
              </span>
            </div>
          </div>

          {filteredConsolidated.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm text-slate-700">No matching employee vale records found</p>
              <p className="text-xs text-slate-400">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="px-4 py-3.5">Employee Information</th>
                    <th className="px-3 py-3.5 text-right">Total Granted</th>
                    <th className="px-3 py-3.5 text-right">Total Repaid</th>
                    <th className="px-4 py-3.5 text-right">Outstanding Balance</th>
                    <th className="px-3 py-3.5 text-center">Cutoff Installment</th>
                    <th className="px-3 py-3.5 text-center">Repayment Progress</th>
                    <th className="px-3 py-3.5 text-center">Estimated Payoff</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {paginatedConsolidated.map((item) => {
                    const emp = item.employee;
                    return (
                      <tr key={emp.id} className="hover:bg-amber-50/30 transition-colors">
                        
                        {/* Employee Details */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 hover:text-amber-600 transition-colors">
                                  {emp.fullName}
                                </span>
                                <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                  {emp.employeeNo || 'EMP'}
                                </span>
                                {item.hasActiveBalance && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    {item.activeLoansCount} Active Loan
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{emp.position || 'Staff'}</span>
                                <span>•</span>
                                <span className="text-slate-600 font-medium">{emp.department || 'General Admin'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Total Principal Granted */}
                        <td className="px-3 py-3.5 text-right">
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            ₱{item.totalPrincipalGranted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.totalLoansCount} loan(s) total
                          </span>
                        </td>

                        {/* Total Repaid */}
                        <td className="px-3 py-3.5 text-right">
                          <span className="font-mono font-bold text-emerald-600 text-xs">
                            ₱{item.totalRepaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.allRepayments.length} payment(s)
                          </span>
                        </td>

                        {/* Outstanding Balance */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="space-y-0.5">
                            <span className={`inline-block px-2.5 py-1 rounded-xl font-mono font-extrabold text-sm border ${
                              item.currentOutstandingBalance > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs'
                                : item.hasHistory
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}>
                              ₱{item.currentOutstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {item.hasActiveBalance && (
                              <span className="text-[10px] text-amber-700 font-semibold block">
                                Open Balance
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cutoff Installment */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="font-mono font-bold text-xs text-blue-700">
                              ₱{item.cutoffDeduction.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500">per cutoff</span>
                          </div>
                        </td>

                        {/* Repayment Progress */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="w-24 mx-auto space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="font-mono text-emerald-700">{item.repaymentProgress}%</span>
                              <span className="text-slate-400">{item.hasActiveBalance ? 'Paying' : 'Clear'}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  item.repaymentProgress === 100 ? 'bg-emerald-500' :
                                  item.repaymentProgress > 50 ? 'bg-blue-500' :
                                  'bg-amber-500'
                                }`}
                                style={{ width: `${item.repaymentProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Estimated Payoff */}
                        <td className="px-3 py-3.5 text-center">
                          {item.hasActiveBalance ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 text-[11px] block">
                                ~{item.estimatedCutoffs} Cutoffs
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({item.estimatedMonths} months)
                              </span>
                            </div>
                          ) : item.hasHistory ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                              Fully Settled
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No Advances</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* View Detailed Ledger */}
                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeForLedger(emp)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-amber-200 cursor-pointer transition-colors"
                              title="View individual employee loan ledger & repayment history"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ledger</span>
                            </button>

                            {/* Record Repayment */}
                            {item.hasActiveBalance && (
                              <button
                                type="button"
                                onClick={() => openRepaymentModal(emp)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                title="Record manual cash repayment"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </button>
                            )}

                            {/* Issue Vale */}
                            <button
                              type="button"
                              onClick={() => {
                                setValeForm(prev => ({ ...prev, employeeId: emp.id }));
                                setShowIssueValeModal(true);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                              title="Grant cash advance to this employee"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-600" />
                            </button>

                            {/* Edit Cutoff Deduction */}
                            <button
                              type="button"
                              onClick={() => openAdjustDeductionModal(emp)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                              title="Update default cutoff deduction"
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

      {/* VIEW 2: ALL INDIVIDUAL VALE VOUCHERS LIST */}
      {viewMode === 'vouchers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              All Cash Advance Vouchers & Loans
            </span>
            <span className="text-xs text-slate-500 font-mono">{filteredVouchers.length} Voucher(s)</span>
          </div>

          {filteredVouchers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm text-slate-700">No cash advance vouchers found</p>
              <p className="text-xs text-slate-400">Click 'Grant Cash Advance (Vale)' to issue a new voucher.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedVouchers.map(vale => (
                <div key={vale.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-all text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{vale.employeeName}</span>
                      
                      {/* Advance Type Badge */}
                      {vale.advanceType === 'Cash Advance' || vale.repaymentMode === 'Full Next Cutoff' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                          <span>⚡</span> Cash Advance • Pay Full Next Cutoff
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <span>🔄</span> Vale • Cutoff Deduction
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        vale.status === 'Active' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        vale.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {vale.status}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        Disbursed: {vale.dateGiven}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-700 text-xs flex-wrap">
                      <span>Original Advance: <strong className="font-mono text-slate-900 font-bold">₱{vale.amountGiven.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Remaining Balance: <strong className="font-mono text-amber-700 font-bold">₱{vale.remainingBalance.toLocaleString()}</strong></span>
                      <span>•</span>
                      {vale.advanceType === 'Cash Advance' || vale.repaymentMode === 'Full Next Cutoff' ? (
                        <span className="text-indigo-700 font-semibold">
                          Repayment: <strong className="font-mono text-indigo-900">₱{vale.remainingBalance.toLocaleString()}</strong> (100% on Next Cutoff)
                        </span>
                      ) : (
                        <span>
                          Installment: <strong className="font-mono text-blue-700">₱{vale.cutoffDeductionAmount.toLocaleString()}</strong>/cutoff
                        </span>
                      )}
                    </div>

                    {vale.purpose && (
                      <p className="text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded border border-slate-100 inline-block">
                        "{vale.purpose}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {vale.status === 'Active' && (
                      <button
                        type="button"
                        onClick={() => {
                          const emp = employees.find(e => e.id === vale.employeeId);
                          if (emp) openRepaymentModal(emp);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete this cash advance voucher for ${vale.employeeName}? Outstanding balances will be reconciled.`)) {
                          deleteValeRecord(vale.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
                      title="Delete Vale Voucher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredVouchers.length > 0 && (
            <TablePagination
              currentPage={vouchPage}
              totalItems={totalVouchItems}
              pageSize={vouchPageSize}
              onPageChange={setVouchPage}
              onPageSizeChange={setVouchPageSize}
              onLoadMore={loadMoreVouch}
              hasMoreToLoad={hasMoreVouch}
              itemLabel="vale vouchers"
            />
          )}

        </div>
      )}

      {/* MODAL 1: GRANT NEW CASH ADVANCE (VALE) */}
      {showIssueValeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Issue Cash Advance (Vale)</h3>
                  <p className="text-xs text-slate-500">Record loan and configure semi-monthly payroll installment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueValeModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueValeSubmit} className="space-y-4 text-xs">
              
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
                    value={valeForm.employeeId}
                    onChange={(e) => setValeForm({ ...valeForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeNo || 'EMP'}) — Current Balance: ₱{(e.currentValeBalance || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        {(loggedInEmployee?.fullName || currentUser?.fullName || 'U').charAt(0)}
                      </div>
                      <div>
                        <span className="text-slate-900 font-bold block">{loggedInEmployee?.fullName || currentUser?.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {loggedInEmployee?.employeeNo || currentUser?.username} • {loggedInEmployee?.position || 'Staff Member'} • Balance: ₱{(loggedInEmployee?.currentValeBalance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                      Current User
                    </span>
                  </div>
                )}
                {!isAdmin && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Only administrators are authorized to select and issue cash advances on behalf of other employees.
                  </p>
                )}
              </div>

              {/* Advance Type Selector ⭐ Cash Advance vs Vale */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Advance Type & Repayment Option *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setValeForm(prev => ({
                        ...prev,
                        advanceType: 'Cash Advance',
                        cutoffDeductionAmount: prev.amountGiven
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      valeForm.advanceType === 'Cash Advance'
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="text-sm">⚡</span>
                      <span>Cash Advance</span>
                    </div>
                    <p className="text-[11px] font-semibold text-indigo-700 mt-1">
                      Will pay full next cut off
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      100% lump-sum deduction on the immediate next payroll
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const emp = employees.find(e => e.id === valeForm.employeeId);
                      const defDed = emp?.defaultValeDeduction || 500;
                      setValeForm(prev => ({
                        ...prev,
                        advanceType: 'Vale',
                        cutoffDeductionAmount: prev.cutoffDeductionAmount === prev.amountGiven ? defDed : prev.cutoffDeductionAmount
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      valeForm.advanceType === 'Vale'
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="text-sm">🔄</span>
                      <span>Vale</span>
                    </div>
                    <p className="text-[11px] font-semibold text-amber-700 mt-1">
                      Will pay monthly Cutoff Deduction
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Recurring installment deductions across payroll cutoffs
                    </p>
                  </button>
                </div>
              </div>

              {/* Amount and Deduction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Principal Amount (₱) *</label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={valeForm.amountGiven}
                    onChange={(e) => {
                      const newAmt = Number(e.target.value);
                      if (valeForm.advanceType === 'Cash Advance') {
                        setValeForm({ ...valeForm, amountGiven: newAmt, cutoffDeductionAmount: newAmt });
                      } else {
                        setValeForm({ ...valeForm, amountGiven: newAmt });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-amber-700"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">
                      {valeForm.advanceType === 'Cash Advance' ? 'Next Cutoff Deduction (₱)' : 'Cutoff Installment (₱)'} *
                    </label>
                    {valeForm.advanceType === 'Cash Advance' && (
                      <span className="text-[10px] text-indigo-700 font-bold">100% Next Cutoff</span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    required
                    disabled={valeForm.advanceType === 'Cash Advance'}
                    value={valeForm.advanceType === 'Cash Advance' ? valeForm.amountGiven : valeForm.cutoffDeductionAmount}
                    onChange={(e) => setValeForm({ ...valeForm, cutoffDeductionAmount: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-xl font-mono font-bold ${
                      valeForm.advanceType === 'Cash Advance'
                        ? 'bg-indigo-50/50 border-indigo-200 text-indigo-800 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-blue-700'
                    }`}
                  />
                </div>
              </div>

              {/* Date and Purpose */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Disbursement Date *</label>
                <input
                  type="date"
                  required
                  value={valeForm.dateGiven}
                  onChange={(e) => setValeForm({ ...valeForm, dateGiven: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Purpose / Remarks *</label>
                <textarea
                  rows={2}
                  required
                  value={valeForm.purpose}
                  onChange={(e) => setValeForm({ ...valeForm, purpose: e.target.value })}
                  placeholder={valeForm.advanceType === 'Cash Advance' ? 'e.g. Immediate bridge cash advance (full payoff next cutoff)...' : 'e.g. Emergency family assistance, medical expense, tuition assistance...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400"
                />
              </div>

              {/* Projected Payoff Info */}
              {valeForm.advanceType === 'Cash Advance' ? (
                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-900">
                    <span className="text-sm">⚡</span>
                    <span className="font-semibold">Next Cutoff Settlement:</span>
                  </div>
                  <span className="font-bold font-mono text-indigo-950">
                    1 Cutoff (₱{Number(valeForm.amountGiven).toLocaleString()} full deduction)
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Estimated Amortization:</span>
                  <span className="font-bold text-amber-900 font-mono">
                    {Math.ceil(valeForm.amountGiven / (valeForm.cutoffDeductionAmount || 500))} Cutoff(s) (~{(Math.ceil(valeForm.amountGiven / (valeForm.cutoffDeductionAmount || 500)) / 2).toFixed(1)} Months) @ ₱{(valeForm.cutoffDeductionAmount || 500).toLocaleString()}/cutoff
                  </span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIssueValeModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
                >
                  Grant Cash Advance
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD MANUAL REPAYMENT */}
      {repaymentModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Record Cash Repayment</h3>
                  <p className="text-xs text-slate-500">Over-the-counter or voluntary advance settlement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRepaymentModalEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualRepaymentSubmit} className="space-y-4 text-xs">
              
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold block text-[11px]">Borrower:</span>
                <p className="font-bold text-slate-900 text-sm">{repaymentModalEmployee.fullName} ({repaymentModalEmployee.employeeNo || 'EMP'})</p>
                <p className="text-amber-700 font-bold font-mono">
                  Live Balance Owed: ₱{(repaymentModalEmployee.currentValeBalance || 0).toLocaleString()}
                </p>
              </div>

              {/* Target Active Loan */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Apply Repayment to Loan *</label>
                <select
                  required
                  value={selectedValeForRepayment}
                  onChange={(e) => setSelectedValeForRepayment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none"
                >
                  {valeRecords
                    .filter(v => v.employeeId === repaymentModalEmployee.id && v.status === 'Active')
                    .map(v => (
                      <option key={v.id} value={v.id}>
                        Disbursed {v.dateGiven} • Balance: ₱{v.remainingBalance.toLocaleString()} ({v.purpose})
                      </option>
                    ))}
                </select>
              </div>

              {/* Repayment Amount */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Repayment Amount (₱) *</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  required
                  value={manualRepaymentAmount}
                  onChange={(e) => setManualRepaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 text-sm"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Receipt / Remarks</label>
                <input
                  type="text"
                  required
                  value={manualRepaymentRemarks}
                  onChange={(e) => setManualRepaymentRemarks(e.target.value)}
                  placeholder="e.g. Cash payment directly to Admin, 13th month advance deduction..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRepaymentModalEmployee(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Record Payment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DETAILED EMPLOYEE VALE LEDGER MODAL */}
      {selectedEmployeeForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white font-black text-lg flex items-center justify-center shadow-md">
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
                    {selectedEmployeeForLedger.position} • {selectedEmployeeForLedger.department}
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

            {/* Current Summary Cards */}
            {(() => {
              const userVales = valeRecords.filter(v => v.employeeId === selectedEmployeeForLedger.id);
              const totalGranted = userVales.reduce((s, v) => s + v.amountGiven, 0);
              const activeBal = userVales.filter(v => v.status === 'Active').reduce((s, v) => s + v.remainingBalance, 0);
              const totalRepaid = totalGranted - activeBal;

              return (
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Granted</span>
                    <span className="text-lg font-bold font-mono text-slate-900 block mt-1">
                      ₱{totalGranted.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">{userVales.length} Total Loans</span>
                  </div>

                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase block">Total Repaid</span>
                    <span className="text-lg font-bold font-mono text-emerald-700 block mt-1">
                      ₱{totalRepaid.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600">Payroll & Manual Payments</span>
                  </div>

                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-center">
                    <span className="text-[10px] font-bold text-amber-900 uppercase block">Outstanding Balance</span>
                    <span className="text-lg font-bold font-mono text-amber-700 block mt-1">
                      ₱{activeBal.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-amber-600">₱{selectedEmployeeForLedger.defaultValeDeduction || 500}/cutoff</span>
                  </div>
                </div>
              );
            })()}

            {/* Individual Loans Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-slate-500" />
                Disbursed Loans & Vouchers
              </h4>

              {(() => {
                const userVales = valeRecords.filter(v => v.employeeId === selectedEmployeeForLedger.id);
                if (userVales.length === 0) {
                  return (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      No cash advance records on file for this employee.
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Date Given</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Purpose</th>
                          <th className="px-3 py-2 text-right">Principal</th>
                          <th className="px-3 py-2 text-right">Remaining</th>
                          <th className="px-3 py-2 text-right">Repayment Terms</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userVales.map(v => {
                          const isCA = v.advanceType === 'Cash Advance' || v.repaymentMode === 'Full Next Cutoff';
                          return (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">{v.dateGiven}</td>
                              <td className="px-3 py-2">
                                {isCA ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-0.5">
                                    ⚡ Cash Adv.
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-0.5">
                                    🔄 Vale
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-700 max-w-[150px] truncate">{v.purpose}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">₱{v.amountGiven.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-amber-700">₱{v.remainingBalance.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold">
                                {isCA ? (
                                  <span className="text-indigo-700 text-[11px]">Full Next Cutoff</span>
                                ) : (
                                  <span className="text-blue-700">₱{v.cutoffDeductionAmount.toLocaleString()}/cutoff</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  v.status === 'Active' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {v.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Repayment History Timeline */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" />
                Consolidated Repayments Log
              </h4>

              {(() => {
                const userVales = valeRecords.filter(v => v.employeeId === selectedEmployeeForLedger.id);
                const repayments: ValeRepayment[] = [];
                userVales.forEach(v => {
                  if (v.repayments) repayments.push(...v.repayments);
                });
                repayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (repayments.length === 0) {
                  return (
                    <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400">
                      No repayments recorded yet.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Payment Date</th>
                          <th className="px-3 py-2">Cutoff / Channel</th>
                          <th className="px-3 py-2">Remarks</th>
                          <th className="px-3 py-2 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {repayments.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">{r.date}</td>
                            <td className="px-3 py-2 text-slate-600">{r.payrollCutoffLabel || 'Direct Payment'}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{r.remarks || 'N/A'}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                              ₱{r.amountPaid.toLocaleString()}
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
              <div className="flex items-center gap-2">
                {selectedEmployeeForLedger.currentValeBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      openRepaymentModal(selectedEmployeeForLedger);
                      setSelectedEmployeeForLedger(null);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Record Payment
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    openAdjustDeductionModal(selectedEmployeeForLedger);
                    setSelectedEmployeeForLedger(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Update Cutoff Deduction
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmployeeForLedger(null)}
                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-500 cursor-pointer"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: ADJUST CUTOFF DEDUCTION */}
      {adjustDeductionEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Adjust Payroll Vale Deduction</h3>
                <p className="text-xs text-slate-500">Update semi-monthly installment for {adjustDeductionEmployee.fullName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustDeductionEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeduction} className="space-y-4 text-xs">
              
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1">
                <span className="text-slate-500 font-bold block text-[11px]">Employee Reference:</span>
                <p className="font-bold text-slate-900">{adjustDeductionEmployee.fullName} ({adjustDeductionEmployee.employeeNo || 'EMP'})</p>
                <p className="text-amber-800 font-bold font-mono">Current Balance: ₱{(adjustDeductionEmployee.currentValeBalance || 0).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">New Default Cutoff Deduction (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={newDeductionAmount}
                  onChange={(e) => setNewDeductionAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-blue-700 text-sm"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Amount deducted automatically during each 15th and 30th payroll run until balance is 0.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustDeductionEmployee(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save Deduction
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
