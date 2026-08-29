import * as XLSX from 'xlsx';
import { DailyAttendanceRecord, CutoffAttendanceReport, CompanyEmployee, LeaveRecord } from '../types';
import { parseTimeToMinutes } from '../lib/dolePayroll';

// Local storage key for custom/imported Cutoff Attendance reports
const ATTENDANCE_STORE_KEY = 'afms_custom_cutoff_attendance';

export interface StandardCutoffOption {
  label: string;
  period: string;
  periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  defaultPayDate: string;
  monthName: string;
  year: number;
  isCurrent?: boolean;
}

export const STANDARD_CUTOFF_PERIODS: StandardCutoffOption[] = [
  // 2026 Primary Cutoffs
  { label: 'August 16-31, 2026 (2nd Half)', period: 'August 16-31, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-08-31', monthName: 'August', year: 2026, isCurrent: true },
  { label: 'August 1-15, 2026 (1st Half)', period: 'August 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-08-15', monthName: 'August', year: 2026 },
  { label: 'September 1-15, 2026 (1st Half)', period: 'September 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-09-15', monthName: 'September', year: 2026 },
  { label: 'September 16-30, 2026 (2nd Half)', period: 'September 16-30, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-09-30', monthName: 'September', year: 2026 },
  { label: 'October 1-15, 2026 (1st Half)', period: 'October 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-10-15', monthName: 'October', year: 2026 },
  { label: 'October 16-31, 2026 (2nd Half)', period: 'October 16-31, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-10-31', monthName: 'October', year: 2026 },
  { label: 'November 1-15, 2026 (1st Half)', period: 'November 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-11-15', monthName: 'November', year: 2026 },
  { label: 'November 16-30, 2026 (2nd Half)', period: 'November 16-30, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-11-30', monthName: 'November', year: 2026 },
  { label: 'December 1-15, 2026 (1st Half)', period: 'December 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-12-15', monthName: 'December', year: 2026 },
  { label: 'December 16-31, 2026 (2nd Half)', period: 'December 16-31, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-12-31', monthName: 'December', year: 2026 },
  { label: 'July 16-31, 2026 (2nd Half)', period: 'July 16-31, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-07-31', monthName: 'July', year: 2026 },
  { label: 'July 1-15, 2026 (1st Half)', period: 'July 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-07-15', monthName: 'July', year: 2026 },
  { label: 'June 16-30, 2026 (2nd Half)', period: 'June 16-30, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-06-30', monthName: 'June', year: 2026 },
  { label: 'June 1-15, 2026 (1st Half)', period: 'June 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-06-15', monthName: 'June', year: 2026 },
  { label: 'May 16-31, 2026 (2nd Half)', period: 'May 16-31, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-05-31', monthName: 'May', year: 2026 },
  { label: 'May 1-15, 2026 (1st Half)', period: 'May 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-05-15', monthName: 'May', year: 2026 },
  { label: 'April 16-30, 2026 (2nd Half)', period: 'April 16-30, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-04-30', monthName: 'April', year: 2026 },
  { label: 'April 1-15, 2026 (1st Half)', period: 'April 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-04-15', monthName: 'April', year: 2026 },
  { label: 'March 16-31, 2026 (2nd Half)', period: 'March 16-31, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-03-31', monthName: 'March', year: 2026 },
  { label: 'March 1-15, 2026 (1st Half)', period: 'March 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-03-15', monthName: 'March', year: 2026 },
  { label: 'February 16-28, 2026 (2nd Half)', period: 'February 16-28, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-02-28', monthName: 'February', year: 2026 },
  { label: 'February 1-15, 2026 (1st Half)', period: 'February 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-02-15', monthName: 'February', year: 2026 },
  { label: 'January 16-31, 2026 (2nd Half)', period: 'January 16-31, 2026', periodType: '2nd Half (16-30/31)', defaultPayDate: '2026-01-31', monthName: 'January', year: 2026 },
  { label: 'January 1-15, 2026 (1st Half)', period: 'January 1-15, 2026', periodType: '1st Half (1-15)', defaultPayDate: '2026-01-15', monthName: 'January', year: 2026 },
  // Monthly Cutoffs
  { label: 'August 1-31, 2026 (Monthly Full)', period: 'August 1-31, 2026', periodType: 'Monthly', defaultPayDate: '2026-08-31', monthName: 'August', year: 2026 },
  { label: 'July 1-31, 2026 (Monthly Full)', period: 'July 1-31, 2026', periodType: 'Monthly', defaultPayDate: '2026-07-31', monthName: 'July', year: 2026 },
  { label: 'September 1-30, 2026 (Monthly Full)', period: 'September 1-30, 2026', periodType: 'Monthly', defaultPayDate: '2026-09-30', monthName: 'September', year: 2026 },
  { label: 'October 1-31, 2026 (Monthly Full)', period: 'October 1-31, 2026', periodType: 'Monthly', defaultPayDate: '2026-10-31', monthName: 'October', year: 2026 }
];

export function inferPeriodDetails(periodStr: string): {
  periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  defaultPayDate: string;
} {
  const match = STANDARD_CUTOFF_PERIODS.find(o => 
    o.period.toLowerCase() === periodStr.toLowerCase().trim() || 
    o.label.toLowerCase() === periodStr.toLowerCase().trim()
  );
  if (match) {
    return {
      periodType: match.periodType,
      defaultPayDate: match.defaultPayDate
    };
  }

  let periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly' = '1st Half (1-15)';
  if (periodStr.includes('16-') || periodStr.includes('16 -') || periodStr.includes('2nd Half')) {
    periodType = '2nd Half (16-30/31)';
  } else if (periodStr.includes('Monthly') || periodStr.includes('1-30') || periodStr.includes('1-31')) {
    periodType = 'Monthly';
  }

  return {
    periodType,
    defaultPayDate: new Date().toISOString().split('T')[0]
  };
}

/**
 * Storage helpers for persisting uploaded or edited Cutoff Attendance Reports
 */
export function getStoredCutoffAttendance(employeeId: string, cutoffPeriod: string): CutoffAttendanceReport | null {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORE_KEY);
    if (!raw) return null;
    const store: Record<string, CutoffAttendanceReport> = JSON.parse(raw);
    const key = `${employeeId}_${cutoffPeriod.trim().toLowerCase()}`;
    return store[key] || null;
  } catch (e) {
    console.error('Failed to read stored cutoff attendance:', e);
    return null;
  }
}

export function saveCutoffAttendanceStore(reports: CutoffAttendanceReport[]) {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORE_KEY);
    const store: Record<string, CutoffAttendanceReport> = raw ? JSON.parse(raw) : {};
    reports.forEach(r => {
      const key = `${r.employeeId}_${r.cutoffPeriod.trim().toLowerCase()}`;
      store[key] = r;
    });
    localStorage.setItem(ATTENDANCE_STORE_KEY, JSON.stringify(store));
    // Trigger custom event so any active component auto-refreshes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('afms_attendance_updated', { detail: { count: reports.length } }));
    }
  } catch (e) {
    console.error('Failed to save cutoff attendance reports:', e);
  }
}

export function getAllStoredCutoffAttendance(): Record<string, CutoffAttendanceReport> {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Normalizes Excel time representations (strings "08:26", "17:31", decimals 0.3513, numbers, Date objects)
 */
export function formatExcelTime(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') {
    const clean = val.trim();
    if (!clean || clean === '-' || clean === 'null' || clean === 'undefined') return '';
    // If it's already HH:mm
    if (/^\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$/i.test(clean)) {
      const mins = parseTimeToMinutes(clean);
      if (mins !== null) {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      return clean;
    }
    return clean;
  }
  if (typeof val === 'number') {
    // If it's a decimal fraction of a day (e.g. 0.35138888 for 08:26)
    if (val >= 0 && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    // If it's military integer (e.g. 826 or 1731)
    if (val >= 100 && val <= 2400) {
      const hours = Math.floor(val / 100);
      const minutes = val % 100;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }
  if (val instanceof Date) {
    const h = val.getHours();
    const m = val.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return String(val).trim();
}

/**
 * Normalizes Excel date representations (YYYY/MM/DD, YYYY-MM-DD, serials, Date objects) -> "YYYY-MM-DD"
 */
export function formatExcelDate(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const clean = val.trim();
    // Matches YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
    const isoMatch = clean.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
      const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // Matches MM/DD/YYYY or DD/MM/YYYY
    const slashMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
    if (slashMatch) {
      const y = slashMatch[3];
      const m = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
      const d = String(parseInt(slashMatch[2], 10)).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const dObj = new Date(clean);
    if (!isNaN(dObj.getTime())) {
      return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
    }
    return null;
  }
  if (typeof val === 'number') {
    // Excel serial date (e.g. 46220 for 2026-07-16)
    if (val > 1000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
  }
  return null;
}

/**
 * Computes a single day's attendance metrics:
 * - Schedule: 8:30 AM (510 min) - 5:30 PM (1050 min)
 * - Break: 12:00 PM - 1:00 PM (1 hour)
 * - Late Allowance: up to 8:45 AM (525 min) -> 0 late. Beyond 8:45 AM -> computed per min from 8:30 AM.
 * - Early Out: Departure before 5:30 PM (1050 min).
 * - Overtime: Departure after 5:30 PM (1050 min) or manual OT input.
 * - Absent: 1 day if scheduled weekday has no time records and no approved paid leave.
 * - Holiday Pay: 200% for regular holiday worked (extra 100% daily rate), 130% for special holiday worked.
 * - Night Differential: 10:00 PM (1320 min) to 6:00 AM (360 min) (+10% premium).
 */
export function computeDailyAttendanceMetrics(
  dateStr: string,
  dayNum: number,
  dayOfWeek: string,
  amInStr: string,
  amOutStr: string,
  pmInStr: string,
  pmOutStr: string,
  manualOtHours: number = 0,
  isRestDayInput?: boolean,
  isHolidayInput?: boolean,
  holidayTypeInput: 'None' | 'Regular' | 'Special' = 'None',
  dailyRate: number = 0,
  hourlyRate: number = 0
): DailyAttendanceRecord {
  const isWeekend = dayOfWeek === 'Sa' || dayOfWeek === 'Su' || dayOfWeek === 'Sat' || dayOfWeek === 'Sun';
  const isRestDay = isRestDayInput !== undefined ? isRestDayInput : isWeekend;
  const isHoliday = isHolidayInput || holidayTypeInput !== 'None';
  const holidayType = holidayTypeInput || (isHoliday ? 'Regular' : 'None');

  const cleanAmIn = amInStr?.trim() || '';
  const cleanAmOut = amOutStr?.trim() || '';
  const cleanPmIn = pmInStr?.trim() || '';
  const cleanPmOut = pmOutStr?.trim() || '';

  // Parse individually with proper AM / PM column hints:
  const parsedAmIn = parseTimeToMinutes(cleanAmIn, false);
  const parsedAmOut = parseTimeToMinutes(cleanAmOut, false);
  const parsedPmIn = parseTimeToMinutes(cleanPmIn, true);
  const parsedPmOut = parseTimeToMinutes(cleanPmOut, true);

  const inMins = parsedAmIn !== null ? parsedAmIn : parsedPmIn;
  let outMins = parsedPmOut !== null ? parsedPmOut : parsedAmOut;

  const hasLogs = inMins !== null && outMins !== null;

  if (inMins !== null && outMins !== null && outMins < inMins) {
    outMins += 24 * 60;
  }

  const scheduledStartMins = 8 * 60 + 30; // 08:30 (510 min)
  const scheduledEndMins = 17 * 60 + 30;  // 17:30 (1050 min)
  const gracePeriodMins = 8 * 60 + 45;    // 08:45 (525 min)

  let lateMinutes = 0;
  let earlyOutMinutes = 0;
  let autoOtHours = 0;
  let absent = 0;
  let nightDiffHours = 0;

  if (!hasLogs) {
    if (!isRestDay && !isHoliday) {
      absent = 1;
    }
  } else {
    // 1. Late Calculation with 8:45 AM Grace Period
    if (inMins !== null && inMins > gracePeriodMins) {
      lateMinutes = Math.max(0, inMins - scheduledStartMins);
    }

    // 2. Early Out / Undertime Calculation
    if (outMins !== null && outMins < scheduledEndMins && !isRestDay) {
      earlyOutMinutes = Math.max(0, scheduledEndMins - outMins);
    }

    // 3. Overtime Calculation (past 5:30 PM)
    if (outMins !== null && outMins > scheduledEndMins) {
      autoOtHours = Number(((outMins - scheduledEndMins) / 60).toFixed(2));
    }

    // 4. Night Differential Calculation (10 PM to 6 AM)
    if (inMins !== null && outMins !== null) {
      let nsdMins = 0;
      for (let m = inMins; m < outMins; m += 15) {
        const norm = m % (24 * 60);
        if (norm >= 1320 || norm < 360) {
          nsdMins += 15;
        }
      }
      nightDiffHours = Number((nsdMins / 60).toFixed(2));
    }
  }

  const finalOtHours = manualOtHours > 0 ? manualOtHours : autoOtHours;
  const effectiveHourlyRate = hourlyRate > 0 ? hourlyRate : (dailyRate > 0 ? dailyRate / 8 : 0);

  // 5. Holiday Pay Calculation
  let holidayPay = 0;
  if (isHoliday) {
    if (hasLogs) {
      if (holidayType === 'Regular') {
        // Worked Regular Holiday = +100% daily rate premium (Total 200%)
        holidayPay = Number((dailyRate * 1.0).toFixed(2));
      } else if (holidayType === 'Special') {
        // Worked Special Non-working Holiday = +30% daily rate premium
        holidayPay = Number((dailyRate * 0.30).toFixed(2));
      }
    } else if (holidayType === 'Regular' && !isRestDay) {
      // Unworked Regular Holiday = 100% daily rate
      holidayPay = Number((dailyRate).toFixed(2));
    }
  }

  // 6. Night Differential Pay (+10% of hourly rate)
  const nightDiffPay = Number((nightDiffHours * effectiveHourlyRate * 0.10).toFixed(2));

  return {
    dateStr,
    dayNum,
    dayOfWeek,
    ddWwLabel: `${String(dayNum).padStart(2, '0')} ${dayOfWeek}`,
    isRestDay,
    isHoliday,
    holidayType,
    amIn: cleanAmIn,
    amOut: cleanAmOut,
    pmIn: cleanPmIn,
    pmOut: cleanPmOut,
    otHours: finalOtHours,
    lateMinutes,
    absent,
    earlyOutMinutes,
    holidayPay,
    nightDiffHours,
    nightDiffPay
  };
}

/**
 * Helper to extract month, year, and half from cutoff string
 */
export function parseCutoffString(cutoffStr: string): { month: number; year: number; periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly' } {
  const monthMap: Record<string, number> = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
    may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
    october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
  };
  
  let month = 8;
  let year = 2026;
  let periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly' = '2nd Half (16-30/31)';
  
  const lower = cutoffStr.toLowerCase();
  for (const [mName, mNum] of Object.entries(monthMap)) {
    if (lower.includes(mName)) {
      month = mNum;
      break;
    }
  }
  
  const yearMatch = cutoffStr.match(/\b(202\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }
  
  if (lower.includes('1-15') || lower.includes('1st')) {
    periodType = '1st Half (1-15)';
  } else if (lower.includes('16-') || lower.includes('2nd') || lower.includes('16-30') || lower.includes('16-31')) {
    periodType = '2nd Half (16-30/31)';
  } else if (lower.includes('monthly') || lower.includes('full month')) {
    periodType = 'Monthly';
  }
  
  return { month, year, periodType };
}

export interface ParsedDTRResult {
  success: boolean;
  message: string;
  detectedCutoffPeriod: string; // e.g. "July 16-31, 2026"
  periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  year: number;
  month: number;
  totalRowsProcessed: number;
  matchedReports: CutoffAttendanceReport[];
  unmatchedRows: Array<{
    rowNum: number;
    rawNo: string;
    rawName: string;
    rawDate: string;
    rawTimeIn: string;
    rawTimeOut: string;
    reason: string;
  }>;
  employeeSummaries: Array<{
    employeeId: string;
    employeeNo: string;
    employeeName: string;
    matchedRawName: string;
    daysWithLogs: number;
    totalLateMinutes: number;
    totalEarlyOutMinutes: number;
    totalOtHours: number;
    totalDaysAbsent: number;
    report: CutoffAttendanceReport;
  }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Universal Excel Parser for "Exceptionals" DTR timesheets and biometric export files
 */
export function parseExceptionalsDTRWorkbook(
  workbook: XLSX.WorkBook,
  employees: CompanyEmployee[],
  leaveRecords?: LeaveRecord[]
): ParsedDTRResult {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    return {
      success: false,
      message: 'Workbook contains no sheets.',
      detectedCutoffPeriod: 'August 16-31, 2026',
      periodType: '2nd Half (16-30/31)',
      year: 2026,
      month: 8,
      totalRowsProcessed: 0,
      matchedReports: [],
      unmatchedRows: [],
      employeeSummaries: []
    };
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    return {
      success: false,
      message: 'Uploaded Excel sheet is empty.',
      detectedCutoffPeriod: 'August 16-31, 2026',
      periodType: '2nd Half (16-30/31)',
      year: 2026,
      month: 8,
      totalRowsProcessed: 0,
      matchedReports: [],
      unmatchedRows: [],
      employeeSummaries: []
    };
  }

  // 1. Detect Cutoff Date Range from Header (e.g. "Date: 2026/07/16 ~ 07/31" or "2026/07/16 ~ 2026/07/31")
  let detectedYear = 2026;
  let detectedMonth = 7;
  let detectedStartDay = 16;
  let detectedEndDay = 31;
  let headerDateFound = false;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const rowStr = rawRows[r].join(' ');
    // Match "Date: 2026/07/16 ~ 07/31" or "2026-07-16 to 2026-07-31" or "2026/08/01 ~ 08/15"
    const rangeMatch = rowStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s*[\~–to-]+\s*(?:(\d{4})[/-])?(\d{1,2})[/-]?(\d{1,2})?/i);
    if (rangeMatch) {
      detectedYear = parseInt(rangeMatch[1], 10);
      detectedMonth = parseInt(rangeMatch[2], 10);
      detectedStartDay = parseInt(rangeMatch[3], 10);
      
      if (rangeMatch[5] && rangeMatch[6]) {
        detectedEndDay = parseInt(rangeMatch[6], 10);
      } else if (rangeMatch[5]) {
        detectedEndDay = parseInt(rangeMatch[5], 10);
      }
      headerDateFound = true;
      break;
    }
  }

  // 2. Locate Table Column Headers (No., Name, Department, Date, AM, PM)
  let headerRowIndex = -1;
  let colNo = -1;
  let colName = -1;
  let colDept = -1;
  let colDate = -1;
  let colAmIn = -1;
  let colAmOut = -1;
  let colPmIn = -1;
  let colPmOut = -1;

  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim().toLowerCase();
      if (val === 'no.' || val === 'no' || val === 'emp no' || val === 'emp. no.' || val === 'id' || val === 'employee no') {
        colNo = c;
        headerRowIndex = r;
      }
      if (val === 'name' || val === 'employee name' || val === 'full name' || val === 'staff') {
        colName = c;
        headerRowIndex = r;
      }
      if (val === 'department' || val === 'dept') {
        colDept = c;
      }
      if (val === 'date' || val === 'log date' || val === 'attendance date') {
        colDate = c;
        headerRowIndex = r;
      }
      if (val === 'am' || val === 'am in' || val === 'in' || val === 'time in' || val === 'am_in') {
        if (colAmIn === -1) colAmIn = c;
      }
      if (val === 'pm' || val === 'pm out' || val === 'out' || val === 'time out' || val === 'pm_out') {
        if (colPmOut === -1) colPmOut = c;
      }
    }
    if (colDate !== -1 && (colNo !== -1 || colName !== -1)) {
      break;
    }
  }

  // Fallback defaults if header row was merged or stylized as in DTR.png
  if (colNo === -1) colNo = 0;
  if (colName === -1) colName = 1;
  if (colDept === -1) colDept = 2;
  if (colDate === -1) colDate = 3;
  if (colAmIn === -1) colAmIn = 4;
  if (colPmOut === -1) {
    // In DTR.png, AM is at col 4, blank at 5, PM is at col 6/7
    colPmOut = 6;
  }
  if (headerRowIndex === -1) headerRowIndex = 4;

  // 3. Parse Data Rows
  interface RawLogEntry {
    rowNum: number;
    rawNo: string;
    rawName: string;
    rawDept: string;
    dateStr: string; // YYYY-MM-DD
    amIn: string;
    pmOut: string;
  }

  const rawEntries: RawLogEntry[] = [];
  const unmatchedRows: ParsedDTRResult['unmatchedRows'] = [];
  const foundDates: string[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawNo = String(row[colNo] ?? '').trim();
    const rawName = String(row[colName] ?? '').trim();
    const rawDept = colDept !== -1 ? String(row[colDept] ?? '').trim() : '';
    const rawDateVal = row[colDate];
    const rawAmVal = row[colAmIn];
    
    // In DTR.png, PM out can be at col 6 or col 7 depending on merged subheader
    let rawPmVal = row[colPmOut];
    if ((!rawPmVal || rawPmVal === '') && row[colPmOut + 1]) {
      rawPmVal = row[colPmOut + 1];
    }
    if ((!rawPmVal || rawPmVal === '') && row[5]) {
      // Check adjacent column
      const testVal = formatExcelTime(row[5]);
      if (testVal && testVal >= '12:00') {
        rawPmVal = row[5];
      }
    }

    const formattedDate = formatExcelDate(rawDateVal);
    const amIn = formatExcelTime(rawAmVal);
    const pmOut = formatExcelTime(rawPmVal);

    // Skip blank or non-data rows
    if (!rawNo && !rawName && !formattedDate) continue;

    if (!formattedDate) {
      // Ignore summary rows like "TOTAL"
      if (rawName.toLowerCase().includes('total') || rawNo.toLowerCase().includes('total')) continue;
      unmatchedRows.push({
        rowNum: r + 1,
        rawNo,
        rawName,
        rawDate: String(rawDateVal || ''),
        rawTimeIn: amIn,
        rawTimeOut: pmOut,
        reason: 'Invalid or missing date'
      });
      continue;
    }

    foundDates.push(formattedDate);
    rawEntries.push({
      rowNum: r + 1,
      rawNo,
      rawName,
      rawDept,
      dateStr: formattedDate,
      amIn,
      pmOut
    });
  }

  // 4. Infer Cutoff Period if not explicitly in header
  if (!headerDateFound && foundDates.length > 0) {
    foundDates.sort();
    const firstDate = foundDates[0];
    const lastDate = foundDates[foundDates.length - 1];
    const firstParts = firstDate.split('-');
    const lastParts = lastDate.split('-');
    
    detectedYear = parseInt(firstParts[0], 10);
    detectedMonth = parseInt(firstParts[1], 10);
    detectedStartDay = parseInt(firstParts[2], 10);
    detectedEndDay = parseInt(lastParts[2], 10);
  }

  // Determine standard cutoff label and period type
  const monthName = MONTH_NAMES[detectedMonth - 1] || 'August';
  const periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly' = 
    detectedStartDay <= 1 && detectedEndDay <= 15 
      ? '1st Half (1-15)' 
      : (detectedStartDay >= 16 ? '2nd Half (16-30/31)' : 'Monthly');

  const detectedCutoffPeriod = `${monthName} ${detectedStartDay}-${detectedEndDay}, ${detectedYear}`;

  // 5. Group Log Entries by Employee
  // Key: rawNo + '::' + rawName
  const groupedByEmp: Record<string, RawLogEntry[]> = {};
  rawEntries.forEach(entry => {
    const key = `${entry.rawNo}::${entry.rawName.toLowerCase()}`;
    if (!groupedByEmp[key]) groupedByEmp[key] = [];
    groupedByEmp[key].push(entry);
  });

  const matchedReports: CutoffAttendanceReport[] = [];
  const employeeSummaries: ParsedDTRResult['employeeSummaries'] = [];

  // Helper to match an employee
  const matchCompanyEmployee = (rawNo: string, rawName: string): CompanyEmployee | null => {
    const cleanNo = rawNo.replace(/\D/g, '');
    const cleanName = rawName.trim().toLowerCase();

    // 1. Match by Employee Number
    const byNo = employees.find(e => {
      const empDigits = e.employeeNo.replace(/\D/g, '');
      return (
        e.employeeNo.toLowerCase() === rawNo.toLowerCase() ||
        (cleanNo !== '' && empDigits === cleanNo) ||
        e.id.toLowerCase() === rawNo.toLowerCase()
      );
    });
    if (byNo) return byNo;

    // 2. Match by Name / Surname (e.g. "Santos" matches "Maria Teresa Santos", "Cruz" matches "Juan dela Cruz")
    const byName = employees.find(e => {
      const fullLower = e.fullName.toLowerCase();
      if (fullLower === cleanName) return true;
      if (fullLower.includes(cleanName) && cleanName.length >= 3) return true;
      const nameParts = fullLower.split(/\s+/);
      return nameParts.some(p => p === cleanName || cleanName.includes(p));
    });
    if (byName) return byName;

    return null;
  };

  const dayOfWeekAbbrs = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // 6. Build Cutoff Attendance Reports for each matched employee
  for (const [key, entries] of Object.entries(groupedByEmp)) {
    const [rawNo, rawNameLower] = key.split('::');
    const firstEntry = entries[0];
    const rawName = firstEntry.rawName || rawNameLower;

    let targetEmp = matchCompanyEmployee(rawNo, rawName);

    // If employee is not found in roster, create a dynamic entry
    if (!targetEmp) {
      targetEmp = {
        id: `emp_${rawNo || Date.now()}`,
        employeeNo: rawNo ? `EMP-${String(rawNo).padStart(3, '0')}` : 'EMP-NEW',
        fullName: rawName || `Employee ${rawNo}`,
        position: firstEntry.rawDept ? `${firstEntry.rawDept} Staff` : 'Staff Member',
        department: firstEntry.rawDept || 'Operations',
        dateHired: `${detectedYear}-01-01`,
        employmentType: 'Regular',
        monthlyBasicSalary: 25000,
        dailyRate: 1136.36,
        hourlyRate: 142.05,
        tinNumber: '000-000-000-000',
        sssNumber: '00-0000000-0',
        philhealthNumber: '00-000000000-0',
        pagibigNumber: '0000-0000-0000',
        bankName: 'BDO Unibank',
        accountNumber: '0000000000',
        status: 'Active',
        silBalance: 5,
        vlBalance: 5,
        slBalance: 5,
        currentValeBalance: 0,
        defaultValeDeduction: 0
      };
    }

    const dailyRate = targetEmp.dailyRate || Number((targetEmp.monthlyBasicSalary / 22).toFixed(2));
    const hourlyRate = targetEmp.hourlyRate || Number((dailyRate / 8).toFixed(2));

    // Map logs by date (YYYY-MM-DD)
    const logsByDate: Record<string, RawLogEntry> = {};
    entries.forEach(e => {
      logsByDate[e.dateStr] = e;
    });

    const records: DailyAttendanceRecord[] = [];

    for (let d = detectedStartDay; d <= detectedEndDay; d++) {
      const dt = new Date(detectedYear, detectedMonth - 1, d);
      const dayOfWeek = dayOfWeekAbbrs[dt.getDay()];
      const isWeekend = dayOfWeek === 'Sa' || dayOfWeek === 'Su';
      const dateStr = `${detectedYear}-${String(detectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const log = logsByDate[dateStr];
      const amIn = log ? log.amIn : '';
      const pmOut = log ? log.pmOut : '';

      // Check approved leave
      const approvedLeave = (leaveRecords || []).find(l => 
        l.employeeId === targetEmp!.id &&
        l.status === 'Approved' &&
        dateStr >= l.startDate &&
        dateStr <= l.endDate
      );

      const rec = computeDailyAttendanceMetrics(
        dateStr,
        d,
        dayOfWeek,
        amIn,
        '',
        '',
        pmOut,
        0,
        isWeekend,
        false,
        'None',
        dailyRate,
        hourlyRate
      );

      if (approvedLeave && !isWeekend) {
        rec.remarks = `On Leave (${approvedLeave.leaveType})`;
        rec.absent = approvedLeave.isPaid ? 0 : 1;
      }

      records.push(rec);
    }

    const totalDaysWorked = records.filter(r => (r.amIn || r.pmIn) && !r.isRestDay).length;
    const totalDaysAbsent = records.reduce((s, r) => s + r.absent, 0);
    const totalLateMinutes = records.reduce((s, r) => s + r.lateMinutes, 0);
    const totalEarlyOutMinutes = records.reduce((s, r) => s + r.earlyOutMinutes, 0);
    const totalOtHours = Number(records.reduce((s, r) => s + r.otHours, 0).toFixed(2));
    const totalHolidayHours = records.filter(r => r.isHoliday && (r.amIn || r.pmIn)).length * 8;
    const totalHolidayPay = Number(records.reduce((s, r) => s + r.holidayPay, 0).toFixed(2));
    const totalNightDiffHours = Number(records.reduce((s, r) => s + r.nightDiffHours, 0).toFixed(2));
    const totalNightDiffPay = Number(records.reduce((s, r) => s + r.nightDiffPay, 0).toFixed(2));

    const report: CutoffAttendanceReport = {
      id: `att_${targetEmp.id}_${detectedYear}_${detectedMonth}_${periodType.replace(/\s+/g, '_')}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      employeeNo: targetEmp.employeeNo,
      position: targetEmp.position,
      monthlyBasicSalary: targetEmp.monthlyBasicSalary,
      dailyRate,
      hourlyRate,
      cutoffPeriod: detectedCutoffPeriod,
      periodType,
      year: detectedYear,
      month: detectedMonth,
      records,
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

    matchedReports.push(report);
    employeeSummaries.push({
      employeeId: targetEmp.id,
      employeeNo: targetEmp.employeeNo,
      employeeName: targetEmp.fullName,
      matchedRawName: rawName,
      daysWithLogs: entries.length,
      totalLateMinutes,
      totalEarlyOutMinutes,
      totalOtHours,
      totalDaysAbsent,
      report
    });
  }

  // 7. Auto-save all generated reports to local persistent storage
  saveCutoffAttendanceStore(matchedReports);

  return {
    success: matchedReports.length > 0,
    message: `Successfully processed ${rawEntries.length} timekeeping rows for ${matchedReports.length} employee(s) covering ${detectedCutoffPeriod}!`,
    detectedCutoffPeriod,
    periodType,
    year: detectedYear,
    month: detectedMonth,
    totalRowsProcessed: rawEntries.length,
    matchedReports,
    unmatchedRows,
    employeeSummaries
  };
}

/**
 * Generates sample/standard cutoff attendance records (checks stored custom reports first)
 */
export function generateCutoffAttendance(
  employee: CompanyEmployee,
  cutoffPeriod: string = 'August 16-31, 2026',
  periodType?: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly',
  customYear?: number,
  customMonth?: number,
  leaveRecords?: LeaveRecord[]
): CutoffAttendanceReport {
  // Check if a user-uploaded / custom edited attendance report exists in store!
  const stored = getStoredCutoffAttendance(employee.id, cutoffPeriod);
  if (stored && stored.records && stored.records.length > 0) {
    return stored;
  }

  const parsed = parseCutoffString(cutoffPeriod);
  const effectivePeriodType = periodType || parsed.periodType;
  const year = customYear || parsed.year;
  const month = customMonth || parsed.month;

  const dailyRate = employee.dailyRate || Number((employee.monthlyBasicSalary / 22).toFixed(2));
  const hourlyRate = employee.hourlyRate || Number((dailyRate / 8).toFixed(2));

  const startDay = effectivePeriodType === '1st Half (1-15)' ? 1 : (effectivePeriodType === '2nd Half (16-30/31)' ? 16 : 1);
  const endDay = effectivePeriodType === '1st Half (1-15)' ? 15 : new Date(year, month, 0).getDate();

  const dayOfWeekAbbrs = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Realistic time variations matching screenshot
  const sampleTimes = [
    { in: '08:26', out: '17:31' },
    { in: '08:32', out: '17:31' },
    { in: '08:37', out: '17:33' },
    { in: '08:32', out: '17:32' },
    { in: '08:31', out: '17:32' },
    { in: '08:34', out: '17:32' },
    { in: '08:31', out: '17:34' },
    { in: '08:32', out: '17:33' },
    { in: '08:34', out: '17:36' },
    { in: '08:36', out: '17:35' },
    { in: '08:29', out: '17:32' },
    { in: '08:30', out: '17:33' }
  ];

  let sampleIdx = 0;
  const records: DailyAttendanceRecord[] = [];

  for (let d = startDay; d <= endDay; d++) {
    const dt = new Date(year, month - 1, d);
    const dayOfWeek = dayOfWeekAbbrs[dt.getDay()];
    const isWeekend = dayOfWeek === 'Sa' || dayOfWeek === 'Su';
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // Check if employee has an approved leave on this date
    const approvedLeave = (leaveRecords || []).find(l => 
      l.employeeId === employee.id &&
      l.status === 'Approved' &&
      dateStr >= l.startDate &&
      dateStr <= l.endDate
    );

    let amIn = '';
    let pmOut = '';

    if (!isWeekend) {
      if (!approvedLeave) {
        const sample = sampleTimes[sampleIdx % sampleTimes.length];
        sampleIdx++;
        amIn = sample.in;
        pmOut = sample.out;
      }
    }

    const rec = computeDailyAttendanceMetrics(
      dateStr,
      d,
      dayOfWeek,
      amIn,
      '',
      '',
      pmOut,
      0,
      isWeekend,
      false,
      'None',
      dailyRate,
      hourlyRate
    );

    // If on approved leave, override metrics
    if (approvedLeave && !isWeekend) {
      rec.remarks = `On Leave (${approvedLeave.leaveType})`;
      if (approvedLeave.isPaid) {
        rec.absent = 0; // Paid leave is excused
      } else {
        rec.absent = 1; // Unpaid leave counts as absent day
      }
    }

    records.push(rec);
  }

  const totalDaysWorked = records.filter(r => (r.amIn || r.pmIn) && !r.isRestDay).length;
  const totalDaysAbsent = records.reduce((s, r) => s + r.absent, 0);
  const totalLateMinutes = records.reduce((s, r) => s + r.lateMinutes, 0);
  const totalEarlyOutMinutes = records.reduce((s, r) => s + r.earlyOutMinutes, 0);
  const totalOtHours = Number(records.reduce((s, r) => s + r.otHours, 0).toFixed(2));
  const totalHolidayHours = records.filter(r => r.isHoliday && (r.amIn || r.pmIn)).length * 8;
  const totalHolidayPay = Number(records.reduce((s, r) => s + r.holidayPay, 0).toFixed(2));
  const totalNightDiffHours = Number(records.reduce((s, r) => s + r.nightDiffHours, 0).toFixed(2));
  const totalNightDiffPay = Number(records.reduce((s, r) => s + r.nightDiffPay, 0).toFixed(2));

  return {
    id: `att_${employee.id}_${year}_${month}_${effectivePeriodType.replace(/\s+/g, '_')}`,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeNo: employee.employeeNo,
    position: employee.position,
    monthlyBasicSalary: employee.monthlyBasicSalary,
    dailyRate,
    hourlyRate,
    cutoffPeriod,
    periodType: effectivePeriodType,
    year,
    month,
    records,
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
}

/**
 * Downloads a ready-to-use Exceptionals DTR Template matching DTR.png
 */
export function downloadExceptionalsDTRTemplate() {
  const wsData: any[][] = [];

  // Row 1: Header title
  wsData.push(['Exceptionals']);
  wsData.push([]);
  
  // Row 3: Date range
  wsData.push(['Date:', '2026/07/16 ~ 07/31']);
  wsData.push([]);

  // Row 5: Column headers
  wsData.push(['No.', 'Name', 'Department', 'Date', 'AM', '', 'PM']);

  // Sample data rows matching screenshot
  const sampleSantos = [
    { d: '2026/07/16', am: '08:26', pm: '17:31' },
    { d: '2026/07/17', am: '08:32', pm: '17:31' },
    { d: '2026/07/20', am: '08:37', pm: '17:33' },
    { d: '2026/07/21', am: '08:32', pm: '17:32' },
    { d: '2026/07/22', am: '08:31', pm: '17:32' },
    { d: '2026/07/23', am: '08:34', pm: '17:32' },
    { d: '2026/07/24', am: '08:31', pm: '17:34' },
    { d: '2026/07/27', am: '08:32', pm: '17:33' },
    { d: '2026/07/28', am: '08:34', pm: '17:36' },
    { d: '2026/07/29', am: '08:36', pm: '17:35' },
    { d: '2026/07/30', am: '08:29', pm: '17:32' },
    { d: '2026/07/31', am: '08:30', pm: '17:33' }
  ];

  sampleSantos.forEach(s => {
    wsData.push([1, 'Santos', '', s.d, s.am, '', s.pm]);
  });

  const sampleCruz = [
    { d: '2026/07/16', am: '09:22', pm: '17:34' },
    { d: '2026/07/17', am: '09:26', pm: '17:30' },
    { d: '2026/07/20', am: '09:01', pm: '17:32' },
    { d: '2026/07/21', am: '09:35', pm: '17:32' },
    { d: '2026/07/22', am: '09:16', pm: '17:48' },
    { d: '2026/07/23', am: '09:32', pm: '17:31' },
    { d: '2026/07/24', am: '09:41', pm: '17:43' },
    { d: '2026/07/27', am: '09:09', pm: '17:31' },
    { d: '2026/07/28', am: '08:52', pm: '17:35' },
    { d: '2026/07/30', am: '09:06', pm: '17:31' },
    { d: '2026/07/31', am: '09:11', pm: '17:31' }
  ];

  sampleCruz.forEach(c => {
    wsData.push([2, 'Cruz', '', c.d, c.am, '', c.pm]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  worksheet['!cols'] = [
    { wch: 8 },  // No.
    { wch: 18 }, // Name
    { wch: 16 }, // Department
    { wch: 14 }, // Date
    { wch: 10 }, // AM In
    { wch: 10 }, // AM Out
    { wch: 10 }  // PM Out
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Exceptionals');
  XLSX.writeFile(workbook, 'Exceptionals_DTR_Template.xlsx');
}

/**
 * Export Attendance Report matching the Excel format from Attendance.png
 */
export function exportAttendanceReportToExcel(report: CutoffAttendanceReport) {
  const wsData: any[][] = [];

  // Row 1: Attendance Report Title
  wsData.push(['Attendance Report']);
  wsData.push([`Employee: ${report.employeeName} (${report.employeeNo})`, `Position: ${report.position}`, `Cutoff: ${report.cutoffPeriod}`]);
  wsData.push([]); // Empty row

  // Row 4: Main Header Group
  wsData.push(['Attendance List', '', '', '', '', '', 'Late', 'Absent', 'Early Out', 'Holiday Pay', 'Night Differential']);

  // Row 5: Column Subheaders
  wsData.push(['dd/ww', 'AM In', 'AM Out', 'PM In', 'PM Out', 'OT', '(Minutes)', '(Days)', '(Minutes)', '(₱ Amount)', '(Hours)']);

  // Data rows
  report.records.forEach(r => {
    wsData.push([
      r.ddWwLabel,
      r.amIn,
      r.amOut,
      r.pmIn,
      r.pmOut,
      r.otHours > 0 ? r.otHours : '',
      r.lateMinutes > 0 ? r.lateMinutes : '',
      r.absent > 0 ? r.absent : '',
      r.earlyOutMinutes > 0 ? r.earlyOutMinutes : '',
      r.holidayPay > 0 ? `₱${r.holidayPay.toFixed(2)}` : '',
      r.nightDiffHours > 0 ? r.nightDiffHours : ''
    ]);
  });

  // Summary Row
  wsData.push([]);
  wsData.push([
    'TOTALS',
    '',
    '',
    '',
    '',
    report.totalOtHours > 0 ? `${report.totalOtHours} hrs` : '0 hrs',
    `${report.totalLateMinutes} mins`,
    `${report.totalDaysAbsent} days`,
    `${report.totalEarlyOutMinutes} mins`,
    `₱${report.totalHolidayPay.toFixed(2)}`,
    `${report.totalNightDiffHours} hrs`
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
  
  const fileName = `Attendance_Report_${report.employeeName.replace(/\s+/g, '_')}_${report.cutoffPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
