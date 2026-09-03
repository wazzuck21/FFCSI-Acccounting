export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMINISTRATOR' 
  | 'SENIOR_ACCOUNTANT' 
  | 'ACCOUNTANT' 
  | 'STAFF' 
  | 'BILLING_STAFF' 
  | 'BILLING' 
  | 'ACCOUNTING' 
  | 'BENEFITS';

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
  credentials?: boolean;
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  passwordHash?: string;
  salt?: string;
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

export type ObligationType = 'PAYMENT' | 'FILING' | 'ONLINE_SUBMISSION' | 'FILING_AND_PAYMENT';

// Filing-Only vs Payable Compliance Architecture Types ⭐
export type PaymentBehavior = 'ALWAYS_PAYABLE' | 'CONDITIONAL_PAYABLE' | 'NEVER_PAYABLE';
export type FilingRequired = 'YES' | 'NO' | 'CONDITIONAL';
export type SubmissionMethod = 'ONLINE' | 'MANUAL' | 'EAFS' | 'OTHER';
export type ComplianceCategory = 
  | 'TAX_RETURN' 
  | 'INFORMATIONAL' 
  | 'WITHHOLDING' 
  | 'VAT' 
  | 'BENEFITS' 
  | 'RELIEF_ATTACHMENT' 
  | 'OTHER';

export interface CustomDeadlineRule {
  id: string;
  code: string; // e.g., '0619E', 'SSS_CONTRIB', 'SAWT', 'QAP'
  name: string; // e.g., 'Withholding Tax - Monthly Remittance (0619E)'
  category: 'BIR' | 'Benefits' | 'DTI' | 'SEC' | 'Other';
  frequency: 'Monthly' | 'Quarterly' | 'Annually' | 'Custom';
  deadlineDay: number; // e.g. 10th day
  fixedMonthDay?: string; // e.g. "04-15" (April 15)
  specificDate?: string; // e.g. "2026-08-15"
  customDescription: string; // e.g. "Every 10th of the following month"
  monthlySchedule2026?: MonthlyDeadlineSchedule[];
  
  // Obligation Type & Compliance Behavior Architecture ⭐
  obligationType?: ObligationType;
  paymentBehavior?: PaymentBehavior;
  filingRequired?: FilingRequired;
  submissionMethod?: SubmissionMethod;
  complianceCategory?: ComplianceCategory;
  active?: boolean;

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
  assignedStaffId?: string;
  assignedStaffName?: string;
  birAssignedStaffIds?: string[];
  birAssignedStaffNames?: string[];
  benefitsAssignedStaffIds?: string[];
  benefitsAssignedStaffNames?: string[];
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
  notes?: string;
  remarks?: string;
  comment?: string;
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
export type ComplianceItemStatus = 
  | 'Pending' 
  | 'In Preparation' 
  | 'Ready for Submission' 
  | 'Submitted' 
  | 'Accepted' 
  | 'Rejected' 
  | 'For Payment' 
  | 'Due Today' 
  | 'Overdue' 
  | 'Already Paid' 
  | 'Waived';

export interface ComplianceItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  formCode?: string;
  category: 'BIR' | 'Benefits' | 'DTI' | 'SEC' | 'Other';
  dueDate: string; // YYYY-MM-DD
  status: ComplianceItemStatus;
  description?: string;
  assignedStaffName?: string;
  amountDue?: number;
  paidDate?: string;
  
  // Filing-Only & Submission Information ⭐
  paymentBehavior?: PaymentBehavior;
  complianceCategory?: ComplianceCategory;
  filingRequired?: FilingRequired;
  submissionMethod?: SubmissionMethod;
  submittedBy?: string;
  submissionDate?: string; // YYYY-MM-DD
  referenceNumber?: string;
  confirmationNumber?: string;
  remarks?: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

// Document Management
export type DocumentCategory = 
  | 'BIR' 
  | 'SEC' 
  | 'Business Permits' 
  | 'Financial Statements' 
  | 'Contracts' 
  | 'Government Forms' 
  | 'Payroll' 
  | 'Billing & Collections' 
  | 'Other';

export type DocumentStatus = 'Active' | 'Archived' | 'Superseded' | 'Pending Review';

export interface DocumentVersion {
  versionNumber: number | string;
  fileName: string;
  fileSize: string;
  fileType?: string;
  uploadedBy: string;
  uploadedById?: string;
  uploadedAt: string;
  changeReason?: string;
  dataUrl?: string;
  downloadUrl?: string;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  clientId: string;
  clientName: string;
  clientServiceId?: string; // Optional link to ClientService
  taskId?: string;          // Optional link to TaskItem / Compliance task
  invoiceId?: string;       // Optional link to InvoiceItem
  paymentId?: string;       // Optional link to Payment
  documentType?: string;    // e.g., 'BIR Return', 'Tax Payment Confirmation', 'SSS/PhilHealth/HDMF', etc.
  category: DocumentCategory;
  title: string;
  fileName: string;
  fileType: 'PDF' | 'Excel' | 'Word' | 'Image' | 'ZIP' | string;
  fileSize: string;
  documentDate?: string;    // YYYY-MM-DD
  taxablePeriod?: string;   // e.g. "August 2026", "3Q-2026", "TY-2025"
  uploadDate: string;       // YYYY-MM-DD
  uploadedAt?: string;      // ISO string or full timestamp
  uploadedBy: string;
  uploadedById?: string;
  expirationDate?: string;
  version: string | number; // e.g., "1.0" or 1
  status?: DocumentStatus;  // Active | Archived | Superseded | Pending Review
  notes?: string;
  tags?: string[];
  downloadUrl?: string;
  dataUrl?: string;         // local offline preview mock / base64
  versionHistory?: DocumentVersion[];
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
  coveredMonths?: string[]; // e.g. ["July 2026", "August 2026", "September 2026"] ⭐
  divideToMonths?: boolean; // Whether the payable is divided equally across the covered months (true) or billed as a single lump-sum / per-month full payable (false) ⭐
  monthlyRate?: number; // e.g. 1000 per month ⭐
  monthlyBreakdown?: Record<string, number>; // e.g. { "Jan": 1000, "Feb": 2000, "Mar": 4000 } ⭐
  unitPrice?: number;
  quantity?: number;
  discount?: number;
  amount: number; // Final line amount snapshot
  paymentMethod?: 'Cash' | 'Cheque Payment to FFCSI' | 'Bank Transfer' | string;
  paymentMode?: 'Cash' | 'Cheque';
  chequeNumber?: string;
  chequePayee?: string;
  isPaid?: boolean;
  itemType?: 'Service' | 'One-Time' | 'Adjustment' | 'Other';
  isNote?: boolean;
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
  status: 'Draft' | 'For Collection' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
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
  billingNotes?: string; // e.g. "Kindly Pay To FFCSI" under item/service description & month/year ⭐
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
  password?: string;
  passwordPbkdf2Hash?: string;
  pinPbkdf2Hash?: string;
  isPbkdf2Hashed?: boolean;
  encryptedPassword?: string;
  encryptedPin?: string;
  iv?: string;
  salt?: string;
  isEncrypted?: boolean;
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
  resourceType?: string; // e.g., 'Client', 'Invoice', 'Payment', 'Credential', 'Document', 'User'
  resourceId?: string;
  clientId?: string;
  reason?: string;
  before?: any;
  after?: any;
  ipAddress?: string;
}

// Holiday & Working Day Rules ⭐
export interface HolidayItem {
  id: string;
  date: string; // YYYY-MM-DD
  name: string; // e.g. "Araw ng Kagitingan", "Maundy Thursday", "Custom Declared Holiday"
  type: 'Regular' | 'Special Non-Working' | 'Special Working' | 'Custom';
  scope: 'Nationwide' | 'Regional';
  rdoCode?: string; // Optional regional RDO applicability, e.g. '038'
  year: number; // e.g. 2026
}

// Deadline Extension & Override Rules ⭐
export interface DeadlineExtensionRule {
  id: string;
  title: string; // e.g. "BIR RMC No. 15-2026 - RDO 038 Deadline Extension"
  scope?: 'All Clients' | 'RDO' | 'Client' | 'Form';
  
  // Dynamic Statutory Type ⭐
  statutoryType?: 'BIR' | 'BENEFITS';
  category?: 'BIR' | 'Benefits' | 'All';

  // Dynamic Multi-RDO Selection ⭐
  targetRdoCodes?: string[]; // e.g. ['038', '039']
  targetRdos?: string[]; // alias
  targetRdo?: string; // scalar backward compatibility

  // Dynamic Multi-Client Selection
  targetClientId?: string; // e.g. "client_1"
  targetClientIds?: string[];
  targetClientName?: string;

  // Dynamic Multi-Form / Benefit Selection ⭐
  applicableFormCodes?: string[]; // e.g. ['0619E', '1601C', '2550Q']
  targetFormCodes?: string[]; // alias
  targetFormCode?: string; // scalar backward compatibility

  // Target Period ⭐
  targetMonth?: string; // normalized "YYYY-MM", e.g. "2026-08"
  applicableYear?: number; // e.g. 2026
  applicableMonth?: string; // e.g. "Aug" or "ALL"
  applicablePeriod?: string; // e.g. "1Q - 2026" or "Aug-26"

  // Dates
  originalDeadlineDate?: string; // YYYY-MM-DD (optional)
  extendedDeadlineDate: string; // YYYY-MM-DD (canonical)
  extendedDueDate?: string; // alias

  reason: string; // e.g. "BIR Memorandum Circular No. 12-2026 or Power Outage"
  status: 'Active' | 'Expired' | 'Cancelled' | 'ACTIVE' | 'CANCELLED';
  
  // Audit Trail Metadata ⭐
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Weekend & Working Day Adjustment Configuration ⭐
export interface WeekendAdjustmentConfig {
  enabled: boolean;
  rule: 'NEXT_WORKING_DAY' | 'PREVIOUS_WORKING_DAY' | 'NO_ADJUSTMENT';
  adjustForHolidays: boolean;
}

// Centralized Calculated Client Deadline Entity ⭐
export interface CalculatedClientDeadline {
  id: string; // Stable canonical key: `${clientId}_${formCode}_${periodYear}_${periodMonth}`
  clientId: string;
  clientName: string;
  tinNumber: string;
  rdoNumber: string;
  registrationMethod: 'Manual' | 'eFPS';
  entityType: string;
  formCode: string;
  formName: string;
  category: 'BIR' | 'Benefits' | 'DTI' | 'SEC' | 'Other';
  frequency: string;
  taxablePeriod: string; // e.g., "1Q - 2026", "Jul-26", "TY-2025"
  periodMonth: string; // e.g. "Jan", "Feb", ...
  periodYear: number;
  
  // Deadlines
  defaultDeadline: string; // YYYY-MM-DD (raw standard from master table / eFPS default)
  overrideDeadline?: string; // YYYY-MM-DD (if RDO / Client / Form extension applied)
  adjustedDeadline: string; // YYYY-MM-DD (after holiday and weekend adjustments)
  finalDeadline: string; // YYYY-MM-DD (the single source of truth date)
  
  // Metadata & Sources
  deadlineSource: string; // e.g. 'Standard Rule', 'eFPS Staggered Filing', 'RDO 038 Extension (RMC 12-2026)', 'Client Extension', etc.
  appliedExtensionId?: string;
  appliedExtensionTitle?: string;
  appliedRuleId?: string;
  holidayAdjustment: boolean;
  weekendAdjustment: boolean;
  wasShifted: boolean;
  shiftReason?: string;
  isNotRequired?: boolean;
  
  // Assigned staff
  assignedStaffId?: string;
  assignedStaffName?: string;
  
  // Client branch details
  isBranch?: boolean;
  branchCode?: string;
  parentClientName?: string;
  baseTin?: string;
}

// Master Biller & Catalog Data Types ⭐
export type BillerCategory = 
  | 'BIR Tax Return' 
  | 'Statutory Benefits / Loans' 
  | 'Retainer Fee' 
  | 'Service Charges' 
  | 'Special Engagements' 
  | 'Adjustments';

export type BillerPaymentType = 'Recurring' | 'One-Time';
export type BillerRecurringFrequency = 'Monthly' | 'Quarterly' | 'Semi-Annually' | 'Annually';

export interface BillerMasterItem {
  id: string;
  code: string; // e.g., '0619E', '2550Q', 'SSS_CONT', 'SSS_LOAN', 'RET_FEE', 'SRV_CHG'
  name: string; // Official form title or remittance name
  shortName?: string; // Form Code / Short Name e.g., '0619E', '2550Q', 'SSS Cont.', 'SSS Loan'
  category: BillerCategory;
  paymentType: BillerPaymentType; // 'Recurring' | 'One-Time'
  frequency?: BillerRecurringFrequency; // 'Monthly' | 'Quarterly' | 'Semi-Annually' | 'Annually'
  defaultAmount: number; // Standard / suggested default amount in PHP
  description?: string;
  sourceRuleCode?: string; // Links to BIR / Benefits rule code if generated from compliance
  active: boolean;
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Master choices state
export interface MasterChoices {
  businessNatures: string[];
  birTaxOptions: CustomDeadlineRule[];
  benefitsOptions: CustomDeadlineRule[];
  banksList: string[];
  formLinkages?: FormLinkage[];
  savedCustomServices?: { description: string; defaultAmount?: number }[];
  billerCatalog?: BillerMasterItem[];
  holidays?: HolidayItem[];
  deadlineExtensions?: DeadlineExtensionRule[];
  weekendConfig?: WeekendAdjustmentConfig;
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

export type EmploymentType = 
  | 'Regular' 
  | 'Probationary' 
  | 'Contractual' 
  | 'Part-time' 
  | 'OJT / Intern' 
  | 'Temp / Daily Paid';

export type SalaryBasis = 
  | 'Monthly Fixed' 
  | 'Daily (No Work, No Pay)' 
  | 'OJT / Daily Allowance';

export interface CompanyEmployee {
  id: string;
  employeeNo: string; // e.g. "EMP-001"
  fullName: string;
  position: string;
  department: string; // e.g., 'Accounting', 'Tax & Audit', 'Billing', 'Admin & HR'
  dateHired: string; // YYYY-MM-DD
  employmentType: EmploymentType;
  
  // Salary & Pay Structure
  salaryBasis?: SalaryBasis; // Defaults to 'Monthly Fixed' or 'Daily (No Work, No Pay)'
  monthlyBasicSalary: number;
  dailyRate: number; // Defaults to monthlyBasicSalary / 22 or direct daily rate
  hourlyRate: number; // Defaults to dailyRate / 8
  
  // OJT / Intern & Temp Employee (No Work, No Pay) Setup ⭐
  isNoWorkNoPay?: boolean; // When true, pay is computed strictly as Days Worked * Daily Rate
  exemptFromStatutory?: boolean; // When true (e.g. OJT Trainee Stipend under DOLE/CHED rules), no SSS/PHIC/HDMF/Tax deduction
  schoolOrUniversity?: string; // e.g. "UST - AMV College of Accountancy", "PUP", "DLSU"
  internshipRequiredHours?: number; // e.g. 400 hours
  internshipRenderedHours?: number; // e.g. 180 hours
  supervisorMentor?: string; // e.g. "Maria Teresa Santos (Managing Partner)"
  contractEndDate?: string; // YYYY-MM-DD for temporary or internship completion
  dailyAllowance?: number; // Optional meal / transportation allowance per day
  
  // Statutory Numbers & Account details
  tinNumber: string;
  sssNumber: string;
  philhealthNumber: string;
  pagibigNumber: string;
  bankName: string; // e.g., "BDO", "GCash", "Maya", "BPI"
  accountNumber: string;
  
  status: 'Active' | 'On Leave' | 'Resigned' | 'Terminated' | 'Completed';
  
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

export type AdvanceType = 'Cash Advance' | 'Vale';
export type RepaymentMode = 'Full Next Cutoff' | 'Installment';

export interface ValeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  advanceType?: AdvanceType; // 'Cash Advance' = Pay full next cutoff | 'Vale' = Monthly/Semi-monthly Cutoff Deduction
  repaymentMode?: RepaymentMode; // 'Full Next Cutoff' | 'Installment'
  amountGiven: number;
  dateGiven: string;
  purpose: string;
  cutoffDeductionAmount: number;
  remainingBalance: number;
  status: 'Active' | 'Fully Paid' | 'Cancelled';
  repayments: ValeRepayment[];
  approvedBy?: string;
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

// Attendance & DTR Report Record (Matches FFCSI Company Attendance Format) ⭐
export interface DailyAttendanceRecord {
  id?: string;
  dateStr: string; // e.g. "2026-08-16"
  dayNum: number; // e.g. 16
  dayOfWeek: string; // e.g. "Th", "Fr", "Sa", "Su", "Mo", "Tu", "We"
  ddWwLabel: string; // e.g. "16 Th", "17 Fr", "18 Sa"
  isRestDay: boolean; // Saturday / Sunday
  isHoliday?: boolean;
  holidayType?: 'None' | 'Regular' | 'Special';
  holidayName?: string;
  
  // Attendance List Columns
  amIn: string; // e.g. "08:26"
  amOut: string; // e.g. "12:00"
  pmIn: string; // e.g. "13:00"
  pmOut: string; // e.g. "17:31"
  otHours: number; // Overtime hours
  
  // Auto Computed Columns
  lateMinutes: number; // Computed with 8:45 AM allowance (0 late if <= 8:45 AM)
  absent: number; // 0 or 1 day
  earlyOutMinutes: number; // Undertime if PM Out < 17:30
  holidayPay: number; // Computed Holiday Compensation (₱)
  nightDiffHours: number; // Night Differential hours (10 PM - 6 AM)
  nightDiffPay: number; // Night Differential Pay (₱)
  
  remarks?: string;
}

export interface CutoffAttendanceReport {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  position: string;
  monthlyBasicSalary: number;
  dailyRate: number;
  hourlyRate: number;
  cutoffPeriod: string; // e.g. "August 16-31, 2026"
  periodType: '1st Half (1-15)' | '2nd Half (16-30/31)' | 'Monthly';
  year: number;
  month: number;
  
  records: DailyAttendanceRecord[];
  
  // Summary Aggregations
  totalDaysWorked: number;
  totalDaysAbsent: number;
  totalLateMinutes: number;
  totalEarlyOutMinutes: number;
  totalOtHours: number;
  totalHolidayHours: number;
  totalHolidayPay: number;
  totalNightDiffHours: number;
  totalNightDiffPay: number;
  
  updatedAt: string;
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
  templateId?: string; // Links monthly instance to base recurring template
  title: string; // e.g. "Meralco Office Electricity", "PLDT Fiber Internet", "BDO Corporate Card"
  category: CompanyExpenseCategory;
  vendorProvider: string; // e.g., "Meralco", "PLDT", "Maynilad", "Globe", "BDO"
  accountNumber?: string;
  amountType: 'Fixed Monthly' | 'Manual Statement';
  amount: number;
  dueDateType: 'Fixed Monthly Day' | 'Manual Specific Date' | 'Date to input in Future';
  fixedDueDay?: number; // e.g. 15 for 15th of month
  dueDate: string; // YYYY-MM-DD
  monthYear: string; // e.g., "August 2026"
  isRecurring?: boolean;
  
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

// ==========================================
// DATA INTEGRITY, SYNC & BACKUP TYPES ⭐ (PHASE 9)
// ==========================================

export interface DataConflict {
  id: string;
  entityType: 'Invoice' | 'Payment' | 'Payroll' | 'Compliance' | 'ClientService' | 'AuditLog' | 'Client';
  entityId: string;
  title: string;
  description: string;
  localData: any;
  incomingData: any;
  timestamp: string;
  status: 'REVIEW_REQUIRED' | 'RESOLVED';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionChoice?: 'KEEP_LOCAL' | 'APPLY_INCOMING' | 'MERGE';
}

export interface IntegrityIssue {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'ORPHANED_REFERENCE' | 'DUPLICATE_RECORD' | 'BALANCE_MISMATCH' | 'INVALID_RELATION';
  title: string;
  description: string;
  affectedEntityType: string;
  affectedEntityId: string;
  canAutoFix: boolean;
  fixActionName?: string;
}

export interface DataHealthReport {
  score: number; // 0 - 100%
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  scanTimestamp: string;
  totalEntitiesCount: number;
  issues: IntegrityIssue[];
}

export interface BackupMetadata {
  version: string;
  timestamp: string;
  backupType: 'FULL' | 'INCREMENTAL';
  checksum: string;
  createdByName: string;
  createdById: string;
  entityCounts: Record<string, number>;
}

export interface FullDatabaseBackup {
  metadata: BackupMetadata;
  appData: {
    clients: any[];
    clientServices: any[];
    dynamicSections: any[];
    payables: any[];
    complianceItems: any[];
    tasks: any[];
    invoices: any[];
    documents: any[];
    credentials: any[];
    auditLogs: any[];
    masterChoices: any;
    employees: any[];
    leaveRecords: any[];
    valeRecords: any[];
    payrollRuns: any[];
    companyExpenses: any[];
    payments: any[];
    collectionLogs: any[];
    usedCrNumbers: string[];
  };
}

export interface AutoBackupSchedule {
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'LOGOUT';
  lastBackupTimestamp?: string;
  lastBackupStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  autoDownloadLocal?: boolean;
}

