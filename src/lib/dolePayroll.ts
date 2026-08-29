/**
 * Philippine DOLE (Department of Labor and Employment) Payroll Calculation Utilities
 * & TRAIN Law Tax / Statutory Contribution Tables (SSS, PhilHealth, Pag-IBIG HDMF)
 */

// SSS Contribution Table (2025/2026 Table)
// 14% total (4.5% Employee, 9.5% Employer) + EC (₱10/₱30) + WISP (for MSC > ₱20,000 up to ₱35,000)
export interface SSSBreakdown {
  msc: number; // Monthly Salary Credit
  regularEE: number;
  regularER: number;
  wispEE: number;
  wispER: number;
  ecER: number;
  totalEE: number;
  totalER: number;
  totalContribution: number;
}

export function calculateSSSContribution(monthlyBasic: number): { ee: number; er: number; breakdown?: SSSBreakdown } {
  if (monthlyBasic <= 4250) {
    const bd: SSSBreakdown = {
      msc: 4000,
      regularEE: 180,
      regularER: 380,
      wispEE: 0,
      wispER: 0,
      ecER: 10,
      totalEE: 180,
      totalER: 390,
      totalContribution: 570
    };
    return { ee: bd.totalEE, er: bd.totalER, breakdown: bd };
  }

  // Bracket MSC in increments of 500 up to 35,000
  const msc = Math.min(35000, Math.max(4000, Math.round(monthlyBasic / 500) * 500));
  
  // Regular SSS (up to 20,000 MSC)
  const regularMsc = Math.min(20000, msc);
  const regularEE = Math.round(regularMsc * 0.045);
  const regularER = Math.round(regularMsc * 0.095);

  // WISP (Mandatory Provident Fund for MSC exceeding 20,000 up to 35,000)
  const wispMsc = Math.max(0, msc - 20000);
  const wispEE = Math.round(wispMsc * 0.045);
  const wispER = Math.round(wispMsc * 0.095);

  // EC Contribution: ₱10 for MSC ≤ 14,500; ₱30 for MSC > 14,500
  const ecER = msc <= 14500 ? 10 : 30;

  const totalEE = regularEE + wispEE;
  const totalER = regularER + wispER + ecER;
  const totalContribution = totalEE + totalER;

  const bd: SSSBreakdown = {
    msc,
    regularEE,
    regularER,
    wispEE,
    wispER,
    ecER,
    totalEE,
    totalER,
    totalContribution
  };

  return { ee: totalEE, er: totalER, breakdown: bd };
}

// PhilHealth Contribution (5% shared 50/50 between EE (2.5%) and ER (2.5%), floor ₱10,000, ceiling ₱100,000)
export interface PhilHealthBreakdown {
  boundedSalary: number;
  premiumRate: number;
  totalMonthlyPremium: number;
  ee: number;
  er: number;
}

export function calculatePhilHealthContribution(monthlyBasic: number): { ee: number; er: number; breakdown?: PhilHealthBreakdown } {
  const boundedSalary = Math.min(100000, Math.max(10000, monthlyBasic));
  const totalMonthlyPremium = Number((boundedSalary * 0.05).toFixed(2));
  const ee = Number((totalMonthlyPremium / 2).toFixed(2));
  const er = Number((totalMonthlyPremium / 2).toFixed(2));

  return { 
    ee, 
    er, 
    breakdown: {
      boundedSalary,
      premiumRate: 0.05,
      totalMonthlyPremium,
      ee,
      er
    }
  };
}

// Pag-IBIG (HDMF) Contribution (2% capped max ₱200 EE share, ₱200 ER share for standard mandatory)
export interface PagIbigBreakdown {
  monthlyBasic: number;
  eeRate: number;
  erRate: number;
  ee: number;
  er: number;
  total: number;
}

export function calculatePagIbigContribution(monthlyBasic: number): { ee: number; er: number; breakdown?: PagIbigBreakdown } {
  if (monthlyBasic <= 1500) {
    const ee = Math.min(100, Number((monthlyBasic * 0.01).toFixed(2)));
    const er = Math.min(200, Number((monthlyBasic * 0.02).toFixed(2)));
    return { ee, er, breakdown: { monthlyBasic, eeRate: 0.01, erRate: 0.02, ee, er, total: ee + er } };
  }
  
  // Standard 2% with max cap ₱200 EE & ₱200 ER
  const ee = Math.min(200, Math.round(monthlyBasic * 0.02));
  const er = Math.min(200, Math.round(monthlyBasic * 0.02));
  return { ee, er, breakdown: { monthlyBasic, eeRate: 0.02, erRate: 0.02, ee, er, total: ee + er } };
}

// BIR Withholding Tax (TRAIN Law Semi-Monthly Schedule)
export interface BIRTaxBracket {
  level: number;
  minIncome: number;
  maxIncome: number;
  baseTax: number;
  excessRate: number;
  formulaDescription: string;
}

export function calculateSemiMonthlyBIRTax(taxableSemiMonthlyIncome: number): { tax: number; bracket: BIRTaxBracket } {
  const income = Math.max(0, taxableSemiMonthlyIncome);
  
  if (income <= 10417) {
    return {
      tax: 0,
      bracket: {
        level: 1,
        minIncome: 0,
        maxIncome: 10417,
        baseTax: 0,
        excessRate: 0,
        formulaDescription: '0.00 (Tax Exempt)'
      }
    };
  } else if (income <= 16666) {
    const tax = (income - 10417) * 0.15;
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 2,
        minIncome: 10417,
        maxIncome: 16666,
        baseTax: 0,
        excessRate: 0.15,
        formulaDescription: '15% of excess over ₱10,417'
      }
    };
  } else if (income <= 33332) {
    const tax = 937.50 + ((income - 16666) * 0.20);
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 3,
        minIncome: 16667,
        maxIncome: 33332,
        baseTax: 937.50,
        excessRate: 0.20,
        formulaDescription: '₱937.50 + 20% of excess over ₱16,666'
      }
    };
  } else if (income <= 83332) {
    const tax = 4270.83 + ((income - 33333) * 0.25);
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 4,
        minIncome: 33333,
        maxIncome: 83332,
        baseTax: 4270.83,
        excessRate: 0.25,
        formulaDescription: '₱4,270.83 + 25% of excess over ₱33,333'
      }
    };
  } else if (income <= 333332) {
    const tax = 16770.83 + ((income - 83333) * 0.30);
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 5,
        minIncome: 83333,
        maxIncome: 333332,
        baseTax: 16770.83,
        excessRate: 0.30,
        formulaDescription: '₱16,770.83 + 30% of excess over ₱83,333'
      }
    };
  } else {
    const tax = 91770.83 + ((income - 333332) * 0.35);
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 6,
        minIncome: 333333,
        maxIncome: Infinity,
        baseTax: 91770.83,
        excessRate: 0.35,
        formulaDescription: '₱91,770.83 + 35% of excess over ₱333,332'
      }
    };
  }
}

// BIR Withholding Tax (TRAIN Law Monthly Schedule)
export function calculateMonthlyBIRTax(taxableMonthlyIncome: number): { tax: number; bracket: BIRTaxBracket } {
  const income = Math.max(0, taxableMonthlyIncome);

  if (income <= 20833) {
    return {
      tax: 0,
      bracket: {
        level: 1,
        minIncome: 0,
        maxIncome: 20833,
        baseTax: 0,
        excessRate: 0,
        formulaDescription: '0.00 (Tax Exempt below ₱250,000/yr)'
      }
    };
  } else if (income <= 33333) {
    const tax = (income - 20833) * 0.15;
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 2,
        minIncome: 20833,
        maxIncome: 33333,
        baseTax: 0,
        excessRate: 0.15,
        formulaDescription: '15% of excess over ₱20,833'
      }
    };
  } else if (income <= 66667) {
    const tax = 1875.00 + ((income - 33333) * 0.20);
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 3,
        minIncome: 33333,
        maxIncome: 66667,
        baseTax: 1875.00,
        excessRate: 0.20,
        formulaDescription: '₱1,875.00 + 20% of excess over ₱33,333'
      }
    };
  } else if (income <= 166667) {
    const tax = 8541.67 + ((income - 66667) * 0.25);
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 4,
        minIncome: 66667,
        maxIncome: 166667,
        baseTax: 8541.67,
        excessRate: 0.25,
        formulaDescription: '₱8,541.67 + 25% of excess over ₱66,667'
      }
    };
  } else if (income <= 666667) {
    const tax = 33541.67 + ((income - 166667) * 0.30);
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 5,
        minIncome: 166667,
        maxIncome: 666667,
        baseTax: 33541.67,
        excessRate: 0.30,
        formulaDescription: '₱33,541.67 + 30% of excess over ₱166,667'
      }
    };
  } else {
    const tax = 183541.67 + ((income - 666667) * 0.35);
    return {
      tax: Number(tax.toFixed(2)),
      bracket: {
        level: 6,
        minIncome: 666667,
        maxIncome: Infinity,
        baseTax: 183541.67,
        excessRate: 0.35,
        formulaDescription: '₱183,541.67 + 35% of excess over ₱666,667'
      }
    };
  }
}

// DOLE Day Classifications
export type DoleDayType = 
  | 'ORDINARY_DAY'
  | 'REST_DAY'
  | 'SPECIAL_HOLIDAY'
  | 'SPECIAL_HOLIDAY_REST_DAY'
  | 'REGULAR_HOLIDAY'
  | 'REGULAR_HOLIDAY_REST_DAY'
  | 'DOUBLE_HOLIDAY';

export interface DoleDayRateRule {
  type: DoleDayType;
  label: string;
  shortLabel: string;
  regularMultiplier: number; // For first 8 hrs
  otMultiplier: number;      // For hours exceeding 8
  nsdMultiplier: number;     // Night shift (10pm - 6am) base
  description: string;
}

export const DOLE_DAY_RATE_RULES: Record<DoleDayType, DoleDayRateRule> = {
  ORDINARY_DAY: {
    type: 'ORDINARY_DAY',
    label: 'Ordinary Working Day',
    shortLabel: 'Regular Workday',
    regularMultiplier: 1.00,
    otMultiplier: 1.25,       // +25%
    nsdMultiplier: 0.10,      // +10%
    description: '100% basic rate for first 8 hrs, 125% of hourly rate for OT hours, +10% NSD'
  },
  REST_DAY: {
    type: 'REST_DAY',
    label: 'Scheduled Rest Day',
    shortLabel: 'Rest Day (130%)',
    regularMultiplier: 1.30,  // +30%
    otMultiplier: 1.69,       // 130% * 130% = 169%
    nsdMultiplier: 0.10,
    description: '130% for first 8 hrs, 169% (130% x 130%) for OT hours, +10% NSD'
  },
  SPECIAL_HOLIDAY: {
    type: 'SPECIAL_HOLIDAY',
    label: 'Special Non-Working Holiday',
    shortLabel: 'Special Holiday (130%)',
    regularMultiplier: 1.30,
    otMultiplier: 1.69,       // 130% * 130% = 169%
    nsdMultiplier: 0.10,
    description: '130% for first 8 hrs, 169% for OT hours, +10% NSD (No work, no pay applies unless covered)'
  },
  SPECIAL_HOLIDAY_REST_DAY: {
    type: 'SPECIAL_HOLIDAY_REST_DAY',
    label: 'Special Holiday falling on Rest Day',
    shortLabel: 'Special Hol + Rest (150%)',
    regularMultiplier: 1.50,  // +50%
    otMultiplier: 1.95,       // 150% * 130% = 195%
    nsdMultiplier: 0.10,
    description: '150% for first 8 hrs, 195% (150% x 130%) for OT hours, +10% NSD'
  },
  REGULAR_HOLIDAY: {
    type: 'REGULAR_HOLIDAY',
    label: 'Regular Holiday (Double Pay)',
    shortLabel: 'Regular Holiday (200%)',
    regularMultiplier: 2.00,  // 200%
    otMultiplier: 2.60,       // 200% * 130% = 260%
    nsdMultiplier: 0.10,
    description: '200% (Double Pay) for first 8 hrs, 260% (200% x 130%) for OT hours, +10% NSD'
  },
  REGULAR_HOLIDAY_REST_DAY: {
    type: 'REGULAR_HOLIDAY_REST_DAY',
    label: 'Regular Holiday falling on Rest Day',
    shortLabel: 'Reg Hol + Rest (260%)',
    regularMultiplier: 2.60,  // 260%
    otMultiplier: 3.38,       // 260% * 130% = 338%
    nsdMultiplier: 0.10,
    description: '260% for first 8 hrs, 338% (260% x 130%) for OT hours, +10% NSD'
  },
  DOUBLE_HOLIDAY: {
    type: 'DOUBLE_HOLIDAY',
    label: 'Double Regular Holiday (e.g. Maundy Thursday & Araw ng Kagitingan)',
    shortLabel: 'Double Holiday (300%)',
    regularMultiplier: 3.00,  // 300%
    otMultiplier: 3.90,       // 300% * 130% = 390%
    nsdMultiplier: 0.10,
    description: '300% for first 8 hrs, 390% (300% x 130%) for OT hours, +10% NSD'
  }
};

// DOLE Working Days Annual Factors & Company 22-Day Factor ⭐
export type DoleWorkingFactor = '264' | '261' | '313' | '365' | '393.8';

export const DOLE_WORKING_FACTORS: Record<DoleWorkingFactor, { days: number; description: string; daysPerMonth: number }> = {
  '264': { days: 264, description: 'Company Standard (22 Working Days/month: Gross Monthly / 22)', daysPerMonth: 22.0 }, // 22 days/mo ⭐
  '261': { days: 261, description: '5 days/week (Mon-Fri, Saturday & Sunday rest days unworked)', daysPerMonth: 261 / 12 }, // 21.75
  '313': { days: 313, description: '6 days/week (Ordinary working days, 52 rest days unworked)', daysPerMonth: 313 / 12 }, // 26.083
  '365': { days: 365, description: 'Everyday working (Rest days considered paid)', daysPerMonth: 365 / 12 }, // 30.417
  '393.8': { days: 393.8, description: 'Everyday + Paid 52 Rest Days at 130% + 12 Regular Holidays at 200%', daysPerMonth: 393.8 / 12 }
};

export interface ShiftOvertimeResult {
  timeInStr: string;
  timeOutStr: string;
  totalElapsedHours: number;
  unpaidBreakHours: number;
  actualRenderedHours: number;
  regularHours: number;
  regularOtHours: number;
  nightDiffRegularHours: number;
  nightDiffOtHours: number;
  totalNightDiffHours: number;
  tardinessMinutes: number;
  undertimeMinutes: number;
  
  // Pay calculations
  dailyRate: number;
  hourlyRate: number;
  minuteRate: number;
  
  regularPay: number;
  overtimePay: number;
  nightDiffPay: number;
  tardinessDeduction: number;
  undertimeDeduction: number;
  
  grossDailyPay: number;
  dayRule: DoleDayRateRule;
  calculationSteps: string[];
}

/**
 * Converts a flexible time string (e.g. "8:30 AM", "08:30", "22:00", "10:00 PM", "5:30", "1730")
 * into minutes from midnight (0 to 1440).
 */
export function parseTimeToMinutes(timeStr: string, isPmColumnHint: boolean = false): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  if (!clean || clean === '-' || clean === 'NULL' || clean === 'UNDEFINED' || clean === 'NONE') return null;

  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const timeOnly = clean.replace(/AM|PM/g, '').trim();

  let hours = 0;
  let mins = 0;

  if (timeOnly.includes(':')) {
    const parts = timeOnly.split(':');
    hours = parseInt(parts[0], 10);
    mins = parseInt(parts[1], 10);
  } else if (/^\d{3,4}$/.test(timeOnly)) {
    if (timeOnly.length === 3) {
      hours = parseInt(timeOnly.substring(0, 1), 10);
      mins = parseInt(timeOnly.substring(1), 10);
    } else {
      hours = parseInt(timeOnly.substring(0, 2), 10);
      mins = parseInt(timeOnly.substring(2), 10);
    }
  } else {
    const parsedNum = parseInt(timeOnly, 10);
    if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 24) {
      hours = parsedNum;
      mins = 0;
    } else {
      return null;
    }
  }

  if (isNaN(hours) || isNaN(mins)) return null;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (!isAM && !isPM && isPmColumnHint && hours >= 1 && hours <= 11) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + mins;
}

/**
 * Computes DOLE shift hours, tardiness with 8:45 AM allowance, and overtime breakdown
 * Company Standard: Shift 8:30 AM - 5:30 PM, 1 hr break 12:00 PM - 1:00 PM
 * Grace period: Up to 8:45 AM is 0 late; beyond 8:45 AM computed per minute from 8:30 AM.
 * Daily Salary = Gross Monthly Income / 22
 */
export function computeDoleShiftOvertime(
  timeInStr: string,
  timeOutStr: string,
  monthlySalary: number,
  factor: DoleWorkingFactor = '264',
  dayType: DoleDayType = 'ORDINARY_DAY',
  unpaidBreakMinutes: number = 60,
  scheduledShiftStartStr: string = '08:30 AM',
  scheduledShiftEndStr: string = '05:30 PM',
  gracePeriodStartStr: string = '08:45 AM'
): ShiftOvertimeResult {
  const dayRule = DOLE_DAY_RATE_RULES[dayType] || DOLE_DAY_RATE_RULES.ORDINARY_DAY;
  
  // Daily Salary = Gross Monthly Income / 22 (or factor days/month)
  const dailyRate = factor === '264'
    ? Number((monthlySalary / 22).toFixed(2))
    : Number(((monthlySalary * 12) / (DOLE_WORKING_FACTORS[factor]?.days || 264)).toFixed(2));
  
  const hourlyRate = Number((dailyRate / 8).toFixed(2));
  const minuteRate = Number((hourlyRate / 60).toFixed(4));

  const inMins = parseTimeToMinutes(timeInStr) ?? (8 * 60 + 30);
  let outMins = parseTimeToMinutes(timeOutStr) ?? (17 * 60 + 30);

  // If time out is earlier than time in, assume it crosses midnight
  if (outMins < inMins) {
    outMins += 24 * 60;
  }

  const scheduledStartMins = parseTimeToMinutes(scheduledShiftStartStr) ?? (8 * 60 + 30); // 510
  const scheduledEndMins = parseTimeToMinutes(scheduledShiftEndStr) ?? (17 * 60 + 30); // 1050
  const gracePeriodMins = parseTimeToMinutes(gracePeriodStartStr) ?? (8 * 60 + 45); // 525

  // Tardiness: Allowance up to 8:45 AM (525 min) -> 0 late. Beyond 8:45 AM -> computed every minute from 8:30 AM (510 min)
  let tardinessMinutes = 0;
  if (inMins > gracePeriodMins) {
    tardinessMinutes = Math.max(0, inMins - scheduledStartMins);
  }

  // Early Out / Undertime: Left before 5:30 PM (1050 min)
  const undertimeMinutes = outMins < scheduledEndMins ? Math.max(0, scheduledEndMins - outMins) : 0;

  const totalElapsedMinutes = outMins - inMins;
  const totalElapsedHours = Number((totalElapsedMinutes / 60).toFixed(2));
  const unpaidBreakHours = Number((unpaidBreakMinutes / 60).toFixed(2));
  
  const actualRenderedMinutes = Math.max(0, totalElapsedMinutes - unpaidBreakMinutes);
  const actualRenderedHours = Number((actualRenderedMinutes / 60).toFixed(2));

  // Regular hours capped at 8 hours
  const regularHours = Math.min(8.0, actualRenderedHours);
  // Overtime hours exceeding 8 hours (or past 5:30 PM)
  const regularOtHours = Math.max(0, Number((actualRenderedHours - 8.0).toFixed(2)));

  // Calculate Night Shift Differential (10:00 PM (22:00 / 1320 mins) to 6:00 AM (06:00 / 360 mins or 1800 mins if next day))
  let nsdMins = 0;
  const effectiveStart = inMins;
  const effectiveEnd = outMins;
  
  for (let m = effectiveStart; m < effectiveEnd; m += 15) {
    const normalizedMinute = m % (24 * 60);
    if (normalizedMinute >= 1320 || normalizedMinute < 360) {
      nsdMins += 15;
    }
  }

  const totalNightDiffHours = Number((Math.min(actualRenderedHours, nsdMins / 60)).toFixed(2));
  const nightDiffOtHours = Math.min(regularOtHours, totalNightDiffHours);
  const nightDiffRegularHours = Math.max(0, Number((totalNightDiffHours - nightDiffOtHours).toFixed(2)));

  // Pay Components
  const regularPay = Number((regularHours * hourlyRate * dayRule.regularMultiplier).toFixed(2));
  const overtimePay = Number((regularOtHours * hourlyRate * dayRule.otMultiplier).toFixed(2));

  const nsdRegularPay = nightDiffRegularHours * hourlyRate * dayRule.regularMultiplier * 0.10;
  const nsdOtPay = nightDiffOtHours * hourlyRate * dayRule.otMultiplier * 0.10;
  const nightDiffPay = Number((nsdRegularPay + nsdOtPay).toFixed(2));

  // Deductions
  const tardinessDeduction = Number((tardinessMinutes * minuteRate).toFixed(2));
  const undertimeDeduction = Number((undertimeMinutes * minuteRate).toFixed(2));

  // Gross Pay for the Day
  const grossDailyPay = Number((regularPay + overtimePay + nightDiffPay - tardinessDeduction - undertimeDeduction).toFixed(2));

  // Generate Step-by-step Mathematical Audit Trail
  const calculationSteps: string[] = [
    `Daily Rate: ₱${monthlySalary.toLocaleString()} ÷ 22 days = ₱${dailyRate.toFixed(2)} / day (Company Standard)`,
    `Hourly Rate: ₱${dailyRate.toFixed(2)} ÷ 8 hrs = ₱${hourlyRate.toFixed(2)} / hour (₱${minuteRate.toFixed(2)} / min)`,
    `Working Hours: 8:30 AM - 5:30 PM (1h Break: 12:00 PM - 1:00 PM)`,
    `Total Shift Duration: ${timeInStr} to ${timeOutStr} = ${totalElapsedHours} hrs (${totalElapsedMinutes} mins)`,
    `Net Rendered Work Time: ${totalElapsedHours} hrs − ${unpaidBreakHours} hr meal break = ${actualRenderedHours} hrs`,
    `Regular Work Pay: ${regularHours} hrs × ₱${hourlyRate.toFixed(2)} × ${dayRule.regularMultiplier * 100}% (${dayRule.shortLabel}) = ₱${regularPay.toFixed(2)}`,
    regularOtHours > 0 
      ? `Overtime Pay: ${regularOtHours} hrs × ₱${hourlyRate.toFixed(2)} × ${(dayRule.otMultiplier * 100).toFixed(0)}% OT Multiplier = ₱${overtimePay.toFixed(2)}`
      : `Overtime Pay: 0.00 hrs (No hours beyond standard 5:30 PM / 8 hrs)`,
    totalNightDiffHours > 0
      ? `Night Shift Differential (10 PM - 6 AM): ${totalNightDiffHours} hrs with +10% DOLE Premium = ₱${nightDiffPay.toFixed(2)}`
      : `Night Shift Differential: 0.00 hrs (Shift within standard daytime window)`,
    inMins <= gracePeriodMins
      ? `Late Arrival: 0 mins (Within 8:45 AM grace allowance)`
      : `Late Arrival Deduction: ${tardinessMinutes} mins × ₱${minuteRate.toFixed(2)} = −₱${tardinessDeduction.toFixed(2)} (Past 8:45 AM allowance)`,
    undertimeMinutes > 0 ? `Early Out / Undertime Deduction: ${undertimeMinutes} mins × ₱${minuteRate.toFixed(2)} = −₱${undertimeDeduction.toFixed(2)}` : '',
    `Total Gross Daily Compensation: ₱${regularPay.toFixed(2)} (Regular) + ₱${overtimePay.toFixed(2)} (OT) + ₱${nightDiffPay.toFixed(2)} (NSD) = ₱${grossDailyPay.toFixed(2)}`
  ].filter(Boolean);

  return {
    timeInStr,
    timeOutStr,
    totalElapsedHours,
    unpaidBreakHours,
    actualRenderedHours,
    regularHours,
    regularOtHours,
    nightDiffRegularHours,
    nightDiffOtHours,
    totalNightDiffHours,
    tardinessMinutes,
    undertimeMinutes,
    dailyRate,
    hourlyRate,
    minuteRate,
    regularPay,
    overtimePay,
    nightDiffPay,
    tardinessDeduction,
    undertimeDeduction,
    grossDailyPay,
    dayRule,
    calculationSteps
  };
}

// Complete Full Payroll Input/Output interface
export interface PayrollComputationInput {
  monthlyBasic: number;
  dailyRateOverride?: number;
  hourlyRateOverride?: number;
  periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  
  // Pay Structure & OJT / Temp Setup ⭐
  employmentType?: string;
  salaryBasis?: string; // 'Monthly Fixed' | 'Daily (No Work, No Pay)' | 'OJT / Daily Allowance'
  isNoWorkNoPay?: boolean;
  exemptFromStatutory?: boolean;
  
  daysWorked: number;
  daysAbsent: number;
  tardinessMinutes: number;
  undertimeMinutes: number;
  
  otRegularHours: number;   // 125% rate
  otRestDayHours: number;   // 130% rate
  otHolidayHours: number;   // 200% rate
  nightDiffHours: number;   // +10% rate
  
  otherAllowances: number;
  valeDeduction: number;
  otherDeductions: number;
}

export function computeEmployeePayslip(input: PayrollComputationInput) {
  const isSemiMonthly = input.periodType !== 'Monthly';
  
  // Determine if employee is daily paid ("No Work, No Pay" / OJT Stipend)
  const isDailyPaid = Boolean(
    input.isNoWorkNoPay || 
    input.salaryBasis === 'Daily (No Work, No Pay)' || 
    input.salaryBasis === 'OJT / Daily Allowance' ||
    input.employmentType === 'OJT / Intern' || 
    input.employmentType === 'Temp / Daily Paid'
  );
  
  // Rate resolution
  const dailyRate = input.dailyRateOverride || Number((input.monthlyBasic / 22).toFixed(2));
  const hourlyRate = input.hourlyRateOverride || Number((dailyRate / 8).toFixed(2));
  const minuteRate = hourlyRate / 60;
  
  // Basic Pay Computation:
  // For Daily Paid / No Work No Pay: Basic = Days Worked * Daily Rate
  // For Monthly Fixed Paid: Semi-monthly basic = Monthly / 2, with absences deduction for missed days
  let semiMonthlyBasic: number;
  let absencesDeduction: number;
  
  if (isDailyPaid) {
    semiMonthlyBasic = Number((input.daysWorked * dailyRate).toFixed(2));
    absencesDeduction = 0; // Unworked days simply yield no daily pay (no double deduction)
  } else {
    semiMonthlyBasic = isSemiMonthly ? input.monthlyBasic / 2 : input.monthlyBasic;
    absencesDeduction = Number((input.daysAbsent * dailyRate).toFixed(2));
  }
  
  // Deductions from Attendance
  const tardinessDeduction = Number((input.tardinessMinutes * minuteRate).toFixed(2));
  const undertimeDeduction = Number((input.undertimeMinutes * minuteRate).toFixed(2));
  
  // Overtime Earnings
  const otRegularPay = Number((input.otRegularHours * hourlyRate * 1.25).toFixed(2));
  const otRestDayPay = Number((input.otRestDayHours * hourlyRate * 1.30).toFixed(2));
  const otHolidayPay = Number((input.otHolidayHours * hourlyRate * 2.00).toFixed(2));
  const nightDiffPay = Number((input.nightDiffHours * hourlyRate * 0.10).toFixed(2));
  
  const totalOtEarnings = otRegularPay + otRestDayPay + otHolidayPay + nightDiffPay;
  
  // Gross Pay
  const grossPay = Number((
    semiMonthlyBasic - absencesDeduction - tardinessDeduction - undertimeDeduction + totalOtEarnings + input.otherAllowances
  ).toFixed(2));
  
  // Statutory Contributions:
  // Check if exempt (e.g. OJT Trainee Stipend under DOLE/CHED non-employee rules)
  const isExempt = Boolean(input.exemptFromStatutory || input.employmentType === 'OJT / Intern');
  
  let sssEE = 0;
  let sssER = 0;
  let philHealthEE = 0;
  let philHealthER = 0;
  let pagIbigEE = 0;
  let pagIbigER = 0;
  let birWithholdingTax = 0;
  
  if (!isExempt) {
    const basisForContribution = isDailyPaid ? Math.max(input.monthlyBasic, grossPay * (isSemiMonthly ? 2 : 1)) : input.monthlyBasic;
    
    const fullSss = calculateSSSContribution(basisForContribution);
    const fullPhic = calculatePhilHealthContribution(basisForContribution);
    const fullHdmf = calculatePagIbigContribution(basisForContribution);
    
    sssEE = isSemiMonthly ? Number((fullSss.ee / 2).toFixed(2)) : fullSss.ee;
    sssER = isSemiMonthly ? Number((fullSss.er / 2).toFixed(2)) : fullSss.er;
    
    philHealthEE = isSemiMonthly ? Number((fullPhic.ee / 2).toFixed(2)) : fullPhic.ee;
    philHealthER = isSemiMonthly ? Number((fullPhic.er / 2).toFixed(2)) : fullPhic.er;
    
    pagIbigEE = isSemiMonthly ? Number((fullHdmf.ee / 2).toFixed(2)) : fullHdmf.ee;
    pagIbigER = isSemiMonthly ? Number((fullHdmf.er / 2).toFixed(2)) : fullHdmf.er;
    
    // Taxable Income Calculation
    const taxableIncome = Math.max(0, grossPay - sssEE - philHealthEE - pagIbigEE);
    const taxResult = isSemiMonthly 
      ? calculateSemiMonthlyBIRTax(taxableIncome)
      : calculateMonthlyBIRTax(taxableIncome);
    birWithholdingTax = taxResult.tax;
  }
    
  const totalStatutoryEE = sssEE + philHealthEE + pagIbigEE + birWithholdingTax;
  const totalDeductions = Number((totalStatutoryEE + input.valeDeduction + input.otherDeductions).toFixed(2));
  
  const netPay = Number((grossPay - totalDeductions).toFixed(2));
  
  return {
    semiMonthlyBasic: Number(semiMonthlyBasic.toFixed(2)),
    dailyRate: Number(dailyRate.toFixed(2)),
    hourlyRate: Number(hourlyRate.toFixed(2)),
    absencesDeduction,
    tardinessDeduction,
    undertimeDeduction,
    otRegularPay,
    otRestDayPay,
    otHolidayPay,
    nightDiffPay,
    grossPay,
    sssEE,
    sssER,
    philHealthEE,
    philHealthER,
    pagIbigEE,
    pagIbigER,
    birWithholdingTax,
    totalDeductions,
    netPay
  };
}
