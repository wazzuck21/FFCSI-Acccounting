import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  CompanyEmployee, 
  LeaveRecord, 
  ValeRecord, 
  LeaveType 
} from '../types';
import { 
  User as UserIcon, 
  Users,
  ShieldCheck, 
  KeyRound, 
  CreditCard, 
  Calendar, 
  Banknote, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  PlusCircle, 
  Phone, 
  Mail, 
  Briefcase, 
  GraduationCap, 
  Copy, 
  Check, 
  X, 
  History, 
  TrendingUp, 
  CheckSquare,
  ChevronRight,
  Shield,
  Layers,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Download,
  FileSpreadsheet,
  LayoutGrid,
  List,
  UserCheck,
  Percent,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Receipt,
  Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UserProfileViewProps {
  onNavigateToTab?: (tab: any) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ onNavigateToTab }) => {
  const { currentUser, changePassword, isSuperAdmin, sessionMinutesRemaining, allUsers } = useAuth();
  const isAdmin = isSuperAdmin || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMINISTRATOR';
  const { 
    employees, 
    leaveRecords, 
    valeRecords, 
    addLeaveRecord, 
    updateLeaveStatus,
    deleteLeaveRecord,
    addValeRecord, 
    addValeRepayment,
    deleteValeRecord,
    addAuditLog 
  } = useData();

  // Top-level Navigation Mode: "My Profile" or "Employee Directory & 360° Roster"
  const [viewMode, setViewMode] = useState<'my-profile' | 'directory'>('my-profile');

  // Currently Selected Employee ID for 360° Profile inspection (defaults to logged-in user)
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Active Profile Section Tab
  const [activeSection, setActiveSection] = useState<'overview' | 'statutory' | 'leaves' | 'vales' | 'security' | 'permissions'>('overview');

  // Directory filter & search
  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const [dirTypeFilter, setDirTypeFilter] = useState<'All' | 'Regular & Prob' | 'OJT / Intern' | 'Temp / Daily Paid'>('All');
  const [dirViewLayout, setDirViewLayout] = useState<'grid' | 'table'>('grid');

  // Leave Records Filter (inside Profile tab)
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('All');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('All');

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [isSubmittingPw, setIsSubmittingPw] = useState(false);

  // Leave Request Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [targetLeaveEmployeeId, setTargetLeaveEmployeeId] = useState<string>('');
  const [leaveForm, setLeaveForm] = useState<{
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    isPaid: boolean;
    reason: string;
  }>({
    leaveType: 'Vacation Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    totalDays: 1,
    isPaid: true,
    reason: ''
  });

  // Vale Request Modal State
  const [showValeModal, setShowValeModal] = useState(false);
  const [targetValeEmployeeId, setTargetValeEmployeeId] = useState<string>('');
  const [valeForm, setValeForm] = useState<{
    amountGiven: number;
    cutoffDeductionAmount: number;
    disbursementDate: string;
    purpose: string;
    advanceType: 'Cash Advance' | 'Vale';
  }>({
    amountGiven: 2000,
    cutoffDeductionAmount: 500,
    disbursementDate: new Date().toISOString().split('T')[0],
    purpose: '',
    advanceType: 'Cash Advance'
  });

  // Vale Manual Repayment Modal State
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedValeForRepayment, setSelectedValeForRepayment] = useState<ValeRecord | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(500);
  const [repaymentRemarks, setRepaymentRemarks] = useState<string>('Over-the-counter cash repayment');
  const [repaymentReceipt, setRepaymentReceipt] = useState<string>('');

  // Copied feedback map
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Find linked CompanyEmployee for current logged-in user
  const loggedInEmployee: CompanyEmployee | undefined = useMemo(() => {
    if (!currentUser) return undefined;
    
    // 1. Match by full name
    const byName = employees.find(
      e => e.fullName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()
    );
    if (byName) return byName;

    // 2. Match by username / employeeNo
    const byNo = employees.find(
      e => e.employeeNo?.toLowerCase() === currentUser.username.toLowerCase()
    );
    if (byNo) return byNo;

    // 3. Fallback: first active employee if super admin
    if (employees.length > 0 && isSuperAdmin) {
      return employees[0];
    }

    return undefined;
  }, [currentUser, employees, isSuperAdmin]);

  // Active Employee to display (either logged in user or specifically selected employee from directory)
  const activeEmployee: CompanyEmployee | undefined = useMemo(() => {
    if (viewMode === 'directory' && selectedEmpId) {
      const found = employees.find(e => e.id === selectedEmpId);
      if (found) return found;
    }
    if (selectedEmpId) {
      const found = employees.find(e => e.id === selectedEmpId);
      if (found) return found;
    }
    return loggedInEmployee;
  }, [viewMode, selectedEmpId, employees, loggedInEmployee]);

  // Filter leave records for active employee
  const activeEmployeeLeaves = useMemo(() => {
    if (!activeEmployee) return [];
    return leaveRecords.filter(l => l.employeeId === activeEmployee.id);
  }, [activeEmployee, leaveRecords]);

  // Filtered leave records based on dropdown selections
  const filteredLeaves = useMemo(() => {
    return activeEmployeeLeaves.filter(l => {
      if (leaveTypeFilter !== 'All' && l.leaveType !== leaveTypeFilter) return false;
      if (leaveStatusFilter !== 'All' && l.status !== leaveStatusFilter) return false;
      return true;
    });
  }, [activeEmployeeLeaves, leaveTypeFilter, leaveStatusFilter]);

  // Filter vale records for active employee
  const activeEmployeeVales = useMemo(() => {
    if (!activeEmployee) return [];
    return valeRecords.filter(v => v.employeeId === activeEmployee.id);
  }, [activeEmployee, valeRecords]);

  // Active (unpaid) Vale records for active employee
  const activeUnpaidVales = useMemo(() => {
    return activeEmployeeVales.filter(v => v.status === 'Active' && v.remainingBalance > 0);
  }, [activeEmployeeVales]);

  // Total Vale metrics for active employee
  const valeStats = useMemo(() => {
    const totalBorrowed = activeEmployeeVales.reduce((sum, v) => sum + v.amountGiven, 0);
    const totalRemaining = activeEmployeeVales.reduce((sum, v) => sum + (v.remainingBalance || 0), 0);
    const totalRepaid = activeEmployeeVales.reduce((sum, v) => {
      const repaymentsSum = (v.repayments || []).reduce((rSum, r) => rSum + r.amountPaid, 0);
      return sum + repaymentsSum;
    }, 0);
    const activeCount = activeUnpaidVales.length;
    const defaultCutoffDeduction = activeEmployee?.defaultValeDeduction || 0;
    const estCutoffsRemaining = defaultCutoffDeduction > 0 && totalRemaining > 0
      ? Math.ceil(totalRemaining / defaultCutoffDeduction)
      : 0;

    return {
      totalBorrowed,
      totalRemaining,
      totalRepaid,
      activeCount,
      defaultCutoffDeduction,
      estCutoffsRemaining,
      repaymentRate: totalBorrowed > 0 ? Math.round((totalRepaid / totalBorrowed) * 100) : 100
    };
  }, [activeEmployeeVales, activeUnpaidVales, activeEmployee]);

  // Global Company Directory Stats
  const directoryStats = useMemo(() => {
    const totalStaff = employees.length;
    const activeStaff = employees.filter(e => e.status === 'Active').length;
    const totalCompanyValeOutstanding = employees.reduce((sum, e) => sum + (e.currentValeBalance || 0), 0);
    const staffWithActiveVales = employees.filter(e => (e.currentValeBalance || 0) > 0).length;
    const pendingLeaveCount = leaveRecords.filter(l => l.status === 'Pending').length;

    return {
      totalStaff,
      activeStaff,
      totalCompanyValeOutstanding,
      staffWithActiveVales,
      pendingLeaveCount
    };
  }, [employees, leaveRecords]);

  // Filtered employees for directory search
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Type filter
      if (dirTypeFilter === 'Regular & Prob') {
        if (emp.employmentType !== 'Regular' && emp.employmentType !== 'Probationary') return false;
      } else if (dirTypeFilter === 'OJT / Intern') {
        if (emp.employmentType !== 'OJT / Intern') return false;
      } else if (dirTypeFilter === 'Temp / Daily Paid') {
        if (emp.employmentType !== 'Temp / Daily Paid') return false;
      }

      // Query filter
      if (dirSearchQuery.trim()) {
        const q = dirSearchQuery.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchNo = emp.employeeNo?.toLowerCase().includes(q);
        const matchPos = emp.position?.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        const matchSchool = emp.schoolOrUniversity?.toLowerCase().includes(q);
        if (!matchName && !matchNo && !matchPos && !matchDept && !matchSchool) return false;
      }

      return true;
    });
  }, [employees, dirTypeFilter, dirSearchQuery]);

  // Password change submission
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });

    if (!currentUser) return;

    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({
        type: 'error',
        message: 'New password must be at least 6 characters long.'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: 'error',
        message: 'New password and confirmation password do not match.'
      });
      return;
    }

    setIsSubmittingPw(true);
    try {
      const res = await changePassword(currentUser.id, currentPassword, newPassword);
      if (res.success) {
        setPasswordStatus({
          type: 'success',
          message: res.message || 'Password successfully updated! Synced with User Management & RBAC.'
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        addAuditLog(
          'PASSWORD_UPDATE',
          `User ${currentUser.fullName} (@${currentUser.username}) successfully updated account credentials. Synced with RBAC.`,
          currentUser.id,
          currentUser.fullName
        );
      } else {
        setPasswordStatus({
          type: 'error',
          message: res.message || 'Failed to update password. Please check your current password.'
        });
      }
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        message: err?.message || 'An unexpected error occurred while updating password.'
      });
    } finally {
      setIsSubmittingPw(false);
    }
  };

  // Open Leave Modal for specific employee
  const handleOpenLeaveModal = (emp?: CompanyEmployee) => {
    // If not admin, only the logged-in user can be targeted
    const target = isAdmin ? (emp || activeEmployee || loggedInEmployee) : loggedInEmployee;
    if (target) {
      setTargetLeaveEmployeeId(target.id);
      setShowLeaveModal(true);
    }
  };

  // Submit Leave Request
  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    // If not admin, strictly force target to logged-in user
    const target = isAdmin 
      ? (employees.find(emp => emp.id === targetLeaveEmployeeId) || activeEmployee || loggedInEmployee)
      : loggedInEmployee;
    if (!target || !currentUser) return;

    const autoApprove = isSuperAdmin;
    addLeaveRecord({
      employeeId: target.id,
      employeeName: target.fullName,
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      totalDays: Number(leaveForm.totalDays),
      isPaid: Boolean(leaveForm.isPaid),
      reason: leaveForm.reason,
      status: autoApprove ? 'Approved' : 'Pending',
      approvedBy: autoApprove ? currentUser.fullName : undefined
    });

    addAuditLog(
      'LEAVE_REQUEST',
      `Leave request filed for ${target.fullName}: ${leaveForm.leaveType} (${leaveForm.totalDays} day(s), from ${leaveForm.startDate} to ${leaveForm.endDate}). Status: ${autoApprove ? 'Approved' : 'Pending'} (Synced with Payroll).`,
      currentUser.id,
      currentUser.fullName
    );

    setShowLeaveModal(false);
    setLeaveForm({
      leaveType: 'Vacation Leave',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      totalDays: 1,
      isPaid: true,
      reason: ''
    });
  };

  // Open Vale Modal for specific employee
  const handleOpenValeModal = (emp?: CompanyEmployee) => {
    // If not admin, only the logged-in user can be targeted
    const target = isAdmin ? (emp || activeEmployee || loggedInEmployee) : loggedInEmployee;
    if (target) {
      setTargetValeEmployeeId(target.id);
      setShowValeModal(true);
    }
  };

  // Submit Vale Request
  const handleSaveVale = (e: React.FormEvent) => {
    e.preventDefault();
    // If not admin, strictly force target to logged-in user
    const target = isAdmin
      ? (employees.find(emp => emp.id === targetValeEmployeeId) || activeEmployee || loggedInEmployee)
      : loggedInEmployee;
    if (!target || !currentUser) return;

    const isCA = valeForm.advanceType === 'Cash Advance';
    const effectiveDeduction = isCA ? Number(valeForm.amountGiven) : Number(valeForm.cutoffDeductionAmount);

    addValeRecord({
      employeeId: target.id,
      employeeName: target.fullName,
      amountGiven: Number(valeForm.amountGiven),
      cutoffDeductionAmount: effectiveDeduction,
      disbursementDate: valeForm.disbursementDate,
      purpose: valeForm.purpose,
      approvedBy: isSuperAdmin ? currentUser.fullName : (isAdmin ? 'Admin Approved' : 'Pending Approval'),
      advanceType: valeForm.advanceType,
      repaymentMode: isCA ? 'Full Next Cutoff' : 'Installment'
    });

    addAuditLog(
      'VALE_REQUEST',
      `${isCA ? '⚡ Cash Advance (Full Next Cutoff)' : '🔄 Vale (Installment)'} issued for ${target.fullName}: ₱${Number(valeForm.amountGiven).toLocaleString()} with ${isCA ? '100% deduction on next cutoff' : `₱${Number(valeForm.cutoffDeductionAmount).toLocaleString()}/cutoff deduction`}. Purpose: ${valeForm.purpose} (Synced with Payroll).`,
      currentUser.id,
      currentUser.fullName
    );

    setShowValeModal(false);
    setValeForm({
      amountGiven: 2000,
      cutoffDeductionAmount: 500,
      disbursementDate: new Date().toISOString().split('T')[0],
      purpose: '',
      advanceType: 'Cash Advance'
    });
  };

  // Handle Manual Repayment submission
  const handleSaveRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValeForRepayment || !currentUser) return;

    addValeRepayment(
      selectedValeForRepayment.id,
      Number(repaymentAmount),
      repaymentRemarks || `Manual Repayment (Ref: ${repaymentReceipt || 'N/A'})`,
      'Manual Payment'
    );

    addAuditLog(
      'VALE_REPAYMENT',
      `Manual cash advance repayment of ₱${Number(repaymentAmount).toLocaleString()} recorded for ${selectedValeForRepayment.employeeName}. Remarks: ${repaymentRemarks}`,
      currentUser.id,
      currentUser.fullName
    );

    setShowRepaymentModal(false);
    setSelectedValeForRepayment(null);
    setRepaymentAmount(500);
    setRepaymentRemarks('Over-the-counter cash repayment');
    setRepaymentReceipt('');
  };

  // Export Leave History to Excel
  const handleExportLeaveHistory = () => {
    if (!activeEmployee) return;

    const data = activeEmployeeLeaves.map(l => ({
      'Employee ID': activeEmployee.employeeNo || 'N/A',
      'Employee Name': activeEmployee.fullName,
      'Leave Type': l.leaveType,
      'Start Date': l.startDate,
      'End Date': l.endDate,
      'Total Days': l.totalDays,
      'Compensation': l.isPaid ? 'Paid Leave' : 'Unpaid Leave',
      'Status': l.status,
      'Approved By': l.approvedBy || 'N/A',
      'Reason': l.reason,
      'Filed Date': l.createdAt
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave History');
    XLSX.writeFile(wb, `Leave_History_${activeEmployee.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Vale History to Excel
  const handleExportValeHistory = () => {
    if (!activeEmployee) return;

    const data = activeEmployeeVales.flatMap(v => {
      if (!v.repayments || v.repayments.length === 0) {
        return [{
          'Voucher ID': v.id,
          'Employee Name': v.employeeName,
          'Disbursement Date': v.disbursementDate,
          'Amount Borrowed (PHP)': v.amountGiven,
          'Cutoff Deduction (PHP)': v.cutoffDeductionAmount,
          'Remaining Balance (PHP)': v.remainingBalance,
          'Loan Status': v.status,
          'Purpose': v.purpose,
          'Repayment Date': 'No repayments yet',
          'Repayment Amount (PHP)': 0,
          'Repayment Source': 'N/A'
        }];
      }

      return v.repayments.map(r => ({
        'Voucher ID': v.id,
        'Employee Name': v.employeeName,
        'Disbursement Date': v.disbursementDate,
        'Amount Borrowed (PHP)': v.amountGiven,
        'Cutoff Deduction (PHP)': v.cutoffDeductionAmount,
        'Remaining Balance (PHP)': v.remainingBalance,
        'Loan Status': v.status,
        'Purpose': v.purpose,
        'Repayment Date': r.date,
        'Repayment Amount (PHP)': r.amountPaid,
        'Repayment Source': r.payrollCutoffLabel || r.remarks
      }));
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vale Ledger');
    XLSX.writeFile(wb, `Vale_Ledger_${activeEmployee.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!currentUser) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-slate-500">Please sign in to view your profile and employee directory.</p>
      </div>
    );
  }

  // Password strength calculation
  const pwStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 25;
    if (newPassword.length >= 10) score += 25;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 25;
    if (/[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) score += 25;
    return score;
  }, [newPassword]);

  const totalLeavesAvailable = (activeEmployee?.silBalance || 0) + (activeEmployee?.vlBalance || 0) + (activeEmployee?.slBalance || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* ========================================================================= */}
      {/* TOP BAR: VIEW SWITCHER & SYNC STATUS WITH COMPANY PAYROLL & HR MANAGEMENT */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {viewMode === 'my-profile' ? 'My Profile & Employee Workspace' : 'Company Employee Directory & 360° Roster'}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Synced with Payroll
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant bidirectional synchronization with <strong>Company Staff Payroll & HR Management</strong> for SIL/VL/SL leave credits and Vale cash advances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('my-profile');
                setSelectedEmpId(loggedInEmployee?.id || null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'my-profile'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('directory')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'directory'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Employee Directory ({employees.length})</span>
            </button>
          </div>

          {/* Direct Navigation to Company Staff Payroll & HR */}
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('payroll')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open full Company Staff Payroll & HR Management view"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Open</span> Payroll & HR
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: EMPLOYEE DIRECTORY ROSTER LIST & SEARCH                           */}
      {/* ========================================================================= */}
      {viewMode === 'directory' && (
        <div className="space-y-6">
          {/* Summary Strip for Directory */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-slate-400 font-bold text-[11px] uppercase">Total Active Staff</span>
              <p className="text-2xl font-bold font-mono text-slate-900">
                {directoryStats.activeStaff} <span className="text-xs font-normal text-slate-500">/ {directoryStats.totalStaff} staff</span>
              </p>
              <p className="text-[10px] text-slate-500">Internal accounting firm roster</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-slate-400 font-bold text-[11px] uppercase">Staff With Active Vales</span>
              <p className="text-2xl font-bold font-mono text-amber-700">
                {directoryStats.staffWithActiveVales} <span className="text-xs font-normal text-slate-500">accounts</span>
              </p>
              <p className="text-[10px] text-amber-600">Total: ₱{directoryStats.totalCompanyValeOutstanding.toLocaleString()}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-slate-400 font-bold text-[11px] uppercase">Pending Leave Requests</span>
              <p className="text-2xl font-bold font-mono text-blue-700">
                {directoryStats.pendingLeaveCount} <span className="text-xs font-normal text-slate-500">requests</span>
              </p>
              <p className="text-[10px] text-blue-600">Awaiting management approval</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-slate-400 font-bold text-[11px] uppercase">Total Leave Records</span>
              <p className="text-2xl font-bold font-mono text-purple-700">
                {leaveRecords.length} <span className="text-xs font-normal text-slate-500">filed to date</span>
              </p>
              <p className="text-[10px] text-purple-600">SIL, VL, SL & Statutory</p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {(['All', 'Regular & Prob', 'OJT / Intern', 'Temp / Daily Paid'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDirTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    dirTypeFilter === type
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'All' ? `All Staff (${employees.length})` : type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff name, position, school..."
                  value={dirSearchQuery}
                  onChange={e => setDirSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
                {dirSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDirSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* View Layout Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setDirViewLayout('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    dirViewLayout === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Grid Layout"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDirViewLayout('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    dirViewLayout === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table Layout"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Directory Content: Grid or Table */}
          {dirViewLayout === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map(emp => {
                const isOJT = emp.employmentType === 'OJT / Intern';
                const isTemp = emp.employmentType === 'Temp / Daily Paid';
                const empLeaves = leaveRecords.filter(l => l.employeeId === emp.id);
                const empVales = valeRecords.filter(v => v.employeeId === emp.id);
                const activeVales = empVales.filter(v => v.status === 'Active' && v.remainingBalance > 0);
                const totalValeBal = emp.currentValeBalance || 0;

                return (
                  <div 
                    key={emp.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-md transition-all ${
                      emp.id === loggedInEmployee?.id ? 'ring-2 ring-blue-500/50 border-blue-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-xs">
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {emp.employeeNo}
                            </span>
                            {emp.id === loggedInEmployee?.id && (
                              <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-0.5">{emp.fullName}</h4>
                          <p className="text-[11px] text-slate-500">{emp.position} • <span className="text-slate-700">{emp.department}</span></p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {emp.status}
                      </span>
                    </div>

                    {/* Synchronized Leave & Vale Badges Strip ⭐ */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Leave Balances */}
                      <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-blue-900 font-bold">Leave Credits:</span>
                          <span className="font-bold text-blue-700 font-mono">{(emp.silBalance || 0) + (emp.vlBalance || 0) + (emp.slBalance || 0)}d</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center text-[9px] font-mono text-slate-600 font-medium">
                          <span title="Service Incentive Leave">SIL:{emp.silBalance}</span>
                          <span title="Vacation Leave">VL:{emp.vlBalance}</span>
                          <span title="Sick Leave">SL:{emp.slBalance}</span>
                        </div>
                      </div>

                      {/* Vale Balance */}
                      <div className={`p-2.5 rounded-xl border space-y-1 ${
                        totalValeBal > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className={totalValeBal > 0 ? 'text-amber-900 font-bold' : 'text-slate-500 font-bold'}>
                            Vale Balance:
                          </span>
                          <span className={`font-bold font-mono ${totalValeBal > 0 ? 'text-amber-900' : 'text-slate-600'}`}>
                            ₱{totalValeBal.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 flex justify-between">
                          <span>Cutoff Ded:</span>
                          <span className="font-mono font-bold text-slate-700">₱{(emp.defaultValeDeduction || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons on Card */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmpId(emp.id);
                          setViewMode('my-profile');
                          setActiveSection('overview');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>View 360° Profile</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenLeaveModal(emp)}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 cursor-pointer"
                          title="File Leave for this Employee"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenValeModal(emp)}
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border border-slate-200 cursor-pointer"
                          title="Issue Vale Cash Advance"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-center">Leave Credits (SIL/VL/SL)</th>
                      <th className="px-4 py-3 text-right">Vale Balance</th>
                      <th className="px-4 py-3 text-right">Cutoff Ded.</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div>
                              <strong className="text-slate-900 block">{emp.fullName}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">{emp.employeeNo} • {emp.position}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{emp.department}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {emp.employmentType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          <span className="text-blue-700">{emp.silBalance} SIL</span> • <span className="text-purple-700">{emp.vlBalance} VL</span> • <span className="text-emerald-700">{emp.slBalance} SL</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {(emp.currentValeBalance || 0) > 0 ? (
                            <span className="text-amber-800">₱{(emp.currentValeBalance || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">₱0.00</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          ₱{(emp.defaultValeDeduction || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmpId(emp.id);
                              setViewMode('my-profile');
                              setActiveSection('overview');
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> 360° Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: EMPLOYEE 360° PROFILE VIEW (PERSONAL OR SELECTED EMPLOYEE)        */}
      {/* ========================================================================= */}
      {viewMode === 'my-profile' && activeEmployee && (
        <div className="space-y-6">
          
          {/* PROFILE TOP BANNER CARD */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            {/* Ambient background decoration */}
            <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-extrabold text-2xl sm:text-3xl text-white shadow-lg border-2 border-white/20">
                  {activeEmployee.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{activeEmployee.fullName}</h1>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                      {isSuperAdmin && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                      {activeEmployee.id === loggedInEmployee?.id ? currentUser.role.replace('_', ' ') : 'Staff Record'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {activeEmployee.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-slate-300 flex-wrap">
                    <span className="font-mono text-indigo-300 font-semibold">{activeEmployee.employeeNo || 'EMP-001'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {activeEmployee.position}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {activeEmployee.department}
                    </span>
                    <span>•</span>
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white font-bold">
                      {activeEmployee.employmentType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons on Profile Header */}
              <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-start md:justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenLeaveModal(activeEmployee)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>File Leave Request</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenValeModal(activeEmployee)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Request Vale</span>
                </button>

                {activeEmployee.id === loggedInEmployee?.id && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('security')}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-blue-300" />
                    <span>Security</span>
                  </button>
                )}
              </div>
            </div>

            {/* Real-Time Quick Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
              <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[11px]">Available Leave Credits</span>
                <span className="text-lg font-bold text-emerald-300 font-mono mt-0.5 block">
                  {totalLeavesAvailable} <span className="text-xs font-normal text-slate-300">Days</span>
                </span>
                <span className="text-[10px] text-slate-400">SIL: {activeEmployee.silBalance || 0}d • VL: {activeEmployee.vlBalance || 0}d • SL: {activeEmployee.slBalance || 0}d</span>
              </div>

              <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[11px]">Current Vale Balance</span>
                <span className="text-lg font-bold text-amber-300 font-mono mt-0.5 block">
                  ₱{(activeEmployee.currentValeBalance || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">Cutoff: ₱{(activeEmployee.defaultValeDeduction || 0).toLocaleString()}</span>
              </div>

              <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[11px]">Basic Pay / Daily Wage</span>
                <span className="text-lg font-bold text-blue-200 mt-0.5 block font-mono">
                  {activeEmployee.isNoWorkNoPay 
                    ? `₱${activeEmployee.dailyRate.toFixed(2)}/day`
                    : `₱${activeEmployee.monthlyBasicSalary.toLocaleString()}/mo`}
                </span>
                <span className="text-[10px] text-slate-400">Hired: {activeEmployee.dateHired || '2020-01-15'}</span>
              </div>

              <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[11px]">Sync Status</span>
                <span className="text-sm font-bold text-emerald-300 mt-1 block flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Synced with Payroll
                </span>
                <span className="text-[10px] text-slate-400">Live ledger & cutoff deductions</span>
              </div>
            </div>
          </div>

          {/* NAVIGATION SECTION TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
            {[
              { id: 'overview' as const, label: 'Employee Overview', icon: UserIcon },
              { id: 'statutory' as const, label: 'TIN, SSS, PHIC & Pag-IBIG', icon: ShieldCheck, badge: 'Gov IDs' },
              { id: 'leaves' as const, label: 'Leave Credits & History', icon: Calendar, count: activeEmployeeLeaves.length },
              { id: 'vales' as const, label: 'Vale (Cash Advance) Tracker', icon: Banknote, count: activeEmployeeVales.length },
              ...(activeEmployee.id === loggedInEmployee?.id ? [
                { id: 'security' as const, label: 'Security & Password', icon: Lock, highlight: true },
                { id: 'permissions' as const, label: 'RBAC Access Rights', icon: Layers }
              ] : [])
            ].map((tab) => {
              const isActive = activeSection === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-200'
                      : (tab as any).highlight
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : (tab as any).highlight ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {(tab as any).badge && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {(tab as any).badge}
                    </span>
                  )}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: OVERVIEW                                                       */}
          {/* ========================================================================= */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Personal & Employment Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      Internal Employee Record Details
                    </h3>
                    <span className="text-xs text-slate-500">
                      Matched: <strong className="text-emerald-700 font-mono">{activeEmployee.employeeNo}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-medium block">Full Legal Name</span>
                      <span className="text-sm font-bold text-slate-900 block">{activeEmployee.fullName}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-medium block">Employee Code / ID</span>
                      <span className="text-sm font-bold text-indigo-700 font-mono block">{activeEmployee.employeeNo}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-medium block">Position / Designation</span>
                      <span className="text-sm font-bold text-slate-900 block">{activeEmployee.position}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-medium block">Department / Practice Unit</span>
                      <span className="text-sm font-bold text-slate-900 block">{activeEmployee.department}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-medium block">Employment Classification</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-slate-900">{activeEmployee.employmentType}</span>
                        {activeEmployee.isNoWorkNoPay && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                            Daily No Work, No Pay
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-medium block">Date Hired / Joined Firm</span>
                      <span className="text-sm font-bold text-slate-900 font-mono block">{activeEmployee.dateHired || '2020-01-15'}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-medium block">Monthly Basic / Daily Wage</span>
                      <span className="text-sm font-bold text-slate-900 font-mono block">
                        {activeEmployee.isNoWorkNoPay 
                          ? `₱${activeEmployee.dailyRate.toFixed(2)}/day` 
                          : `₱${activeEmployee.monthlyBasicSalary.toLocaleString()}/month`}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-medium block">Disbursal Bank & Account</span>
                      <span className="text-sm font-bold text-slate-900 font-mono block">
                        {activeEmployee.bankName || 'BDO Unibank'} • {activeEmployee.accountNumber || '0012-3456-7890'}
                      </span>
                    </div>
                  </div>

                  {/* OJT details banner if OJT */}
                  {activeEmployee.employmentType === 'OJT / Intern' && (
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-2">
                      <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                        <GraduationCap className="w-4 h-4 text-purple-700" />
                        <span>Academic Internship & DOLE Trainee Practicum</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-purple-200 text-purple-950">
                        <div>
                          <span className="text-purple-600 block">Institution:</span>
                          <strong>{activeEmployee.schoolOrUniversity || 'Accredited Partner'}</strong>
                        </div>
                        <div>
                          <span className="text-purple-600 block">Required Hours:</span>
                          <strong>{activeEmployee.internshipRequiredHours || 400} Hours</strong>
                        </div>
                        <div>
                          <span className="text-purple-600 block">Supervising Mentor:</span>
                          <strong>{activeEmployee.supervisorMentor || 'Managing Partner'}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Government IDs Preview Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Government Statutory Identification Summary
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection('statutory')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <span className="text-slate-500 font-bold text-[10px] uppercase">BIR TIN</span>
                      <p className="font-mono font-bold text-slate-900 text-xs">{activeEmployee.tinNumber || '123-456-789-000'}</p>
                    </div>
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <span className="text-slate-500 font-bold text-[10px] uppercase">SSS Number</span>
                      <p className="font-mono font-bold text-slate-900 text-xs">{activeEmployee.sssNumber || '34-1234567-8'}</p>
                    </div>
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <span className="text-slate-500 font-bold text-[10px] uppercase">PhilHealth</span>
                      <p className="font-mono font-bold text-slate-900 text-xs">{activeEmployee.philhealthNumber || '12-098765432-1'}</p>
                    </div>
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <span className="text-slate-500 font-bold text-[10px] uppercase">Pag-IBIG</span>
                      <p className="font-mono font-bold text-slate-900 text-xs">{activeEmployee.pagibigNumber || '1210-9876-5432'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Leave & Vale Quick Actions */}
              <div className="space-y-6">
                {/* Leave Balance Overview */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Leave Balances
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleOpenLeaveModal(activeEmployee)}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> File Leave
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <strong className="text-slate-800 block">Service Incentive (SIL)</strong>
                        <span className="text-[10px] text-slate-500">DOLE Mandatory 5 Days</span>
                      </div>
                      <span className="text-base font-bold font-mono text-blue-700">{activeEmployee.silBalance ?? 5} <span className="text-[10px] text-slate-500 font-normal">days</span></span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <strong className="text-slate-800 block">Vacation Leave (VL)</strong>
                        <span className="text-[10px] text-slate-500">Annual standard leave</span>
                      </div>
                      <span className="text-base font-bold font-mono text-purple-700">{activeEmployee.vlBalance ?? 12} <span className="text-[10px] text-slate-500 font-normal">days</span></span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <strong className="text-slate-800 block">Sick Leave (SL)</strong>
                        <span className="text-[10px] text-slate-500">Medical emergencies</span>
                      </div>
                      <span className="text-base font-bold font-mono text-emerald-700">{activeEmployee.slBalance ?? 10} <span className="text-[10px] text-slate-500 font-normal">days</span></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection('leaves')}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Leave History & Ledger</span>
                  </button>
                </div>

                {/* Vale Summary */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-amber-600" />
                      Vale / Cash Advance
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleOpenValeModal(activeEmployee)}
                      className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Request Vale
                    </button>
                  </div>

                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-900 font-medium">Outstanding Balance:</span>
                      <strong className="text-base font-bold text-amber-900 font-mono">
                        ₱{(activeEmployee.currentValeBalance || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-amber-800 pt-1 border-t border-amber-200/60">
                      <span>Per Cutoff Deduction:</span>
                      <strong className="font-mono">₱{(activeEmployee.defaultValeDeduction || 0).toLocaleString()}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection('vales')}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Vale History & Repayments</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: STATUTORY IDS                                                  */}
          {/* ========================================================================= */}
          {activeSection === 'statutory' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    Government Statutory Identifiers & Remittance Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Official Philippine government agency registration numbers for BIR tax filings and statutory benefits remittances.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BIR TIN */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-xs">BIR</div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">Bureau of Internal Revenue (TIN)</h4>
                        <span className="text-[10px] text-slate-500">Taxpayer Identification Number</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeEmployee.tinNumber || '123-456-789-000', 'tin')}
                      className="p-1.5 hover:bg-white text-slate-500 hover:text-slate-900 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                      title="Copy TIN"
                    >
                      {copiedKey === 'tin' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-sm text-blue-700 flex justify-between items-center">
                    <span>{activeEmployee.tinNumber || '123-456-789-000'}</span>
                    <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Registered</span>
                  </div>
                </div>

                {/* SSS */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-xs">SSS</div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">Social Security System</h4>
                        <span className="text-[10px] text-slate-500">SS Identification & Monthly Contribution</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeEmployee.sssNumber || '34-1234567-8', 'sss')}
                      className="p-1.5 hover:bg-white text-slate-500 hover:text-slate-900 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                      title="Copy SSS"
                    >
                      {copiedKey === 'sss' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-900 flex justify-between items-center">
                    <span>{activeEmployee.sssNumber || '34-1234567-8'}</span>
                    <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active</span>
                  </div>
                </div>

                {/* PhilHealth (PHIC) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs">PHIC</div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">PhilHealth (PHIC) Number</h4>
                        <span className="text-[10px] text-slate-500">Philippine Health Insurance Corp</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeEmployee.philhealthNumber || '12-098765432-1', 'phic')}
                      className="p-1.5 hover:bg-white text-slate-500 hover:text-slate-900 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                      title="Copy PhilHealth"
                    >
                      {copiedKey === 'phic' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-sm text-emerald-800 flex justify-between items-center">
                    <span>{activeEmployee.philhealthNumber || '12-098765432-1'}</span>
                    <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Covered</span>
                  </div>
                </div>

                {/* Pag-IBIG (HDMF) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 text-purple-700 rounded-xl font-bold text-xs">HDMF</div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">Pag-IBIG Fund (HDMF MID)</h4>
                        <span className="text-[10px] text-slate-500">Home Development Mutual Fund</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeEmployee.pagibigNumber || '1210-9876-5432', 'hdmf')}
                      className="p-1.5 hover:bg-white text-slate-500 hover:text-slate-900 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                      title="Copy Pag-IBIG"
                    >
                      {copiedKey === 'hdmf' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-sm text-purple-800 flex justify-between items-center">
                    <span>{activeEmployee.pagibigNumber || '1210-9876-5432'}</span>
                    <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active MID</span>
                  </div>
                </div>
              </div>

              {/* Disbursal Bank Card */}
              <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-3">
                <h4 className="font-bold text-xs text-blue-950 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Payroll Payout & Banking Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-blue-100">
                    <span className="text-slate-400 block text-[11px]">Assigned Bank / e-Wallet</span>
                    <strong className="text-slate-900 font-mono text-sm block mt-0.5">{activeEmployee.bankName || 'BDO Unibank'}</strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100">
                    <span className="text-slate-400 block text-[11px]">Account Number</span>
                    <strong className="text-blue-700 font-mono text-sm block mt-0.5">{activeEmployee.accountNumber || '0012-3456-7890'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: LEAVE CREDITS & HISTORY (SYNCED WITH PAYROLL)                  */}
          {/* ========================================================================= */}
          {activeSection === 'leaves' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      Leave Credits & Application History
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Live Synced with Payroll
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Real-time leave balance tracker adhering to DOLE statutory requirements (5-day SIL) and internal FFCSI leave policy.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportLeaveHistory}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenLeaveModal(activeEmployee)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>File New Leave Request</span>
                  </button>
                </div>
              </div>

              {/* Leave Balance Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-blue-900 uppercase">Service Incentive (SIL)</span>
                    <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">DOLE Mandatory</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-blue-700 mt-1">
                    {activeEmployee.silBalance ?? 5} <span className="text-xs font-normal text-slate-600">days remaining</span>
                  </p>
                  <p className="text-[10px] text-blue-600">5-day statutory paid incentive after 1 yr service</p>
                </div>

                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-purple-900 uppercase">Vacation Leave (VL)</span>
                    <span className="text-[10px] text-purple-700 font-bold bg-white px-2 py-0.5 rounded border border-purple-200">Annual Standard</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-purple-700 mt-1">
                    {activeEmployee.vlBalance ?? 12} <span className="text-xs font-normal text-slate-600">days remaining</span>
                  </p>
                  <p className="text-[10px] text-purple-600">Standard company-sponsored paid rest leave</p>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase">Sick Leave (SL)</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">Medical Rest</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                    {activeEmployee.slBalance ?? 10} <span className="text-xs font-normal text-slate-600">days remaining</span>
                  </p>
                  <p className="text-[10px] text-emerald-600">Health recuperation & medical emergency leave</p>
                </div>
              </div>

              {/* Leave Filter Bar */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Filter By:</span>
                  <select
                    value={leaveTypeFilter}
                    onChange={e => setLeaveTypeFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    <option value="All">All Leave Types</option>
                    <option value="Service Incentive Leave (SIL)">Service Incentive Leave (SIL)</option>
                    <option value="Vacation Leave">Vacation Leave (VL)</option>
                    <option value="Sick Leave">Sick Leave (SL)</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>

                  <select
                    value={leaveStatusFilter}
                    onChange={e => setLeaveStatusFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Approved">Approved Only</option>
                    <option value="Pending">Pending Only</option>
                    <option value="Rejected">Rejected Only</option>
                  </select>
                </div>

                <span className="text-slate-500 font-medium">
                  Showing <strong>{filteredLeaves.length}</strong> of {activeEmployeeLeaves.length} record(s)
                </span>
              </div>

              {/* Leave History Table */}
              <div className="space-y-3">
                {filteredLeaves.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No leave records matching the selected filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Date Range</th>
                          <th className="px-4 py-3">Leave Type</th>
                          <th className="px-4 py-3">Duration</th>
                          <th className="px-4 py-3">Compensation</th>
                          <th className="px-4 py-3">Reason / Remarks</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          {isSuperAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeaves.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">
                              {l.startDate} {l.startDate !== l.endDate && `to ${l.endDate}`}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{l.leaveType}</td>
                            <td className="px-4 py-3 font-mono font-bold text-blue-700">{l.totalDays} day(s)</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                                {l.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{l.reason || 'N/A'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                l.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                l.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {l.status}
                              </span>
                            </td>
                            {isSuperAdmin && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {l.status === 'Pending' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => updateLeaveStatus(l.id, 'Approved', currentUser.fullName)}
                                        className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                        title="Approve Leave"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateLeaveStatus(l.id, 'Rejected', currentUser.fullName)}
                                        className="p-1 text-rose-700 hover:bg-rose-50 rounded"
                                        title="Reject Leave"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Delete leave record for ${l.employeeName}? Any deducted days will be refunded.`)) {
                                        deleteLeaveRecord(l.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete & Refund"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: VALE / CASH ADVANCE TRACKER (SYNCED WITH PAYROLL)              */}
          {/* ========================================================================= */}
          {activeSection === 'vales' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-amber-600" />
                      Vale (Cash Advance) Tracker & Repayment Ledger
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Live Synced with Payroll
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Track employee cash advances, automated semi-monthly payroll cutoff amortizations, over-the-counter payments, and live loan balances.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportValeHistory}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenValeModal(activeEmployee)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Request Cash Advance</span>
                  </button>
                </div>
              </div>

              {/* Vale Metric Cards Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 uppercase">Outstanding Vale Balance</span>
                  <p className="text-2xl font-bold font-mono text-amber-900">
                    ₱{valeStats.totalRemaining.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-amber-700">Active cash advance liability</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">Payroll Cutoff Deduction</span>
                  <p className="text-2xl font-bold font-mono text-slate-900">
                    ₱{(activeEmployee.defaultValeDeduction || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500">Automated semi-monthly deduction</p>
                </div>

                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase">Total Repaid to Date</span>
                  <p className="text-2xl font-bold font-mono text-emerald-800">
                    ₱{valeStats.totalRepaid.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-700">Repayment rate: {valeStats.repaymentRate}%</p>
                </div>

                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-1">
                  <span className="text-[11px] font-bold text-blue-900 uppercase">Est. Payoff Timeline</span>
                  <p className="text-2xl font-bold font-mono text-blue-800">
                    {valeStats.estCutoffsRemaining > 0 ? `${valeStats.estCutoffsRemaining} Cutoffs` : 'Settled'}
                  </p>
                  <p className="text-[10px] text-blue-700">
                    {valeStats.estCutoffsRemaining > 0 ? `~${(valeStats.estCutoffsRemaining / 2).toFixed(1)} months at current rate` : 'Zero remaining balance'}
                  </p>
                </div>
              </div>

              {/* Vale History List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    Cash Advance Vouchers & Repayment Timeline ({activeEmployeeVales.length})
                  </h4>
                </div>

                {activeEmployeeVales.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    <Banknote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No active or historical cash advances recorded for this employee.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeEmployeeVales.map((v) => {
                      const isCA = v.advanceType === 'Cash Advance';
                      return (
                      <div key={v.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold font-mono text-slate-900">₱{v.amountGiven.toLocaleString()}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isCA
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {isCA ? '⚡ Cash Advance' : '🔄 Vale'}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                v.status === 'Fully Paid' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {v.status}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">{v.id}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-slate-600 flex-wrap">
                              <span>Disbursed: <strong className="font-mono text-slate-800">{v.disbursementDate}</strong></span>
                              <span>•</span>
                              <span className={`font-semibold ${isCA ? 'text-indigo-700' : 'text-amber-700'}`}>
                                {isCA ? '⚡ Will pay full next cut off (100%)' : `🔄 Cutoff deduction: ₱${(v.cutoffDeductionAmount || 500).toLocaleString()}`}
                              </span>
                              {v.purpose && (
                                <>
                                  <span>•</span>
                                  <span>Purpose: <em>"{v.purpose}"</em></span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Remaining Balance</span>
                              <span className="font-mono font-bold text-base text-rose-700">₱{v.remainingBalance.toLocaleString()}</span>
                            </div>

                            {v.status === 'Active' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedValeForRepayment(v);
                                  setRepaymentAmount(Math.min(v.remainingBalance, v.cutoffDeductionAmount || 500));
                                  setShowRepaymentModal(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Record Payment
                              </button>
                            )}

                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete this cash advance voucher for ${v.employeeName}?`)) {
                                    deleteValeRecord(v.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                title="Delete Voucher"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Repayments History */}
                        {v.repayments && v.repayments.length > 0 && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Repayment Ledger ({v.repayments.length} Transaction(s))
                            </span>
                            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
                              {v.repayments.map((rep) => (
                                <div key={rep.id} className="flex justify-between items-center py-1.5 text-[11px] font-mono">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">{rep.date}</span>
                                    <span className="text-slate-700 font-sans">{rep.payrollCutoffLabel || rep.remarks}</span>
                                  </div>
                                  <strong className="text-emerald-700">-₱{rep.amountPaid.toLocaleString()}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: SECURITY & CHANGE PASSWORD                                     */}
          {/* ========================================================================= */}
          {activeSection === 'security' && activeEmployee.id === loggedInEmployee?.id && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    Account Security & Password Management
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Change your account password securely. Updates are encrypted using PBKDF2 with SHA-256 and instantly synchronized with <strong>User Management & RBAC</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    PBKDF2 Hashed Active
                  </span>
                </div>
              </div>

              {/* Feedback Status Alert */}
              {passwordStatus.message && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-3 ${
                  passwordStatus.type === 'success' 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}>
                  {passwordStatus.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-bold">
                      {passwordStatus.type === 'success' ? 'Password Updated Successfully' : 'Action Failed'}
                    </strong>
                    <p className="mt-0.5">{passwordStatus.message}</p>
                  </div>
                </div>
              )}

              {/* Change Password Form */}
              <form onSubmit={handleChangePasswordSubmit} className="max-w-xl space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password (min. 6 characters)"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Password Strength:</span>
                        <span className={pwStrength >= 75 ? 'text-emerald-600' : pwStrength >= 50 ? 'text-amber-600' : 'text-rose-600'}>
                          {pwStrength >= 75 ? 'Strong' : pwStrength >= 50 ? 'Moderate' : 'Weak'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pwStrength >= 75 ? 'bg-emerald-500' : pwStrength >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${pwStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password to confirm"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmittingPw || !newPassword || newPassword !== confirmPassword}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isSubmittingPw ? 'Updating Password...' : 'Save New Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: RBAC PERMISSIONS                                               */}
          {/* ========================================================================= */}
          {activeSection === 'permissions' && activeEmployee.id === loggedInEmployee?.id && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    Role-Based Access Control (RBAC) & Active Permissions
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Overview of modules and capabilities granted to your account role (<strong className="text-slate-800">{currentUser.role}</strong>).
                  </p>
                </div>
                {isSuperAdmin && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    Full Super Admin Privileges
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {[
                  { key: 'dashboard', label: 'Operations Dashboard', desc: 'View global operations metrics & high-level stats' },
                  { key: 'clients', label: 'Client Management', desc: 'Access client profiles & corporate registers' },
                  { key: 'billing', label: 'Billing & Invoicing', desc: 'Create invoices, record payments & statements' },
                  { key: 'payables', label: 'BIR & Benefits Payables', desc: 'Manage tax forms, SSS, PHIC, Pag-IBIG remittances' },
                  { key: 'compliance', label: 'Deadline Compliance', desc: 'Monitor statutory BIR tax schedules & due dates' },
                  { key: 'reports', label: 'Executive BI Analytics', desc: 'Comprehensive financial & operational reporting' },
                  { key: 'payroll', label: 'Company Payroll & HR', desc: 'Internal staff payroll, leave tracker & vales' },
                  { key: 'documents', label: 'Document Library', desc: 'Upload, verify & archive client tax attachments' },
                  { key: 'userManagement', label: 'User Management', desc: 'Provision staff accounts & configure RBAC' },
                  { key: 'settings', label: 'Master Tables & System', desc: 'Configure deadline rules, bank list, holidays' }
                ].map(item => {
                  const hasAccess = isSuperAdmin || (currentUser.permissions as any)[item.key];
                  return (
                    <div 
                      key={item.key}
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-2 ${
                        hasAccess 
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                          : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <strong className="block font-bold">{item.label}</strong>
                        <span className="text-[10px] text-slate-500 block leading-tight">{item.desc}</span>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {hasAccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <X className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FILE LEAVE REQUEST (SYNCED WITH PAYROLL)                           */}
      {/* ========================================================================= */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveLeave} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">File Employee Leave</h3>
                  <p className="text-xs text-slate-500">Live synchronized with Company Staff Payroll & HR</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Selector */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">Target Employee</label>
              <select
                value={targetLeaveEmployeeId}
                onChange={e => setTargetLeaveEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeNo || 'EMP'}) - {emp.position}
                  </option>
                ))}
              </select>
            </div>

            {/* Leave Balance Alert Box */}
            {(() => {
              const targetEmp = employees.find(e => e.id === targetLeaveEmployeeId) || activeEmployee;
              return (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-1">
                  <span className="text-[11px] font-bold text-blue-900 block">Available Leave Credits for {targetEmp?.fullName}:</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="bg-white p-1.5 rounded border border-blue-100 font-mono">
                      <span className="text-slate-500 block">SIL</span>
                      <strong className="text-blue-700">{targetEmp?.silBalance ?? 5}d</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-blue-100 font-mono">
                      <span className="text-slate-500 block">VL</span>
                      <strong className="text-purple-700">{targetEmp?.vlBalance ?? 12}d</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-blue-100 font-mono">
                      <span className="text-slate-500 block">SL</span>
                      <strong className="text-emerald-700">{targetEmp?.slBalance ?? 10}d</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="Vacation Leave">Vacation Leave (VL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Service Incentive Leave (SIL)">Service Incentive Leave (SIL - DOLE 5 Days)</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Days</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={leaveForm.totalDays}
                    onChange={e => setLeaveForm({ ...leaveForm, totalDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Compensation</label>
                  <select
                    value={leaveForm.isPaid ? 'Paid' : 'Unpaid'}
                    onChange={e => setLeaveForm({ ...leaveForm, isPaid: e.target.value === 'Paid' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="Paid">With Pay (Paid Leave)</option>
                    <option value="Unpaid">Without Pay (Unpaid Leave)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason / Purpose</label>
                <textarea
                  rows={2}
                  required
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="e.g. Annual family vacation, personal emergency, or medical rest"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Submit Leave Application
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REQUEST VALE CASH ADVANCE (SYNCED WITH PAYROLL)                    */}
      {/* ========================================================================= */}
      {showValeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveVale} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Request Cash Advance (Vale)</h3>
                  <p className="text-xs text-slate-500">Live synchronized with Company Staff Payroll & HR</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowValeModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Selector */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">Target Employee</label>
              <select
                value={targetValeEmployeeId}
                onChange={e => setTargetValeEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeNo || 'EMP'}) - Current Vale: ₱{(emp.currentValeBalance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Advance Type Selector ⭐ Cash Advance vs Vale */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs">Advance Type & Repayment Option *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setValeForm(prev => ({
                      ...prev,
                      advanceType: 'Cash Advance',
                      cutoffDeductionAmount: prev.amountGiven
                    }));
                  }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    valeForm.advanceType === 'Cash Advance'
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>⚡</span>
                    <span>Cash Advance</span>
                  </div>
                  <p className="text-[10px] font-semibold text-indigo-700 mt-0.5">
                    Will pay full next cut off
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                    100% full deduction on immediate next payroll
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const emp = employees.find(e => e.id === targetValeEmployeeId);
                    const defDed = emp?.defaultValeDeduction || 500;
                    setValeForm(prev => ({
                      ...prev,
                      advanceType: 'Vale',
                      cutoffDeductionAmount: prev.cutoffDeductionAmount === prev.amountGiven ? defDed : prev.cutoffDeductionAmount
                    }));
                  }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    valeForm.advanceType === 'Vale'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>🔄</span>
                    <span>Vale</span>
                  </div>
                  <p className="text-[10px] font-semibold text-amber-700 mt-0.5">
                    Will pay monthly Cutoff Deduction
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                    Periodic installment deductions across cutoffs
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Requested (₱) *</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  required
                  value={valeForm.amountGiven}
                  onChange={e => {
                    const newAmt = Number(e.target.value);
                    if (valeForm.advanceType === 'Cash Advance') {
                      setValeForm({ ...valeForm, amountGiven: newAmt, cutoffDeductionAmount: newAmt });
                    } else {
                      setValeForm({ ...valeForm, amountGiven: newAmt });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 text-base"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {valeForm.advanceType === 'Cash Advance' ? 'Immediate Next Cutoff Deduction (₱)' : 'Preferred Cutoff Installment (₱)'} *
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
                  onChange={e => setValeForm({ ...valeForm, cutoffDeductionAmount: Number(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold ${
                    valeForm.advanceType === 'Cash Advance'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 cursor-not-allowed'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="e.g. 500 or 1000 per payroll cutoff"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {valeForm.advanceType === 'Cash Advance'
                    ? '100% of this cash advance will be deducted on the very next payroll cutoff.'
                    : 'Deducted automatically on each 15th & 30th payroll cutoff until fully settled.'}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Disbursement Date</label>
                <input
                  type="date"
                  required
                  value={valeForm.disbursementDate}
                  onChange={e => setValeForm({ ...valeForm, disbursementDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Purpose / Justification</label>
                <textarea
                  rows={2}
                  required
                  value={valeForm.purpose}
                  onChange={e => setValeForm({ ...valeForm, purpose: e.target.value })}
                  placeholder={valeForm.advanceType === 'Cash Advance' ? 'e.g. Immediate bridge cash advance (will pay in full next cutoff)...' : 'e.g. Emergency family medical expense or tuition assistance'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowValeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Submit Vale Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL VALE REPAYMENT (SYNCED WITH PAYROLL)                        */}
      {/* ========================================================================= */}
      {showRepaymentModal && selectedValeForRepayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveRepayment} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Record Vale Repayment</h3>
                  <p className="text-xs text-slate-500">Employee: <strong>{selectedValeForRepayment.employeeName}</strong></p>
                </div>
              </div>
              <button type="button" onClick={() => setShowRepaymentModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Original Advance:</span>
                <strong className="font-mono text-slate-900">₱{selectedValeForRepayment.amountGiven.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Outstanding Balance:</span>
                <strong className="font-mono text-rose-700 font-bold">₱{selectedValeForRepayment.remainingBalance.toLocaleString()}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Repayment Amount (₱)</label>
                <input
                  type="number"
                  min="50"
                  max={selectedValeForRepayment.remainingBalance}
                  step="50"
                  required
                  value={repaymentAmount}
                  onChange={e => setRepaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700 text-base"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Receipt # / Reference (Optional)</label>
                <input
                  type="text"
                  value={repaymentReceipt}
                  onChange={e => setRepaymentReceipt(e.target.value)}
                  placeholder="e.g. OR-2026-089 or Cash Slip"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Remarks</label>
                <input
                  type="text"
                  value={repaymentRemarks}
                  onChange={e => setRepaymentRemarks(e.target.value)}
                  placeholder="e.g. Over-the-counter cash settlement"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowRepaymentModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Repayment
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
