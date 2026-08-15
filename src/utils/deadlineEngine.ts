import { 
  ClientProfile, 
  CustomDeadlineRule, 
  HolidayItem, 
  DeadlineExtensionRule, 
  WeekendAdjustmentConfig, 
  CalculatedClientDeadline, 
  MasterChoices,
  PaymentBehavior,
  FilingRequired,
  SubmissionMethod,
  ComplianceCategory
} from '../types';
import { 
  MONTHS_LIST, 
  MONTH_FULL_NAMES, 
  MONTH_INDEX 
} from '../data/masterTables';

// ==========================================
// DEFAULT PHILIPPINE HOLIDAYS (2025 - 2027) ⭐
// ==========================================
export const DEFAULT_HOLIDAYS: HolidayItem[] = [
  // 2025
  { id: 'hol_2025_01_01', date: '2025-01-01', name: "New Year's Day", type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_04_09', date: '2025-04-09', name: 'Araw ng Kagitingan', type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_04_17', date: '2025-04-17', name: 'Maundy Thursday', type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_04_18', date: '2025-04-18', name: 'Good Friday', type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_04_19', date: '2025-04-19', name: 'Black Saturday', type: 'Special Non-Working', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_05_01', date: '2025-05-01', name: 'Labor Day', type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_06_12', date: '2025-06-12', name: 'Independence Day', type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_08_21', date: '2025-08-21', name: 'Ninoy Aquino Day', type: 'Special Non-Working', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_08_25', date: '2025-08-25', name: 'National Heroes Day', type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_11_01', date: '2025-11-01', name: "All Saints' Day", type: 'Special Non-Working', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_11_30', date: '2025-11-30', name: 'Bonifacio Day', type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_12_08', date: '2025-12-08', name: 'Feast of the Immaculate Conception', type: 'Special Non-Working', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_12_25', date: '2025-12-25', name: 'Christmas Day', type: 'Regular', scope: 'Nationwide', year: 2025 },
  { id: 'hol_2025_12_30', date: '2025-12-30', name: 'Rizal Day', type: 'Regular', scope: 'Nationwide', year: 2025 },

  // 2026
  { id: 'hol_2026_01_01', date: '2026-01-01', name: "New Year's Day", type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_01_02', date: '2026-01-02', name: 'Special Non-Working Day (Additional)', type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_02_25', date: '2026-02-25', name: 'EDSA People Power Revolution Anniversary', type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_04_02', date: '2026-04-02', name: 'Maundy Thursday', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_04_03', date: '2026-04-03', name: 'Good Friday', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_04_04', date: '2026-04-04', name: 'Black Saturday', type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_04_09', date: '2026-04-09', name: 'Araw ng Kagitingan (Day of Valor)', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_05_01', date: '2026-05-01', name: 'Labor Day', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_06_12', date: '2026-06-12', name: 'Independence Day', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_08_21', date: '2026-08-21', name: 'Ninoy Aquino Day', type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_08_31', date: '2026-08-31', name: 'National Heroes Day', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_11_01', date: '2026-11-01', name: "All Saints' Day", type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_11_02', date: '2026-11-02', name: "All Souls' Day", type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_11_30', date: '2026-11-30', name: 'Bonifacio Day', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_12_08', date: '2026-12-08', name: 'Feast of the Immaculate Conception', type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_12_24', date: '2026-12-24', name: 'Christmas Eve (Special Non-Working)', type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_12_25', date: '2026-12-25', name: 'Christmas Day', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_12_30', date: '2026-12-30', name: 'Rizal Day', type: 'Regular', scope: 'Nationwide', year: 2026 },
  { id: 'hol_2026_12_31', date: '2026-12-31', name: 'Last Day of the Year', type: 'Special Non-Working', scope: 'Nationwide', year: 2026 },

  // 2027
  { id: 'hol_2027_01_01', date: '2027-01-01', name: "New Year's Day", type: 'Regular', scope: 'Nationwide', year: 2027 },
  { id: 'hol_2027_03_25', date: '2027-03-25', name: 'Maundy Thursday', type: 'Regular', scope: 'Nationwide', year: 2027 },
  { id: 'hol_2027_03_26', date: '2027-03-26', name: 'Good Friday', type: 'Regular', scope: 'Nationwide', year: 2027 },
  { id: 'hol_2027_04_09', date: '2027-04-09', name: 'Araw ng Kagitingan', type: 'Regular', scope: 'Nationwide', year: 2027 },
  { id: 'hol_2027_05_01', date: '2027-05-01', name: 'Labor Day', type: 'Regular', scope: 'Nationwide', year: 2027 },
  { id: 'hol_2027_06_12', date: '2027-06-12', name: 'Independence Day', type: 'Regular', scope: 'Nationwide', year: 2027 },
  { id: 'hol_2027_08_30', date: '2027-08-30', name: 'National Heroes Day', type: 'Regular', scope: 'Nationwide', year: 2027 },
  { id: 'hol_2027_12_25', date: '2027-12-25', name: 'Christmas Day', type: 'Regular', scope: 'Nationwide', year: 2027 }
];

// Default Weekend Adjustment Configuration ⭐
export const DEFAULT_WEEKEND_CONFIG: WeekendAdjustmentConfig = {
  enabled: true,
  rule: 'NEXT_WORKING_DAY',
  adjustForHolidays: true
};

// Default Initial Extensions (e.g. BIR Memorandum Circulars) ⭐
export const DEFAULT_DEADLINE_EXTENSIONS: DeadlineExtensionRule[] = [
  {
    id: 'ext_rmc_2026_038_q1',
    title: 'BIR RMC No. 18-2026: RDO 038 Extended 2550Q Q1 Filing',
    scope: 'RDO',
    targetRdo: '038',
    targetFormCode: '2550Q',
    category: 'BIR',
    applicableYear: 2026,
    applicableMonth: 'Apr',
    applicablePeriod: '1Q - 2026',
    extendedDeadlineDate: '2026-05-05',
    reason: 'BIR Revenue Memorandum Circular No. 18-2026 due to regional portal maintenance in RDO 038.',
    status: 'Active',
    createdAt: '2026-03-01',
    createdBy: 'BIR Memorandum'
  }
];

// ==========================================
// WEEKEND & HOLIDAY ADJUSTER ⭐
// ==========================================
export function adjustDateForWeekendsAndHolidays(
  dateStr: string,
  holidays: HolidayItem[] = DEFAULT_HOLIDAYS,
  weekendConfig: WeekendAdjustmentConfig = DEFAULT_WEEKEND_CONFIG,
  clientRdo?: string
): { 
  adjustedDateStr: string; 
  wasShifted: boolean; 
  shiftReasons: string[];
  holidayShift: boolean;
  weekendShift: boolean;
} {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'NONE') {
    return { adjustedDateStr: dateStr, wasShifted: false, shiftReasons: [], holidayShift: false, weekendShift: false };
  }

  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return { adjustedDateStr: dateStr, wasShifted: false, shiftReasons: [], holidayShift: false, weekendShift: false };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const dt = new Date(year, month, day);

  if (isNaN(dt.getTime())) {
    return { adjustedDateStr: dateStr, wasShifted: false, shiftReasons: [], holidayShift: false, weekendShift: false };
  }

  // If weekend adjustments are disabled entirely
  if (!weekendConfig.enabled && !weekendConfig.adjustForHolidays) {
    return { adjustedDateStr: dateStr, wasShifted: false, shiftReasons: [], holidayShift: false, weekendShift: false };
  }

  let wasShifted = false;
  let holidayShift = false;
  let weekendShift = false;
  const shiftReasons: string[] = [];

  let safety = 0;
  while (safety < 14) {
    const dayOfWeek = dt.getDay(); // 0 = Sun, 6 = Sat
    const currIso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    // 1. Check Weekend
    if (weekendConfig.enabled && (dayOfWeek === 0 || dayOfWeek === 6)) {
      wasShifted = true;
      weekendShift = true;
      if (weekendConfig.rule === 'PREVIOUS_WORKING_DAY') {
        const offset = dayOfWeek === 0 ? 2 : 1; // Sun -> Fri (2 days back), Sat -> Fri (1 day back)
        dt.setDate(dt.getDate() - offset);
        shiftReasons.push(`Weekend (${dayOfWeek === 6 ? 'Saturday' : 'Sunday'}) adjusted to Friday`);
      } else {
        // NEXT_WORKING_DAY default
        const offset = dayOfWeek === 6 ? 2 : 1; // Sat -> Mon (2 days fwd), Sun -> Mon (1 day fwd)
        dt.setDate(dt.getDate() + offset);
        shiftReasons.push(`Weekend (${dayOfWeek === 6 ? 'Saturday' : 'Sunday'}) adjusted to Monday`);
      }
      safety++;
      continue;
    }

    // 2. Check Holidays
    if (weekendConfig.adjustForHolidays) {
      const matchingHoliday = holidays.find(h => {
        if (h.date !== currIso) return false;
        if (h.scope === 'Nationwide') return true;
        if (h.scope === 'Regional' && clientRdo && h.rdoCode === clientRdo) return true;
        return false;
      });

      if (matchingHoliday) {
        wasShifted = true;
        holidayShift = true;
        if (weekendConfig.rule === 'PREVIOUS_WORKING_DAY') {
          dt.setDate(dt.getDate() - 1);
          shiftReasons.push(`Holiday: ${matchingHoliday.name} (${currIso}) shifted to prior working day`);
        } else {
          dt.setDate(dt.getDate() + 1);
          shiftReasons.push(`Holiday: ${matchingHoliday.name} (${currIso}) shifted to next working day`);
        }
        safety++;
        continue;
      }
    }

    // Neither weekend nor holiday reached -> target working day settled
    break;
  }

  const finalIso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return {
    adjustedDateStr: finalIso,
    wasShifted,
    shiftReasons,
    holidayShift,
    weekendShift
  };
}

// ==========================================
// CENTRAL CLIENT DEADLINE CALCULATOR ⭐
// ==========================================
export interface CalculateDeadlineParams {
  client: ClientProfile;
  rule: CustomDeadlineRule;
  month: string; // e.g. "Jan", "Feb", "Apr", "Aug", etc.
  year?: number; // e.g. 2026
  masterChoices?: MasterChoices;
}

export function calculateClientDeadline(params: CalculateDeadlineParams): CalculatedClientDeadline | null {
  const { client, rule, month, year = 2026, masterChoices } = params;

  if (!client || !rule || !month) return null;

  const mIdx = MONTH_INDEX[month];
  if (mIdx === undefined) return null;

  const ruleCategory = rule.category;
  const isBir = ruleCategory === 'BIR';
  const isBenefits = ruleCategory === 'Benefits';
  const cleanCode = (rule.code || '').trim();
  const codeUpper = cleanCode.toUpperCase();

  // 1. Client Applicability Verification ⭐
  // Verify that this compliance form or benefit actually applies to this specific client
  let isApplicable = false;

  if (isBir) {
    isApplicable = (client.birTaxServices || []).some(
      s => s.trim().toUpperCase() === codeUpper || codeUpper.includes(s.trim().toUpperCase())
    );
  } else if (isBenefits) {
    isApplicable = (client.benefitsServices || []).some(
      s => s.trim().toUpperCase() === codeUpper || 
           s.toLowerCase().includes(rule.code.toLowerCase()) || 
           rule.code.toLowerCase().includes(s.toLowerCase())
    );
  } else {
    // For DTI, SEC, or Other
    if (rule.category === 'SEC' && (client.entityType === 'Corporation' || client.entityType === 'Partnership')) {
      isApplicable = true;
    } else if (rule.category === 'DTI' && client.entityType === 'Proprietor') {
      isApplicable = true;
    } else {
      isApplicable = false;
    }
  }

  // Exclusive client check if rule is marked client-exclusive
  if (rule.isExclusiveToClient && rule.exclusiveClientId) {
    if (rule.exclusiveClientId !== client.id) {
      return null;
    }
  }

  if (!isApplicable) {
    return {
      id: `${client.id}_${rule.code}_${year}_${month}`,
      clientId: client.id,
      clientName: client.companyName,
      tinNumber: client.tinNumber,
      rdoNumber: client.rdoNumber,
      registrationMethod: client.registrationMethod || 'Manual',
      entityType: client.entityType,
      formCode: rule.code,
      formName: rule.name,
      category: rule.category,
      frequency: rule.frequency,
      taxablePeriod: 'Not Applicable',
      periodMonth: month,
      periodYear: year,
      defaultDeadline: 'N/A',
      adjustedDeadline: 'N/A',
      finalDeadline: 'N/A',
      deadlineSource: 'Form Not Applicable for Client',
      holidayAdjustment: false,
      weekendAdjustment: false,
      wasShifted: false,
      isNotRequired: true
    };
  }

  // 2. Resolve Base Default Schedule & Period Label ⭐
  let rawDueDate: string | null = null;
  let rawPeriodLabel = '';
  let isNotRequired = false;

  const mStr = String(mIdx + 1).padStart(2, '0');

  // eFPS Staggered Filing Baseline check:
  // eFPS filers for monthly returns (0619E, 1601C) have staggered filing dates (11th to 15th)
  const isEfps = client.registrationMethod === 'eFPS';
  let defaultDeadlineDay = rule.deadlineDay || 10;
  if (isEfps && rule.frequency === 'Monthly' && isBir) {
    if (codeUpper === '0619E' || codeUpper === '1601C') {
      // eFPS staggered deadline is on 15th (or configured eFPS day)
      defaultDeadlineDay = Math.max(rule.deadlineDay || 10, 15);
    }
  }

  const dayPad = String(defaultDeadlineDay).padStart(2, '0');

  // --- Fiscal Year Client Deadline Shift Calculation ---
  if (client.accountingPeriod === 'Fiscal' && client.fiscalYearEndMonth) {
    const rawFyMonth = client.fiscalYearEndMonth || 'June';
    let fyEndIdx = 5; // Default June
    const monthKey = Object.keys(MONTH_FULL_NAMES).find(
      k => MONTH_FULL_NAMES[k].toLowerCase() === rawFyMonth.toLowerCase() || k.toLowerCase() === rawFyMonth.toLowerCase()
    );
    if (monthKey && MONTH_INDEX[monthKey] !== undefined) {
      fyEndIdx = MONTH_INDEX[monthKey];
    } else {
      const parsed = parseInt(rawFyMonth, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        fyEndIdx = parsed - 1;
      }
    }

    const fyMonthFullName = MONTH_FULL_NAMES[MONTHS_LIST[fyEndIdx]] || rawFyMonth;

    // 1. Annual Income Tax Return (ITR / 1702 / 1701)
    if (codeUpper === 'ITR' || (codeUpper.includes('1702') && !codeUpper.includes('1702Q')) || rule.frequency === 'Annually') {
      const dueMonthIdx = (fyEndIdx + 4) % 12; // 15th day of 4th month following FY close
      if (mIdx === dueMonthIdx) {
        rawDueDate = `${year}-${mStr}-${dayPad}`;
        rawPeriodLabel = `FY-Ended ${fyMonthFullName}`;
      } else {
        isNotRequired = true;
      }
    }
    // 2. Quarterly Corporate Income Tax Return (1702Q / 1701Q)
    else if (codeUpper === '1702Q' || codeUpper === '1701Q') {
      const q1Due = (fyEndIdx + 5) % 12; // 60 days after Q1
      const q2Due = (fyEndIdx + 8) % 12; // 60 days after Q2
      const q3Due = (fyEndIdx + 11) % 12; // 60 days after Q3
      const qDay = codeUpper === '1701Q' ? '15' : '29';

      if (mIdx === q1Due) {
        rawDueDate = `${year}-${mStr}-${qDay}`;
        rawPeriodLabel = `1Q FY-Ended ${fyMonthFullName}`;
      } else if (mIdx === q2Due) {
        rawDueDate = `${year}-${mStr}-${qDay}`;
        rawPeriodLabel = `2Q FY-Ended ${fyMonthFullName}`;
      } else if (mIdx === q3Due) {
        rawDueDate = `${year}-${mStr}-${qDay}`;
        rawPeriodLabel = `3Q FY-Ended ${fyMonthFullName}`;
      } else {
        isNotRequired = true;
      }
    }
    // 3. Quarterly VAT / Percentage Tax / Expanded Withholding (2550Q / 2551Q / 1601EQ)
    else if (['2550Q', '2551Q', '1601EQ'].includes(codeUpper)) {
      const q1Due = (fyEndIdx + 4) % 12;
      const q2Due = (fyEndIdx + 7) % 12;
      const q3Due = (fyEndIdx + 10) % 12;
      const q4Due = (fyEndIdx + 1) % 12;
      const qDay = String(rule.deadlineDay || (codeUpper === '1601EQ' ? 30 : 25)).padStart(2, '0');

      if (mIdx === q1Due) {
        rawDueDate = `${year}-${mStr}-${qDay}`;
        rawPeriodLabel = `1Q FY-Ended ${fyMonthFullName}`;
      } else if (mIdx === q2Due) {
        rawDueDate = `${year}-${mStr}-${qDay}`;
        rawPeriodLabel = `2Q FY-Ended ${fyMonthFullName}`;
      } else if (mIdx === q3Due) {
        rawDueDate = `${year}-${mStr}-${qDay}`;
        rawPeriodLabel = `3Q FY-Ended ${fyMonthFullName}`;
      } else if (mIdx === q4Due) {
        rawDueDate = `${year}-${mStr}-${qDay}`;
        rawPeriodLabel = `4Q FY-Ended ${fyMonthFullName}`;
      } else {
        isNotRequired = true;
      }
    }
  }

  // Standard Calendar Calculation if not already set by Fiscal Year
  if (!rawDueDate && !isNotRequired) {
    if (rule.frequency === 'Monthly') {
      rawDueDate = `${year}-${mStr}-${dayPad}`;
      rawPeriodLabel = mIdx === 0 
        ? `Dec-${String(year - 1).slice(-2)}` 
        : `${MONTHS_LIST[mIdx - 1]}-${String(year).slice(-2)}`;
    } else if (rule.frequency === 'Quarterly') {
      if (['Jan', 'Apr', 'Jul', 'Oct'].includes(month) && ['1601EQ', '2550Q', '2551Q'].includes(codeUpper)) {
        const d = String(rule.deadlineDay || (codeUpper === '1601EQ' ? 30 : 25)).padStart(2, '0');
        rawDueDate = `${year}-${mStr}-${d}`;
        rawPeriodLabel = month === 'Jan' ? `4Q - ${year - 1}` : month === 'Apr' ? `1Q - ${year}` : month === 'Jul' ? `2Q - ${year}` : `3Q - ${year}`;
      } else if (month === 'May' && codeUpper === '1702Q') {
        rawDueDate = `${year}-05-${String(rule.deadlineDay || 29).padStart(2, '0')}`;
        rawPeriodLabel = `1Q - ${year}`;
      } else if (month === 'May' && codeUpper === '1701Q') {
        rawDueDate = `${year}-05-${String(rule.deadlineDay || 15).padStart(2, '0')}`;
        rawPeriodLabel = `1Q - ${year}`;
      } else if (month === 'Aug' && (codeUpper === '1701Q' || codeUpper === '1702Q')) {
        const d = String(rule.deadlineDay || (codeUpper === '1702Q' ? 29 : 15)).padStart(2, '0');
        rawDueDate = `${year}-08-${d}`;
        rawPeriodLabel = `2Q - ${year}`;
      } else if (month === 'Nov' && (codeUpper === '1701Q' || codeUpper === '1702Q')) {
        const d = String(rule.deadlineDay || (codeUpper === '1702Q' ? 29 : 15)).padStart(2, '0');
        rawDueDate = `${year}-11-${d}`;
        rawPeriodLabel = `3Q - ${year}`;
      } else {
        // Check monthly schedule
        if (rule.monthlySchedule2026 && rule.monthlySchedule2026.length > 0) {
          const match = rule.monthlySchedule2026.find(s => s.month === month);
          if (match && match.dueDate && match.dueDate !== 'N/A' && match.dueDate !== 'NONE') {
            rawDueDate = `${year}-${mStr}-${dayPad}`;
            rawPeriodLabel = match.periodLabel || `${month}-${String(year).slice(-2)}`;
          } else {
            isNotRequired = true;
          }
        } else {
          isNotRequired = true;
        }
      }
    } else if (rule.frequency === 'Annually') {
      if (month === 'Apr') {
        rawDueDate = `${year}-04-${String(rule.deadlineDay || 15).padStart(2, '0')}`;
        rawPeriodLabel = `TY - ${year - 1}`;
      } else {
        isNotRequired = true;
      }
    } else if (rule.frequency === 'Custom') {
      const applicableM = rule.applicableMonths && rule.applicableMonths.length > 0
        ? rule.applicableMonths
        : ['Jan', 'Feb', 'Jun', 'Jul'];
      
      if (applicableM.some(am => am.toLowerCase() === month.toLowerCase())) {
        rawDueDate = `${year}-${mStr}-${dayPad}`;
        rawPeriodLabel = mIdx === 0 ? `Dec-${String(year - 1).slice(-2)}` : `${MONTHS_LIST[mIdx - 1]}-${String(year).slice(-2)}`;
      } else {
        isNotRequired = true;
      }
    }
  }

  if (isNotRequired || !rawDueDate) {
    return {
      id: `${client.id}_${rule.code}_${year}_${month}`,
      clientId: client.id,
      clientName: client.companyName,
      tinNumber: client.tinNumber,
      rdoNumber: client.rdoNumber,
      registrationMethod: client.registrationMethod || 'Manual',
      entityType: client.entityType,
      formCode: rule.code,
      formName: rule.name,
      category: rule.category,
      frequency: rule.frequency,
      taxablePeriod: 'Not Required',
      periodMonth: month,
      periodYear: year,
      defaultDeadline: 'N/A',
      adjustedDeadline: 'N/A',
      finalDeadline: 'N/A',
      deadlineSource: 'Not Due for This Period',
      holidayAdjustment: false,
      weekendAdjustment: false,
      wasShifted: false,
      isNotRequired: true
    };
  }

  const defaultDeadline = rawDueDate;

  // 3. Client-Specific / RDO / Form Extension & Override Processing ⭐
  // Priority: Client-Specific > RDO-Specific > Form-Specific / RMC > All Clients
  const allExtensions: DeadlineExtensionRule[] = masterChoices?.deadlineExtensions || DEFAULT_DEADLINE_EXTENSIONS;
  const activeExtensions = allExtensions.filter(e => {
    const isAct = e.status === 'Active' || e.status === 'ACTIVE';
    if (!isAct) return false;

    // Check Statutory Category / Type
    if (e.statutoryType) {
      if (e.statutoryType === 'BIR' && !isBir) return false;
      if (e.statutoryType === 'BENEFITS' && !isBenefits) return false;
    } else if (e.category && e.category !== 'All') {
      if (e.category === 'BIR' && !isBir) return false;
      if (e.category === 'Benefits' && !isBenefits) return false;
    }

    return true;
  });

  let appliedExtension: DeadlineExtensionRule | undefined;
  let deadlineSource = isEfps && (codeUpper === '0619E' || codeUpper === '1601C') 
    ? 'eFPS Staggered Filing Schedule' 
    : 'Standard Master Rule';

  const evalMonthNumStr = String(mIdx + 1).padStart(2, '0');
  const evalTargetMonthStr = `${year}-${evalMonthNumStr}`; // "2026-08"

  // Check Month match for extension
  const matchesMonth = (ext: DeadlineExtensionRule) => {
    if (ext.targetMonth) {
      return ext.targetMonth === evalTargetMonthStr;
    }
    const extYear = ext.applicableYear || 2026;
    if (extYear !== year) return false;
    if (!ext.applicableMonth || ext.applicableMonth === 'ALL' || ext.applicableMonth === 'All') return true;
    return ext.applicableMonth.toLowerCase().startsWith(month.toLowerCase().slice(0, 3));
  };

  // Check Form / Obligation match for extension
  const matchesForm = (ext: DeadlineExtensionRule) => {
    const extForms = ext.applicableFormCodes || ext.targetFormCodes || (ext.targetFormCode ? [ext.targetFormCode] : []);
    if (extForms.length === 0) return true;
    return extForms.some(f => {
      const fTrim = f.trim().toUpperCase();
      if (fTrim === 'ALL' || fTrim === 'ALL FORMS' || fTrim === 'ALL OBLIGATIONS') return true;
      if (fTrim === codeUpper) return true;
      if (cleanCode.toUpperCase() === fTrim) return true;
      if (cleanCode.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(cleanCode.toLowerCase())) return true;
      return false;
    });
  };

  // Check RDO match for extension
  const matchesRdo = (ext: DeadlineExtensionRule) => {
    const extRdos = ext.targetRdoCodes || ext.targetRdos || (ext.targetRdo ? [ext.targetRdo] : []);
    if (extRdos.length === 0) return true;
    const clientRdoNorm = (client.rdoNumber || '').trim().toUpperCase();
    return extRdos.some(r => r.trim().toUpperCase() === clientRdoNorm);
  };

  // Check Client match for extension
  const matchesClient = (ext: DeadlineExtensionRule) => {
    if (ext.targetClientId && ext.targetClientId !== client.id) return false;
    if (ext.targetClientIds && ext.targetClientIds.length > 0 && !ext.targetClientIds.includes(client.id)) return false;
    return true;
  };

  // Priority 1: Client Specific
  const clientExt = activeExtensions.find(e => 
    (e.scope === 'Client' || !!e.targetClientId || (e.targetClientIds && e.targetClientIds.length > 0)) && 
    matchesClient(e) && 
    matchesForm(e) && 
    matchesMonth(e)
  );

  // Priority 2: RDO Specific (Supports Multi-RDO)
  const rdoExt = activeExtensions.find(e => 
    (e.scope === 'RDO' || (e.targetRdoCodes && e.targetRdoCodes.length > 0) || !!e.targetRdo) && 
    matchesRdo(e) && 
    matchesForm(e) && 
    matchesMonth(e)
  );

  // Priority 3: Form Specific / RMC
  const formExt = activeExtensions.find(e => 
    (e.scope === 'Form' || (e.applicableFormCodes && e.applicableFormCodes.length > 0)) && 
    matchesForm(e) && 
    matchesMonth(e)
  );

  // Priority 4: All Clients
  const allClientsExt = activeExtensions.find(e => 
    (e.scope === 'All Clients' || (!e.scope && (!e.targetRdoCodes || e.targetRdoCodes.length === 0) && !e.targetRdo && !e.targetClientId)) && 
    matchesForm(e) && 
    matchesMonth(e)
  );

  appliedExtension = clientExt || rdoExt || formExt || allClientsExt;

  let overrideDeadline: string | undefined;
  if (appliedExtension) {
    overrideDeadline = appliedExtension.extendedDeadlineDate || appliedExtension.extendedDueDate;
    if (appliedExtension.scope === 'Client' || appliedExtension.targetClientId) {
      deadlineSource = `Client Extension: ${appliedExtension.title}`;
    } else if (appliedExtension.targetRdoCodes && appliedExtension.targetRdoCodes.length > 0) {
      deadlineSource = `RDO ${client.rdoNumber} Extension (${appliedExtension.title})`;
    } else if (appliedExtension.scope === 'RDO' || appliedExtension.targetRdo) {
      deadlineSource = `RDO ${client.rdoNumber} Extension (${appliedExtension.title})`;
    } else {
      deadlineSource = `RMC Extension: ${appliedExtension.title}`;
    }
  }

  // 4. Weekend & Holiday Adjustment Processing ⭐
  const dateToAdjust = overrideDeadline || defaultDeadline;
  const holidaysList = masterChoices?.holidays || DEFAULT_HOLIDAYS;
  const weekendConfig = masterChoices?.weekendConfig || DEFAULT_WEEKEND_CONFIG;

  const adjResult = adjustDateForWeekendsAndHolidays(
    dateToAdjust, 
    holidaysList, 
    weekendConfig, 
    client.rdoNumber
  );

  // When explicit extension rule is set, the extension date is the authoritative override
  const adjustedDeadline = adjResult.adjustedDateStr;
  const finalDeadline = overrideDeadline ? overrideDeadline : adjustedDeadline;

  if (adjResult.wasShifted && !appliedExtension) {
    if (adjResult.holidayShift && adjResult.weekendShift) {
      deadlineSource = `Weekend & Holiday Adjusted (${adjResult.shiftReasons.join(', ')})`;
    } else if (adjResult.holidayShift) {
      deadlineSource = `Holiday Adjusted (${adjResult.shiftReasons.join(', ')})`;
    } else if (adjResult.weekendShift) {
      deadlineSource = `Weekend Adjusted (${adjResult.shiftReasons.join(', ')})`;
    }
  }

  return {
    id: `${client.id}_${rule.code}_${year}_${month}`,
    clientId: client.id,
    clientName: client.companyName,
    tinNumber: client.tinNumber,
    rdoNumber: client.rdoNumber,
    registrationMethod: client.registrationMethod || 'Manual',
    entityType: client.entityType,
    formCode: rule.code,
    formName: rule.name,
    category: rule.category,
    frequency: rule.frequency,
    taxablePeriod: rawPeriodLabel || `${month} ${year}`,
    periodMonth: month,
    periodYear: year,
    
    defaultDeadline,
    overrideDeadline,
    adjustedDeadline,
    finalDeadline,
    
    deadlineSource,
    appliedExtensionId: appliedExtension?.id,
    appliedExtensionTitle: appliedExtension?.title,
    appliedRuleId: rule.id,
    holidayAdjustment: adjResult.holidayShift,
    weekendAdjustment: adjResult.weekendShift,
    wasShifted: adjResult.wasShifted,
    shiftReason: adjResult.shiftReasons.join('; '),
    isNotRequired: false,
    
    assignedStaffId: client.assignedStaffId,
    assignedStaffName: client.assignedStaffName,
    isBranch: client.isBranch,
    branchCode: client.branchCode,
    parentClientName: client.parentClientName,
    baseTin: client.baseTin
  };
}

// ==========================================
// BULK CLIENT DEADLINES COMPILER FOR MONTH ⭐
// ==========================================
export interface BulkDeadlineFilterParams {
  clients: ClientProfile[];
  masterChoices: MasterChoices;
  month: string; // 'Jan', 'Feb', ...
  year: number; // 2026
  categoryFilter?: 'ALL' | 'BIR' | 'Benefits' | string;
  statusTab?: 'Active' | 'For Compliance' | 'All';
  filerTypeFilter?: 'ALL' | 'Manual' | 'eFPS';
  searchQuery?: string;
  assignedStaffName?: string;
}

export function calculateAllClientDeadlinesForMonth(params: BulkDeadlineFilterParams): CalculatedClientDeadline[] {
  const {
    clients,
    masterChoices,
    month,
    year,
    categoryFilter = 'ALL',
    statusTab = 'Active',
    filerTypeFilter = 'ALL',
    searchQuery = '',
    assignedStaffName = 'ALL_STAFF'
  } = params;

  // 1. Filter Clients based on tabs & search
  const filteredClients = clients.filter(c => {
    if (c.status === 'Archived') return false;

    if (statusTab === 'Active' && c.status !== 'Active') return false;
    if (statusTab === 'For Compliance' && c.status !== 'For Compliance' && c.status !== 'Compliance') return false;

    const regMethod = c.registrationMethod || 'Manual';
    if (filerTypeFilter === 'Manual' && regMethod !== 'Manual') return false;
    if (filerTypeFilter === 'eFPS' && regMethod !== 'eFPS') return false;

    if (assignedStaffName !== 'ALL_STAFF' && c.assignedStaffName !== assignedStaffName) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.companyName || '').toLowerCase().includes(q);
      const matchTin = (c.tinNumber || '').includes(q);
      const matchRdo = (c.rdoNumber || '').includes(q);
      const matchBir = (c.birTaxServices || []).some(s => s.toLowerCase().includes(q));
      const matchBen = (c.benefitsServices || []).some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchTin && !matchRdo && !matchBir && !matchBen) return false;
    }

    return true;
  });

  // 2. Combine Master BIR and Benefits rules
  const allRules: CustomDeadlineRule[] = [
    ...(masterChoices.birTaxOptions || []),
    ...(masterChoices.benefitsOptions || [])
  ];

  const results: CalculatedClientDeadline[] = [];

  filteredClients.forEach(client => {
    allRules.forEach(rule => {
      if (categoryFilter !== 'ALL' && rule.category !== categoryFilter) return;

      const calc = calculateClientDeadline({
        client,
        rule,
        month,
        year,
        masterChoices
      });

      if (calc && !calc.isNotRequired && calc.finalDeadline !== 'N/A') {
        results.push(calc);
      }
    });
  });

  return results;
}

// Format YYYY-MM-DD into "April 25, 2026"
export function formatDeadlinePretty(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'NONE') return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const mIdx = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const mName = MONTHS_LIST[mIdx] ? MONTH_FULL_NAMES[MONTHS_LIST[mIdx]] : `Month ${mIdx + 1}`;
  return `${mName} ${d}, ${y}`;
}

// ==========================================
// DYNAMIC CLIENT-BASED SELECTORS & EXTENSION REUSABLE HELPERS ⭐
// ==========================================

/**
 * Dynamically retrieves all unique, non-blank RDO codes currently assigned to clients.
 * Client Master Data is the single source of truth.
 */
export function getAvailableClientRDOs(clients: ClientProfile[] = []): string[] {
  const rdoSet = new Set<string>();
  clients.forEach(c => {
    if (c.status === 'Archived') return;
    const rdo = (c.rdoNumber || '').trim();
    if (rdo && rdo !== 'N/A' && rdo !== 'NONE') {
      rdoSet.add(rdo);
    }
  });

  return Array.from(rdoSet).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
}

/**
 * Dynamically retrieves applicable BIR forms or Benefit obligations assigned to clients.
 * No hardcoded forms - Client obligations are the source of truth.
 */
export function getAvailableClientForms(
  clients: ClientProfile[] = [],
  statuteType: 'BIR' | 'BENEFITS' | 'ALL' = 'ALL'
): string[] {
  const formSet = new Set<string>();

  clients.forEach(c => {
    if (c.status === 'Archived') return;

    if (statuteType === 'BIR' || statuteType === 'ALL') {
      (c.birTaxServices || []).forEach(f => {
        const trimmed = (f || '').trim();
        if (trimmed) formSet.add(trimmed);
      });
    }

    if (statuteType === 'BENEFITS' || statuteType === 'ALL') {
      (c.benefitsServices || []).forEach(b => {
        const trimmed = (b || '').trim();
        if (trimmed) formSet.add(trimmed);
      });
    }
  });

  return Array.from(formSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Retrieves statutory obligations assigned to a specific client.
 */
export function getClientStatutoryObligations(
  clientId: string,
  statuteType: 'BIR' | 'BENEFITS' | 'ALL' = 'ALL',
  clients: ClientProfile[] = []
): string[] {
  const client = clients.find(c => c.id === clientId);
  if (!client) return [];

  const list: string[] = [];
  if (statuteType === 'BIR' || statuteType === 'ALL') {
    list.push(...(client.birTaxServices || []));
  }
  if (statuteType === 'BENEFITS' || statuteType === 'ALL') {
    list.push(...(client.benefitsServices || []));
  }
  return list;
}

/**
 * Filters all clients that match a given deadline extension rule.
 */
export function getClientsMatchingDeadlineExtension(
  rule: DeadlineExtensionRule,
  clients: ClientProfile[] = []
): ClientProfile[] {
  if (!rule || rule.status === 'Cancelled' || rule.status === 'CANCELLED') return [];

  const targetRdos = rule.targetRdoCodes || rule.targetRdos || (rule.targetRdo ? [rule.targetRdo] : []);
  const targetForms = rule.applicableFormCodes || rule.targetFormCodes || (rule.targetFormCode ? [rule.targetFormCode] : []);
  const targetClientId = rule.targetClientId;
  const targetClientIds = rule.targetClientIds || [];

  return clients.filter(c => {
    if (c.status === 'Archived') return false;

    // 1. Client Match
    if (targetClientId && c.id !== targetClientId) return false;
    if (targetClientIds.length > 0 && !targetClientIds.includes(c.id)) return false;

    // 2. RDO Match
    if (targetRdos.length > 0) {
      const clientRdo = (c.rdoNumber || '').trim().toUpperCase();
      const hasRdo = targetRdos.some(r => r.trim().toUpperCase() === clientRdo);
      if (!hasRdo) return false;
    }

    // 3. Form / Benefit Match
    if (targetForms.length > 0 && !targetForms.some(f => f.toUpperCase() === 'ALL')) {
      const isBir = rule.statutoryType === 'BIR' || rule.category === 'BIR';
      const isBenefits = rule.statutoryType === 'BENEFITS' || rule.category === 'Benefits';

      let clientHasForm = false;

      if (isBir || (!isBir && !isBenefits)) {
        const clientBir = (c.birTaxServices || []).map(f => f.trim().toUpperCase());
        clientHasForm = targetForms.some(tf => {
          const tfUpper = tf.trim().toUpperCase();
          return clientBir.includes(tfUpper) || clientBir.some(cb => cb.includes(tfUpper) || tfUpper.includes(cb));
        });
      }

      if (!clientHasForm && (isBenefits || (!isBir && !isBenefits))) {
        const clientBen = (c.benefitsServices || []).map(b => b.trim().toLowerCase());
        clientHasForm = targetForms.some(tf => {
          const tfLower = tf.trim().toLowerCase();
          return clientBen.includes(tfLower) || clientBen.some(cb => cb.includes(tfLower) || tfLower.includes(cb));
        });
      }

      if (!clientHasForm) return false;
    }

    return true;
  });
}

/**
 * Applies an extension rule directly onto a calculated deadline entity.
 */
export function applyDeadlineExtension(
  rule: DeadlineExtensionRule,
  deadline: CalculatedClientDeadline
): CalculatedClientDeadline {
  const extendedDate = rule.extendedDeadlineDate || rule.extendedDueDate || deadline.finalDeadline;
  return {
    ...deadline,
    overrideDeadline: extendedDate,
    finalDeadline: extendedDate,
    appliedExtensionId: rule.id,
    appliedExtensionTitle: rule.title,
    deadlineSource: `Extension Override: ${rule.title}`,
    wasShifted: true
  };
}

/**
 * Authoritative selector to return effective final due date.
 */
export function calculateEffectiveDueDate(deadline: CalculatedClientDeadline): string {
  if (!deadline) return 'N/A';
  return deadline.finalDeadline || deadline.overrideDeadline || deadline.adjustedDeadline || deadline.defaultDeadline || 'N/A';
}

/**
 * Resolves the Payment Behavior for a given form code or master rule.
 * Returns 'NEVER_PAYABLE', 'CONDITIONAL_PAYABLE', or 'ALWAYS_PAYABLE'.
 */
export function getPaymentBehavior(
  formOrObligationCode: string,
  rule?: CustomDeadlineRule
): PaymentBehavior {
  if (rule?.paymentBehavior) return rule.paymentBehavior;

  const upper = (formOrObligationCode || '').toUpperCase().trim();

  // Submission/Filing-only forms that NEVER generate a payment obligation
  if (
    upper.includes('SAWT') ||
    upper.includes('QAP') ||
    upper.includes('AT RELIEF') ||
    upper.includes('VAT RELIEF') ||
    upper.includes('RELIEF') ||
    upper.includes('SLSP') ||
    upper.includes('ALPHALIST') ||
    upper.includes('1604C') ||
    upper.includes('1604E') ||
    upper.includes('1604F') ||
    upper.includes('INVENTORY LIST') ||
    upper.includes('BOOKS OF ACCOUNTS') ||
    upper.includes('AUDITED FINANCIAL') ||
    upper.includes('ATTACHMENT') ||
    upper.includes('SUBMISSION')
  ) {
    return 'NEVER_PAYABLE';
  }

  // Pure Payment forms (Loans, Payment form 0605)
  if (
    upper.includes('0605') ||
    upper.includes('LOAN') ||
    upper.includes('SALARY LOAN') ||
    upper.includes('CALAMITY LOAN') ||
    upper.includes('HOUSING LOAN')
  ) {
    return 'ALWAYS_PAYABLE';
  }

  // Standard tax returns & contributions that may have zero or positive payable
  return 'CONDITIONAL_PAYABLE';
}

/**
 * Resolves Filing Required status ('YES', 'NO', 'CONDITIONAL').
 */
export function getFilingRequired(
  formOrObligationCode: string,
  rule?: CustomDeadlineRule
): FilingRequired {
  if (rule?.filingRequired) return rule.filingRequired;
  return 'YES';
}

/**
 * Resolves Default Submission Method ('ONLINE', 'MANUAL', 'EAFS', 'OTHER').
 */
export function getSubmissionMethod(
  formOrObligationCode: string,
  rule?: CustomDeadlineRule
): SubmissionMethod {
  if (rule?.submissionMethod) return rule.submissionMethod;

  const upper = (formOrObligationCode || '').toUpperCase().trim();
  if (upper.includes('EAFS') || upper.includes('AUDITED FINANCIAL') || upper.includes('ATTACHMENT')) {
    return 'EAFS';
  }
  return 'ONLINE';
}

/**
 * Resolves Compliance Category ('TAX_RETURN', 'INFORMATIONAL', 'WITHHOLDING', 'VAT', 'BENEFITS', 'RELIEF_ATTACHMENT', 'OTHER').
 */
export function getComplianceCategory(
  formOrObligationCode: string,
  rule?: CustomDeadlineRule
): ComplianceCategory {
  if (rule?.complianceCategory) return rule.complianceCategory;

  const upper = (formOrObligationCode || '').toUpperCase().trim();

  if (
    upper.includes('SAWT') || 
    upper.includes('QAP') || 
    upper.includes('AT RELIEF') || 
    upper.includes('VAT RELIEF') || 
    upper.includes('RELIEF') || 
    upper.includes('SLSP')
  ) {
    return 'RELIEF_ATTACHMENT';
  }

  if (
    upper.includes('1604') || 
    upper.includes('ALPHALIST') || 
    upper.includes('INVENTORY LIST') || 
    upper.includes('BOOKS OF ACCOUNTS')
  ) {
    return 'INFORMATIONAL';
  }

  if (
    upper.includes('0619E') || 
    upper.includes('1601C') || 
    upper.includes('1601EQ') || 
    upper.includes('WITHHOLDING')
  ) {
    return 'WITHHOLDING';
  }

  if (
    upper.includes('2550') || 
    upper.includes('2551') || 
    upper.includes('VAT') || 
    upper.includes('PERCENTAGE')
  ) {
    return 'VAT';
  }

  if (
    upper.includes('SSS') || 
    upper.includes('HDMF') || 
    upper.includes('PAG-IBIG') || 
    upper.includes('PHILHEALTH') || 
    upper.includes('CONTRIB') || 
    upper.includes('LOAN') ||
    rule?.category === 'Benefits'
  ) {
    return 'BENEFITS';
  }

  if (
    upper.includes('1701') || 
    upper.includes('1702') || 
    upper.includes('ITR') || 
    upper.includes('INCOME TAX')
  ) {
    return 'TAX_RETURN';
  }

  return 'TAX_RETURN';
}

/**
 * Distinguishes whether a form / obligation is Payable vs Online Submission only.
 */
export type ObligationType = 'PAYMENT' | 'FILING' | 'ONLINE_SUBMISSION' | 'FILING_AND_PAYMENT';

export function getObligationType(
  formOrObligationCode: string,
  rule?: CustomDeadlineRule
): ObligationType {
  if (rule?.obligationType) return rule.obligationType;

  const pBehavior = getPaymentBehavior(formOrObligationCode, rule);
  if (pBehavior === 'NEVER_PAYABLE') {
    return 'ONLINE_SUBMISSION';
  }

  if (pBehavior === 'ALWAYS_PAYABLE') {
    const upper = (formOrObligationCode || '').toUpperCase().trim();
    if (upper.includes('LOAN')) return 'PAYMENT';
    return 'FILING_AND_PAYMENT';
  }

  return 'FILING_AND_PAYMENT';
}

/**
 * Returns true if this obligation can generate a payable record.
 * NEVER_PAYABLE forms (SAWT, QAP, AT RELIEF, SLSP, 1604 series) return false.
 */
export function isPayableObligation(
  formOrObligationCode: string,
  rule?: CustomDeadlineRule
): boolean {
  const pBehavior = getPaymentBehavior(formOrObligationCode, rule);
  return pBehavior !== 'NEVER_PAYABLE';
}

