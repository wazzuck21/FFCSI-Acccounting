import { CustomDeadlineRule, ClientProfile, BillerMasterItem } from '../types';

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
    paymentBehavior: 'CONDITIONAL_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'WITHHOLDING',
    active: true,
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
    id: 'bir_1601c',
    code: '1601C',
    name: 'Monthly Remittance Return of Income Taxes Withheld on Compensation',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Monthly',
    deadlineDay: 10,
    paymentBehavior: 'CONDITIONAL_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'WITHHOLDING',
    active: true,
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
    paymentBehavior: 'CONDITIONAL_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'WITHHOLDING',
    active: true,
    customDescription: 'Every 30th day of the month following the close of the quarter',
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
    paymentBehavior: 'CONDITIONAL_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'VAT',
    active: true,
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
    paymentBehavior: 'CONDITIONAL_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'VAT',
    active: true,
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
    deadlineDay: 29,
    paymentBehavior: 'CONDITIONAL_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'TAX_RETURN',
    active: true,
    customDescription: 'Every 29th day of the month following the close of each of the first 3 quarters (May 29 for 1Q-2026)',
    monthlySchedule2026: [
      { month: 'May', dueDate: '2026-05-29', periodLabel: '1Q - 2026' },
      { month: 'Aug', dueDate: '2026-08-29', periodLabel: '2Q - 2026' },
      { month: 'Nov', dueDate: '2026-11-29', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_1701q',
    code: '1701Q',
    name: 'Quarterly Income Tax Return for Individuals / Sole Proprietors',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 15,
    paymentBehavior: 'CONDITIONAL_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'TAX_RETURN',
    active: true,
    customDescription: 'May 15 (1Q-2026), Aug 15 (2Q-2026), Nov 15 (3Q-2026)',
    monthlySchedule2026: [
      { month: 'May', dueDate: '2026-05-15', periodLabel: '1Q - 2026' },
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
    paymentBehavior: 'CONDITIONAL_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'TAX_RETURN',
    active: true,
    customDescription: 'Every 15th day of April following the close of the taxable year',
    monthlySchedule2026: [
      { month: 'Apr', dueDate: '2026-04-15', periodLabel: 'TY - 2025' }
    ]
  },
  // --- FILING-ONLY / SUBMISSION-ONLY MASTER FORMS ⭐ ---
  {
    id: 'bir_sawt',
    code: 'SAWT',
    name: 'Summary Alphalist of Withholding Taxes (SAWT Attachment)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 30,
    paymentBehavior: 'NEVER_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'EAFS',
    complianceCategory: 'RELIEF_ATTACHMENT',
    active: true,
    customDescription: 'Mandatory quarterly electronic attachment for 1601EQ / 1702Q / 2550Q withholding validation (Submission only, no payable)',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-30', periodLabel: '4Q - 2025' },
      { month: 'Apr', dueDate: '2026-04-30', periodLabel: '1Q - 2026' },
      { month: 'Jul', dueDate: '2026-07-31', periodLabel: '2Q - 2026' },
      { month: 'Oct', dueDate: '2026-10-30', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_qap',
    code: 'QAP',
    name: 'Quarterly Alphabetical List of Payees (QAP)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 30,
    paymentBehavior: 'NEVER_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'RELIEF_ATTACHMENT',
    active: true,
    customDescription: 'Quarterly alphalist schedule submitted online with creditable withholding returns (Submission only, no payable)',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-30', periodLabel: '4Q - 2025' },
      { month: 'Apr', dueDate: '2026-04-30', periodLabel: '1Q - 2026' },
      { month: 'Jul', dueDate: '2026-07-31', periodLabel: '2Q - 2026' },
      { month: 'Oct', dueDate: '2026-10-30', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_at_relief',
    code: 'AT RELIEF',
    name: 'VAT Reconciliation of Listing for Enforcement (AT RELIEF / SLSP)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 25,
    paymentBehavior: 'NEVER_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'RELIEF_ATTACHMENT',
    active: true,
    customDescription: 'Electronic Summary List of Sales & Purchases submitted online via BIR RELIEF portal (Submission only, no payable)',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-25', periodLabel: '4Q - 2025' },
      { month: 'Apr', dueDate: '2026-04-25', periodLabel: '1Q - 2026' },
      { month: 'Jul', dueDate: '2026-07-25', periodLabel: '2Q - 2026' },
      { month: 'Oct', dueDate: '2026-10-25', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_slsp',
    code: 'SLSP',
    name: 'Summary List of Sales and Purchases (SLSP)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Quarterly',
    deadlineDay: 25,
    paymentBehavior: 'NEVER_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'RELIEF_ATTACHMENT',
    active: true,
    customDescription: 'Quarterly summary list of sales and purchases for VAT registered taxpayers (Filing only, no payable)',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-25', periodLabel: '4Q - 2025' },
      { month: 'Apr', dueDate: '2026-04-25', periodLabel: '1Q - 2026' },
      { month: 'Jul', dueDate: '2026-07-25', periodLabel: '2Q - 2026' },
      { month: 'Oct', dueDate: '2026-10-25', periodLabel: '3Q - 2026' }
    ]
  },
  {
    id: 'bir_1604c',
    code: '1604C',
    name: 'Annual Information Return of Income Taxes Withheld on Compensation',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Annually',
    deadlineDay: 31,
    fixedMonthDay: '01-31',
    paymentBehavior: 'NEVER_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'INFORMATIONAL',
    active: true,
    customDescription: 'Annual informational return due on or before January 31 following the calendar year',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-31', periodLabel: 'TY - 2025' }
    ]
  },
  {
    id: 'bir_1604e',
    code: '1604E',
    name: 'Annual Information Return of Creditable Income Taxes Withheld (Expanded)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Annually',
    deadlineDay: 1,
    fixedMonthDay: '03-01',
    paymentBehavior: 'NEVER_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'INFORMATIONAL',
    active: true,
    customDescription: 'Annual informational return of creditable withholding taxes due on or before March 1',
    monthlySchedule2026: [
      { month: 'Mar', dueDate: '2026-03-01', periodLabel: 'TY - 2025' }
    ]
  },
  {
    id: 'bir_0605',
    code: '0605',
    name: 'Payment Form (Annual Registration Fee / Deficiency Taxes)',
    category: 'BIR',
    parentCategory: 'BIR Tax Services',
    frequency: 'Annually',
    deadlineDay: 31,
    fixedMonthDay: '01-31',
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'TAX_RETURN',
    active: true,
    customDescription: 'Annual registration / special payment remittance form',
    monthlySchedule2026: [
      { month: 'Jan', dueDate: '2026-01-31', periodLabel: 'TY - 2026' }
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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
    paymentBehavior: 'ALWAYS_PAYABLE',
    filingRequired: 'YES',
    submissionMethod: 'ONLINE',
    complianceCategory: 'BENEFITS',
    active: true,
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

export const PHILIPPINE_HOLIDAYS_2026: string[] = [
  '2026-01-01', // New Year's Day
  '2026-01-02', // Special Non-Working Day
  '2026-02-25', // EDSA Revolution Anniversary
  '2026-04-02', // Maundy Thursday
  '2026-04-03', // Good Friday
  '2026-04-04', // Black Saturday
  '2026-04-09', // Araw ng Kagitingan
  '2026-05-01', // Labor Day
  '2026-06-12', // Independence Day
  '2026-08-21', // Ninoy Aquino Day
  '2026-08-31', // National Heroes Day
  '2026-11-01', // All Saints' Day
  '2026-11-02', // All Souls' Day
  '2026-11-30', // Bonifacio Day
  '2026-12-08', // Feast of the Immaculate Conception
  '2026-12-24', // Christmas Eve
  '2026-12-25', // Christmas Day
  '2026-12-30', // Rizal Day
  '2026-12-31'  // Last Day of Year
];

export function adjustDeadlineForWeekendsAndHolidays(
  dateStr: string,
  holidays: string[] = PHILIPPINE_HOLIDAYS_2026
): { adjustedDateStr: string; wasShifted: boolean; shiftReason?: string } {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'NONE') {
    return { adjustedDateStr: dateStr, wasShifted: false };
  }

  const parts = dateStr.split('-');
  if (parts.length !== 3) return { adjustedDateStr: dateStr, wasShifted: false };

  let dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  if (isNaN(dt.getTime())) return { adjustedDateStr: dateStr, wasShifted: false };

  let wasShifted = false;
  const reasons: string[] = [];

  let safetyCount = 0;
  while (safetyCount < 10) {
    const dayOfWeek = dt.getDay(); // 0 = Sun, 6 = Sat
    const currStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    if (dayOfWeek === 6) { // Saturday -> shift to Monday
      dt.setDate(dt.getDate() + 2);
      wasShifted = true;
      reasons.push('Saturday adjusted to Monday');
    } else if (dayOfWeek === 0) { // Sunday -> shift to Monday
      dt.setDate(dt.getDate() + 1);
      wasShifted = true;
      reasons.push('Sunday adjusted to Monday');
    } else if (holidays.includes(currStr)) {
      dt.setDate(dt.getDate() + 1);
      wasShifted = true;
      reasons.push(`Holiday (${currStr}) adjusted to next working day`);
    } else {
      break;
    }
    safetyCount++;
  }

  const finalStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return {
    adjustedDateStr: finalStr,
    wasShifted,
    shiftReason: reasons.length > 0 ? reasons.join('; ') : undefined
  };
}

export function generateDefaultScheduleForFrequency(
  frequency: 'Monthly' | 'Quarterly' | 'Annually' | 'Custom',
  deadlineDay: number = 10,
  code: string = '',
  applicableMonths?: string[]
): { month: 'Jan'|'Feb'|'Mar'|'Apr'|'May'|'Jun'|'Jul'|'Aug'|'Sep'|'Oct'|'Nov'|'Dec'; dueDate: string; periodLabel: string }[] {
  const codeUpper = (code || '').trim().toUpperCase();
  const dayStr = String(deadlineDay || 10).padStart(2, '0');

  if (frequency === 'Monthly') {
    return MONTHS_LIST.map((m, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      const periodLabel = idx === 0 ? 'Dec-25' : `${MONTHS_LIST[idx - 1]}-26`;
      return {
        month: m,
        dueDate: `2026-${mStr}-${dayStr}`,
        periodLabel
      };
    });
  }

  if (frequency === 'Quarterly') {
    if (codeUpper === '1701Q') {
      const day = String(deadlineDay || 15).padStart(2, '0');
      return [
        { month: 'May', dueDate: `2026-05-${day}`, periodLabel: '1Q - 2026' },
        { month: 'Aug', dueDate: `2026-08-${day}`, periodLabel: '2Q - 2026' },
        { month: 'Nov', dueDate: `2026-11-${day}`, periodLabel: '3Q - 2026' }
      ];
    }
    if (codeUpper === '1702Q') {
      const day = String(deadlineDay || 29).padStart(2, '0');
      return [
        { month: 'May', dueDate: `2026-05-${day}`, periodLabel: '1Q - 2026' },
        { month: 'Aug', dueDate: `2026-08-${day}`, periodLabel: '2Q - 2026' },
        { month: 'Nov', dueDate: `2026-11-${day}`, periodLabel: '3Q - 2026' }
      ];
    }
    const day = String(deadlineDay || 25).padStart(2, '0');
    return [
      { month: 'Jan', dueDate: `2026-01-${day}`, periodLabel: '4Q - 2025' },
      { month: 'Apr', dueDate: `2026-04-${day}`, periodLabel: '1Q - 2026' },
      { month: 'Jul', dueDate: `2026-07-${day}`, periodLabel: '2Q - 2026' },
      { month: 'Oct', dueDate: `2026-10-${day}`, periodLabel: '3Q - 2026' }
    ];
  }

  if (frequency === 'Annually') {
    const day = String(deadlineDay || 15).padStart(2, '0');
    return [
      { month: 'Apr', dueDate: `2026-04-${day}`, periodLabel: 'TY - 2025' }
    ];
  }

  if (frequency === 'Custom') {
    const apps = applicableMonths && applicableMonths.length > 0 ? applicableMonths : ['Jan', 'Feb', 'Jun', 'Jul'];
    return MONTHS_LIST.map((m, idx) => {
      const isApp = apps.includes(m);
      const mStr = String(idx + 1).padStart(2, '0');
      const prevM = idx === 0 ? 'Dec-25' : `${MONTHS_LIST[idx - 1]}-26`;
      return {
        month: m,
        dueDate: isApp ? `2026-${mStr}-${dayStr}` : 'N/A',
        periodLabel: isApp ? prevM : 'N/A'
      };
    });
  }

  return [];
}

export function getRuleDeadlineForMonth(
  rule: CustomDeadlineRule, 
  m: string, 
  targetYear: number = 2026,
  client?: Partial<ClientProfile>
): { dueDateStr: string; label: string; isNotRequired?: boolean; wasWeekendShifted?: boolean } | null {
  const mIdx = MONTH_INDEX[m];
  if (mIdx === undefined) return null;

  const sanitizeResult = (res: { dueDateStr: string; label: string; isNotRequired?: boolean } | null) => {
    if (!res || !res.dueDateStr || res.dueDateStr === 'N/A' || res.dueDateStr === 'NONE') return res;
    const adj = adjustDeadlineForWeekendsAndHolidays(res.dueDateStr);
    return {
      ...res,
      dueDateStr: adj.adjustedDateStr,
      wasWeekendShifted: adj.wasShifted
    };
  };

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
    const codeUpper = (rule.code || '').trim().toUpperCase();

    // 1. Annual Income Tax Return (ITR / 1702 / 1702-RT / 1702-EX / 1702-MX / 1701)
    if (codeUpper === 'ITR' || (codeUpper.includes('1702') && !codeUpper.includes('1702Q')) || rule.frequency === 'Annually') {
      const dueMonthIdx = (fyEndIdx + 4) % 12; // 15th day of 4th month following FY close
      if (mIdx === dueMonthIdx) {
        const day = String(rule.deadlineDay || 15).padStart(2, '0');
        const mStr = String(dueMonthIdx + 1).padStart(2, '0');
        return sanitizeResult({
          dueDateStr: `${targetYear}-${mStr}-${day}`,
          label: `FY-Ended ${fyMonthFullName}`,
          isNotRequired: false
        });
      }
      return null;
    }

    // 2. Quarterly Corporate Income Tax Return (1702Q / 1701Q)
    if (codeUpper === '1702Q' || codeUpper === '1701Q') {
      const q1Due = (fyEndIdx + 5) % 12; // 60 days after Q1 end
      const q2Due = (fyEndIdx + 8) % 12; // 60 days after Q2 end
      const q3Due = (fyEndIdx + 11) % 12; // 60 days after Q3 end

      const day = codeUpper === '1701Q' ? '15' : '29';

      if (mIdx === q1Due) {
        const mStr = String(q1Due + 1).padStart(2, '0');
        return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: `1Q FY-Ended ${fyMonthFullName}`, isNotRequired: false });
      }
      if (mIdx === q2Due) {
        const mStr = String(q2Due + 1).padStart(2, '0');
        return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: `2Q FY-Ended ${fyMonthFullName}`, isNotRequired: false });
      }
      if (mIdx === q3Due) {
        const mStr = String(q3Due + 1).padStart(2, '0');
        return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: `3Q FY-Ended ${fyMonthFullName}`, isNotRequired: false });
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
        return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: `1Q FY-Ended ${fyMonthFullName}`, isNotRequired: false });
      }
      if (mIdx === q2Due) {
        const mStr = String(q2Due + 1).padStart(2, '0');
        return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: `2Q FY-Ended ${fyMonthFullName}`, isNotRequired: false });
      }
      if (mIdx === q3Due) {
        const mStr = String(q3Due + 1).padStart(2, '0');
        return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: `3Q FY-Ended ${fyMonthFullName}`, isNotRequired: false });
      }
      if (mIdx === q4Due) {
        const mStr = String(q4Due + 1).padStart(2, '0');
        return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: `4Q FY-Ended ${fyMonthFullName}`, isNotRequired: false });
      }
      return null;
    }
  }

  // ⭐ CUSTOM FILING FREQUENCY CHECK (or custom applicableMonths)
  if (rule.frequency === 'Custom' || (rule.applicableMonths && rule.applicableMonths.length > 0)) {
    const months = rule.applicableMonths && rule.applicableMonths.length > 0
      ? rule.applicableMonths
      : ['Jan', 'Feb', 'Jun', 'Jul'];

    const isApplicable = months.some(am => am.toLowerCase() === m.toLowerCase());
    if (!isApplicable) {
      return null;
    }

    const mStr = String(mIdx + 1).padStart(2, '0');

    // 1. Specific Date
    if (rule.specificDate) {
      const parts = rule.specificDate.split('-');
      if (parts.length === 3) {
        const sMonthIdx = parseInt(parts[1], 10) - 1;
        if (sMonthIdx === mIdx) {
          return sanitizeResult({
            dueDateStr: `${targetYear}-${mStr}-${parts[2]}`,
            label: rule.customDescription || `${m}-${String(targetYear).slice(-2)}`,
            isNotRequired: false
          });
        }
      }
    }

    // 2. Fixed Month Day
    if (rule.fixedMonthDay) {
      const parts = rule.fixedMonthDay.split('-');
      if (parts.length === 2) {
        const fMonthIdx = parseInt(parts[0], 10) - 1;
        if (fMonthIdx === mIdx) {
          return sanitizeResult({
            dueDateStr: `${targetYear}-${mStr}-${parts[1]}`,
            label: rule.customDescription || `${m}-${String(targetYear).slice(-2)}`,
            isNotRequired: false
          });
        }
      }
    }

    // 3. Check monthlySchedule2026 for explicit due date override for month m
    if (rule.monthlySchedule2026 && rule.monthlySchedule2026.length > 0) {
      const match = rule.monthlySchedule2026.find(s => s.month === m);
      if (match && match.dueDate && match.dueDate !== 'NONE' && match.dueDate !== 'N/A' && match.periodLabel !== 'N/A' && match.periodLabel !== 'Not Required') {
        const parts = match.dueDate.split('-');
        let dayStr = rule.deadlineDay ? String(rule.deadlineDay).padStart(2, '0') : '10';
        if (parts.length === 3 && !rule.deadlineDay) {
          dayStr = String(parseInt(parts[2], 10) || 10).padStart(2, '0');
        }
        let calcLabel = match.periodLabel;
        if (calcLabel === `${m}-${String(targetYear).slice(-2)}`) {
          calcLabel = mIdx === 0 ? `Dec-${String(targetYear - 1).slice(-2)}` : `${MONTHS_LIST[mIdx - 1]}-${String(targetYear).slice(-2)}`;
        }
        return sanitizeResult({
          dueDateStr: `${targetYear}-${mStr}-${dayStr}`,
          label: calcLabel || (mIdx === 0 ? `Dec-${String(targetYear - 1).slice(-2)}` : `${MONTHS_LIST[mIdx - 1]}-${String(targetYear).slice(-2)}`),
          isNotRequired: false
        });
      }
    }

    // 4. Fallback to standard deadline Day for the applicable custom month
    const day = String(rule.deadlineDay || 10).padStart(2, '0');
    const fallbackLabel = mIdx === 0 ? `Dec-${String(targetYear - 1).slice(-2)}` : `${MONTHS_LIST[mIdx - 1]}-${String(targetYear).slice(-2)}`;
    return sanitizeResult({
      dueDateStr: `${targetYear}-${mStr}-${day}`,
      label: fallbackLabel,
      isNotRequired: false
    });
  }

  // Monthly Standard Schedule Calculation
  if (rule.frequency === 'Monthly') {
    const mStr = String(mIdx + 1).padStart(2, '0');
    const day = String(rule.deadlineDay || 10).padStart(2, '0');
    const periodLabel = mIdx === 0 
      ? `Dec-${String(targetYear - 1).slice(-2)}` 
      : `${MONTHS_LIST[mIdx - 1]}-${String(targetYear).slice(-2)}`;
    return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: periodLabel, isNotRequired: false });
  }

  // Fallback / Standard Calendar Schedule for Quarterly, Annually, etc.
  if (rule.monthlySchedule2026 && rule.monthlySchedule2026.length > 0) {
    const match = rule.monthlySchedule2026.find(s => s.month === m);
    if (match) {
      if (match.dueDate === 'NONE' || match.dueDate === 'N/A' || match.periodLabel === 'N/A' || match.periodLabel === 'Not Required' || !match.dueDate) {
        return { dueDateStr: 'N/A', label: 'Not Required', isNotRequired: true };
      }

      const parts = match.dueDate.split('-');
      let dayStr = rule.deadlineDay ? String(rule.deadlineDay).padStart(2, '0') : '15';
      if (parts.length === 3 && !rule.deadlineDay) {
        dayStr = String(parseInt(parts[2], 10) || 15).padStart(2, '0');
      }

      const mStr = String(mIdx + 1).padStart(2, '0');
      const adjustedDueDate = `${targetYear}-${mStr}-${dayStr}`;

      let adjustedLabel = match.periodLabel;
      if (adjustedLabel === `${m}-${String(targetYear).slice(-2)}` && ((rule.frequency as string) === 'Monthly' || (rule.frequency as string) === 'Custom')) {
        adjustedLabel = mIdx === 0 ? `Dec-${String(targetYear - 1).slice(-2)}` : `${MONTHS_LIST[mIdx - 1]}-${String(targetYear).slice(-2)}`;
      }
      if (!adjustedLabel) {
        adjustedLabel = ((rule.frequency as string) === 'Monthly' || (rule.frequency as string) === 'Custom')
          ? (mIdx === 0 ? `Dec-${String(targetYear - 1).slice(-2)}` : `${MONTHS_LIST[mIdx - 1]}-${String(targetYear).slice(-2)}`)
          : `${m}-${String(targetYear).slice(-2)}`;
      }
      return sanitizeResult({ dueDateStr: adjustedDueDate, label: adjustedLabel, isNotRequired: false });
    }
    return null;
  }

  const mStr = String(mIdx + 1).padStart(2, '0');

  if (rule.frequency === 'Quarterly') {
    const codeUpper = (rule.code || '').trim().toUpperCase();
    if (['Jan', 'Apr', 'Jul', 'Oct'].includes(m) && ['1601EQ', '2550Q', '2551Q'].includes(codeUpper)) {
      const day = String(rule.deadlineDay || (codeUpper === '1601EQ' ? 30 : 25)).padStart(2, '0');
      const qLabel = m === 'Jan' ? `4Q - ${targetYear - 1}` : m === 'Apr' ? `1Q - ${targetYear}` : m === 'Jul' ? `2Q - ${targetYear}` : `3Q - ${targetYear}`;
      return sanitizeResult({ dueDateStr: `${targetYear}-${mStr}-${day}`, label: qLabel, isNotRequired: false });
    }
    if (m === 'May' && codeUpper === '1702Q') return sanitizeResult({ dueDateStr: `${targetYear}-05-${String(rule.deadlineDay || 29).padStart(2, '0')}`, label: `1Q - ${targetYear}`, isNotRequired: false });
    if (m === 'May' && codeUpper === '1701Q') return sanitizeResult({ dueDateStr: `${targetYear}-05-${String(rule.deadlineDay || 15).padStart(2, '0')}`, label: `1Q - ${targetYear}`, isNotRequired: false });
    if (m === 'Aug' && (codeUpper === '1701Q' || codeUpper === '1702Q')) {
      const d = String(rule.deadlineDay || (codeUpper === '1702Q' ? 29 : 15)).padStart(2, '0');
      return sanitizeResult({ dueDateStr: `${targetYear}-08-${d}`, label: `2Q - ${targetYear}`, isNotRequired: false });
    }
    if (m === 'Nov' && (codeUpper === '1701Q' || codeUpper === '1702Q')) {
      const d = String(rule.deadlineDay || (codeUpper === '1702Q' ? 29 : 15)).padStart(2, '0');
      return sanitizeResult({ dueDateStr: `${targetYear}-11-${d}`, label: `3Q - ${targetYear}`, isNotRequired: false });
    }
  }

  if (rule.frequency === 'Annually' && m === 'Apr') {
    const d = String(rule.deadlineDay || 15).padStart(2, '0');
    return sanitizeResult({ dueDateStr: `${targetYear}-04-${d}`, label: `TY - ${targetYear - 1}`, isNotRequired: false });
  }

  return null;
}

// Default Biller Master Catalog List ⭐
export const DEFAULT_BILLER_CATALOG: BillerMasterItem[] = [
  // --- BIR TAX RETURNS (From BIR Rules) ---
  {
    id: 'biller_bir_0619e',
    code: '0619E',
    shortName: '0619E',
    name: '0619E Monthly Remittance Return of Creditable Income Taxes Withheld (Expanded)',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 0,
    description: 'Monthly BIR Expanded Withholding Tax Remittance (Every 10th of following month)',
    sourceRuleCode: '0619E',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_bir_1601c',
    code: '1601C',
    shortName: '1601C',
    name: '1601C Monthly Remittance Return of Income Taxes Withheld on Compensation',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 0,
    description: 'Monthly BIR Compensation Withholding Tax Remittance (Every 10th of following month)',
    sourceRuleCode: '1601C',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_bir_1601eq',
    code: '1601EQ',
    shortName: '1601EQ',
    name: '1601EQ Quarterly Remittance Return of Creditable Income Taxes Withheld (Expanded)',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Quarterly',
    defaultAmount: 0,
    description: 'Quarterly BIR Expanded Withholding Tax Remittance (Every 30th after quarter)',
    sourceRuleCode: '1601EQ',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_bir_2550q',
    code: '2550Q',
    shortName: '2550Q',
    name: '2550Q Quarterly Value-Added Tax Return',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Quarterly',
    defaultAmount: 0,
    description: 'Quarterly Value-Added Tax Return for VAT Taxpayers (Every 25th after quarter)',
    sourceRuleCode: '2550Q',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_bir_2551q',
    code: '2551Q',
    shortName: '2551Q',
    name: '2551Q Quarterly Percentage Tax Return',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Quarterly',
    defaultAmount: 0,
    description: 'Quarterly Percentage Tax Return for Non-VAT Taxpayers (Every 25th after quarter)',
    sourceRuleCode: '2551Q',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_bir_1702q',
    code: '1702Q',
    shortName: '1702Q',
    name: '1702Q Quarterly Income Tax Return for Corporations and Partnerships',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Quarterly',
    defaultAmount: 0,
    description: 'Quarterly Corporate Income Tax Return (Every 29th after quarter)',
    sourceRuleCode: '1702Q',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_bir_1701q',
    code: '1701Q',
    shortName: '1701Q',
    name: '1701Q Quarterly Income Tax Return for Individuals / Sole Proprietors',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Quarterly',
    defaultAmount: 0,
    description: 'Quarterly Individual / Sole Proprietor Income Tax Return',
    sourceRuleCode: '1701Q',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_bir_itr',
    code: 'ITR',
    shortName: 'Annual ITR',
    name: 'Annual Income Tax Return (1701 / 1702)',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Annually',
    defaultAmount: 0,
    description: 'Annual Income Tax Return due every April 15 following the taxable year',
    sourceRuleCode: 'ITR',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_bir_0605',
    code: '0605',
    shortName: '0605 Reg Fee',
    name: '0605 Payment Form (Annual Registration Fee / Deficiency Taxes)',
    category: 'BIR Tax Return',
    paymentType: 'Recurring',
    frequency: 'Annually',
    defaultAmount: 500,
    description: 'Annual BIR Registration Fee / Special Tax Remittance Form',
    sourceRuleCode: '0605',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // --- STATUTORY BENEFITS & LOANS (From Benefits Rules) ---
  {
    id: 'biller_sss_cont',
    code: 'SSS_CONT',
    shortName: 'SSS Cont.',
    name: 'SSS Monthly Employer & Employee Contribution Remittance',
    category: 'Statutory Benefits / Loans',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 0,
    description: 'Social Security System Monthly Contribution Remittance',
    sourceRuleCode: 'SSS Contribution',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_sss_loan',
    code: 'SSS_LOAN',
    shortName: 'SSS Loan',
    name: 'SSS Monthly Member Salary / Calamity Loan Amortization',
    category: 'Statutory Benefits / Loans',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 0,
    description: 'Social Security System Monthly Salary Loan Payment Remittance',
    sourceRuleCode: 'SSS Salary Loan',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_hdmf_cont',
    code: 'HDMF_CONT',
    shortName: 'HDMF Cont.',
    name: 'Pag-IBIG Fund (HDMF) Monthly Savings Contribution',
    category: 'Statutory Benefits / Loans',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 0,
    description: 'Home Development Mutual Fund Monthly Savings Contribution',
    sourceRuleCode: 'HDMF Contribution',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_hdmf_loan',
    code: 'HDMF_LOAN',
    shortName: 'HDMF Loan',
    name: 'Pag-IBIG Fund (HDMF) Monthly Salary / Housing Loan Amortization',
    category: 'Statutory Benefits / Loans',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 0,
    description: 'Pag-IBIG Multi-Purpose & Housing Loan Monthly Amortization',
    sourceRuleCode: 'HDMF Salary Loan',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_phic_cont',
    code: 'PHIC_CONT',
    shortName: 'PhilHealth Cont.',
    name: 'PhilHealth (PHIC) Monthly Premium Contribution',
    category: 'Statutory Benefits / Loans',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 0,
    description: 'Philippine Health Insurance Corporation Monthly Premium Remittance',
    sourceRuleCode: 'PhilHealth Cont.',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // --- RETAINER FEES ---
  {
    id: 'biller_ret_monthly',
    code: 'RET_FEE_MONTHLY',
    shortName: 'Retainer Fee (Mo)',
    name: 'Monthly Accounting, Tax & Bookkeeping Retainer Fee',
    category: 'Retainer Fee',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 15000,
    description: 'Fixed monthly professional accounting, compliance and retainer fee',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_ret_quarterly',
    code: 'RET_FEE_QUARTERLY',
    shortName: 'Retainer Fee (Qtr)',
    name: 'Quarterly Professional Retainer & Financial Advisory Fee',
    category: 'Retainer Fee',
    paymentType: 'Recurring',
    frequency: 'Quarterly',
    defaultAmount: 45000,
    description: 'Fixed quarterly retainer fee for financial advisory and filing supervision',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_ret_payroll',
    code: 'RET_PAYROLL',
    shortName: 'Payroll Admin Fee',
    name: 'Monthly Payroll Processing & Statutory Benefits Administration Fee',
    category: 'Retainer Fee',
    paymentType: 'Recurring',
    frequency: 'Monthly',
    defaultAmount: 5000,
    description: 'Monthly payroll computation, payslips distribution and statutory portal filing',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // --- SERVICE CHARGES ---
  {
    id: 'biller_srv_general',
    code: 'SRV_CHG_GENERAL',
    shortName: 'Service Charge',
    name: 'General Professional Service Charge',
    category: 'Service Charges',
    paymentType: 'One-Time',
    defaultAmount: 2500,
    description: 'Standard out-of-scope professional service charge per assignment',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_srv_courier',
    code: 'SRV_CHG_COURIER',
    shortName: 'Courier & Handling',
    name: 'Documentation, Printing & Courier Handling Fee',
    category: 'Service Charges',
    paymentType: 'One-Time',
    defaultAmount: 500,
    description: 'Official document printing, notarization logistics, and messenger dispatch',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_srv_liaison',
    code: 'SRV_CHG_LIAISON',
    shortName: 'Agency Liaison Fee',
    name: 'Government Agency Liaison, Submissions & Processing Fee',
    category: 'Service Charges',
    paymentType: 'One-Time',
    defaultAmount: 3500,
    description: 'Field officer liaison for in-person BIR / SEC / LGU / SSS submissions',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // --- SPECIAL ENGAGEMENTS ---
  {
    id: 'biller_spec_sec_gis',
    code: 'SPEC_SEC_GIS',
    shortName: 'SEC GIS Filing',
    name: 'SEC General Information Sheet (GIS) Annual Filing Service',
    category: 'Special Engagements',
    paymentType: 'One-Time',
    defaultAmount: 5000,
    description: 'Drafting, notarization and SEC MC28 portal filing of annual GIS',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'biller_spec_bir_reg',
    code: 'SPEC_BIR_REG',
    shortName: 'BIR Registration',
    name: 'BIR Business Registration / Branch / COR Update Service',
    category: 'Special Engagements',
    paymentType: 'One-Time',
    defaultAmount: 8000,
    description: 'New business TIN/COR registration or branch transfer & book stamping',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // --- ADJUSTMENTS ---
  {
    id: 'biller_adj_late_fee',
    code: 'ADJ_LATE_FEE',
    shortName: 'Penalty Pass-Through',
    name: 'Late Filing Penalty / Government Surcharge Pass-Through',
    category: 'Adjustments',
    paymentType: 'One-Time',
    defaultAmount: 1000,
    description: 'Pass-through charge for government agency compromise penalties or surcharge',
    active: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];
