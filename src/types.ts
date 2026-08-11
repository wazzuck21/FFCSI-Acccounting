export type UserRole = 'SUPER_ADMIN' | 'BILLING' | 'ACCOUNTING' | 'BENEFITS' | 'STAFF';

export interface CompanyServicePermission {
  allowAllBIR: boolean;
  allowedBIR: string[]; // e.g. ['0619E', '1601EQ', '2550Q']
  allowAllBenefits: boolean;
  allowedBenefits: string[]; // e.g. ['SSS Contribution', 'PhilHealth Contribution']
}

export interface UserPermission {
  clients: boolean;
  clientAccessList?: string[]; // Specific client IDs if restricted
  clientServicePermissions?: Record<string, CompanyServicePermission>; // Detailed company BIR/Benefits permissions
  birAccessList?: string[]; // Legacy/Global BIR access
  benefitsAccessList?: string[]; // Legacy/Global Benefits access
  billing: boolean;
  compliance: boolean;
  reports: boolean;
  payroll: boolean;
  documents: boolean;
  dashboard: boolean;
  settings: boolean;
  userManagement: boolean;
  dynamicFields: boolean;
  payables?: boolean;
  companyExpenses?: boolean;
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  contactNumber?: string;
  role: UserRole;
  status: 'Active' | 'Inactive' | 'Disabled';
  lastLogin?: string;
  permissions: UserPermission;
  avatarUrl?: string;
  email?: string; // Optional for backward compatibility
  position?: string; // Optional for backward compatibility
}

export type EntityType = 'Proprietor' | 'Corporation' | 'Partnership';

export interface MonthlyDeadlineSchedule {
  month: 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';
  dueDate: string; // YYYY-MM-DD
  periodLabel?: string; // e.g., "Dec-25", "Jan-26", "1Q-2026", "4Q-2025"
}

export interface FormLinkage {
  id?: string;
  primaryCode: string;
  linkedCodes: string[];
  description?: string;
}

export interface CustomDeadlineRule {
  id: string;
  code: string; // e.g., '0619E', 'SSS_CONTRIB'
  name: string; // e.g., 'Withholding Tax - Monthly Remittance (0619E)'
  category: 'BIR' | 'Benefits' | 'DTI' | 'SEC' | 'Other';
  frequency: 'Monthly' | 'Quarterly' | 'Annually' | 'Custom';
  deadlineDay: number; // e.g. 10th day
  fixedMonthDay?: string; // e.g. "04-15" (April 15)
  specificDate?: string; // e.g. "2026-08-15"
  customDescription: string; // e.g. "Every 10th of the following month"
  monthlySchedule2026?: MonthlyDeadlineSchedule[];
  
  // Custom Applicable Months ⭐
  applicableMonths?: ('Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec')[];

  // Applicable Accounting Year Type (Calendar vs Fiscal) ⭐
  applicableYearType?: 'Both' | 'Calendar' | 'Fiscal';

  // Hierarchy Mapping (Parent vs Child) ⭐
  parentCategory?: string; // Top-Level Parent Agency/Group (e.g. 'HDMF (Pag-IBIG)', 'SSS', 'PhilHealth', 'BIR Tax Services')
  parentCode?: string; // Parent rule ID or Code
  isParent?: boolean; // True if item acts as parent category container

  // Client Exclusive Option ⭐
  isExclusiveToClient?: boolean;
  exclusiveClientId?: string;
  exclusiveClientName?: string;
}

export interface ContactPerson {
  id?: string;
  name: string;
  email: string;
  telephone: string;
  position?: string;
}

export interface ClientProfile {
  id: string;
  companyName: string;
  tinNumber: string; // 9-digit or 12-digit
  address: string;
  zipCode?: string; // Philippine 4-digit zip code
  rdoNumber: string; // 3 alphanumeric, e.g., '038', '044', '050'
  psicCode?: string; // Philippine Standard Industrial Classification Code
  businessNature: string[]; // multi-select nature of business
  status: 'Active' | 'Inactive' | 'For Compliance' | 'Compliance' | 'Archived';
  
  // Archival Metadata ⭐
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  
  registrationMethod: 'Manual' | 'eFPS';
  entityType: EntityType;
  
  // Conditional details for Corporation / Partnership
  secRegistrationNumber?: string;
  annualMeetingDate?: string; // YYYY-MM-DD
  
  // Conditional details for Proprietor
  dtiRegistrationNumber?: string;
  dtiExpirationDate?: string; // YYYY-MM-DD
  proprietorFirstName?: string;
  proprietorLastName?: string;
  proprietorMiddleName?: string;
  
  // BIR Tax Services selected
  birTaxServices: string[]; // e.g. ['0619E', '1601EQ', '2550Q', '1701Q', '1702Q', 'ITR']
  
  // Benefits selected
  benefitsServices: string[]; // e.g. ['SSS Contribution', 'SSS Salary Loan', 'HDMF Contribution', 'HDMF Loan', 'PhilHealth Contribution']
  
  // Contact & Additional
  contactPerson: string;
  mobileNumber: string;
  telephoneNumber?: string;
  emailAddress: string;
  contactPersons?: ContactPerson[];
  assignedStaffId: string;
  assignedStaffName: string;
  notes?: string;
  tags?: string[];
  
  // Office & Accounting
  accountingPeriod?: 'Calendar' | 'Fiscal';
  fiscalYearEndMonth?: string;
  fiscalYearEndDay?: string;
  
  // Financial (VISIBLE ONLY TO SUPER ADMIN)
  retainersFee: number;
  
  // Dynamic fields storage per client
  dynamicData?: Record<string, any>;
  
  // Branch & Corporate Group Parent-Child Relationship ⭐
  isBranch?: boolean;
  parentClientId?: string;
  parentClientName?: string;
  branchCode?: string; // e.g. '000' (Main Office), '001' (Branch 1)
  baseTin?: string; // e.g. '009-023-023'
  
  createdAt: string;
  updatedAt: string;
}

// Client Services & Engagement Entity ⭐
export type ServiceCategory = 'BIR' | 'Benefits' | 'Accounting' | 'Audit' | 'Payroll' | 'SEC' | 'Legal / SEC' | 'DTI' | 'Consulting' | 'Other';
export type ServiceStatus = 'Active' | 'Suspended' | 'Ended';
export type ServiceBillingFrequency = 'Monthly' | 'Quarterly' | 'Annual' | 'One-Time';

export interface ClientService {
  id: string;
  clientId: string;

  serviceCode: string;
  serviceName: string;
  category: ServiceCategory;

  status: ServiceStatus;

  startDate: string;
  endDate?: string;

  assignedStaffId?: string;
  assignedStaffName?: string;

  billable: boolean;
  billingFrequency?: ServiceBillingFrequency;

  fee?: number;

  generatesCompliance?: boolean;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

// Dynamic Client Information Builder ⭐
export type DynamicFieldType = 
  | 'Text' 
  | 'Paragraph' 
  | 'Number' 
  | 'Currency' 
  | 'Date' 
  | 'Time' 
  | 'Dropdown' 
  | 'Checkbox' 
  | 'Radio' 
  | 'Email' 
  | 'Phone' 
  | 'Website' 
  | 'Address' 
  | 'FileUpload' 
  | 'ImageUpload' 
  | 'Signature' 
  | 'RichText';

export interface DynamicFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  unique?: boolean;
  readOnly?: boolean;
  defaultValue?: any;
}

export interface DynamicFieldDefinition {
  id: string;
  label: string;
  type: DynamicFieldType;
  placeholder?: string;
  options?: string[]; // for Dropdown, Radio, Checkbox
  validation?: DynamicFieldValidation;
  includeDeadline?: boolean;
  helpText?: string;
}

export interface DynamicSection {
  id: string;
  title: string;
  description?: string;
  isRepeatable?: boolean; // For repeatable records (Multiple Bank Accounts, Multiple Vehicles)
  industryTemplate?: string; // e.g., 'Construction', 'Restaurant', 'Real Estate', 'General'
  fields: DynamicFieldDefinition[];
  createdAt: string;
}

// Payables & Assessment Engine
export type PayableCategory = 'BIR' | 'Benefits';
export type PayableStatus = 'Unpaid' | 'Paid' | 'No Payment';

export interface PayableRecord {
  id: string;
  clientId: string;
  clientName: string;
  category: PayableCategory;
  itemName: string; // e.g. '0619E', 'SSS Contribution', 'PhilHealth Cont.'
  month: string; // e.g. '2026-08' or 'August 2026'
  year: number;
  payableAmount: number;
  status: PayableStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
  
  // Super Admin Paid verification details
  paymentDetails?: {
    paidDate: string;
    paymentMethod: 'Bank' | 'Maya' | 'GCash' | 'Check' | 'Cash';
    bankName?: string; // e.g., 'BDO Unibank', 'BPI', 'Metrobank', 'Landbank'
    amountPaid: number;
    taggedById: string;
    taggedByName: string;
    referenceNumber?: string;
    notes?: string;
  };

  amendedHistory?: {
    date: string;
    modifiedBy: string;
    details: string;
    previousAmount?: number;
    newAmount?: number;
  }[];
}

// Compliance Schedule Item
export interface ComplianceItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  category: 'BIR' | 'Benefits' | 'DTI' | 'SEC' | 'Other';
  dueDate: string; // YYYY-MM-DD
  status: 'Pending' | 'For Payment' | 'Due Today' | 'Overdue' | 'Already Paid' | 'Waived';
  description?: string;
  assignedStaffName?: string;
  amountDue?: number;
  paidDate?: string;
}

// Document Management
export type DocumentCategory = 'BIR' | 'SEC' | 'Business Permits' | 'Financial Statements' | 'Contracts' | 'Government Forms' | 'Other';

export interface DocumentItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  fileName: string;
  fileType: 'PDF' | 'Excel' | 'Word' | 'Image' | 'ZIP';
  fileSize: string;
  category: DocumentCategory;
  uploadDate: string;
  expirationDate?: string;
  version: string;
  uploadedBy: string;
  downloadUrl?: string;
  dataUrl?: string; // local preview mock
}

// Task & Workflow
export type TaskWorkflowStage = 'Preparer' | 'Reviewer' | 'Approved' | 'Returned';
export type TaskStatus = 'Pending' | 'In Progress' | 'For Review' | 'Completed' | 'On Hold' | 'Cancelled' | 'Overdue';

export interface TaskItem {
  id: string;
  clientId?: string;
  clientName?: string;
  clientServiceId?: string; // Link to ClientService entity ⭐
  ruleId?: string;          // Link to CustomDeadlineRule ⭐
  formCode?: string;        // e.g. '0619E', '1601C', '2550Q', 'SSS Contribution' ⭐
  title: string;
  description?: string;
  category: 'BIR' | 'Benefits' | 'Bookkeeping' | 'Tax Filing' | 'Payroll' | 'Audit' | 'Compliance' | 'Client Request';
  recurrence?: 'Monthly' | 'Quarterly' | 'Annually' | 'One-Time';
  taxablePeriod?: string;   // e.g., "August 2026", "3Q-2026", "TY-2025" ⭐
  dueDate: string;          // YYYY-MM-DD
  originalDueDate?: string; // For deadline overrides ⭐
  isOverriddenDeadline?: boolean; // ⭐
  overrideReason?: string;  // ⭐
  rdoNumber?: string;       // RDO for filtering & compliance ⭐
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: TaskStatus;
  workflowStage?: TaskWorkflowStage; // Preparer -> Reviewer -> Approved / Returned ⭐
  assignedToId: string;
  assignedToName: string;
  preparerId?: string;      // Staff who prepared ⭐
  preparerName?: string;
  reviewerId?: string;      // Senior staff/admin assigned to review ⭐
  reviewerName?: string;
  reviewNotes?: string;     // Notes from review or return for correction ⭐
  completedAt?: string;
  completedById?: string;
  completedByName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Payment Record ⭐
export type PaymentStatus = 'Active' | 'Cancelled';

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: string; // Cash, Bank Transfer, Check, Maya, GCash
  referenceNumber?: string; // Bank Ref #, Check #, Transaction ID
  officialReceiptNumber?: string;
  collectionReceiptNumber?: string;
  notes?: string;
  receivedById?: string;
  receivedByName?: string;
  status: PaymentStatus; // Active | Cancelled
  cancelledAt?: string;
  cancelledById?: string;
  cancelledByName?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Billing & Collection
export interface InvoiceServiceLine {
  id?: string;
  clientServiceId?: string; // Link to ClientService entity ⭐
  serviceCode?: string;
  serviceCategory?: ServiceCategory;
  description: string;
  monthYear?: string;
  unitPrice?: number;
  quantity?: number;
  discount?: number;
  amount: number; // Final line amount snapshot
  paymentMethod?: 'Cash' | 'Cheque Payment to FFCSI' | 'Bank Transfer' | string;
  itemType?: 'Service' | 'One-Time' | 'Adjustment' | 'Other';
}

// Collection & AR Follow-Up Types ⭐
export type CollectionStatus = 'Current' | 'Due Soon' | 'Overdue' | 'Follow-Up Required' | 'Promise to Pay' | 'Paid' | 'Disputed';

export interface CollectionLog {
  id: string;
  invoiceId: string;
  clientId: string;
  logDate: string; // YYYY-MM-DD HH:mm
  contactPerson?: string;
  contactMethod?: 'Email' | 'Phone Call' | 'SMS' | 'In-Person' | 'Letter';
  status: CollectionStatus;
  notes: string;
  nextFollowUpDate?: string;
  loggedById?: string;
  loggedByName?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  collectionNumber?: string; // Unique Serial Collection # (replaces invoice / due date serial)
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
  services: InvoiceServiceLine[];
  payments?: Payment[]; // Payment transaction ledger ⭐
  officialReceiptNumber?: string;
  collectionReceiptNumber?: string;
  paymentDate?: string;
  paymentMethod?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  collectionStatus?: CollectionStatus; // AR Collection Status ⭐
  collectionNotes?: string;
  lastCollectionFollowUpDate?: string;
  nextFollowUpDate?: string;
  billingPeriod?: string; // e.g. "August 2026", "Q3 2026", "2026" ⭐
  autoGenerated?: boolean; // Flag for recurring auto-billing generator ⭐
  collectionLogs?: CollectionLog[]; // Collection interaction log history ⭐
  amendedHistory?: {
    date: string;
    modifiedBy: string;
    details: string;
    previousTotal?: number;
    newTotal?: number;
  }[];
}

// Confidential Core Portal Credentials
export interface CredentialAmendment {
  date: string;
  modifiedBy: string;
  fieldChanged: string;
  previousValueMasked?: string;
  newValueMasked?: string;
  details: string;
}

export interface CoreCredential {
  id: string;
  clientId: string;
  clientName: string;
  portalType: 'eFPS' | 'Bank' | 'HDMF' | 'PHIC' | 'SSS' | 'BIR' | 'Other';
  portalName?: string; // e.g. Landbank iAccess, BDO Online, eFPS BIR
  username: string;
  password: string;
  pinCode?: string;
  securityQuestions?: string;
  governmentIdNumber?: string; // SSS, PHIC, or Pag-IBIG number
  tinNumber?: string; // 000-000-000-000
  notes?: string;
  updatedBy: string;
  updatedAt: string;
  amendedHistory?: CredentialAmendment[];
}

// System Audit Logs
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

// Master choices state
export interface MasterChoices {
  businessNatures: string[];
  birTaxOptions: CustomDeadlineRule[];
  benefitsOptions: CustomDeadlineRule[];
  banksList: string[];
  formLinkages?: FormLinkage[];
  savedCustomServices?: { description: string; defaultAmount?: number }[];
}

// Customizable Billing & SOA Template Configuration
export type TemplateSectionKey = 
  | 'header' 
  | 'clientInfo' 
  | 'servicesTable' 
  | 'totals' 
  | 'remittance' 
  | 'signatory' 
  | 'footnote'
  | 'customText'
  | 'customNote';

export type PaperSize = 'a4' | 'letter' | 'legal' | 'a5' | 'statement';
export type PaperOrientation = 'portrait' | 'landscape';

export interface CustomBlockItem {
  id: string;
  type: 'heading' | 'paragraph' | 'keyvalue' | 'divider' | 'signature';
  title: string;
  content: string; // supports tokens like {clientName}, {totalAmount}, {invoiceNumber}, etc.
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface BillingTemplateConfig {
  templateName?: string;
  isScratchTemplate?: boolean;
  paperSize: PaperSize;
  orientation: PaperOrientation;
  marginMm: number;
  
  firmName: string;
  firmSubtitle: string;
  firmAddress: string;
  firmTIN: string;
  accentColor: string; // e.g., '#047857' (emerald), '#0f172a' (slate), '#1d4ed8' (blue), '#7c2d12' (amber)
  logoUrl?: string;
  showLogo: boolean;
  showRemittanceBox: boolean;
  remittanceText: string;
  bankAccountDetails: string;
  showSignatory: boolean;
  signatoryName: string;
  signatoryTitle: string;
  showFootnote: boolean;
  footnoteText: string;
  showVatBreakdown: boolean;
  sectionOrder: TemplateSectionKey[];
  
  // Custom user-created scratch blocks
  customBlocks: CustomBlockItem[];

  // Positioning and spacing offsets in mm
  headerPosY: number;
  clientInfoPosY: number;
  tablePosY: number;
  headerFontSize: number;
  fontFamily: 'helvetica' | 'times' | 'courier';
}

// ==========================================
// INTERNAL FIRM PAYROLL, LEAVE & VALE TYPES ⭐
// ==========================================

export interface CompanyEmployee {
  id: string;
  employeeNo: string; // e.g. "EMP-001"
  fullName: string;
  position: string;
  department: string; // e.g., 'Accounting', 'Tax & Audit', 'Billing', 'Admin & HR'
  dateHired: string; // YYYY-MM-DD
  employmentType: 'Regular' | 'Probationary' | 'Contractual' | 'Part-time';
  monthlyBasicSalary: number;
  dailyRate: number; // Defaults to monthlyBasicSalary / 21.75
  hourlyRate: number; // Defaults to dailyRate / 8
  
  // Statutory Numbers & Account details
  tinNumber: string;
  sssNumber: string;
  philhealthNumber: string;
  pagibigNumber: string;
  bankName: string; // e.g., "BDO", "GCash", "Maya", "BPI"
  accountNumber: string;
  
  status: 'Active' | 'On Leave' | 'Resigned' | 'Terminated';
  
  // Leave Balances (Days)
  silBalance: number; // Service Incentive Leave (DOLE statutory 5 days)
  vlBalance: number;  // Vacation Leave
  slBalance: number;  // Sick Leave
  
  // Vale (Cash Advance) Tracker
  currentValeBalance: number;
  defaultValeDeduction: number; // Installment per cutoff
}

export type LeaveType = 
  | 'Service Incentive Leave (SIL)' 
  | 'Vacation Leave' 
  | 'Sick Leave' 
  | 'Emergency Leave' 
  | 'Maternity Leave' 
  | 'Paternity Leave' 
  | 'Unpaid Leave';

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  isPaid: boolean;
  createdAt: string;
}

export interface ValeRepayment {
  id: string;
  date: string;
  amountPaid: number;
  payrollRunId?: string;
  payrollCutoffLabel?: string;
  remarks: string;
}

export interface ValeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  amountGiven: number;
  dateGiven: string;
  purpose: string;
  cutoffDeductionAmount: number;
  remainingBalance: number;
  status: 'Active' | 'Fully Paid' | 'Cancelled';
  repayments: ValeRepayment[];
  createdAt: string;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  position: string;
  monthlyBasic: number;
  semiMonthlyBasic: number;
  
  // Attendance & Timekeeping
  daysWorked: number;
  daysAbsent: number;
  absencesDeduction: number;
  
  tardinessMinutes: number;
  tardinessDeduction: number;
  undertimeMinutes: number;
  undertimeDeduction: number;
  
  // DOLE Overtime Computations
  otRegularHours: number; // 125% rate
  otRegularPay: number;
  otRestDayHours: number; // 130% rate
  otRestDayPay: number;
  otHolidayHours: number; // 200% rate
  otHolidayPay: number;
  nightDiffHours: number; // +10% rate
  nightDiffPay: number;
  
  otherAllowances: number;
  grossPay: number;
  
  // Statutory Deductions (Philippine Standard Tables)
  sssEE: number;
  sssER: number;
  philHealthEE: number;
  philHealthER: number;
  pagIbigEE: number;
  pagIbigER: number;
  birWithholdingTax: number;
  
  // Vale / Cash Advance Deduction
  valeDeduction: number;
  otherDeductions: number;
  
  totalDeductions: number;
  netPay: number;
  remarks?: string;
}

export interface PayrollRun {
  id: string;
  cutoffPeriod: string; // e.g. "August 1-15, 2026"
  periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  payDate: string;
  status: 'Draft' | 'Approved' | 'Paid';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  items: PayrollItem[];
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
}

// ==========================================
// COMPANY OPERATING EXPENSES & BILLS TYPES ⭐
// ==========================================

export type CompanyExpenseCategory = 
  | 'Electricity'
  | 'Water'
  | 'Internet'
  | 'Phone & Mobile'
  | 'Credit Card'
  | 'Office Rent'
  | 'Software & Subscriptions'
  | 'Taxes & Permits'
  | 'Office Supplies & Maintenance'
  | 'Custom'
  | string;

export interface CompanyExpense {
  id: string;
  title: string; // e.g. "Meralco Office Electricity", "PLDT Fiber Internet", "BDO Corporate Card"
  category: CompanyExpenseCategory;
  vendorProvider: string; // e.g., "Meralco", "PLDT", "Maynilad", "Globe", "BDO"
  accountNumber?: string;
  amountType: 'Fixed Monthly' | 'Manual Statement';
  amount: number;
  dueDateType: 'Fixed Monthly Day' | 'Manual Specific Date';
  fixedDueDay?: number; // e.g. 15 for 15th of month
  dueDate: string; // YYYY-MM-DD
  monthYear: string; // e.g., "August 2026"
  
  status: 'Unpaid' | 'Pending' | 'Paid' | 'Overdue';
  
  paidDetails?: {
    paidDate: string;
    paidAmount?: number;
    paymentMethod: string;
    referenceNo?: string;
    receiptNotes?: string;
  };
  
  notes?: string;
  createdAt: string;
}

