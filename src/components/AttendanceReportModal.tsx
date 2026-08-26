import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { 
  XCircle, 
  Download, 
  Upload, 
  Printer, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  User,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { CompanyEmployee, DailyAttendanceRecord, CutoffAttendanceReport } from '../types';
import { 
  computeDailyAttendanceMetrics, 
  generateCutoffAttendance, 
  exportAttendanceReportToExcel,
  parseExceptionalsDTRWorkbook,
  saveCutoffAttendanceStore,
  downloadExceptionalsDTRTemplate
} from '../utils/attendanceUtils';

interface AttendanceReportModalProps {
  employee: CompanyEmployee;
  allEmployees?: CompanyEmployee[];
  cutoffPeriod: string;
  periodType?: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  cutoffPeriodType?: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  isOpen?: boolean;
  onClose: () => void;
  onSelectEmployee?: (emp: CompanyEmployee) => void;
  onSyncToPayroll?: (summary: {
    daysWorked: number;
    daysAbsent: number;
    tardinessMinutes: number;
    undertimeMinutes: number;
    otRegularHours: number;
    otHolidayHours: number;
    holidayPay: number;
    holidayPayAmount?: number;
    nightDiffHours: number;
    nightDiffPay: number;
  }) => void;
}

const COMMON_CUTOFF_OPTIONS = [
  'August 16-31, 2026',
  'August 1-15, 2026',
  'July 16-31, 2026',
  'July 1-15, 2026',
  'June 16-30, 2026',
  'June 1-15, 2026',
  'September 1-15, 2026',
  'September 16-30, 2026',
  'October 1-15, 2026',
  'October 16-31, 2026'
];

export const AttendanceReportModal: React.FC<AttendanceReportModalProps> = ({
  employee,
  allEmployees = [],
  cutoffPeriod: initialCutoffPeriod,
  periodType: initialPeriodType,
  cutoffPeriodType: initialCutoffPeriodType,
  isOpen = true,
  onClose,
  onSelectEmployee,
  onSyncToPayroll
}) => {
  const { leaveRecords } = useData();
  const [currentEmployee, setCurrentEmployee] = useState<CompanyEmployee>(employee);
  const [selectedCutoff, setSelectedCutoff] = useState<string>(initialCutoffPeriod || 'August 16-31, 2026');
  const [selectedPeriodType, setSelectedPeriodType] = useState<'1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly'>(
    initialPeriodType || initialCutoffPeriodType || '2nd Half (16-30/31)'
  );

  const [report, setReport] = useState<CutoffAttendanceReport>(() => {
    return generateCutoffAttendance(employee, initialCutoffPeriod, initialPeriodType || initialCutoffPeriodType, undefined, undefined, leaveRecords);
  });

  // Sync state if employee or initialCutoffPeriod prop changes
  useEffect(() => {
    setCurrentEmployee(employee);
  }, [employee]);

  useEffect(() => {
    if (initialCutoffPeriod) {
      setSelectedCutoff(initialCutoffPeriod);
    }
  }, [initialCutoffPeriod]);

  // Re-generate report when currentEmployee or selectedCutoff or leaveRecords changes
  useEffect(() => {
    setReport(generateCutoffAttendance(currentEmployee, selectedCutoff, selectedPeriodType, undefined, undefined, leaveRecords));
  }, [currentEmployee, selectedCutoff, selectedPeriodType, leaveRecords]);

  if (isOpen === false) return null;

  const dailyRate = currentEmployee.dailyRate || Number((currentEmployee.monthlyBasicSalary / 22).toFixed(2));
  const hourlyRate = currentEmployee.hourlyRate || Number((dailyRate / 8).toFixed(2));

  // Handle Cutoff Change
  const handleCutoffChange = (newCutoff: string) => {
    setSelectedCutoff(newCutoff);
    let pType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly' = '2nd Half (16-30/31)';
    if (newCutoff.includes('1-15')) pType = '1st Half (1-15)';
    else if (newCutoff.includes('Monthly')) pType = 'Monthly';
    setSelectedPeriodType(pType);
  };

  // Handle cell edit in the attendance report
  const handleCellChange = (
    index: number,
    field: 'amIn' | 'amOut' | 'pmIn' | 'pmOut' | 'otHours' | 'holidayType' | 'isRestDay',
    value: any
  ) => {
    const updatedRecords = [...report.records];
    const rec = { ...updatedRecords[index] };

    let amIn = rec.amIn;
    let amOut = rec.amOut;
    let pmIn = rec.pmIn;
    let pmOut = rec.pmOut;
    let ot = rec.otHours;
    let holidayType = rec.holidayType || 'None';
    let isRestDay = rec.isRestDay;

    if (field === 'amIn') amIn = value;
    if (field === 'amOut') amOut = value;
    if (field === 'pmIn') pmIn = value;
    if (field === 'pmOut') pmOut = value;
    if (field === 'otHours') ot = Number(value) || 0;
    if (field === 'holidayType') holidayType = value;
    if (field === 'isRestDay') isRestDay = value;

    const recalculated = computeDailyAttendanceMetrics(
      rec.dateStr,
      rec.dayNum,
      rec.dayOfWeek,
      amIn,
      amOut,
      pmIn,
      pmOut,
      ot,
      isRestDay,
      holidayType !== 'None',
      holidayType,
      dailyRate,
      hourlyRate
    );

    updatedRecords[index] = recalculated;

    // Recalculate totals
    const totalDaysWorked = updatedRecords.filter(r => (r.amIn || r.pmIn) && !r.isRestDay).length;
    const totalDaysAbsent = updatedRecords.reduce((s, r) => s + r.absent, 0);
    const totalLateMinutes = updatedRecords.reduce((s, r) => s + r.lateMinutes, 0);
    const totalEarlyOutMinutes = updatedRecords.reduce((s, r) => s + r.earlyOutMinutes, 0);
    const totalOtHours = Number(updatedRecords.reduce((s, r) => s + r.otHours, 0).toFixed(2));
    const totalHolidayHours = updatedRecords.filter(r => r.isHoliday && (r.amIn || r.pmIn)).length * 8;
    const totalHolidayPay = Number(updatedRecords.reduce((s, r) => s + r.holidayPay, 0).toFixed(2));
    const totalNightDiffHours = Number(updatedRecords.reduce((s, r) => s + r.nightDiffHours, 0).toFixed(2));
    const totalNightDiffPay = Number(updatedRecords.reduce((s, r) => s + r.nightDiffPay, 0).toFixed(2));

    setReport({
      ...report,
      records: updatedRecords,
      totalDaysWorked,
      totalDaysAbsent,
      totalLateMinutes,
      totalEarlyOutMinutes,
      totalOtHours,
      totalHolidayHours,
      totalHolidayPay,
      totalNightDiffHours,
      totalNightDiffPay,
      updatedAt: new Date().toISOString()
    });
  };

  // Pre-fill standard working shift (8:30 AM - 5:30 PM) for all weekdays
  const handleFillStandardShift = () => {
    const updated = report.records.map(rec => {
      if (rec.isRestDay) return rec;
      return computeDailyAttendanceMetrics(
        rec.dateStr,
        rec.dayNum,
        rec.dayOfWeek,
        '08:30',
        '12:00',
        '13:00',
        '17:30',
        0,
        false,
        false,
        'None',
        dailyRate,
        hourlyRate
      );
    });

    const totalDaysWorked = updated.filter(r => !r.isRestDay).length;

    setReport({
      ...report,
      records: updated,
      totalDaysWorked,
      totalDaysAbsent: 0,
      totalLateMinutes: 0,
      totalEarlyOutMinutes: 0,
      totalOtHours: 0,
      totalHolidayHours: 0,
      totalHolidayPay: 0,
      totalNightDiffHours: 0,
      totalNightDiffPay: 0,
      updatedAt: new Date().toISOString()
    });
  };

  // Clear all time logs
  const handleClearAllLogs = () => {
    const updated = report.records.map(rec => {
      return computeDailyAttendanceMetrics(
        rec.dateStr,
        rec.dayNum,
        rec.dayOfWeek,
        '',
        '',
        '',
        '',
        0,
        rec.isRestDay,
        false,
        'None',
        dailyRate,
        hourlyRate
      );
    });

    setReport({
      ...report,
      records: updated,
      totalDaysWorked: 0,
      totalDaysAbsent: updated.filter(r => !r.isRestDay).length,
      totalLateMinutes: 0,
      totalEarlyOutMinutes: 0,
      totalOtHours: 0,
      totalHolidayHours: 0,
      totalHolidayPay: 0,
      totalNightDiffHours: 0,
      totalNightDiffPay: 0,
      updatedAt: new Date().toISOString()
    });
  };

  // Upload Excel Attendance File (supports both Exceptionals multi-employee DTR and single-sheet reports)
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // 1. Try parsing using the Exceptionals DTR parser
        const parsedDTR = parseExceptionalsDTRWorkbook(wb, allEmployees && allEmployees.length > 0 ? allEmployees : [employee], leaveRecords);
        if (parsedDTR.matchedReports.length > 0) {
          // Look for this employee's report
          const matched = parsedDTR.matchedReports.find(r => 
            r.employeeId === employee.id ||
            r.employeeNo.toLowerCase() === employee.employeeNo.toLowerCase() ||
            r.employeeName.toLowerCase().includes(employee.fullName.toLowerCase()) ||
            employee.fullName.toLowerCase().includes(r.employeeName.toLowerCase())
          ) || parsedDTR.matchedReports[0];

          if (matched) {
            setReport(matched);
            saveCutoffAttendanceStore(parsedDTR.matchedReports);
            alert(`Successfully imported Exceptionals DTR for ${matched.employeeName} (${matched.cutoffPeriod})! Processed ${matched.records.filter(r => r.amIn || r.pmIn).length} logged working days.`);
            return;
          }
        }

        // 2. Fallback: Parse row-by-row day matching
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rows || rows.length === 0) {
          alert('Uploaded Excel file is empty.');
          return;
        }

        const updatedRecords = [...report.records];
        let matchedCount = 0;

        rows.forEach(row => {
          if (!row || row.length === 0) return;
          const firstCol = String(row[0] || '').trim();
          
          const dayMatch = firstCol.match(/^(\d{1,2})/);
          if (dayMatch) {
            const dayNum = parseInt(dayMatch[1], 10);
            const targetIdx = updatedRecords.findIndex(r => r.dayNum === dayNum);
            if (targetIdx !== -1) {
              const amIn = row[1] ? String(row[1]).trim() : '';
              const amOut = row[2] ? String(row[2]).trim() : '';
              const pmIn = row[3] ? String(row[3]).trim() : '';
              const pmOut = row[4] ? String(row[4]).trim() : '';
              const ot = row[5] ? Number(row[5]) || 0 : 0;

              const rec = updatedRecords[targetIdx];
              updatedRecords[targetIdx] = computeDailyAttendanceMetrics(
                rec.dateStr,
                rec.dayNum,
                rec.dayOfWeek,
                amIn,
                amOut,
                pmIn,
                pmOut,
                ot,
                rec.isRestDay,
                rec.isHoliday,
                rec.holidayType || 'None',
                dailyRate,
                hourlyRate
              );
              matchedCount++;
            }
          }
        });

        const totalDaysWorked = updatedRecords.filter(r => (r.amIn || r.pmIn) && !r.isRestDay).length;
        const totalDaysAbsent = updatedRecords.reduce((s, r) => s + r.absent, 0);
        const totalLateMinutes = updatedRecords.reduce((s, r) => s + r.lateMinutes, 0);
        const totalEarlyOutMinutes = updatedRecords.reduce((s, r) => s + r.earlyOutMinutes, 0);
        const totalOtHours = Number(updatedRecords.reduce((s, r) => s + r.otHours, 0).toFixed(2));
        const totalHolidayHours = updatedRecords.filter(r => r.isHoliday && (r.amIn || r.pmIn)).length * 8;
        const totalHolidayPay = Number(updatedRecords.reduce((s, r) => s + r.holidayPay, 0).toFixed(2));
        const totalNightDiffHours = Number(updatedRecords.reduce((s, r) => s + r.nightDiffHours, 0).toFixed(2));
        const totalNightDiffPay = Number(updatedRecords.reduce((s, r) => s + r.nightDiffPay, 0).toFixed(2));

        const updatedReport: CutoffAttendanceReport = {
          ...report,
          records: updatedRecords,
          totalDaysWorked,
          totalDaysAbsent,
          totalLateMinutes,
          totalEarlyOutMinutes,
          totalOtHours,
          totalHolidayHours,
          totalHolidayPay,
          totalNightDiffHours,
          totalNightDiffPay,
          updatedAt: new Date().toISOString()
        };

        setReport(updatedReport);
        saveCutoffAttendanceStore([updatedReport]);

        alert(`Successfully imported ${matchedCount} attendance records from Excel!`);
      } catch (err) {
        console.error('Error importing attendance Excel:', err);
        alert('Failed to parse Excel file. Please ensure it follows the standard Attendance Report format.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSyncAndClose = () => {
    if (onSyncToPayroll) {
      onSyncToPayroll({
        daysWorked: report.totalDaysWorked,
        daysAbsent: report.totalDaysAbsent,
        tardinessMinutes: report.totalLateMinutes,
        undertimeMinutes: report.totalEarlyOutMinutes,
        otRegularHours: report.totalOtHours,
        otHolidayHours: report.totalHolidayHours,
        holidayPay: report.totalHolidayPay,
        holidayPayAmount: report.totalHolidayPay,
        nightDiffHours: report.totalNightDiffHours,
        nightDiffPay: report.totalNightDiffPay
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full p-6 shadow-2xl space-y-5 my-auto max-h-[95vh] flex flex-col border border-slate-200">
        
        {/* Top Header & Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4 shrink-0">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-2xl font-black text-blue-700 tracking-tight">Attendance & DTR Report</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                DOLE & Firm Automated Timekeeping
              </span>
            </div>
            
            {/* Cutoff and Employee Selectors */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Employee Selector */}
              {allEmployees && allEmployees.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Staff:</span>
                  <select
                    value={currentEmployee.id}
                    onChange={(e) => {
                      const found = allEmployees.find(emp => emp.id === e.target.value);
                      if (found) {
                        setCurrentEmployee(found);
                        if (onSelectEmployee) onSelectEmployee(found);
                      }
                    }}
                    className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeNo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cutoff Date Dropdown */}
              <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <span className="text-[11px] font-bold text-blue-700 uppercase">Cutoff:</span>
                <select
                  value={selectedCutoff}
                  onChange={(e) => handleCutoffChange(e.target.value)}
                  className="bg-transparent font-bold text-xs text-blue-900 focus:outline-none cursor-pointer"
                >
                  {COMMON_CUTOFF_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {!COMMON_CUTOFF_OPTIONS.includes(selectedCutoff) && (
                    <option value={selectedCutoff}>{selectedCutoff}</option>
                  )}
                </select>
              </div>

              <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                {currentEmployee.position} • Basic: ₱{currentEmployee.monthlyBasicSalary.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 self-stretch md:self-auto justify-end">
            <button
              type="button"
              onClick={handleFillStandardShift}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Auto-fill 8:30 AM - 5:30 PM for all regular working days"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Fill Standard 8:30-5:30
            </button>

            <button
              type="button"
              onClick={handleClearAllLogs}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              title="Clear all time in / time out entries"
            >
              Clear Logs
            </button>

            <button
              type="button"
              onClick={() => exportAttendanceReportToExcel(report)}
              className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
            </button>

            <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
              <Upload className="w-3.5 h-3.5" /> Import Excel
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleUploadExcel}
              />
            </label>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              title="Print DTR"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg ml-1"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Schedule & Rules Rule Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] shrink-0">
          <div className="bg-white p-2 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Working Hours</span>
            <strong className="text-slate-800 font-mono">8:30 AM – 5:30 PM</strong>
            <span className="text-slate-500 block text-[10px]">1h Lunch: 12:00 PM – 1:00 PM</span>
          </div>

          <div className="bg-white p-2 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Grace Allowance</span>
            <strong className="text-amber-700 font-mono">Up to 8:45 AM (0 Late)</strong>
            <span className="text-slate-500 block text-[10px]">Past 8:45 AM = /min from 8:30</span>
          </div>

          <div className="bg-white p-2 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Daily Salary Rate</span>
            <strong className="text-blue-700 font-mono">₱{dailyRate.toFixed(2)}/day</strong>
            <span className="text-slate-500 block text-[10px]">Gross Monthly ÷ 22 Days</span>
          </div>

          <div className="bg-white p-2 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Hourly / Minute Rate</span>
            <strong className="text-emerald-700 font-mono">₱{hourlyRate.toFixed(2)}/hr</strong>
            <span className="text-slate-500 block text-[10px]">₱{(hourlyRate / 60).toFixed(2)}/min</span>
          </div>
        </div>

        {/* Main Attendance List Grid (Matching Attendance.png Layout) */}
        <div className="flex-1 overflow-auto border border-blue-300 rounded-xl shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            {/* Top Blue Header */}
            <thead>
              <tr className="bg-blue-600 text-white font-bold border-b border-blue-400">
                <th colSpan={6} className="py-2 px-3 text-center border-r border-blue-400 tracking-wider">
                  Attendance List
                </th>
                <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-blue-400 min-w-[70px]">
                  Late <span className="block text-[10px] font-normal opacity-90">(Mins)</span>
                </th>
                <th rowSpan={2} className="py-2 px-2 text-center border-r border-blue-400 min-w-[60px]">
                  Absent <span className="block text-[10px] font-normal opacity-90">(Days)</span>
                </th>
                <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-blue-400 min-w-[70px]">
                  Early Out <span className="block text-[10px] font-normal opacity-90">(Mins)</span>
                </th>
                <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-blue-400 min-w-[90px]">
                  Holiday Pay <span className="block text-[10px] font-normal opacity-90">(₱)</span>
                </th>
                <th rowSpan={2} className="py-2 px-2.5 text-center min-w-[90px]">
                  Night Diff <span className="block text-[10px] font-normal opacity-90">(Hrs / ₱)</span>
                </th>
              </tr>
              <tr className="bg-blue-50 text-blue-950 font-bold border-b border-blue-200 text-[11px]">
                <th className="py-1.5 px-3 border-r border-blue-200 min-w-[65px]">dd/ww</th>
                <th className="py-1.5 px-2 text-center border-r border-blue-200 min-w-[75px]">AM In</th>
                <th className="py-1.5 px-2 text-center border-r border-blue-200 min-w-[75px]">AM Out</th>
                <th className="py-1.5 px-2 text-center border-r border-blue-200 min-w-[75px]">PM In</th>
                <th className="py-1.5 px-2 text-center border-r border-blue-200 min-w-[75px]">PM Out</th>
                <th className="py-1.5 px-2 text-center border-r border-blue-200 min-w-[60px]">OT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {report.records.map((rec, idx) => {
                const isSatSun = rec.isRestDay;

                return (
                  <tr 
                    key={rec.dayNum} 
                    className={`hover:bg-blue-50/50 transition-colors ${
                      isSatSun ? 'bg-slate-50/80 text-slate-500' : 'text-slate-800'
                    }`}
                  >
                    {/* dd/ww (e.g. 16 Th, 17 Fr, 18 Sa) */}
                    <td className={`py-1 px-3 font-mono font-bold text-xs border-r border-slate-200 ${
                      isSatSun ? 'text-slate-400' : 'text-blue-900'
                    }`}>
                      {rec.ddWwLabel}
                    </td>

                    {/* AM In */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={rec.amIn}
                        onChange={e => handleCellChange(idx, 'amIn', e.target.value)}
                        placeholder={isSatSun ? '-' : '08:30'}
                        className={`w-full text-center px-1.5 py-0.5 font-mono text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white ${
                          rec.amIn ? 'font-bold text-slate-900 bg-emerald-50/40' : 'bg-transparent text-slate-400'
                        }`}
                      />
                    </td>

                    {/* AM Out (Lunch Break Out) */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={rec.amOut}
                        onChange={e => handleCellChange(idx, 'amOut', e.target.value)}
                        placeholder="12:00"
                        className="w-full text-center px-1.5 py-0.5 font-mono text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent text-slate-700"
                      />
                    </td>

                    {/* PM In (Lunch Break In) */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={rec.pmIn}
                        onChange={e => handleCellChange(idx, 'pmIn', e.target.value)}
                        placeholder="13:00"
                        className="w-full text-center px-1.5 py-0.5 font-mono text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent text-slate-700"
                      />
                    </td>

                    {/* PM Out */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={rec.pmOut}
                        onChange={e => handleCellChange(idx, 'pmOut', e.target.value)}
                        placeholder={isSatSun ? '-' : '17:30'}
                        className={`w-full text-center px-1.5 py-0.5 font-mono text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white ${
                          rec.pmOut ? 'font-bold text-slate-900 bg-emerald-50/40' : 'bg-transparent text-slate-400'
                        }`}
                      />
                    </td>

                    {/* OT */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.5"
                        value={rec.otHours || ''}
                        onChange={e => handleCellChange(idx, 'otHours', e.target.value)}
                        placeholder="0"
                        className={`w-full text-center px-1 py-0.5 font-mono text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 ${
                          rec.otHours > 0 ? 'font-bold text-emerald-700 bg-emerald-50' : 'bg-transparent text-slate-400'
                        }`}
                      />
                    </td>

                    {/* Late (Auto Computed with 8:45 AM Allowance) */}
                    <td className={`p-1.5 text-center font-mono text-xs border-r border-slate-200 ${
                      rec.lateMinutes > 0 ? 'font-bold text-rose-600 bg-rose-50/60' : 'text-slate-400'
                    }`}>
                      {rec.lateMinutes > 0 ? `${rec.lateMinutes}m` : '0'}
                    </td>

                    {/* Absent */}
                    <td className={`p-1.5 text-center font-mono text-xs border-r border-slate-200 ${
                      rec.absent > 0 ? 'font-bold text-rose-600 bg-rose-100/70' : 'text-slate-400'
                    }`}>
                      {rec.absent > 0 ? '1' : '0'}
                    </td>

                    {/* Early Out */}
                    <td className={`p-1.5 text-center font-mono text-xs border-r border-slate-200 ${
                      rec.earlyOutMinutes > 0 ? 'font-bold text-amber-600 bg-amber-50/60' : 'text-slate-400'
                    }`}>
                      {rec.earlyOutMinutes > 0 ? `${rec.earlyOutMinutes}m` : '0'}
                    </td>

                    {/* Holiday Pay */}
                    <td className="p-1 text-center font-mono text-xs border-r border-slate-200">
                      {rec.holidayPay > 0 ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          ₱{rec.holidayPay.toFixed(2)}
                        </span>
                      ) : (
                        <select
                          value={rec.holidayType || 'None'}
                          onChange={e => handleCellChange(idx, 'holidayType', e.target.value)}
                          className="text-[10px] bg-transparent border-0 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <option value="None">-</option>
                          <option value="Regular">Reg Holiday</option>
                          <option value="Special">Spcl Holiday</option>
                        </select>
                      )}
                    </td>

                    {/* Night Differential */}
                    <td className="p-1.5 text-center font-mono text-xs">
                      {rec.nightDiffHours > 0 ? (
                        <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                          {rec.nightDiffHours}h (₱{rec.nightDiffPay.toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Summary Totals Row (Matching Attendance Report) */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold font-mono text-xs border-t-2 border-slate-700">
                <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider font-sans text-[11px] text-slate-300">
                  Cutoff Aggregated Totals:
                </td>
                <td className="py-2 px-1 text-center text-emerald-300">
                  {report.totalOtHours > 0 ? `${report.totalOtHours}h` : '0h'}
                </td>
                <td className="py-2 px-1 text-center text-amber-300">
                  {report.totalLateMinutes}m
                </td>
                <td className="py-2 px-1 text-center text-rose-300">
                  {report.totalDaysAbsent}d
                </td>
                <td className="py-2 px-1 text-center text-amber-300">
                  {report.totalEarlyOutMinutes}m
                </td>
                <td className="py-2 px-1 text-center text-indigo-300">
                  ₱{report.totalHolidayPay.toFixed(2)}
                </td>
                <td className="py-2 px-1 text-center text-purple-300">
                  {report.totalNightDiffHours}h (₱{report.totalNightDiffPay.toFixed(2)})
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-500">
            Rendered Days Worked: <strong className="text-emerald-700 font-mono">{report.totalDaysWorked} Days</strong> • Total Deductible Lates: <strong className="text-amber-700 font-mono">{report.totalLateMinutes} Mins</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSyncAndClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Apply & Sync to Cutoff Payroll
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
