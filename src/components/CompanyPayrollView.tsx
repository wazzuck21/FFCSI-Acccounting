import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  CompanyEmployee, 
  LeaveRecord, 
  ValeRecord, 
  PayrollRun, 
  PayrollItem,
  LeaveType 
} from '../types';
import { computeEmployeePayslip, calculateSSSContribution, calculatePhilHealthContribution, calculatePagIbigContribution, calculateSemiMonthlyBIRTax } from '../lib/dolePayroll';
import { DolePayrollSandbox } from './DolePayrollSandbox';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import { AttendanceReportModal } from './AttendanceReportModal';
import { generateCutoffAttendance, exportAttendanceReportToExcel } from '../utils/attendanceUtils';
import { 
  Banknote, 
  Plus, 
  Users, 
  Calendar, 
  DollarSign, 
  Clock, 
  Search, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Printer, 
  Calculator, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  UserCheck,
  Edit2,
  Trash2,
  ChevronRight,
  Download,
  Upload,
  FileSpreadsheet,
  TableProperties
} from 'lucide-react';

export const CompanyPayrollView: React.FC = () => {
  const { 
    employees, 
    leaveRecords, 
    valeRecords, 
    payrollRuns, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee,
    addLeaveRecord,
    updateLeaveStatus,
    addValeRecord,
    addValeRepayment,
    deleteValeRecord,
    addPayrollRun,
    updatePayrollRunStatus,
    deletePayrollRun,
    addAuditLog
  } = useData();

  const { currentUser, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'payroll' | 'employees' | 'leaves' | 'vale' | 'attendance' | 'calculator'>('payroll');
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<CompanyEmployee | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showValeModal, setShowValeModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState<{ run: PayrollRun; item: PayrollItem } | null>(null);
  const [attendanceModalEmployee, setAttendanceModalEmployee] = useState<CompanyEmployee | null>(null);
  const [selectedAttEmployeeId, setSelectedAttEmployeeId] = useState<string>(employees[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states for New Payroll Run
  const [newRunPeriod, setNewRunPeriod] = useState('August 1-15, 2026');
  const [newRunPeriodType, setNewRunPeriodType] = useState<'1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly'>('1st Half (1-15)');
  const [newRunPayDate, setNewRunPayDate] = useState('2026-08-15');
  const [payrollInputs, setPayrollInputs] = useState<Record<string, {
    daysWorked: number;
    daysAbsent: number;
    tardinessMinutes: number;
    undertimeMinutes: number;
    otRegularHours: number;
    otRestDayHours: number;
    otHolidayHours: number;
    nightDiffHours: number;
    otherAllowances: number;
    valeDeduction: number;
    otherDeductions: number;
    timeIn?: string;
    timeOut?: string;
  }>>({});

  // Employee Form State (Defaults to Gross / 22 for Daily Salary)
  const [empForm, setEmpForm] = useState<Omit<CompanyEmployee, 'id'>>({
    employeeNo: `EMP-00${employees.length + 1}`,
    fullName: '',
    position: 'Tax Accountant',
    department: 'Tax & Audit',
    dateHired: new Date().toISOString().split('T')[0],
    employmentType: 'Regular',
    monthlyBasicSalary: 25000,
    dailyRate: 1136.36, // 25,000 / 22
    hourlyRate: 142.05, // 1136.36 / 8
    tinNumber: '',
    sssNumber: '',
    philhealthNumber: '',
    pagibigNumber: '',
    bankName: 'BDO Unibank',
    accountNumber: '',
    status: 'Active',
    silBalance: 5,
    vlBalance: 10,
    slBalance: 8,
    currentValeBalance: 0,
    defaultValeDeduction: 0
  });

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    employeeId: employees[0]?.id || '',
    leaveType: 'Vacation Leave' as LeaveType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    totalDays: 1,
    reason: '',
    isPaid: true
  });

  // Vale Form State
  const [valeForm, setValeForm] = useState({
    employeeId: employees[0]?.id || '',
    amountGiven: 2000,
    dateGiven: new Date().toISOString().split('T')[0],
    purpose: '',
    cutoffDeductionAmount: 500
  });

  // Parse shift times helper (Standard Shift: 8:30 AM - 5:30 PM, Grace Allowance up to 8:45 AM)
  const parseShiftTimes = (timeInStr: string, timeOutStr: string) => {
    const parseToMinutes = (str: string) => {
      const clean = str.trim().toUpperCase();
      const isPM = clean.includes('PM');
      const isAM = clean.includes('AM');
      const timeOnly = clean.replace(/AM|PM/g, '').trim();
      const parts = timeOnly.split(':');
      if (parts.length < 2) return null;
      let hours = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(mins)) return null;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      return hours * 60 + mins;
    };

    const inMins = parseToMinutes(timeInStr);
    const outMins = parseToMinutes(timeOutStr);
    if (inMins === null || outMins === null) return null;

    // Standard Shift: 8:30 AM (510 mins) to 5:30 PM (1050 mins)
    const scheduledIn = 8 * 60 + 30; // 510
    const scheduledOut = 17 * 60 + 30; // 1050
    const graceAllowance = 8 * 60 + 45; // 525 (8:45 AM)

    // Allowance up to 8:45 AM -> 0 late. Beyond 8:45 AM -> computed every minute from 8:30 AM
    let lateMinutes = 0;
    if (inMins > graceAllowance) {
      lateMinutes = Math.max(0, inMins - scheduledIn);
    }

    // Early out / undertime if left before 5:30 PM
    const undertimeMinutes = Math.max(0, scheduledOut - outMins);

    // Overtime if worked past 5:30 PM
    const otHours = Math.max(0, Number(((outMins - scheduledOut) / 60).toFixed(2)));

    return { lateMinutes, undertimeMinutes, otHours };
  };

  // Download Sample Timekeeping Excel Template
  const handleDownloadExcelTemplate = () => {
    const templateData = employees
      .filter(e => e.status === 'Active')
      .map(emp => ({
        'Employee No': emp.employeeNo,
        'Full Name': emp.fullName,
        'Position': emp.position,
        'Date': new Date().toISOString().split('T')[0],
        'Time In': '08:00 AM',
        'Time Out': '05:00 PM',
        'Days Worked': 11,
        'Days Absent': 0,
        'Tardiness (Mins)': 0,
        'Undertime (Mins)': 0,
        'Regular OT (Hours)': 0,
        'Rest Day OT (Hours)': 0,
        'Holiday OT (Hours)': 0,
        'Night Diff (Hours)': 0,
        'Allowances (PHP)': 0,
        'Other Deductions (PHP)': 0
      }));

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timekeeping');
    XLSX.writeFile(workbook, `Timekeeping_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Upload & Parse Timekeeping Excel / CSV File
  const handleUploadTimekeepingExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (!data || data.length === 0) {
          alert('Uploaded Excel file is empty.');
          return;
        }

        const updatedInputs = { ...payrollInputs };
        let updatedCount = 0;

        data.forEach(row => {
          const empNo = row['Employee No'] || row['EmployeeNo'] || row['EMP NO'] || row['Emp No'];
          const empName = row['Full Name'] || row['Employee Name'] || row['Name'];

          const targetEmp = employees.find(emp => 
            (empNo && emp.employeeNo.toString().trim().toUpperCase() === empNo.toString().trim().toUpperCase()) ||
            (empName && emp.fullName.toLowerCase().includes(empName.toString().toLowerCase()))
          );

          if (targetEmp) {
            const current = updatedInputs[targetEmp.id] || {
              daysWorked: 11,
              daysAbsent: 0,
              tardinessMinutes: 0,
              undertimeMinutes: 0,
              otRegularHours: 0,
              otRestDayHours: 0,
              otHolidayHours: 0,
              nightDiffHours: 0,
              otherAllowances: 0,
              valeDeduction: 0,
              otherDeductions: 0
            };

            const daysWorked = row['Days Worked'] !== undefined ? Number(row['Days Worked']) : current.daysWorked;
            const daysAbsent = row['Days Absent'] !== undefined ? Number(row['Days Absent']) : current.daysAbsent;
            let tardinessMins = row['Tardiness (Mins)'] !== undefined || row['Late Mins'] !== undefined ? Number(row['Tardiness (Mins)'] || row['Late Mins']) : current.tardinessMinutes;
            let undertimeMins = row['Undertime (Mins)'] !== undefined ? Number(row['Undertime (Mins)']) : current.undertimeMinutes;
            let otRegHours = row['Regular OT (Hours)'] !== undefined || row['OT Hours'] !== undefined ? Number(row['Regular OT (Hours)'] || row['OT Hours']) : current.otRegularHours;

            const timeInStr = row['Time In'] || row['TimeIn'];
            const timeOutStr = row['Time Out'] || row['TimeOut'];

            if (timeInStr && timeOutStr) {
              const parsedTimes = parseShiftTimes(timeInStr.toString(), timeOutStr.toString());
              if (parsedTimes) {
                if (row['Tardiness (Mins)'] === undefined) tardinessMins = parsedTimes.lateMinutes;
                if (row['Undertime (Mins)'] === undefined) undertimeMins = parsedTimes.undertimeMinutes;
                if (row['Regular OT (Hours)'] === undefined) otRegHours = parsedTimes.otHours;
              }
            }

            updatedInputs[targetEmp.id] = {
              ...current,
              daysWorked: isNaN(daysWorked) ? current.daysWorked : daysWorked,
              daysAbsent: isNaN(daysAbsent) ? current.daysAbsent : daysAbsent,
              tardinessMinutes: isNaN(tardinessMins) ? current.tardinessMinutes : tardinessMins,
              undertimeMinutes: isNaN(undertimeMins) ? current.undertimeMinutes : undertimeMins,
              otRegularHours: isNaN(otRegHours) ? current.otRegularHours : otRegHours,
              otRestDayHours: row['Rest Day OT (Hours)'] !== undefined ? Number(row['Rest Day OT (Hours)']) : current.otRestDayHours,
              otHolidayHours: row['Holiday OT (Hours)'] !== undefined ? Number(row['Holiday OT (Hours)']) : current.otHolidayHours,
              nightDiffHours: row['Night Diff (Hours)'] !== undefined ? Number(row['Night Diff (Hours)']) : current.nightDiffHours,
              otherAllowances: row['Allowances (PHP)'] !== undefined ? Number(row['Allowances (PHP)']) : current.otherAllowances,
              otherDeductions: row['Other Deductions (PHP)'] !== undefined ? Number(row['Other Deductions (PHP)']) : current.otherDeductions,
              timeIn: timeInStr ? timeInStr.toString() : current.timeIn,
              timeOut: timeOutStr ? timeOutStr.toString() : current.timeOut
            };
            updatedCount++;
          }
        });

        setPayrollInputs(updatedInputs);
        alert(`Successfully imported timekeeping for ${updatedCount} employee(s) from Excel!`);
      } catch (err) {
        console.error('Error reading Excel timekeeping file:', err);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv file.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Initialize Payroll Input map when opening modal
  const handleOpenNewRunModal = () => {
    const initialMap: Record<string, any> = {};
    employees.filter(e => e.status === 'Active').forEach(emp => {
      // Find default vale deduction if active vale exists
      const activeVale = valeRecords.find(v => v.employeeId === emp.id && v.status === 'Active');
      const valeDed = activeVale ? Math.min(activeVale.remainingBalance, emp.defaultValeDeduction || activeVale.cutoffDeductionAmount || 500) : 0;

      initialMap[emp.id] = {
        daysWorked: 11,
        daysAbsent: 0,
        tardinessMinutes: 0,
        undertimeMinutes: 0,
        otRegularHours: 0,
        otRestDayHours: 0,
        otHolidayHours: 0,
        nightDiffHours: 0,
        otherAllowances: 0,
        valeDeduction: valeDed,
        otherDeductions: 0,
        timeIn: '08:00 AM',
        timeOut: '05:00 PM'
      };
    });
    setPayrollInputs(initialMap);
    setShowNewRunModal(true);
  };

  // Compute live items for modal
  const computedRunItems: PayrollItem[] = employees
    .filter(e => e.status === 'Active')
    .map(emp => {
      const input = payrollInputs[emp.id] || {
        daysWorked: 11,
        daysAbsent: 0,
        tardinessMinutes: 0,
        undertimeMinutes: 0,
        otRegularHours: 0,
        otRestDayHours: 0,
        otHolidayHours: 0,
        nightDiffHours: 0,
        otherAllowances: 0,
        valeDeduction: 0,
        otherDeductions: 0
      };

      const calc = computeEmployeePayslip({
        monthlyBasic: emp.monthlyBasicSalary,
        dailyRateOverride: emp.dailyRate,
        hourlyRateOverride: emp.hourlyRate,
        periodType: newRunPeriodType,
        daysWorked: input.daysWorked,
        daysAbsent: input.daysAbsent,
        tardinessMinutes: input.tardinessMinutes,
        undertimeMinutes: input.undertimeMinutes,
        otRegularHours: input.otRegularHours,
        otRestDayHours: input.otRestDayHours,
        otHolidayHours: input.otHolidayHours,
        nightDiffHours: input.nightDiffHours,
        otherAllowances: input.otherAllowances,
        valeDeduction: input.valeDeduction,
        otherDeductions: input.otherDeductions
      });

      return {
        id: `item_${emp.id}`,
        payrollRunId: '',
        employeeId: emp.id,
        employeeName: emp.fullName,
        position: emp.position,
        monthlyBasic: emp.monthlyBasicSalary,
        semiMonthlyBasic: calc.semiMonthlyBasic,
        daysWorked: input.daysWorked,
        daysAbsent: input.daysAbsent,
        absencesDeduction: calc.absencesDeduction,
        tardinessMinutes: input.tardinessMinutes,
        tardinessDeduction: calc.tardinessDeduction,
        undertimeMinutes: input.undertimeMinutes,
        undertimeDeduction: calc.undertimeDeduction,
        otRegularHours: input.otRegularHours,
        otRegularPay: calc.otRegularPay,
        otRestDayHours: input.otRestDayHours,
        otRestDayPay: calc.otRestDayPay,
        otHolidayHours: input.otHolidayHours,
        otHolidayPay: calc.otHolidayPay,
        nightDiffHours: input.nightDiffHours,
        nightDiffPay: calc.nightDiffPay,
        otherAllowances: input.otherAllowances,
        grossPay: calc.grossPay,
        sssEE: calc.sssEE,
        sssER: calc.sssER,
        philHealthEE: calc.philHealthEE,
        philHealthER: calc.philHealthER,
        pagIbigEE: calc.pagIbigEE,
        pagIbigER: calc.pagIbigER,
        birWithholdingTax: calc.birWithholdingTax,
        valeDeduction: input.valeDeduction,
        otherDeductions: input.otherDeductions,
        totalDeductions: calc.totalDeductions,
        netPay: calc.netPay
      };
    });

  const totalGrossForNewRun = computedRunItems.reduce((sum, item) => sum + item.grossPay, 0);
  const totalDeductionsForNewRun = computedRunItems.reduce((sum, item) => sum + item.totalDeductions, 0);
  const totalNetForNewRun = computedRunItems.reduce((sum, item) => sum + item.netPay, 0);

  const handleSavePayrollRun = (status: 'Draft' | 'Approved' | 'Paid') => {
    addPayrollRun({
      cutoffPeriod: newRunPeriod,
      periodType: newRunPeriodType,
      payDate: newRunPayDate,
      status,
      totalGrossPay: Number(totalGrossForNewRun.toFixed(2)),
      totalDeductions: Number(totalDeductionsForNewRun.toFixed(2)),
      totalNetPay: Number(totalNetForNewRun.toFixed(2)),
      createdBy: currentUser?.fullName || 'Super Admin',
      approvedBy: status !== 'Draft' ? (currentUser?.fullName || 'Super Admin') : undefined,
      items: computedRunItems
    });

    if (currentUser) {
      addAuditLog(
        'Created Internal Payroll Run',
        `Generated payroll for ${newRunPeriod} (${newRunPeriodType}). Total Net Payout: ₱${totalNetForNewRun.toLocaleString()}`,
        currentUser.id,
        currentUser.fullName
      );
    }

    setShowNewRunModal(false);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, empForm);
    } else {
      addEmployee(empForm);
    }
    setShowEmployeeModal(false);
    setEditingEmployee(null);
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === leaveForm.employeeId);
    if (!emp) return;

    addLeaveRecord({
      employeeId: emp.id,
      employeeName: emp.fullName,
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      totalDays: Number(leaveForm.totalDays),
      reason: leaveForm.reason,
      status: 'Approved',
      approvedBy: currentUser?.fullName || 'Super Admin',
      isPaid: leaveForm.isPaid
    });

    // Auto-update leave status to trigger deduction
    updateLeaveStatus(`leave_${Date.now()}`, 'Approved', currentUser?.fullName);

    setShowLeaveModal(false);
  };

  const handleSaveVale = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === valeForm.employeeId);
    if (!emp) return;

    addValeRecord({
      employeeId: emp.id,
      employeeName: emp.fullName,
      amountGiven: Number(valeForm.amountGiven),
      dateGiven: valeForm.dateGiven,
      purpose: valeForm.purpose,
      cutoffDeductionAmount: Number(valeForm.cutoffDeductionAmount),
      remainingBalance: Number(valeForm.amountGiven)
    });

    setShowValeModal(false);
  };

  // Quick summary numbers
  const totalEmployeesCount = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const totalOutstandingVale = valeRecords.filter(v => v.status === 'Active').reduce((s, v) => s + v.remainingBalance, 0);
  const pendingLeaves = leaveRecords.filter(l => l.status === 'Pending').length;

  // Pagination for Payroll Runs
  const {
    currentPage: runsPage,
    pageSize: runsPageSize,
    totalItems: totalRuns,
    paginatedItems: paginatedPayrollRuns,
    setCurrentPage: setRunsPage,
    setPageSize: setRunsPageSize,
    loadMore: loadMoreRuns,
    hasMoreToLoad: hasMoreRuns,
  } = usePagination(payrollRuns, {
    initialPageSize: 15,
    resetOnChange: payrollRuns.length,
  });

  // Pagination for Employee Directory
  const {
    currentPage: empPage,
    pageSize: empPageSize,
    totalItems: totalEmployees,
    paginatedItems: paginatedEmployees,
    setCurrentPage: setEmpPage,
    setPageSize: setEmpPageSize,
    loadMore: loadMoreEmp,
    hasMoreToLoad: hasMoreEmp,
  } = usePagination(employees, {
    initialPageSize: 15,
    resetOnChange: employees.length,
  });

  // Pagination for Leaves
  const {
    currentPage: leavesPage,
    pageSize: leavesPageSize,
    totalItems: totalLeaves,
    paginatedItems: paginatedLeaveRecords,
    setCurrentPage: setLeavesPage,
    setPageSize: setLeavesPageSize,
    loadMore: loadMoreLeaves,
    hasMoreToLoad: hasMoreLeaves,
  } = usePagination(leaveRecords, {
    initialPageSize: 15,
    resetOnChange: leaveRecords.length,
  });

  // Pagination for Vale
  const {
    currentPage: valePage,
    pageSize: valePageSize,
    totalItems: totalVale,
    paginatedItems: paginatedValeRecords,
    setCurrentPage: setValePage,
    setPageSize: setValePageSize,
    loadMore: loadMoreVale,
    hasMoreToLoad: hasMoreVale,
  } = usePagination(valeRecords, {
    initialPageSize: 15,
    resetOnChange: valeRecords.length,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Banknote className="w-64 h-64 text-white" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Internal Company Payroll Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">DOLE / TRAIN Law Compliant</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Company Staff Payroll & HR Management</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Internal accounting firm employee salary computation, DOLE overtime rules, late/absent deductions, statutory contributions (SSS, PHIC, HDMF, BIR), Service Incentive Leaves & Vale tracker.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('calculator')}
              className="px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/40"
            >
              <Calculator className="w-4 h-4 text-indigo-200" /> DOLE & Tax Sandbox
            </button>
            <button
              onClick={handleOpenNewRunModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Run New Payroll Cutoff
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Active Staff Count:</span>
            <p className="text-lg font-bold text-white mt-0.5">{activeEmployees} Active Employees</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Outstanding Vale (Cash Advances):</span>
            <p className="text-lg font-bold text-amber-400 mt-0.5">₱{totalOutstandingVale.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Pending Leave Requests:</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">{pendingLeaves} Pending Request(s)</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Payroll Runs Created:</span>
            <p className="text-lg font-bold text-blue-300 mt-0.5">{payrollRuns.length} Cutoff Run(s)</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'payroll' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Banknote className="w-4 h-4" />
          Payroll Runs & Payslips
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'employees' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Internal Employee Directory ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'leaves' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Leave Tracker (SIL/VL/SL)
          {pendingLeaves > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full font-bold">
              {pendingLeaves}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('vale')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'vale' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Vale Tracker (Cash Advances)
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'attendance' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TableProperties className="w-4 h-4" />
          Attendance & DTR Reports
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full font-bold">
            {employees.filter(e => e.status === 'Active').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'calculator' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" />
          DOLE & Tax Sandbox Calculator
          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] rounded font-bold uppercase tracking-wider">
            Sandbox
          </span>
        </button>
      </div>

      {/* TAB 1: PAYROLL RUNS & PAYSLIP GENERATOR */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Historical & Draft Payroll Cutoffs</h3>
              <p className="text-xs text-slate-500">View salary ledgers, approve cutoff batches, and print official DOLE-compliant payslips for internal staff.</p>
            </div>
            <button
              onClick={handleOpenNewRunModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Create New Cutoff Batch
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Payroll Runs Summary</span>
              <span className="text-xs text-slate-500">{payrollRuns.length} Record(s)</span>
            </div>

            <div className="divide-y divide-slate-100">
              {payrollRuns.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Banknote className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No Payroll Runs Generated Yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Create New Cutoff Batch" to compute salaries for this period.</p>
                </div>
              ) : (
                paginatedPayrollRuns.map(run => (
                  <div key={run.id} className="p-5 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-slate-900 text-sm">{run.cutoffPeriod}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          run.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          run.status === 'Approved' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {run.status}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {run.periodType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Pay Date: <strong className="text-slate-700 font-mono">{run.payDate}</strong></span>
                        <span>•</span>
                        <span>Prepared by: <strong className="text-slate-700">{run.createdBy}</strong></span>
                        {run.approvedBy && (
                          <>
                            <span>•</span>
                            <span>Approved by: <strong className="text-slate-700">{run.approvedBy}</strong></span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Payout</span>
                        <span className="text-base font-bold text-emerald-600 font-mono">₱{run.totalNetPay.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {selectedRun?.id === run.id ? 'Hide Ledger' : 'View Ledger'}
                        </button>

                        {run.status === 'Draft' && (
                          <button
                            onClick={() => updatePayrollRunStatus(run.id, 'Approved', currentUser?.fullName)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve Run
                          </button>
                        )}

                        {run.status === 'Approved' && (
                          <button
                            onClick={() => updatePayrollRunStatus(run.id, 'Paid', currentUser?.fullName)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this payroll run?')) {
                              deletePayrollRun(run.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Delete Payroll Run"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {payrollRuns.length > 0 && (
              <TablePagination
                currentPage={runsPage}
                totalItems={totalRuns}
                pageSize={runsPageSize}
                onPageChange={setRunsPage}
                onPageSizeChange={setRunsPageSize}
                onLoadMore={loadMoreRuns}
                hasMoreToLoad={hasMoreRuns}
                itemLabel="payroll runs"
              />
            )}
          </div>

          {/* DETAILED LEDGER VIEW WHEN A RUN IS SELECTED */}
          {selectedRun && (
            <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-blue-600" />
                    Payroll Breakdown Ledger: <span className="text-blue-700">{selectedRun.cutoffPeriod}</span>
                  </h3>
                  <p className="text-xs text-slate-500">Individual employee gross pay, DOLE overtime, statutory deductions, Vale repayments & net payouts.</p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500">Batch Total Gross: <strong className="text-slate-800 font-mono">₱{selectedRun.totalGrossPay.toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-2.5">Employee</th>
                      <th className="p-2.5 text-right">Basic Pay</th>
                      <th className="p-2.5 text-right">Abs/Late</th>
                      <th className="p-2.5 text-right">OT Pay</th>
                      <th className="p-2.5 text-right">Gross Pay</th>
                      <th className="p-2.5 text-right">SSS</th>
                      <th className="p-2.5 text-right">PhilHealth</th>
                      <th className="p-2.5 text-right">Pag-IBIG</th>
                      <th className="p-2.5 text-right">BIR Tax</th>
                      <th className="p-2.5 text-right">Vale Ded.</th>
                      <th className="p-2.5 text-right">Total Ded.</th>
                      <th className="p-2.5 text-right font-bold text-blue-800">Net Pay</th>
                      <th className="p-2.5 text-center">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {selectedRun.items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-sans font-semibold text-slate-900">
                          {item.employeeName}
                          <span className="block text-[10px] text-slate-400 font-normal">{item.position}</span>
                        </td>
                        <td className="p-2.5 text-right text-slate-700">₱{item.semiMonthlyBasic.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-rose-600">
                          -₱{(item.absencesDeduction + item.tardinessDeduction + item.undertimeDeduction).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right text-emerald-600">
                          +₱{(item.otRegularPay + item.otRestDayPay + item.otHolidayPay + item.nightDiffPay).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₱{item.grossPay.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-slate-600">₱{item.sssEE.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-slate-600">₱{item.philHealthEE.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-slate-600">₱{item.pagIbigEE.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-slate-600">₱{item.birWithholdingTax.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-amber-700 font-bold">₱{item.valeDeduction.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-rose-700 font-bold">₱{item.totalDeductions.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700 text-xs">₱{item.netPay.toLocaleString()}</td>
                        <td className="p-2.5 text-center font-sans">
                          <button
                            onClick={() => setShowPayslipModal({ run: selectedRun, item })}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded border border-blue-200 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <Printer className="w-3 h-3" /> View Payslip
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

      {/* TAB 2: EMPLOYEE DIRECTORY & SALARY SETUP */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Internal Accounting Firm Employee Roster</h3>
              <p className="text-xs text-slate-500">Configure staff monthly basic salaries, SSS/PhilHealth/PagIBIG/TIN IDs, bank payout details & leave balances.</p>
            </div>
            <button
              onClick={() => {
                setEditingEmployee(null);
                setEmpForm({
                  employeeNo: `EMP-00${employees.length + 1}`,
                  fullName: '',
                  position: 'Tax Accountant',
                  department: 'Tax & Audit',
                  dateHired: new Date().toISOString().split('T')[0],
                  employmentType: 'Regular',
                  monthlyBasicSalary: 25000,
                  dailyRate: 1149.43,
                  hourlyRate: 143.68,
                  tinNumber: '',
                  sssNumber: '',
                  philhealthNumber: '',
                  pagibigNumber: '',
                  bankName: 'BDO Unibank',
                  accountNumber: '',
                  status: 'Active',
                  silBalance: 5,
                  vlBalance: 10,
                  slBalance: 8,
                  currentValeBalance: 0,
                  defaultValeDeduction: 0
                });
                setShowEmployeeModal(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Internal Employee
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedEmployees.map(emp => (
              <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{emp.employeeNo}</span>
                    <h4 className="font-bold text-slate-900 text-base mt-1">{emp.fullName}</h4>
                    <p className="text-xs text-slate-500">{emp.position} • <span className="text-slate-700">{emp.department}</span></p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {emp.status}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Monthly Basic:</span>
                    <span className="font-bold text-slate-900">₱{emp.monthlyBasicSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">Daily Rate (21.75):</span>
                    <span className="text-slate-700">₱{emp.dailyRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">Hourly Rate (8h):</span>
                    <span className="text-slate-700">₱{emp.hourlyRate.toFixed(2)}</span>
                  </div>
                </div>

                {/* Statutory IDs */}
                <div className="text-[11px] space-y-1 text-slate-600">
                  <p><strong className="text-slate-800">TIN:</strong> {emp.tinNumber || 'N/A'}</p>
                  <p><strong className="text-slate-800">SSS:</strong> {emp.sssNumber || 'N/A'}</p>
                  <p><strong className="text-slate-800">PhilHealth:</strong> {emp.philhealthNumber || 'N/A'}</p>
                  <p><strong className="text-slate-800">Pag-IBIG:</strong> {emp.pagibigNumber || 'N/A'}</p>
                  <p><strong className="text-slate-800">Bank / Payout:</strong> {emp.bankName} - {emp.accountNumber || 'N/A'}</p>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-[10px]">
                  <div className="bg-blue-50/60 p-1.5 rounded">
                    <span className="text-slate-500 block font-bold">SIL</span>
                    <span className="font-bold text-blue-700 text-xs">{emp.silBalance} days</span>
                  </div>
                  <div className="bg-purple-50/60 p-1.5 rounded">
                    <span className="text-slate-500 block font-bold">VL</span>
                    <span className="font-bold text-purple-700 text-xs">{emp.vlBalance} days</span>
                  </div>
                  <div className="bg-emerald-50/60 p-1.5 rounded">
                    <span className="text-slate-500 block font-bold">SL</span>
                    <span className="font-bold text-emerald-700 text-xs">{emp.slBalance} days</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-amber-700 font-bold">Vale Balance: ₱{(emp.currentValeBalance || 0).toLocaleString()}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingEmployee(emp);
                        setEmpForm(emp);
                        setShowEmployeeModal(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      title="Edit Employee"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete employee ${emp.fullName}?`)) {
                          deleteEmployee(emp.id);
                        }
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {employees.length > 0 && (
            <TablePagination
              currentPage={empPage}
              totalItems={totalEmployees}
              pageSize={empPageSize}
              onPageChange={setEmpPage}
              onPageSizeChange={setEmpPageSize}
              onLoadMore={loadMoreEmp}
              hasMoreToLoad={hasMoreEmp}
              itemLabel="employees"
            />
          )}
        </div>
      )}

      {/* TAB 3: LEAVE TRACKER */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Service Incentive Leave (SIL) & Vacation / Sick Leave Tracker</h3>
              <p className="text-xs text-slate-500">Track DOLE statutory 5-day Service Incentive Leave (SIL), Vacation Leave (VL), and Sick Leave (SL) requests.</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> File Leave Request
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Leave Applications History</span>
              <span className="text-xs text-slate-500">{leaveRecords.length} Record(s)</span>
            </div>

            <div className="divide-y divide-slate-100">
              {paginatedLeaveRecords.map(leave => (
                <div key={leave.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-all text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{leave.employeeName}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-200">
                        {leave.leaveType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        leave.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Duration: <strong className="font-mono text-slate-800">{leave.startDate}</strong> to <strong className="font-mono text-slate-800">{leave.endDate}</strong> ({leave.totalDays} day/s)
                      {leave.isPaid ? <span className="ml-2 text-emerald-600 font-bold">• Paid Leave</span> : <span className="ml-2 text-amber-600 font-bold">• Unpaid Leave</span>}
                    </p>
                    <p className="text-slate-500 italic">" Reason: {leave.reason} "</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {leave.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => updateLeaveStatus(leave.id, 'Approved', currentUser?.fullName)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => updateLeaveStatus(leave.id, 'Rejected', currentUser?.fullName)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {leaveRecords.length > 0 && (
              <TablePagination
                currentPage={leavesPage}
                totalItems={totalLeaves}
                pageSize={leavesPageSize}
                onPageChange={setLeavesPage}
                onPageSizeChange={setLeavesPageSize}
                onLoadMore={loadMoreLeaves}
                hasMoreToLoad={hasMoreLeaves}
                itemLabel="leave records"
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VALE TRACKER */}
      {activeTab === 'vale' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Vale (Employee Cash Advance) Ledger</h3>
              <p className="text-xs text-slate-500">Record employee cash advances, set automatic cutoff installment deductions, and view repayment history.</p>
            </div>
            <button
              onClick={() => setShowValeModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Issue New Vale
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedValeRecords.map(vale => (
              <div key={vale.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{vale.employeeName}</h4>
                    <p className="text-xs text-slate-500">Issued Date: <span className="font-mono text-slate-700">{vale.dateGiven}</span></p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    vale.status === 'Active' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {vale.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded italic">" {vale.purpose} "</p>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans font-medium">Original</span>
                    <span className="font-bold text-slate-800">₱{vale.amountGiven.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans font-medium">Cutoff Ded.</span>
                    <span className="font-bold text-blue-700">₱{vale.cutoffDeductionAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans font-medium">Remaining</span>
                    <span className="font-bold text-rose-600">₱{vale.remainingBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Repayments History */}
                {vale.repayments.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Repayment Log ({vale.repayments.length})</span>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {vale.repayments.map(rep => (
                        <div key={rep.id} className="text-[11px] flex justify-between items-center bg-slate-50 px-2.5 py-1 rounded text-slate-700 font-mono">
                          <span>{rep.date} • {rep.remarks}</span>
                          <span className="font-bold text-emerald-600">-₱{rep.amountPaid.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {valeRecords.length > 0 && (
            <TablePagination
              currentPage={valePage}
              totalItems={totalVale}
              pageSize={valePageSize}
              onPageChange={setValePage}
              onPageSizeChange={setValePageSize}
              onLoadMore={loadMoreVale}
              hasMoreToLoad={hasMoreVale}
              itemLabel="vale records"
            />
          )}
        </div>
      )}

      {/* TAB 5: ATTENDANCE & DTR REPORTS (MATCHING FFCSI ATTENDANCE FORMAT) ⭐ */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Automated Timekeeping & DOLE Rules
                </span>
                <span className="text-xs text-slate-500 font-mono">Gross / 22 • 8:30 AM - 5:30 PM • Grace up to 8:45 AM</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Attendance & DTR Sheets</h2>
              <p className="text-xs text-slate-500">
                View, edit, export, and print employee daily time records. Computes Overtime, Late (with 8:45 AM allowance), Early Out, Absences, Holiday Pay, and Night Differential.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const emp = employees.find(e => e.id === selectedAttEmployeeId) || employees[0];
                  if (emp) {
                    const rep = generateCutoffAttendance(emp, newRunPeriod, newRunPeriodType);
                    exportAttendanceReportToExcel(rep);
                  }
                }}
                className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4 text-emerald-600" /> Export Excel (.xlsx)
              </button>

              <button
                type="button"
                onClick={() => {
                  const emp = employees.find(e => e.id === selectedAttEmployeeId) || employees[0];
                  if (emp) setAttendanceModalEmployee(emp);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <TableProperties className="w-4 h-4" /> Open Full DTR Grid Modal
              </button>
            </div>
          </div>

          {/* Quick Staff Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {employees.filter(e => e.status === 'Active').map(emp => {
              const isSelected = selectedAttEmployeeId === emp.id;
              const dailySal = emp.dailyRate || Number((emp.monthlyBasicSalary / 22).toFixed(2));
              
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedAttEmployeeId(emp.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-2 ring-blue-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{emp.employeeNo}</span>
                      <h4 className="text-xs font-bold text-slate-900">{emp.fullName}</h4>
                      <span className="text-[11px] text-slate-500">{emp.position}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-100 text-blue-800">
                      ₱{dailySal.toFixed(0)}/day
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Working Hours: <strong>8:30 - 5:30</strong></span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttendanceModalEmployee(emp);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 text-[11px]"
                    >
                      View DTR <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Preview Table of Selected Employee */}
          {(() => {
            const selectedEmp = employees.find(e => e.id === selectedAttEmployeeId) || employees[0];
            if (!selectedEmp) return null;
            const previewReport = generateCutoffAttendance(selectedEmp, newRunPeriod, newRunPeriodType);

            return (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <TableProperties className="w-4 h-4 text-blue-600" />
                      Attendance Sheet: <span className="text-blue-700">{selectedEmp.fullName}</span> ({selectedEmp.employeeNo})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cutoff: <strong className="text-slate-800">{newRunPeriod}</strong> • Standard Shift: <strong>8:30 AM - 5:30 PM</strong> (1h Break: 12:00 PM - 1:00 PM) • Grace Allowance: <strong>Up to 8:45 AM</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceModalEmployee(selectedEmp)}
                      className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Interactive Edit Mode
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-blue-300 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-blue-600 text-white font-bold">
                        <th colSpan={6} className="py-2 px-3 text-center border-r border-blue-400">Attendance List</th>
                        <th className="py-2 px-2 text-center border-r border-blue-400">Late (Mins)</th>
                        <th className="py-2 px-2 text-center border-r border-blue-400">Absent</th>
                        <th className="py-2 px-2 text-center border-r border-blue-400">Early Out</th>
                        <th className="py-2 px-2 text-center border-r border-blue-400">Holiday Pay</th>
                        <th className="py-2 px-2 text-center">Night Diff</th>
                      </tr>
                      <tr className="bg-blue-50 text-blue-950 font-bold text-[11px] border-b border-blue-200">
                        <th className="py-1.5 px-3 border-r border-blue-200">dd/ww</th>
                        <th className="py-1.5 px-2 text-center border-r border-blue-200">AM In</th>
                        <th className="py-1.5 px-2 text-center border-r border-blue-200">AM Out</th>
                        <th className="py-1.5 px-2 text-center border-r border-blue-200">PM In</th>
                        <th className="py-1.5 px-2 text-center border-r border-blue-200">PM Out</th>
                        <th className="py-1.5 px-2 text-center border-r border-blue-200">OT</th>
                        <th colSpan={5} className="py-1.5 px-2 text-center text-slate-500 font-normal italic">Auto-Calculated by Firm Rules</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewReport.records.map(r => (
                        <tr key={r.dayNum} className={r.isRestDay ? 'bg-slate-50/70 text-slate-400' : 'hover:bg-blue-50/30'}>
                          <td className="py-1.5 px-3 font-mono font-bold border-r border-slate-200">{r.ddWwLabel}</td>
                          <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200">{r.amIn || '-'}</td>
                          <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200">{r.amOut || '-'}</td>
                          <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200">{r.pmIn || '-'}</td>
                          <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200">{r.pmOut || '-'}</td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-emerald-700 border-r border-slate-200">{r.otHours > 0 ? `${r.otHours}h` : '-'}</td>
                          <td className={`py-1.5 px-2 text-center font-mono border-r border-slate-200 ${r.lateMinutes > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                            {r.lateMinutes > 0 ? `${r.lateMinutes}m` : '0'}
                          </td>
                          <td className={`py-1.5 px-2 text-center font-mono border-r border-slate-200 ${r.absent > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                            {r.absent > 0 ? '1' : '0'}
                          </td>
                          <td className={`py-1.5 px-2 text-center font-mono border-r border-slate-200 ${r.earlyOutMinutes > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                            {r.earlyOutMinutes > 0 ? `${r.earlyOutMinutes}m` : '0'}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200 text-indigo-700 font-bold">
                            {r.holidayPay > 0 ? `₱${r.holidayPay.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono text-purple-700 font-bold">
                            {r.nightDiffHours > 0 ? `${r.nightDiffHours}h` : '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold font-mono text-xs">
                        <td colSpan={5} className="py-2 px-3 text-right uppercase tracking-wider font-sans text-slate-300">Cutoff Aggregated Totals:</td>
                        <td className="py-2 px-2 text-center text-emerald-300">{previewReport.totalOtHours}h</td>
                        <td className="py-2 px-2 text-center text-amber-300">{previewReport.totalLateMinutes}m</td>
                        <td className="py-2 px-2 text-center text-rose-300">{previewReport.totalDaysAbsent}d</td>
                        <td className="py-2 px-2 text-center text-amber-300">{previewReport.totalEarlyOutMinutes}m</td>
                        <td className="py-2 px-2 text-center text-indigo-300">₱{previewReport.totalHolidayPay.toFixed(2)}</td>
                        <td className="py-2 px-2 text-center text-purple-300">{previewReport.totalNightDiffHours}h</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 6: DOLE & BIR REFERENCE CALCULATOR & INTERACTIVE SANDBOX */}
      {activeTab === 'calculator' && (
        <DolePayrollSandbox />
      )}

      {/* MODAL: CREATE NEW PAYROLL RUN CUTOFF BATCH */}
      {showNewRunModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-blue-600" />
                  Run New Internal Payroll Cutoff Batch
                </h3>
                <p className="text-xs text-slate-500">Input attendance, overtime hours, and allowances for active firm employees.</p>
              </div>
              <button onClick={() => setShowNewRunModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cutoff Label / Period</label>
                <input
                  type="text"
                  value={newRunPeriod}
                  onChange={e => setNewRunPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. August 1-15, 2026"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Period Type</label>
                <select
                  value={newRunPeriodType}
                  onChange={e => setNewRunPeriodType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="1st Half (1-15)">1st Half (1-15)</option>
                  <option value="2nd Half (16-30/31)">2nd Half (16-30/31)</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pay Release Date</label>
                <input
                  type="date"
                  value={newRunPayDate}
                  onChange={e => setNewRunPayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Timekeeping & Excel Upload Header Toolbar */}
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Timekeeping & Excel Attendance Upload
                </span>
                <p className="text-slate-600 text-[11px]">
                  Upload an Excel/CSV file with time-in/out logs, or enter shift times below to auto-calculate tardiness and overtime based on DOLE rules.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-100 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer text-[11px] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Sample Template (.xlsx)
                </button>

                <label className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer text-[11px] shadow-2xs transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload Excel Timekeeping
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleUploadTimekeepingExcel}
                  />
                </label>
              </div>
            </div>

            {/* Employee Timekeeping & Calculations Grid */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-800">Employee Attendance & Shift Timekeeping</h4>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {employees.filter(e => e.status === 'Active').map(emp => {
                  const inp = payrollInputs[emp.id] || {
                    daysWorked: 11,
                    daysAbsent: 0,
                    tardinessMinutes: 0,
                    undertimeMinutes: 0,
                    otRegularHours: 0,
                    otRestDayHours: 0,
                    otHolidayHours: 0,
                    nightDiffHours: 0,
                    otherAllowances: 0,
                    valeDeduction: 0,
                    otherDeductions: 0,
                    timeIn: '08:00 AM',
                    timeOut: '05:00 PM'
                  };

                  const computedItem = computedRunItems.find(i => i.employeeId === emp.id);

                  // Quick Shift Update function
                  const handleShiftTimeChange = (newIn: string, newOut: string) => {
                    const parsed = parseShiftTimes(newIn, newOut);
                    if (parsed) {
                      setPayrollInputs({
                        ...payrollInputs,
                        [emp.id]: {
                          ...inp,
                          timeIn: newIn,
                          timeOut: newOut,
                          tardinessMinutes: parsed.lateMinutes,
                          undertimeMinutes: parsed.undertimeMinutes,
                          otRegularHours: parsed.otHours
                        }
                      });
                    } else {
                      setPayrollInputs({
                        ...payrollInputs,
                        [emp.id]: { ...inp, timeIn: newIn, timeOut: newOut }
                      });
                    }
                  };

                  return (
                    <div key={emp.id} className="p-4 bg-white hover:bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div>
                          <strong className="text-slate-900 text-sm font-bold">{emp.fullName}</strong>
                          <span className="text-xs text-slate-500 ml-2">
                            ({emp.position}) • Rate: <strong className="text-blue-700 font-mono">₱{emp.dailyRate?.toFixed(2)}/day</strong> • Basic: <strong className="text-slate-800 font-mono">₱{emp.monthlyBasicSalary.toLocaleString()}</strong>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Calculated Net Pay</span>
                          <span className="text-sm font-bold text-emerald-600 font-mono">₱{computedItem?.netPay.toLocaleString() || '0.00'}</span>
                        </div>
                      </div>

                      {/* Time In / Time Out Shift Bar */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" /> Time In / Time Out:
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[10px] font-medium">In:</span>
                          <input
                            type="text"
                            value={inp.timeIn || '08:30 AM'}
                            onChange={e => handleShiftTimeChange(e.target.value, inp.timeOut || '05:30 PM')}
                            placeholder="08:30 AM"
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs font-bold text-center"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[10px] font-medium">Out:</span>
                          <input
                            type="text"
                            value={inp.timeOut || '05:30 PM'}
                            onChange={e => handleShiftTimeChange(inp.timeIn || '08:30 AM', e.target.value)}
                            placeholder="05:30 PM"
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs font-bold text-center"
                          />
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>Auto Tardiness: <strong className="text-amber-600 font-mono">{inp.tardinessMinutes}m</strong></span>
                          <span>Auto OT: <strong className="text-emerald-600 font-mono">{inp.otRegularHours}h</strong></span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAttendanceModalEmployee(emp)}
                          className="ml-auto px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <TableProperties className="w-3.5 h-3.5 text-indigo-700" />
                          Attendance Sheet / DTR
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Days Absent</label>
                          <input
                            type="number"
                            value={inp.daysAbsent}
                            onChange={e => setPayrollInputs({
                              ...payrollInputs,
                              [emp.id]: { ...inp, daysAbsent: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-rose-600 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Late (Minutes)</label>
                          <input
                            type="number"
                            value={inp.tardinessMinutes}
                            onChange={e => setPayrollInputs({
                              ...payrollInputs,
                              [emp.id]: { ...inp, tardinessMinutes: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-amber-600 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Reg. OT (Hours)</label>
                          <input
                            type="number"
                            value={inp.otRegularHours}
                            onChange={e => setPayrollInputs({
                              ...payrollInputs,
                              [emp.id]: { ...inp, otRegularHours: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-emerald-600 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Holiday OT (Hrs)</label>
                          <input
                            type="number"
                            value={inp.otHolidayHours}
                            onChange={e => setPayrollInputs({
                              ...payrollInputs,
                              [emp.id]: { ...inp, otHolidayHours: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-emerald-600 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Allowances (₱)</label>
                          <input
                            type="number"
                            value={inp.otherAllowances}
                            onChange={e => setPayrollInputs({
                              ...payrollInputs,
                              [emp.id]: { ...inp, otherAllowances: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Vale Ded. (₱)</label>
                          <input
                            type="number"
                            value={inp.valeDeduction}
                            onChange={e => setPayrollInputs({
                              ...payrollInputs,
                              [emp.id]: { ...inp, valeDeduction: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-amber-700 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary Footer Bar */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono">
              <div>
                <span>Batch Gross Total: <strong className="text-emerald-400">₱{totalGrossForNewRun.toLocaleString()}</strong></span>
                <span className="mx-3">|</span>
                <span>Total Deductions: <strong className="text-rose-400">₱{totalDeductionsForNewRun.toLocaleString()}</strong></span>
              </div>
              <div>
                <span className="text-sm font-bold font-sans">Total Net Payout: <strong className="text-emerald-300 text-base">₱{totalNetForNewRun.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => handleSavePayrollRun('Draft')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSavePayrollRun('Approved')}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Approve & Save Payroll Cutoff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL PRINTABLE PAYSLIP */}
      {showPayslipModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 my-8">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">OFFICIAL PAYSLIP</h2>
                <p className="text-xs text-slate-500">Internal Accounting Firm Staff Compensation Voucher</p>
              </div>
              <button onClick={() => setShowPayslipModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Payslip Header Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Employee Name</p>
                <p className="font-bold text-slate-900 text-sm">{showPayslipModal.item.employeeName}</p>
                <p className="text-slate-600">{showPayslipModal.item.position}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-[10px] uppercase font-bold">Pay Cutoff Period</p>
                <p className="font-bold text-blue-700 text-sm">{showPayslipModal.run.cutoffPeriod}</p>
                <p className="text-slate-600">Release Date: <strong className="font-mono">{showPayslipModal.run.payDate}</strong></p>
              </div>
            </div>

            {/* Earnings & Deductions Columns */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block border-b pb-1">Earnings</span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Basic Pay:</span>
                    <span>₱{showPayslipModal.item.semiMonthlyBasic.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Overtime Pay:</span>
                    <span>₱{(showPayslipModal.item.otRegularPay + showPayslipModal.item.otRestDayPay + showPayslipModal.item.otHolidayPay + showPayslipModal.item.nightDiffPay).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Allowances:</span>
                    <span>₱{showPayslipModal.item.otherAllowances.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold font-sans text-slate-900">
                    <span>Gross Pay:</span>
                    <span>₱{showPayslipModal.item.grossPay.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block border-b pb-1">Deductions</span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Absences & Lates:</span>
                    <span className="text-rose-600">-₱{(showPayslipModal.item.absencesDeduction + showPayslipModal.item.tardinessDeduction).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">SSS Contribution:</span>
                    <span>-₱{showPayslipModal.item.sssEE.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">PhilHealth:</span>
                    <span>-₱{showPayslipModal.item.philHealthEE.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Pag-IBIG:</span>
                    <span>-₱{showPayslipModal.item.pagIbigEE.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">BIR Withholding Tax:</span>
                    <span>-₱{showPayslipModal.item.birWithholdingTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Vale Deduction:</span>
                    <span className="text-amber-700 font-bold">-₱{showPayslipModal.item.valeDeduction.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold font-sans text-rose-700">
                    <span>Total Deductions:</span>
                    <span>-₱{showPayslipModal.item.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Payout Box */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center text-emerald-950">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block text-emerald-800">Net Take Home Pay</span>
                <span className="text-xs text-emerald-700">Direct Transfer to Bank / GCash</span>
              </div>
              <span className="text-2xl font-extrabold font-mono text-emerald-700">₱{showPayslipModal.item.netPay.toLocaleString()}</span>
            </div>

            {/* Signature Lines */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs text-center text-slate-500">
              <div>
                <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-800">{showPayslipModal.run.createdBy}</div>
                <span>Prepared By (HR / Accountant)</span>
              </div>
              <div>
                <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-800">{showPayslipModal.item.employeeName}</div>
                <span>Employee Signature Received</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Official Payslip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveEmployee} className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingEmployee ? 'Edit Internal Employee' : 'Add Internal Staff Member'}
              </h3>
              <button type="button" onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Employee No.</label>
                <input
                  type="text"
                  required
                  value={empForm.employeeNo}
                  onChange={e => setEmpForm({ ...empForm, employeeNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={empForm.fullName}
                  onChange={e => setEmpForm({ ...empForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Maria Teresa Santos"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Position / Title</label>
                <input
                  type="text"
                  required
                  value={empForm.position}
                  onChange={e => setEmpForm({ ...empForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monthly Basic Salary (₱)</label>
                <input
                  type="number"
                  required
                  value={empForm.monthlyBasicSalary}
                  onChange={e => {
                    const sal = Number(e.target.value);
                    const dRate = Number((sal / 21.75).toFixed(2));
                    const hRate = Number((dRate / 8).toFixed(2));
                    setEmpForm({
                      ...empForm,
                      monthlyBasicSalary: sal,
                      dailyRate: dRate,
                      hourlyRate: hRate
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Daily Rate (₱) <span className="text-[10px] text-slate-400 font-normal">(Manual Override)</span></label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={empForm.dailyRate}
                  onChange={e => {
                    const dRate = Number(e.target.value);
                    const hRate = Number((dRate / 8).toFixed(2));
                    setEmpForm({
                      ...empForm,
                      dailyRate: dRate,
                      hourlyRate: hRate
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hourly Rate (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={empForm.hourlyRate}
                  onChange={e => setEmpForm({ ...empForm, hourlyRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700"
                />
              </div>

              {/* Leave Numbers Section */}
              <div className="md:col-span-2 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-2">
                <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Employee Leave Credits & Balances (Days)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">SIL Balance (DOLE 5d)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={empForm.silBalance}
                      onChange={e => setEmpForm({ ...empForm, silBalance: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-bold font-mono text-blue-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Vacation Leave (VL)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={empForm.vlBalance}
                      onChange={e => setEmpForm({ ...empForm, vlBalance: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-bold font-mono text-purple-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Sick Leave (SL)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={empForm.slBalance}
                      onChange={e => setEmpForm({ ...empForm, slBalance: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-bold font-mono text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">TIN Number</label>
                <input
                  type="text"
                  value={empForm.tinNumber}
                  onChange={e => setEmpForm({ ...empForm, tinNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">SSS Number</label>
                <input
                  type="text"
                  value={empForm.sssNumber}
                  onChange={e => setEmpForm({ ...empForm, sssNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">PhilHealth Number</label>
                <input
                  type="text"
                  value={empForm.philhealthNumber}
                  onChange={e => setEmpForm({ ...empForm, philhealthNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pag-IBIG Number</label>
                <input
                  type="text"
                  value={empForm.pagibigNumber}
                  onChange={e => setEmpForm({ ...empForm, pagibigNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank Name / Wallet</label>
                <input
                  type="text"
                  value={empForm.bankName}
                  onChange={e => setEmpForm({ ...empForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. BDO Unibank, GCash"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={empForm.accountNumber}
                  onChange={e => setEmpForm({ ...empForm, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Save Employee Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: FILE LEAVE REQUEST */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveLeave} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">File Employee Leave</h3>
              <button type="button" onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Employee</label>
                <select
                  value={leaveForm.employeeId}
                  onChange={e => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName} ({e.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Service Incentive Leave (SIL)">Service Incentive Leave (SIL)</option>
                  <option value="Vacation Leave">Vacation Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
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
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  required
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Family trip, medical rest"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Approve & Save Leave
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ISSUE NEW VALE (CASH ADVANCE) */}
      {showValeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveVale} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">Issue Employee Cash Advance (Vale)</h3>
              <button type="button" onClick={() => setShowValeModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Employee</label>
                <select
                  value={valeForm.employeeId}
                  onChange={e => setValeForm({ ...valeForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName} ({e.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Given (₱)</label>
                <input
                  type="number"
                  required
                  value={valeForm.amountGiven}
                  onChange={e => setValeForm({ ...valeForm, amountGiven: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cutoff Installment Deduction (₱)</label>
                <input
                  type="number"
                  required
                  value={valeForm.cutoffDeductionAmount}
                  onChange={e => setValeForm({ ...valeForm, cutoffDeductionAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  placeholder="e.g. 500 or 1000 per payroll cutoff"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Purpose / Notes</label>
                <textarea
                  rows={2}
                  required
                  value={valeForm.purpose}
                  onChange={e => setValeForm({ ...valeForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Emergency family medical expense"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowValeModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Issue Cash Advance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ATTENDANCE & DTR REPORT MODAL (FFCSI FORMAT) ⭐ */}
      {attendanceModalEmployee && (
        <AttendanceReportModal
          employee={attendanceModalEmployee}
          cutoffPeriod={newRunPeriod}
          cutoffPeriodType={newRunPeriodType}
          onClose={() => setAttendanceModalEmployee(null)}
          onSyncToPayroll={(totals) => {
            const current = payrollInputs[attendanceModalEmployee.id] || {
              daysWorked: 11,
              daysAbsent: 0,
              tardinessMinutes: 0,
              undertimeMinutes: 0,
              otRegularHours: 0,
              otRestDayHours: 0,
              otHolidayHours: 0,
              nightDiffHours: 0,
              otherAllowances: 0,
              valeDeduction: 0,
              otherDeductions: 0
            };

            setPayrollInputs({
              ...payrollInputs,
              [attendanceModalEmployee.id]: {
                ...current,
                daysWorked: totals.daysWorked,
                daysAbsent: totals.daysAbsent,
                tardinessMinutes: totals.tardinessMinutes,
                undertimeMinutes: totals.undertimeMinutes,
                otRegularHours: totals.otRegularHours,
                otHolidayHours: totals.otHolidayHours,
                nightDiffHours: totals.nightDiffHours,
                otherAllowances: current.otherAllowances + (totals.holidayPayAmount || 0)
              }
            });
            alert(`Synced attendance metrics for ${attendanceModalEmployee.fullName} to payroll batch!`);
          }}
        />
      )}
    </div>
  );
};
