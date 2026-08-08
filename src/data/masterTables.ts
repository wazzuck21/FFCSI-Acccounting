import { CustomDeadlineRule, ClientProfile } from '../types';

export const DEFAULT_BANKS = [
  'BDO Unibank',
  'Bank of the Philippine Islands (BPI)',
  'Metropolitan Bank & Trust Co. (Metrobank)',
  'Land Bank of the Philippines',
  'Union Bank of the Philippines',
  'Security Bank Corporation',
  'China Banking Corporation',
  'Philippine National Bank (PNB)',
  'Rizal Commercial Banking Corp (RCBC)',
  'EastWest Banking Corporation',
  'GCash / E-Wallet',
  'Maya / E-Wallet'
];

export const DEFAULT_BUSINESS_NATURES = [
  'Retail & Wholesale Trading',
  'Restaurant & Food Services',
  'Information Technology & Software',
  'Real Estate & Property Development',
  'Construction & Contracting',
  'Professional Consulting Services',
  'Medical & Healthcare Services',
  'Manufacturing & Industrial',
  'Logistics & Freight Services',
  'Hospitality & Tourism',
  'Import & Export Trading',
  'Education & Training Services'
];

export const DEFAULT_BIR_TAX_OPTIONS: CustomDeadlineRule[] = [
  {
    id: 'bir_0619e',
    code: '0619E',
    name: 'Monthly Remittance Return of Creditable Income Taxes Withheld (Expanded)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Monthly',
    deadlineDay: 10,
    customDescription: 'Every 10th day of the following month (eFPS: 11th - 15th)',
    monthlySchedule2026: [
      { month: 'Feb', dueDate: '2026-02-10', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-10', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-10', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-10', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-10', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-10', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-10', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-10', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-10', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-10', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-10', periodLabel: 'Nov-26' }
    ]
  },
  {
    id: 'bir_1601c',
    code: '1601C',
    name: 'Monthly Remittance Return of Income Taxes Withheld on Compensation',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Monthly',
    deadlineDay: 10,
    customDescription: 'Every 10th day of the following month (eFPS: 11th - 15th)',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-10', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-10', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-10', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-10', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-10', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-10', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-10', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-10', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-10', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-10', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-10', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-10', periodLabel: 'Nov-26' }
    ]
  },
  {
    id: 'bir_1601eq',
    code: '1601EQ',
    name: 'Quarterly Remittance Return of Creditable Income Taxes Withheld (Expanded)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 30,
    customDescription: 'Every last day of the month following the close of the quarter',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-30', periodLabel: '4Q - 2025' },
      { month: 'Apr', dueDate: '2026-04-30', periodLabel: '1Q - 2026' },
      { month: 'Jul', dueDate: '2026-07-31', periodLabel: '2Q - 2026' },
      { month: 'Oct', dueDate: '2026-10-30', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_2550q',
    code: '2550Q',
    name: 'Quarterly Value-Added Tax Return',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 25,
    customDescription: 'Every 25th day of the month following the close of the taxable quarter',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-25', periodLabel: '4Q - 2025' },
      { month: 'Apr', dueDate: '2026-04-25', periodLabel: '1Q - 2026' },
      { month: 'Jul', dueDate: '2026-07-25', periodLabel: '2Q - 2026' },
      { month: 'Oct', dueDate: '2026-10-25', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_2551q',
    code: '2551Q',
    name: 'Quarterly Percentage Tax Return',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 25,
    customDescription: 'Every 25th day of the month following the close of the taxable quarter',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-25', periodLabel: '4Q - 2025' },
      { month: 'Apr', dueDate: '2026-04-25', periodLabel: '1Q - 2026' },
      { month: 'Jul', dueDate: '2026-07-25', periodLabel: '2Q - 2026' },
      { month: 'Oct', dueDate: '2026-10-25', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_1702q',
    code: '1702Q',
    name: 'Quarterly Income Tax Return for Corporations and Partnerships',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 15,
    customDescription: 'Every 60 days following the close of each of the first 3 quarters (May 15 1Q-2026)',
    monthlySchedule2026: [
      { month: 'May', dueDate: '2026-05-15', periodLabel: '1Q - 2026' },
      { month: 'Aug', dueDate: '2026-08-15', periodLabel: '2Q - 2026' },
      { month: 'Nov', dueDate: '2026-11-15', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_1701q',
    code: '1701Q',
    name: 'Quarterly Income Tax Return for Individuals / Sole Proprietors',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 30,
    customDescription: 'May 30 (1Q-2026), Aug 15 (2Q-2026), Nov 15 (3Q-2026)',
    monthlySchedule2026: [
      { month: 'May', dueDate: '2026-05-30', periodLabel: '1Q - 2026' },
      { month: 'Aug', dueDate: '2026-08-15', periodLabel: '2Q - 2026' },
      { month: 'Nov', dueDate: '2026-11-15', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_itr',
    code: 'ITR',
    name: 'Annual Income Tax Return (1701 / 1702)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Annually',
    deadlineDay: 15,
    customDescription: 'Every 15th day of the 4th month following the close of the taxable year (April 15)',
    monthlySchedule2026: [
      { month: 'Apr', dueDate: '2026-04-15', periodLabel: 'TY - 2025' }
    ]
  }
];

export const DEFAULT_BENEFITS_OPTIONS: CustomDeadlineRule[] = [
  // --- HDMF (Pag-IBIG Fund) PARENT GROUP ---
  {
    id: 'ben_hdmf_contrib',
    code: 'HDMF Contribution',
    name: 'Pag-IBIG Fund Monthly Savings Contribution',
    category: 'Benefits',
    parentCategory: 'HDMF (Pag-IBIG Fund)',
    frequency: 'Monthly',
    deadlineDay: 15,
    customDescription: 'Every 15th day of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-15', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-15', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-15', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-15', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-15', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-15', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-15', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-15', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-15', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-15', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-15', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-15', periodLabel: 'Nov-26' }
    ]
  },
  {
    id: 'ben_hdmf_housing_loan',
    code: 'HDMF Housing Loan',
    name: 'Pag-IBIG Housing Loan Amortization',
    category: 'Benefits',
    parentCategory: 'HDMF (Pag-IBIG Fund)',
    frequency: 'Monthly',
    deadlineDay: 15,
    customDescription: 'Every 15th day of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-15', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-15', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-15', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-15', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-15', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-15', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-15', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-15', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-15', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-15', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-15', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-15', periodLabel: 'Nov-26' }
    ]
  },
  {
    id: 'ben_hdmf_salary_loan',
    code: 'HDMF Salary Loan',
    name: 'Pag-IBIG Multi-Purpose (Salary) Loan',
    category: 'Benefits',
    parentCategory: 'HDMF (Pag-IBIG Fund)',
    frequency: 'Monthly',
    deadlineDay: 15,
    customDescription: 'Every 15th day of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-15', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-15', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-15', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-15', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-15', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-15', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-15', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-15', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-15', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-15', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-15', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-15', periodLabel: 'Nov-26' }
    ]
  },
  {
    id: 'ben_hdmf_calamity_loan',
    code: 'HDMF Calamity Loan',
    name: 'Pag-IBIG Calamity Loan Amortization',
    category: 'Benefits',
    parentCategory: 'HDMF (Pag-IBIG Fund)',
    frequency: 'Monthly',
    deadlineDay: 15,
    customDescription: 'Every 15th day of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-15', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-15', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-15', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-15', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-15', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-15', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-15', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-15', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-15', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-15', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-15', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-15', periodLabel: 'Nov-26' }
    ]
  },

  // --- SSS (Social Security System) PARENT GROUP ---
  {
    id: 'ben_sss_contrib',
    code: 'SSS Contribution',
    name: 'SSS Monthly Employer & Employee Contribution',
    category: 'Benefits',
    parentCategory: 'SSS (Social Security System)',
    frequency: 'Monthly',
    deadlineDay: 30,
    customDescription: 'Every last day of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-31', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-28', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-31', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-30', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-31', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-30', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-31', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-31', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-30', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-31', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-30', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-31', periodLabel: 'Nov-26' }
    ]
  },
  {
    id: 'ben_sss_loan',
    code: 'SSS Salary Loan',
    name: 'SSS Monthly Member Salary Loan Amortization',
    category: 'Benefits',
    parentCategory: 'SSS (Social Security System)',
    frequency: 'Monthly',
    deadlineDay: 10,
    customDescription: 'Every 10th of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-10', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-10', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-10', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-10', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-10', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-10', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-10', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-10', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-10', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-10', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-10', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-10', periodLabel: 'Nov-26' }
    ]
  },
  {
    id: 'ben_sss_calamity_loan',
    code: 'SSS Calamity Loan',
    name: 'SSS Member Calamity Loan Amortization',
    category: 'Benefits',
    parentCategory: 'SSS (Social Security System)',
    frequency: 'Monthly',
    deadlineDay: 10,
    customDescription: 'Every 10th of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-10', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-10', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-10', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-10', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-10', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-10', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-10', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-10', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-10', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-10', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-10', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-10', periodLabel: 'Nov-26' }
    ]
  },
  {
    id: 'ben_sss_voluntary',
    code: 'SSS Voluntary Payment',
    name: 'SSS Voluntary / Self-Employed Contribution Remittance',
    category: 'Benefits',
    parentCategory: 'SSS (Social Security System)',
    frequency: 'Monthly',
    deadlineDay: 30,
    customDescription: 'Every last day of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-31', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-28', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-31', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-30', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-31', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-30', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-31', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-31', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-30', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-31', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-30', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-31', periodLabel: 'Nov-26' }
    ]
  },

  // --- PHILHEALTH PARENT GROUP ---
  {
    id: 'ben_philhealth',
    code: 'PhilHealth Cont.',
    name: 'PhilHealth Monthly Premium Contribution (5% Rate)',
    category: 'Benefits',
    parentCategory: 'PhilHealth (PHIC)',
    frequency: 'Monthly',
    deadlineDay: 10,
    customDescription: 'Every 10th day of the month following the applicable month',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-10', periodLabel: 'Dec-25' },
      { month: 'Feb', dueDate: '2026-02-10', periodLabel: 'Jan-26' },
      { month: 'Mar', dueDate: '2026-03-10', periodLabel: 'Feb-26' },
      { month: 'Apr', dueDate: '2026-04-10', periodLabel: 'Mar-26' },
      { month: 'May', dueDate: '2026-05-10', periodLabel: 'Apr-26' },
      { month: 'Jun', dueDate: '2026-06-10', periodLabel: 'May-26' },
      { month: 'Jul', dueDate: '2026-07-10', periodLabel: 'Jun-26' },
      { month: 'Aug', dueDate: '2026-08-10', periodLabel: 'Jul-26' },
      { month: 'Sep', dueDate: '2026-09-10', periodLabel: 'Aug-26' },
      { month: 'Oct', dueDate: '2026-10-10', periodLabel: 'Sep-26' },
      { month: 'Nov', dueDate: '2026-11-10', periodLabel: 'Oct-26' },
      { month: 'Dec', dueDate: '2026-12-10', periodLabel: 'Nov-26' }
    ]
  }
];

// PhilHealth 2026 Contribution Table Reference
export const PHILHEALTH_TABLE = [
  { minSalary: 0, maxSalary: 10000, rate: 0.05, fixedAmount: 500 },
  { minSalary: 10000.01, maxSalary: 99999.99, rate: 0.05, fixedAmount: null },
  { minSalary: 100000, maxSalary: 999999, rate: 0.05, fixedAmount: 5000 }
];

// SSS Contribution Sample Bracket
export const SSS_BRACKETS = [
  { msc: 5000, er: 475, ee: 225, total: 700 },
  { msc: 10000, er: 950, ee: 450, total: 1400 },
  { msc: 15000, er: 1425, ee: 675, total: 2100 },
  { msc: 20000, er: 1900, ee: 900, total: 2800 },
  { msc: 25000, er: 2375, ee: 1125, total: 3500 },
  { msc: 30000, er: 2850, ee: 1350, total: 4200 }
];

export const MONTHS_LIST: ('Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec')[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_FULL_NAMES: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
};

export const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

export function getRuleDeadlineForMonth(
  rule: CustomDeadlineRule, 
  m: string, 
  targetYear: number = 2026,
  client?: ClientProfile
): { dueDateStr: string; label: string; isNotRequired?: boolean } | null {
  const mIdx = MONTH_INDEX[m];
  if (mIdx === undefined) return null;

  // Fiscal Year Client Deadline Shift Calculation ⭐
  if (client && client.accountingPeriod === 'Fiscal') {
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
    const codeUpper = rule.code.trim().toUpperCase();

    // 1. Annual Income Tax Return (ITR / 1702 / 1702-RT / 1702-EX / 1702-MX / 1701)
    if (codeUpper === 'ITR' || (codeUpper.includes('1702') && !codeUpper.includes('1702Q')) || rule.frequency === 'Annually') {
      const dueMonthIdx = (fyEndIdx + 4) % 12; // 15th day of 4th month following FY close
      if (mIdx === dueMonthIdx) {
        const day = String(rule.deadlineDay || 15).padStart(2, '0');
        const mStr = String(dueMonthIdx + 1).padStart(2, '0');
        return {
          dueDateStr: `${targetYear}-${mStr}-${day}`,
          label: `FY-Ended ${fyMonthFullName}`,
          isNotRequired: false
        };
      }
      return null;
    }

    // 2. Quarterly Corporate Income Tax Return (1702Q / 1701Q)
    if (codeUpper === '1702Q' || codeUpper === '1701Q') {
      const q1Due = (fyEndIdx + 5) % 12; // 60 days after Q1 end
      const q2Due = (fyEndIdx + 8) % 12; // 60 days after Q2 end
      const q3Due = (fyEndIdx + 11) % 12; // 60 days after Q3 end

      const day = codeUpper === '1701Q' ? '30' : '15';

      if (mIdx === q1Due) {
        const mStr = String(q1Due + 1).padStart(2, '0');
        return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: `1Q FY-Ended ${fyMonthFullName}`, isNotRequired: false };
      }
      if (mIdx === q2Due) {
        const mStr = String(q2Due + 1).padStart(2, '0');
        return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: `2Q FY-Ended ${fyMonthFullName}`, isNotRequired: false };
      }
      if (mIdx === q3Due) {
        const mStr = String(q3Due + 1).padStart(2, '0');
        return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: `3Q FY-Ended ${fyMonthFullName}`, isNotRequired: false };
      }
      return null;
    }

    // 3. Quarterly VAT / Percentage Tax / Expanded Withholding (2550Q / 2551Q / 1601EQ)
    if (['2550Q', '2551Q', '1601EQ'].includes(codeUpper)) {
      const q1Due = (fyEndIdx + 4) % 12;
      const q2Due = (fyEndIdx + 7) % 12;
      const q3Due = (fyEndIdx + 10) % 12;
      const q4Due = (fyEndIdx + 1) % 12;

      const day = String(rule.deadlineDay || (codeUpper === '1601EQ' ? 30 : 25)).padStart(2, '0');

      if (mIdx === q1Due) {
        const mStr = String(q1Due + 1).padStart(2, '0');
        return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: `1Q FY-Ended ${fyMonthFullName}`, isNotRequired: false };
      }
      if (mIdx === q2Due) {
        const mStr = String(q2Due + 1).padStart(2, '0');
        return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: `2Q FY-Ended ${fyMonthFullName}`, isNotRequired: false };
      }
      if (mIdx === q3Due) {
        const mStr = String(q3Due + 1).padStart(2, '0');
        return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: `3Q FY-Ended ${fyMonthFullName}`, isNotRequired: false };
      }
      if (mIdx === q4Due) {
        const mStr = String(q4Due + 1).padStart(2, '0');
        return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: `4Q FY-Ended ${fyMonthFullName}`, isNotRequired: false };
      }
      return null;
    }
  }

  // Fallback / Standard Calendar Schedule
  if (rule.monthlySchedule2026 && rule.monthlySchedule2026.length > 0) {
    const match = rule.monthlySchedule2026.find(s => s.month === m);
    if (match) {
      if (match.dueDate === 'NONE' || match.dueDate === 'N/A' || match.periodLabel === 'N/A' || match.periodLabel === 'Not Required' || !match.dueDate) {
        return { dueDateStr: 'N/A', label: 'Not Required', isNotRequired: true };
      }

      const parts = match.dueDate.split('-');
      let dayStr = String(rule.deadlineDay || 15).padStart(2, '0');
      if (parts.length === 3) {
        dayStr = String(parseInt(parts[2], 10) || 15).padStart(2, '0');
      }

      const mStr = String(mIdx + 1).padStart(2, '0');
      const adjustedDueDate = `${targetYear}-${mStr}-${dayStr}`;

      let adjustedLabel = match.periodLabel || `${m}-${String(targetYear).slice(-2)}`;
      return { dueDateStr: adjustedDueDate, label: adjustedLabel, isNotRequired: false };
    }
    return null;
  }

  const mStr = String(mIdx + 1).padStart(2, '0');

  if (rule.frequency === 'Monthly') {
    const day = String(rule.deadlineDay || 10).padStart(2, '0');
    return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: `${m}-${String(targetYear).slice(-2)}`, isNotRequired: false };
  }

  if (rule.frequency === 'Quarterly') {
    if (['Jan', 'Apr', 'Jul', 'Oct'].includes(m) && ['1601EQ', '2550Q', '2551Q'].includes(rule.code)) {
      const day = String(rule.deadlineDay || 25).padStart(2, '0');
      const qLabel = m === 'Jan' ? `4Q-${targetYear - 1}` : m === 'Apr' ? `1Q-${targetYear}` : m === 'Jul' ? `2Q-${targetYear}` : `3Q-${targetYear}`;
      return { dueDateStr: `${targetYear}-${mStr}-${day}`, label: qLabel, isNotRequired: false };
    }
    if (m === 'May' && rule.code === '1702Q') return { dueDateStr: `${targetYear}-05-15`, label: `1Q-${targetYear}`, isNotRequired: false };
    if (m === 'May' && rule.code === '1701Q') return { dueDateStr: `${targetYear}-05-30`, label: `1Q-${targetYear}`, isNotRequired: false };
    if (m === 'Aug' && ['1701Q', '1702Q'].includes(rule.code)) return { dueDateStr: `${targetYear}-08-15`, label: `2Q-${targetYear}`, isNotRequired: false };
    if (m === 'Nov' && ['1701Q', '1702Q'].includes(rule.code)) return { dueDateStr: `${targetYear}-11-15`, label: `3Q-${targetYear}`, isNotRequired: false };
  }

  if (rule.frequency === 'Annually' && m === 'Apr' && rule.code === 'ITR') {
    return { dueDateStr: `${targetYear}-04-15`, label: `TY-${targetYear - 1}`, isNotRequired: false };
  }

  return null;
}
