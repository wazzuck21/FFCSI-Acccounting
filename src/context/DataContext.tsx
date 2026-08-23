import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  ClientProfile, 
  DynamicSection, 
  PayableRecord, 
  ComplianceItem, 
  TaskItem, 
  InvoiceItem, 
  DocumentItem, 
  AuditLog, 
  CustomDeadlineRule,
  MasterChoices,
  FormLinkage,
  CoreCredential,
  CompanyEmployee,
  LeaveRecord,
  ValeRecord,
  PayrollRun,
  CompanyExpense,
  ClientService,
  Payment,
  CollectionLog,
  CollectionStatus,
  ServiceBillingFrequency,
  InvoiceServiceLine,
  DataConflict,
  DataHealthReport,
  AutoBackupSchedule,
  FullDatabaseBackup,
  HolidayItem,
  DeadlineExtensionRule,
  WeekendAdjustmentConfig,
  CalculatedClientDeadline,
  BillerMasterItem,
  BillerCategory,
  BillerPaymentType
} from '../types';
import { 
  INITIAL_CLIENTS, 
  INITIAL_DYNAMIC_SECTIONS, 
  INITIAL_PAYABLES, 
  INITIAL_COMPLIANCE, 
  INITIAL_TASKS, 
  INITIAL_INVOICES, 
  INITIAL_DOCUMENTS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_CREDENTIALS,
  INITIAL_EMPLOYEES,
  INITIAL_LEAVE_RECORDS,
  INITIAL_VALE_RECORDS,
  INITIAL_PAYROLL_RUNS,
  INITIAL_COMPANY_EXPENSES,
  INITIAL_CLIENT_SERVICES
} from '../data/seedData';
import { 
  DEFAULT_BANKS, 
  DEFAULT_BUSINESS_NATURES, 
  DEFAULT_BIR_TAX_OPTIONS, 
  DEFAULT_BENEFITS_OPTIONS,
  DEFAULT_BILLER_CATALOG,
  MONTHS_LIST,
  MONTH_FULL_NAMES,
  getRuleDeadlineForMonth
} from '../data/masterTables';
import { 
  DEFAULT_HOLIDAYS,
  DEFAULT_DEADLINE_EXTENSIONS,
  DEFAULT_WEEKEND_CONFIG,
  calculateClientDeadline,
  calculateAllClientDeadlinesForMonth
} from '../utils/deadlineEngine';
import { saveLocalData, getLocalData } from '../lib/idbStorage';
import { 
  initMultiTabSync, 
  notifyTabStateChange, 
  notifyTabConflict, 
  reserveNextInvoiceNumber, 
  reserveNextCRNumber 
} from '../lib/syncEngine';
import { runDataHealthCheck, autoRepairState, FullAppState } from '../lib/dataIntegrity';
import { generateFullDatabaseBackup, verifyBackupFile } from '../lib/backupRestoreEngine';

interface DataContextType {
  clients: ClientProfile[];
  dynamicSections: DynamicSection[];
  payables: PayableRecord[];
  complianceItems: ComplianceItem[];
  tasks: TaskItem[];
  invoices: InvoiceItem[];
  documents: DocumentItem[];
  credentials: CoreCredential[];
  auditLogs: AuditLog[];
  masterChoices: MasterChoices;
  syncStatus: 'Online' | 'Offline' | 'Syncing';
  
  // Internal Firm Payroll, HR, Leave & Vale ⭐
  employees: CompanyEmployee[];
  leaveRecords: LeaveRecord[];
  valeRecords: ValeRecord[];
  payrollRuns: PayrollRun[];
  
  // Company Operating Expenses ⭐
  companyExpenses: CompanyExpense[];

  // Client Services & Engagement Entity ⭐
  clientServices: ClientService[];
  addClientService: (service: Omit<ClientService, 'id' | 'createdAt' | 'updatedAt'>, userId?: string, userName?: string) => { success: boolean; message: string; service?: ClientService };
  updateClientService: (id: string, updates: Partial<ClientService>, userId?: string, userName?: string) => { success: boolean; message: string };
  suspendClientService: (id: string, reason?: string, userId?: string, userName?: string) => { success: boolean; message: string };
  endClientService: (id: string, endDate?: string, reason?: string, userId?: string, userName?: string) => { success: boolean; message: string };
  restoreClientService: (id: string, userId?: string, userName?: string) => { success: boolean; message: string };
  getClientServices: (clientId: string) => ClientService[];

  // Actions
  addClient: (client: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>) => ClientProfile;
  updateClient: (id: string, updates: Partial<ClientProfile>) => void;
  deleteClient: (id: string, reason?: string, archivedBy?: string) => void;
  archiveClient: (id: string, reason?: string, archivedBy?: string) => void;
  restoreClient: (id: string) => void;
  
  addDynamicSection: (section: Omit<DynamicSection, 'id' | 'createdAt'>) => DynamicSection;
  updateDynamicSection: (id: string, section: DynamicSection) => void;
  deleteDynamicSection: (id: string) => void;
  
  addPayable: (payable: Omit<PayableRecord, 'id' | 'createdAt'>) => PayableRecord;
  tagPayablePaid: (payableId: string, paymentInfo: NonNullable<PayableRecord['paymentDetails']>) => { success: boolean; message: string };
  amendPayablePayment: (payableId: string, updatedPayment: NonNullable<PayableRecord['paymentDetails']>, details: string, modifiedBy: string) => void;
  cancelPayablePayment: (payableId: string, reason: string, cancelledBy: string) => void;
  deletePayable: (payableId: string) => void;
  resetPayableAssessment: (clientId: string, formCode: string, periodStr?: string) => void;

  addComplianceItem: (item: Omit<ComplianceItem, 'id'>) => void;
  updateComplianceStatus: (id: string, status: ComplianceItem['status']) => void;
  
  addTask: (task: Omit<TaskItem, 'id'>) => void;
  updateTaskStatus: (id: string, status: TaskItem['status']) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>, userId?: string, userName?: string) => void;
  submitTaskForReview: (taskId: string, preparerNotes?: string, userId?: string, userName?: string) => { success: boolean; message: string };
  approveTask: (taskId: string, reviewNotes?: string, userId?: string, userName?: string) => { success: boolean; message: string };
  returnTaskForCorrection: (taskId: string, reviewNotes: string, userId?: string, userName?: string) => { success: boolean; message: string };
  overrideTaskDeadline: (taskId: string, newDueDate: string, reason: string, userId?: string, userName?: string) => { success: boolean; message: string };
  reassignTask: (taskId: string, newStaffId: string, newStaffName: string, userId?: string, userName?: string) => { success: boolean; message: string };
  deleteTask: (taskId: string, userId?: string, userName?: string) => void;
  generateRecurringComplianceTasks: (periodMonth: string, periodYear: number, userId?: string, userName?: string) => { success: boolean; createdCount: number; skippedCount: number; message: string };
  
  addInvoice: (invoice: Omit<InvoiceItem, 'id' | 'invoiceNumber'>) => InvoiceItem;
  updateInvoice: (invoiceId: string, updates: Partial<InvoiceItem>, modificationDetails?: string, modifiedBy?: string) => void;
  recordInvoicePayment: (invoiceId: string, paymentDetails: { amount: number; paymentDate: string; paymentMethod: string; referenceNumber?: string; officialReceiptNumber?: string; collectionReceiptNumber?: string; notes?: string; updatedServices?: InvoiceItem['services'] }, userId?: string, userName?: string) => { success: boolean; message: string };
  editInvoicePayment: (invoiceId: string, paymentDetails: { amount: number; paymentDate: string; paymentMethod: string; referenceNumber?: string; officialReceiptNumber?: string; collectionReceiptNumber?: string; notes?: string; updatedServices?: InvoiceItem['services']; amendedHistory?: InvoiceItem['amendedHistory'] }, userId?: string, userName?: string) => { success: boolean; message: string };
  cancelInvoicePayment: (paymentId: string, reason: string, userId?: string, userName?: string) => { success: boolean; message: string };
  getInvoicePayments: (invoiceId: string) => Payment[];
  getInvoiceBalance: (invoiceId: string) => number;
  payments: Payment[];
  collectionLogs: CollectionLog[];
  addCollectionLog: (invoiceId: string, logData: { contactPerson?: string; contactMethod?: CollectionLog['contactMethod']; status: CollectionStatus; notes: string; nextFollowUpDate?: string }, userId?: string, userName?: string) => { success: boolean; message: string };
  generateRecurringInvoices: (period: string, frequency: ServiceBillingFrequency | 'All', issueDate: string, dueDate: string, userId?: string, userName?: string) => { success: boolean; createdCount: number; skippedCount: number; createdInvoices: InvoiceItem[]; skippedDetails: string[]; message: string };
  getNextCrNumber: () => string;
  isCrNumberUsed: (crNum: string) => boolean;
  getNextCollectionNumber: () => string;
  isCollectionNumberUsed: (num: string) => boolean;
  usedCrNumbers: string[];
  updateInvoiceStatus: (invoiceId: string, status: InvoiceItem['status']) => void;
  deleteInvoice: (invoiceId: string) => void;

  // Credentials Vault
  addCredential: (cred: Omit<CoreCredential, 'id'>) => void;
  updateCredential: (id: string, updates: Partial<CoreCredential>) => void;
  deleteCredential: (id: string) => void;

  // Saved Custom Services
  saveCustomService: (service: { description: string; defaultAmount?: number }) => void;

  // Document Management Phase 7 ⭐
  addDocument: (doc: Omit<DocumentItem, 'id' | 'uploadDate'>, userId?: string, userName?: string) => DocumentItem;
  updateDocument: (id: string, updates: Partial<DocumentItem>, userId?: string, userName?: string) => void;
  uploadDocumentVersion: (id: string, newVersionData: { fileName: string; fileSize: string; fileType?: string; dataUrl?: string; changeReason?: string; notes?: string }, userId?: string, userName?: string) => void;
  archiveDocument: (id: string, reason?: string, userId?: string, userName?: string) => void;
  restoreDocument: (id: string, userId?: string, userName?: string) => void;
  deleteDocument: (id: string, reason?: string, userId?: string, userName?: string) => void;
  logDocumentAction: (documentId: string, action: string, details: string, userId?: string, userName?: string) => void;
  
  addMasterBusinessNature: (nature: string) => void;
  deleteMasterBusinessNature: (nature: string) => void;
  addMasterBirOption: (option: CustomDeadlineRule) => void;
  updateMasterBirOption: (id: string, option: CustomDeadlineRule) => void;
  deleteMasterBirOption: (id: string) => void;
  addMasterBenefitsOption: (option: CustomDeadlineRule) => void;
  updateMasterBenefitsOption: (id: string, option: CustomDeadlineRule) => void;
  deleteMasterBenefitsOption: (id: string) => void;
  applyMasterDeadlineRuleToAllClients: (rule: CustomDeadlineRule, userId?: string, userName?: string) => void;
  addMasterBank: (bankName: string) => void;
  deleteMasterBank: (bankName: string) => void;

  // Master Biller & Catalog Data Management ⭐
  billerCatalog: BillerMasterItem[];
  addBiller: (biller: Omit<BillerMasterItem, 'id' | 'createdAt' | 'updatedAt'>) => BillerMasterItem;
  updateBiller: (id: string, updates: Partial<BillerMasterItem>) => void;
  deleteBiller: (id: string) => void;
  toggleBillerActive: (id: string) => void;
  syncBillersFromRules: () => { addedCount: number; message: string };
  
  // Linked Forms & Choices ⭐
  addFormLinkage: (primaryCode: string, linkedCodes: string[], description?: string) => void;
  updateFormLinkage: (primaryCode: string, linkedCodes: string[], description?: string) => void;
  deleteFormLinkage: (primaryCode: string) => void;

  // Holiday Master Management ⭐
  addHoliday: (holiday: Omit<HolidayItem, 'id'>) => void;
  updateHoliday: (id: string, updates: Partial<HolidayItem>) => void;
  deleteHoliday: (id: string) => void;

  // Deadline Extensions & Overrides ⭐
  addDeadlineExtension: (ext: Omit<DeadlineExtensionRule, 'id' | 'createdAt'>) => void;
  updateDeadlineExtension: (id: string, updates: Partial<DeadlineExtensionRule>) => void;
  deleteDeadlineExtension: (id: string) => void;

  // Weekend & Working Day Configuration ⭐
  updateWeekendConfig: (config: Partial<WeekendAdjustmentConfig>) => void;

  // Centralized Client Deadline Engine Accessors ⭐
  calculateClientDeadlineForPeriod: (clientId: string, complianceCode: string, month: string, year?: number) => CalculatedClientDeadline | null;
  calculateAllClientDeadlines: (month: string, year?: number, filterParams?: any) => CalculatedClientDeadline[];
  
  // Internal Employee Actions ⭐
  addEmployee: (emp: Omit<CompanyEmployee, 'id'>) => void;
  updateEmployee: (id: string, updates: Partial<CompanyEmployee>) => void;
  deleteEmployee: (id: string) => void;

  // Leave Tracker Actions ⭐
  addLeaveRecord: (leave: Omit<LeaveRecord, 'id' | 'createdAt'>) => void;
  updateLeaveStatus: (id: string, status: LeaveRecord['status'], approvedBy?: string) => void;

  // Vale (Cash Advance) Actions ⭐
  addValeRecord: (vale: Omit<ValeRecord, 'id' | 'createdAt' | 'repayments' | 'status'>) => void;
  addValeRepayment: (valeId: string, amount: number, remarks: string, payrollCutoffLabel?: string) => void;
  updateValeRecord: (id: string, updates: Partial<ValeRecord>) => void;
  deleteValeRecord: (id: string) => void;

  // Payroll Runs Actions ⭐
  addPayrollRun: (run: Omit<PayrollRun, 'id' | 'createdAt'>) => void;
  updatePayrollRunStatus: (id: string, status: PayrollRun['status'], approvedBy?: string) => void;
  deletePayrollRun: (id: string) => void;

  // Company Expenses Actions ⭐
  addCompanyExpense: (expense: Omit<CompanyExpense, 'id' | 'createdAt'>) => void;
  updateCompanyExpense: (id: string, updates: Partial<CompanyExpense>) => void;
  markExpensePaid: (id: string, paidDetails: NonNullable<CompanyExpense['paidDetails']>) => void;
  deleteCompanyExpense: (id: string) => void;
  
  addAuditLog: (action: string, details: string, userId: string, userName: string) => void;
  importBackupData: (jsonString: string) => boolean;
  exportBackupData: () => string;

  // Data Integrity, Sync & Backup Phase 9 ⭐
  getNextInvoiceNumber: () => string;
  syncConflicts: DataConflict[];
  resolveConflict: (conflictId: string, choice: 'KEEP_LOCAL' | 'APPLY_INCOMING' | 'MERGE', resolvedBy: string, resolvedByName: string) => void;
  runIntegrityScan: () => DataHealthReport;
  autoRepairIntegrity: () => { repairedCount: number; reportLog: string[] };
  autoBackupSchedule: AutoBackupSchedule;
  updateAutoBackupSchedule: (updates: Partial<AutoBackupSchedule>) => void;
  runAutoBackupNow: (createdByName: string, createdById: string) => string;
  safeRestoreDatabase: (jsonString: string, superAdminUserId: string, superAdminName: string) => { success: boolean; message: string; repairedCount?: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<ClientProfile[]>(INITIAL_CLIENTS);
  const [dynamicSections, setDynamicSections] = useState<DynamicSection[]>(INITIAL_DYNAMIC_SECTIONS);
  const [payables, setPayables] = useState<PayableRecord[]>(INITIAL_PAYABLES);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>(INITIAL_COMPLIANCE);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [invoices, setInvoices] = useState<InvoiceItem[]>(INITIAL_INVOICES);
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [credentials, setCredentials] = useState<CoreCredential[]>(INITIAL_CREDENTIALS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [usedCrNumbers, setUsedCrNumbers] = useState<string[]>(['1001', '1002']);

  // Client Services & Engagement Entity ⭐
  const [clientServices, setClientServices] = useState<ClientService[]>(INITIAL_CLIENT_SERVICES);

  // Payment Transaction Ledger ⭐
  const [payments, setPayments] = useState<Payment[]>([]);

  // AR Collection Interaction Logs ⭐
  const [collectionLogs, setCollectionLogs] = useState<CollectionLog[]>([]);

  // Internal Company Payroll, HR, Leave & Vale ⭐
  const [employees, setEmployees] = useState<CompanyEmployee[]>(INITIAL_EMPLOYEES);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>(INITIAL_LEAVE_RECORDS);
  const [valeRecords, setValeRecords] = useState<ValeRecord[]>(INITIAL_VALE_RECORDS);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(INITIAL_PAYROLL_RUNS);

  // Company Expenses ⭐
  const [companyExpenses, setCompanyExpenses] = useState<CompanyExpense[]>(INITIAL_COMPANY_EXPENSES);
  
  // Phase 9 Integrity, Sync & Backup States ⭐
  const [syncConflicts, setSyncConflicts] = useState<DataConflict[]>([]);
  const [autoBackupSchedule, setAutoBackupSchedule] = useState<AutoBackupSchedule>({
    enabled: true,
    frequency: 'WEEKLY',
    lastBackupTimestamp: new Date().toISOString().substring(0, 10),
    lastBackupStatus: 'SUCCESS',
    autoDownloadLocal: false
  });
  
  const [masterChoices, setMasterChoices] = useState<MasterChoices>({
    businessNatures: DEFAULT_BUSINESS_NATURES,
    birTaxOptions: DEFAULT_BIR_TAX_OPTIONS,
    benefitsOptions: DEFAULT_BENEFITS_OPTIONS,
    banksList: DEFAULT_BANKS,
    formLinkages: [
      { primaryCode: '1701Q', linkedCodes: ['1701', '1701A', '0605', '2307'], description: 'Quarterly Income Tax linked to Annual ITR, Payment Form & Certificates' },
      { primaryCode: '1702Q', linkedCodes: ['1702', '0605', '2307'], description: 'Corporate Quarterly Income Tax linked to Annual 1702 ITR & Payment Form' },
      { primaryCode: '0619E', linkedCodes: ['1601EQ', '1604E'], description: 'Monthly Expanded Withholding Tax linked to Quarterly 1601EQ & Annual 1604E' },
      { primaryCode: '1601C', linkedCodes: ['1604C'], description: 'Monthly Compensation Withholding Tax linked to Annual 1604C' },
      { primaryCode: '2550Q', linkedCodes: ['SLSP', 'VAT RELIEF', '2550M'], description: 'Quarterly VAT Return linked to Summary List of Sales & Purchases (SLSP)' },
      { primaryCode: 'SSS Contribution', linkedCodes: ['SSS Salary Loan', 'SSS Real-Time Remittance (R3)'], description: 'SSS Premium Contribution linked to Salary Loan & SSS R3' },
      { primaryCode: 'HDMF Contribution', linkedCodes: ['HDMF Housing Loan', 'HDMF Multi-Purpose Loan'], description: 'Pag-IBIG Contribution linked to HDMF Housing & MPL Loans' }
    ],
    savedCustomServices: [
      { description: 'Out-of-Pocket BIR Filing & Stamp Fee', defaultAmount: 500 },
      { description: 'Special SEC Registration & Filing Fee', defaultAmount: 15000 },
      { description: 'Annual Business Permit Renewal Processing', defaultAmount: 8500 }
    ],
    billerCatalog: DEFAULT_BILLER_CATALOG,
    holidays: DEFAULT_HOLIDAYS,
    deadlineExtensions: DEFAULT_DEADLINE_EXTENSIONS,
    weekendConfig: DEFAULT_WEEKEND_CONFIG
  });

  const [syncStatus, setSyncStatus] = useState<'Online' | 'Offline' | 'Syncing'>('Online');

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setSyncStatus('Online');
    const handleOffline = () => setSyncStatus('Offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setSyncStatus('Offline');

    // Initialize Multi-Tab Cross-Tab Sync
    initMultiTabSync(
      async (key) => {
        if (key === 'afms_invoices') {
          const invs = await getLocalData<InvoiceItem[]>('afms_invoices');
          if (invs) setInvoices(invs);
        } else if (key === 'afms_clients') {
          const cls = await getLocalData<ClientProfile[]>('afms_clients');
          if (cls) setClients(cls);
        } else if (key === 'afms_payments') {
          const pymts = await getLocalData<Payment[]>('afms_payments');
          if (pymts) setPayments(pymts);
        } else if (key === 'afms_compliance') {
          const comps = await getLocalData<ComplianceItem[]>('afms_compliance');
          if (comps) setComplianceItems(comps);
        } else if (key === 'afms_tasks') {
          const tsks = await getLocalData<TaskItem[]>('afms_tasks');
          if (tsks) setTasks(tsks);
        } else if (key === 'afms_payroll_runs') {
          const py = await getLocalData<PayrollRun[]>('afms_payroll_runs');
          if (py) setPayrollRuns(py);
        }
      },
      (conflict) => {
        setSyncConflicts(prev => [conflict, ...prev]);
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load state from IndexedDB on boot
  useEffect(() => {
    async function loadStoredState() {
      const storedClients = await getLocalData<ClientProfile[]>('afms_clients');
      if (storedClients) setClients(storedClients);

      const storedSections = await getLocalData<DynamicSection[]>('afms_dynamic_sections');
      if (storedSections) setDynamicSections(storedSections);

      const storedPayables = await getLocalData<PayableRecord[]>('afms_payables');
      if (storedPayables) setPayables(storedPayables);

      const storedCompliance = await getLocalData<ComplianceItem[]>('afms_compliance');
      if (storedCompliance) setComplianceItems(storedCompliance);

      const storedTasks = await getLocalData<TaskItem[]>('afms_tasks');
      if (storedTasks) setTasks(storedTasks);

      const storedInvoices = await getLocalData<InvoiceItem[]>('afms_invoices');
      if (storedInvoices) setInvoices(storedInvoices);

      const storedDocs = await getLocalData<DocumentItem[]>('afms_documents');
      if (storedDocs) setDocuments(storedDocs);

      const storedLogs = await getLocalData<AuditLog[]>('afms_audit_logs');
      if (storedLogs) setAuditLogs(storedLogs);

      const storedCreds = await getLocalData<CoreCredential[]>('afms_credentials');
      if (storedCreds) setCredentials(storedCreds);

      const storedMaster = await getLocalData<MasterChoices>('afms_master_choices');
      if (storedMaster) {
        const mergedBirOptions = DEFAULT_BIR_TAX_OPTIONS.map(def => {
          const custom = storedMaster.birTaxOptions?.find(o => o.id === def.id || o.code.toLowerCase() === def.code.toLowerCase());
          return custom ? { ...def, ...custom } : def;
        });
        const extraBir = (storedMaster.birTaxOptions || []).filter(o => !DEFAULT_BIR_TAX_OPTIONS.some(def => def.id === o.id || def.code.toLowerCase() === o.code.toLowerCase()));

        const mergedBenOptions = DEFAULT_BENEFITS_OPTIONS.map(def => {
          const custom = storedMaster.benefitsOptions?.find(o => o.id === def.id || o.code.toLowerCase() === def.code.toLowerCase());
          return custom ? { ...def, ...custom } : def;
        });
        const extraBen = (storedMaster.benefitsOptions || []).filter(o => !DEFAULT_BENEFITS_OPTIONS.some(def => def.id === o.id || def.code.toLowerCase() === def.code.toLowerCase()));

        const mergedBillers = DEFAULT_BILLER_CATALOG.map(def => {
          const custom = storedMaster.billerCatalog?.find(b => b.id === def.id || b.code.toLowerCase() === def.code.toLowerCase());
          return custom ? { ...def, ...custom } : def;
        });
        const extraBillers = (storedMaster.billerCatalog || []).filter(b => !DEFAULT_BILLER_CATALOG.some(def => def.id === b.id || def.code.toLowerCase() === b.code.toLowerCase()));

        setMasterChoices({
          businessNatures: storedMaster.businessNatures || DEFAULT_BUSINESS_NATURES,
          birTaxOptions: [...mergedBirOptions, ...extraBir],
          benefitsOptions: [...mergedBenOptions, ...extraBen],
          banksList: storedMaster.banksList || DEFAULT_BANKS,
          billerCatalog: [...mergedBillers, ...extraBillers],
          formLinkages: (storedMaster.formLinkages && storedMaster.formLinkages.length > 0)
            ? storedMaster.formLinkages.map((l, idx) => ({
                id: l.id || `fl_${idx}_${Date.now()}`,
                primaryCode: typeof l.primaryCode === 'string' ? l.primaryCode : String(l.primaryCode || ''),
                linkedCodes: Array.isArray(l.linkedCodes) ? l.linkedCodes : [],
                description: l.description || ''
              }))
            : [
                { id: 'fl_1701q', primaryCode: '1701Q', linkedCodes: ['1701', '1701A', '0605', '2307'], description: 'Quarterly Income Tax linked to Annual ITR, Payment Form & Certificates' },
                { id: 'fl_1702q', primaryCode: '1702Q', linkedCodes: ['1702', '0605', '2307'], description: 'Corporate Quarterly Income Tax linked to Annual 1702 ITR & Payment Form' },
                { id: 'fl_0619e', primaryCode: '0619E', linkedCodes: ['1601EQ', '1604E'], description: 'Monthly Expanded Withholding Tax linked to Quarterly 1601EQ & Annual 1604E' },
                { id: 'fl_1601c', primaryCode: '1601C', linkedCodes: ['1604C'], description: 'Monthly Compensation Withholding Tax linked to Annual 1604C' },
                { id: 'fl_2550q', primaryCode: '2550Q', linkedCodes: ['SLSP', 'VAT RELIEF', '2550M'], description: 'Quarterly VAT Return linked to Summary List of Sales & Purchases (SLSP)' },
                { id: 'fl_sss', primaryCode: 'SSS Contribution', linkedCodes: ['SSS Salary Loan', 'SSS Real-Time Remittance (R3)'], description: 'SSS Premium Contribution linked to Salary Loan & SSS R3' },
                { id: 'fl_hdmf', primaryCode: 'HDMF Contribution', linkedCodes: ['HDMF Housing Loan', 'HDMF Multi-Purpose Loan'], description: 'Pag-IBIG Contribution linked to HDMF Housing & MPL Loans' }
              ],
          savedCustomServices: storedMaster.savedCustomServices || [
            { description: 'Out-of-Pocket BIR Filing & Stamp Fee', defaultAmount: 500 },
            { description: 'Special SEC Registration & Filing Fee', defaultAmount: 15000 },
            { description: 'Annual Business Permit Renewal Processing', defaultAmount: 8500 }
          ],
          holidays: (storedMaster.holidays && storedMaster.holidays.length > 0) ? storedMaster.holidays : DEFAULT_HOLIDAYS,
          deadlineExtensions: (storedMaster.deadlineExtensions && storedMaster.deadlineExtensions.length > 0) ? storedMaster.deadlineExtensions : DEFAULT_DEADLINE_EXTENSIONS,
          weekendConfig: storedMaster.weekendConfig || DEFAULT_WEEKEND_CONFIG
        });
      }

      const storedCr = await getLocalData<string[]>('afms_used_cr_numbers');
      if (storedCr) setUsedCrNumbers(storedCr);

      const storedEmployees = await getLocalData<CompanyEmployee[]>('afms_employees');
      if (storedEmployees) setEmployees(storedEmployees);

      const storedLeaves = await getLocalData<LeaveRecord[]>('afms_leave_records');
      if (storedLeaves) setLeaveRecords(storedLeaves);

      const storedVales = await getLocalData<ValeRecord[]>('afms_vale_records');
      if (storedVales) setValeRecords(storedVales);

      const storedPayrolls = await getLocalData<PayrollRun[]>('afms_payroll_runs');
      if (storedPayrolls) setPayrollRuns(storedPayrolls);

      const storedExpenses = await getLocalData<CompanyExpense[]>('afms_company_expenses');
      if (storedExpenses) setCompanyExpenses(storedExpenses);

      const storedServices = await getLocalData<ClientService[]>('afms_client_services');
      if (storedServices) setClientServices(storedServices);

      const storedPayments = await getLocalData<Payment[]>('afms_payments');
      if (storedPayments) setPayments(storedPayments);

      const storedCollectionLogs = await getLocalData<CollectionLog[]>('afms_collection_logs');
      if (storedCollectionLogs) setCollectionLogs(storedCollectionLogs);
    }
    loadStoredState();
  }, []);

  // Collection # Unique Auto-Generator (highest + 1)
  const getNextCollectionNumber = (): string => {
    let maxNum = 1000;
    invoices.forEach(inv => {
      const numStr = inv.collectionNumber || (inv.invoiceNumber ? inv.invoiceNumber.replace(/\D/g, '') : '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });
    return (maxNum + 1).toString();
  };

  const isCollectionNumberUsed = (numStr: string): boolean => {
    if (!numStr) return false;
    const clean = numStr.trim();
    return invoices.some(i => i.collectionNumber === clean);
  };

  // Save Custom Service Preset
  const saveCustomService = (service: { description: string; defaultAmount?: number }) => {
    if (!service.description || !service.description.trim()) return;
    const desc = service.description.trim();
    const existing = masterChoices.savedCustomServices || [];
    if (!existing.some(s => s.description.toLowerCase() === desc.toLowerCase())) {
      const updatedMaster = {
        ...masterChoices,
        savedCustomServices: [...existing, { description: desc, defaultAmount: service.defaultAmount || 0 }]
      };
      setMasterChoices(updatedMaster);
      persistState('afms_master_choices', updatedMaster);
    }
  };

  // Collection Receipt 4-Digit Unique Generator
  const getNextCrNumber = (): string => {
    const existing = new Set<string>(usedCrNumbers);
    invoices.forEach(inv => {
      if (inv.collectionReceiptNumber) {
        const digits = inv.collectionReceiptNumber.replace(/\D/g, '');
        if (digits) existing.add(digits);
      }
      if (inv.officialReceiptNumber) {
        const digits = inv.officialReceiptNumber.replace(/\D/g, '');
        if (digits) existing.add(digits);
      }
    });

    let counter = 1001;
    while (counter <= 9999) {
      const formatted = String(counter).padStart(4, '0');
      if (!existing.has(formatted) && !existing.has(`CR-${formatted}`) && !existing.has(`C.R.# ${formatted}`)) {
        return formatted;
      }
      counter++;
    }
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const isCrNumberUsed = (crNum: string): boolean => {
    if (!crNum) return false;
    const cleanDigits = crNum.replace(/\D/g, '');
    const set = new Set<string>(usedCrNumbers);
    invoices.forEach(inv => {
      if (inv.collectionReceiptNumber) {
        const d = inv.collectionReceiptNumber.replace(/\D/g, '');
        if (d) set.add(d);
      }
      if (inv.officialReceiptNumber) {
        const d = inv.officialReceiptNumber.replace(/\D/g, '');
        if (d) set.add(d);
      }
    });
    return (cleanDigits !== '' && set.has(cleanDigits)) || set.has(crNum) || usedCrNumbers.includes(crNum);
  };

  // Helper sync auto-save
  const persistState = (key: string, data: any) => {
    saveLocalData(key, data);
  };

  const addAuditLog = (action: string, details: string, userId: string, userName: string) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    persistState('afms_audit_logs', updated);
  };

  // ==========================================
  // CLIENT SERVICES & ENGAGEMENT MANAGEMENT ⭐
  // ==========================================

  const getClientServices = (clientId: string): ClientService[] => {
    return clientServices.filter(s => s.clientId === clientId);
  };

  const addClientService = (
    data: Omit<ClientService, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string = 'system',
    userName: string = 'System'
  ): { success: boolean; message: string; service?: ClientService } => {
    // Duplicate check for active/suspended service
    const existing = clientServices.find(s => 
      s.clientId === data.clientId && 
      s.serviceCode.trim().toLowerCase() === data.serviceCode.trim().toLowerCase() && 
      s.status !== 'Ended'
    );

    if (existing) {
      return { 
        success: false, 
        message: `Service "${data.serviceName}" (${data.serviceCode}) is already active or suspended for this client.` 
      };
    }

    const now = new Date().toISOString().substring(0, 10);
    const newService: ClientService = {
      ...data,
      id: `cs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };

    const updated = [newService, ...clientServices];
    setClientServices(updated);
    persistState('afms_client_services', updated);

    addAuditLog(
      'ADD_CLIENT_SERVICE',
      `Added client engagement service "${newService.serviceName}" (${newService.serviceCode}) for client ID ${newService.clientId} with fee ₱${newService.fee || 0}.`,
      userId,
      userName
    );

    return { 
      success: true, 
      message: `Service "${newService.serviceName}" added successfully.`,
      service: newService
    };
  };

  const updateClientService = (
    id: string,
    updates: Partial<ClientService>,
    userId: string = 'system',
    userName: string = 'System'
  ): { success: boolean; message: string } => {
    const service = clientServices.find(s => s.id === id);
    if (!service) return { success: false, message: 'Client service not found.' };

    const now = new Date().toISOString().substring(0, 10);
    const updatedServices = clientServices.map(s => {
      if (s.id === id) {
        return {
          ...s,
          ...updates,
          updatedAt: now
        };
      }
      return s;
    });

    setClientServices(updatedServices);
    persistState('afms_client_services', updatedServices);

    addAuditLog(
      'UPDATE_CLIENT_SERVICE',
      `Updated service "${service.serviceName}" (${service.serviceCode}) for client ID ${service.clientId}.`,
      userId,
      userName
    );

    return { success: true, message: 'Service updated successfully.' };
  };

  const suspendClientService = (
    id: string,
    reason?: string,
    userId: string = 'system',
    userName: string = 'System'
  ): { success: boolean; message: string } => {
    const service = clientServices.find(s => s.id === id);
    if (!service) return { success: false, message: 'Client service not found.' };

    const now = new Date().toISOString().substring(0, 10);
    const updatedServices = clientServices.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'Suspended' as const,
          notes: reason ? `${s.notes ? s.notes + ' | ' : ''}Suspended on ${now}: ${reason}` : s.notes,
          updatedAt: now
        };
      }
      return s;
    });

    setClientServices(updatedServices);
    persistState('afms_client_services', updatedServices);

    addAuditLog(
      'SUSPEND_CLIENT_SERVICE',
      `Suspended service "${service.serviceName}" (${service.serviceCode}) for client ID ${service.clientId}.${reason ? ` Reason: "${reason}"` : ''}`,
      userId,
      userName
    );

    return { success: true, message: 'Service suspended successfully.' };
  };

  const endClientService = (
    id: string,
    endDate?: string,
    reason?: string,
    userId: string = 'system',
    userName: string = 'System'
  ): { success: boolean; message: string } => {
    const service = clientServices.find(s => s.id === id);
    if (!service) return { success: false, message: 'Client service not found.' };

    const now = new Date().toISOString().substring(0, 10);
    const effectiveEndDate = endDate || now;

    const updatedServices = clientServices.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'Ended' as const,
          endDate: effectiveEndDate,
          notes: reason ? `${s.notes ? s.notes + ' | ' : ''}Ended on ${effectiveEndDate}: ${reason}` : s.notes,
          updatedAt: now
        };
      }
      return s;
    });

    setClientServices(updatedServices);
    persistState('afms_client_services', updatedServices);

    addAuditLog(
      'END_CLIENT_SERVICE',
      `Ended service "${service.serviceName}" (${service.serviceCode}) for client ID ${service.clientId} effective ${effectiveEndDate}.${reason ? ` Reason: "${reason}"` : ''}`,
      userId,
      userName
    );

    return { success: true, message: 'Service status marked as Ended.' };
  };

  const restoreClientService = (
    id: string,
    userId: string = 'system',
    userName: string = 'System'
  ): { success: boolean; message: string } => {
    const service = clientServices.find(s => s.id === id);
    if (!service) return { success: false, message: 'Client service not found.' };

    const now = new Date().toISOString().substring(0, 10);
    const updatedServices = clientServices.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'Active' as const,
          endDate: undefined,
          updatedAt: now
        };
      }
      return s;
    });

    setClientServices(updatedServices);
    persistState('afms_client_services', updatedServices);

    addAuditLog(
      'RESTORE_CLIENT_SERVICE',
      `Reactivated/restored service "${service.serviceName}" (${service.serviceCode}) for client ID ${service.clientId}.`,
      userId,
      userName
    );

    return { success: true, message: 'Service reactivated to Active status.' };
  };

  // Automatic Non-Destructive Synchronizer: Create ClientService records for clients with birTaxServices, benefitsServices, or retainersFee
  useEffect(() => {
    if (!clients || clients.length === 0) return;

    let newServicesAdded = false;
    const currentServices = [...clientServices];

    clients.forEach(client => {
      const clientExistingServices = currentServices.filter(s => s.clientId === client.id);

      // 1. Sync BIR Tax Services
      if (client.birTaxServices && client.birTaxServices.length > 0) {
        client.birTaxServices.forEach(code => {
          const hasService = clientExistingServices.some(
            s => s.serviceCode.toLowerCase() === code.toLowerCase() || s.serviceName.toLowerCase().includes(code.toLowerCase())
          );
          if (!hasService) {
            const rule = masterChoices.birTaxOptions?.find(r => r.code.toLowerCase() === code.toLowerCase());
            const newSvc: ClientService = {
              id: `cs_auto_bir_${client.id}_${code.replace(/\s+/g, '_')}`,
              clientId: client.id,
              serviceCode: code,
              serviceName: rule ? rule.name : `BIR ${code} Tax Compliance`,
              category: 'BIR',
              status: 'Active',
              startDate: client.createdAt || '2025-01-01',
              assignedStaffId: client.assignedStaffId,
              assignedStaffName: client.assignedStaffName,
              billable: true,
              billingFrequency: rule?.frequency === 'Quarterly' ? 'Quarterly' : 'Monthly',
              fee: 0,
              generatesCompliance: true,
              notes: 'Automatically migrated from Client Profile BIR tax services list.',
              createdAt: new Date().toISOString().substring(0, 10),
              updatedAt: new Date().toISOString().substring(0, 10)
            };
            currentServices.push(newSvc);
            newServicesAdded = true;
          }
        });
      }

      // 2. Sync Benefits Services
      if (client.benefitsServices && client.benefitsServices.length > 0) {
        client.benefitsServices.forEach(code => {
          const hasService = clientExistingServices.some(
            s => s.serviceCode.toLowerCase() === code.toLowerCase() || s.serviceName.toLowerCase().includes(code.toLowerCase())
          );
          if (!hasService) {
            const newSvc: ClientService = {
              id: `cs_auto_ben_${client.id}_${code.replace(/\s+/g, '_')}`,
              clientId: client.id,
              serviceCode: code,
              serviceName: `Statutory ${code}`,
              category: 'Benefits',
              status: 'Active',
              startDate: client.createdAt || '2025-01-01',
              assignedStaffId: client.assignedStaffId,
              assignedStaffName: client.assignedStaffName,
              billable: true,
              billingFrequency: 'Monthly',
              fee: 0,
              generatesCompliance: true,
              notes: 'Automatically migrated from Client Profile statutory benefits list.',
              createdAt: new Date().toISOString().substring(0, 10),
              updatedAt: new Date().toISOString().substring(0, 10)
            };
            currentServices.push(newSvc);
            newServicesAdded = true;
          }
        });
      }

      // 3. Sync Retainers Fee / Monthly Accounting if present
      if (client.retainersFee && client.retainersFee > 0) {
        const hasBookkeeping = clientExistingServices.some(
          s => s.category === 'Accounting' || s.serviceCode === 'BOOKKEEPING' || s.serviceCode === 'RETAINERS_FEE'
        );
        if (!hasBookkeeping) {
          const newSvc: ClientService = {
            id: `cs_auto_retainer_${client.id}`,
            clientId: client.id,
            serviceCode: 'BOOKKEEPING',
            serviceName: 'Retainers Fee',
            category: 'Accounting',
            status: 'Active',
            startDate: client.createdAt || '2025-01-01',
            assignedStaffId: client.assignedStaffId,
            assignedStaffName: client.assignedStaffName,
            billable: true,
            billingFrequency: 'Monthly',
            fee: client.retainersFee,
            generatesCompliance: false,
            notes: `Monthly accounting retainer fee (₱${client.retainersFee.toLocaleString()}).`,
            createdAt: new Date().toISOString().substring(0, 10),
            updatedAt: new Date().toISOString().substring(0, 10)
          };
          currentServices.push(newSvc);
          newServicesAdded = true;
        }
      }
    });

    if (newServicesAdded) {
      setClientServices(currentServices);
      persistState('afms_client_services', currentServices);
    }
  }, [clients]);

  // Client Management
  const addClient = (data: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>): ClientProfile => {
    const now = new Date().toISOString().substring(0, 10);
    const newClient: ClientProfile = {
      ...data,
      id: `client_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newClient, ...clients];
    setClients(updated);
    persistState('afms_clients', updated);
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<ClientProfile>) => {
    const now = new Date().toISOString().substring(0, 10);
    const updated = clients.map(c => c.id === id ? { ...c, ...updates, updatedAt: now } : c);
    setClients(updated);
    persistState('afms_clients', updated);
  };

  const archiveClient = (id: string, reason?: string, archivedBy?: string) => {
    const nowISO = new Date().toISOString();
    const updated = clients.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'Archived' as const,
          archivedAt: nowISO,
          archivedBy: archivedBy || 'Admin',
          archiveReason: reason || 'Client profile archived',
          updatedAt: nowISO.substring(0, 10),
        };
      }
      return c;
    });
    setClients(updated);
    persistState('afms_clients', updated);
  };

  const deleteClient = (id: string, reason?: string, archivedBy?: string) => {
    // Soft delete / archive to ensure historical financial, tax, and compliance records remain preserved
    archiveClient(id, reason, archivedBy);
  };

  const restoreClient = (id: string) => {
    const now = new Date().toISOString().substring(0, 10);
    const updated = clients.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'Active' as const,
          updatedAt: now,
        };
      }
      return c;
    });
    setClients(updated);
    persistState('afms_clients', updated);
  };

  // Dynamic Section Builder
  const addDynamicSection = (secData: Omit<DynamicSection, 'id' | 'createdAt'>): DynamicSection => {
    const newSec: DynamicSection = {
      ...secData,
      id: `sec_${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    const updated = [...dynamicSections, newSec];
    setDynamicSections(updated);
    persistState('afms_dynamic_sections', updated);
    return newSec;
  };

  const updateDynamicSection = (id: string, section: DynamicSection) => {
    const updated = dynamicSections.map(s => s.id === id ? section : s);
    setDynamicSections(updated);
    persistState('afms_dynamic_sections', updated);
  };

  const deleteDynamicSection = (id: string) => {
    const updated = dynamicSections.filter(s => s.id !== id);
    setDynamicSections(updated);
    persistState('afms_dynamic_sections', updated);
  };

  // Payables
  const addPayable = (data: Omit<PayableRecord, 'id' | 'createdAt'>): PayableRecord => {
    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Check if an existing payable exists for this client, item, and month/year
    const existingIndex = payables.findIndex(p => 
      p.clientId === data.clientId && 
      p.itemName.trim().toLowerCase() === data.itemName.trim().toLowerCase() && 
      (p.month === data.month || p.year === data.year)
    );

    let resultPayable: PayableRecord;
    let updatedPayables: PayableRecord[];

    if (existingIndex >= 0) {
      const old = payables[existingIndex];
      const historyEntry = {
        date: nowTimestamp,
        modifiedBy: data.createdByName || 'Staff',
        details: `Assessment updated from "${old.status}" (₱${old.payableAmount || 0}) to "${data.status}" (₱${data.payableAmount || 0})${data.notes ? ` • Notes: ${data.notes}` : ''}`,
        previousAmount: old.payableAmount,
        newAmount: data.payableAmount
      };

      resultPayable = {
        ...old,
        ...data,
        amendedHistory: [historyEntry, ...(old.amendedHistory || [])]
      };

      updatedPayables = [...payables];
      updatedPayables[existingIndex] = resultPayable;
    } else {
      const historyEntry = {
        date: nowTimestamp,
        modifiedBy: data.createdByName || 'Staff',
        details: `Initial assessment created: "${data.status}" (₱${data.payableAmount || 0})${data.notes ? ` • Notes: ${data.notes}` : ''}`,
        previousAmount: 0,
        newAmount: data.payableAmount
      };

      resultPayable = {
        ...data,
        id: `pay_${Date.now()}`,
        createdAt: nowTimestamp,
        amendedHistory: [historyEntry]
      };

      updatedPayables = [resultPayable, ...payables];
    }

    setPayables(updatedPayables);
    persistState('afms_payables', updatedPayables);

    // Automatically sync/add to Compliance Items if status is Unpaid
    if (data.status === 'Unpaid') {
      const existingComp = complianceItems.find(c => 
        c.clientId === data.clientId && 
        c.title.includes(data.itemName)
      );

      if (existingComp) {
        const updatedComp = complianceItems.map(c => 
          c.id === existingComp.id ? { ...c, status: 'Pending' as const, amountDue: data.payableAmount } : c
        );
        setComplianceItems(updatedComp);
        persistState('afms_compliance', updatedComp);
      } else {
        const newComp: ComplianceItem = {
          id: `comp_${Date.now()}`,
          clientId: data.clientId,
          clientName: data.clientName,
          title: `${data.category} ${data.itemName} (${data.month})`,
          category: data.category,
          dueDate: `${data.month}-15`, // default month deadline
          status: 'Pending',
          amountDue: data.payableAmount,
        };
        const updatedComp = [newComp, ...complianceItems];
        setComplianceItems(updatedComp);
        persistState('afms_compliance', updatedComp);
      }
    }

    return resultPayable;
  };

  // Tag Payable Paid by Super Admin with exact amount match verification
  const tagPayablePaid = (payableId: string, paymentInfo: NonNullable<PayableRecord['paymentDetails']>) => {
    const target = payables.find(p => p.id === payableId);
    if (!target) {
      return { success: false, message: 'Payable record not found.' };
    }

    // Verify amount match
    if (Math.abs(Number(paymentInfo.amountPaid) - Number(target.payableAmount)) > 0.01) {
      return {
        success: false,
        message: `Payment Verification Failed: The entered amount (₱${Number(paymentInfo.amountPaid).toLocaleString()}) does not match the official recorded payable amount. Please re-check your payment receipt.`
      };
    }

    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const historyEntry = {
      date: nowTimestamp,
      modifiedBy: paymentInfo.taggedByName || 'Super Admin',
      details: `Tagged as PAID & SETTLED via ${paymentInfo.paymentMethod}${paymentInfo.referenceNumber ? ` (Ref: ${paymentInfo.referenceNumber})` : ''} on ${paymentInfo.paidDate}. Amount: ₱${Number(paymentInfo.amountPaid).toLocaleString()}${paymentInfo.notes ? ` • Notes: ${paymentInfo.notes}` : ''}`,
      previousAmount: target.payableAmount,
      newAmount: paymentInfo.amountPaid
    };

    const updatedPayables = payables.map(p => {
      if (p.id === payableId) {
        return {
          ...p,
          status: 'Paid' as const,
          paymentDetails: paymentInfo,
          amendedHistory: [historyEntry, ...(p.amendedHistory || [])]
        };
      }
      return p;
    });

    setPayables(updatedPayables);
    persistState('afms_payables', updatedPayables);

    // Also update corresponding compliance item to "Already Paid"
    const updatedComp = complianceItems.map(c => {
      if (c.clientId === target.clientId && c.title.includes(target.itemName)) {
        return {
          ...c,
          status: 'Already Paid' as const,
          paidDate: paymentInfo.paidDate,
        };
      }
      return c;
    });
    setComplianceItems(updatedComp);
    persistState('afms_compliance', updatedComp);

    return { success: true, message: 'Payable successfully verified and marked as PAID!' };
  };

  // Allow Super Admin to amend/edit paid payable with history log
  const amendPayablePayment = (
    payableId: string, 
    updatedPayment: NonNullable<PayableRecord['paymentDetails']>, 
    details: string,
    modifiedBy: string
  ) => {
    setPayables(prev => {
      const updated = prev.map(p => {
        if (p.id === payableId) {
          const historyEntry = {
            date: new Date().toISOString().replace('T', ' ').substring(0, 19),
            modifiedBy,
            details,
            previousAmount: p.paymentDetails?.amountPaid || p.payableAmount,
            newAmount: updatedPayment.amountPaid
          };
          const currentHistory = p.amendedHistory || [];
          return {
            ...p,
            paymentDetails: updatedPayment,
            payableAmount: updatedPayment.amountPaid,
            amendedHistory: [historyEntry, ...currentHistory]
          };
        }
        return p;
      });
      persistState('afms_payables', updated);
      return updated;
    });

    addAuditLog(
      'Payable Payment Amended',
      `Amended payable payment for ID ${payableId}. Details: ${details}`,
      'super_admin',
      modifiedBy
    );
  };

  // Cancel / Revoke Payment Tag and return item to Pending status & To-Do list
  const cancelPayablePayment = (payableId: string, reason: string, cancelledBy: string) => {
    const targetPayable = payables.find(p => p.id === payableId);
    if (!targetPayable) return;

    const historyEntry = {
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      modifiedBy: cancelledBy,
      details: `Payment tag revoked to Unpaid. Reason: ${reason || 'Revoked by admin'}`,
      previousAmount: targetPayable.paymentDetails?.amountPaid || targetPayable.payableAmount,
      newAmount: targetPayable.payableAmount
    };
    const currentHistory = targetPayable.amendedHistory || [];

    const updatedPayables = payables.map(p => {
      if (p.id === payableId) {
        return {
          ...p,
          status: 'Unpaid' as const,
          paymentDetails: undefined,
          amendedHistory: [historyEntry, ...currentHistory]
        };
      }
      return p;
    });
    setPayables(updatedPayables);
    persistState('afms_payables', updatedPayables);

    // Sync compliance items back to Pending and remove paidDate
    const cleanItemName = targetPayable.itemName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const updatedComp = complianceItems.map(c => {
      const cleanTitle = c.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (
        c.clientId === targetPayable.clientId &&
        (cleanTitle.includes(cleanItemName) || cleanItemName.includes(cleanTitle))
      ) {
        return {
          ...c,
          status: 'Pending' as const,
          paidDate: undefined
        };
      }
      return c;
    });
    setComplianceItems(updatedComp);
    persistState('afms_compliance', updatedComp);

    addAuditLog(
      'Payment Tag Revoked',
      `Revoked payment tag for ${targetPayable.clientName} (${targetPayable.itemName}). Item returned to Unpaid.`,
      'system',
      cancelledBy
    );
  };

  // Delete payable and reset item back to Action Pending
  const deletePayable = (payableId: string) => {
    const target = payables.find(p => p.id === payableId);
    if (!target) return;

    const updatedPayables = payables.filter(p => p.id !== payableId);
    setPayables(updatedPayables);
    persistState('afms_payables', updatedPayables);

    const cleanItemName = target.itemName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const updatedComp = complianceItems.map(c => {
      const cleanTitle = c.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (
        c.clientId === target.clientId &&
        (cleanTitle.includes(cleanItemName) || cleanItemName.includes(cleanTitle))
      ) {
        return {
          ...c,
          status: 'Pending' as const,
          amountDue: undefined,
          paidDate: undefined
        };
      }
      return c;
    });
    setComplianceItems(updatedComp);
    persistState('afms_compliance', updatedComp);

    addAuditLog(
      'Payable Assessment Cancelled',
      `Cancelled payable assessment for ${target.clientName} (${target.itemName}). Item returned to Action Pending.`,
      'system',
      'User'
    );
  };

  // Reset payable assessment by client & form code
  const resetPayableAssessment = (clientId: string, formCode: string, periodStr?: string) => {
    const cleanFormCode = formCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const updatedPayables = payables.filter(p => {
      if (p.clientId !== clientId) return true;
      const cleanItemName = p.itemName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const isMatchingForm = cleanItemName.includes(cleanFormCode) || cleanFormCode.includes(cleanItemName);
      const isMatchingPeriod = !periodStr || p.month === periodStr || p.month.includes(periodStr);
      return !(isMatchingForm && isMatchingPeriod);
    });
    setPayables(updatedPayables);
    persistState('afms_payables', updatedPayables);

    const updatedComp = complianceItems.map(c => {
      if (c.clientId !== clientId) return c;
      const cleanTitle = c.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (cleanTitle.includes(cleanFormCode) || cleanFormCode.includes(cleanTitle)) {
        return {
          ...c,
          status: 'Pending' as const,
          amountDue: undefined,
          paidDate: undefined
        };
      }
      return c;
    });
    setComplianceItems(updatedComp);
    persistState('afms_compliance', updatedComp);

    addAuditLog(
      'Assessment Reset to Action Pending',
      `Reset form choice for client ${clientId} (${formCode}). Item returned to Action Pending in To-Do list.`,
      'system',
      'User'
    );
  };

  // Update Invoice with Amended History
  const updateInvoice = (
    invoiceId: string, 
    updates: Partial<InvoiceItem>, 
    modificationDetails?: string, 
    modifiedBy: string = 'Staff'
  ) => {
    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        let amendedHistory = inv.amendedHistory || [];
        if (modificationDetails) {
          amendedHistory = [
            {
              date: new Date().toISOString().replace('T', ' ').substring(0, 19),
              modifiedBy,
              details: modificationDetails,
              previousTotal: inv.totalAmount,
              newTotal: updates.totalAmount !== undefined ? updates.totalAmount : inv.totalAmount
            },
            ...amendedHistory
          ];
        }
        return {
          ...inv,
          ...updates,
          amendedHistory
        };
      }
      return inv;
    });

    setInvoices(updated);
    persistState('afms_invoices', updated);
  };

  // Core Credentials Vault
  const addCredential = (data: Omit<CoreCredential, 'id'>) => {
    const newCred: CoreCredential = {
      ...data,
      id: `cred_${Date.now()}`
    };
    const updated = [newCred, ...credentials];
    setCredentials(updated);
    persistState('afms_credentials', updated);
  };

  const updateCredential = (id: string, updates: Partial<CoreCredential>) => {
    const updated = credentials.map(c => c.id === id ? { ...c, ...updates } : c);
    setCredentials(updated);
    persistState('afms_credentials', updated);
  };

  const deleteCredential = (id: string) => {
    const updated = credentials.filter(c => c.id !== id);
    setCredentials(updated);
    persistState('afms_credentials', updated);
  };

  // Compliance
  const addComplianceItem = (item: Omit<ComplianceItem, 'id'>) => {
    const newItem: ComplianceItem = {
      ...item,
      id: `comp_${Date.now()}`,
    };
    const updated = [newItem, ...complianceItems];
    setComplianceItems(updated);
    persistState('afms_compliance', updated);
  };

  const updateComplianceStatus = (id: string, status: ComplianceItem['status']) => {
    const updated = complianceItems.map(c => c.id === id ? { ...c, status } : c);
    setComplianceItems(updated);
    persistState('afms_compliance', updated);
  };

  // Tasks & Phase 6 Workflow Engine ⭐
  const addTask = (taskData: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = {
      ...taskData,
      id: `task_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: taskData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workflowStage: taskData.workflowStage || 'Preparer',
      status: taskData.status || 'Pending'
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    persistState('afms_tasks', updated);
  };

  const updateTaskStatus = (id: string, status: TaskItem['status']) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status,
          updatedAt: new Date().toISOString(),
          completedAt: status === 'Completed' ? new Date().toISOString() : t.completedAt
        };
      }
      return t;
    });
    setTasks(updated);
    persistState('afms_tasks', updated);
  };

  const updateTask = (taskId: string, updates: Partial<TaskItem>, userId: string = 'system', userName: string = 'System Admin') => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    setTasks(updated);
    persistState('afms_tasks', updated);
    addAuditLog('Task Updated', `Updated task "${taskId}" details.`, userId, userName);
  };

  const submitTaskForReview = (taskId: string, preparerNotes?: string, userId: string = 'system', userName: string = 'Staff') => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return { success: false, message: 'Task not found.' };

    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'For Review' as const,
          workflowStage: 'Reviewer' as const,
          preparerId: userId,
          preparerName: userName,
          notes: preparerNotes ? `${t.notes ? t.notes + '\n\n' : ''}[Preparer Note - ${userName}]: ${preparerNotes}` : t.notes,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    setTasks(updated);
    persistState('afms_tasks', updated);

    addAuditLog(
      'Task Submitted for Review',
      `Task "${target.title}" for ${target.clientName || 'Client'} submitted by ${userName} for Senior Reviewer approval.`,
      userId,
      userName
    );
    return { success: true, message: `Task "${target.title}" submitted for Review!` };
  };

  const approveTask = (taskId: string, reviewNotes?: string, userId: string = 'system', userName: string = 'Senior Reviewer') => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return { success: false, message: 'Task not found.' };

    const now = new Date().toISOString();
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'Completed' as const,
          workflowStage: 'Approved' as const,
          completedAt: now,
          completedById: userId,
          completedByName: userName,
          reviewerId: userId,
          reviewerName: userName,
          reviewNotes: reviewNotes || 'Approved without issues.',
          updatedAt: now
        };
      }
      return t;
    });
    setTasks(updated);
    persistState('afms_tasks', updated);

    addAuditLog(
      'Task Approved & Completed',
      `Task "${target.title}" for ${target.clientName || 'Client'} was reviewed and APPROVED by ${userName}. Status marked Completed.`,
      userId,
      userName
    );
    return { success: true, message: `Task "${target.title}" approved and completed!` };
  };

  const returnTaskForCorrection = (taskId: string, reviewNotes: string, userId: string = 'system', userName: string = 'Senior Reviewer') => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return { success: false, message: 'Task not found.' };

    const now = new Date().toISOString();
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'In Progress' as const,
          workflowStage: 'Returned' as const,
          reviewerId: userId,
          reviewerName: userName,
          reviewNotes,
          updatedAt: now
        };
      }
      return t;
    });
    setTasks(updated);
    persistState('afms_tasks', updated);

    addAuditLog(
      'Task Returned for Correction',
      `Task "${target.title}" for ${target.clientName || 'Client'} returned to ${target.assignedToName} by ${userName} for correction. Notes: "${reviewNotes}".`,
      userId,
      userName
    );
    return { success: true, message: `Task "${target.title}" returned to preparer for correction.` };
  };

  const overrideTaskDeadline = (taskId: string, newDueDate: string, reason: string, userId: string = 'system', userName: string = 'Admin') => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return { success: false, message: 'Task not found.' };

    const original = target.originalDueDate || target.dueDate;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          dueDate: newDueDate,
          originalDueDate: original,
          isOverriddenDeadline: true,
          overrideReason: reason,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    setTasks(updated);
    persistState('afms_tasks', updated);

    addAuditLog(
      'Task Deadline Overridden',
      `Task "${target.title}" deadline changed from ${original} to ${newDueDate} by ${userName}. Reason: "${reason}".`,
      userId,
      userName
    );
    return { success: true, message: `Deadline for "${target.title}" extended to ${newDueDate}.` };
  };

  const reassignTask = (taskId: string, newStaffId: string, newStaffName: string, userId: string = 'system', userName: string = 'Admin') => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return { success: false, message: 'Task not found.' };

    const prevStaff = target.assignedToName;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          assignedToId: newStaffId,
          assignedToName: newStaffName,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    setTasks(updated);
    persistState('afms_tasks', updated);

    addAuditLog(
      'Task Reassigned',
      `Reassigned task "${target.title}" from ${prevStaff} to ${newStaffName} by ${userName}.`,
      userId,
      userName
    );
    return { success: true, message: `Task reassigned to ${newStaffName}.` };
  };

  const deleteTask = (taskId: string, userId: string = 'system', userName: string = 'Admin') => {
    const target = tasks.find(t => t.id === taskId);
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    persistState('afms_tasks', updated);
    if (target) {
      addAuditLog('Task Deleted', `Deleted task "${target.title}" (${target.clientName}).`, userId, userName);
    }
  };

  // Automatic Recurring Task Generation Engine ⭐
  const generateRecurringComplianceTasks = (
    periodMonth: string,
    periodYear: number = 2026,
    userId: string = 'system',
    userName: string = 'System Workflow Engine'
  ) => {
    const monthCode = (MONTHS_LIST.find(m => m.toLowerCase() === periodMonth.toLowerCase().slice(0, 3)) || 'Aug') as typeof MONTHS_LIST[number];
    const monthFullName = MONTH_FULL_NAMES[monthCode] || periodMonth;

    const activeClients = clients.filter(c => c.status === 'Active' || c.status === 'For Compliance' || c.status === 'Compliance');

    let createdCount = 0;
    let skippedCount = 0;
    const newTasks: TaskItem[] = [];

    activeClients.forEach(client => {
      const activeServices = clientServices.filter(s => s.clientId === client.id && s.status === 'Active');

      const allMasterRules = [
        ...(masterChoices.birOptions || []),
        ...(masterChoices.benefitsOptions || [])
      ];

      allMasterRules.forEach(rule => {
        const matchesClientTax = (client.birTaxServices || []).some(t => t.toUpperCase().includes(rule.code.toUpperCase()) || rule.code.toUpperCase().includes(t.toUpperCase()));
        const matchesClientBenefits = (client.governmentBenefits || []).some(b => b.toUpperCase().includes(rule.code.toUpperCase()) || rule.code.toUpperCase().includes(b.toUpperCase()));
        const matchesClientService = activeServices.some(s => s.serviceName.toUpperCase().includes(rule.code.toUpperCase()) || rule.code.toUpperCase().includes(s.serviceName.toUpperCase()));

        if (matchesClientTax || matchesClientBenefits || matchesClientService) {
          const deadlineObj = getRuleDeadlineForMonth(rule, monthCode, periodYear, client);
          if (deadlineObj && !deadlineObj.isNotRequired && deadlineObj.dueDateStr !== 'N/A') {
            
            const formCode = rule.code;
            const taxablePeriod = `${deadlineObj.label} (${monthFullName} ${periodYear})`;

            const isDuplicate = tasks.some(t => 
              t.clientId === client.id && 
              (t.formCode === formCode || t.title.toLowerCase().includes(formCode.toLowerCase())) &&
              (t.taxablePeriod === taxablePeriod || t.dueDate === deadlineObj.dueDateStr)
            ) || newTasks.some(t => 
              t.clientId === client.id && 
              t.formCode === formCode && 
              t.dueDate === deadlineObj.dueDateStr
            );

            if (isDuplicate) {
              skippedCount++;
            } else {
              const matchedService = activeServices.find(s => s.serviceName.toUpperCase().includes(rule.code.toUpperCase()));
              const newTask: TaskItem = {
                id: `rec_task_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
                clientId: client.id,
                clientName: client.companyName,
                clientServiceId: matchedService?.id,
                ruleId: rule.id,
                formCode: rule.code,
                title: `${rule.code} - ${rule.description || rule.category} Filing`,
                description: `Filing & Preparation for ${rule.code} for period ${deadlineObj.label}. Due: ${deadlineObj.dueDateStr}. RDO #${client.rdoNumber}.`,
                category: rule.category === 'Benefits' ? 'Benefits' : 'BIR',
                recurrence: rule.frequency as any,
                taxablePeriod,
                dueDate: deadlineObj.dueDateStr,
                rdoNumber: client.rdoNumber,
                priority: 'Medium',
                status: 'Pending',
                workflowStage: 'Preparer',
                assignedToId: client.assignedStaffId || 'staff_1',
                assignedToName: client.assignedStaffName || 'Assigned Staff',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              newTasks.push(newTask);
              createdCount++;
            }
          }
        }
      });
    });

    if (newTasks.length > 0) {
      const updatedTasks = [...newTasks, ...tasks];
      setTasks(updatedTasks);
      persistState('afms_tasks', updatedTasks);

      addAuditLog(
        'Recurring Tasks Auto-Generated',
        `Generated ${createdCount} recurring compliance tasks for ${monthFullName} ${periodYear}. ${skippedCount} duplicate tasks skipped.`,
        userId,
        userName
      );
    }

    return {
      success: true,
      createdCount,
      skippedCount,
      message: `Task Generation Complete! Created ${createdCount} new tasks for ${monthFullName} ${periodYear} (${skippedCount} duplicates skipped).`
    };
  };

  // Invoices & Documents
  const addInvoice = (invoiceData: Omit<InvoiceItem, 'id' | 'invoiceNumber'>): InvoiceItem => {
    const newInv: InvoiceItem = {
      ...invoiceData,
      id: `inv_${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    const updated = [newInv, ...invoices];
    setInvoices(updated);
    persistState('afms_invoices', updated);
    return newInv;
  };

  const recordInvoicePayment = (
    invoiceId: string, 
    paymentDetails: { amount: number; paymentDate: string; paymentMethod: string; referenceNumber?: string; officialReceiptNumber?: string; collectionReceiptNumber?: string; notes?: string; updatedServices?: InvoiceItem['services'] },
    userId: string = 'system',
    userName: string = 'System Admin'
  ) => {
    const targetInv = invoices.find(i => i.id === invoiceId);
    if (!targetInv) {
      return { success: false, message: 'Invoice not found.' };
    }

    const now = new Date().toISOString();
    const crToSave = paymentDetails.collectionReceiptNumber || paymentDetails.officialReceiptNumber;

    // Create standalone Payment transaction record
    const newPayment: Payment = {
      id: `pmt_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId,
      clientId: targetInv.clientId,
      amount: Number(paymentDetails.amount) || 0,
      paymentDate: paymentDetails.paymentDate,
      paymentMethod: paymentDetails.paymentMethod,
      referenceNumber: paymentDetails.referenceNumber,
      officialReceiptNumber: paymentDetails.officialReceiptNumber,
      collectionReceiptNumber: crToSave,
      notes: paymentDetails.notes,
      receivedById: userId,
      receivedByName: userName,
      status: 'Active',
      createdAt: now,
      updatedAt: now
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    persistState('afms_payments', updatedPayments);

    // Calculate total active paid amount
    const activePaymentsForInv = updatedPayments.filter(p => p.invoiceId === invoiceId && p.status === 'Active');
    const newPaidAmount = activePaymentsForInv.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: InvoiceItem['status'] = targetInv.status;
    if (newPaidAmount >= targetInv.totalAmount) {
      newStatus = 'Paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'Partially Paid';
    }

    if (crToSave) {
      const cleanDigits = crToSave.replace(/\D/g, '');
      const newCrList = Array.from(new Set([...usedCrNumbers, cleanDigits, crToSave].filter(Boolean)));
      setUsedCrNumbers(newCrList);
      persistState('afms_used_cr_numbers', newCrList);
    }

    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        const existingInvoicePayments = inv.payments || [];
        return {
          ...inv,
          paidAmount: newPaidAmount,
          status: newStatus,
          paymentDate: paymentDetails.paymentDate,
          paymentMethod: paymentDetails.paymentMethod,
          officialReceiptNumber: paymentDetails.officialReceiptNumber || inv.officialReceiptNumber,
          collectionReceiptNumber: crToSave || inv.collectionReceiptNumber,
          services: paymentDetails.updatedServices || inv.services,
          payments: [newPayment, ...existingInvoicePayments]
        };
      }
      return inv;
    });

    setInvoices(updated);
    persistState('afms_invoices', updated);

    // Record audit log
    addAuditLog(
      'Invoice Payment Recorded',
      `Recorded payment of ₱${paymentDetails.amount.toLocaleString()} for Invoice ${targetInv.invoiceNumber} (${targetInv.clientName}). Status updated to ${newStatus}.`,
      userId,
      userName
    );

    return { success: true, message: `Payment of ₱${paymentDetails.amount.toLocaleString()} successfully recorded for Invoice ${targetInv.invoiceNumber}!` };
  };

  const editInvoicePayment = (
    invoiceId: string,
    paymentDetails: {
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      referenceNumber?: string;
      officialReceiptNumber?: string;
      collectionReceiptNumber?: string;
      notes?: string;
      updatedServices?: InvoiceItem['services'];
      amendedHistory?: InvoiceItem['amendedHistory'];
    },
    userId: string = 'system',
    userName: string = 'Super Admin'
  ) => {
    const targetInv = invoices.find(i => i.id === invoiceId);
    if (!targetInv) {
      return { success: false, message: 'Invoice not found.' };
    }

    const now = new Date().toISOString();
    const crToSave = paymentDetails.collectionReceiptNumber || paymentDetails.officialReceiptNumber || targetInv.collectionReceiptNumber || targetInv.officialReceiptNumber;

    // Check if an existing active payment is associated with this invoice in payments ledger
    const existingPayment = payments.find(p => p.invoiceId === invoiceId && p.status === 'Active');

    let updatedPayments: Payment[];
    let activePaymentRecord: Payment;

    if (existingPayment) {
      activePaymentRecord = {
        ...existingPayment,
        amount: Number(paymentDetails.amount) || 0,
        paymentDate: paymentDetails.paymentDate,
        paymentMethod: paymentDetails.paymentMethod,
        referenceNumber: paymentDetails.referenceNumber || existingPayment.referenceNumber,
        officialReceiptNumber: paymentDetails.officialReceiptNumber || existingPayment.officialReceiptNumber,
        collectionReceiptNumber: crToSave || existingPayment.collectionReceiptNumber,
        notes: paymentDetails.notes !== undefined ? paymentDetails.notes : existingPayment.notes,
        updatedAt: now,
        receivedById: userId,
        receivedByName: userName
      };
      updatedPayments = payments.map(p => p.id === existingPayment.id ? activePaymentRecord : p);
    } else {
      activePaymentRecord = {
        id: `pmt_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceId,
        clientId: targetInv.clientId,
        amount: Number(paymentDetails.amount) || 0,
        paymentDate: paymentDetails.paymentDate,
        paymentMethod: paymentDetails.paymentMethod,
        referenceNumber: paymentDetails.referenceNumber,
        officialReceiptNumber: paymentDetails.officialReceiptNumber,
        collectionReceiptNumber: crToSave,
        notes: paymentDetails.notes,
        receivedById: userId,
        receivedByName: userName,
        status: 'Active',
        createdAt: now,
        updatedAt: now
      };
      updatedPayments = [activePaymentRecord, ...payments];
    }

    setPayments(updatedPayments);
    persistState('afms_payments', updatedPayments);

    // Calculate total active paid amount
    const activePaymentsForInv = updatedPayments.filter(p => p.invoiceId === invoiceId && p.status === 'Active');
    const newPaidAmount = activePaymentsForInv.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: InvoiceItem['status'] = targetInv.status;
    if (newPaidAmount >= targetInv.totalAmount) {
      newStatus = 'Paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'Partially Paid';
    }

    if (crToSave) {
      const cleanDigits = crToSave.replace(/\D/g, '');
      const newCrList = Array.from(new Set([...usedCrNumbers, cleanDigits, crToSave].filter(Boolean)));
      setUsedCrNumbers(newCrList);
      persistState('afms_used_cr_numbers', newCrList);
    }

    const updatedInvoices = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          paidAmount: newPaidAmount,
          status: newStatus,
          paymentDate: paymentDetails.paymentDate,
          paymentMethod: paymentDetails.paymentMethod,
          officialReceiptNumber: paymentDetails.officialReceiptNumber || inv.officialReceiptNumber,
          collectionReceiptNumber: crToSave || inv.collectionReceiptNumber,
          billingNotes: paymentDetails.notes !== undefined ? paymentDetails.notes : inv.billingNotes,
          services: paymentDetails.updatedServices || inv.services,
          amendedHistory: paymentDetails.amendedHistory || inv.amendedHistory,
          payments: [activePaymentRecord]
        };
      }
      return inv;
    });

    setInvoices(updatedInvoices);
    persistState('afms_invoices', updatedInvoices);

    // Record audit log
    addAuditLog(
      'Invoice Payment Amended',
      `Amended payment record of ₱${paymentDetails.amount.toLocaleString()} (C.R. #${crToSave || 'N/A'}) for Invoice ${targetInv.invoiceNumber} (${targetInv.clientName}). Status: ${newStatus}.`,
      userId,
      userName
    );

    return { success: true, message: `Payment record updated successfully in Invoice Payment Ledger & History Audit!` };
  };

  const cancelInvoicePayment = (
    paymentId: string,
    reason: string,
    userId: string = 'system',
    userName: string = 'System Admin'
  ) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) {
      return { success: false, message: 'Payment record not found.' };
    }
    if (targetPayment.status === 'Cancelled') {
      return { success: false, message: 'Payment is already cancelled.' };
    }

    const now = new Date().toISOString();
    const updatedPayments = payments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          status: 'Cancelled' as const,
          cancelledAt: now,
          cancelledById: userId,
          cancelledByName: userName,
          cancellationReason: reason,
          updatedAt: now
        };
      }
      return p;
    });

    setPayments(updatedPayments);
    persistState('afms_payments', updatedPayments);

    // Recalculate invoice totals and status
    const targetInv = invoices.find(i => i.id === targetPayment.invoiceId);
    if (targetInv) {
      const activePayments = updatedPayments.filter(p => p.invoiceId === targetInv.id && p.status === 'Active');
      const newPaidAmount = activePayments.reduce((sum, p) => sum + p.amount, 0);

      let newStatus: InvoiceItem['status'] = 'For Collection';
      if (newPaidAmount >= targetInv.totalAmount) {
        newStatus = 'Paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'Partially Paid';
      } else {
        newStatus = 'For Collection';
      }

      const updatedInvoices = invoices.map(inv => {
        if (inv.id === targetInv.id) {
          const invPayments = (inv.payments || []).map(p => p.id === paymentId ? { ...p, status: 'Cancelled' as const, cancelledAt: now, cancelledById: userId, cancelledByName: userName, cancellationReason: reason } : p);
          return {
            ...inv,
            paidAmount: newPaidAmount,
            status: newStatus,
            payments: invPayments
          };
        }
        return inv;
      });

      setInvoices(updatedInvoices);
      persistState('afms_invoices', updatedInvoices);

      addAuditLog(
        'Invoice Payment Cancelled',
        `Cancelled payment of ₱${targetPayment.amount.toLocaleString()} for Invoice ${targetInv.invoiceNumber} (${targetInv.clientName}). Reason: "${reason}". Outstanding balance recalculated.`,
        userId,
        userName
      );
    }

    return { success: true, message: `Payment of ₱${targetPayment.amount.toLocaleString()} successfully cancelled.` };
  };

  const getInvoicePayments = (invoiceId: string): Payment[] => {
    return payments.filter(p => p.invoiceId === invoiceId);
  };

  const getInvoiceBalance = (invoiceId: string): number => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return 0;
    const activePayments = payments.filter(p => p.invoiceId === invoiceId && p.status === 'Active');
    const totalPaid = activePayments.reduce((sum, p) => sum + p.amount, 0);
    // Fallback to stored paidAmount if no standalone payment records exist yet
    const actualPaid = activePayments.length > 0 ? totalPaid : (inv.paidAmount || 0);
    return Math.max(0, inv.totalAmount - actualPaid);
  };

  const addCollectionLog = (
    invoiceId: string,
    logData: {
      contactPerson?: string;
      contactMethod?: CollectionLog['contactMethod'];
      status: CollectionStatus;
      notes: string;
      nextFollowUpDate?: string;
    },
    userId: string = 'system',
    userName: string = 'System Admin'
  ) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return { success: false, message: 'Invoice not found.' };

    const now = new Date().toISOString();
    const logDateStr = `${now.substring(0, 10)} ${now.substring(11, 16)}`;

    const newLog: CollectionLog = {
      id: `clog_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId,
      clientId: inv.clientId,
      logDate: logDateStr,
      contactPerson: logData.contactPerson,
      contactMethod: logData.contactMethod,
      status: logData.status,
      notes: logData.notes,
      nextFollowUpDate: logData.nextFollowUpDate,
      loggedById: userId,
      loggedByName: userName,
      createdAt: now
    };

    const updatedLogs = [newLog, ...collectionLogs];
    setCollectionLogs(updatedLogs);
    persistState('afms_collection_logs', updatedLogs);

    const updatedInvoices = invoices.map(i => {
      if (i.id === invoiceId) {
        const existingLogs = i.collectionLogs || [];
        return {
          ...i,
          collectionStatus: logData.status,
          collectionNotes: logData.notes,
          lastCollectionFollowUpDate: now.substring(0, 10),
          nextFollowUpDate: logData.nextFollowUpDate || i.nextFollowUpDate,
          collectionLogs: [newLog, ...existingLogs]
        };
      }
      return i;
    });

    setInvoices(updatedInvoices);
    persistState('afms_invoices', updatedInvoices);

    addAuditLog(
      'AR Collection Follow-Up Logged',
      `Collection log added for Invoice ${inv.invoiceNumber} (${inv.clientName}): Status set to "${logData.status}". Notes: "${logData.notes}".`,
      userId,
      userName
    );

    return { success: true, message: 'Collection follow-up log saved successfully.' };
  };

  const generateRecurringInvoices = (
    period: string,
    frequency: ServiceBillingFrequency | 'All',
    issueDate: string,
    dueDate: string,
    userId: string = 'system',
    userName: string = 'System Admin'
  ) => {
    const activeClients = clients.filter(c => c.status !== 'Archived');

    let createdCount = 0;
    let skippedCount = 0;
    const createdInvoices: InvoiceItem[] = [];
    const skippedDetails: string[] = [];

    const newInvoicesList = [...invoices];

    activeClients.forEach(client => {
      const candidateServices = clientServices.filter(s => {
        if (s.clientId !== client.id) return false;
        if (s.status !== 'Active') return false;
        if (!s.billable) return false;
        if (frequency !== 'All' && s.billingFrequency !== frequency) return false;
        return true;
      });

      if (candidateServices.length === 0) return;

      const eligibleServices: ClientService[] = [];

      candidateServices.forEach(s => {
        const alreadyBilled = newInvoicesList.some(inv => {
          if (inv.clientId !== client.id || inv.status === 'Cancelled') return false;
          if (inv.billingPeriod === period) {
            return inv.services.some(line => line.clientServiceId === s.id);
          }
          return inv.services.some(line => line.clientServiceId === s.id && line.monthYear === period);
        });

        if (alreadyBilled) {
          skippedCount++;
          skippedDetails.push(`${client.companyName} — ${s.serviceName} (${s.serviceCode}) already billed for ${period}`);
        } else {
          eligibleServices.push(s);
        }
      });

      if (eligibleServices.length === 0) return;

      const serviceLines: InvoiceServiceLine[] = eligibleServices.map(s => ({
        clientServiceId: s.id,
        serviceCode: s.serviceCode,
        serviceCategory: s.category,
        description: `${s.serviceName} (${s.serviceCode})`,
        monthYear: period,
        unitPrice: s.fee || 0,
        quantity: 1,
        discount: 0,
        amount: s.fee || 0,
        itemType: 'Service'
      }));

      const subtotal = serviceLines.reduce((sum, l) => sum + l.amount, 0);
      const vatAmount = 0;
      const totalAmount = subtotal + vatAmount;

      const nextNumber = `${newInvoicesList.length + 1001}`;
      const invNumber = `INV-${period.replace(/\s+/g, '')}-${client.tin?.slice(-4) || '000'}-${nextNumber}`;

      const newInvoice: InvoiceItem = {
        id: `inv_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}_${createdCount}`,
        invoiceNumber: invNumber,
        collectionNumber: nextNumber,
        clientId: client.id,
        clientName: client.companyName,
        issueDate,
        dueDate,
        subtotal,
        vatAmount,
        totalAmount,
        paidAmount: 0,
        status: 'Draft',
        services: serviceLines,
        payments: [],
        collectionStatus: 'Current',
        billingPeriod: period,
        autoGenerated: true,
        collectionLogs: []
      };

      newInvoicesList.unshift(newInvoice);
      createdInvoices.push(newInvoice);
      createdCount++;
    });

    if (createdCount > 0) {
      setInvoices(newInvoicesList);
      persistState('afms_invoices', newInvoicesList);

      addAuditLog(
        'Recurring Auto-Billing Batch Run',
        `Generated ${createdCount} draft invoice(s) for period ${period} (${frequency} cycle). ${skippedCount} duplicate service lines skipped.`,
        userId,
        userName
      );
    }

    return {
      success: true,
      createdCount,
      skippedCount,
      createdInvoices,
      skippedDetails,
      message: `Auto-billing complete: Generated ${createdCount} draft invoice(s). ${skippedCount} service lines skipped as already billed for ${period}.`
    };
  };

  const updateInvoiceStatus = (invoiceId: string, status: InvoiceItem['status']) => {
    const updated = invoices.map(i => i.id === invoiceId ? { ...i, status } : i);
    setInvoices(updated);
    persistState('afms_invoices', updated);
  };

  const deleteInvoice = (invoiceId: string) => {
    const updated = invoices.filter(i => i.id !== invoiceId);
    setInvoices(updated);
    persistState('afms_invoices', updated);
  };

  const addDocument = (
    docData: Omit<DocumentItem, 'id' | 'uploadDate'>, 
    userId: string = 'system', 
    userName: string = 'System Admin'
  ): DocumentItem => {
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.substring(0, 10);
    const newDoc: DocumentItem = {
      ...docData,
      id: `doc_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      uploadDate: todayStr,
      uploadedAt: docData.uploadedAt || nowIso,
      version: docData.version || '1.0',
      status: docData.status || 'Active',
      versionHistory: docData.versionHistory || []
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    persistState('afms_documents', updated);

    addAuditLog(
      'Document Uploaded',
      `Uploaded document "${newDoc.title}" (${newDoc.fileName}) for client "${newDoc.clientName}". Category: ${newDoc.category}${newDoc.taxablePeriod ? ` • Period: ${newDoc.taxablePeriod}` : ''}`,
      userId,
      userName
    );

    return newDoc;
  };

  const updateDocument = (
    id: string, 
    updates: Partial<DocumentItem>, 
    userId: string = 'system', 
    userName: string = 'System Admin'
  ) => {
    let docTitle = '';
    const updated = documents.map(d => {
      if (d.id === id) {
        docTitle = updates.title || d.title;
        return { ...d, ...updates };
      }
      return d;
    });

    setDocuments(updated);
    persistState('afms_documents', updated);

    addAuditLog(
      'Document Metadata Updated',
      `Updated metadata for document "${docTitle || id}". Changed fields: ${Object.keys(updates).join(', ')}.`,
      userId,
      userName
    );
  };

  const uploadDocumentVersion = (
    id: string, 
    newVersionData: { fileName: string; fileSize: string; fileType?: string; dataUrl?: string; changeReason?: string; notes?: string }, 
    userId: string = 'system', 
    userName: string = 'System Admin'
  ) => {
    const nowIso = new Date().toISOString();
    let docTitle = '';
    let newVerStr = '';

    const updated = documents.map(d => {
      if (d.id === id) {
        docTitle = d.title;
        // Parse current version
        const currentVerNum = typeof d.version === 'number' ? d.version : parseFloat(String(d.version)) || 1.0;
        const nextVerNum = Number((currentVerNum + 1.0).toFixed(1));
        newVerStr = `${nextVerNum}`;

        // Save snapshot of current version into history
        const prevHistory = d.versionHistory || [];
        const currentSnapshot = {
          versionNumber: d.version || '1.0',
          fileName: d.fileName,
          fileSize: d.fileSize,
          fileType: d.fileType,
          uploadedBy: d.uploadedBy,
          uploadedById: d.uploadedById,
          uploadedAt: d.uploadedAt || d.uploadDate || nowIso,
          dataUrl: d.dataUrl,
          downloadUrl: d.downloadUrl,
          notes: d.notes,
          changeReason: newVersionData.changeReason || 'New version upload'
        };

        return {
          ...d,
          fileName: newVersionData.fileName,
          fileSize: newVersionData.fileSize,
          fileType: newVersionData.fileType || d.fileType,
          dataUrl: newVersionData.dataUrl || d.dataUrl,
          version: newVerStr,
          status: 'Active' as const, // Reset superseded status if re-activated
          uploadedBy: userName,
          uploadedById: userId,
          uploadedAt: nowIso,
          uploadDate: nowIso.substring(0, 10),
          notes: newVersionData.notes !== undefined ? newVersionData.notes : d.notes,
          versionHistory: [currentSnapshot, ...prevHistory]
        };
      }
      return d;
    });

    setDocuments(updated);
    persistState('afms_documents', updated);

    addAuditLog(
      'Document Version Uploaded',
      `Uploaded Version ${newVerStr} for document "${docTitle}". File: ${newVersionData.fileName} (${newVersionData.fileSize}). Reason: "${newVersionData.changeReason || 'Updated document version'}"`,
      userId,
      userName
    );
  };

  const archiveDocument = (
    id: string, 
    reason?: string, 
    userId: string = 'system', 
    userName: string = 'System Admin'
  ) => {
    let docTitle = '';
    const updated = documents.map(d => {
      if (d.id === id) {
        docTitle = d.title;
        return { ...d, status: 'Archived' as const };
      }
      return d;
    });

    setDocuments(updated);
    persistState('afms_documents', updated);

    addAuditLog(
      'Document Archived',
      `Archived document "${docTitle || id}". Reason: "${reason || 'Archived by user'}"`,
      userId,
      userName
    );
  };

  const restoreDocument = (
    id: string, 
    userId: string = 'system', 
    userName: string = 'System Admin'
  ) => {
    let docTitle = '';
    const updated = documents.map(d => {
      if (d.id === id) {
        docTitle = d.title;
        return { ...d, status: 'Active' as const };
      }
      return d;
    });

    setDocuments(updated);
    persistState('afms_documents', updated);

    addAuditLog(
      'Document Restored',
      `Restored document "${docTitle || id}" to Active status.`,
      userId,
      userName
    );
  };

  const deleteDocument = (
    id: string, 
    reason?: string, 
    userId: string = 'system', 
    userName: string = 'System Admin'
  ) => {
    let docTitle = '';
    const updated = documents.filter(d => {
      if (d.id === id) {
        docTitle = d.title;
        return false;
      }
      return true;
    });

    setDocuments(updated);
    persistState('afms_documents', updated);

    addAuditLog(
      'Document Deleted',
      `Deleted document record "${docTitle || id}". Reason: "${reason || 'Removed from system'}"`,
      userId,
      userName
    );
  };

  const logDocumentAction = (
    documentId: string, 
    action: string, 
    details: string, 
    userId: string = 'system', 
    userName: string = 'System Admin'
  ) => {
    addAuditLog(
      `Document Audit: ${action}`,
      `Doc #${documentId}: ${details}`,
      userId,
      userName
    );
  };

  // Dynamic Master Options additions
  const addMasterBusinessNature = (nature: string) => {
    if (!masterChoices.businessNatures.includes(nature)) {
      const updated = {
        ...masterChoices,
        businessNatures: [nature, ...masterChoices.businessNatures]
      };
      setMasterChoices(updated);
      persistState('afms_master_choices', updated);
    }
  };

  const deleteMasterBusinessNature = (nature: string) => {
    const updated = {
      ...masterChoices,
      businessNatures: masterChoices.businessNatures.filter(n => n !== nature)
    };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  const addMasterBirOption = (option: CustomDeadlineRule) => {
    const updated = {
      ...masterChoices,
      birTaxOptions: [...masterChoices.birTaxOptions, option]
    };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  const updateMasterBirOption = (id: string, option: CustomDeadlineRule) => {
    const updated = {
      ...masterChoices,
      birTaxOptions: masterChoices.birTaxOptions.map(o => o.id === id ? option : o)
    };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  const deleteMasterBirOption = (idOrCode: string) => {
    const target = idOrCode.toLowerCase();
    const updated = {
      ...masterChoices,
      birTaxOptions: masterChoices.birTaxOptions.filter(o => o.id.toLowerCase() !== target && o.code.toLowerCase() !== target)
    };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  const addMasterBenefitsOption = (option: CustomDeadlineRule) => {
    const updated = {
      ...masterChoices,
      benefitsOptions: [...masterChoices.benefitsOptions, option]
    };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  const updateMasterBenefitsOption = (id: string, option: CustomDeadlineRule) => {
    const updated = {
      ...masterChoices,
      benefitsOptions: masterChoices.benefitsOptions.map(o => o.id === id ? option : o)
    };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  const deleteMasterBenefitsOption = (idOrCode: string) => {
    const target = idOrCode.toLowerCase();
    const updated = {
      ...masterChoices,
      benefitsOptions: masterChoices.benefitsOptions.filter(o => o.id.toLowerCase() !== target && o.code.toLowerCase() !== target)
    };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  const applyMasterDeadlineRuleToAllClients = (rule: CustomDeadlineRule, userId = 'admin', userName = 'System Admin') => {
    // 1. Update master choices first
    let isBir = rule.category === 'BIR';
    let updatedBir = masterChoices.birTaxOptions;
    let updatedBen = masterChoices.benefitsOptions;

    if (isBir) {
      const exists = masterChoices.birTaxOptions.some(o => o.id === rule.id || o.code.toLowerCase() === rule.code.toLowerCase());
      if (exists) {
        updatedBir = masterChoices.birTaxOptions.map(o => (o.id === rule.id || o.code.toLowerCase() === rule.code.toLowerCase()) ? rule : o);
      } else {
        updatedBir = [...masterChoices.birTaxOptions, rule];
      }
    } else {
      const exists = masterChoices.benefitsOptions.some(o => o.id === rule.id || o.code.toLowerCase() === rule.code.toLowerCase());
      if (exists) {
        updatedBen = masterChoices.benefitsOptions.map(o => (o.id === rule.id || o.code.toLowerCase() === rule.code.toLowerCase()) ? rule : o);
      } else {
        updatedBen = [...masterChoices.benefitsOptions, rule];
      }
    }

    const newMaster = {
      ...masterChoices,
      birTaxOptions: updatedBir,
      benefitsOptions: updatedBen
    };
    setMasterChoices(newMaster);
    persistState('afms_master_choices', newMaster);

    // 2. Determine target due date string YYYY-MM-DD
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    let targetDueDate = `${currentYear}-${currentMonth}-${String(rule.deadlineDay || 15).padStart(2, '0')}`;
    if (rule.specificDate) {
      targetDueDate = rule.specificDate;
    } else if (rule.fixedMonthDay) {
      targetDueDate = `${currentYear}-${rule.fixedMonthDay}`;
    } else if (rule.monthlySchedule2026 && rule.monthlySchedule2026.length > 0) {
      // Find upcoming or latest valid monthly schedule
      const validSchedules = rule.monthlySchedule2026.filter(s => s.dueDate && s.dueDate !== 'N/A' && s.dueDate !== 'NONE');
      const upcoming = validSchedules.find(s => new Date(s.dueDate) >= now) || validSchedules[0];
      if (upcoming) {
        targetDueDate = upcoming.dueDate;
      }
    }

    // 3. Find matching clients and update/create compliance schedule items
    const titleToMatch = `${rule.code} - ${rule.name}`;
    let affectedCount = 0;

    setComplianceItems(prevItems => {
      const updatedList = [...prevItems];

      clients.forEach(client => {
        const hasBir = isBir && client.birTaxServices.some(s => s.toLowerCase() === rule.code.toLowerCase());
        const hasBen = !isBir && client.benefitsServices.some(s => s.toLowerCase().includes(rule.code.toLowerCase()) || rule.code.toLowerCase().includes(s.toLowerCase()));

        if (hasBir || hasBen) {
          affectedCount++;
          const idx = updatedList.findIndex(
            ci => ci.clientId === client.id && (ci.title.toLowerCase().includes(rule.code.toLowerCase()) || ci.title === titleToMatch)
          );

          if (idx >= 0) {
            updatedList[idx] = {
              ...updatedList[idx],
              title: titleToMatch,
              dueDate: targetDueDate,
              description: rule.customDescription,
              category: rule.category
            };
          } else {
            updatedList.push({
              id: `comp_${rule.code.replace(/\s+/g, '_')}_${client.id}_${Date.now()}`,
              clientId: client.id,
              clientName: client.companyName,
              title: titleToMatch,
              category: rule.category,
              dueDate: targetDueDate,
              status: 'Pending',
              description: rule.customDescription,
              assignedStaffName: client.assignedStaffName || 'Unassigned'
            });
          }
        }
      });

      persistState('afms_compliance', updatedList);
      return updatedList;
    });

    addAuditLog(
      'Master Deadline Rule Applied To All Clients',
      `Updated master deadline for ${rule.category} (${rule.code}) to ${targetDueDate}. Applied to ${affectedCount} client(s).`,
      userId,
      userName
    );
  };

  const addMasterBank = (bankName: string) => {
    if (!masterChoices.banksList.includes(bankName)) {
      const updated = {
        ...masterChoices,
        banksList: [...masterChoices.banksList, bankName]
      };
      setMasterChoices(updated);
      persistState('afms_master_choices', updated);
    }
  };

  const deleteMasterBank = (bankName: string) => {
    const updated = {
      ...masterChoices,
      banksList: masterChoices.banksList.filter(b => b !== bankName)
    };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  // Master Biller & Catalog Data Management Methods ⭐
  const addBiller = (billerData: Omit<BillerMasterItem, 'id' | 'createdAt' | 'updatedAt'>): BillerMasterItem => {
    const nowIso = new Date().toISOString();
    const newBiller: BillerMasterItem = {
      ...billerData,
      id: `biller_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    const currentList = masterChoices.billerCatalog || DEFAULT_BILLER_CATALOG;
    const updated = [newBiller, ...currentList];
    const newMaster = { ...masterChoices, billerCatalog: updated };
    setMasterChoices(newMaster);
    persistState('afms_master_choices', newMaster);
    addAuditLog(
      'Biller Catalog Item Added',
      `Added biller "${newBiller.code} - ${newBiller.name}" (${newBiller.category}, ${newBiller.paymentType}${newBiller.frequency ? ` - ${newBiller.frequency}` : ''}). Default: ₱${(newBiller.defaultAmount || 0).toLocaleString()}.`,
      'admin',
      'System Admin'
    );
    return newBiller;
  };

  const updateBiller = (id: string, updates: Partial<BillerMasterItem>) => {
    const currentList = masterChoices.billerCatalog || DEFAULT_BILLER_CATALOG;
    let billerName = '';
    const updated = currentList.map(b => {
      if (b.id === id) {
        billerName = updates.name || b.name;
        return { ...b, ...updates, updatedAt: new Date().toISOString() };
      }
      return b;
    });
    const newMaster = { ...masterChoices, billerCatalog: updated };
    setMasterChoices(newMaster);
    persistState('afms_master_choices', newMaster);
    addAuditLog(
      'Biller Catalog Item Updated',
      `Updated biller "${billerName || id}". Changed fields: ${Object.keys(updates).join(', ')}.`,
      'admin',
      'System Admin'
    );
  };

  const deleteBiller = (id: string) => {
    const currentList = masterChoices.billerCatalog || DEFAULT_BILLER_CATALOG;
    const target = currentList.find(b => b.id === id);
    const updated = currentList.filter(b => b.id !== id);
    const newMaster = { ...masterChoices, billerCatalog: updated };
    setMasterChoices(newMaster);
    persistState('afms_master_choices', newMaster);
    addAuditLog(
      'Biller Catalog Item Removed',
      `Removed biller "${target?.code || id} - ${target?.name || ''}" from Biller Master Catalog.`,
      'admin',
      'System Admin'
    );
  };

  const toggleBillerActive = (id: string) => {
    const currentList = masterChoices.billerCatalog || DEFAULT_BILLER_CATALOG;
    let nowActive = false;
    let billerName = '';
    const updated = currentList.map(b => {
      if (b.id === id) {
        nowActive = !b.active;
        billerName = b.name;
        return { ...b, active: nowActive, updatedAt: new Date().toISOString() };
      }
      return b;
    });
    const newMaster = { ...masterChoices, billerCatalog: updated };
    setMasterChoices(newMaster);
    persistState('afms_master_choices', newMaster);
    addAuditLog(
      'Biller Status Toggled',
      `Toggled active status of biller "${billerName}" to ${nowActive ? 'Active' : 'Inactive'}.`,
      'admin',
      'System Admin'
    );
  };

  const syncBillersFromRules = (): { addedCount: number; message: string } => {
    const currentList = masterChoices.billerCatalog || DEFAULT_BILLER_CATALOG;
    let addedCount = 0;
    const newBillers: BillerMasterItem[] = [];

    // Check BIR Tax Options
    masterChoices.birTaxOptions.forEach(birRule => {
      const exists = currentList.some(b => b.code.toLowerCase() === birRule.code.toLowerCase() || (b.sourceRuleCode && b.sourceRuleCode.toLowerCase() === birRule.code.toLowerCase()));
      if (!exists) {
        addedCount++;
        newBillers.push({
          id: `biller_bir_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
          code: birRule.code,
          shortName: birRule.code,
          name: `${birRule.code} ${birRule.name}`,
          category: 'BIR Tax Return',
          paymentType: 'Recurring',
          frequency: (birRule.frequency === 'Quarterly' ? 'Quarterly' : birRule.frequency === 'Annually' ? 'Annually' : 'Monthly') as any,
          defaultAmount: 0,
          description: birRule.customDescription || `BIR Form ${birRule.code}`,
          sourceRuleCode: birRule.code,
          active: true,
          isSystemDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    // Check Benefits Options
    masterChoices.benefitsOptions.forEach(benRule => {
      const exists = currentList.some(b => b.code.toLowerCase() === benRule.code.toLowerCase() || (b.sourceRuleCode && b.sourceRuleCode.toLowerCase() === benRule.code.toLowerCase()));
      if (!exists) {
        addedCount++;
        newBillers.push({
          id: `biller_ben_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
          code: benRule.code,
          shortName: benRule.code,
          name: benRule.name,
          category: 'Statutory Benefits / Loans',
          paymentType: 'Recurring',
          frequency: (benRule.frequency === 'Quarterly' ? 'Quarterly' : benRule.frequency === 'Annually' ? 'Annually' : 'Monthly') as any,
          defaultAmount: 0,
          description: benRule.customDescription || benRule.name,
          sourceRuleCode: benRule.code,
          active: true,
          isSystemDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    if (addedCount > 0) {
      const updated = [...newBillers, ...currentList];
      const newMaster = { ...masterChoices, billerCatalog: updated };
      setMasterChoices(newMaster);
      persistState('afms_master_choices', newMaster);
      addAuditLog(
        'Biller Catalog Synced',
        `Synced ${addedCount} new compliance item(s) from BIR & Benefits Master Rules into Biller Master Data.`,
        'admin',
        'System Admin'
      );
    }

    return {
      addedCount,
      message: addedCount > 0 ? `Successfully synced ${addedCount} new biller(s) from Master BIR & Benefits Rules!` : 'All BIR and Benefits compliance rules are already present in the Biller Master Catalog.'
    };
  };

  const addFormLinkage = (primaryCodeOrObj: string | FormLinkage, linkedCodes?: string[], description?: string) => {
    const existing = masterChoices.formLinkages || [];
    let newRule: FormLinkage;

    if (typeof primaryCodeOrObj === 'object' && primaryCodeOrObj !== null) {
      newRule = {
        id: primaryCodeOrObj.id || `fl_${Date.now()}`,
        primaryCode: primaryCodeOrObj.primaryCode,
        linkedCodes: Array.isArray(primaryCodeOrObj.linkedCodes) ? primaryCodeOrObj.linkedCodes : [],
        description: primaryCodeOrObj.description || ''
      };
    } else {
      newRule = {
        id: `fl_${Date.now()}`,
        primaryCode: String(primaryCodeOrObj),
        linkedCodes: Array.isArray(linkedCodes) ? linkedCodes : [],
        description: description || ''
      };
    }

    const updatedLinkages = existing.filter(l => 
      l.id !== newRule.id && l.primaryCode.toLowerCase() !== newRule.primaryCode.toLowerCase()
    );
    updatedLinkages.push(newRule);
    const updated = { ...masterChoices, formLinkages: updatedLinkages };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  // ==========================================
  // HOLIDAY MASTER MANAGEMENT ⭐
  // ==========================================
  const addHoliday = (holiday: Omit<HolidayItem, 'id'>) => {
    const newHol: HolidayItem = {
      ...holiday,
      id: `hol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    const currentHols = masterChoices.holidays || DEFAULT_HOLIDAYS;
    const updatedHols = [...currentHols, newHol].sort((a, b) => a.date.localeCompare(b.date));
    const updated = { ...masterChoices, holidays: updatedHols };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
    addAuditLog('ADD_HOLIDAY', `Added holiday "${newHol.name}" on ${newHol.date} (${newHol.scope}).`, 'admin', 'System Admin');
  };

  const updateHoliday = (id: string, updates: Partial<HolidayItem>) => {
    const currentHols = masterChoices.holidays || DEFAULT_HOLIDAYS;
    const updatedHols = currentHols.map(h => h.id === id ? { ...h, ...updates } : h).sort((a, b) => a.date.localeCompare(b.date));
    const updated = { ...masterChoices, holidays: updatedHols };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
    addAuditLog('UPDATE_HOLIDAY', `Updated holiday ID ${id}.`, 'admin', 'System Admin');
  };

  const deleteHoliday = (id: string) => {
    const currentHols = masterChoices.holidays || DEFAULT_HOLIDAYS;
    const targetHol = currentHols.find(h => h.id === id);
    const updatedHols = currentHols.filter(h => h.id !== id);
    const updated = { ...masterChoices, holidays: updatedHols };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
    addAuditLog('DELETE_HOLIDAY', `Deleted holiday "${targetHol?.name || id}".`, 'admin', 'System Admin');
  };

  // ==========================================
  // DEADLINE EXTENSIONS & OVERRIDES ⭐
  // ==========================================
  const addDeadlineExtension = (ext: Omit<DeadlineExtensionRule, 'id' | 'createdAt'>) => {
    const newExt: DeadlineExtensionRule = {
      ...ext,
      id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString().substring(0, 10)
    };
    const currentExts = masterChoices.deadlineExtensions || DEFAULT_DEADLINE_EXTENSIONS;
    const updatedExts = [newExt, ...currentExts];
    const updated = { ...masterChoices, deadlineExtensions: updatedExts };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
    addAuditLog('ADD_DEADLINE_EXTENSION', `Added deadline extension "${newExt.title}" to ${newExt.extendedDeadlineDate}.`, 'admin', 'System Admin');
  };

  const updateDeadlineExtension = (id: string, updates: Partial<DeadlineExtensionRule>) => {
    const currentExts = masterChoices.deadlineExtensions || DEFAULT_DEADLINE_EXTENSIONS;
    const updatedExts = currentExts.map(e => e.id === id ? { ...e, ...updates } : e);
    const updated = { ...masterChoices, deadlineExtensions: updatedExts };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
    addAuditLog('UPDATE_DEADLINE_EXTENSION', `Updated deadline extension ID ${id}.`, 'admin', 'System Admin');
  };

  const deleteDeadlineExtension = (id: string) => {
    const currentExts = masterChoices.deadlineExtensions || DEFAULT_DEADLINE_EXTENSIONS;
    const target = currentExts.find(e => e.id === id);
    const updatedExts = currentExts.filter(e => e.id !== id);
    const updated = { ...masterChoices, deadlineExtensions: updatedExts };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
    addAuditLog('DELETE_DEADLINE_EXTENSION', `Deleted extension rule "${target?.title || id}".`, 'admin', 'System Admin');
  };

  // ==========================================
  // WEEKEND & WORKING DAY RULES ⭐
  // ==========================================
  const updateWeekendConfig = (configUpdates: Partial<WeekendAdjustmentConfig>) => {
    const current = masterChoices.weekendConfig || DEFAULT_WEEKEND_CONFIG;
    const updatedConfig: WeekendAdjustmentConfig = { ...current, ...configUpdates };
    const updated = { ...masterChoices, weekendConfig: updatedConfig };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
    addAuditLog('UPDATE_WEEKEND_CONFIG', `Updated weekend adjustment rule to ${updatedConfig.rule}.`, 'admin', 'System Admin');
  };

  // ==========================================
  // CENTRALIZED CLIENT DEADLINE ENGINE ACCESSORS ⭐
  // ==========================================
  const calculateClientDeadlineForPeriod = (
    clientId: string,
    complianceCode: string,
    month: string,
    year: number = 2026
  ): CalculatedClientDeadline | null => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return null;

    const allRules: CustomDeadlineRule[] = [
      ...(masterChoices.birTaxOptions || []),
      ...(masterChoices.benefitsOptions || [])
    ];

    let rule = allRules.find(r => r.code.toLowerCase() === complianceCode.toLowerCase());
    if (!rule) {
      const codeUpper = complianceCode.toUpperCase();
      let frequency: 'Monthly' | 'Quarterly' | 'Annually' = 'Monthly';
      if (codeUpper.includes('Q') || codeUpper.includes('QUARTER')) frequency = 'Quarterly';
      if (codeUpper === 'ITR' || codeUpper.includes('ANNUAL') || codeUpper.includes('1702') || codeUpper.includes('1701')) frequency = 'Annually';

      rule = {
        id: complianceCode,
        code: complianceCode,
        name: complianceCode,
        category: complianceCode.toLowerCase().includes('sss') || complianceCode.toLowerCase().includes('philhealth') || complianceCode.toLowerCase().includes('hdmf') ? 'Benefits' : 'BIR',
        frequency,
        deadlineDay: 10,
        customDescription: ''
      };
    }

    return calculateClientDeadline({
      client,
      rule,
      month,
      year,
      masterChoices
    });
  };

  const calculateAllClientDeadlines = (
    month: string,
    year: number = 2026,
    filterParams: any = {}
  ): CalculatedClientDeadline[] => {
    return calculateAllClientDeadlinesForMonth({
      clients,
      masterChoices,
      month,
      year,
      ...filterParams
    });
  };

  const updateFormLinkage = (idOrCode: string, updates: { primaryCode?: string; linkedCodes?: string[]; description?: string } | FormLinkage) => {
    const existing = masterChoices.formLinkages || [];
    let targetId = idOrCode;
    let up: { primaryCode?: string; linkedCodes?: string[]; description?: string };

    if (typeof idOrCode === 'object' && idOrCode !== null) {
      const obj = idOrCode as FormLinkage;
      targetId = obj.id || obj.primaryCode;
      up = obj;
    } else {
      up = updates as { primaryCode?: string; linkedCodes?: string[]; description?: string };
    }

    const updatedLinkages = existing.map(l => {
      if (l.id === targetId || l.primaryCode.toLowerCase() === String(targetId).toLowerCase()) {
        return {
          ...l,
          primaryCode: up.primaryCode || l.primaryCode,
          linkedCodes: Array.isArray(up.linkedCodes) ? up.linkedCodes : (l.linkedCodes || []),
          description: up.description !== undefined ? up.description : l.description
        };
      }
      return l;
    });

    const updated = { ...masterChoices, formLinkages: updatedLinkages };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  const deleteFormLinkage = (idOrCode: string) => {
    const existing = masterChoices.formLinkages || [];
    const target = String(idOrCode).toLowerCase();
    const updatedLinkages = existing.filter(l => 
      l.id.toLowerCase() !== target && l.primaryCode.toLowerCase() !== target
    );
    const updated = { ...masterChoices, formLinkages: updatedLinkages };
    setMasterChoices(updated);
    persistState('afms_master_choices', updated);
  };

  // ==========================================
  // INTERNAL FIRM EMPLOYEE ACTIONS ⭐
  // ==========================================
  const addEmployee = (emp: Omit<CompanyEmployee, 'id'>) => {
    const newEmp: CompanyEmployee = {
      ...emp,
      id: `emp_${Date.now()}`
    };
    const updated = [newEmp, ...employees];
    setEmployees(updated);
    persistState('afms_employees', updated);
  };

  const updateEmployee = (id: string, updates: Partial<CompanyEmployee>) => {
    const updated = employees.map(e => e.id === id ? { ...e, ...updates } : e);
    setEmployees(updated);
    persistState('afms_employees', updated);
  };

  const deleteEmployee = (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    setEmployees(updated);
    persistState('afms_employees', updated);
  };

  // ==========================================
  // LEAVE TRACKER ACTIONS ⭐
  // ==========================================
  const addLeaveRecord = (leave: Omit<LeaveRecord, 'id' | 'createdAt'>) => {
    const newLeave: LeaveRecord = {
      ...leave,
      id: `leave_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updated = [newLeave, ...leaveRecords];
    setLeaveRecords(updated);
    persistState('afms_leave_records', updated);
  };

  const updateLeaveStatus = (id: string, status: LeaveRecord['status'], approvedBy?: string) => {
    const leaveToUpdate = leaveRecords.find(l => l.id === id);
    if (!leaveToUpdate) return;

    const updatedLeaves = leaveRecords.map(l => l.id === id ? { ...l, status, approvedBy: approvedBy || l.approvedBy } : l);
    setLeaveRecords(updatedLeaves);
    persistState('afms_leave_records', updatedLeaves);

    // If approved and isPaid, deduct from employee leave balance
    if (status === 'Approved' && leaveToUpdate.isPaid) {
      setEmployees(prev => {
        const updatedEmps = prev.map(emp => {
          if (emp.id === leaveToUpdate.employeeId) {
            let sil = emp.silBalance;
            let vl = emp.vlBalance;
            let sl = emp.slBalance;
            const days = leaveToUpdate.totalDays;

            if (leaveToUpdate.leaveType === 'Service Incentive Leave (SIL)') {
              sil = Math.max(0, sil - days);
            } else if (leaveToUpdate.leaveType === 'Vacation Leave') {
              vl = Math.max(0, vl - days);
            } else if (leaveToUpdate.leaveType === 'Sick Leave') {
              sl = Math.max(0, sl - days);
            }

            return { ...emp, silBalance: sil, vlBalance: vl, slBalance: sl };
          }
          return emp;
        });
        persistState('afms_employees', updatedEmps);
        return updatedEmps;
      });
    }
  };

  // ==========================================
  // VALE (CASH ADVANCE) TRACKER ACTIONS ⭐
  // ==========================================
  const addValeRecord = (vale: Omit<ValeRecord, 'id' | 'createdAt' | 'repayments' | 'status'>) => {
    const newVale: ValeRecord = {
      ...vale,
      id: `vale_${Date.now()}`,
      status: 'Active',
      remainingBalance: vale.amountGiven,
      repayments: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updatedVales = [newVale, ...valeRecords];
    setValeRecords(updatedVales);
    persistState('afms_vale_records', updatedVales);

    // Update employee currentValeBalance
    setEmployees(prev => {
      const updatedEmps = prev.map(e => {
        if (e.id === vale.employeeId) {
          return { ...e, currentValeBalance: (e.currentValeBalance || 0) + vale.amountGiven, defaultValeDeduction: vale.cutoffDeductionAmount || e.defaultValeDeduction };
        }
        return e;
      });
      persistState('afms_employees', updatedEmps);
      return updatedEmps;
    });
  };

  const addValeRepayment = (valeId: string, amount: number, remarks: string, payrollCutoffLabel?: string) => {
    const updatedVales = valeRecords.map(v => {
      if (v.id === valeId) {
        const newRepayment = {
          id: `rep_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amountPaid: amount,
          payrollCutoffLabel,
          remarks
        };
        const newRem = Math.max(0, v.remainingBalance - amount);
        const newStatus: ValeRecord['status'] = newRem === 0 ? 'Fully Paid' : 'Active';
        return {
          ...v,
          remainingBalance: newRem,
          status: newStatus,
          repayments: [...v.repayments, newRepayment]
        };
      }
      return v;
    });

    setValeRecords(updatedVales);
    persistState('afms_vale_records', updatedVales);

    // Also reduce employee's total currentValeBalance
    const targetVale = valeRecords.find(v => v.id === valeId);
    if (targetVale) {
      setEmployees(prev => {
        const updatedEmps = prev.map(e => {
          if (e.id === targetVale.employeeId) {
            return { ...e, currentValeBalance: Math.max(0, (e.currentValeBalance || 0) - amount) };
          }
          return e;
        });
        persistState('afms_employees', updatedEmps);
        return updatedEmps;
      });
    }
  };

  const updateValeRecord = (id: string, updates: Partial<ValeRecord>) => {
    const updated = valeRecords.map(v => v.id === id ? { ...v, ...updates } : v);
    setValeRecords(updated);
    persistState('afms_vale_records', updated);
  };

  const deleteValeRecord = (id: string) => {
    const updated = valeRecords.filter(v => v.id !== id);
    setValeRecords(updated);
    persistState('afms_vale_records', updated);
  };

  // ==========================================
  // PAYROLL RUN ACTIONS ⭐
  // ==========================================
  const addPayrollRun = (run: Omit<PayrollRun, 'id' | 'createdAt'>) => {
    const newRun: PayrollRun = {
      ...run,
      id: `pr_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newRun, ...payrollRuns];
    setPayrollRuns(updated);
    persistState('afms_payroll_runs', updated);

    // If created directly as Approved or Paid, trigger Vale repayments if any item has valeDeduction > 0
    if (newRun.status === 'Approved' || newRun.status === 'Paid') {
      processPayrollValeDeductions(newRun);
    }
  };

  const updatePayrollRunStatus = (id: string, status: PayrollRun['status'], approvedBy?: string) => {
    const targetRun = payrollRuns.find(r => r.id === id);
    if (!targetRun) return;

    const updatedRuns = payrollRuns.map(r => r.id === id ? { ...r, status, approvedBy: approvedBy || r.approvedBy } : r);
    setPayrollRuns(updatedRuns);
    persistState('afms_payroll_runs', updatedRuns);

    if (status === 'Approved' || status === 'Paid') {
      processPayrollValeDeductions(targetRun);
    }
  };

  const processPayrollValeDeductions = (run: PayrollRun) => {
    run.items.forEach(item => {
      if (item.valeDeduction > 0) {
        // Find active vale record for employee
        const activeVale = valeRecords.find(v => v.employeeId === item.employeeId && v.status === 'Active');
        if (activeVale) {
          addValeRepayment(activeVale.id, item.valeDeduction, `Payroll Auto-Deduction (${run.cutoffPeriod})`, run.cutoffPeriod);
        }
      }
    });
  };

  const deletePayrollRun = (id: string) => {
    const updated = payrollRuns.filter(r => r.id !== id);
    setPayrollRuns(updated);
    persistState('afms_payroll_runs', updated);
  };

  // ==========================================
  // COMPANY EXPENSES ACTIONS ⭐
  // ==========================================
  const addCompanyExpense = (expense: Omit<CompanyExpense, 'id' | 'createdAt'>) => {
    const newExpense: CompanyExpense = {
      ...expense,
      id: `exp_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newExpense, ...companyExpenses];
    setCompanyExpenses(updated);
    persistState('afms_company_expenses', updated);
  };

  const updateCompanyExpense = (id: string, updates: Partial<CompanyExpense>) => {
    const updated = companyExpenses.map(e => e.id === id ? { ...e, ...updates } : e);
    setCompanyExpenses(updated);
    persistState('afms_company_expenses', updated);
  };

  const markExpensePaid = (id: string, paidDetails: NonNullable<CompanyExpense['paidDetails']>) => {
    const updated = companyExpenses.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status: 'Paid' as const,
          paidDetails
        };
      }
      return e;
    });
    setCompanyExpenses(updated);
    persistState('afms_company_expenses', updated);
  };

  const deleteCompanyExpense = (id: string) => {
    const updated = companyExpenses.filter(e => e.id !== id);
    setCompanyExpenses(updated);
    persistState('afms_company_expenses', updated);
  };

  // Phase 9 Integrity, Sync & Backup Implementations ⭐
  const getNextInvoiceNumber = (): string => {
    return reserveNextInvoiceNumber(invoices);
  };

  const runIntegrityScan = (): DataHealthReport => {
    return runDataHealthCheck({
      clients,
      clientServices,
      invoices,
      payments,
      complianceItems,
      tasks,
      documents,
      payables,
      credentials
    });
  };

  const autoRepairIntegrity = (): { repairedCount: number; reportLog: string[] } => {
    const result = autoRepairState({
      clients,
      clientServices,
      invoices,
      payments,
      complianceItems,
      tasks,
      documents,
      payables,
      credentials
    });

    if (result.repairedCount > 0) {
      setClientServices(result.newState.clientServices); persistState('afms_client_services', result.newState.clientServices);
      setComplianceItems(result.newState.complianceItems); persistState('afms_compliance', result.newState.complianceItems);
      setTasks(result.newState.tasks); persistState('afms_tasks', result.newState.tasks);
      setInvoices(result.newState.invoices); persistState('afms_invoices', result.newState.invoices);
    }

    return { repairedCount: result.repairedCount, reportLog: result.reportLog };
  };

  const resolveConflict = (
    conflictId: string, 
    choice: 'KEEP_LOCAL' | 'APPLY_INCOMING' | 'MERGE', 
    resolvedBy: string, 
    resolvedByName: string
  ) => {
    const updated = syncConflicts.map(c => {
      if (c.id === conflictId) {
        return {
          ...c,
          status: 'RESOLVED' as const,
          resolvedBy: resolvedByName,
          resolvedAt: new Date().toISOString(),
          resolutionChoice: choice
        };
      }
      return c;
    });
    setSyncConflicts(updated);
    addAuditLog('CONFLICT_RESOLVED', `Conflict ${conflictId} resolved choosing ${choice}`, resolvedBy, resolvedByName);
  };

  const updateAutoBackupSchedule = (updates: Partial<AutoBackupSchedule>) => {
    const next = { ...autoBackupSchedule, ...updates };
    setAutoBackupSchedule(next);
    persistState('afms_auto_backup_schedule', next);
  };

  const runAutoBackupNow = (createdByName: string, createdById: string): string => {
    const fullBackup = generateFullDatabaseBackup(
      {
        clients, clientServices, dynamicSections, payables, complianceItems, tasks, invoices, documents, credentials, auditLogs, masterChoices, employees, leaveRecords, valeRecords, payrollRuns, companyExpenses, payments, collectionLogs, usedCrNumbers
      },
      createdByName,
      createdById
    );
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    updateAutoBackupSchedule({
      lastBackupTimestamp: new Date().toISOString(),
      lastBackupStatus: 'SUCCESS'
    });
    addAuditLog('SYSTEM_BACKUP', `Full database backup generated (Checksum: ${fullBackup.metadata.checksum})`, createdById, createdByName);
    return jsonStr;
  };

  const safeRestoreDatabase = (
    jsonString: string, 
    superAdminUserId: string, 
    superAdminName: string
  ): { success: boolean; message: string; repairedCount?: number } => {
    const verification = verifyBackupFile(jsonString);
    if (!verification.isValid || !verification.backupObj) {
      return { success: false, message: verification.error || 'Backup file verification failed.' };
    }

    const backupObj = verification.backupObj;
    const appData = backupObj.appData;

    // Save pre-restore safety snapshot in IndexedDB
    const currentState = {
      clients, clientServices, dynamicSections, payables, complianceItems, tasks, invoices, documents, credentials, auditLogs, masterChoices, employees, leaveRecords, valeRecords, payrollRuns, companyExpenses, payments, collectionLogs, usedCrNumbers
    };
    saveLocalData('afms_pre_restore_safety_snapshot', currentState);

    if (appData.clients) { setClients(appData.clients); persistState('afms_clients', appData.clients); }
    if (appData.clientServices) { setClientServices(appData.clientServices); persistState('afms_client_services', appData.clientServices); }
    if (appData.dynamicSections) { setDynamicSections(appData.dynamicSections); persistState('afms_dynamic_sections', appData.dynamicSections); }
    if (appData.payables) { setPayables(appData.payables); persistState('afms_payables', appData.payables); }
    if (appData.complianceItems) { setComplianceItems(appData.complianceItems); persistState('afms_compliance', appData.complianceItems); }
    if (appData.tasks) { setTasks(appData.tasks); persistState('afms_tasks', appData.tasks); }
    if (appData.invoices) { setInvoices(appData.invoices); persistState('afms_invoices', appData.invoices); }
    if (appData.documents) { setDocuments(appData.documents); persistState('afms_documents', appData.documents); }
    if (appData.credentials) { setCredentials(appData.credentials); persistState('afms_credentials', appData.credentials); }
    if (appData.masterChoices) { setMasterChoices(appData.masterChoices); persistState('afms_master_choices', appData.masterChoices); }
    if (appData.employees) { setEmployees(appData.employees); persistState('afms_employees', appData.employees); }
    if (appData.leaveRecords) { setLeaveRecords(appData.leaveRecords); persistState('afms_leave_records', appData.leaveRecords); }
    if (appData.valeRecords) { setValeRecords(appData.valeRecords); persistState('afms_vale_records', appData.valeRecords); }
    if (appData.payrollRuns) { setPayrollRuns(appData.payrollRuns); persistState('afms_payroll_runs', appData.payrollRuns); }
    if (appData.companyExpenses) { setCompanyExpenses(appData.companyExpenses); persistState('afms_company_expenses', appData.companyExpenses); }
    if (appData.payments) { setPayments(appData.payments); persistState('afms_payments', appData.payments); }
    if (appData.collectionLogs) { setCollectionLogs(appData.collectionLogs); persistState('afms_collection_logs', appData.collectionLogs); }
    if (appData.usedCrNumbers) { setUsedCrNumbers(appData.usedCrNumbers); persistState('afms_used_cr_numbers', appData.usedCrNumbers); }

    addAuditLog(
      'SYSTEM_RESTORE',
      `Database safely restored from backup file (Checksum: ${backupObj.metadata.checksum}). Pre-restore safety snapshot created in IndexedDB.`,
      superAdminUserId,
      superAdminName
    );

    return { success: true, message: 'Database successfully restored from verified backup file.' };
  };

  // Backup JSON export/import
  const exportBackupData = () => {
    return runAutoBackupNow('User Export', 'user_export');
  };

  const importBackupData = (jsonString: string): boolean => {
    const res = safeRestoreDatabase(jsonString, 'system', 'System User');
    return res.success;
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        clientServices,
        addClientService,
        updateClientService,
        suspendClientService,
        endClientService,
        restoreClientService,
        getClientServices,
        dynamicSections,
        payables,
        complianceItems,
        tasks,
        invoices,
        documents,
        credentials,
        auditLogs,
        masterChoices,
        syncStatus,
        employees,
        leaveRecords,
        valeRecords,
        payrollRuns,
        companyExpenses,
        addClient,
        updateClient,
        deleteClient,
        archiveClient,
        restoreClient,
        addDynamicSection,
        updateDynamicSection,
        deleteDynamicSection,
        addPayable,
        tagPayablePaid,
        amendPayablePayment,
        cancelPayablePayment,
        deletePayable,
        resetPayableAssessment,
        addComplianceItem,
        updateComplianceStatus,
        addTask,
        updateTaskStatus,
        updateTask,
        submitTaskForReview,
        approveTask,
        returnTaskForCorrection,
        overrideTaskDeadline,
        reassignTask,
        deleteTask,
        generateRecurringComplianceTasks,
        addInvoice,
        updateInvoice,
        recordInvoicePayment,
        editInvoicePayment,
        getNextInvoiceNumber,
        getNextCrNumber,
        isCrNumberUsed,
        getNextCollectionNumber,
        isCollectionNumberUsed,
        usedCrNumbers,
        updateInvoiceStatus,
        deleteInvoice,
        addCredential,
        updateCredential,
        deleteCredential,
        saveCustomService,
        addDocument,
        updateDocument,
        uploadDocumentVersion,
        archiveDocument,
        restoreDocument,
        deleteDocument,
        logDocumentAction,
        addMasterBusinessNature,
        deleteMasterBusinessNature,
        addMasterBirOption,
        updateMasterBirOption,
        deleteMasterBirOption,
        addMasterBenefitsOption,
        updateMasterBenefitsOption,
        deleteMasterBenefitsOption,
        applyMasterDeadlineRuleToAllClients,
        addMasterBank,
        deleteMasterBank,
        billerCatalog: masterChoices.billerCatalog || DEFAULT_BILLER_CATALOG,
        addBiller,
        updateBiller,
        deleteBiller,
        toggleBillerActive,
        syncBillersFromRules,
        addFormLinkage,
        updateFormLinkage,
        deleteFormLinkage,
        addHoliday,
        updateHoliday,
        deleteHoliday,
        addDeadlineExtension,
        updateDeadlineExtension,
        deleteDeadlineExtension,
        updateWeekendConfig,
        calculateClientDeadlineForPeriod,
        calculateAllClientDeadlines,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addLeaveRecord,
        updateLeaveStatus,
        addValeRecord,
        addValeRepayment,
        updateValeRecord,
        deleteValeRecord,
        addPayrollRun,
        updatePayrollRunStatus,
        deletePayrollRun,
        addCompanyExpense,
        updateCompanyExpense,
        markExpensePaid,
        deleteCompanyExpense,
        payments,
        cancelInvoicePayment,
        getInvoicePayments,
        getInvoiceBalance,
        collectionLogs,
        addCollectionLog,
        generateRecurringInvoices,
        addAuditLog,
        exportBackupData,
        importBackupData,
        syncConflicts,
        resolveConflict,
        runIntegrityScan,
        autoRepairIntegrity,
        autoBackupSchedule,
        updateAutoBackupSchedule,
        runAutoBackupNow,
        safeRestoreDatabase,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
