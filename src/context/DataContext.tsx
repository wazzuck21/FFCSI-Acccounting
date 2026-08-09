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
  CompanyExpense
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
  INITIAL_COMPANY_EXPENSES
} from '../data/seedData';
import { 
  DEFAULT_BANKS, 
  DEFAULT_BUSINESS_NATURES, 
  DEFAULT_BIR_TAX_OPTIONS, 
  DEFAULT_BENEFITS_OPTIONS 
} from '../data/masterTables';
import { saveLocalData, getLocalData } from '../lib/idbStorage';

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

  // Actions
  addClient: (client: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>) => ClientProfile;
  updateClient: (id: string, updates: Partial<ClientProfile>) => void;
  deleteClient: (id: string) => void;
  
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
  
  addInvoice: (invoice: Omit<InvoiceItem, 'id' | 'invoiceNumber'>) => void;
  updateInvoice: (invoiceId: string, updates: Partial<InvoiceItem>, modificationDetails?: string, modifiedBy?: string) => void;
  recordInvoicePayment: (invoiceId: string, paymentDetails: { amount: number; paymentDate: string; paymentMethod: string; officialReceiptNumber?: string; collectionReceiptNumber?: string; notes?: string; updatedServices?: InvoiceItem['services'] }, userId?: string, userName?: string) => { success: boolean; message: string };
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

  addDocument: (doc: Omit<DocumentItem, 'id' | 'uploadDate'>) => void;
  
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
  
  // Linked Forms & Choices ⭐
  addFormLinkage: (primaryCode: string, linkedCodes: string[], description?: string) => void;
  updateFormLinkage: (primaryCode: string, linkedCodes: string[], description?: string) => void;
  deleteFormLinkage: (primaryCode: string) => void;
  
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

  // Internal Company Payroll, HR, Leave & Vale ⭐
  const [employees, setEmployees] = useState<CompanyEmployee[]>(INITIAL_EMPLOYEES);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>(INITIAL_LEAVE_RECORDS);
  const [valeRecords, setValeRecords] = useState<ValeRecord[]>(INITIAL_VALE_RECORDS);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(INITIAL_PAYROLL_RUNS);

  // Company Expenses ⭐
  const [companyExpenses, setCompanyExpenses] = useState<CompanyExpense[]>(INITIAL_COMPANY_EXPENSES);
  
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
    ]
  });

  const [syncStatus, setSyncStatus] = useState<'Online' | 'Offline' | 'Syncing'>('Online');

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setSyncStatus('Online');
    const handleOffline = () => setSyncStatus('Offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setSyncStatus('Offline');

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

        setMasterChoices({
          businessNatures: storedMaster.businessNatures || DEFAULT_BUSINESS_NATURES,
          birTaxOptions: [...mergedBirOptions, ...extraBir],
          benefitsOptions: [...mergedBenOptions, ...extraBen],
          banksList: storedMaster.banksList || DEFAULT_BANKS,
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
          ]
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

  const deleteClient = (id: string) => {
    const updated = clients.filter(c => c.id !== id);
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
    const newPayable: PayableRecord = {
      ...data,
      id: `pay_${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    const updated = [newPayable, ...payables];
    setPayables(updated);
    persistState('afms_payables', updated);

    // Automatically sync/add to Compliance Items if status is Unpaid
    if (data.status === 'Unpaid') {
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

    return newPayable;
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

    const updatedPayables = payables.map(p => {
      if (p.id === payableId) {
        return {
          ...p,
          status: 'Paid' as const,
          paymentDetails: paymentInfo,
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

  // Tasks
  const addTask = (taskData: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = {
      ...taskData,
      id: `task_${Date.now()}`,
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
          completedAt: status === 'Completed' ? new Date().toISOString() : t.completedAt
        };
      }
      return t;
    });
    setTasks(updated);
    persistState('afms_tasks', updated);
  };

  // Invoices & Documents
  const addInvoice = (invoiceData: Omit<InvoiceItem, 'id' | 'invoiceNumber'>) => {
    const newInv: InvoiceItem = {
      ...invoiceData,
      id: `inv_${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    const updated = [newInv, ...invoices];
    setInvoices(updated);
    persistState('afms_invoices', updated);
  };

  const recordInvoicePayment = (
    invoiceId: string, 
    paymentDetails: { amount: number; paymentDate: string; paymentMethod: string; officialReceiptNumber?: string; collectionReceiptNumber?: string; notes?: string; updatedServices?: InvoiceItem['services'] },
    userId: string = 'system',
    userName: string = 'System Admin'
  ) => {
    const targetInv = invoices.find(i => i.id === invoiceId);
    if (!targetInv) {
      return { success: false, message: 'Invoice not found.' };
    }

    const newPaidAmount = (targetInv.paidAmount || 0) + paymentDetails.amount;
    let newStatus: InvoiceItem['status'] = targetInv.status;

    if (newPaidAmount >= targetInv.totalAmount) {
      newStatus = 'Paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'Partially Paid';
    }

    const crToSave = paymentDetails.collectionReceiptNumber || paymentDetails.officialReceiptNumber;
    if (crToSave) {
      const cleanDigits = crToSave.replace(/\D/g, '');
      const newCrList = Array.from(new Set([...usedCrNumbers, cleanDigits, crToSave].filter(Boolean)));
      setUsedCrNumbers(newCrList);
      persistState('afms_used_cr_numbers', newCrList);
    }

    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          paidAmount: newPaidAmount,
          status: newStatus,
          paymentDate: paymentDetails.paymentDate,
          paymentMethod: paymentDetails.paymentMethod,
          officialReceiptNumber: paymentDetails.officialReceiptNumber || inv.officialReceiptNumber,
          collectionReceiptNumber: paymentDetails.collectionReceiptNumber || inv.collectionReceiptNumber || paymentDetails.officialReceiptNumber,
          services: paymentDetails.updatedServices || inv.services
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

  const addDocument = (docData: Omit<DocumentItem, 'id' | 'uploadDate'>) => {
    const newDoc: DocumentItem = {
      ...docData,
      id: `doc_${Date.now()}`,
      uploadDate: new Date().toISOString().substring(0, 10),
    };
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    persistState('afms_documents', updated);
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

  // Backup JSON export/import
  const exportBackupData = () => {
    const data = {
      clients,
      dynamicSections,
      payables,
      complianceItems,
      tasks,
      invoices,
      documents,
      auditLogs,
      masterChoices,
      employees,
      leaveRecords,
      valeRecords,
      payrollRuns,
      companyExpenses,
      exportTimestamp: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  };

  const importBackupData = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.clients) setClients(parsed.clients);
      if (parsed.dynamicSections) setDynamicSections(parsed.dynamicSections);
      if (parsed.payables) setPayables(parsed.payables);
      if (parsed.complianceItems) setComplianceItems(parsed.complianceItems);
      if (parsed.tasks) setTasks(parsed.tasks);
      if (parsed.invoices) setInvoices(parsed.invoices);
      if (parsed.documents) setDocuments(parsed.documents);
      if (parsed.masterChoices) setMasterChoices(parsed.masterChoices);
      if (parsed.employees) setEmployees(parsed.employees);
      if (parsed.leaveRecords) setLeaveRecords(parsed.leaveRecords);
      if (parsed.valeRecords) setValeRecords(parsed.valeRecords);
      if (parsed.payrollRuns) setPayrollRuns(parsed.payrollRuns);
      if (parsed.companyExpenses) setCompanyExpenses(parsed.companyExpenses);
      return true;
    } catch (e) {
      console.error('Failed to parse backup JSON:', e);
      return false;
    }
  };

  return (
    <DataContext.Provider
      value={{
        clients,
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
        addInvoice,
        updateInvoice,
        recordInvoicePayment,
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
        addFormLinkage,
        updateFormLinkage,
        deleteFormLinkage,
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
        addAuditLog,
        exportBackupData,
        importBackupData,
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
