/**
 * Philippine DOLE (Department of Labor and Employment) Payroll Calculation Utilities
 * & TRAIN Law Tax / Statutory Contribution Tables
 */

// SSS Contribution Table (2025/2026) - 14% total (4.5% Employee, 9.5% Employer + EC)
export function calculateSSSContribution(monthlyBasic: number): { ee: number; er: number } {
  if (monthlyBasic <= 4000) return { ee: 180, er: 380 };
  if (monthlyBasic >= 30000) return { ee: 1350, er: 2850 };
  
  // Salary credit bracket (steps of 500)
  const salaryCredit = Math.min(30000, Math.max(4000, Math.round(monthlyBasic / 500) * 500));
  const ee = Math.round(salaryCredit * 0.045);
  const er = Math.round(salaryCredit * 0.095);
  return { ee, er };
}

// PhilHealth Contribution (5% shared 50/50 between EE and ER, floor 10k, ceiling 100k)
export function calculatePhilHealthContribution(monthlyBasic: number): { ee: number; er: number } {
  const boundedSalary = Math.min(100000, Math.max(10000, monthlyBasic));
  const totalMonthlyPremium = boundedSalary * 0.05;
  const ee = Number((totalMonthlyPremium / 2).toFixed(2));
  const er = Number((totalMonthlyPremium / 2).toFixed(2));
  return { ee, er };
}

// Pag-IBIG (HDMF) Contribution (2% capped max 200 EE share, 200 ER share)
export function calculatePagIbigContribution(monthlyBasic: number): { ee: number; er: number } {
  if (monthlyBasic <= 1500) {
    return { ee: Math.min(100, monthlyBasic * 0.01), er: monthlyBasic * 0.02 };
  }
  const ee = Math.min(200, Math.round(monthlyBasic * 0.02));
  const er = Math.min(200, Math.round(monthlyBasic * 0.02));
  return { ee, er };
}

// BIR Withholding Tax (TRAIN Law Semi-Monthly Schedule)
export function calculateSemiMonthlyBIRTax(taxableSemiMonthlyIncome: number): number {
  const income = Math.max(0, taxableSemiMonthlyIncome);
  
  if (income <= 10417) {
    return 0;
  } else if (income <= 16666) {
    return (income - 10417) * 0.15;
  } else if (income <= 33332) {
    return 937.50 + ((income - 16666) * 0.20);
  } else if (income <= 83332) {
    return 4270.83 + ((income - 33333) * 0.25);
  } else if (income <= 333332) {
    return 16770.83 + ((income - 83333) * 0.30);
  } else {
    return 91770.83 + ((income - 333332) * 0.35);
  }
}

// DOLE Rates computation helpers
export interface PayrollComputationInput {
  monthlyBasic: number;
  dailyRateOverride?: number;
  hourlyRateOverride?: number;
  periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  
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
  const semiMonthlyBasic = isSemiMonthly ? input.monthlyBasic / 2 : input.monthlyBasic;
  
  // DOLE Standard Working Days per month = 21.75
  const dailyRate = input.dailyRateOverride || (input.monthlyBasic / 21.75);
  const hourlyRate = input.hourlyRateOverride || (dailyRate / 8);
  const minuteRate = hourlyRate / 60;
  
  // Deductions from Attendance
  const absencesDeduction = Number((input.daysAbsent * dailyRate).toFixed(2));
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
  
  // Statutory Contributions (Split semi-monthly)
  const fullSss = calculateSSSContribution(input.monthlyBasic);
  const fullPhic = calculatePhilHealthContribution(input.monthlyBasic);
  const fullHdmf = calculatePagIbigContribution(input.monthlyBasic);
  
  const sssEE = isSemiMonthly ? Number((fullSss.ee / 2).toFixed(2)) : fullSss.ee;
  const sssER = isSemiMonthly ? Number((fullSss.er / 2).toFixed(2)) : fullSss.er;
  
  const philHealthEE = isSemiMonthly ? Number((fullPhic.ee / 2).toFixed(2)) : fullPhic.ee;
  const philHealthER = isSemiMonthly ? Number((fullPhic.er / 2).toFixed(2)) : fullPhic.er;
  
  const pagIbigEE = isSemiMonthly ? Number((fullHdmf.ee / 2).toFixed(2)) : fullHdmf.ee;
  const pagIbigER = isSemiMonthly ? Number((fullHdmf.er / 2).toFixed(2)) : fullHdmf.er;
  
  // Taxable Income Calculation
  const taxableIncome = Math.max(0, grossPay - sssEE - philHealthEE - pagIbigEE);
  const birWithholdingTax = isSemiMonthly 
    ? Number(calculateSemiMonthlyBIRTax(taxableIncome).toFixed(2)) 
    : Number((calculateSemiMonthlyBIRTax(taxableIncome / 2) * 2).toFixed(2));
    
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
