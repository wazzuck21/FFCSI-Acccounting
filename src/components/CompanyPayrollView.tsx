import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  CompanyEmployee, 
  EmploymentType,
  SalaryBasis,
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
import { ConsolidatedLeaveTracker } from './ConsolidatedLeaveTracker';
import { ConsolidatedValeTracker } from './ConsolidatedValeTracker';
import { 
  generateCutoffAttendance, 
  exportAttendanceReportToExcel,
  parseExceptionalsDTRWorkbook,
  saveCutoffAttendanceStore,
  downloadExceptionalsDTRTemplate,
  STANDARD_CUTOFF_PERIODS,
  inferPeriodDetails,
  ParsedDTRResult
} from '../utils/attendanceUtils';
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
  TableProperties,
  Sparkles,
  Check,
  GraduationCap,
  Briefcase,
  Filter,
  Layers,
  Info
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
    deleteLeaveRecord,
    addValeRecord,
    addValeRepayment,
    deleteValeRecord,
    addPayrollRun,
    updatePayrollRunStatus,
    deletePayrollRun,
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
  const [selectedAttCutoff, setSelectedAttCutoff] = useState<string>('August 16-31, 2026');
  const [selectedAttCutoffType, setSelectedAttCutoffType] = useState<'1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly'>('2nd Half (16-30/31)');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState<number>(0);

  // Listen to store updates for live instant sync across all tabs
  useEffect(() => {
    const handleAttUpdated = () => {
      setAttendanceRefreshKey(k => k + 1);
    };
    window.addEventListener('afms_attendance_updated', handleAttUpdated);
    return () => window.removeEventListener('afms_attendance_updated', handleAttUpdated);
  }, []);

  // 360° Employee Profile & Cross-Tab Modals ⭐
  const [profileModalEmployee, setProfileModalEmployee] = useState<CompanyEmployee | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<'overview' | 'leaves' | 'vale' | 'payroll'>('overview');
  const [repaymentModalVale, setRepaymentModalVale] = useState<ValeRecord | null>(null);
  const [manualRepaymentAmount, setManualRepaymentAmount] = useState<number>(500);
  const [manualRepaymentRemarks, setManualRepaymentRemarks] = useState<string>('Direct Cash Return / Repayment');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Biometric / Exceptionals DTR Import State ⭐
  const [dtrReviewModalResult, setDtrReviewModalResult] = useState<ParsedDTRResult | null>(null);
  const [dtrReviewSelectedEmpIdx, setDtrReviewSelectedEmpIdx] = useState<number>(0);
  const [dtrUploadSuccessMsg, setDtrUploadSuccessMsg] = useState<string | null>(null);

  // Form states for New Payroll Run
  const [newRunPeriod, setNewRunPeriod] = useState('August 16-31, 2026');
  const [newRunPeriodType, setNewRunPeriodType] = useState<'1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly'>('2nd Half (16-30/31)');
  const [newRunPayDate, setNewRunPayDate] = useState('2026-08-31');
  const [isCustomNewRunPeriod, setIsCustomNewRunPeriod] = useState<boolean>(false);
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

  // Employee Form State (Supports Monthly Fixed, OJT Daily Allowance, and Temp Daily No Work No Pay)
  const [empForm, setEmpForm] = useState<Omit<CompanyEmployee, 'id'>>({
    employeeNo: `EMP-00${employees.length + 1}`,
    fullName: '',
    position: 'Tax Accountant',
    department: 'Tax & Audit',
    dateHired: new Date().toISOString().split('T')[0],
    employmentType: 'Regular',
    salaryBasis: 'Monthly Fixed',
    monthlyBasicSalary: 25000,
    dailyRate: 1136.36, // 25,000 / 22
    hourlyRate: 142.05, // 1136.36 / 8
    isNoWorkNoPay: false,
    exemptFromStatutory: false,
    schoolOrUniversity: '',
    internshipRequiredHours: 400,
    internshipRenderedHours: 0,
    supervisorMentor: '',
    contractEndDate: '',
    dailyAllowance: 0,
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

  // Filter & Search states for Employee Directory ⭐
  const [empFilterCategory, setEmpFilterCategory] = useState<'All' | 'Regular & Prob' | 'OJT / Intern' | 'Temp / Daily Paid' | 'Active' | 'On Leave'>('All');
  const [empSearchQuery, setEmpSearchQuery] = useState('');

  // Helper to initialize new staff form with presets
  const handleOpenAddEmployee = (presetType: EmploymentType = 'Regular') => {
    setEditingEmployee(null);
    const nextEmpNo = `EMP-00${employees.length + 1}`;
    
    if (presetType === 'OJT / Intern') {
      setEmpForm({
        employeeNo: nextEmpNo,
        fullName: '',
        position: 'OJT Tax & Audit Intern',
        department: 'Tax & Audit',
        dateHired: new Date().toISOString().split('T')[0],
        employmentType: 'OJT / Intern',
        salaryBasis: 'OJT / Daily Allowance',
        isNoWorkNoPay: true,
        exemptFromStatutory: true,
        schoolOrUniversity: '',
        internshipRequiredHours: 400,
        internshipRenderedHours: 0,
        supervisorMentor: employees.find(e => e.position.includes('Senior') || e.position.includes('Partner'))?.fullName || '',
        contractEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dailyAllowance: 0,
        monthlyBasicSalary: 9900, // 450 * 22 estimated
        dailyRate: 450.00,
        hourlyRate: 56.25,
        tinNumber: 'Pending (OJT Trainee)',
        sssNumber: 'Exempt (DOLE Trainee)',
        philhealthNumber: 'Exempt (DOLE Trainee)',
        pagibigNumber: 'Exempt (DOLE Trainee)',
        bankName: 'GCash',
        accountNumber: '',
        status: 'Active',
        silBalance: 0,
        vlBalance: 0,
        slBalance: 0,
        currentValeBalance: 0,
        defaultValeDeduction: 0
      });
    } else if (presetType === 'Temp / Daily Paid') {
      setEmpForm({
        employeeNo: nextEmpNo,
        fullName: '',
        position: 'Temp Bookkeeper / Data Encoder',
        department: 'Accounting',
        dateHired: new Date().toISOString().split('T')[0],
        employmentType: 'Temp / Daily Paid',
        salaryBasis: 'Daily (No Work, No Pay)',
        isNoWorkNoPay: true,
        exemptFromStatutory: false,
        schoolOrUniversity: '',
        internshipRequiredHours: 0,
        internshipRenderedHours: 0,
        supervisorMentor: '',
        contractEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dailyAllowance: 0,
        monthlyBasicSalary: 14190, // 645 * 22
        dailyRate: 645.00, // NCR Statutory Daily Minimum Wage
        hourlyRate: 80.63,
        tinNumber: '',
        sssNumber: '',
        philhealthNumber: '',
        pagibigNumber: '',
        bankName: 'BDO Unibank',
        accountNumber: '',
        status: 'Active',
        silBalance: 0,
        vlBalance: 0,
        slBalance: 0,
        currentValeBalance: 0,
        defaultValeDeduction: 0
      });
    } else {
      setEmpForm({
        employeeNo: nextEmpNo,
        fullName: '',
        position: presetType === 'Probationary' ? 'Junior Bookkeeper / Audit Staff' : 'Tax Accountant',
        department: 'Tax & Audit',
        dateHired: new Date().toISOString().split('T')[0],
        employmentType: presetType,
        salaryBasis: 'Monthly Fixed',
        monthlyBasicSalary: 25000,
        dailyRate: 1149.43,
        hourlyRate: 143.68,
        isNoWorkNoPay: false,
        exemptFromStatutory: false,
        schoolOrUniversity: '',
        internshipRequiredHours: 0,
        internshipRenderedHours: 0,
        supervisorMentor: '',
        contractEndDate: '',
        dailyAllowance: 0,
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
    }
    setShowEmployeeModal(true);
  };

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
  const [valeForm, setValeForm] = useState<{
    employeeId: string;
    amountGiven: number;
    dateGiven: string;
    purpose: string;
    cutoffDeductionAmount: number;
    advanceType: 'Cash Advance' | 'Vale';
  }>({
    employeeId: employees[0]?.id || '',
    amountGiven: 2000,
    dateGiven: new Date().toISOString().split('T')[0],
    purpose: '',
    cutoffDeductionAmount: 500,
    advanceType: 'Cash Advance'
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

  // Upload and parse Exceptionals/Biometric DTR Excel File (supports raw DTR.png format with multi-employee sheets/tables) ⭐
  const handleUploadBiometricDTRFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const parsedResult = parseExceptionalsDTRWorkbook(wb, employees, leaveRecords);
        if (parsedResult.matchedReports.length > 0) {
          setDtrReviewModalResult(parsedResult);
          setDtrReviewSelectedEmpIdx(0);
        } else {
          alert('Could not detect Exceptionals DTR logs in the uploaded file. Please ensure it contains attendance logs with date/time stamps or employee names.');
        }
      } catch (err) {
        console.error('Error parsing Exceptionals DTR file:', err);
        alert('Failed to parse DTR file. Please verify file format (.xlsx, .xls, or .csv).');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Apply parsed DTR result to Cutoff Attendance & Live Payroll Run inputs
  const handleApplyDTRReview = () => {
    if (!dtrReviewModalResult) return;

    // 1. Set cutoff period and type
    setSelectedAttCutoff(dtrReviewModalResult.detectedCutoffPeriod);
    setSelectedAttCutoffType(dtrReviewModalResult.periodType);
    setNewRunPeriod(dtrReviewModalResult.detectedCutoffPeriod);
    setNewRunPeriodType(dtrReviewModalResult.periodType);

    // 2. Select first matched employee
    if (dtrReviewModalResult.matchedReports[0]) {
      setSelectedAttEmployeeId(dtrReviewModalResult.matchedReports[0].employeeId);
    }

    // 3. Save into cutoff attendance store
    saveCutoffAttendanceStore(dtrReviewModalResult.matchedReports);

    // 4. Update payrollInputs map so the payroll run reflects these exact DTR numbers
    const updatedInputs = { ...payrollInputs };
    dtrReviewModalResult.matchedReports.forEach(rep => {
      const activeVale = valeRecords.find(v => v.employeeId === rep.employeeId && v.status === 'Active');
      const emp = employees.find(e => e.id === rep.employeeId);
      const valeDed = activeVale 
        ? Math.min(activeVale.remainingBalance, (emp?.defaultValeDeduction) || activeVale.cutoffDeductionAmount || 500) 
        : 0;

      updatedInputs[rep.employeeId] = {
        daysWorked: rep.totalDaysWorked,
        daysAbsent: rep.totalDaysAbsent,
        tardinessMinutes: rep.totalLateMinutes,
        undertimeMinutes: rep.totalEarlyOutMinutes,
        otRegularHours: rep.totalOtHours,
        otRestDayHours: 0,
        otHolidayHours: rep.totalHolidayHours,
        nightDiffHours: rep.totalNightDiffHours,
        otherAllowances: Number(rep.totalHolidayPay.toFixed(2)),
        valeDeduction: valeDed,
        otherDeductions: 0,
        timeIn: '08:30 AM',
        timeOut: '05:30 PM'
      };
    });
    setPayrollInputs(updatedInputs);

    const msg = `⚡ DTR Timesheets successfully applied! Detected Cutoff: ${dtrReviewModalResult.detectedCutoffPeriod}. Synced ${dtrReviewModalResult.matchedReports.length} employee records with DOLE rules (8:45 AM grace period, overtime, undertime, absences).`;
    setDtrUploadSuccessMsg(msg);
    setTimeout(() => setDtrUploadSuccessMsg(null), 8000);

    setDtrReviewModalResult(null);
  };

  // Upload & Parse Timekeeping Excel / CSV File (supports Exceptionals DTR & Standard Formats)
  const handleUploadTimekeepingExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // First check if it matches Exceptionals DTR layout
        const parsedDTR = parseExceptionalsDTRWorkbook(wb, employees, leaveRecords);
        if (parsedDTR.matchedReports.length > 0) {
          saveCutoffAttendanceStore(parsedDTR.matchedReports);
          setNewRunPeriod(parsedDTR.detectedCutoffPeriod);
          setNewRunPeriodType(parsedDTR.periodType);
          setSelectedAttCutoff(parsedDTR.detectedCutoffPeriod);
          setSelectedAttCutoffType(parsedDTR.periodType);

          const updatedInputs = { ...payrollInputs };
          parsedDTR.matchedReports.forEach(rep => {
            const activeVale = valeRecords.find(v => v.employeeId === rep.employeeId && v.status === 'Active');
            const emp = employees.find(e => e.id === rep.employeeId);
            const valeDed = activeVale 
              ? Math.min(activeVale.remainingBalance, (emp?.defaultValeDeduction) || activeVale.cutoffDeductionAmount || 500) 
              : 0;

            updatedInputs[rep.employeeId] = {
              daysWorked: rep.totalDaysWorked,
              daysAbsent: rep.totalDaysAbsent,
              tardinessMinutes: rep.totalLateMinutes,
              undertimeMinutes: rep.totalEarlyOutMinutes,
              otRegularHours: rep.totalOtHours,
              otRestDayHours: 0,
              otHolidayHours: rep.totalHolidayHours,
              nightDiffHours: rep.totalNightDiffHours,
              otherAllowances: Number(rep.totalHolidayPay.toFixed(2)),
              valeDeduction: valeDed,
              otherDeductions: 0,
              timeIn: '08:30 AM',
              timeOut: '05:30 PM'
            };
          });

          setPayrollInputs(updatedInputs);
          alert(`Successfully imported Exceptionals DTR for ${parsedDTR.matchedReports.length} employee(s)! Cutoff: ${parsedDTR.detectedCutoffPeriod}`);
          return;
        }

        // Fallback: Standard tabular sheet
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

  // Synchronize Payroll Inputs directly from Timekeeping/DTR, Leaves, and Vale Ledgers ⭐
  const syncPayrollInputsFromAttendanceAndLedgers = (
    period: string = newRunPeriod,
    periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly' = newRunPeriodType
  ) => {
    const syncedMap: Record<string, any> = {};
    const activeEmps = employees.filter(e => e.status === 'Active');

    activeEmps.forEach(emp => {
      // Pull live computed cutoff attendance incorporating leave records
      const attReport = generateCutoffAttendance(emp, period, periodType, undefined, undefined, leaveRecords);
      
      // Pull active vale record and current cutoff deduction
      const activeVale = valeRecords.find(v => v.employeeId === emp.id && v.status === 'Active');
      const valeDed = activeVale 
        ? Math.min(activeVale.remainingBalance, emp.defaultValeDeduction || activeVale.cutoffDeductionAmount || 500) 
        : 0;

      syncedMap[emp.id] = {
        daysWorked: attReport.totalDaysWorked,
        daysAbsent: attReport.totalDaysAbsent,
        tardinessMinutes: attReport.totalLateMinutes,
        undertimeMinutes: attReport.totalEarlyOutMinutes,
        otRegularHours: attReport.totalOtHours,
        otRestDayHours: 0,
        otHolidayHours: attReport.totalHolidayHours,
        nightDiffHours: attReport.totalNightDiffHours,
        otherAllowances: Number(attReport.totalHolidayPay.toFixed(2)),
        valeDeduction: valeDed,
        otherDeductions: 0,
        timeIn: '08:30 AM',
        timeOut: '05:30 PM'
      };
    });

    setPayrollInputs(syncedMap);
    setSyncSuccessMsg(`⚡ Successfully synchronized data for ${activeEmps.length} employee(s) from Timekeeping DTR, Approved Leaves, and Vale Ledgers!`);
    setTimeout(() => setSyncSuccessMsg(null), 6000);
    return activeEmps.length;
  };

  // Initialize Payroll Input map when opening modal with auto-sync
  const handleOpenNewRunModal = () => {
    const isStandard = STANDARD_CUTOFF_PERIODS.some(o => o.period === newRunPeriod);
    setIsCustomNewRunPeriod(!isStandard);
    syncPayrollInputsFromAttendanceAndLedgers(newRunPeriod, newRunPeriodType);
    setShowNewRunModal(true);
  };

  // Push Attendance tab selection directly to create a new payroll run
  const handlePushAttendanceToPayrollRun = () => {
    setNewRunPeriod(selectedAttCutoff);
    setNewRunPeriodType(selectedAttCutoffType);
    const details = inferPeriodDetails(selectedAttCutoff);
    setNewRunPayDate(details.defaultPayDate);
    const isStandard = STANDARD_CUTOFF_PERIODS.some(o => o.period === selectedAttCutoff);
    setIsCustomNewRunPeriod(!isStandard);
    syncPayrollInputsFromAttendanceAndLedgers(selectedAttCutoff, selectedAttCutoffType);
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
        employmentType: emp.employmentType,
        salaryBasis: emp.salaryBasis,
        isNoWorkNoPay: emp.isNoWorkNoPay,
        exemptFromStatutory: emp.exemptFromStatutory,
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
    const emp = isAdmin
      ? employees.find(e => e.id === leaveForm.employeeId)
      : (loggedInEmployee || employees.find(e => e.id === leaveForm.employeeId));
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

    setShowLeaveModal(false);
  };

  const handleSaveManualRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentModalVale) return;

    const amt = Number(manualRepaymentAmount);
    if (amt <= 0) {
      alert('Please enter a valid repayment amount greater than 0.');
      return;
    }

    addValeRepayment(
      repaymentModalVale.id,
      Math.min(amt, repaymentModalVale.remainingBalance),
      manualRepaymentRemarks || 'Manual Direct Repayment'
    );

    setRepaymentModalVale(null);
  };

  const handleSaveVale = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = isAdmin
      ? employees.find(e => e.id === valeForm.employeeId)
      : (loggedInEmployee || employees.find(e => e.id === valeForm.employeeId));
    if (!emp) return;

    const isCA = valeForm.advanceType === 'Cash Advance';
    const effectiveDeduction = isCA ? Number(valeForm.amountGiven) : Number(valeForm.cutoffDeductionAmount);

    addValeRecord({
      employeeId: emp.id,
      employeeName: emp.fullName,
      amountGiven: Number(valeForm.amountGiven),
      dateGiven: valeForm.dateGiven,
      purpose: valeForm.purpose,
      cutoffDeductionAmount: effectiveDeduction,
      remainingBalance: Number(valeForm.amountGiven),
      advanceType: valeForm.advanceType,
      repaymentMode: isCA ? 'Full Next Cutoff' : 'Installment'
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

  // Filtered Employees for Directory with Search & Category filters ⭐
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Category filter
      if (empFilterCategory === 'Regular & Prob' && !(emp.employmentType === 'Regular' || emp.employmentType === 'Probationary')) return false;
      if (empFilterCategory === 'OJT / Intern' && emp.employmentType !== 'OJT / Intern') return false;
      if (empFilterCategory === 'Temp / Daily Paid' && emp.employmentType !== 'Temp / Daily Paid') return false;
      if (empFilterCategory === 'Active' && emp.status !== 'Active') return false;
      if (empFilterCategory === 'On Leave' && emp.status !== 'On Leave') return false;

      // Search query
      if (empSearchQuery.trim()) {
        const q = empSearchQuery.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchNo = emp.employeeNo.toLowerCase().includes(q);
        const matchPos = emp.position.toLowerCase().includes(q);
        const matchDept = emp.department.toLowerCase().includes(q);
        const matchSchool = emp.schoolOrUniversity?.toLowerCase().includes(q) || false;
        const matchType = emp.employmentType.toLowerCase().includes(q);
        return matchName || matchNo || matchPos || matchDept || matchSchool || matchType;
      }
      return true;
    });
  }, [employees, empFilterCategory, empSearchQuery]);

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
  } = usePagination(filteredEmployees, {
    initialPageSize: 15,
    resetOnChange: filteredEmployees.length,
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Internal Accounting Firm Employee Roster</h3>
              </div>
              <p className="text-xs text-slate-500">
                Manage firm personnel, monthly basic salaries, OJT / Intern trainee allowances, temporary daily-paid staff (No Work, No Pay), and government statutory profiles.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenAddEmployee('OJT / Intern')}
                className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Add OJT Student Trainee with Daily Allowance & No Work No Pay Setup"
              >
                <GraduationCap className="w-4 h-4 text-purple-600" /> + Add OJT / Intern
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddEmployee('Temp / Daily Paid')}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Add Temporary / Contractual Daily-Paid Staff (No Work, No Pay)"
              >
                <Clock className="w-4 h-4 text-amber-600" /> + Add Temp / Daily Staff
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddEmployee('Regular')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Regular Staff
              </button>
            </div>
          </div>

          {/* Search & Filter Bar ⭐ */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setEmpFilterCategory('All')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  empFilterCategory === 'All'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Staff ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setEmpFilterCategory('Regular & Prob')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  empFilterCategory === 'Regular & Prob'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Regular & Prob ({employees.filter(e => e.employmentType === 'Regular' || e.employmentType === 'Probationary').length})
              </button>
              <button
                type="button"
                onClick={() => setEmpFilterCategory('OJT / Intern')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  empFilterCategory === 'OJT / Intern'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                OJT / Interns ({employees.filter(e => e.employmentType === 'OJT / Intern').length})
              </button>
              <button
                type="button"
                onClick={() => setEmpFilterCategory('Temp / Daily Paid')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  empFilterCategory === 'Temp / Daily Paid'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Temp / Daily Paid ({employees.filter(e => e.employmentType === 'Temp / Daily Paid').length})
              </button>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, position, school..."
                value={empSearchQuery}
                onChange={e => setEmpSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
              {empSearchQuery && (
                <button
                  type="button"
                  onClick={() => setEmpSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Roster Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedEmployees.map(emp => {
              const isOJT = emp.employmentType === 'OJT / Intern';
              const isTemp = emp.employmentType === 'Temp / Daily Paid';
              const isNoWorkNoPay = Boolean(emp.isNoWorkNoPay || isOJT || isTemp);

              return (
                <div 
                  key={emp.id} 
                  className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-md transition-all ${
                    isOJT 
                      ? 'border-purple-200 ring-1 ring-purple-100' 
                      : isTemp 
                      ? 'border-amber-200 ring-1 ring-amber-100' 
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {emp.employeeNo}
                        </span>
                        {isOJT ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" /> OJT Trainee
                          </span>
                        ) : isTemp ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Temp Daily Paid
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {emp.employmentType}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-1.5">{emp.fullName}</h4>
                      <p className="text-xs text-slate-500">{emp.position} • <span className="text-slate-700">{emp.department}</span></p>
                      
                      {isOJT && emp.schoolOrUniversity && (
                        <p className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center gap-1">
                          <span>🏫</span> {emp.schoolOrUniversity}
                        </p>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {emp.status}
                    </span>
                  </div>

                  {/* Compensation Card */}
                  <div className={`rounded-xl p-3 border text-xs space-y-1 font-mono ${
                    isOJT 
                      ? 'bg-purple-50/50 border-purple-100' 
                      : isTemp 
                      ? 'bg-amber-50/50 border-amber-100' 
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    {isNoWorkNoPay ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-sans font-bold flex items-center gap-1">
                            {isOJT ? 'Daily Trainee Allowance:' : 'Daily Wage Rate:'}
                          </span>
                          <span className="font-bold text-base text-slate-900">
                            ₱{emp.dailyRate.toFixed(2)}<span className="text-[10px] text-slate-500 font-normal">/day</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] pt-0.5 text-slate-500">
                          <span className="font-sans">Pay Policy:</span>
                          <span className="font-bold text-rose-700 font-sans">No Work, No Pay</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span className="font-sans">Hourly Rate (8h):</span>
                          <span className="text-slate-700">₱{emp.hourlyRate.toFixed(2)}/hr</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span className="font-sans">Est. Monthly (22d):</span>
                          <span className="text-slate-700">₱{emp.monthlyBasicSalary.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-sans">Monthly Basic:</span>
                          <span className="font-bold text-base text-slate-900">₱{emp.monthlyBasicSalary.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-sans">Daily Rate (21.75):</span>
                          <span className="text-slate-700">₱{emp.dailyRate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-sans">Hourly Rate (8h):</span>
                          <span className="text-slate-700">₱{emp.hourlyRate.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Special Trainee / Temp or Statutory IDs details */}
                  <div className="text-[11px] space-y-1 text-slate-600">
                    {isOJT ? (
                      <>
                        <p className="flex justify-between">
                          <strong className="text-slate-800">Internship Hours:</strong> 
                          <span className="font-mono text-purple-800 font-bold">{emp.internshipRenderedHours || 0} / {emp.internshipRequiredHours || 400} hrs</span>
                        </p>
                        {emp.supervisorMentor && (
                          <p><strong className="text-slate-800">Mentor:</strong> {emp.supervisorMentor}</p>
                        )}
                        <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ DOLE/CHED Trainee Rule (Statutory Exempt)
                        </p>
                        <p><strong className="text-slate-800">Payout Account:</strong> {emp.bankName} - {emp.accountNumber || 'Pending'}</p>
                      </>
                    ) : (
                      <>
                        <p><strong className="text-slate-800">TIN:</strong> {emp.tinNumber || 'N/A'}</p>
                        <p><strong className="text-slate-800">SSS:</strong> {emp.sssNumber || 'N/A'}</p>
                        <p><strong className="text-slate-800">PhilHealth:</strong> {emp.philhealthNumber || 'N/A'}</p>
                        <p><strong className="text-slate-800">Pag-IBIG:</strong> {emp.pagibigNumber || 'N/A'}</p>
                        <p><strong className="text-slate-800">Bank / Payout:</strong> {emp.bankName} - {emp.accountNumber || 'N/A'}</p>
                        {isTemp && emp.contractEndDate && (
                          <p><strong className="text-slate-800">Contract End Date:</strong> {emp.contractEndDate}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Balances (for regular/prob staff) */}
                  {!isOJT && (
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
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-amber-700 font-bold">Vale Balance: ₱{(emp.currentValeBalance || 0).toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileModalEmployee(emp);
                        setProfileModalTab('overview');
                      }}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" /> 360° Profile
                    </button>
                  </div>

                  {/* Cross-Tab Quick Actions Bar ⭐ */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAttEmployeeId(emp.id);
                        setActiveTab('attendance');
                      }}
                      className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold rounded border border-slate-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center"
                      title="View Cutoff DTR Timesheet"
                    >
                      <TableProperties className="w-3.5 h-3.5 text-blue-600" />
                      <span>DTR Sheet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLeaveForm(prev => ({ ...prev, employeeId: emp.id }));
                        setShowLeaveModal(true);
                      }}
                      className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold rounded border border-slate-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center"
                      title="File Leave for this Employee"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>File Leave</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setValeForm(prev => ({ ...prev, employeeId: emp.id }));
                        setShowValeModal(true);
                      }}
                      className="p-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-semibold rounded border border-slate-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center"
                      title="Issue Vale Cash Advance"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                      <span>Issue Vale</span>
                    </button>

                    <div className="flex items-center justify-center gap-1 bg-slate-50 rounded border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEmployee(emp);
                          setEmpForm(emp);
                          setShowEmployeeModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded cursor-pointer"
                        title="Edit Salary & Info"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete employee ${emp.fullName}?`)) {
                            deleteEmployee(emp.id);
                          }
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* TAB 3: CONSOLIDATED LEAVE TRACKER (SIL / VL / SL) */}
      {activeTab === 'leaves' && (
        <ConsolidatedLeaveTracker onNavigateToPayroll={() => setActiveTab('payroll')} />
      )}

      {/* TAB 4: CONSOLIDATED VALE TRACKER (CASH ADVANCES) */}
      {activeTab === 'vale' && (
        <ConsolidatedValeTracker onNavigateToPayroll={() => setActiveTab('payroll')} />
      )}

      {/* TAB 5: ATTENDANCE & DTR REPORTS (MATCHING FFCSI ATTENDANCE FORMAT) ⭐ */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
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
              {/* Cutoff Date Dropdown */}
              <div className="flex items-center gap-2 bg-blue-50/80 px-3 py-2 rounded-xl border border-blue-200 shadow-2xs">
                <Calendar className="w-4 h-4 text-blue-700" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Payroll Cutoff</span>
                  <select
                    value={selectedAttCutoff}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAttCutoff(val);
                      const details = inferPeriodDetails(val);
                      setSelectedAttCutoffType(details.periodType);
                    }}
                    className="bg-transparent font-bold text-xs text-blue-950 focus:outline-none cursor-pointer pr-2"
                  >
                    <optgroup label="⭐ Current & Upcoming Cutoffs">
                      {STANDARD_CUTOFF_PERIODS.filter(o => o.isCurrent || o.monthName === 'August' || o.monthName === 'September').map(o => (
                        <option key={`att_curr_${o.period}`} value={o.period}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="📅 2026 Semi-Monthly Cutoffs">
                      {STANDARD_CUTOFF_PERIODS.filter(o => o.periodType !== 'Monthly').map(o => (
                        <option key={`att_semi_${o.period}`} value={o.period}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="📊 Monthly Full Cutoffs">
                      {STANDARD_CUTOFF_PERIODS.filter(o => o.periodType === 'Monthly').map(o => (
                        <option key={`att_m_${o.period}`} value={o.period}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>

                    {!STANDARD_CUTOFF_PERIODS.some(o => o.period === selectedAttCutoff) && (
                      <option value={selectedAttCutoff}>{selectedAttCutoff}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Upload Biometric / Exceptionals DTR Excel ⭐ */}
              <label className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all">
                <Upload className="w-4 h-4" /> Upload Biometric DTR (Excel)
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleUploadBiometricDTRFile}
                />
              </label>

              {/* Download Exceptionals Template (.xlsx) */}
              <button
                type="button"
                onClick={downloadExceptionalsDTRTemplate}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Download sample Excel matching biometric/exceptionals DTR structure"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Download DTR Template
              </button>

              {/* Sync to Payroll Button ⭐ */}
              <button
                type="button"
                onClick={handlePushAttendanceToPayrollRun}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Create Payroll Run from this DTR
              </button>

              <button
                type="button"
                onClick={() => {
                  const emp = employees.find(e => e.id === selectedAttEmployeeId) || employees.filter(e => e.status === 'Active')[0] || employees[0];
                  if (emp) {
                    const rep = generateCutoffAttendance(emp, selectedAttCutoff, selectedAttCutoffType, undefined, undefined, leaveRecords);
                    exportAttendanceReportToExcel(rep);
                  }
                }}
                className="px-3 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4 text-emerald-600" /> Export Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  const emp = employees.find(e => e.id === selectedAttEmployeeId) || employees.filter(e => e.status === 'Active')[0] || employees[0];
                  if (emp) setAttendanceModalEmployee(emp);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <TableProperties className="w-4 h-4" /> Full DTR Grid Modal
              </button>
            </div>
          </div>

          {/* DTR Upload Success Notification Banner */}
          {dtrUploadSuccessMsg && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{dtrUploadSuccessMsg}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setDtrUploadSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

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
                        setSelectedAttEmployeeId(emp.id);
                        setAttendanceModalEmployee(emp);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 text-[11px] cursor-pointer"
                    >
                      View & Edit DTR <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Preview Table of Selected Employee */}
          {(() => {
            const selectedEmp = employees.find(e => e.id === selectedAttEmployeeId) || employees.filter(e => e.status === 'Active')[0] || employees[0];
            if (!selectedEmp) return null;
            // Evaluates with attendanceRefreshKey to ensure instant reactivity on any edit
            const previewReport = generateCutoffAttendance(selectedEmp, selectedAttCutoff, selectedAttCutoffType, undefined, undefined, leaveRecords);

            return (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <TableProperties className="w-4 h-4 text-blue-600" />
                      Attendance Sheet: <span className="text-blue-700">{selectedEmp.fullName}</span> ({selectedEmp.employeeNo})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cutoff: <strong className="text-slate-800">{selectedAttCutoff}</strong> • Standard Shift: <strong>8:30 AM - 5:30 PM</strong> (1h Break: 12:00 PM - 1:00 PM) • Grace Allowance: <strong>Up to 8:45 AM</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceModalEmployee(selectedEmp)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Interactive Edit Mode (Time In / Out)
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
                        <tr 
                          key={r.dayNum} 
                          onClick={() => setAttendanceModalEmployee(selectedEmp)}
                          className={`cursor-pointer transition-colors ${r.isRestDay ? 'bg-slate-50/70 text-slate-400' : 'hover:bg-blue-50/40'}`}
                          title="Click row to open interactive DTR editor"
                        >
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
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block">Cutoff Label / Period</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomNewRunPeriod(!isCustomNewRunPeriod)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {isCustomNewRunPeriod ? '← Select from List' : '+ Custom Entry'}
                  </button>
                </div>

                {!isCustomNewRunPeriod ? (
                  <select
                    value={newRunPeriod}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setIsCustomNewRunPeriod(true);
                        return;
                      }
                      setNewRunPeriod(val);
                      const details = inferPeriodDetails(val);
                      setNewRunPeriodType(details.periodType);
                      setNewRunPayDate(details.defaultPayDate);
                      syncPayrollInputsFromAttendanceAndLedgers(val, details.periodType);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-2xs"
                  >
                    <optgroup label="⭐ Current & Upcoming Cutoffs">
                      {STANDARD_CUTOFF_PERIODS.filter(o => o.isCurrent || o.monthName === 'August' || o.monthName === 'September').map(o => (
                        <option key={`run_curr_${o.period}`} value={o.period}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="📅 2026 Semi-Monthly Cutoffs">
                      {STANDARD_CUTOFF_PERIODS.filter(o => o.periodType !== 'Monthly').map(o => (
                        <option key={`run_semi_${o.period}`} value={o.period}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="📊 Monthly Full Cutoffs">
                      {STANDARD_CUTOFF_PERIODS.filter(o => o.periodType === 'Monthly').map(o => (
                        <option key={`run_m_${o.period}`} value={o.period}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>

                    {!STANDARD_CUTOFF_PERIODS.some(o => o.period === newRunPeriod) && (
                      <option value={newRunPeriod}>{newRunPeriod}</option>
                    )}

                    <option value="__custom__">✏️ Custom / Other Cutoff Period...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newRunPeriod}
                    onChange={e => {
                      const val = e.target.value;
                      setNewRunPeriod(val);
                      const details = inferPeriodDetails(val);
                      setNewRunPeriodType(details.periodType);
                    }}
                    className="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. August 16-31, 2026 or Special Cutoff"
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Period Type</label>
                <select
                  value={newRunPeriodType}
                  onChange={e => {
                    const newType = e.target.value as any;
                    setNewRunPeriodType(newType);
                    syncPayrollInputsFromAttendanceAndLedgers(newRunPeriod, newType);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Timekeeping, Sync & Excel Upload Header Toolbar */}
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Integrated Timekeeping, Leave, & Vale Auto-Sync
                </span>
                <p className="text-slate-600 text-[11px]">
                  Values are synchronized with DTR attendance timesheets, approved leaves, and active vale loan installment deductions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => syncPayrollInputsFromAttendanceAndLedgers(newRunPeriod, newRunPeriodType)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer text-[11px] shadow-xs transition-all"
                  title="Pull latest hours, leaves, and vale deductions from all tabs"
                >
                  <Clock className="w-3.5 h-3.5" /> ⚡ Auto-Sync All Tabs
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-100 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer text-[11px] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Sample Template (.xlsx)
                </button>

                <label className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer text-[11px] shadow-2xs transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload Excel DTR
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleUploadTimekeepingExcel}
                  />
                </label>
              </div>
            </div>

            {/* Sync Confirmation Banner ⭐ */}
            {syncSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-semibold flex items-center justify-between">
                <span>{syncSuccessMsg}</span>
                <button type="button" onClick={() => setSyncSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 ml-2">✕</button>
              </div>
            )}

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

                  const isOJT = emp.employmentType === 'OJT / Intern';
                  const isTemp = emp.employmentType === 'Temp / Daily Paid';
                  const isNoWorkNoPay = Boolean(emp.isNoWorkNoPay || isOJT || isTemp);

                  return (
                    <div key={emp.id} className="p-4 bg-white hover:bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-slate-900 text-sm font-bold">{emp.fullName}</strong>
                            {isOJT ? (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> OJT Trainee (Daily Allowance)
                              </span>
                            ) : isTemp ? (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Temp Daily Paid (No Work No Pay)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                {emp.employmentType}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                            <span>{emp.position}</span>
                            <span>•</span>
                            <span>Rate: <strong className="text-blue-700 font-mono">₱{emp.dailyRate?.toFixed(2)}/day</strong></span>
                            <span>•</span>
                            {isNoWorkNoPay ? (
                              <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Policy: Actual Days Worked × ₱{emp.dailyRate?.toFixed(2)}
                              </span>
                            ) : (
                              <span>Basic: <strong className="text-slate-800 font-mono">₱{emp.monthlyBasicSalary.toLocaleString()}</strong></span>
                            )}
                            {emp.exemptFromStatutory && (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                                ✓ Statutory Exempt
                              </span>
                            )}
                          </div>
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

                      <div className="grid grid-cols-2 md:grid-cols-7 gap-2.5 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-blue-700 block">
                            Days Worked {isNoWorkNoPay ? '⭐' : ''}
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={inp.daysWorked}
                            onChange={e => setPayrollInputs({
                              ...payrollInputs,
                              [emp.id]: { ...inp, daysWorked: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 border border-blue-300 bg-blue-50/40 rounded font-mono text-blue-800 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Days Absent</label>
                          <input
                            type="number"
                            step="0.5"
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
          <form onSubmit={handleSaveEmployee} className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  empForm.employmentType === 'OJT / Intern' 
                    ? 'bg-purple-100 text-purple-700' 
                    : empForm.employmentType === 'Temp / Daily Paid'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {empForm.employmentType === 'OJT / Intern' ? (
                    <GraduationCap className="w-5 h-5" />
                  ) : empForm.employmentType === 'Temp / Daily Paid' ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingEmployee ? `Edit Employee: ${editingEmployee.fullName}` : 'Add Internal Accounting Firm Staff'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {empForm.employmentType === 'OJT / Intern' 
                      ? 'Student Intern / Trainee Allowance setup (Daily No Work, No Pay • Statutory Exempt)' 
                      : empForm.employmentType === 'Temp / Daily Paid'
                      ? 'Temporary / Daily-Paid Staff setup (Daily No Work, No Pay • Daily Minimum/Project Wage)'
                      : 'Configure employee credentials, monthly basic salary, and statutory IDs.'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Employment Category Quick Tabs */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 text-xs block">Employment Type & Work Agreement</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: 'Regular' as EmploymentType, label: 'Regular Staff', icon: Users, desc: 'Monthly Fixed Base' },
                  { type: 'Probationary' as EmploymentType, label: 'Probationary', icon: Briefcase, desc: 'Monthly Fixed Base' },
                  { type: 'OJT / Intern' as EmploymentType, label: '🎓 OJT / Intern', icon: GraduationCap, desc: 'Daily Allowance (No Work No Pay)' },
                  { type: 'Temp / Daily Paid' as EmploymentType, label: '⏱️ Temp / Daily Staff', icon: Clock, desc: 'Daily Wage (No Work No Pay)' },
                ].map(tab => {
                  const isSelected = empForm.employmentType === tab.type;
                  return (
                    <button
                      key={tab.type}
                      type="button"
                      onClick={() => {
                        const nextBasis: SalaryBasis = 
                          tab.type === 'OJT / Intern' 
                            ? 'OJT / Daily Allowance' 
                            : tab.type === 'Temp / Daily Paid'
                            ? 'Daily (No Work, No Pay)'
                            : 'Monthly Fixed';
                        const isNoWork = tab.type === 'OJT / Intern' || tab.type === 'Temp / Daily Paid';
                        const isExempt = tab.type === 'OJT / Intern';

                        let newDaily = empForm.dailyRate;
                        let newMonthly = empForm.monthlyBasicSalary;

                        if (tab.type === 'OJT / Intern' && (!empForm.dailyRate || empForm.dailyRate > 600)) {
                          newDaily = 450.00;
                          newMonthly = 9900;
                        } else if (tab.type === 'Temp / Daily Paid' && (!empForm.dailyRate || empForm.dailyRate < 500)) {
                          newDaily = 645.00;
                          newMonthly = 14190;
                        }

                        setEmpForm({
                          ...empForm,
                          employmentType: tab.type,
                          salaryBasis: nextBasis,
                          isNoWorkNoPay: isNoWork,
                          exemptFromStatutory: isExempt,
                          dailyRate: newDaily,
                          hourlyRate: Number((newDaily / 8).toFixed(2)),
                          monthlyBasicSalary: newMonthly,
                          sssNumber: isExempt ? 'Exempt (DOLE Trainee)' : empForm.sssNumber === 'Exempt (DOLE Trainee)' ? '' : empForm.sssNumber,
                          philhealthNumber: isExempt ? 'Exempt (DOLE Trainee)' : empForm.philhealthNumber === 'Exempt (DOLE Trainee)' ? '' : empForm.philhealthNumber,
                          pagibigNumber: isExempt ? 'Exempt (DOLE Trainee)' : empForm.pagibigNumber === 'Exempt (DOLE Trainee)' ? '' : empForm.pagibigNumber,
                          silBalance: isNoWork ? 0 : 5,
                          vlBalance: isNoWork ? 0 : 10,
                          slBalance: isNoWork ? 0 : 8
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected 
                          ? tab.type === 'OJT / Intern'
                            ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200'
                            : tab.type === 'Temp / Daily Paid'
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                            : 'bg-blue-50 border-blue-600 ring-2 ring-blue-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <span>{tab.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{tab.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Employee No.</label>
                <input
                  type="text"
                  required
                  value={empForm.employeeNo}
                  onChange={e => setEmpForm({ ...empForm, employeeNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Full Legal Name</label>
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
                  placeholder="e.g. OJT Tax Associate"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Department</label>
                <select
                  value={empForm.department}
                  onChange={e => setEmpForm({ ...empForm, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Tax & Audit">Tax & Audit</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Management Advisory">Management Advisory</option>
                  <option value="Payroll & Compliance">Payroll & Compliance</option>
                  <option value="Admin & Support">Admin & Support</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Date Hired / Start Date</label>
                <input
                  type="date"
                  required
                  value={empForm.dateHired}
                  onChange={e => setEmpForm({ ...empForm, dateHired: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Compensation & Salary Setup Box */}
            <div className={`p-4 rounded-xl border space-y-3 text-xs ${
              empForm.isNoWorkNoPay || empForm.employmentType === 'OJT / Intern' || empForm.employmentType === 'Temp / Daily Paid'
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  {empForm.employmentType === 'OJT / Intern' 
                    ? 'OJT Daily Stipend / Allowance Configuration (No Work, No Pay)' 
                    : empForm.employmentType === 'Temp / Daily Paid'
                    ? 'Temporary Staff Daily Wage Setup (No Work, No Pay)'
                    : 'Salary & Rate Configuration'}
                </span>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(empForm.isNoWorkNoPay)}
                      onChange={e => setEmpForm({ ...empForm, isNoWorkNoPay: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Daily No Work, No Pay Policy</span>
                  </label>
                </div>
              </div>

              {/* No Work No Pay Notice Banner */}
              {(empForm.isNoWorkNoPay || empForm.employmentType === 'OJT / Intern' || empForm.employmentType === 'Temp / Daily Paid') && (
                <div className="bg-amber-100/70 border border-amber-300 text-amber-900 p-2.5 rounded-lg text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block">DOLE "No Work, No Pay" Computation Active:</strong>
                    <span>In every payroll cutoff, basic earnings are calculated strictly as <code>Days Worked × Daily Rate</code>. Unworked days and absences are not included in base compensation.</span>
                  </div>
                </div>
              )}

              {/* Quick Rate Presets */}
              {(empForm.employmentType === 'OJT / Intern' || empForm.employmentType === 'Temp / Daily Paid') && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-bold">Quick Presets:</span>
                  {empForm.employmentType === 'OJT / Intern' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const d = 350;
                          setEmpForm({
                            ...empForm,
                            dailyRate: d,
                            hourlyRate: Number((d / 8).toFixed(2)),
                            monthlyBasicSalary: d * 22
                          });
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded font-mono font-bold cursor-pointer"
                      >
                        ₱350/day (Basic OJT)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = 450;
                          setEmpForm({
                            ...empForm,
                            dailyRate: d,
                            hourlyRate: Number((d / 8).toFixed(2)),
                            monthlyBasicSalary: d * 22
                          });
                        }}
                        className="px-2 py-0.5 bg-purple-600 text-white rounded font-mono font-bold cursor-pointer"
                      >
                        ₱450/day (Standard Trainee)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = 550;
                          setEmpForm({
                            ...empForm,
                            dailyRate: d,
                            hourlyRate: Number((d / 8).toFixed(2)),
                            monthlyBasicSalary: d * 22
                          });
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded font-mono font-bold cursor-pointer"
                      >
                        ₱550/day (Senior Intern)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const d = 645;
                          setEmpForm({
                            ...empForm,
                            dailyRate: d,
                            hourlyRate: Number((d / 8).toFixed(2)),
                            monthlyBasicSalary: d * 22
                          });
                        }}
                        className="px-2 py-0.5 bg-amber-600 text-white rounded font-mono font-bold cursor-pointer"
                      >
                        ₱645/day (NCR Statutory Min Wage)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = 500;
                          setEmpForm({
                            ...empForm,
                            dailyRate: d,
                            hourlyRate: Number((d / 8).toFixed(2)),
                            monthlyBasicSalary: d * 22
                          });
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-mono font-bold cursor-pointer"
                      >
                        ₱500/day (Provincial Rate)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = 750;
                          setEmpForm({
                            ...empForm,
                            dailyRate: d,
                            hourlyRate: Number((d / 8).toFixed(2)),
                            monthlyBasicSalary: d * 22
                          });
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-mono font-bold cursor-pointer"
                      >
                        ₱750/day (Skilled Temp Accountant)
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Rate Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {empForm.employmentType === 'OJT / Intern' 
                      ? 'Daily Allowance / Stipend (₱)' 
                      : empForm.employmentType === 'Temp / Daily Paid' || empForm.isNoWorkNoPay
                      ? 'Daily Rate (₱) [Primary Base]'
                      : 'Daily Rate (₱) (Manual Override)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={empForm.dailyRate}
                    onChange={e => {
                      const dRate = Number(e.target.value);
                      const hRate = Number((dRate / 8).toFixed(2));
                      const mSal = Number((dRate * 22).toFixed(2));
                      setEmpForm({
                        ...empForm,
                        dailyRate: dRate,
                        hourlyRate: hRate,
                        monthlyBasicSalary: mSal
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 text-base"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Hourly Rate (₱) <span className="text-[10px] text-slate-400 font-normal">(Daily ÷ 8h)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={empForm.hourlyRate}
                    onChange={e => setEmpForm({ ...empForm, hourlyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {empForm.isNoWorkNoPay || empForm.employmentType === 'OJT / Intern' || empForm.employmentType === 'Temp / Daily Paid'
                      ? 'Est. Monthly Equivalent (22d)'
                      : 'Monthly Basic Salary (₱)'}
                  </label>
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* OJT / Academic Specific Details (Conditional) */}
            {empForm.employmentType === 'OJT / Intern' && (
              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 space-y-3 text-xs">
                <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-700" /> Academic Institution & Internship Tracking
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-purple-900 block mb-1">School / University</label>
                    <input
                      type="text"
                      value={empForm.schoolOrUniversity || ''}
                      onChange={e => setEmpForm({ ...empForm, schoolOrUniversity: e.target.value })}
                      placeholder="e.g. UST - AMV College of Accountancy"
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-purple-900 block mb-1">Required Practicum Hours</label>
                    <input
                      type="number"
                      value={empForm.internshipRequiredHours || 400}
                      onChange={e => setEmpForm({ ...empForm, internshipRequiredHours: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-purple-900 block mb-1">Assigned Mentor / Supervisor</label>
                    <input
                      type="text"
                      value={empForm.supervisorMentor || ''}
                      onChange={e => setEmpForm({ ...empForm, supervisorMentor: e.target.value })}
                      placeholder="e.g. Maria Santos, CPA"
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-200/80 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-purple-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(empForm.exemptFromStatutory)}
                      onChange={e => setEmpForm({ ...empForm, exemptFromStatutory: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Exempt from SSS, PhilHealth, Pag-IBIG & BIR Withholding Tax (DOLE/CHED Trainee Stipend Rule)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Temporary Staff Specifics (Conditional) */}
            {empForm.employmentType === 'Temp / Daily Paid' && (
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3 text-xs">
                <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" /> Temporary Engagement Terms
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Contract / Project End Date</label>
                    <input
                      type="date"
                      value={empForm.contractEndDate || ''}
                      onChange={e => setEmpForm({ ...empForm, contractEndDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Statutory Exemption</label>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-amber-900 cursor-pointer mt-2 bg-white p-2 rounded border border-amber-200">
                      <input
                        type="checkbox"
                        checked={Boolean(empForm.exemptFromStatutory)}
                        onChange={e => setEmpForm({ ...empForm, exemptFromStatutory: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Exempt from Statutory Deductions (Short-term / Consultant)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Statutory & Payout Info Section */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 text-xs block">Government Statutory IDs & Payout Bank</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">TIN Number</label>
                  <input
                    type="text"
                    value={empForm.tinNumber}
                    onChange={e => setEmpForm({ ...empForm, tinNumber: e.target.value })}
                    placeholder="e.g. 123-456-789-000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">SSS Number</label>
                  <input
                    type="text"
                    value={empForm.sssNumber}
                    onChange={e => setEmpForm({ ...empForm, sssNumber: e.target.value })}
                    placeholder={empForm.exemptFromStatutory ? 'Exempt' : 'e.g. 04-1234567-8'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">PhilHealth Number</label>
                  <input
                    type="text"
                    value={empForm.philhealthNumber}
                    onChange={e => setEmpForm({ ...empForm, philhealthNumber: e.target.value })}
                    placeholder={empForm.exemptFromStatutory ? 'Exempt' : 'e.g. 12-345678901-2'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pag-IBIG Number</label>
                  <input
                    type="text"
                    value={empForm.pagibigNumber}
                    onChange={e => setEmpForm({ ...empForm, pagibigNumber: e.target.value })}
                    placeholder={empForm.exemptFromStatutory ? 'Exempt' : 'e.g. 1234-5678-9012'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payout Channel / Bank</label>
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
                    placeholder="e.g. 0012-3456-7890"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Leave Numbers Section (For Regular/Probationary) */}
            {empForm.employmentType !== 'OJT / Intern' && (
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-2">
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
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer transition-colors"
              >
                {editingEmployee ? 'Update Employee Record' : 'Save New Employee Record'}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">Employee *</label>
                  {!isAdmin && (
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      <span>🔒</span> Default (Logged-in User)
                    </span>
                  )}
                </div>
                {isAdmin ? (
                  <select
                    value={leaveForm.employeeId}
                    onChange={e => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.position})</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>{loggedInEmployee?.fullName || currentUser?.fullName} ({loggedInEmployee?.position || 'Staff Member'})</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">Current User</span>
                  </div>
                )}
                {!isAdmin && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Only administrators are authorized to select and file leave on behalf of other team members.
                  </p>
                )}
              </div>

              {/* Live Leave Balance Preview ⭐ */}
              {(() => {
                const selectedEmp = employees.find(e => e.id === leaveForm.employeeId);
                if (!selectedEmp) return null;
                return (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-1">
                    <span className="text-[11px] font-bold text-blue-900 block">Current Available Leave Credits:</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="bg-white p-1.5 rounded border border-blue-100 font-mono">
                        <span className="text-slate-500 font-sans block">SIL</span>
                        <strong className="text-blue-700">{selectedEmp.silBalance} days</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-blue-100 font-mono">
                        <span className="text-slate-500 font-sans block">VL</span>
                        <strong className="text-purple-700">{selectedEmp.vlBalance} days</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-blue-100 font-mono">
                        <span className="text-slate-500 font-sans block">SL</span>
                        <strong className="text-emerald-700">{selectedEmp.slBalance} days</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Service Incentive Leave (SIL)">Service Incentive Leave (SIL - DOLE 5 Days)</option>
                  <option value="Vacation Leave">Vacation Leave (VL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Days</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={leaveForm.totalDays}
                    onChange={e => setLeaveForm({ ...leaveForm, totalDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Compensation</label>
                  <select
                    value={leaveForm.isPaid ? 'paid' : 'unpaid'}
                    onChange={e => setLeaveForm({ ...leaveForm, isPaid: e.target.value === 'paid' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="paid">Paid Leave (Deducts Balance)</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
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
                    const emp = employees.find(e => e.id === valeForm.employeeId);
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">Employee *</label>
                  {!isAdmin && (
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      <span>🔒</span> Default (Logged-in User)
                    </span>
                  )}
                </div>
                {isAdmin ? (
                  <select
                    value={valeForm.employeeId}
                    onChange={e => setValeForm({ ...valeForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.position})</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>{loggedInEmployee?.fullName || currentUser?.fullName} ({loggedInEmployee?.position || 'Staff Member'})</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">Current User</span>
                  </div>
                )}
                {!isAdmin && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Only administrators are authorized to select and issue cash advances on behalf of other team members.
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Given (₱) *</label>
                <input
                  type="number"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {valeForm.advanceType === 'Cash Advance' ? 'Immediate Next Cutoff Deduction (₱)' : 'Cutoff Installment Deduction (₱)'} *
                  </label>
                  {valeForm.advanceType === 'Cash Advance' && (
                    <span className="text-[10px] text-indigo-700 font-bold">100% Next Cutoff</span>
                  )}
                </div>
                <input
                  type="number"
                  required
                  disabled={valeForm.advanceType === 'Cash Advance'}
                  value={valeForm.advanceType === 'Cash Advance' ? valeForm.amountGiven : valeForm.cutoffDeductionAmount}
                  onChange={e => setValeForm({ ...valeForm, cutoffDeductionAmount: Number(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono ${
                    valeForm.advanceType === 'Cash Advance'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 cursor-not-allowed font-bold'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="e.g. 500 or 1000 per payroll cutoff"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {valeForm.advanceType === 'Cash Advance'
                    ? '100% full amount will be deducted on the immediate next payroll cutoff.'
                    : 'Deducted automatically across payroll cutoffs until fully amortized.'}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Purpose / Notes</label>
                <textarea
                  rows={2}
                  required
                  value={valeForm.purpose}
                  onChange={e => setValeForm({ ...valeForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder={valeForm.advanceType === 'Cash Advance' ? 'e.g. Immediate bridge cash advance (full next cutoff)' : 'e.g. Emergency family medical expense'}
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

      {/* MODAL: MANUAL VALE REPAYMENT ⭐ */}
      {repaymentModalVale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveManualRepayment} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Record Vale Repayment</h3>
                <p className="text-xs text-slate-500">{repaymentModalVale.employeeName}</p>
              </div>
              <button type="button" onClick={() => setRepaymentModalVale(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-amber-800">Original Advance:</span>
                <span className="font-bold font-mono">₱{repaymentModalVale.amountGiven.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800">Remaining Balance:</span>
                <span className="font-bold font-mono text-rose-700 text-sm">₱{repaymentModalVale.remainingBalance.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Repayment Amount (₱)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={repaymentModalVale.remainingBalance}
                  value={manualRepaymentAmount}
                  onChange={e => setManualRepaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remarks / Note</label>
                <input
                  type="text"
                  value={manualRepaymentRemarks}
                  onChange={e => setManualRepaymentRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Direct cash return, check payment"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRepaymentModalVale(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Confirm Repayment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: 360° EMPLOYEE PROFILE (ALL-TAB SYNC VIEW) ⭐ */}
      {profileModalEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto my-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {profileModalEmployee.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{profileModalEmployee.employeeNo}</span>
                    <h3 className="font-bold text-lg text-slate-900">{profileModalEmployee.fullName}</h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">{profileModalEmployee.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{profileModalEmployee.position} • {profileModalEmployee.department} • Hired: {profileModalEmployee.dateHired}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingEmployee(profileModalEmployee);
                    setEmpForm(profileModalEmployee);
                    setProfileModalEmployee(null);
                    setShowEmployeeModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Info
                </button>
                <button type="button" onClick={() => setProfileModalEmployee(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Profile Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                onClick={() => setProfileModalTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${profileModalTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Overview & Rates
              </button>
              <button
                onClick={() => setProfileModalTab('leaves')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${profileModalTab === 'leaves' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Leaves ({leaveRecords.filter(l => l.employeeId === profileModalEmployee.id).length})
              </button>
              <button
                onClick={() => setProfileModalTab('vale')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${profileModalTab === 'vale' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Vale Ledger ({valeRecords.filter(v => v.employeeId === profileModalEmployee.id).length})
              </button>
              <button
                onClick={() => setProfileModalTab('payroll')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${profileModalTab === 'payroll' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Payslip History
              </button>
            </div>

            {/* Profile Tab 1: Overview & Rates */}
            {profileModalTab === 'overview' && (
              <div className="space-y-4 text-xs">
                {/* OJT Academic & Internship Highlight Box */}
                {profileModalEmployee.employmentType === 'OJT / Intern' && (
                  <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-200 text-purple-800 rounded-lg">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-purple-950 text-sm block">Academic Internship & DOLE Trainee Setup</strong>
                          <span className="text-purple-700 text-[11px]">{profileModalEmployee.schoolOrUniversity || 'Accredited Academic Partner'}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-200 text-purple-900 text-[10px] font-bold rounded-full">
                        Daily Stipend: ₱{profileModalEmployee.dailyRate?.toFixed(2)}/day
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-purple-200/80 text-[11px]">
                      <div>
                        <span className="text-purple-600 block">Required Hours:</span>
                        <strong className="text-purple-950 font-mono text-xs">{profileModalEmployee.internshipRequiredHours || 400} Hours</strong>
                      </div>
                      <div>
                        <span className="text-purple-600 block">Rendered Hours:</span>
                        <strong className="text-purple-950 font-mono text-xs">{profileModalEmployee.internshipRenderedHours || 0} Hours</strong>
                      </div>
                      <div>
                        <span className="text-purple-600 block">Faculty / Mentor:</span>
                        <strong className="text-purple-950 text-xs">{profileModalEmployee.supervisorMentor || 'Supervising CPA'}</strong>
                      </div>
                    </div>

                    {/* Hours Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-purple-700 font-semibold">
                        <span>Practicum Progress</span>
                        <span>
                          {Math.round(((profileModalEmployee.internshipRenderedHours || 0) / (profileModalEmployee.internshipRequiredHours || 400)) * 100)}% Completed
                        </span>
                      </div>
                      <div className="w-full bg-purple-200/80 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round(((profileModalEmployee.internshipRenderedHours || 0) / (profileModalEmployee.internshipRequiredHours || 400)) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Temp Staff Engagement Box */}
                {profileModalEmployee.employmentType === 'Temp / Daily Paid' && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-amber-950 text-sm block">Temporary Staff Engagement</strong>
                          <span className="text-amber-800">Compensated strictly on Daily "No Work, No Pay" basis</span>
                        </div>
                      </div>
                      {profileModalEmployee.contractEndDate && (
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-full">
                          Contract End: {profileModalEmployee.contractEndDate}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] text-slate-500 font-bold uppercase">Basic Compensation</span>
                    <p className="font-mono text-base font-bold text-slate-900">
                      {profileModalEmployee.isNoWorkNoPay || profileModalEmployee.employmentType === 'OJT / Intern' || profileModalEmployee.employmentType === 'Temp / Daily Paid'
                        ? `₱${profileModalEmployee.dailyRate.toFixed(2)}/day`
                        : `₱${profileModalEmployee.monthlyBasicSalary.toLocaleString()}`}
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono">Daily Rate: ₱{profileModalEmployee.dailyRate.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-600 font-mono">Hourly: ₱{profileModalEmployee.hourlyRate.toFixed(2)}</p>
                    <p className="text-[10px] text-amber-700 font-bold">
                      {profileModalEmployee.isNoWorkNoPay || profileModalEmployee.employmentType === 'OJT / Intern' || profileModalEmployee.employmentType === 'Temp / Daily Paid'
                        ? '• Policy: Daily No Work, No Pay'
                        : '• Fixed Monthly Base'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] text-slate-500 font-bold uppercase">Government & Tax IDs</span>
                    <p className="text-slate-700">TIN: <strong className="font-mono">{profileModalEmployee.tinNumber || 'N/A'}</strong></p>
                    <p className="text-slate-700">SSS: <strong className="font-mono">{profileModalEmployee.sssNumber || (profileModalEmployee.exemptFromStatutory ? 'Exempt' : 'N/A')}</strong></p>
                    <p className="text-slate-700">PhilHealth: <strong className="font-mono">{profileModalEmployee.philhealthNumber || (profileModalEmployee.exemptFromStatutory ? 'Exempt' : 'N/A')}</strong></p>
                    <p className="text-slate-700">Pag-IBIG: <strong className="font-mono">{profileModalEmployee.pagibigNumber || (profileModalEmployee.exemptFromStatutory ? 'Exempt' : 'N/A')}</strong></p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] text-slate-500 font-bold uppercase">Payout Banking</span>
                    <p className="font-bold text-slate-800">{profileModalEmployee.bankName}</p>
                    <p className="text-slate-600 font-mono">Acc: {profileModalEmployee.accountNumber || 'N/A'}</p>
                    <p className="text-amber-700 font-bold pt-1">Vale Balance: ₱{(profileModalEmployee.currentValeBalance || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <strong className="text-blue-950 font-bold">Cutoff Attendance & DTR Timesheet</strong>
                    <p className="text-slate-600 text-[11px]">View full daily in/out records, automated overtime, tardiness, and holiday pay for this employee.</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAttEmployeeId(profileModalEmployee.id);
                      setProfileModalEmployee(null);
                      setActiveTab('attendance');
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <TableProperties className="w-3.5 h-3.5" /> Open DTR
                  </button>
                </div>
              </div>
            )}

            {/* Profile Tab 2: Leaves */}
            {profileModalTab === 'leaves' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                    <span className="text-slate-500 text-[11px] block font-bold">Service Incentive Leave (SIL)</span>
                    <span className="text-lg font-bold text-blue-700">{profileModalEmployee.silBalance} days</span>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                    <span className="text-slate-500 text-[11px] block font-bold">Vacation Leave (VL)</span>
                    <span className="text-lg font-bold text-purple-700">{profileModalEmployee.vlBalance} days</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-slate-500 text-[11px] block font-bold">Sick Leave (SL)</span>
                    <span className="text-lg font-bold text-emerald-700">{profileModalEmployee.slBalance} days</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-800">Leave History</strong>
                    <button
                      onClick={() => {
                        setLeaveForm(prev => ({ ...prev, employeeId: profileModalEmployee.id }));
                        setShowLeaveModal(true);
                      }}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      + File Leave
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {leaveRecords.filter(l => l.employeeId === profileModalEmployee.id).map(leave => (
                      <div key={leave.id} className="p-3 bg-white flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-800">{leave.leaveType}</strong>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {leave.status}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">{leave.startDate} to {leave.endDate} ({leave.totalDays}d)</span>
                          </div>
                          <p className="text-slate-500 italic text-[11px] mt-0.5">"{leave.reason}"</p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Cancel/Delete this leave record? Deducted balance will be refunded.`)) {
                              deleteLeaveRecord(leave.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete Leave"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {leaveRecords.filter(l => l.employeeId === profileModalEmployee.id).length === 0 && (
                      <div className="p-4 text-center text-slate-400 text-xs">No leave records filed yet for this employee.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab 3: Vale */}
            {profileModalTab === 'vale' && (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-800">Cash Advances & Repayment History</strong>
                  <button
                    onClick={() => {
                      setValeForm(prev => ({ ...prev, employeeId: profileModalEmployee.id }));
                      setShowValeModal(true);
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    + Issue New Vale
                  </button>
                </div>

                <div className="space-y-3">
                  {valeRecords.filter(v => v.employeeId === profileModalEmployee.id).map(vale => (
                    <div key={vale.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Advance: ₱{vale.amountGiven.toLocaleString()} (Issued: {vale.dateGiven})</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${vale.status === 'Active' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {vale.status} (Bal: ₱{vale.remainingBalance.toLocaleString()})
                          </span>
                          {vale.status === 'Active' && (
                            <button
                              onClick={() => {
                                setRepaymentModalVale(vale);
                                setManualRepaymentAmount(Math.min(vale.remainingBalance, vale.cutoffDeductionAmount || 500));
                              }}
                              className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Repay
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 italic">Purpose: "{vale.purpose}" • Cutoff Deduction: ₱{vale.cutoffDeductionAmount.toLocaleString()}</p>
                      
                      {vale.repayments.length > 0 && (
                        <div className="border-t border-slate-200 pt-1.5 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Repayment Log:</span>
                          {vale.repayments.map(rep => (
                            <div key={rep.id} className="flex justify-between text-[11px] text-slate-700 font-mono">
                              <span>{rep.date} • {rep.remarks}</span>
                              <strong className="text-emerald-700">-₱{rep.amountPaid.toLocaleString()}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {valeRecords.filter(v => v.employeeId === profileModalEmployee.id).length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs border border-slate-200 rounded-xl">No vale advances recorded for this employee.</div>
                  )}
                </div>
              </div>
            )}

            {/* Profile Tab 4: Payslip History */}
            {profileModalTab === 'payroll' && (
              <div className="space-y-3 text-xs">
                <strong className="text-slate-800 block">Historical Processed Payslips</strong>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {payrollRuns.map(run => {
                    const item = run.items.find(i => i.employeeId === profileModalEmployee.id);
                    if (!item) return null;
                    return (
                      <div key={run.id} className="p-3 bg-white flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <strong className="text-slate-800">{run.cutoffPeriod}</strong>
                          <span className="text-slate-500 ml-2">Pay Date: {run.payDate} • Status: {run.status}</span>
                          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                            Gross: ₱{item.grossPay.toLocaleString()} | Ded: ₱{item.totalDeductions.toLocaleString()} | <strong className="text-emerald-700">Net: ₱{item.netPay.toLocaleString()}</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowPayslipModal({ run, item });
                            setProfileModalEmployee(null);
                          }}
                          className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-lg text-xs hover:bg-blue-100 cursor-pointer"
                        >
                          View Payslip
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DTR IMPORT & SYNC REVIEW MODAL ⭐ */}
      {dtrReviewModalResult && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col border border-slate-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Biometric Excel Import Engine
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    DOLE Grace Period Applied (Up to 8:45 AM) • Standard 8:30 AM - 5:30 PM
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  DTR Import & Timesheet Review
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detected Cutoff: <strong className="text-blue-700">{dtrReviewModalResult.detectedCutoffPeriod}</strong> • Processed <strong className="text-slate-800">{dtrReviewModalResult.totalParsedRows}</strong> log entries across <strong className="text-slate-800">{dtrReviewModalResult.matchedReports.length}</strong> employee(s).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDtrReviewModalResult(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Employee Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto shrink-0">
              {dtrReviewModalResult.matchedReports.map((rep, idx) => (
                <button
                  key={rep.employeeId || idx}
                  type="button"
                  onClick={() => setDtrReviewSelectedEmpIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    dtrReviewSelectedEmpIdx === idx
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{rep.employeeName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    dtrReviewSelectedEmpIdx === idx ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {rep.employeeNo}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Employee Timesheet Preview */}
            {(() => {
              const currentRep = dtrReviewModalResult.matchedReports[dtrReviewSelectedEmpIdx] || dtrReviewModalResult.matchedReports[0];
              if (!currentRep) return null;

              return (
                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Days Worked</span>
                      <span className="text-lg font-black text-blue-900">{currentRep.totalDaysWorked} days</span>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Late (Tardiness)</span>
                      <span className="text-lg font-black text-amber-900">{currentRep.totalLateMinutes} mins</span>
                      <span className="text-[9px] text-amber-700 block">After 8:45 AM grace</span>
                    </div>
                    <div className="bg-rose-50/70 border border-rose-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Absences</span>
                      <span className="text-lg font-black text-rose-900">{currentRep.totalDaysAbsent} day(s)</span>
                    </div>
                    <div className="bg-purple-50/70 border border-purple-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Undertime</span>
                      <span className="text-lg font-black text-purple-900">{currentRep.totalEarlyOutMinutes} mins</span>
                    </div>
                    <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Regular OT</span>
                      <span className="text-lg font-black text-emerald-900">{currentRep.totalOtHours} hrs</span>
                      <span className="text-[9px] text-emerald-700 block">Past 5:30 PM</span>
                    </div>
                    <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Holiday Pay</span>
                      <span className="text-lg font-black text-indigo-900">₱{currentRep.totalHolidayPay.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Daily Records Grid */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800 text-white text-[11px] font-bold">
                          <th className="py-2 px-3 border-r border-slate-700">Date / Day</th>
                          <th className="py-2 px-2 text-center border-r border-slate-700">AM In</th>
                          <th className="py-2 px-2 text-center border-r border-slate-700">AM Out</th>
                          <th className="py-2 px-2 text-center border-r border-slate-700">PM In</th>
                          <th className="py-2 px-2 text-center border-r border-slate-700">PM Out</th>
                          <th className="py-2 px-2 text-center border-r border-slate-700">Late (Mins)</th>
                          <th className="py-2 px-2 text-center border-r border-slate-700">Early Out</th>
                          <th className="py-2 px-2 text-center border-r border-slate-700">OT (Hrs)</th>
                          <th className="py-2 px-2 text-center">Status / Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {currentRep.records.map((r, rIdx) => {
                          const isAbsent = !r.isRestDay && !r.amIn && !r.pmIn;
                          const isLate = r.lateMinutes > 0;
                          const isOT = r.otHours > 0;

                          return (
                            <tr 
                              key={r.dayNum || rIdx} 
                              className={`hover:bg-slate-50 transition-colors ${
                                r.isRestDay ? 'bg-slate-50/50 text-slate-400' : ''
                              }`}
                            >
                              <td className="py-1.5 px-3 font-sans font-bold border-r border-slate-100 text-slate-800">
                                {r.dateStr} ({r.dayOfWeek})
                                {r.isHoliday && <span className="ml-1 text-[10px] text-amber-600 font-bold">★ Holiday</span>}
                              </td>
                              <td className={`py-1.5 px-2 text-center border-r border-slate-100 ${isLate ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>
                                {r.amIn || '-'}
                              </td>
                              <td className="py-1.5 px-2 text-center border-r border-slate-100 text-slate-600">
                                {r.amOut || '-'}
                              </td>
                              <td className="py-1.5 px-2 text-center border-r border-slate-100 text-slate-600">
                                {r.pmIn || '-'}
                              </td>
                              <td className={`py-1.5 px-2 text-center border-r border-slate-100 ${isOT ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                                {r.pmOut || '-'}
                              </td>
                              <td className="py-1.5 px-2 text-center border-r border-slate-100">
                                {r.lateMinutes > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    +{r.lateMinutes}m
                                  </span>
                                ) : (
                                  <span className="text-slate-300">0</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center border-r border-slate-100">
                                {r.earlyOutMinutes > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                                    +{r.earlyOutMinutes}m
                                  </span>
                                ) : (
                                  <span className="text-slate-300">0</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center border-r border-slate-100">
                                {r.otHours > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    +{r.otHours}h
                                  </span>
                                ) : (
                                  <span className="text-slate-300">0</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center font-sans text-[11px]">
                                {r.isRestDay ? (
                                  <span className="text-slate-400">Rest Day</span>
                                ) : isAbsent ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    Absent
                                  </span>
                                ) : isLate ? (
                                  <span className="text-amber-700 font-semibold">
                                    Late ({r.lateMinutes}m)
                                  </span>
                                ) : isOT ? (
                                  <span className="text-emerald-700 font-semibold">
                                    Overtime ({r.otHours}h)
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-medium">Regular</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200 shrink-0">
              <span className="text-xs text-slate-500">
                Clicking apply will update Attendance Sheets, DTR Grid, and sync metrics directly to the New Payroll Run batch.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDtrReviewModalResult(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDTRReview}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  <Check className="w-4 h-4" /> Apply & Sync All Attendance Tabs
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ATTENDANCE & DTR REPORT MODAL (FFCSI FORMAT) ⭐ */}
      {attendanceModalEmployee && (
        <AttendanceReportModal
          employee={attendanceModalEmployee}
          allEmployees={employees.filter(e => e.status === 'Active')}
          cutoffPeriod={selectedAttCutoff}
          cutoffPeriodType={selectedAttCutoffType}
          leaveRecords={leaveRecords}
          onSelectEmployee={(emp) => {
            setSelectedAttEmployeeId(emp.id);
            setAttendanceModalEmployee(emp);
          }}
          onClose={() => {
            setAttendanceModalEmployee(null);
            setAttendanceRefreshKey(k => k + 1);
          }}
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
            setAttendanceRefreshKey(k => k + 1);
            alert(`Synced attendance metrics for ${attendanceModalEmployee.fullName} to payroll batch!`);
          }}
        />
      )}
    </div>
  );
};
