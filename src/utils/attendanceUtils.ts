import * as XLSX from 'xlsx';
import { DailyAttendanceRecord, CutoffAttendanceReport, CompanyEmployee } from '../types';
import { parseTimeToMinutes } from '../lib/dolePayroll';

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

  // Effective time in and out
  const effectiveInStr = cleanAmIn || cleanPmIn;
  const effectiveOutStr = cleanPmOut || cleanAmOut;

  const inMins = parseTimeToMinutes(effectiveInStr);
  let outMins = parseTimeToMinutes(effectiveOutStr);

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
 * Generates sample/standard cutoff attendance records matching the Attendance Report image
 */
export function generateCutoffAttendance(
  employee: CompanyEmployee,
  cutoffPeriod: string = 'August 16-31, 2026',
  periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly' = '2nd Half (16-30/31)',
  year: number = 2026,
  month: number = 8
): CutoffAttendanceReport {
  const dailyRate = employee.dailyRate || Number((employee.monthlyBasicSalary / 22).toFixed(2));
  const hourlyRate = employee.hourlyRate || Number((dailyRate / 8).toFixed(2));

  const startDay = periodType === '1st Half (1-15)' ? 1 : (periodType === '2nd Half (16-30/31)' ? 16 : 1);
  const endDay = periodType === '1st Half (1-15)' ? 15 : new Date(year, month, 0).getDate();

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

    let amIn = '';
    let pmOut = '';

    if (!isWeekend) {
      const sample = sampleTimes[sampleIdx % sampleTimes.length];
      sampleIdx++;
      amIn = sample.in;
      pmOut = sample.out;
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
    id: `att_${employee.id}_${year}_${month}_${periodType.replace(/\s+/g, '_')}`,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeNo: employee.employeeNo,
    position: employee.position,
    monthlyBasicSalary: employee.monthlyBasicSalary,
    dailyRate,
    hourlyRate,
    cutoffPeriod,
    periodType,
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
