import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InvoiceItem, InvoiceServiceLine, Payment, CollectionStatus, ServiceBillingFrequency, CollectionLog, AuditLog, ClientProfile, CustomDeadlineRule } from '../types';
import { CurrencyInput } from './CurrencyInput';
import { SmartServiceInput } from './SmartServiceInput';
import { SmartPeriodInput } from './SmartPeriodInput';
import { SearchableClientSelect } from './SearchableClientSelect';
import { BillingTemplateCustomizerModal } from './BillingTemplateCustomizerModal';
import { PeriodCoverageModal } from './PeriodCoverageModal';
import { generateCustomizedInvoicePDF, generateFFCSICollectionReceiptPDF, generatePaymentCollectionReceiptPDF, getBillingTemplateConfig } from '../utils/billingTemplateUtils';
import { buildClientSoaLedger } from '../utils/soaCalculator';
import { 
  exportSOAExcel, 
  exportARAgingExcel, 
  exportRevenueReportExcel, 
  exportPaymentReportExcel, 
  exportCollectionReportExcel 
} from '../utils/excelExportUtils';
import { generateClientStatementOfAccountPDF } from '../utils/soaPdfGenerator';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import { parsePeriodToMonths, getLineCoveredMonths, getMonthlyBreakdown, checkMonthPeriodOverlap } from '../utils/periodUtils';
import { DEFAULT_BIR_TAX_OPTIONS, DEFAULT_BENEFITS_OPTIONS } from '../data/masterTables';
import { AppModal } from './AppModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  DollarSign, 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Filter, 
  Trash2, 
  CreditCard,
  X,
  Ban,
  Building2,
  Receipt,
  Eye,
  Send,
  Download,
  FileDown,
  Sparkles,
  Lock,
  Edit,
  History,
  BookmarkPlus,
  Briefcase,
  Sliders,
  Phone,
  Mail,
  Calendar,
  CalendarRange,
  TrendingUp,
  PieChart,
  Layers,
  MessageSquare,
  MessageSquarePlus,
  StickyNote,
  BookmarkCheck,
  AlertTriangle,
  RotateCw,
  Play,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
  BookOpen,
  UserCheck,
  ChevronDown,
  Check,
  Tag,
  PlusCircle,
  Zap,
  Stamp
} from 'lucide-react';

interface CrItemPaymentConfig {
  mode: 'Cash' | 'Cheque';
  amount: number;
  bank: string;
  customBank: string;
  chequeNo: string;
  payee: string;
  customPayee: string;
  isPaid: boolean;
}

const PH_BANKS = [
  'BDO (Banco de Oro)',
  'BPI (Bank of the Philippine Islands)',
  'Metrobank',
  'UnionBank',
  'RCBC',
  'Security Bank',
  'Landbank',
  'PNB',
  'Chinabank',
  'EastWest Bank',
  'AUB',
  'PSBank',
  'Robinsons Bank',
  'Maybank',
  'Other Bank'
];

export const downloadInvoicePDF = (inv: InvoiceItem) => {
  generateCustomizedInvoicePDF(inv);
};


export const downloadBillingSummaryReportPDF = (invoices: InvoiceItem[]) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('FFCSI - CLIENT BILLING & COLLECTIONS SUMMARY REPORT', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, 22);

  // Summary Metrics Header
  const totalBilled = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const totalOutstanding = totalBilled - totalCollected;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 26, 269, 14, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Active Invoices: ${invoices.length}`, 20, 34);
  doc.text(`Total Billed: PHP ${totalBilled.toLocaleString()}`, 85, 34);
  doc.setTextColor(4, 120, 87);
  doc.text(`Total Collected: PHP ${totalCollected.toLocaleString()}`, 155, 34);
  doc.setTextColor(180, 83, 9);
  doc.text(`Accounts Receivable: PHP ${totalOutstanding.toLocaleString()}`, 220, 34);

  // Table
  let y = 48;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 269, 8, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('COLLECTION #', 18, y + 5.5);
  doc.text('CLIENT NAME', 55, y + 5.5);
  doc.text('ISSUE DATE', 120, y + 5.5);
  doc.text('DUE DATE', 150, y + 5.5);
  doc.text('BILLED (PHP)', 185, y + 5.5, { align: 'right' });
  doc.text('PAID (PHP)', 220, y + 5.5, { align: 'right' });
  doc.text('BALANCE (PHP)', 255, y + 5.5, { align: 'right' });
  doc.text('STATUS', 280, y + 5.5, { align: 'right' });

  y += 12;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  invoices.forEach((inv) => {
    if (y > 185) {
      doc.addPage();
      y = 20;
    }

    const bal = inv.totalAmount - (inv.paidAmount || 0);

    doc.setTextColor(15, 23, 42);
    doc.text(inv.collectionNumber ? `#${inv.collectionNumber}` : (inv.invoiceNumber || '1001'), 18, y);
    doc.text(inv.clientName.substring(0, 32), 55, y);
    doc.text(inv.issueDate, 120, y);
    doc.text(inv.dueDate, 150, y);
    doc.text(inv.totalAmount.toLocaleString(), 185, y, { align: 'right' });
    
    doc.setTextColor(4, 120, 87);
    doc.text((inv.paidAmount || 0).toLocaleString(), 220, y, { align: 'right' });

    doc.setTextColor(180, 83, 9);
    doc.text(bal.toLocaleString(), 255, y, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.text(inv.status.toUpperCase(), 280, y, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, y + 2.5, 283, y + 2.5);

    y += 7.5;
  });

  doc.save(`FFCSI_Billing_Collections_Report_${new Date().toISOString().substring(0, 10)}.pdf`);
};

export const downloadCollectionReceiptPDF = (inv: InvoiceItem) => {
  const cfg = getBillingTemplateConfig();
  generateFFCSICollectionReceiptPDF(inv, { preparedBy: cfg.signatoryName || 'Maricris' });
};

export const downloadPaymentCollectionReceiptPDF = (inv: InvoiceItem, options?: { showWatermark?: boolean }) => {
  const cfg = getBillingTemplateConfig();
  generatePaymentCollectionReceiptPDF(inv, {
    preparedBy: cfg.signatoryName || 'Maricris',
    showWatermark: options?.showWatermark ?? true
  });
};

export const BillingManagementView: React.FC<{ onNavigateToClient?: (clientId: string) => void }> = ({ onNavigateToClient }) => {
  const { 
    invoices, 
    clients, 
    clientServices,
    payments,
    payables, 
    complianceItems, 
    masterChoices, 
    addInvoice, 
    updateInvoice,
    recordInvoicePayment,
    editInvoicePayment, 
    cancelInvoicePayment,
    getInvoicePayments,
    getInvoiceBalance,
    collectionLogs,
    addCollectionLog,
    generateRecurringInvoices,
    updateInvoiceStatus, 
    cancelInvoice,
    deleteInvoice, 
    addAuditLog,
    getNextCrNumber,
    isCrNumberUsed,
    getNextCollectionNumber,
    isCollectionNumberUsed,
    saveCustomService,
    addPayable,
    deletePayable,
    resetPayableAssessment,
    billerCatalog,
    auditLogs
  } = useData();
  const { currentUser, isSuperAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // CR Format View State: 'default' (2-column FFCSI) vs 'payment' (3-column PARTICULARS | AMOUNT | Payment info)
  const [crViewFormat, setCrViewFormat] = useState<'default' | 'payment'>('default');
  // Watermark toggle in Collection Receipt Modal (Default ON) ⭐
  const [showCrWatermark, setShowCrWatermark] = useState<boolean>(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSoaModal, setShowSoaModal] = useState(false);
  const [showCrModal, setShowCrModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Reusable System Alert & Notification Modal ⭐
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Delete Invoice Confirmation Modal ⭐
  const [deleteInvoiceModal, setDeleteInvoiceModal] = useState<{
    isOpen: boolean;
    invoice: InvoiceItem | null;
  }>({
    isOpen: false,
    invoice: null
  });

  // Official Collection Receipt Payment Confirmation Modal ⭐
  const [confirmCrPaymentModal, setConfirmCrPaymentModal] = useState<{
    isOpen: boolean;
    targetInv: InvoiceItem | null;
    finalCr: string;
    finalPaymentAmount: number;
    overallMethod: string;
    paymentDate: string;
    paymentNotes: string;
    updatedServices: InvoiceServiceLine[];
    chequeRefs: string;
    isFullyPaid: boolean;
    newStatus: InvoiceItem['status'];
  }>({
    isOpen: false,
    targetInv: null,
    finalCr: '',
    finalPaymentAmount: 0,
    overallMethod: '',
    paymentDate: '',
    paymentNotes: '',
    updatedServices: [],
    chequeRefs: '',
    isFullyPaid: false,
    newStatus: 'Pending'
  });

  // Cancel Payment Reason Prompt Modal ⭐
  const [cancelPaymentModal, setCancelPaymentModal] = useState<{
    isOpen: boolean;
    payment: Payment | null;
    reason: string;
  }>({
    isOpen: false,
    payment: null,
    reason: ''
  });

  // Cancel SOA Transaction Confirmation & Reason Modal ⭐
  const [cancelInvoiceModal, setCancelInvoiceModal] = useState<{
    isOpen: boolean;
    invoice: InvoiceItem | null;
    reason: string;
  }>({
    isOpen: false,
    invoice: null,
    reason: ''
  });

  // Ask First Before Creating Invoice Confirmation Modal ⭐
  const [confirmGenerateModal, setConfirmGenerateModal] = useState<{
    isOpen: boolean;
    clientName: string;
    collectionNumber: string;
    totalAmount: number;
    servicesCount: number;
    issueDate: string;
    dueDate: string;
    billingPeriod: string;
    pendingData?: {
      client: any;
      cleanColl: string;
      issueDate: string;
      dueDate: string;
      subtotal: number;
      totalAmount: number;
      services: InvoiceServiceLine[];
      billingNotes?: string;
      billingPeriod: string;
    };
  }>({
    isOpen: false,
    clientName: '',
    collectionNumber: '',
    totalAmount: 0,
    servicesCount: 0,
    issueDate: '',
    dueDate: '',
    billingPeriod: ''
  });

  // Phase 4 & Phase 5 Sub-Tab Navigation ⭐
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'ar' | 'soa' | 'reports' | 'analytics' | 'audit'>('invoices');

  // Live Set Action status per SOA line item in Generate SOA modal
  const [lineSetActionStatus, setLineSetActionStatus] = useState<Record<number, {
    ruleCode: string;
    category: 'BIR' | 'Benefits';
    periodLabel: string;
    targetMonth: string;
    targetYear: number;
    amount: number;
    clientName: string;
    triggered: boolean;
    statusNote?: string;
  }>>({});

  // Phase 5: Client SOA Sub-Tab State ⭐
  const [soaSelectedClientId, setSoaSelectedClientId] = useState<string>('');
  const [soaFromDate, setSoaFromDate] = useState<string>('');
  const [soaToDate, setSoaToDate] = useState<string>('');

  // Previous Billing Toggle state in SOA Generator ⭐
  const [showPreviousBilling, setShowPreviousBilling] = useState<boolean>(false);

  // Duplicate Item Already Billed Warning Modal state ⭐
  const [duplicateWarningModal, setDuplicateWarningModal] = useState<{
    isOpen: boolean;
    itemName: string;
    monthYear: string;
    amount: number;
    billingNumber: string;
    pendingLine: InvoiceServiceLine;
    existingIndex?: number;
    overlappingPeriod?: string;
  } | null>(null);

  // Confirm Amount Change from Previous Billing Modal state ⭐
  const [applyPreviousAmountModal, setApplyPreviousAmountModal] = useState<{
    isOpen: boolean;
    itemIndex: number;
    itemDescription: string;
    previousMonthYear: string;
    previousAmount: number;
    currentAmount: number;
  } | null>(null);

  // Multi-Month & Period Coverage Builder Modal State ⭐
  const [periodCoverageModal, setPeriodCoverageModal] = useState<{
    isOpen: boolean;
    itemIndex: number;
    itemDescription: string;
    currentPeriod: string;
    currentAmount: number;
    defaultMonthlyRate?: number;
    initialDivideToMonths?: boolean;
    targetList?: 'create' | 'edit' | 'custom' | 'edit-custom';
  } | null>(null);

  // Phase 5: Financial Reports Sub-Tab State ⭐
  const [reportCategory, setReportCategory] = useState<'aging' | 'outstanding' | 'payments' | 'collections' | 'service_revenue' | 'client_revenue' | 'monthly_revenue'>('aging');
  const [reportClientFilter, setReportClientFilter] = useState<string>('ALL');
  const [reportFromDate, setReportFromDate] = useState<string>('');
  const [reportToDate, setReportToDate] = useState<string>('');

  // Phase 5: Financial Audit Control Sub-Tab State ⭐
  const [auditFilterAction, setAuditFilterAction] = useState<string>('ALL');
  const [auditFilterSearch, setAuditFilterSearch] = useState<string>('');

  // Collection Follow-Up Log Form state ⭐
  const [collectionContactPerson, setCollectionContactPerson] = useState('');
  const [collectionContactMethod, setCollectionContactMethod] = useState<CollectionLog['contactMethod']>('Phone Call');
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>('Follow-Up Required');
  const [collectionNotes, setCollectionNotes] = useState('');
  const [collectionNextFollowUp, setCollectionNextFollowUp] = useState('');

  // Date Lists
  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const yearsList = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  // Accounts Receivable & Collection Filters ⭐
  const [arSearchQuery, setArSearchQuery] = useState('');
  const [arClientFilter, setArClientFilter] = useState('ALL');
  const [arStatusFilter, setArStatusFilter] = useState<string>('ALL');
  const [arAgingFilter, setArAgingFilter] = useState<string>('ALL');
  const [arCategoryFilter, setArCategoryFilter] = useState<string>('ALL');

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  // New Invoice Form state: Month and Year selection
  const [selectedMonth, setSelectedMonth] = useState(() => monthsList[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  const billingPeriod = `${selectedMonth} ${selectedYear}`;

  const [selectedClientId, setSelectedClientId] = useState('');
  const [collectionNumber, setCollectionNumber] = useState('');
  const [collectionNumError, setCollectionNumError] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().substring(0, 10);
  });
  
  const [services, setServices] = useState<InvoiceServiceLine[]>([]);
  const [descriptionErrors, setDescriptionErrors] = useState<Record<number, string>>({});
  const [monthYearErrors, setMonthYearErrors] = useState<Record<number, string>>({});
  const [amountErrors, setAmountErrors] = useState<Record<number, string>>({});

  // Unified Service Picker Dropdown State for Generate SOA Modal ⭐
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [showCreateCustomSection, setShowCreateCustomSection] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPeriod, setCustomItemPeriod] = useState('');
  const [customItemAmount, setCustomItemAmount] = useState<number>(0);
  const [saveCustomForFuture, setSaveCustomForFuture] = useState(true);
  const servicePickerRef = useRef<HTMLDivElement>(null);

  // Unified Service Picker Dropdown State for Modify SOA Modal ⭐
  const [isEditServicePickerOpen, setIsEditServicePickerOpen] = useState(false);
  const [editServiceSearchTerm, setEditServiceSearchTerm] = useState('');
  const [showEditCreateCustomSection, setShowEditCreateCustomSection] = useState(false);
  const [editCustomItemName, setEditCustomItemName] = useState('');
  const [editCustomItemPeriod, setEditCustomItemPeriod] = useState('');
  const [editCustomItemAmount, setEditCustomItemAmount] = useState<number>(0);
  const [saveEditCustomForFuture, setSaveEditCustomForFuture] = useState(true);
  const editServicePickerRef = useRef<HTMLDivElement>(null);

  // Analytics Tab Filter & Catalog Picker States ⭐
  const [analyticsSelectedServices, setAnalyticsSelectedServices] = useState<string[]>([]);
  const [isAnalyticsServicePickerOpen, setIsAnalyticsServicePickerOpen] = useState(false);
  const [analyticsServiceSearchTerm, setAnalyticsServiceSearchTerm] = useState('');
  const [analyticsClientFilter, setAnalyticsClientFilter] = useState<string>('ALL');
  const [analyticsYearFilter, setAnalyticsYearFilter] = useState<string>('ALL');
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<string>('ALL');
  const analyticsServicePickerRef = useRef<HTMLDivElement>(null);

  // Close service picker when clicking outside (Analytics)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (analyticsServicePickerRef.current && !analyticsServicePickerRef.current.contains(event.target as Node)) {
        setIsAnalyticsServicePickerOpen(false);
      }
    };
    if (isAnalyticsServicePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAnalyticsServicePickerOpen]);

  // Close service picker when clicking outside (Generate SOA)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servicePickerRef.current && !servicePickerRef.current.contains(event.target as Node)) {
        setIsServicePickerOpen(false);
      }
    };
    if (isServicePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isServicePickerOpen]);

  // Close service picker when clicking outside (Modify SOA)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editServicePickerRef.current && !editServicePickerRef.current.contains(event.target as Node)) {
        setIsEditServicePickerOpen(false);
      }
    };
    if (isEditServicePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditServicePickerOpen]);

  // Collection Receipt Modal: Reset Watermark to Default ON when opened ⭐
  useEffect(() => {
    if (showCrModal) {
      setShowCrWatermark(true);
    }
  }, [showCrModal]);

  // Edit SOA Form state
  const [editServices, setEditServices] = useState<InvoiceServiceLine[]>([]);
  const [editReason, setEditReason] = useState('');

  // SOA Billing Notes Box State & Saved Presets Library ⭐
  const [billingNotes, setBillingNotes] = useState<string>('');
  const [showNotesBox, setShowNotesBox] = useState<boolean>(false);
  const [editBillingNotes, setEditBillingNotes] = useState<string>('');
  const [showEditNotesBox, setShowEditNotesBox] = useState<boolean>(false);
  
  // SOA Document Preview Modal Notes Toggle & Text State ⭐
  const [soaPreviewShowNotes, setSoaPreviewShowNotes] = useState<boolean>(true);
  const [soaPreviewNotesText, setSoaPreviewNotesText] = useState<string>('');
  const [savedNotesPresets, setSavedNotesPresets] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('afms_saved_billing_notes');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      'Kindly Pay To FFCSI',
      'Please make all cheques payable to Fast Focus Corporate Services Inc.',
      'Bank Deposit: Fast Focus Corporate Services Inc. | BDO Acct: 1234-5678-90'
    ];
  });

  const handleSaveNotePreset = (noteText: string) => {
    const clean = (noteText || '').trim();
    if (!clean) return;
    if (!savedNotesPresets.includes(clean)) {
      const updated = [...savedNotesPresets, clean];
      setSavedNotesPresets(updated);
      localStorage.setItem('afms_saved_billing_notes', JSON.stringify(updated));
    }
  };

  const handleDeleteNotePreset = (noteText: string) => {
    const updated = savedNotesPresets.filter(n => n !== noteText);
    setSavedNotesPresets(updated);
    localStorage.setItem('afms_saved_billing_notes', JSON.stringify(updated));
  };

  // Payment Form & Collection Receipt state
  const [isCrPaymentMode, setIsCrPaymentMode] = useState<boolean>(false);
  const [crItemPaymentConfigs, setCrItemPaymentConfigs] = useState<Record<number, CrItemPaymentConfig>>({});
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRefNum, setPaymentRefNum] = useState('');
  const [servicePaymentMethods, setServicePaymentMethods] = useState<{ [serviceIdx: number]: string }>({});
  const [orNumber, setOrNumber] = useState('');
  const [crError, setCrError] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Auto-fill Collection # when opening Create Modal and ensure empty defaults
  useEffect(() => {
    if (showCreateModal) {
      setCollectionNumber(getNextCollectionNumber());
      setCollectionNumError('');
      setSelectedClientId('');
      setServices([]);
      setDescriptionErrors({});
      setMonthYearErrors({});
      setAmountErrors({});
      setBillingNotes('');
      setShowNotesBox(false);
    }
  }, [showCreateModal]);

  // Clean BIR Form Description Formatter (Removes "BIR Form" prefix)
  const getCleanBirDescription = (code: string, rawName?: string): string => {
    const c = (code || '').trim().toUpperCase();
    switch (c) {
      case '0619E':
        return '0619E (Monthly Remittance Withheld (Expanded))';
      case '1601EQ':
        return '1601EQ (Quarterly Remittance Withheld (Expanded))';
      case '1601C':
        return '1601C (Monthly Remittance Withheld - Compensation)';
      case '2550Q':
        return '2550Q (Quarterly Value-Added Tax Return)';
      case '2551Q':
        return '2551Q (Quarterly Percentage Tax Return)';
      case '1701Q':
        return '1701Q (Quarterly Income Tax Return - Individual)';
      case '1702Q':
        return '1702Q (Quarterly Income Tax Return - Corporate)';
      case 'ITR':
      case '1701':
      case '1702':
        return 'ITR (Annual Income Tax Return)';
      case '0605':
        return '0605 (Payment Form / Annual Registration Fee)';
      case 'SAWT':
        return 'SAWT (Summary Alphalist of Withholding Taxes)';
      case 'QAP':
        return 'QAP (Quarterly Alphabetical List of Payees)';
      case 'SLSP':
        return 'SLSP (Summary List of Sales and Purchases)';
      case '1604C':
        return '1604C (Annual Information Return - Compensation)';
      case '1604E':
        return '1604E (Annual Information Return - Expanded)';
      case 'SSS':
        return 'SSS (Social Security System Contribution)';
      case 'SSS SALARY LOAN':
        return 'SSS Salary Loan (SSS Salary Loan Remittance)';
      case 'SSS CALAMITY LOAN':
        return 'SSS Calamity Loan (SSS Calamity Loan Remittance)';
      case 'PHILHEALTH':
        return 'PhilHealth (Philippine Health Insurance Corp)';
      case 'HDMF':
        return 'HDMF (Pag-IBIG Fund Contribution)';
      case 'HDMF MULTI-PURPOSE LOAN':
      case 'HDMF MPL':
        return 'HDMF Multi-Purpose Loan (Pag-IBIG MPL Remittance)';
      case 'HDMF CALAMITY LOAN':
        return 'HDMF Calamity Loan (Pag-IBIG Calamity Loan Remittance)';
      default: {
        if (rawName) {
          const clean = rawName.replace(/^BIR Form\s+/i, '').replace(/^BIR Tax Return\s*-\s*/i, '').trim();
          if (clean.toLowerCase() === c.toLowerCase() || clean.toLowerCase().startsWith(c.toLowerCase()) || c.toLowerCase().startsWith(clean.toLowerCase())) {
            return clean;
          }
          return `${c} (${clean})`;
        }
        return code || c;
      }
    }
  };

  // Compute Period based on To-Do List Schedule (e.g. Jul-26 or July 2026, 2Q-2026, 2025)
  const getPeriodForForm = (
    formCode: string, 
    billingMonth: string, 
    billingYear: number, 
    client?: ClientProfile,
    existingPeriod?: string
  ): string => {
    const codeUpper = (formCode || '').trim().toUpperCase();
    let currentMIdx = monthsList.indexOf(billingMonth);
    if (currentMIdx < 0) currentMIdx = 7; // default August (index 7)
    let currentYear = billingYear || 2026;

    // 1. If explicit target period code is already formatted (e.g. "Jul-26", "Jul-2026", "2Q-2026", "2025")
    if (existingPeriod && existingPeriod.trim()) {
      const epTrim = existingPeriod.trim();
      
      // Explicit 3-letter month with 2 or 4 digit year: e.g. "Jul-26" or "Jul-2026"
      const shortMatch = epTrim.match(/^([A-Za-z]{3})[- ](\d{2,4})$/);
      if (shortMatch) {
        const shortMonths: Record<string, string> = {
          Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
          Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
        };
        const mKey = shortMatch[1].charAt(0).toUpperCase() + shortMatch[1].slice(1).toLowerCase();
        if (shortMonths[mKey]) {
          const yr = shortMatch[2].length === 2 ? `20${shortMatch[2]}` : shortMatch[2];
          return `${shortMonths[mKey]} ${yr}`;
        }
      }
      
      // Explicit Quarter e.g. "2Q-2026" or "2Q"
      if (/^\d[Qq]/.test(epTrim)) {
        return epTrim.replace(/\s+/g, '');
      }

      // Explicit 4-digit tax year e.g. "2025" for ITR/Annual
      if (/^\d{4}$/.test(epTrim) && (codeUpper.includes('ITR') || codeUpper.includes('1701') || codeUpper.includes('1702') || codeUpper.includes('1604'))) {
        return epTrim;
      }

      // If existingPeriod is stored as ISO "YYYY-MM" (which is the filing month in To-Do list), extract it as the filing context
      if (/^\d{4}-\d{2}$/.test(epTrim)) {
        const [y, m] = epTrim.split('-');
        currentYear = parseInt(y, 10) || currentYear;
        const parsedM = parseInt(m, 10) - 1;
        if (parsedM >= 0 && parsedM <= 11) {
          currentMIdx = parsedM;
        }
      }
    }

    // 2. Annual forms / ITR -> Previous Tax Year (e.g. 2025)
    if (codeUpper === 'ITR' || (codeUpper.includes('1701') && !codeUpper.includes('1701Q')) || (codeUpper.includes('1702') && !codeUpper.includes('1702Q')) || codeUpper === '1604C' || codeUpper === '1604E') {
      return `${currentYear - 1}`;
    }

    // 3. Quarterly forms (1601EQ, 2550Q, 2551Q, 1701Q, 1702Q, SAWT, QAP, SLSP)
    if (['1601EQ', '2550Q', '2551Q', '1701Q', '1702Q', 'SAWT', 'QAP', 'SLSP'].some(q => codeUpper.includes(q))) {
      if (currentMIdx <= 2) return `4Q-${currentYear - 1}`;
      if (currentMIdx <= 5) return `1Q-${currentYear}`;
      if (currentMIdx <= 8) return `2Q-${currentYear}`;
      return `3Q-${currentYear}`;
    }

    // 4. Retainers Fee & General Service Charges -> Current billing period (e.g. August 2026)
    if (codeUpper.includes('RETAINER') || codeUpper.includes('SERVICE CHARGE') || codeUpper === 'BOOKKEEPING') {
      return `${monthsList[currentMIdx]} ${currentYear}`;
    }

    // 5. Monthly Compliance forms & Statutory Benefits & Loans (0619E, 1601C, SSS, SSS SALARY LOAN, SSS CALAMITY LOAN, HDMF, HDMF LOAN, PhilHealth, etc.)
    // In Philippine to-do list & billing schedule, August deadline / billing covers the PREVIOUS month: July 2026 (Target Period: Jul-26)
    let priorMIdx = currentMIdx - 1;
    let targetYear = currentYear;
    if (priorMIdx < 0) {
      priorMIdx = 11;
      targetYear = currentYear - 1;
    }
    const priorMonthName = monthsList[priorMIdx];
    return `${priorMonthName} ${targetYear}`;
  };

  // Currently selected client helper
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Helper to check if an item has already been invoiced for this client (for automatic exclusion)
  const isItemAlreadyBilled = (clientId: string, desc: string, period: string): boolean => {
    if (!clientId || !desc) return false;
    const cleanD = desc.trim().toLowerCase();
    const cleanP = (period || '').trim();
    const candidateMonths = parsePeriodToMonths(cleanP);

    return invoices.some(inv => {
      if (inv.clientId !== clientId || inv.status === 'Cancelled') return false;
      return inv.services.some(s => {
        const sClean = s.description.trim().toLowerCase();
        
        // Check if both refer to retainer / bookkeeping
        const isBothRetainer = 
          (cleanD.includes('retainer') || cleanD.includes('bookkeeping')) &&
          (sClean.includes('retainer') || sClean.includes('bookkeeping'));

        // Check if both refer to standard tax/benefit codes
        const codeTokens = ['0619e', '1601c', '1601eq', '1701q', '1702q', '2550q', '2551q', '1604c', '1604e', 'sss', 'philhealth', 'hdmf', 'pag-ibig', 'pagibig'];
        const matchedToken = codeTokens.find(token => cleanD.includes(token) && sClean.includes(token));

        const isSameService = sClean === cleanD || isBothRetainer || Boolean(matchedToken);
        if (!isSameService) return false;

        // Check month overlap
        const billedMonths = getLineCoveredMonths(s);
        const overlap = checkMonthPeriodOverlap(cleanP, s.monthYear || '', candidateMonths, billedMonths);
        return overlap.hasOverlap;
      });
    });
  };

  // Helper to check duplicate billed item matching description, month/year (including multi-month spans & discrete months)
  const findAlreadyBilledInvoice = (
    clientId: string, 
    desc: string, 
    period: string, 
    amount: number,
    coveredMonths?: string[]
  ): { isBilled: boolean; billingNumber?: string; overlappingInfo?: string } => {
    if (!clientId || !desc) return { isBilled: false };
    const cleanD = desc.trim().toLowerCase();
    const cleanP = (period || '').trim();
    const candidateMonths = (coveredMonths && coveredMonths.length > 0) 
      ? coveredMonths 
      : parsePeriodToMonths(cleanP);

    for (const inv of invoices) {
      if (inv.clientId === clientId && inv.status !== 'Cancelled') {
        for (const s of inv.services) {
          const sClean = s.description.trim().toLowerCase();
          const isBothRetainer = 
            (cleanD.includes('retainer') || cleanD.includes('bookkeeping')) &&
            (sClean.includes('retainer') || sClean.includes('bookkeeping'));

          const codeTokens = ['0619e', '1601c', '1601eq', '1701q', '1702q', '2550q', '2551q', '1604c', '1604e', 'sss', 'philhealth', 'hdmf', 'pag-ibig', 'pagibig'];
          const matchedToken = codeTokens.find(token => cleanD.includes(token) && sClean.includes(token));

          const isSameService = sClean === cleanD || isBothRetainer || Boolean(matchedToken);

          if (isSameService) {
            const billedMonths = getLineCoveredMonths(s);
            const overlap = checkMonthPeriodOverlap(cleanP, s.monthYear || '', candidateMonths, billedMonths);
            
            if (overlap.hasOverlap) {
              return {
                isBilled: true,
                billingNumber: inv.collectionNumber || inv.invoiceNumber || inv.id,
                overlappingInfo: overlap.overlappingMonths.join(', ')
              };
            }
          }
        }
      }
    }
    return { isBilled: false };
  };

  // Helper to find previous billed amount and period for the same form/service ⭐
  const getPreviousBillingInfo = (clientId: string, desc: string): { monthYear: string; amount: number; invoiceNumber: string } | null => {
    if (!clientId || !desc) return null;
    const cleanD = desc.trim().toLowerCase();
    if (!cleanD) return null;

    // Token extraction for compliance forms (e.g. 0619E, 1601C, 1701Q, 1702Q, 2550Q, 2551Q, SSS, PhilHealth, Pag-IBIG, Retainers)
    const codeMatch = cleanD.match(/\b(0619e|1601c|1701q|1702q|2550q|2551q|1604c|1604e|1604f|1701|1702|1702rt|1702ex|1702mx|2000|2000ot|sss|philhealth|pag-ibig|pagibig|retainer|bookkeeping)\b/i);
    const keyToken = codeMatch ? codeMatch[1].toLowerCase() : cleanD;

    // Sort client invoices descending by issueDate / createdAt
    const sortedInvoices = [...invoices]
      .filter(inv => inv.clientId === clientId && inv.status !== 'Cancelled')
      .sort((a, b) => new Date(b.issueDate || b.createdAt || 0).getTime() - new Date(a.issueDate || a.createdAt || 0).getTime());

    for (const inv of sortedInvoices) {
      for (const s of inv.services) {
        const sClean = s.description.trim().toLowerCase();
        const isMatch = sClean === cleanD || 
          (codeMatch && sClean.includes(keyToken)) ||
          (cleanD.includes('retainer') && sClean.includes('retainer')) ||
          (cleanD.includes('bookkeeping') && sClean.includes('bookkeeping'));

        if (isMatch) {
          return {
            monthYear: s.monthYear || inv.billingPeriod || 'N/A',
            amount: s.amount || s.unitPrice || 0,
            invoiceNumber: inv.collectionNumber || inv.invoiceNumber || inv.id
          };
        }
      }
    }
    return null;
  };

  // Helper to detect if a line item matches a BIR Tax Return or Statutory Benefit in the Monthly Deadline To-Do List
  const matchDeadlineRuleAndPeriod = (
    desc: string, 
    periodStr: string, 
    client?: ClientProfile
  ): { 
    matchedRule: CustomDeadlineRule; 
    targetPeriodLabel: string; 
    targetMonthStr: string; 
    targetYear: number;
    category: 'BIR' | 'Benefits';
  } | null => {
    if (!desc || !desc.trim()) return null;
    const cleanDesc = desc.trim().toLowerCase();

    // 1. Gather all master rules
    const allRules: CustomDeadlineRule[] = [
      ...(masterChoices.birTaxOptions || []),
      ...(masterChoices.benefitsOptions || []),
      ...DEFAULT_BIR_TAX_OPTIONS,
      ...DEFAULT_BENEFITS_OPTIONS
    ];

    // 2. Find rule that matches description
    let matchedRule: CustomDeadlineRule | undefined = allRules.find(r => {
      const codeLow = r.code.toLowerCase();
      const regex = new RegExp(`\\b${codeLow.replace('+', '\\+')}\\b`, 'i');
      return regex.test(cleanDesc);
    });

    if (!matchedRule) {
      matchedRule = allRules.find(r => {
        const codeLow = r.code.toLowerCase();
        return cleanDesc.includes(codeLow) || codeLow.includes(cleanDesc);
      });
    }

    if (!matchedRule) {
      // Check for SSS, PhilHealth, Pag-IBIG / HDMF synonyms
      if (cleanDesc.includes('sss salary loan')) {
        matchedRule = allRules.find(r => r.code.toLowerCase() === 'sss salary loan');
      } else if (cleanDesc.includes('sss calamity loan')) {
        matchedRule = allRules.find(r => r.code.toLowerCase() === 'sss calamity loan');
      } else if (cleanDesc.includes('sss')) {
        matchedRule = allRules.find(r => r.code.toLowerCase() === 'sss');
      } else if (cleanDesc.includes('philhealth') || cleanDesc.includes('phic')) {
        matchedRule = allRules.find(r => r.code.toLowerCase() === 'philhealth');
      } else if (cleanDesc.includes('hdmf mpl') || cleanDesc.includes('hdmf multi-purpose')) {
        matchedRule = allRules.find(r => r.code.toLowerCase().includes('mpl') || r.code.toLowerCase().includes('multi-purpose'));
      } else if (cleanDesc.includes('hdmf') || cleanDesc.includes('pag-ibig') || cleanDesc.includes('pagibig')) {
        matchedRule = allRules.find(r => r.code.toLowerCase() === 'hdmf');
      }
    }

    if (!matchedRule) return null;

    // 3. Determine Target Period Label and Target Month String
    const codeUpper = matchedRule.code.toUpperCase();
    const periodTrim = (periodStr || '').trim();

    const yrMatch = periodTrim.match(/\b(20\d{2})\b/);
    const targetYear = yrMatch ? parseInt(yrMatch[1], 10) : (parseInt(selectedYear, 10) || 2026);

    let targetPeriodLabel = periodTrim || `${selectedMonth} ${selectedYear}`;
    let targetMonthStr = `${targetYear}-${String(monthsList.indexOf(selectedMonth) + 1).padStart(2, '0')}`;

    // Handling for Quarterly Returns (1702Q, 1701Q, 2550Q, 1601EQ, 2551Q)
    const isQuarterly = ['1702Q', '1701Q', '2550Q', '1601EQ', '2551Q', 'SAWT', 'QAP', 'SLSP'].some(q => codeUpper.includes(q)) || matchedRule.frequency === 'Quarterly';
    
    if (isQuarterly) {
      const qMatch = periodTrim.match(/\b([1-4])[Qq]\b|\b[Qq]([1-4])\b|\b([1-4])(st|nd|rd|th)?\s*quarter\b/i);
      const quarterNum = qMatch ? parseInt(qMatch[1] || qMatch[2] || qMatch[3], 10) : (monthsList.indexOf(selectedMonth) <= 2 ? 4 : monthsList.indexOf(selectedMonth) <= 5 ? 1 : monthsList.indexOf(selectedMonth) <= 8 ? 2 : 3);

      targetPeriodLabel = `${quarterNum}Q - ${quarterNum === 4 ? targetYear - 1 : targetYear}`;

      if (codeUpper === '1702Q' || codeUpper === '1701Q') {
        if (quarterNum === 1) targetMonthStr = `${targetYear}-05`;
        else if (quarterNum === 2) targetMonthStr = `${targetYear}-08`;
        else if (quarterNum === 3) targetMonthStr = `${targetYear}-11`;
        else targetMonthStr = `${targetYear}-08`;
      } else if (codeUpper === '2550Q' || codeUpper === '1601EQ' || codeUpper === '2551Q') {
        if (quarterNum === 1) targetMonthStr = `${targetYear}-04`;
        else if (quarterNum === 2) targetMonthStr = `${targetYear}-07`;
        else if (quarterNum === 3) targetMonthStr = `${targetYear}-10`;
        else if (quarterNum === 4) targetMonthStr = `${targetYear}-01`;
        else targetMonthStr = `${targetYear}-07`;
      }
    } else {
      const monthRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
      const mMatch = periodTrim.match(monthRegex);
      if (mMatch) {
        const mKey = mMatch[1].toLowerCase();
        const shortMap: Record<string, { num: string; full: string; deadlineMonthNum: string }> = {
          jan: { num: '01', full: 'January', deadlineMonthNum: '02' },
          feb: { num: '02', full: 'February', deadlineMonthNum: '03' },
          mar: { num: '03', full: 'March', deadlineMonthNum: '04' },
          apr: { num: '04', full: 'April', deadlineMonthNum: '05' },
          may: { num: '05', full: 'May', deadlineMonthNum: '06' },
          jun: { num: '06', full: 'June', deadlineMonthNum: '07' },
          jul: { num: '07', full: 'July', deadlineMonthNum: '08' },
          aug: { num: '08', full: 'August', deadlineMonthNum: '09' },
          sep: { num: '09', full: 'September', deadlineMonthNum: '10' },
          oct: { num: '10', full: 'October', deadlineMonthNum: '11' },
          nov: { num: '11', full: 'November', deadlineMonthNum: '12' },
          dec: { num: '12', full: 'December', deadlineMonthNum: '01' }
        };
        const info = shortMap[mKey];
        if (info) {
          targetPeriodLabel = `${info.full} ${targetYear}`;
          targetMonthStr = `${targetYear}-${info.deadlineMonthNum}`;
        }
      }
    }

    return {
      matchedRule,
      targetPeriodLabel,
      targetMonthStr,
      targetYear,
      category: (matchedRule.category === 'Benefits' ? 'Benefits' : 'BIR') as 'BIR' | 'Benefits'
    };
  };

  // Helper to trigger "Set Action" when user enters an amount for a matching compliance requirement
  const checkAndTriggerSetAction = (
    lineIdx: number, 
    desc: string, 
    periodStr: string, 
    amt: number,
    client: ClientProfile | undefined
  ) => {
    if (!client) return;
    const match = matchDeadlineRuleAndPeriod(desc, periodStr, client);
    if (!match) {
      setLineSetActionStatus(prev => {
        if (!prev[lineIdx]) return prev;
        const next = { ...prev };
        delete next[lineIdx];
        return next;
      });
      return;
    }

    const { matchedRule, targetPeriodLabel, targetMonthStr, targetYear, category } = match;

    if (amt > 0) {
      // Check if payable already exists for this client + rule + month/period
      const existingPayable = payables.find(p => 
        p.clientId === client.id && 
        (p.itemName.toLowerCase() === matchedRule.code.toLowerCase() || p.itemName.toLowerCase().includes(matchedRule.code.toLowerCase())) &&
        (
          p.month === targetMonthStr || 
          p.month === targetPeriodLabel || 
          p.month.includes(targetPeriodLabel) ||
          p.notes?.includes(targetPeriodLabel) ||
          p.remarks?.includes(targetPeriodLabel)
        )
      );

      // Status indicator for the line item in SOA modal
      const isAlreadyPaid = existingPayable?.status === 'Paid';

      setLineSetActionStatus(prev => ({
        ...prev,
        [lineIdx]: {
          ruleCode: matchedRule.code,
          category,
          periodLabel: targetPeriodLabel,
          targetMonth: targetMonthStr,
          targetYear,
          amount: amt,
          clientName: client.companyName,
          triggered: true,
          statusNote: isAlreadyPaid ? 'Already Tagged as Paid' : 'Payable Logged'
        }
      }));
    } else {
      setLineSetActionStatus(prev => {
        if (!prev[lineIdx]) return prev;
        const next = { ...prev };
        delete next[lineIdx];
        return next;
      });
    }
  };

  // Helper to sync and trigger "Set Action" when invoice is successfully generated
  const syncInvoiceServicesToPayablesAndToDo = (
    confirmedServices: InvoiceServiceLine[],
    client: ClientProfile,
    collectionNumber: string
  ) => {
    confirmedServices.forEach((s) => {
      const amt = Number(s.amount) || 0;
      if (amt <= 0 || !s.description) return;

      const match = matchDeadlineRuleAndPeriod(s.description, s.monthYear, client);
      if (!match) return;

      const { matchedRule, targetPeriodLabel, targetMonthStr, targetYear, category } = match;

      // Check if payable already exists for this client + rule + month/period
      const existingPayable = payables.find(p => 
        p.clientId === client.id && 
        (p.itemName.toLowerCase() === matchedRule.code.toLowerCase() || p.itemName.toLowerCase().includes(matchedRule.code.toLowerCase())) &&
        (
          p.month === targetMonthStr ||
          p.month === targetPeriodLabel ||
          p.month.includes(targetPeriodLabel) ||
          p.notes?.includes(targetPeriodLabel) ||
          p.remarks?.includes(targetPeriodLabel)
        )
      );

      // Only create/update if not already tagged as Paid
      if (existingPayable?.status === 'Paid') {
        return;
      }

      // Add or update the payable record to link to this invoice and set status to Unpaid (Payable Logged)
      addPayable({
        clientId: client.id,
        clientName: client.companyName,
        category,
        itemName: matchedRule.code,
        month: targetMonthStr,
        year: targetYear,
        payableAmount: amt,
        status: 'Unpaid',
        notes: `⚡ Auto-linked from SOA (${collectionNumber}) for ${matchedRule.code} (${targetPeriodLabel})`,
        remarks: `⚡ Auto-linked from SOA (${collectionNumber}) for ${matchedRule.code} (${targetPeriodLabel})`,
        comment: `⚡ Auto-linked from SOA (${collectionNumber}) for ${matchedRule.code} (${targetPeriodLabel})`,
        createdById: currentUser?.id || 'staff',
        createdByName: currentUser?.fullName || 'Accountant'
      });

      addAuditLog(
        'Set Payable Action (SOA Generated)',
        `⚡ Auto Set Action from Generated SOA (${collectionNumber}) for ${client.companyName}: ${matchedRule.code} (${targetPeriodLabel}) -> ₱${amt.toLocaleString()} payable created & actioned in To-Do List`,
        currentUser?.id || 'staff',
        currentUser?.fullName || 'Accountant'
      );
    });
  };

  // Handle Client Change in Create Modal: Only show items if there is an actual payable or fee/amount > 0 and NOT already invoiced
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setLineSetActionStatus({});
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      setServices([]);
      return;
    }

    const loadedLines: InvoiceServiceLine[] = [];

    // 1. Phase 2 ClientServices Engagements (Active, Billable with fee > 0)
    const activeEngagements = clientServices.filter(s => s.clientId === client.id && s.status === 'Active' && s.billable && (s.fee || 0) > 0);
    activeEngagements.forEach(s => {
      const isBookkeeping = s.serviceCode === 'BOOKKEEPING' || s.serviceName.toLowerCase().includes('bookkeeping') || s.serviceName.toLowerCase().includes('monthly retainer');
      const cleanDesc = isBookkeeping ? 'Retainers Fee' : `${s.serviceName} (${s.serviceCode})`;
      const period = isBookkeeping ? `${selectedMonth} ${selectedYear}` : getPeriodForForm(s.serviceCode, selectedMonth, parseInt(selectedYear, 10), client);

      // Only auto-include if not already billed in an existing invoice for this client & period
      if (!isItemAlreadyBilled(client.id, cleanDesc, period)) {
        loadedLines.push({
          clientServiceId: s.id,
          serviceCode: s.serviceCode,
          serviceCategory: s.category,
          description: cleanDesc,
          monthYear: period,
          unitPrice: s.fee || 0,
          quantity: 1,
          discount: 0,
          amount: s.fee || 0,
          itemType: 'Service'
        });
      }
    });

    // 2. Client Retainer fee if no registered active ClientService engagements exist AND retainersFee > 0
    if (loadedLines.length === 0 && client.retainersFee > 0) {
      const period = `${selectedMonth} ${selectedYear}`;
      if (!isItemAlreadyBilled(client.id, 'Retainers Fee', period)) {
        loadedLines.push({
          description: `Retainers Fee`,
          monthYear: period,
          unitPrice: client.retainersFee,
          quantity: 1,
          amount: client.retainersFee,
          itemType: 'Service'
        });
      }
    }

    // 3. Unpaid Payables for this client with payableAmount > 0 (exclude if already billed)
    const activePayables = payables.filter(p => p.clientId === client.id && p.status === 'Unpaid' && p.payableAmount > 0);
    activePayables.forEach(p => {
      let cleanItemName = p.itemName;
      if (cleanItemName.toLowerCase().startsWith('bir form ')) {
        cleanItemName = cleanItemName.substring(9).trim();
      }
      const cleanDesc = getCleanBirDescription(cleanItemName, p.remarks || p.itemName);
      const period = getPeriodForForm(cleanItemName, selectedMonth, parseInt(selectedYear, 10), client, p.month);

      if (!isItemAlreadyBilled(client.id, cleanDesc, period)) {
        loadedLines.push({
          description: cleanDesc,
          monthYear: period,
          unitPrice: p.payableAmount,
          quantity: 1,
          amount: p.payableAmount,
          itemType: 'One-Time'
        });
      }
    });

    // Do not show item if there is no payable, fee, or if already billed!
    setServices(loadedLines);
  };

  // Add Custom One-Time Service Line
  const handleAddServiceLine = () => {
    setServices(prev => [...prev, { description: '', monthYear: '', unitPrice: 0, quantity: 1, amount: 0, itemType: 'One-Time' }]);
  };

  // Import All Registered Client Services (Only with actual amounts > 0 and NOT already billed)
  const handleImportAllClientServices = () => {
    if (!selectedClient) {
      setAlertModal({
        isOpen: true,
        title: 'Client Company Required',
        message: 'Please select a client company first before importing registered active payables or retainer fees.',
        type: 'warning'
      });
      return;
    }

    const loadedLines: InvoiceServiceLine[] = [];

    // 1. Active ClientServices with fee > 0
    const activeEngagements = clientServices.filter(s => s.clientId === selectedClient.id && s.status === 'Active' && s.billable && (s.fee || 0) > 0);
    activeEngagements.forEach(s => {
      const isBookkeeping = s.serviceCode === 'BOOKKEEPING' || s.serviceName.toLowerCase().includes('bookkeeping') || s.serviceName.toLowerCase().includes('monthly retainer');
      const cleanDesc = isBookkeeping ? 'Retainers Fee' : `${s.serviceName} (${s.serviceCode})`;
      const period = isBookkeeping ? `${selectedMonth} ${selectedYear}` : getPeriodForForm(s.serviceCode, selectedMonth, parseInt(selectedYear, 10), selectedClient);

      if (!isItemAlreadyBilled(selectedClient.id, cleanDesc, period)) {
        loadedLines.push({
          clientServiceId: s.id,
          serviceCode: s.serviceCode,
          serviceCategory: s.category,
          description: cleanDesc,
          monthYear: period,
          unitPrice: s.fee || 0,
          quantity: 1,
          amount: s.fee || 0,
          itemType: 'Service'
        });
      }
    });

    // 2. Retainer line if no ClientServices and retainer > 0
    if (activeEngagements.length === 0 && selectedClient.retainersFee > 0) {
      const period = `${selectedMonth} ${selectedYear}`;
      if (!isItemAlreadyBilled(selectedClient.id, 'Retainers Fee', period)) {
        loadedLines.push({
          description: `Retainers Fee`,
          monthYear: period,
          unitPrice: selectedClient.retainersFee,
          quantity: 1,
          amount: selectedClient.retainersFee,
          itemType: 'Service'
        });
      }
    }

    // 3. Unpaid Payables with amount > 0 (exclude if already billed)
    const activePayables = payables.filter(p => p.clientId === selectedClient.id && p.status === 'Unpaid' && p.payableAmount > 0);
    activePayables.forEach(p => {
      let cleanItemName = p.itemName;
      if (cleanItemName.toLowerCase().startsWith('bir form ')) {
        cleanItemName = cleanItemName.substring(9).trim();
      }
      const cleanDesc = getCleanBirDescription(cleanItemName, p.remarks || p.itemName);
      const period = getPeriodForForm(cleanItemName, selectedMonth, parseInt(selectedYear, 10), selectedClient, p.month);
      
      if (!isItemAlreadyBilled(selectedClient.id, cleanDesc, period)) {
        loadedLines.push({
          description: cleanDesc,
          monthYear: period,
          unitPrice: p.payableAmount,
          quantity: 1,
          amount: p.payableAmount,
          itemType: 'One-Time'
        });
      }
    });

    if (loadedLines.length > 0) {
      setServices(loadedLines);
    } else {
      setAlertModal({
        isOpen: true,
        title: 'No Unbilled Payables Found',
        message: `No unbilled active payables or retainer fees found for ${selectedClient.companyName} in ${billingPeriod}.`,
        type: 'info'
      });
    }
  };

  interface EnrichedCatalogItem {
    code: string;
    name: string;
    category: 'BIR' | 'Benefits' | 'Others';
    defaultAmount: number;
    amountSource?: 'Client Payables' | 'Client Retainer Profile' | 'Saved Preset' | 'Default Preset';
    sourceDetail?: string;
  }

  // Master combined items with smart dynamic amounts and origin resolution
  const getEnrichedUnifiedCatalog = (targetClient?: ClientProfile | null): EnrichedCatalogItem[] => {
    const baseCatalog = [
      // BIR Section
      { code: '0619E', name: '0619E (Monthly Remittance Withheld (Expanded))', category: 'BIR' as const, defaultAmount: 0 },
      { code: '1601C', name: '1601C (Monthly Remittance of Income Taxes Withheld - Compensation)', category: 'BIR' as const, defaultAmount: 0 },
      { code: '1601EQ', name: '1601EQ (Quarterly Remittance Withheld (Expanded))', category: 'BIR' as const, defaultAmount: 0 },
      { code: '2550Q', name: '2550Q (Quarterly Value-Added Tax Return)', category: 'BIR' as const, defaultAmount: 0 },
      { code: '2551Q', name: '2551Q (Quarterly Percentage Tax Return)', category: 'BIR' as const, defaultAmount: 0 },
      { code: '1701Q', name: '1701Q (Quarterly Income Tax Return - Individual)', category: 'BIR' as const, defaultAmount: 0 },
      { code: '1702Q', name: '1702Q (Quarterly Income Tax Return - Corporate)', category: 'BIR' as const, defaultAmount: 0 },
      { code: 'ITR', name: 'ITR (Annual Income Tax Return)', category: 'BIR' as const, defaultAmount: 0 },
      { code: '0605', name: '0605 (Payment Form / Annual Registration Fee)', category: 'BIR' as const, defaultAmount: 0 },
      { code: 'SAWT', name: 'SAWT (Summary Alphalist of Withholding Taxes)', category: 'BIR' as const, defaultAmount: 0 },
      { code: 'QAP', name: 'QAP (Quarterly Alphabetical List of Payees)', category: 'BIR' as const, defaultAmount: 0 },
      { code: 'SLSP', name: 'SLSP (Summary List of Sales and Purchases)', category: 'BIR' as const, defaultAmount: 0 },
      { code: '1604C', name: '1604C (Annual Information Return - Compensation)', category: 'BIR' as const, defaultAmount: 0 },
      { code: '1604E', name: '1604E (Annual Information Return - Expanded)', category: 'BIR' as const, defaultAmount: 0 },
      ...(masterChoices.birTaxOptions || []).filter(b => !['0619E', '1601C', '1601EQ', '2550Q', '2551Q', '1701Q', '1702Q', 'ITR', '0605', 'SAWT', 'QAP', 'SLSP', '1604C', '1604E'].includes(b.code.toUpperCase())).map(b => ({
        code: b.code,
        name: getCleanBirDescription(b.code, b.name),
        category: 'BIR' as const,
        defaultAmount: 0
      })),

      // Benefits & Loans Section
      { code: 'SSS', name: 'SSS (Social Security System Contribution)', category: 'Benefits' as const, defaultAmount: 0 },
      { code: 'SSS Salary Loan', name: 'SSS Salary Loan (SSS Salary Loan Remittance)', category: 'Benefits' as const, defaultAmount: 0 },
      { code: 'SSS Calamity Loan', name: 'SSS Calamity Loan (SSS Calamity Loan Remittance)', category: 'Benefits' as const, defaultAmount: 0 },
      { code: 'PhilHealth', name: 'PhilHealth (Philippine Health Insurance Corp)', category: 'Benefits' as const, defaultAmount: 0 },
      { code: 'HDMF', name: 'HDMF (Pag-IBIG Fund Contribution)', category: 'Benefits' as const, defaultAmount: 0 },
      { code: 'HDMF Multi-Purpose Loan', name: 'HDMF Multi-Purpose Loan (Pag-IBIG MPL Remittance)', category: 'Benefits' as const, defaultAmount: 0 },
      { code: 'HDMF Calamity Loan', name: 'HDMF Calamity Loan (Pag-IBIG Calamity Loan Remittance)', category: 'Benefits' as const, defaultAmount: 0 },
      ...(masterChoices.benefitsOptions || []).filter(b => !['SSS', 'SSS SALARY LOAN', 'SSS CALAMITY LOAN', 'PHILHEALTH', 'HDMF', 'HDMF MULTI-PURPOSE LOAN', 'HDMF CALAMITY LOAN'].some(x => b.code.toUpperCase().includes(x))).map(b => ({
        code: b.code,
        name: b.name,
        category: 'Benefits' as const,
        defaultAmount: 0
      })),

      // Others Section (Retainers Fee, Service Charge, Custom saved)
      { code: 'RETAINERS_FEE', name: 'Retainers Fee', category: 'Others' as const, defaultAmount: targetClient?.retainersFee || 0 },
      { code: 'SERVICE_CHARGE', name: 'Service Charge', category: 'Others' as const, defaultAmount: 0 },
      { code: 'BOOKKEEPING_FEE', name: 'Accounting & Bookkeeping Fee', category: 'Others' as const, defaultAmount: 0 },
      { code: 'CONSULTATION_FEE', name: 'Consultation & Tax Advisory Fee', category: 'Others' as const, defaultAmount: 0 },
      { code: 'BUSINESS_PERMIT', name: 'Business Permit / Mayor\'s Permit Renewal', category: 'Others' as const, defaultAmount: 0 },
      { code: 'SEC_DTI_COMPLIANCE', name: 'SEC / DTI Annual Compliance & Registration', category: 'Others' as const, defaultAmount: 0 },
      { code: 'LATE_FILING_ASSISTANCE', name: 'Late Filing & Penalty Assistance Charge', category: 'Others' as const, defaultAmount: 0 },
      { code: 'DOC_PROCESSING', name: 'Document Processing & Courier Charge', category: 'Others' as const, defaultAmount: 0 },
      ...(masterChoices.savedCustomServices || []).map(s => ({
        code: s.description,
        name: s.description,
        category: 'Others' as const,
        defaultAmount: s.defaultAmount || 0
      }))
    ];

    return baseCatalog.map(item => {
      let resolvedAmount = item.defaultAmount || 0;
      let amountSource: 'Client Payables' | 'Client Retainer Profile' | 'Saved Preset' | 'Default Preset' | undefined = undefined;
      let sourceDetail: string | undefined = undefined;

      // 1. Check if there's an active unpaid payable for this client
      if (targetClient) {
        const matchedPayable = payables.find(p => 
          p.clientId === targetClient.id && 
          p.status === 'Unpaid' && 
          p.payableAmount > 0 &&
          (
            p.itemName.toLowerCase().includes(item.code.toLowerCase()) || 
            item.code.toLowerCase().includes(p.itemName.toLowerCase().replace(/^bir form\s+/i, '').trim()) ||
            (p.remarks && p.remarks.toLowerCase().includes(item.code.toLowerCase())) ||
            (p.itemName && item.name.toLowerCase().includes(p.itemName.toLowerCase()))
          )
        );

        if (matchedPayable) {
          resolvedAmount = matchedPayable.payableAmount;
          amountSource = 'Client Payables';
          sourceDetail = `Auto-matched from Client Payables (Unpaid Balance: ₱${matchedPayable.payableAmount.toLocaleString()}${matchedPayable.month ? ` for ${matchedPayable.month}` : ''})`;
        }
      }

      // 2. Retainers Fee
      if (!amountSource && item.code === 'RETAINERS_FEE') {
        const retainer = targetClient?.retainersFee || 0;
        if (retainer > 0) {
          resolvedAmount = retainer;
          amountSource = 'Client Retainer Profile';
          sourceDetail = `Configured Monthly Retainer Fee from ${targetClient?.companyName || 'Client'} Profile (₱${retainer.toLocaleString()})`;
        }
      }

      // 3. Saved Custom Presets
      if (!amountSource && item.defaultAmount > 0) {
        const isSavedCustom = (masterChoices.savedCustomServices || []).some(s => s.description.toLowerCase() === item.name.toLowerCase() || s.description.toLowerCase() === item.code.toLowerCase());
        if (isSavedCustom) {
          amountSource = 'Saved Preset';
          sourceDetail = `Preset amount saved from previous invoice entries (₱${item.defaultAmount.toLocaleString()})`;
        } else {
          amountSource = 'Default Preset';
          sourceDetail = `Standard service catalog preset rate (₱${item.defaultAmount.toLocaleString()})`;
        }
      }

      return {
        ...item,
        defaultAmount: resolvedAmount,
        amountSource,
        sourceDetail
      };
    });
  };

  const unifiedServiceCatalog = useMemo(() => {
    return getEnrichedUnifiedCatalog(selectedClient);
  }, [selectedClient, payables, masterChoices]);

  const editUnifiedServiceCatalog = useMemo(() => {
    const currentClient = clients.find(c => c.id === selectedInvoice?.clientId);
    return getEnrichedUnifiedCatalog(currentClient);
  }, [selectedInvoice, clients, payables, masterChoices]);

  const analyticsUnifiedCatalog = useMemo(() => {
    const currentClient = analyticsClientFilter !== 'ALL' ? clients.find(c => c.id === analyticsClientFilter) : null;
    return getEnrichedUnifiedCatalog(currentClient);
  }, [analyticsClientFilter, clients, payables, masterChoices]);

  // Select Item from Unified Dropdown (with Duplicate Check Warning)
  const handleSelectUnifiedItem = (item: { code: string; name: string; category: 'BIR' | 'Benefits' | 'Others'; defaultAmount?: number }) => {
    let cleanDesc = item.name;
    if (item.category === 'BIR') {
      cleanDesc = getCleanBirDescription(item.code, item.name);
    } else if (item.code === 'RETAINERS_FEE') {
      cleanDesc = 'Retainers Fee';
    }
    const period = getPeriodForForm(item.code, selectedMonth, parseInt(selectedYear, 10), selectedClient);
    const amount = item.defaultAmount || (item.code === 'RETAINERS_FEE' ? (selectedClient?.retainersFee || 0) : 0);

    const pendingLine: InvoiceServiceLine = {
      description: cleanDesc,
      monthYear: period,
      unitPrice: amount,
      quantity: 1,
      amount: amount,
      itemType: item.code === 'RETAINERS_FEE' ? 'Service' : 'One-Time'
    };

    if (selectedClientId) {
      const duplicateCheck = findAlreadyBilledInvoice(selectedClientId, cleanDesc, period, amount);
      if (duplicateCheck.isBilled) {
        setDuplicateWarningModal({
          isOpen: true,
          itemName: cleanDesc,
          monthYear: period,
          amount: amount,
          billingNumber: duplicateCheck.billingNumber || 'N/A',
          pendingLine
        });
        setIsServicePickerOpen(false);
        setServiceSearchTerm('');
        return;
      }
    }

    setServices(prev => {
      const updated = [...prev, pendingLine];
      if (selectedClient) {
        checkAndTriggerSetAction(updated.length - 1, pendingLine.description, pendingLine.monthYear, pendingLine.amount, selectedClient);
      }
      return updated;
    });
    setIsServicePickerOpen(false);
    setServiceSearchTerm('');
  };

  // Create Custom Item from Unified Dropdown (with Duplicate Check Warning)
  const handleCreateCustomItem = (nameOverride?: string) => {
    const nameToUse = (nameOverride || customItemName || serviceSearchTerm).trim();
    if (!nameToUse) {
      setAlertModal({
        isOpen: true,
        title: 'Description Required',
        message: 'Please enter an item or service description.',
        type: 'warning'
      });
      return;
    }
    const periodToUse = customItemPeriod.trim() || getPeriodForForm(nameToUse, selectedMonth, parseInt(selectedYear, 10), selectedClient);
    const amountToUse = Number(customItemAmount) || 0;

    const pendingLine: InvoiceServiceLine = {
      description: nameToUse,
      monthYear: periodToUse,
      unitPrice: amountToUse,
      quantity: 1,
      amount: amountToUse,
      itemType: 'One-Time'
    };

    if (selectedClientId) {
      const duplicateCheck = findAlreadyBilledInvoice(selectedClientId, nameToUse, periodToUse, amountToUse);
      if (duplicateCheck.isBilled) {
        setDuplicateWarningModal({
          isOpen: true,
          itemName: nameToUse,
          monthYear: periodToUse,
          amount: amountToUse,
          billingNumber: duplicateCheck.billingNumber || 'N/A',
          pendingLine
        });
        setCustomItemName('');
        setCustomItemPeriod('');
        setCustomItemAmount(0);
        setServiceSearchTerm('');
        setShowCreateCustomSection(false);
        setIsServicePickerOpen(false);
        return;
      }
    }

    setServices(prev => {
      const updated = [...prev, pendingLine];
      if (selectedClient) {
        checkAndTriggerSetAction(updated.length - 1, pendingLine.description, pendingLine.monthYear, pendingLine.amount, selectedClient);
      }
      return updated;
    });

    if (saveCustomForFuture) {
      saveCustomService({ description: nameToUse, defaultAmount: amountToUse });
    }

    setCustomItemName('');
    setCustomItemPeriod('');
    setCustomItemAmount(0);
    setServiceSearchTerm('');
    setShowCreateCustomSection(false);
    setIsServicePickerOpen(false);
  };

  // Select Item from Unified Dropdown for Modify SOA Modal ⭐
  const handleSelectEditUnifiedItem = (item: { code: string; name: string; category: 'BIR' | 'Benefits' | 'Others'; defaultAmount?: number }) => {
    let cleanDesc = item.name;
    if (item.category === 'BIR') {
      cleanDesc = getCleanBirDescription(item.code, item.name);
    } else if (item.code === 'RETAINERS_FEE') {
      cleanDesc = 'Retainers Fee';
    }
    const currentClient = clients.find(c => c.id === selectedInvoice?.clientId);
    const invYear = selectedInvoice?.issueDate ? new Date(selectedInvoice.issueDate).getFullYear() : parseInt(selectedYear, 10);
    const invMonth = selectedInvoice?.issueDate ? new Date(selectedInvoice.issueDate).toLocaleString('default', { month: 'long' }) : selectedMonth;
    const period = getPeriodForForm(item.code, invMonth, invYear, currentClient);
    const amount = item.defaultAmount || (item.code === 'RETAINERS_FEE' ? (currentClient?.monthlyRetainerFee || currentClient?.retainersFee || 0) : 0);

    const pendingLine: InvoiceServiceLine = {
      description: cleanDesc,
      monthYear: period,
      unitPrice: amount,
      quantity: 1,
      amount: amount,
      itemType: item.code === 'RETAINERS_FEE' ? 'Service' : 'One-Time'
    };

    setEditServices(prev => [...prev, pendingLine]);
    setIsEditServicePickerOpen(false);
    setEditServiceSearchTerm('');
    setShowEditCreateCustomSection(false);
  };

  // Create Custom Item from Unified Dropdown for Modify SOA Modal ⭐
  const handleCreateEditCustomItem = (nameOverride?: string) => {
    const nameToUse = (nameOverride || editCustomItemName || editServiceSearchTerm).trim();
    if (!nameToUse) {
      setAlertModal({
        isOpen: true,
        title: 'Description Required',
        message: 'Please enter an item or service description.',
        type: 'warning'
      });
      return;
    }
    const currentClient = clients.find(c => c.id === selectedInvoice?.clientId);
    const invYear = selectedInvoice?.issueDate ? new Date(selectedInvoice.issueDate).getFullYear() : parseInt(selectedYear, 10);
    const invMonth = selectedInvoice?.issueDate ? new Date(selectedInvoice.issueDate).toLocaleString('default', { month: 'long' }) : selectedMonth;
    const periodToUse = editCustomItemPeriod.trim() || getPeriodForForm(nameToUse, invMonth, invYear, currentClient);
    const amountToUse = Number(editCustomItemAmount) || 0;

    const pendingLine: InvoiceServiceLine = {
      description: nameToUse,
      monthYear: periodToUse,
      unitPrice: amountToUse,
      quantity: 1,
      amount: amountToUse,
      itemType: 'One-Time'
    };

    if (saveEditCustomForFuture) {
      saveCustomService({ description: nameToUse, defaultAmount: amountToUse });
    }

    setEditServices(prev => [...prev, pendingLine]);
    setIsEditServicePickerOpen(false);
    setEditServiceSearchTerm('');
    setEditCustomItemName('');
    setEditCustomItemPeriod('');
    setEditCustomItemAmount(0);
    setShowEditCreateCustomSection(false);
  };

  const handleRemoveServiceLine = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
    setLineSetActionStatus(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setDescriptionErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setMonthYearErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setAmountErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleServiceChange = (index: number, field: 'description' | 'monthYear' | 'amount', value: any) => {
    const updated = [...services];
    const current = updated[index] || { description: '', monthYear: '', amount: 0 };
    if (field === 'description') {
      updated[index] = {
        ...current,
        description: value
      };
      if (descriptionErrors[index]) {
        setDescriptionErrors(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    } else if (field === 'monthYear') {
      const parsedMonths = parsePeriodToMonths(String(value || ''));
      const amt = Number(current.amount) || 0;
      updated[index] = {
        ...current,
        monthYear: value,
        coveredMonths: parsedMonths,
        monthlyRate: parsedMonths.length > 0 ? amt / parsedMonths.length : amt
      };
      if (monthYearErrors[index]) {
        setMonthYearErrors(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    } else if (field === 'amount') {
      const numAmt = Number(value) || 0;
      const months = current.coveredMonths && current.coveredMonths.length > 0 
        ? current.coveredMonths 
        : parsePeriodToMonths(current.monthYear);
      updated[index] = {
        ...current,
        amount: numAmt,
        unitPrice: numAmt,
        monthlyRate: months.length > 0 ? numAmt / months.length : numAmt
      };
      if (amountErrors[index]) {
        setAmountErrors(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    } else {
      updated[index] = {
        ...current,
        [field]: value
      };
    }
    setServices(updated);

    // Auto-detect and trigger "Set Action" in Monthly Deadline To-Do List
    const finalDesc = field === 'description' ? value : current.description;
    const finalPeriod = field === 'monthYear' ? value : current.monthYear;
    const finalAmount = field === 'amount' ? (Number(value) || 0) : (Number(current.amount) || 0);

    if (selectedClientId) {
      const cl = clients.find(c => c.id === selectedClientId);
      checkAndTriggerSetAction(index, finalDesc, finalPeriod, finalAmount, cl);
    }
  };

  // Subtotal & Total Calculations (12% VAT removed per user request)
  const subtotal = services.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const vatAmount = 0;
  const totalAmount = subtotal;

  // Submit Create Invoice -> Prompts Confirmation Dialog First
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setAlertModal({
        isOpen: true,
        title: 'Client Company Required',
        message: 'Please select a client company from the dropdown before generating the Statement of Account (SOA).',
        type: 'warning'
      });
      return;
    }

    const cleanColl = collectionNumber.trim();
    if (!cleanColl) {
      setCollectionNumError('Collection # is required.');
      return;
    }

    if (isCollectionNumberUsed(cleanColl)) {
      setCollectionNumError(`❌ Collection # ${cleanColl} is already in use! Please enter a unique Collection #.`);
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    if (services.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Billable Items Required',
        message: 'Please add at least one billable item or service line to generate the Statement of Account (SOA).',
        type: 'warning'
      });
      return;
    }

    // Validate that every line item has a valid description, month/year, and positive amount
    const descErrs: Record<number, string> = {};
    const monthErrs: Record<number, string> = {};
    const amtErrs: Record<number, string> = {};

    services.forEach((item, idx) => {
      if (!item.description || !item.description.trim()) {
        descErrs[idx] = 'Item description is empty';
      }
      if (!item.monthYear || !String(item.monthYear).trim()) {
        monthErrs[idx] = 'Month and Year is empty';
      }
      const amt = Number(item.amount);
      if (!amt || amt <= 0 || isNaN(amt)) {
        amtErrs[idx] = 'Amount is empty';
      }
    });

    if (Object.keys(descErrs).length > 0 || Object.keys(monthErrs).length > 0 || Object.keys(amtErrs).length > 0 || totalAmount <= 0) {
      setDescriptionErrors(descErrs);
      setMonthYearErrors(monthErrs);
      setAmountErrors(amtErrs);
      return;
    }
    setDescriptionErrors({});
    setMonthYearErrors({});
    setAmountErrors({});

    // Open confirmation dialog before finalizing creation
    setConfirmGenerateModal({
      isOpen: true,
      clientName: client.companyName,
      collectionNumber: cleanColl,
      totalAmount,
      servicesCount: services.length,
      issueDate,
      dueDate,
      billingPeriod,
      pendingData: {
        client,
        cleanColl,
        issueDate,
        dueDate,
        subtotal,
        totalAmount,
        services: [...services],
        billingNotes: showNotesBox && billingNotes.trim() ? billingNotes.trim() : undefined,
        billingPeriod
      }
    });
  };

  // Finalize Invoice Creation after User Confirms "Proceed"
  const handleConfirmCreateInvoice = () => {
    if (!confirmGenerateModal.pendingData) return;
    const { client, cleanColl, issueDate, dueDate, subtotal, totalAmount, services: confirmedServices, billingNotes: confirmedNotes, billingPeriod: confirmedPeriod } = confirmGenerateModal.pendingData;

    // Auto-save any custom service descriptions for future reuse
    confirmedServices.forEach(s => {
      if (s.description && s.description.trim()) {
        saveCustomService({ description: s.description.trim(), defaultAmount: s.amount });
      }
    });

    // Ensure all compliance items in confirmedServices are linked and marked as Payable Logged in To-Do List upon successful generation
    syncInvoiceServicesToPayablesAndToDo(confirmedServices, client, cleanColl);

    const createdInv = addInvoice({
      clientId: client.id,
      clientName: client.companyName,
      collectionNumber: cleanColl,
      issueDate,
      dueDate,
      subtotal,
      vatAmount: 0,
      totalAmount,
      paidAmount: 0,
      status: 'For Collection',
      services: confirmedServices,
      billingNotes: confirmedNotes,
    });

    addAuditLog(
      'Invoice Generated',
      `Generated Statement of Account (Collection # ${cleanColl}) for ${client.companyName} amounting to ₱${totalAmount.toLocaleString()} (${confirmedPeriod}).`,
      currentUser?.id || 'system',
      currentUser?.fullName || 'System Admin'
    );

    setConfirmGenerateModal({
      isOpen: false,
      clientName: '',
      collectionNumber: '',
      totalAmount: 0,
      servicesCount: 0,
      issueDate: '',
      dueDate: '',
      billingPeriod: ''
    });

    setShowCreateModal(false);
    setSelectedInvoice(createdInv);
    setIsCrPaymentMode(false);
    setCrViewFormat('default');
    setShowCrModal(true);
  };

  // Helper to update per-item payment configurations in UI state (No premature database writes)
  const handleUpdateItemPayment = (serviceIdx: number, updates: Partial<CrItemPaymentConfig>) => {
    if (!selectedInvoice) return;

    const current = crItemPaymentConfigs[serviceIdx] || {
      mode: 'Cash',
      amount: selectedInvoice?.services[serviceIdx]?.amount || 0,
      bank: 'BDO (Banco de Oro)',
      customBank: '',
      chequeNo: '',
      payee: 'FFCSI',
      customPayee: '',
      isPaid: false
    };
    const updated = {
      ...current,
      ...updates
    };
    const newConfigs = {
      ...crItemPaymentConfigs,
      [serviceIdx]: updated
    };

    setCrItemPaymentConfigs(newConfigs);

    // Automatically recalculate overall payment total ONLY from items marked as PAID
    const totalFromPaidConfigs = (Object.values(newConfigs) as CrItemPaymentConfig[]).reduce(
      (sum: number, c: CrItemPaymentConfig) => sum + (c.isPaid ? (Number(c.amount) || 0) : 0),
      0
    );
    setPaymentAmount(totalFromPaidConfigs);
  };

  // Open Payment Remittance in Official Collection Receipt (FFCSI Format) - Super Admin Only
  const handleOpenPayment = (inv: InvoiceItem) => {
    if (inv.status === 'Cancelled') {
      setAlertModal({
        isOpen: true,
        title: 'Transaction Cancelled',
        message: 'Processing or modifying payments on cancelled SOA transactions is not allowed.',
        type: 'warning'
      });
      return;
    }
    if (!isSuperAdmin) {
      setAlertModal({
        isOpen: true,
        title: 'Access Restricted',
        message: '🔒 Only Super Admin can process and record payments for billing.',
        type: 'warning'
      });
      return;
    }
    setSelectedInvoice(inv);
    setPaymentDate(inv.paymentDate || new Date().toISOString().substring(0, 10));
    setPaymentMethod(inv.paymentMethod || 'Cash');
    setPaymentRefNum('');
    setPaymentNotes(inv.billingNotes || '');

    // C.R. Number: ALWAYS default to this invoice's collection number (e.g. 1014, 1007)
    const existingCr = inv.collectionNumber || inv.collectionReceiptNumber || inv.officialReceiptNumber || inv.invoiceNumber || '1001';
    const cleanDigits = existingCr.replace(/\D/g, '') || '1001';
    setOrNumber(cleanDigits);
    setCrError('');

    // Initialize per-item payment configurations with strict item-level isolation
    const initialConfigs: Record<number, CrItemPaymentConfig> = {};

    inv.services.forEach((s, idx) => {
      const isCheque = s.paymentMode === 'Cheque' || (s.paymentMethod && s.paymentMethod.toLowerCase().includes('cheque'));
      const detectedPayee = s.chequePayee || 'FFCSI';
      const isCustomPayee = !['FFCSI', 'BIR', 'City Hall', 'SEC', 'SSS'].includes(detectedPayee);

      let bank = 'BDO (Banco de Oro)';
      let chequeNo = s.chequeNumber || '';
      let customBank = '';
      if (s.chequeNumber) {
        const parts = s.chequeNumber.split(' ');
        const matched = PH_BANKS.find(b => b.startsWith(parts[0]));
        if (matched) {
          bank = matched;
          chequeNo = parts.slice(1).join(' ').replace(/^#/, '');
        }
      }

      // Check item-level paid status: strictly paid if s.isPaid === true, or if invoice was fully Paid
      const itemIsPaid = s.isPaid === true || (inv.status === 'Paid' && s.isPaid !== false);

      initialConfigs[idx] = {
        mode: isCheque ? 'Cheque' : 'Cash',
        amount: itemIsPaid ? (s.amount || 0) : 0,
        bank: bank,
        customBank: customBank,
        chequeNo: chequeNo,
        payee: isCustomPayee ? 'Other' : detectedPayee,
        customPayee: isCustomPayee ? detectedPayee : '',
        isPaid: itemIsPaid
      };
    });

    const paidSum = Object.values(initialConfigs).reduce(
      (sum, c) => sum + (c.isPaid ? (Number(c.amount) || 0) : 0),
      0
    );
    setPaymentAmount(paidSum);
    setCrItemPaymentConfigs(initialConfigs);
    setIsCrPaymentMode(true);
    setShowCrModal(true);
  };

  // Compute Active Check Summary for Document Footer & Preview
  const getActiveCheckSummary = (): string => {
    if (!selectedInvoice) return '';
    if (isCrPaymentMode) {
      const configEntries = Object.values(crItemPaymentConfigs) as CrItemPaymentConfig[];
      const cheques = configEntries
        .filter((c: CrItemPaymentConfig) => c.mode === 'Cheque' && (c.isPaid || c.chequeNo))
        .map((c: CrItemPaymentConfig) => {
          const bankName = c.bank === 'Other Bank' ? (c.customBank || 'Cheque') : c.bank.split(' ')[0];
          const p = c.payee === 'Other' ? (c.customPayee || 'Other') : c.payee;
          const num = c.chequeNo ? `#${c.chequeNo}` : '';
          return `${bankName} ${num} (${p})`.trim();
        });
      if (cheques.length > 0) {
        return cheques.join(', ');
      }
      return '';
    } else {
      const cheques = (selectedInvoice.services || [])
        .filter(s => s.paymentMode === 'Cheque' || s.chequeNumber)
        .map(s => `${s.chequeNumber || 'Cheque'}${s.chequePayee ? ` (${s.chequePayee})` : ''}`);
      if (cheques.length > 0) {
        return cheques.join(', ');
      }
      return (selectedInvoice.paymentMethod && selectedInvoice.paymentMethod.includes('Cheque') ? selectedInvoice.paymentMethod : '');
    }
  };

  // Step 1: Validate & Open Confirmation Modal for Payment Remittance (Issue C.R.)
  const handleSubmitPayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedInvoice) return;

    const targetInv = invoices.find(i => i.id === selectedInvoice.id) || selectedInvoice;

    // 4-Digit Unique C.R. # Enforcement
    const cleanDigits = (orNumber || targetInv.collectionNumber || targetInv.collectionReceiptNumber || targetInv.invoiceNumber || '1001').trim().replace(/\D/g, '') || '1001';

    // Verify other invoices do not have this CR #
    const isUsedByOther = invoices.some(
      other => other.id !== targetInv.id && (
        (other.collectionReceiptNumber && other.collectionReceiptNumber.replace(/\D/g, '') === cleanDigits) ||
        (other.officialReceiptNumber && other.officialReceiptNumber.replace(/\D/g, '') === cleanDigits)
      )
    );

    if (isUsedByOther) {
      setCrError(`❌ C.R. # ${cleanDigits} has already been assigned to another invoice.`);
      return;
    }

    setCrError('');
    const finalCr = cleanDigits;

    const updatedServices = targetInv.services.map((s, idx) => {
      const cfg: CrItemPaymentConfig = crItemPaymentConfigs[idx] || {
        mode: 'Cash',
        amount: s.amount,
        bank: 'BDO (Banco de Oro)',
        customBank: '',
        chequeNo: '',
        payee: 'FFCSI',
        customPayee: '',
        isPaid: Boolean(s.isPaid)
      };
      const finalBank = cfg.bank === 'Other Bank' ? (cfg.customBank || 'Bank') : cfg.bank.split(' ')[0];
      const finalPayee = cfg.payee === 'Other' ? (cfg.customPayee || 'Other') : cfg.payee;
      const finalChequeStr = `${finalBank} ${cfg.chequeNo}`.trim();
      const methodLabel = cfg.mode === 'Cheque' 
        ? `Cheque (${finalChequeStr || 'No #'}) to ${finalPayee || 'FFCSI'}`
        : 'Cash Payment';

      return {
        ...s,
        isPaid: Boolean(cfg.isPaid),
        amount: Number(cfg.amount) > 0 ? Number(cfg.amount) : s.amount,
        paymentMode: cfg.mode,
        chequeNumber: cfg.mode === 'Cheque' ? finalChequeStr : undefined,
        chequePayee: cfg.mode === 'Cheque' ? finalPayee : undefined,
        paymentMethod: methodLabel
      };
    });

    const configsList = Object.values(crItemPaymentConfigs) as CrItemPaymentConfig[];
    const paidConfigs = configsList.filter((c: CrItemPaymentConfig) => c.isPaid);
    const hasCheque = paidConfigs.some((c: CrItemPaymentConfig) => c.mode === 'Cheque');
    const hasCash = paidConfigs.some((c: CrItemPaymentConfig) => c.mode === 'Cash');
    const overallMethod = hasCheque && hasCash ? 'Mixed (Cash & Cheque)' : hasCheque ? 'Cheque Payment' : hasCash ? 'Cash Collection' : (targetInv.paymentMethod || 'Cash');

    const chequeRefs = paidConfigs
      .filter((c: CrItemPaymentConfig) => c.mode === 'Cheque' && c.chequeNo)
      .map((c: CrItemPaymentConfig) => {
        const b = c.bank === 'Other Bank' ? (c.customBank || 'Cheque') : c.bank.split(' ')[0];
        const p = c.payee === 'Other' ? c.customPayee : c.payee;
        return `${b} #${c.chequeNo} (${p})`;
      })
      .join(', ');

    const totalPaidFromItems = updatedServices.reduce((sum, s, idx) => {
      const c = crItemPaymentConfigs[idx];
      return sum + ((c && c.isPaid) ? (Number(c.amount) || s.amount) : 0);
    }, 0);
    const finalPaymentAmount = totalPaidFromItems;
    const isFullyPaid = Number(finalPaymentAmount) >= targetInv.totalAmount;
    const newStatus = isFullyPaid ? 'Paid' : (Number(finalPaymentAmount) > 0 ? 'Partially Paid' : targetInv.status);

    // Open Confirmation Modal instead of alert
    setConfirmCrPaymentModal({
      isOpen: true,
      targetInv,
      finalCr,
      finalPaymentAmount,
      overallMethod,
      paymentDate: paymentDate || new Date().toISOString().substring(0, 10),
      paymentNotes: paymentNotes || '',
      updatedServices,
      chequeRefs,
      isFullyPaid,
      newStatus
    });
  };

  // Step 2: Execute Payment Recording after user confirms in Modal
  const handleExecuteCrPayment = () => {
    if (!confirmCrPaymentModal.targetInv) return;
    const { targetInv, finalCr, finalPaymentAmount, overallMethod, paymentDate: confirmedDate, paymentNotes: confirmedNotes, updatedServices, chequeRefs, newStatus } = confirmCrPaymentModal;

    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const auditDetails = `Payment Remittance Recorded: C.R. #${finalCr}, Amount: ₱${Number(finalPaymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}, Method: ${overallMethod}${chequeRefs ? ` • Cheques: ${chequeRefs}` : ''}${confirmedNotes ? ` • Notes: ${confirmedNotes}` : ''}`;

    const amendmentRecord = {
      date: nowTimestamp,
      modifiedBy: currentUser?.fullName || 'Super Admin',
      details: auditDetails,
      previousTotal: targetInv.paidAmount || 0,
      newTotal: Number(finalPaymentAmount)
    };

    const updatedAmendedHistory = [amendmentRecord, ...(targetInv.amendedHistory || [])];

    const updatedTargetInv: InvoiceItem = {
      ...targetInv,
      paidAmount: Number(finalPaymentAmount),
      status: newStatus,
      collectionReceiptNumber: finalCr,
      officialReceiptNumber: finalCr,
      paymentDate: confirmedDate || new Date().toISOString().substring(0, 10),
      paymentMethod: overallMethod,
      billingNotes: confirmedNotes || targetInv.billingNotes,
      services: updatedServices,
      amendedHistory: updatedAmendedHistory
    };

    editInvoicePayment(
      targetInv.id,
      {
        amount: Number(finalPaymentAmount),
        paymentDate: confirmedDate || new Date().toISOString().substring(0, 10),
        paymentMethod: overallMethod,
        referenceNumber: chequeRefs || paymentRefNum,
        officialReceiptNumber: finalCr,
        collectionReceiptNumber: finalCr,
        notes: confirmedNotes,
        updatedServices,
        amendedHistory: updatedAmendedHistory
      },
      currentUser?.id || 'system',
      currentUser?.fullName || 'Super Admin'
    );

    addAuditLog(
      'Financial Payment Recorded',
      `${auditDetails} for Collection #${targetInv.collectionNumber || targetInv.invoiceNumber} (${targetInv.clientName}). Status updated to ${newStatus}.`,
      currentUser?.id || 'system',
      currentUser?.fullName || 'Super Admin'
    );

    setSelectedInvoice(updatedTargetInv);
    setIsCrPaymentMode(false);
    setConfirmCrPaymentModal(prev => ({ ...prev, isOpen: false }));

    setAlertModal({
      isOpen: true,
      title: 'Payment Recorded Successfully',
      message: `Official Collection Receipt #${finalCr} has been issued for ${targetInv.clientName}.\n\nTotal Paid: ₱${Number(finalPaymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}\nStatus: ${newStatus}`,
      type: 'success'
    });
  };

  // Open SOA / Collection Receipt Modal (Default to FFCSI Format)
  const handleViewSoa = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setIsCrPaymentMode(false);
    setShowCrModal(true);
  };

  // Open Edit SOA Modal for Assigned Staff / Super Admin
  const handleOpenEditModal = (inv: InvoiceItem) => {
    if (inv.status === 'Cancelled') {
      setAlertModal({
        isOpen: true,
        title: 'Transaction Cancelled',
        message: 'Modifying or amending cancelled SOA transactions is not allowed.',
        type: 'warning'
      });
      return;
    }
    setSelectedInvoice(inv);
    setEditServices(inv.services.map(s => ({ ...s })));
    setEditReason('');
    setEditBillingNotes(inv.billingNotes || '');
    setShowEditNotesBox(Boolean(inv.billingNotes && inv.billingNotes.trim()));
    setIsEditServicePickerOpen(false);
    setEditServiceSearchTerm('');
    setShowEditCreateCustomSection(false);
    setEditCustomItemName('');
    setEditCustomItemPeriod('');
    setEditCustomItemAmount(0);
    setShowEditModal(true);
  };

  // Submit Edit Invoice (Amended History preserved)
  const handleSaveEditInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (!editReason.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Modification Reason Required',
        message: 'Please provide a reason / details for modifying this transaction.',
        type: 'warning'
      });
      return;
    }

    const newSubtotal = editServices.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const newTotal = newSubtotal;

    updateInvoice(
      selectedInvoice.id,
      {
        services: editServices,
        subtotal: newSubtotal,
        totalAmount: newTotal,
        billingNotes: showEditNotesBox && editBillingNotes.trim() ? editBillingNotes.trim() : undefined
      },
      editReason.trim(),
      currentUser?.fullName || 'Assigned Staff'
    );

    addAuditLog(
      'Invoice Amended',
      `Modified SOA Invoice ${selectedInvoice.invoiceNumber} (${selectedInvoice.clientName}). Reason: ${editReason}`,
      currentUser?.id || 'staff',
      currentUser?.fullName || 'Assigned Staff'
    );

    setShowEditModal(false);
    setAlertModal({
      isOpen: true,
      title: 'Transaction Successfully Modified',
      message: 'Transaction successfully modified and recorded in Amended History!',
      type: 'success'
    });
  };

  // Open Cancel SOA Transaction Modal
  const handleOpenCancelModal = (inv: InvoiceItem) => {
    setCancelInvoiceModal({
      isOpen: true,
      invoice: inv,
      reason: ''
    });
  };

  // Confirm and Execute Cancel SOA Transaction
  const handleConfirmCancelInvoice = () => {
    if (!cancelInvoiceModal.invoice) return;
    if (!cancelInvoiceModal.reason.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Cancellation Reason Required',
        message: 'Please provide a reason for cancelling this SOA transaction.',
        type: 'warning'
      });
      return;
    }

    const target = cancelInvoiceModal.invoice;
    const res = cancelInvoice(
      target.id,
      cancelInvoiceModal.reason.trim(),
      currentUser?.id || 'system',
      currentUser?.fullName || 'Super Admin'
    );

    setCancelInvoiceModal({ isOpen: false, invoice: null, reason: '' });
    setShowEditModal(false);

    if (selectedInvoice && selectedInvoice.id === target.id) {
      setSelectedInvoice(prev => prev ? {
        ...prev,
        status: 'Cancelled',
        paidAmount: 0,
        cancelledAt: new Date().toISOString(),
        cancelledBy: currentUser?.fullName || 'Super Admin',
        cancellationReason: cancelInvoiceModal.reason.trim(),
        services: prev.services.map(s => ({ ...s, isPaid: false }))
      } : null);
    }

    setAlertModal({
      isOpen: true,
      title: res.success ? 'SOA Transaction Cancelled' : 'Cancellation Failed',
      message: res.message,
      type: res.success ? 'success' : 'error'
    });
  };

  // Open History Modal
  const handleOpenHistoryModal = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setShowHistoryModal(true);
  };

  // Open Collection Follow-Up Log Modal ⭐
  const handleOpenCollectionModal = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setCollectionContactPerson(inv.clientName);
    setCollectionContactMethod('Phone Call');
    setCollectionStatus(inv.collectionStatus || 'Follow-Up Required');
    setCollectionNotes('');
    const defaultNext = new Date();
    defaultNext.setDate(defaultNext.getDate() + 3);
    setCollectionNextFollowUp(inv.nextFollowUpDate || defaultNext.toISOString().substring(0, 10));
    setShowCollectionModal(true);
  };

  // Submit Collection Follow-Up Log ⭐
  const handleSubmitCollectionLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (!collectionNotes.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Notes Required',
        message: 'Please enter collection follow-up details or outcome notes.',
        type: 'warning'
      });
      return;
    }

    const res = addCollectionLog(
      selectedInvoice.id,
      {
        contactPerson: collectionContactPerson.trim(),
        contactMethod: collectionContactMethod,
        status: collectionStatus,
        notes: collectionNotes.trim(),
        nextFollowUpDate: collectionNextFollowUp
      },
      currentUser?.id,
      currentUser?.fullName
    );

    setShowCollectionModal(false);
    setAlertModal({
      isOpen: true,
      title: 'Collection Follow-Up Saved',
      message: res.message,
      type: res.success ? 'success' : 'warning'
    });
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' 
      ? true 
      : statusFilter === 'For Collection'
        ? (inv.status === 'For Collection' || inv.status === 'Sent')
        : inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalBilled = invoices.filter(i => i.status !== 'Cancelled').reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.filter(i => i.status !== 'Cancelled').reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const totalOutstanding = totalBilled - totalCollected;
  const overdueCount = invoices.filter(i => i.status !== 'Cancelled' && (i.status === 'Overdue' || ((i.status === 'For Collection' || i.status === 'Sent') && new Date(i.dueDate) < new Date()))).length;

  // Accounts Receivable Filtered List ⭐
  const filteredARInvoices = invoices.filter(inv => {
    if (inv.status === 'Cancelled') return false;

    // Search query
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(arSearchQuery.toLowerCase()) ||
                        inv.clientName.toLowerCase().includes(arSearchQuery.toLowerCase()) ||
                        (inv.collectionNumber || '').includes(arSearchQuery);

    // Client filter
    const matchClient = arClientFilter === 'ALL' || inv.clientId === arClientFilter;

    // Status filter
    const balance = getInvoiceBalance(inv.id);
    const isOverdue = new Date(inv.dueDate) < new Date() && balance > 0;
    
    let matchStatus = true;
    if (arStatusFilter === 'Overdue') {
      matchStatus = isOverdue;
    } else if (arStatusFilter === 'Paid') {
      matchStatus = inv.status === 'Paid' || balance <= 0;
    } else if (arStatusFilter === 'Partially Paid') {
      matchStatus = inv.status === 'Partially Paid';
    } else if (arStatusFilter !== 'ALL') {
      matchStatus = inv.collectionStatus === arStatusFilter || inv.status === arStatusFilter;
    }

    // Aging Bucket Filter
    let matchAging = true;
    if (arAgingFilter !== 'ALL') {
      const today = new Date();
      const dueObj = new Date(inv.dueDate);
      const diffDays = Math.floor((today.getTime() - dueObj.getTime()) / (1000 * 3600 * 24));

      if (arAgingFilter === 'Current') matchAging = diffDays <= 0 || balance <= 0;
      else if (arAgingFilter === 'Overdue30') matchAging = diffDays >= 1 && diffDays <= 30 && balance > 0;
      else if (arAgingFilter === 'Overdue60') matchAging = diffDays >= 31 && diffDays <= 60 && balance > 0;
      else if (arAgingFilter === 'Overdue90') matchAging = diffDays >= 61 && diffDays <= 90 && balance > 0;
      else if (arAgingFilter === 'Overdue90Plus') matchAging = diffDays > 90 && balance > 0;
    }

    // Service Category Filter
    let matchCategory = true;
    if (arCategoryFilter !== 'ALL') {
      matchCategory = inv.services.some(s => s.serviceCategory === arCategoryFilter);
    }

    return matchSearch && matchClient && matchStatus && matchAging && matchCategory;
  });

  // Accounts Receivable Aging Summaries ⭐
  const nowTime = new Date().getTime();
  const arAgingSummary = invoices.reduce((acc, inv) => {
    if (inv.status === 'Cancelled') return acc;
    const balance = getInvoiceBalance(inv.id);
    if (balance <= 0) return acc;

    const dueObj = new Date(inv.dueDate).getTime();
    const diffDays = Math.floor((nowTime - dueObj) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      acc.current.count++;
      acc.current.amount += balance;
    } else if (diffDays <= 30) {
      acc.days30.count++;
      acc.days30.amount += balance;
    } else if (diffDays <= 60) {
      acc.days60.count++;
      acc.days60.amount += balance;
    } else if (diffDays <= 90) {
      acc.days90.count++;
      acc.days90.amount += balance;
    } else {
      acc.days90Plus.count++;
      acc.days90Plus.amount += balance;
    }

    return acc;
  }, {
    current: { count: 0, amount: 0 },
    days30: { count: 0, amount: 0 },
    days60: { count: 0, amount: 0 },
    days90: { count: 0, amount: 0 },
    days90Plus: { count: 0, amount: 0 }
  });

  // Pagination for Master Invoices Tab
  const {
    currentPage: invoiceCurrentPage,
    pageSize: invoicePageSize,
    totalItems: invoiceTotalItems,
    paginatedItems: paginatedInvoices,
    setCurrentPage: setInvoiceCurrentPage,
    setPageSize: setInvoicePageSize,
    loadMore: invoiceLoadMore,
    hasMoreToLoad: invoiceHasMore,
  } = usePagination(filteredInvoices, {
    initialPageSize: 15,
    resetOnChange: `${searchQuery}_${statusFilter}`,
  });

  // Pagination for Accounts Receivable & Aging Tab
  const {
    currentPage: arCurrentPage,
    pageSize: arPageSize,
    totalItems: arTotalItems,
    paginatedItems: paginatedARInvoices,
    setCurrentPage: setArCurrentPage,
    setPageSize: setArPageSize,
    loadMore: arLoadMore,
    hasMoreToLoad: arHasMore,
  } = usePagination(filteredARInvoices, {
    initialPageSize: 15,
    resetOnChange: `${arSearchQuery}_${arClientFilter}_${arStatusFilter}_${arAgingFilter}_${arCategoryFilter}`,
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Client Billing, Accounts Receivable & Collections
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Statements of Account (SOA), AR aging buckets, follow-up logs, and Official Receipts.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => downloadBillingSummaryReportPDF(filteredInvoices)}
            title="Download Billing Summary PDF Report"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-slate-600" /> PDF Report
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-2xs text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Generate SOA Invoice
          </button>
        </div>
      </div>

      {/* PHASE 4 & PHASE 5: Billing Sub-Navigation Tabs Bar ⭐ */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-600" />
          Invoices & Master Ledger
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px]">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => {
            if (!soaSelectedClientId && clients.length > 0) {
              setSoaSelectedClientId(clients[0].id);
            }
            setActiveSubTab('soa');
          }}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'soa'
              ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-700" />
          Statement of Account (SOA)
        </button>

        <button
          onClick={() => setActiveSubTab('ar')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'ar'
              ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-600" />
          Accounts Receivable & Aging
          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
            totalOutstanding > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
          }`}>
            ₱{totalOutstanding.toLocaleString()}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'reports'
              ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-teal-600" />
          AR & Revenue Reports
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Revenue Analytics
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          Financial Audit Trail
        </button>
      </div>

      {/* SUB-TAB 1: INVOICES & SOA MASTER */}
      {activeSubTab === 'invoices' && (
        <>
          {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Retainers Billed</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-mono font-bold text-slate-900 mt-2">₱{totalBilled.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">{invoices.length} total active invoices</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Collections Billed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-mono font-bold text-emerald-600 mt-2">₱{totalCollected.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalBilled > 0 ? `${((totalCollected / totalBilled) * 100).toFixed(1)}% collection rate` : '0%'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Accounts Receivable</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-mono font-bold text-amber-600 mt-2">₱{totalOutstanding.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">Pending client remittance</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Overdue Invoices</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-mono font-bold text-rose-600 mt-2">{overdueCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Requires follow-up</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search collection # or client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['ALL', 'For Collection', 'Partially Paid', 'Paid', 'Overdue', 'Draft', 'Cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                statusFilter === status
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Master Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Collection #</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Issue & Due Date</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No billing invoices match your search query or filter.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map(inv => {
                  const balance = inv.totalAmount - (inv.paidAmount || 0);
                  const isCancelled = inv.status === 'Cancelled';
                  const isPastDue = !isCancelled && new Date(inv.dueDate) < new Date() && balance > 0;
                  const normalizedStatus = inv.status === 'Sent' ? 'For Collection' : inv.status;
                  const displayStatus = isCancelled ? 'Cancelled' : isPastDue ? 'Overdue' : normalizedStatus;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowCrModal(true);
                          }}
                          className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline text-xs flex items-center gap-1.5 cursor-pointer text-left"
                          title="Click to view Official Collection Receipt (FFCSI Format)"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          Collection #: {inv.collectionNumber || '1001'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {onNavigateToClient ? (
                          <button
                            onClick={() => onNavigateToClient(inv.clientId)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold text-left flex items-center gap-1"
                            title="Click to view Client Workspace & Billing"
                          >
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                            {inv.clientName}
                          </button>
                        ) : (
                          <span>{inv.clientName}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        <div>Issue: {inv.issueDate}</div>
                        <div className={isCancelled ? 'text-rose-600 italic font-bold' : isPastDue ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          {isCancelled ? `Cancelled (${inv.cancelledAt?.substring(0, 10) || 'Void'})` : `Due: ${inv.dueDate}`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        <span className={isCancelled ? 'line-through text-slate-400' : ''}>
                          ₱{inv.totalAmount.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        ₱{(inv.paidAmount || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                        <span className={isCancelled ? 'text-slate-400' : ''}>
                          ₱{isCancelled ? '0' : balance.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap inline-block ${
                          displayStatus === 'Cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold' :
                          displayStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          displayStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          displayStatus === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          (displayStatus === 'For Collection' || displayStatus === 'Sent') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-start gap-1.5 flex-wrap">
                          {/* Modify Transaction for Assigned Staff / Super Admin */}
                          {inv.status === 'Cancelled' ? (
                            <button
                              type="button"
                              disabled
                              title="Modify SOA is disabled: Transaction is Cancelled"
                              className="p-1.5 text-slate-300 rounded-lg cursor-not-allowed opacity-60"
                            >
                              <Edit className="w-4 h-4 text-slate-300" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenEditModal(inv)}
                              title="Modify Transaction / SOA Items"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Modify History Log Button (Icon-only) ⭐ */}
                          {inv.amendedHistory && inv.amendedHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenHistoryModal(inv)}
                              title={`View Modify History (${inv.amendedHistory.length} edits)`}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg transition-colors cursor-pointer shrink-0 relative flex items-center justify-center"
                            >
                              <History className="w-4 h-4 text-amber-600" />
                              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                                {inv.amendedHistory.length}
                              </span>
                            </button>
                          )}

                          {balance > 0 && inv.status !== 'Cancelled' && (
                            isSuperAdmin ? (
                              <button
                                onClick={() => handleOpenPayment(inv)}
                                title="Record Payment (Super Admin)"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Pay
                              </button>
                            ) : (
                              <button
                                disabled
                                title="Only Super Admin can process and record payments"
                                className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-not-allowed opacity-80"
                              >
                                <Lock className="w-3 h-3 text-slate-400" /> Super Admin Only
                              </button>
                            )
                          )}

                          {(inv.status === 'Paid' || inv.status === 'Partially Paid' || (inv.paidAmount || 0) > 0) && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsCrPaymentMode(false);
                                setShowCrModal(true);
                              }}
                              title={`View Receipt (${inv.collectionReceiptNumber || inv.officialReceiptNumber || 'Paid'})`}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                              View Receipt
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                setDeleteInvoiceModal({ isOpen: true, invoice: inv });
                              }}
                              title="Delete Invoice"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Invoices Table Pagination Controls */}
        <TablePagination
          currentPage={invoiceCurrentPage}
          totalItems={invoiceTotalItems}
          pageSize={invoicePageSize}
          onPageChange={setInvoiceCurrentPage}
          onPageSizeChange={setInvoicePageSize}
          onLoadMore={invoiceLoadMore}
          hasMoreToLoad={invoiceHasMore}
          itemLabel="invoices"
        />
      </div>
        </>
      )}

      {/* SUB-TAB: ACCOUNTS RECEIVABLE & COLLECTIONS */}
      {activeSubTab === 'ar' && (
        <div className="space-y-6">
          {/* AR Executive Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 font-semibold block">Total Receivables (AR)</span>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-2">₱{totalOutstanding.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 mt-1">{invoices.filter(i => getInvoiceBalance(i.id) > 0).length} open invoices</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 font-semibold block">Current AR (Not Past Due)</span>
              <p className="text-2xl font-mono font-bold text-emerald-600 mt-2">₱{arAgingSummary.current.amount.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 mt-1">{arAgingSummary.current.count} invoices within due terms</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 font-semibold block">Overdue AR</span>
              <p className="text-2xl font-mono font-bold text-rose-600 mt-2">
                ₱{(totalOutstanding - arAgingSummary.current.amount).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {invoices.filter(i => new Date(i.dueDate) < new Date() && getInvoiceBalance(i.id) > 0).length} past due invoices
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 font-semibold block">Overall Collection Rate</span>
              <p className="text-2xl font-mono font-bold text-blue-600 mt-2">
                {totalBilled > 0 ? `${((totalCollected / totalBilled) * 100).toFixed(1)}%` : '0%'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">₱{totalCollected.toLocaleString()} collected of ₱{totalBilled.toLocaleString()}</p>
            </div>
          </div>

          {/* Aging Buckets Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" /> Accounts Receivable Aging Buckets (Days Past Due)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <button
                onClick={() => setArAgingFilter(arAgingFilter === 'Current' ? 'ALL' : 'Current')}
                className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                  arAgingFilter === 'Current' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <p className="text-[11px] font-bold text-slate-600">Current (Not Due)</p>
                <p className="text-lg font-mono font-bold text-emerald-700 mt-1">₱{arAgingSummary.current.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{arAgingSummary.current.count} Invoices</p>
              </button>

              <button
                onClick={() => setArAgingFilter(arAgingFilter === 'Overdue30' ? 'ALL' : 'Overdue30')}
                className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                  arAgingFilter === 'Overdue30' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <p className="text-[11px] font-bold text-amber-800">1–30 Days Overdue</p>
                <p className="text-lg font-mono font-bold text-amber-700 mt-1">₱{arAgingSummary.days30.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{arAgingSummary.days30.count} Invoices</p>
              </button>

              <button
                onClick={() => setArAgingFilter(arAgingFilter === 'Overdue60' ? 'ALL' : 'Overdue60')}
                className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                  arAgingFilter === 'Overdue60' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <p className="text-[11px] font-bold text-orange-800">31–60 Days Overdue</p>
                <p className="text-lg font-mono font-bold text-orange-700 mt-1">₱{arAgingSummary.days60.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{arAgingSummary.days60.count} Invoices</p>
              </button>

              <button
                onClick={() => setArAgingFilter(arAgingFilter === 'Overdue90' ? 'ALL' : 'Overdue90')}
                className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                  arAgingFilter === 'Overdue90' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <p className="text-[11px] font-bold text-rose-800">61–90 Days Overdue</p>
                <p className="text-lg font-mono font-bold text-rose-700 mt-1">₱{arAgingSummary.days90.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{arAgingSummary.days90.count} Invoices</p>
              </button>

              <button
                onClick={() => setArAgingFilter(arAgingFilter === 'Overdue90Plus' ? 'ALL' : 'Overdue90Plus')}
                className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                  arAgingFilter === 'Overdue90Plus' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <p className="text-[11px] font-bold text-purple-900">&gt; 90 Days Overdue</p>
                <p className="text-lg font-mono font-bold text-purple-800 mt-1">₱{arAgingSummary.days90Plus.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{arAgingSummary.days90Plus.count} Invoices</p>
              </button>
            </div>
          </div>

          {/* AR Search & Multi-Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search collection #, client..."
                value={arSearchQuery}
                onChange={e => setArSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              <select
                value={arClientFilter}
                onChange={e => setArClientFilter(e.target.value)}
                className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="ALL">All Clients ({clients.length})</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>

              <select
                value={arStatusFilter}
                onChange={e => setArStatusFilter(e.target.value)}
                className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="ALL">All Collection Statuses</option>
                <option value="Current">Current</option>
                <option value="Due Soon">Due Soon</option>
                <option value="Overdue">Overdue</option>
                <option value="Follow-Up Required">Follow-Up Required</option>
                <option value="Promise to Pay">Promise to Pay</option>
                <option value="Paid">Paid</option>
                <option value="Disputed">Disputed</option>
              </select>

              <select
                value={arCategoryFilter}
                onChange={e => setArCategoryFilter(e.target.value)}
                className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="ALL">All Service Categories</option>
                <option value="BIR">BIR Tax Compliance</option>
                <option value="Accounting">Accounting Retainers</option>
                <option value="Audit">External Audit</option>
                <option value="Payroll">Payroll Management</option>
                <option value="SEC">SEC / Corporate</option>
                <option value="Other">Other Services</option>
              </select>

              {(arSearchQuery || arClientFilter !== 'ALL' || arStatusFilter !== 'ALL' || arAgingFilter !== 'ALL' || arCategoryFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setArSearchQuery('');
                    setArClientFilter('ALL');
                    setArStatusFilter('ALL');
                    setArAgingFilter('ALL');
                    setArCategoryFilter('ALL');
                  }}
                  className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* AR Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Collection #</th>
                    <th className="py-3 px-4">Client Name</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Issue & Due Date</th>
                    <th className="py-3 px-4 text-right">Billed</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Collection Status</th>
                    <th className="py-3 px-4 text-center">Next Follow-Up</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedARInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No accounts receivable invoices match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedARInvoices.map(inv => {
                      const balance = getInvoiceBalance(inv.id);
                      const isPastDue = new Date(inv.dueDate) < new Date() && balance > 0;
                      const statusBadge = inv.collectionStatus || (balance <= 0 ? 'Paid' : isPastDue ? 'Overdue' : 'Current');

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setShowCrModal(true);
                              }}
                              className="text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                              title="Click to view Official Collection Receipt (FFCSI Format)"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              {inv.collectionNumber || '1001'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {inv.clientName}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {inv.billingPeriod || 'N/A'}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            <div>{inv.issueDate}</div>
                            <div className={`text-[10px] font-bold ${isPastDue ? 'text-rose-600' : 'text-slate-400'}`}>
                              Due: {inv.dueDate} {isPastDue && '(Past Due)'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            ₱{inv.totalAmount.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-bold">
                            ₱{(inv.paidAmount || 0).toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600">
                            ₱{balance.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              statusBadge === 'Paid' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              statusBadge === 'Overdue' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                              statusBadge === 'Promise to Pay' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                              statusBadge === 'Follow-Up Required' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                              'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}>
                              {statusBadge}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                            {inv.nextFollowUpDate || '—'}
                          </td>

                          <td className="py-3.5 px-4 text-left">
                            <div className="flex items-center justify-start gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleOpenCollectionModal(inv)}
                                title="Log Collection Follow-Up Contact"
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Phone className="w-3 h-3 text-amber-700" /> Log Contact
                              </button>

                              {/* Modify History Log Button if Edited (Icon-only) ⭐ */}
                              {inv.amendedHistory && inv.amendedHistory.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenHistoryModal(inv)}
                                  title={`View Modify History (${inv.amendedHistory.length} edits)`}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg transition-colors cursor-pointer shrink-0 relative flex items-center justify-center"
                                >
                                  <History className="w-3.5 h-3.5 text-amber-600" />
                                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                                    {inv.amendedHistory.length}
                                  </span>
                                </button>
                              )}

                              {balance > 0 && inv.status !== 'Cancelled' && isSuperAdmin && (
                                <button
                                  onClick={() => handleOpenPayment(inv)}
                                  title="Record Payment"
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <CreditCard className="w-3 h-3" /> Pay
                                </button>
                              )}

                              {(inv.status === 'Paid' || inv.status === 'Partially Paid' || (inv.paidAmount || 0) > 0) && (
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setIsCrPaymentMode(false);
                                    setShowCrModal(true);
                                  }}
                                  title="View Receipt (FFCSI Format)"
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                                >
                                  <Receipt className="w-3 h-3 text-emerald-700" /> View Receipt
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* AR Table Pagination Controls */}
            <TablePagination
              currentPage={arCurrentPage}
              totalItems={arTotalItems}
              pageSize={arPageSize}
              onPageChange={setArCurrentPage}
              onPageSizeChange={setArPageSize}
              onLoadMore={arLoadMore}
              hasMoreToLoad={arHasMore}
              itemLabel="AR records"
            />
          </div>
        </div>
      )}

      {/* SUB-TAB 4: REVENUE & COLLECTION ANALYTICS ⭐ */}
      {activeSubTab === 'analytics' && (() => {
        // Available invoice years for period filter
        const availableYears = Array.from(new Set(
          invoices.filter(i => i.date).map(i => i.date.substring(0, 4))
        )).sort().reverse();

        // Helper to match service description against a target code or name
        const isServiceMatch = (serviceDesc: string, targetCodeOrName: string) => {
          const s = (serviceDesc || '').toLowerCase().trim();
          const t = (targetCodeOrName || '').toLowerCase().trim();
          if (t === 'retainers_fee' || t === 'retainers fee') return s.includes('retainer');
          if (t === 'service_charge' || t === 'service charge') return s.includes('service charge');
          if (t === 'bookkeeping_fee' || t.includes('bookkeeping')) return s.includes('bookkeeping');
          if (t === 'consultation_fee' || t.includes('consultation')) return s.includes('consultation');
          if (t === 'business_permit' || t.includes('permit')) return s.includes('permit');
          if (t === 'sec_dti_compliance' || t.includes('sec / dti') || t.includes('sec')) return s.includes('sec') || s.includes('dti');
          if (t === 'late_filing_assistance' || t.includes('penalty')) return s.includes('penalty') || s.includes('late filing');
          if (t === 'doc_processing' || t.includes('courier')) return s.includes('courier') || s.includes('processing');
          return s.includes(t) || t.includes(s);
        };

        // Filter invoices by client, year, status
        const filteredInvoices = invoices.filter(inv => {
          if (inv.status === 'Cancelled') return false;
          if (analyticsClientFilter !== 'ALL' && inv.clientId !== analyticsClientFilter) return false;
          if (analyticsYearFilter !== 'ALL' && !inv.date.startsWith(analyticsYearFilter)) return false;
          if (analyticsStatusFilter !== 'ALL' && inv.status !== analyticsStatusFilter) return false;
          return true;
        });

        // Global total billed across filtered invoices for proportion calculation
        const globalFilteredBilled = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

        // Compute metrics for selected services
        let totalBilled = 0;
        let totalCollected = 0;
        let totalOccurrences = 0;

        const clientBreakdownMap = new Map<string, {
          clientId: string;
          companyName: string;
          billed: number;
          collected: number;
          count: number;
        }>();

        const itemBreakdownMap = new Map<string, {
          code: string;
          name: string;
          category: 'BIR' | 'Benefits' | 'Others';
          billed: number;
          collected: number;
          count: number;
          clientNames: Set<string>;
        }>();

        const matchedLinesList: {
          invoiceId: string;
          invoiceNumber: string;
          clientId: string;
          clientName: string;
          date: string;
          dueDate: string;
          status: string;
          description: string;
          period: string;
          amount: number;
          linePaid: number;
        }[] = [];

        filteredInvoices.forEach(inv => {
          const invTotal = inv.totalAmount || 0;
          const invPaid = inv.paidAmount || 0;
          const paidRatio = invTotal > 0 ? Math.min(1, Math.max(0, invPaid / invTotal)) : 0;

          inv.services.forEach(srv => {
            const isIncluded = analyticsSelectedServices.length === 0 || 
              analyticsSelectedServices.some(sel => isServiceMatch(srv.description, sel));

            if (isIncluded) {
              const lineAmount = srv.amount || 0;
              const linePaid = lineAmount * paidRatio;

              totalBilled += lineAmount;
              totalCollected += linePaid;
              totalOccurrences += 1;

              // Client breakdown
              const cEntry = clientBreakdownMap.get(inv.clientId) || {
                clientId: inv.clientId,
                companyName: inv.clientName || 'Unknown Client',
                billed: 0,
                collected: 0,
                count: 0
              };
              cEntry.billed += lineAmount;
              cEntry.collected += linePaid;
              cEntry.count += 1;
              clientBreakdownMap.set(inv.clientId, cEntry);

              // Service Item breakdown
              let matchedCatalogItem = analyticsUnifiedCatalog.find(cat => 
                isServiceMatch(srv.description, cat.code) || isServiceMatch(srv.description, cat.name)
              );
              const itemKey = matchedCatalogItem?.code || srv.description;
              const itemName = matchedCatalogItem?.name || srv.description;
              const itemCat = matchedCatalogItem?.category || (
                (srv.serviceCategory || '').toLowerCase().includes('bir') ? 'BIR' :
                (srv.serviceCategory || '').toLowerCase().includes('benefit') ? 'Benefits' : 'Others'
              );

              const iEntry = itemBreakdownMap.get(itemKey) || {
                code: itemKey,
                name: itemName,
                category: itemCat,
                billed: 0,
                collected: 0,
                count: 0,
                clientNames: new Set<string>()
              };
              iEntry.billed += lineAmount;
              iEntry.collected += linePaid;
              iEntry.count += 1;
              iEntry.clientNames.add(inv.clientName);
              itemBreakdownMap.set(itemKey, iEntry);

              matchedLinesList.push({
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                clientId: inv.clientId,
                clientName: inv.clientName,
                date: inv.date,
                dueDate: inv.dueDate,
                status: inv.status,
                description: srv.description,
                period: srv.monthYear || '—',
                amount: lineAmount,
                linePaid: linePaid
              });
            }
          });
        });

        const totalOutstanding = Math.max(0, totalBilled - totalCollected);
        const realizationRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
        const clientList = Array.from(clientBreakdownMap.values()).sort((a, b) => b.billed - a.billed);
        const itemList = Array.from(itemBreakdownMap.values()).sort((a, b) => b.billed - a.billed);

        // Category Totals
        const birTotal = itemList.filter(i => i.category === 'BIR').reduce((sum, i) => sum + i.billed, 0);
        const benefitsTotal = itemList.filter(i => i.category === 'Benefits').reduce((sum, i) => sum + i.billed, 0);
        const othersTotal = itemList.filter(i => i.category === 'Others').reduce((sum, i) => sum + i.billed, 0);

        // Toggle service selection in analytics filter
        const toggleServiceFilter = (code: string) => {
          if (analyticsSelectedServices.includes(code)) {
            setAnalyticsSelectedServices(analyticsSelectedServices.filter(c => c !== code));
          } else {
            setAnalyticsSelectedServices([...analyticsSelectedServices, code]);
          }
        };

        // Quick Category Selectors
        const selectAllCategory = (cat: 'BIR' | 'Benefits' | 'Others') => {
          const catCodes = analyticsUnifiedCatalog.filter(i => i.category === cat).map(i => i.code);
          const newSet = new Set([...analyticsSelectedServices, ...catCodes]);
          setAnalyticsSelectedServices(Array.from(newSet));
        };

        const deselectCategory = (cat: 'BIR' | 'Benefits' | 'Others') => {
          const catCodes = new Set(analyticsUnifiedCatalog.filter(i => i.category === cat).map(i => i.code));
          setAnalyticsSelectedServices(analyticsSelectedServices.filter(code => !catCodes.has(code)));
        };

        return (
          <div className="space-y-6">
            {/* Header & Filter Control Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Revenue & Collections Distribution Analytics
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Multi-dimensional financial realization, accounts receivable performance, and client distribution broken down by specific BIR forms, statutory benefits, and services.
                  </p>
                </div>

                {/* Scope Status Badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                    <PieChart className="w-3.5 h-3.5 text-blue-600" />
                    {analyticsSelectedServices.length === 0 ? 'Analyzing: All Services & Tax Forms (Global)' : `Filtered: ${analyticsSelectedServices.length} Selected Item${analyticsSelectedServices.length > 1 ? 's' : ''}`}
                  </span>
                  {analyticsSelectedServices.length > 0 && (
                    <button
                      onClick={() => setAnalyticsSelectedServices([])}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>

              {/* FILTERS TOOLBAR */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* 1. Searchable + Add BIR Form, Benefit, or Service... Dropdown */}
                <div className="md:col-span-6 relative" ref={analyticsServicePickerRef}>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Filter by Specific Form / Benefit / Service:
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAnalyticsServicePickerOpen(!isAnalyticsServicePickerOpen)}
                      className="w-full px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-between shadow-2xs transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Plus className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {analyticsSelectedServices.length === 0 
                            ? '+ Add BIR Form, Benefit, or Service to Filter...' 
                            : `+ Add More Items (${analyticsSelectedServices.length} active)`}
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isAnalyticsServicePickerOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {isAnalyticsServicePickerOpen && (
                    <div className="absolute left-0 top-full mt-2 w-full sm:w-[460px] max-h-[480px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      {/* Search Bar */}
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search 0619E, SSS, Retainers, 2550Q, PhilHealth..."
                          value={analyticsServiceSearchTerm}
                          onChange={e => setAnalyticsServiceSearchTerm(e.target.value)}
                          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                          autoFocus
                        />
                        {analyticsServiceSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setAnalyticsServiceSearchTerm('')}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Quick Category Action Buttons */}
                      <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="font-bold text-slate-500 mr-1">Quick Select:</span>
                        <button
                          type="button"
                          onClick={() => selectAllCategory('BIR')}
                          className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          + All BIR
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAllCategory('Benefits')}
                          className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          + All Benefits
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAllCategory('Others')}
                          className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          + All Professional Fees
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnalyticsSelectedServices([])}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors ml-auto cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>

                      {/* Scrollable Item Categories */}
                      <div className="overflow-y-auto flex-1 p-2.5 space-y-3 divide-y divide-slate-100 text-xs">
                        
                        {/* SECTION 1: BIR Tax Returns & Forms */}
                        {analyticsUnifiedCatalog.filter(item => 
                          item.category === 'BIR' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()))
                        ).length > 0 && (
                          <div>
                            <div className="flex items-center justify-between px-2 py-1.5 font-bold text-amber-800 text-[10px] uppercase tracking-wider bg-amber-50/60 rounded-md mb-1">
                              <span>BIR Tax Returns & Forms</span>
                              <span className="font-mono text-[9px] font-bold text-amber-700">
                                {analyticsUnifiedCatalog.filter(item => item.category === 'BIR' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()))).length} items
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {analyticsUnifiedCatalog
                                .filter(item => item.category === 'BIR' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase())))
                                .map(item => {
                                  const isSelected = analyticsSelectedServices.includes(item.code);
                                  return (
                                    <button
                                      key={item.code}
                                      type="button"
                                      onClick={() => toggleServiceFilter(item.code)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                        isSelected ? 'bg-amber-100/80 font-bold text-amber-900 border border-amber-300' : 'hover:bg-amber-50/60 text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border ${isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                          ✓
                                        </div>
                                        <span className="truncate text-[11px]">{item.name}</span>
                                      </div>
                                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                        {item.code}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* SECTION 2: Statutory Benefits & Loans */}
                        {analyticsUnifiedCatalog.filter(item => 
                          item.category === 'Benefits' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()))
                        ).length > 0 && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between px-2 py-1.5 font-bold text-emerald-800 text-[10px] uppercase tracking-wider bg-emerald-50/60 rounded-md mb-1">
                              <span>Statutory Benefits & Loans</span>
                              <span className="font-mono text-[9px] font-bold text-emerald-700">
                                {analyticsUnifiedCatalog.filter(item => item.category === 'Benefits' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()))).length} items
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {analyticsUnifiedCatalog
                                .filter(item => item.category === 'Benefits' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase())))
                                .map(item => {
                                  const isSelected = analyticsSelectedServices.includes(item.code);
                                  return (
                                    <button
                                      key={item.code}
                                      type="button"
                                      onClick={() => toggleServiceFilter(item.code)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                        isSelected ? 'bg-emerald-100/80 font-bold text-emerald-900 border border-emerald-300' : 'hover:bg-emerald-50/60 text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                          ✓
                                        </div>
                                        <span className="truncate text-[11px]">{item.name}</span>
                                      </div>
                                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        {item.code}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* SECTION 3: Others (Retainers Fee, Service Charge, Bookkeeping, etc.) */}
                        {analyticsUnifiedCatalog.filter(item => 
                          item.category === 'Others' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()))
                        ).length > 0 && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between px-2 py-1.5 font-bold text-indigo-800 text-[10px] uppercase tracking-wider bg-indigo-50/60 rounded-md mb-1">
                              <span>Others & Professional Fees</span>
                              <span className="font-mono text-[9px] font-bold text-indigo-700">
                                {analyticsUnifiedCatalog.filter(item => item.category === 'Others' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()))).length} items
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {analyticsUnifiedCatalog
                                .filter(item => item.category === 'Others' && (!analyticsServiceSearchTerm.trim() || item.name.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(analyticsServiceSearchTerm.toLowerCase())))
                                .map(item => {
                                  const isSelected = analyticsSelectedServices.includes(item.code);
                                  return (
                                    <button
                                      key={item.code}
                                      type="button"
                                      onClick={() => toggleServiceFilter(item.code)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                        isSelected ? 'bg-indigo-100/80 font-bold text-indigo-900 border border-indigo-300' : 'hover:bg-indigo-50/60 text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                          ✓
                                        </div>
                                        <span className="truncate text-[11px]">{item.name}</span>
                                      </div>
                                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                        {item.code}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          {analyticsSelectedServices.length} item(s) selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAnalyticsServicePickerOpen(false)}
                          className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Done Selecting
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Client Filter */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Client Scope:
                  </label>
                  <select
                    value={analyticsClientFilter}
                    onChange={e => setAnalyticsClientFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Clients ({clients.length})</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Year Filter */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Billing Year:
                  </label>
                  <select
                    value={analyticsYearFilter}
                    onChange={e => setAnalyticsYearFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Recorded Years</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ACTIVE FILTER CHIPS ROW */}
              {analyticsSelectedServices.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-400" /> Active Item Filters:
                  </span>
                  {analyticsSelectedServices.map(code => {
                    const item = analyticsUnifiedCatalog.find(i => i.code === code);
                    const isBir = item?.category === 'BIR';
                    const isBen = item?.category === 'Benefits';
                    return (
                      <span
                        key={code}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs border ${
                          isBir
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : isBen
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                        }`}
                      >
                        <span>{item?.name || code}</span>
                        <button
                          type="button"
                          onClick={() => toggleServiceFilter(code)}
                          className="p-0.5 hover:bg-black/10 rounded-full cursor-pointer transition-colors"
                          title="Remove filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setAnalyticsSelectedServices([])}
                    className="text-[11px] font-bold text-slate-500 hover:text-rose-600 underline ml-2 cursor-pointer"
                  >
                    Clear all ({analyticsSelectedServices.length})
                  </button>
                </div>
              )}
            </div>

            {/* EXECUTIVE METRIC CARDS (Filtered) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Billed */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span>Filtered Billed Revenue</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  ₱{totalBilled.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Across {totalOccurrences} invoiced lines</span>
                  {globalFilteredBilled > 0 && (
                    <span className="font-bold text-blue-600">
                      {((totalBilled / globalFilteredBilled) * 100).toFixed(1)}% of all billing
                    </span>
                  )}
                </div>
              </div>

              {/* Total Collected / Realized */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span>Realized Collections</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  ₱{totalCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Realization Rate:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    realizationRate >= 80 ? 'bg-emerald-100 text-emerald-800' : realizationRate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {realizationRate.toFixed(1)}% Collected
                  </span>
                </div>
              </div>

              {/* Outstanding AR */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span>Uncollected Balance (AR)</span>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black font-mono text-amber-600">
                  ₱{totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-slate-500">
                  {totalBilled > 0 ? `${((totalOutstanding / totalBilled) * 100).toFixed(1)}% pending realization` : 'No pending receivables'}
                </div>
              </div>

              {/* Volume & Client Reach */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span>Client Reach</span>
                  <Building2 className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black font-mono text-purple-700">
                  {clientList.length} Clients
                </div>
                <div className="text-[11px] text-slate-500">
                  Avg ₱{clientList.length > 0 ? (totalBilled / clientList.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0} billed / client
                </div>
              </div>
            </div>

            {/* CATEGORY REVENUE PROPORTIONS BAR */}
            {totalBilled > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <h4 className="font-bold text-slate-900">
                    Category Distribution Split
                  </h4>
                  <div className="flex items-center gap-4 text-[11px] font-semibold">
                    <span className="flex items-center gap-1 text-amber-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      BIR Taxes: ₱{birTotal.toLocaleString()} ({((birTotal / totalBilled) * 100).toFixed(1)}%)
                    </span>
                    <span className="flex items-center gap-1 text-emerald-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Benefits: ₱{benefitsTotal.toLocaleString()} ({((benefitsTotal / totalBilled) * 100).toFixed(1)}%)
                    </span>
                    <span className="flex items-center gap-1 text-indigo-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                      Professional Fees: ₱{othersTotal.toLocaleString()} ({((othersTotal / totalBilled) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  {birTotal > 0 && (
                    <div 
                      className="bg-amber-500 h-full transition-all" 
                      style={{ width: `${(birTotal / totalBilled) * 100}%` }}
                      title={`BIR Taxes: ₱${birTotal.toLocaleString()}`}
                    />
                  )}
                  {benefitsTotal > 0 && (
                    <div 
                      className="bg-emerald-500 h-full transition-all" 
                      style={{ width: `${(benefitsTotal / totalBilled) * 100}%` }}
                      title={`Benefits: ₱${benefitsTotal.toLocaleString()}`}
                    />
                  )}
                  {othersTotal > 0 && (
                    <div 
                      className="bg-indigo-500 h-full transition-all" 
                      style={{ width: `${(othersTotal / totalBilled) * 100}%` }}
                      title={`Professional Fees: ₱${othersTotal.toLocaleString()}`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* TWO MAIN VISUAL PANELS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel 1: Revenue by Service / Tax Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Revenue & Collection by Form / Service Item ({itemList.length})
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    Ranked by Billed Amount
                  </span>
                </div>

                {itemList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No billing records found matching the selected items or filters.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                    {itemList.map(item => {
                      const sharePct = totalBilled > 0 ? (item.billed / totalBilled) * 100 : 0;
                      const itemRealization = item.billed > 0 ? (item.collected / item.billed) * 100 : 0;
                      const isBir = item.category === 'BIR';
                      const isBen = item.category === 'Benefits';

                      return (
                        <div key={item.code} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isBir ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                                  isBen ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                                  'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                }`}>
                                  {item.category}
                                </span>
                                <span className="font-bold text-slate-900">{item.name}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                Billed across {item.count} invoice lines • {item.clientNames.size} client{item.clientNames.size > 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-black text-slate-900 text-sm">
                                ₱{item.billed.toLocaleString()}
                              </span>
                              <div className="text-[10px] font-bold text-emerald-700">
                                Paid: ₱{item.collected.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({itemRealization.toFixed(0)}%)
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  isBir ? 'bg-amber-500' : isBen ? 'bg-emerald-500' : 'bg-indigo-600'
                                }`} 
                                style={{ width: `${sharePct}%` }} 
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Revenue Share: {sharePct.toFixed(1)}%</span>
                              <span>Outstanding: ₱{(item.billed - item.collected).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Panel 2: Top Clients AR & Collections Leaderboard */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Client Distribution Leaderboard ({clientList.length})
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    Billed vs Realized
                  </span>
                </div>

                {clientList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No client billing records match the selected items or filters.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                    {clientList.map(c => {
                      const cBalance = Math.max(0, c.billed - c.collected);
                      const cPaidPct = c.billed > 0 ? (c.collected / c.billed) * 100 : 0;

                      return (
                        <div key={c.clientId} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900">{c.companyName}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {c.count} filtered line items • Paid: ₱{c.collected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono font-bold text-slate-900">₱{c.billed.toLocaleString()}</p>
                              <p className="text-[10px] font-mono font-bold text-amber-600">
                                AR: ₱{cBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all" 
                              style={{ width: `${Math.min(100, cPaidPct)}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* TABULAR DETAILED BREAKDOWN OF MATCHING INVOICE LINES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Itemized Invoiced Line Items ({matchedLinesList.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Individual SOA invoice transactions matching your selected service, BIR form, and benefit filters.
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  Sum Total: <span className="font-mono font-bold text-slate-900">₱{totalBilled.toLocaleString()}</span>
                </div>
              </div>

              {matchedLinesList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No line items found for the current filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Client Name</th>
                        <th className="py-2.5 px-3">Item / Service Description</th>
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3 text-right">Line Amount</th>
                        <th className="py-2.5 px-3 text-right">Realized Paid</th>
                        <th className="py-2.5 px-3 text-center">SOA Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matchedLinesList.slice(0, 50).map((line, idx) => (
                        <tr key={`${line.invoiceId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                            {line.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {line.date}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {line.clientName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-900 font-medium">
                            {line.description}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {line.period}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₱{line.amount.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            ₱{line.linePaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              line.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                              line.status === 'Partial' ? 'bg-blue-100 text-blue-800' :
                              line.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {line.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {matchedLinesList.length > 50 && (
                    <p className="text-center text-[11px] text-slate-400 mt-3 italic">
                      Showing first 50 of {matchedLinesList.length} matching line items.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* SUB-TAB: STATEMENT OF ACCOUNT (SOA LEDGER) ⭐ */}
      {activeSubTab === 'soa' && (() => {
        const activeClientObj = clients.find(c => c.id === soaSelectedClientId) || clients[0];
        const clientSoa = activeClientObj
          ? buildClientSoaLedger(activeClientObj.id, invoices, payments, { fromDate: soaFromDate, toDate: soaToDate })
          : null;

        return (
          <div className="space-y-5 text-xs">
            {/* Header Controls & Client Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    Client Statement of Account (SOA) Running Balance Ledger
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Official Client Ledger Formula: Opening Balance → Invoices (+) → Payments (-) → Adjustments → Closing Balance
                  </p>
                </div>

                {activeClientObj && clientSoa && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => generateClientStatementOfAccountPDF(activeClientObj, clientSoa, soaFromDate && soaToDate ? `${soaFromDate} to ${soaToDate}` : undefined)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Export SOA PDF
                    </button>
                    <button
                      onClick={() => exportSOAExcel(activeClientObj, clientSoa)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" /> Export SOA Excel
                    </button>
                  </div>
                )}
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">Select Client (Active & Archived)</label>
                  <select
                    value={soaSelectedClientId}
                    onChange={e => setSoaSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-xs"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} {c.status === 'Archived' ? '[Archived]' : ''} (TIN: {c.tinNumber || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">From Date (Statement Start)</label>
                  <input
                    type="date"
                    value={soaFromDate}
                    onChange={e => setSoaFromDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">To Date (Statement Cut-off)</label>
                  <input
                    type="date"
                    value={soaToDate}
                    onChange={e => setSoaToDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SOA Metrics Summary */}
            {clientSoa && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Opening Balance</span>
                    <p className="text-base font-mono font-bold text-slate-800 mt-1">₱{clientSoa.openingBalance.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Billed (+)</span>
                    <p className="text-base font-mono font-bold text-blue-900 mt-1">₱{clientSoa.totalBilled.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Payments (-)</span>
                    <p className="text-base font-mono font-bold text-emerald-900 mt-1">₱{clientSoa.totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Closing Balance Due</span>
                    <p className="text-base font-mono font-bold text-amber-900 mt-1">₱{clientSoa.closingBalance.toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Overdue</span>
                    <p className="text-base font-mono font-bold text-rose-900 mt-1">₱{clientSoa.totalOverdue.toLocaleString()}</p>
                  </div>
                </div>

                {/* SOA Table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                      Chronological Ledger Transactions
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      Showing {clientSoa.entries.length} transaction entries
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Tx Type</th>
                          <th className="py-2.5 px-3">Collection #</th>
                          <th className="py-2.5 px-3">Billing Period</th>
                          <th className="py-2.5 px-3">Services / Particulars</th>
                          <th className="py-2.5 px-3 text-right">Billed (+)</th>
                          <th className="py-2.5 px-3 text-right">Paid (-)</th>
                          <th className="py-2.5 px-3 text-center">C.R. #</th>
                          <th className="py-2.5 px-3 text-right">Running Balance</th>
                          <th className="py-2.5 px-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clientSoa.entries.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-slate-400">
                              No statement of account ledger entries found for this client and date filter.
                            </td>
                          </tr>
                        ) : (
                          clientSoa.entries.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{entry.date}</td>
                              <td className="py-3 px-3 font-bold whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap inline-block ${
                                  entry.type === 'Invoice' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  entry.type === 'Payment' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  entry.type === 'Voided Invoice' || entry.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold' :
                                  entry.type === 'Payment Reversal' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {entry.type === 'Voided Invoice' ? 'Cancelled / Voided' : entry.type}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">#{entry.collectionNo}</td>
                              <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{entry.billingPeriod}</td>
                              <td className="py-3 px-3 text-slate-800 font-medium max-w-xs truncate" title={entry.servicesDescription}>
                                {entry.servicesDescription}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                {entry.billedAmount > 0 ? `₱${entry.billedAmount.toLocaleString()}` : entry.type === 'Voided Invoice' ? <span className="line-through text-slate-400">₱0</span> : '-'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                                {entry.paidAmount > 0 ? `₱${entry.paidAmount.toLocaleString()}` : '-'}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                                {entry.crNumber || '-'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                                ₱{entry.runningBalance.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-left">
                                {entry.originalInvoiceId && (() => {
                                  const targetInv = invoices.find(i => i.id === entry.originalInvoiceId);
                                  return (
                                    <div className="flex items-center justify-start gap-1">
                                      <button
                                        onClick={() => {
                                          if (targetInv) {
                                            setSelectedInvoice(targetInv);
                                            setShowCrModal(true);
                                          }
                                        }}
                                        className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-md cursor-pointer inline-flex items-center gap-1 font-semibold text-[11px]"
                                        title="View Official Collection Receipt (FFCSI Format)"
                                      >
                                        <Receipt className="w-3.5 h-3.5 text-emerald-700" /> View
                                      </button>
                                      {targetInv && targetInv.status === 'Cancelled' ? (
                                        <span
                                          className="p-1 text-slate-300 rounded-md inline-flex items-center gap-1 font-semibold text-[11px] cursor-not-allowed opacity-60"
                                          title="Modifications not allowed on Cancelled transactions"
                                        >
                                          <Edit className="w-3.5 h-3.5 text-slate-300" /> Modify
                                        </span>
                                      ) : targetInv ? (
                                        <button
                                          onClick={() => {
                                            handleOpenEditModal(targetInv);
                                          }}
                                          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md cursor-pointer inline-flex items-center gap-1 font-semibold text-[11px]"
                                          title="Modify Transaction or Cancel"
                                        >
                                          <Edit className="w-3.5 h-3.5 text-indigo-600" /> Modify
                                        </button>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* SUB-TAB: FINANCIAL & AR REPORTS HUB ⭐ */}
      {activeSubTab === 'reports' && (() => {
        // Compute report data
        const totalBilledVal = invoices.filter(i => i.status !== 'Cancelled').reduce((a, b) => a + b.totalAmount, 0);
        const totalCollectedVal = payments.filter(p => p.status === 'Active').reduce((a, b) => a + b.amount, 0);
        const outstandingVal = totalBilledVal - totalCollectedVal;

        // Revenue by Service Category calculation
        const categoryMap: { [cat: string]: { billed: number; collected: number } } = {
          'BIR Tax Compliance': { billed: 0, collected: 0 },
          'Accounting Retainers': { billed: 0, collected: 0 },
          'External Audit': { billed: 0, collected: 0 },
          'Payroll Management': { billed: 0, collected: 0 },
          'SEC & Corporate': { billed: 0, collected: 0 },
          'Other Services': { billed: 0, collected: 0 }
        };

        invoices.forEach(inv => {
          if (inv.status === 'Cancelled') return;
          const invPayments = payments.filter(p => p.invoiceId === inv.id && p.status === 'Active');
          const pmtTotal = invPayments.reduce((s, p) => s + p.amount, 0);
          const collectRatio = inv.totalAmount > 0 ? pmtTotal / inv.totalAmount : 0;

          inv.services.forEach(s => {
            const catKey = s.serviceCategory || 'Other Services';
            if (!categoryMap[catKey]) {
              categoryMap[catKey] = { billed: 0, collected: 0 };
            }
            categoryMap[catKey].billed += s.amount;
            categoryMap[catKey].collected += s.amount * collectRatio;
          });
        });

        const revCategoryList = Object.keys(categoryMap).map(cat => ({
          category: cat,
          billed: categoryMap[cat].billed,
          collected: categoryMap[cat].collected
        }));

        // Revenue by Client calculation
        const clientRevList = clients.map(c => {
          const clientInvs = invoices.filter(i => i.clientId === c.id && i.status !== 'Cancelled');
          const b = clientInvs.reduce((acc, i) => acc + i.totalAmount, 0);
          const cPmts = payments.filter(p => p.clientId === c.id && p.status === 'Active');
          const col = cPmts.reduce((acc, p) => acc + p.amount, 0);
          return {
            clientName: c.companyName,
            billed: b,
            collected: col,
            balance: b - col
          };
        }).filter(item => item.billed > 0 || item.collected > 0);

        return (
          <div className="space-y-5 text-xs">
            {/* Reports Control Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-600" />
                    Accounts Receivable & Revenue Financial Reporting
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Generate comprehensive aging, collection, and revenue reports with direct Excel download
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (reportCategory === 'aging' || reportCategory === 'outstanding') {
                        exportARAgingExcel(invoices, payments);
                      } else if (reportCategory === 'payments') {
                        exportPaymentReportExcel(payments, invoices);
                      } else if (reportCategory === 'collections') {
                        exportCollectionReportExcel(collectionLogs, invoices);
                      } else {
                        exportRevenueReportExcel(invoices, payments, revCategoryList, clientRevList);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Download Report (.XLSX)
                  </button>
                </div>
              </div>

              {/* Report Selection Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setReportCategory('aging')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    reportCategory === 'aging' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  AR Aging Matrix
                </button>
                <button
                  onClick={() => setReportCategory('outstanding')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    reportCategory === 'outstanding' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Outstanding Invoices
                </button>
                <button
                  onClick={() => setReportCategory('payments')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    reportCategory === 'payments' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Payment Ledger
                </button>
                <button
                  onClick={() => setReportCategory('collections')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    reportCategory === 'collections' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Collection Logs
                </button>
                <button
                  onClick={() => setReportCategory('service_revenue')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    reportCategory === 'service_revenue' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Revenue by Service
                </button>
                <button
                  onClick={() => setReportCategory('client_revenue')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    reportCategory === 'client_revenue' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Revenue by Client
                </button>
              </div>
            </div>

            {/* Report Display Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              {reportCategory === 'aging' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm">AR Aging Matrix Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                          <th className="py-2.5 px-3">Collection #</th>
                          <th className="py-2.5 px-3">Client Name</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Invoice Amount</th>
                          <th className="py-2.5 px-3 text-right">Paid Amount</th>
                          <th className="py-2.5 px-3 text-right">Balance Due</th>
                          <th className="py-2.5 px-3 text-center">Aging Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.filter(i => i.status !== 'Cancelled').map(inv => {
                          const bal = getInvoiceBalance(inv.id);
                          const due = new Date(inv.dueDate);
                          const today = new Date();
                          const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 3600 * 24));

                          let agingTag = 'Current';
                          let tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          if (bal > 0) {
                            if (diffDays <= 0) agingTag = 'Current';
                            else if (diffDays <= 30) { agingTag = '1-30 Days Overdue'; tagColor = 'bg-amber-50 text-amber-800 border-amber-200'; }
                            else if (diffDays <= 60) { agingTag = '31-60 Days Overdue'; tagColor = 'bg-orange-50 text-orange-800 border-orange-200'; }
                            else { agingTag = '90+ Days Overdue'; tagColor = 'bg-rose-50 text-rose-800 border-rose-200'; }
                          } else {
                            agingTag = 'Paid';
                          }

                          return (
                            <tr key={inv.id}>
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">#{inv.collectionNumber || '1001'}</td>
                              <td className="py-3 px-3 font-semibold text-slate-800">{inv.clientName}</td>
                              <td className="py-3 px-3 font-mono text-slate-600">{inv.dueDate}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold">₱{inv.totalAmount.toLocaleString()}</td>
                              <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold">₱{(inv.paidAmount || 0).toLocaleString()}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">₱{bal.toLocaleString()}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tagColor}`}>
                                  {agingTag}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportCategory === 'payments' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm">Payment Transaction Ledger</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">C.R. / O.R. #</th>
                          <th className="py-2.5 px-3">Client</th>
                          <th className="py-2.5 px-3 text-right">Amount Paid</th>
                          <th className="py-2.5 px-3">Payment Method</th>
                          <th className="py-2.5 px-3">Reference #</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.length === 0 ? (
                          <tr><td colSpan={7} className="py-6 text-center text-slate-400">No payment transactions recorded.</td></tr>
                        ) : (
                          payments.map(p => {
                            const inv = invoices.find(i => i.id === p.invoiceId);
                            return (
                              <tr key={p.id}>
                                <td className="py-3 px-3 font-mono text-slate-600">{p.paymentDate}</td>
                                <td className="py-3 px-3 font-mono font-bold text-slate-900">{p.collectionReceiptNumber || p.officialReceiptNumber || '-'}</td>
                                <td className="py-3 px-3 font-semibold text-slate-800">{inv?.clientName || 'Client'}</td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">₱{p.amount.toLocaleString()}</td>
                                <td className="py-3 px-3 text-slate-700">{p.paymentMethod}</td>
                                <td className="py-3 px-3 font-mono text-slate-500">{p.referenceNumber || '-'}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(reportCategory === 'service_revenue' || reportCategory === 'client_revenue') && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {reportCategory === 'service_revenue' ? 'Revenue Breakdown by Service Category' : 'Revenue Breakdown by Client'}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                          <th className="py-2.5 px-3">Name / Category</th>
                          <th className="py-2.5 px-3 text-right">Total Billed</th>
                          <th className="py-2.5 px-3 text-right">Total Collected</th>
                          <th className="py-2.5 px-3 text-right">Uncollected Balance</th>
                          <th className="py-2.5 px-3 text-center">Collection Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(reportCategory === 'service_revenue' ? revCategoryList : clientRevList).map((row: any, idx) => {
                          const name = row.category || row.clientName;
                          const rate = row.billed > 0 ? ((row.collected / row.billed) * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={idx}>
                              <td className="py-3 px-3 font-bold text-slate-900">{name}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold">₱{row.billed.toLocaleString()}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">₱{row.collected.toLocaleString()}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">₱{(row.billed - row.collected).toLocaleString()}</td>
                              <td className="py-3 px-3 text-center font-bold text-slate-700">{rate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* SUB-TAB: FINANCIAL AUDIT CONTROL & MODIFICATIONS TRAIL ⭐ */}
      {activeSubTab === 'audit' && (() => {
        // Filter financial logs
        const filteredFinancialLogs = auditLogs.filter(log => {
          const matchAction = auditFilterAction === 'ALL' || log.action.toLowerCase().includes(auditFilterAction.toLowerCase());
          const matchSearch = auditFilterSearch === '' || 
                              log.details.toLowerCase().includes(auditFilterSearch.toLowerCase()) ||
                              log.userName.toLowerCase().includes(auditFilterSearch.toLowerCase()) ||
                              log.action.toLowerCase().includes(auditFilterSearch.toLowerCase());
          return matchAction && matchSearch;
        });

        return (
          <div className="space-y-5 text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    Financial Audit Control & Complete Modifications Trail
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Zero physical delete policy: All invoice modifications, payment reversals, and auto-billing actions are immutably logged with user & timestamp context.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">Filter Action Type</label>
                  <select
                    value={auditFilterAction}
                    onChange={e => setAuditFilterAction(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="ALL">All Financial Audit Events</option>
                    <option value="Payment">Payment Recordings & Reversals</option>
                    <option value="Invoice">Invoice Modifications & Creations</option>
                    <option value="Auto-Billing">Recurring Auto-Billing Batch Runs</option>
                    <option value="Collection">Collection Contact Logs</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">Search Audit Details or Staff User</label>
                  <input
                    type="text"
                    placeholder="Search details, user name, or C.R. number..."
                    value={auditFilterSearch}
                    onChange={e => setAuditFilterSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Performed By User</th>
                      <th className="py-2.5 px-3">Action Type</th>
                      <th className="py-2.5 px-3">Modification Details & Reason</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFinancialLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No financial audit log events match the filter.
                        </td>
                      </tr>
                    ) : (
                      filteredFinancialLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                          <td className="py-3 px-3 font-bold text-slate-900">{log.userName}</td>
                          <td className="py-3 px-3 font-bold">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-800 font-medium">{log.details}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Logged & Verified
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 1: Generate SOA Invoice */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl sm:max-w-3xl w-full max-h-[92vh] overflow-y-auto space-y-4 text-xs shadow-xl text-slate-800 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Generate Statement of Account (SOA)
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableClientSelect
                    clients={clients.filter(c => !c.isBranch && c.status !== 'Archived')}
                    selectedClientId={selectedClientId}
                    onSelectClient={id => handleClientChange(id)}
                    label="Select Active Main Branch Client Company"
                    placeholder="Search client name or TIN number..."
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Sub-branches are excluded. All payables consolidated in Main Branch.</p>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Billing Period (Month & Year) *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      {monthsList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Collection # (Unique Serial No.) *</label>
                  <input
                    type="text"
                    required
                    value={collectionNumber}
                    onChange={e => {
                      setCollectionNumber(e.target.value);
                      setCollectionNumError('');
                    }}
                    placeholder="e.g. 1001"
                    className="w-full px-3 py-1.5 bg-emerald-50/50 border border-emerald-300 font-mono font-bold text-emerald-900 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  />
                  {collectionNumError ? (
                    <p className="text-[11px] text-rose-600 font-bold mt-1">{collectionNumError}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">Auto-generated highest Collection # + 1. Unique and cannot repeat.</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">SOA Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Service Line Items */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                  <label className="font-bold text-slate-800 text-xs">Itemized Services & Out-of-Pocket Fees</label>
                  
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={handleImportAllClientServices}
                      className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Auto-Load Active Payables
                    </button>
                  )}
                </div>

                {/* Quick Add Pickers: Combined Searchable Dropdown with BIR Forms, Benefits, and Others */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Add Service Line Options:</span>
                  <div className="flex flex-wrap items-center gap-2" ref={servicePickerRef}>
                    
                    {/* Unified Searchable Dropdown Combobox */}
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setIsServicePickerOpen(!isServicePickerOpen);
                          setShowCreateCustomSection(false);
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add BIR Form, Benefit, or Service...</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isServicePickerOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isServicePickerOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 max-h-[440px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          {/* Search Bar */}
                          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              autoFocus
                              value={serviceSearchTerm}
                              onChange={e => setServiceSearchTerm(e.target.value)}
                              placeholder="Search BIR forms, benefits, loans, retainers, service charge..."
                              className="w-full bg-transparent border-none text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                            />
                            {serviceSearchTerm && (
                              <button
                                type="button"
                                onClick={() => setServiceSearchTerm('')}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Quick 1-Click Create Button if search term typed */}
                          {serviceSearchTerm.trim() && (
                            <div className="p-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-emerald-900 truncate">
                                Add "<strong>{serviceSearchTerm.trim()}</strong>"
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCreateCustomItem(serviceSearchTerm.trim())}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-md shrink-0 shadow-2xs cursor-pointer"
                              >
                                + Add Line
                              </button>
                            </div>
                          )}

                          {/* Grouped Service List */}
                          <div className="overflow-y-auto flex-1 p-2 space-y-3 divide-y divide-slate-100 text-xs">
                            
                            {/* SECTION 1: BIR Tax Returns & Forms */}
                            {unifiedServiceCatalog.filter(item => 
                              item.category === 'BIR' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
                            ).length > 0 && (
                              <div>
                                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 rounded-md mb-1 flex items-center justify-between">
                                  <span>BIR Tax Returns & Forms</span>
                                  <span className="font-mono text-[9px] font-bold text-amber-700">
                                    {unifiedServiceCatalog.filter(item => item.category === 'BIR' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase()))).length} items
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {unifiedServiceCatalog
                                    .filter(item => item.category === 'BIR' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase())))
                                    .map(item => (
                                      <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => handleSelectUnifiedItem(item)}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-amber-50/80 rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-amber-900 truncate text-[11px]">
                                          {item.name}
                                        </span>
                                        {item.defaultAmount > 0 && (
                                          <span
                                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs ${
                                              item.amountSource === 'Client Payables'
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-200'
                                                : item.amountSource === 'Client Retainer Profile'
                                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 ring-1 ring-indigo-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                            title={item.sourceDetail || `Amount originated from ${item.amountSource || 'Preset'}`}
                                          >
                                            <span className="font-mono font-extrabold">₱{item.defaultAmount.toLocaleString()}</span>
                                            {item.amountSource && (
                                              <span className="text-[9px] font-normal opacity-85">
                                                ({item.amountSource === 'Client Payables' ? 'from Client Payables' : item.amountSource === 'Client Retainer Profile' ? 'from Client Profile' : 'from Saved Preset'})
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* SECTION 2: Statutory Benefits & Loans */}
                            {unifiedServiceCatalog.filter(item => 
                              item.category === 'Benefits' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
                            ).length > 0 && (
                              <div className="pt-2">
                                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 rounded-md mb-1 flex items-center justify-between">
                                  <span>Statutory Benefits & Loans</span>
                                  <span className="font-mono text-[9px] font-bold text-emerald-700">
                                    {unifiedServiceCatalog.filter(item => item.category === 'Benefits' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase()))).length} items
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {unifiedServiceCatalog
                                    .filter(item => item.category === 'Benefits' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase())))
                                    .map(item => (
                                      <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => handleSelectUnifiedItem(item)}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50/80 rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-emerald-900 truncate text-[11px]">
                                          {item.name}
                                        </span>
                                        {item.defaultAmount > 0 && (
                                          <span
                                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs ${
                                              item.amountSource === 'Client Payables'
                                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-1 ring-emerald-200'
                                                : item.amountSource === 'Client Retainer Profile'
                                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 ring-1 ring-indigo-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                            title={item.sourceDetail || `Amount originated from ${item.amountSource || 'Preset'}`}
                                          >
                                            <span className="font-mono font-extrabold">₱{item.defaultAmount.toLocaleString()}</span>
                                            {item.amountSource && (
                                              <span className="text-[9px] font-normal opacity-85">
                                                ({item.amountSource === 'Client Payables' ? 'from Client Payables' : item.amountSource === 'Client Retainer Profile' ? 'from Client Profile' : 'from Saved Preset'})
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* SECTION 3: Others (Retainers Fee, Service Charge, Bookkeeping, etc.) */}
                            {unifiedServiceCatalog.filter(item => 
                              item.category === 'Others' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
                            ).length > 0 && (
                              <div className="pt-2">
                                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 bg-indigo-50 rounded-md mb-1 flex items-center justify-between">
                                  <span>Others & Professional Fees</span>
                                  <span className="font-mono text-[9px] font-bold text-indigo-700">
                                    {unifiedServiceCatalog.filter(item => item.category === 'Others' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase()))).length} items
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {unifiedServiceCatalog
                                    .filter(item => item.category === 'Others' && (!serviceSearchTerm.trim() || item.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(serviceSearchTerm.toLowerCase())))
                                    .map(item => (
                                      <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => handleSelectUnifiedItem(item)}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50/80 rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-indigo-900 truncate text-[11px]">
                                          {item.name}
                                        </span>
                                        {item.defaultAmount > 0 && (
                                          <span
                                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs ${
                                              item.amountSource === 'Client Payables'
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-200'
                                                : item.amountSource === 'Client Retainer Profile'
                                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 ring-1 ring-indigo-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                            title={item.sourceDetail || `Amount originated from ${item.amountSource || 'Preset'}`}
                                          >
                                            <span className="font-mono font-extrabold">₱{item.defaultAmount.toLocaleString()}</span>
                                            {item.amountSource && (
                                              <span className="text-[9px] font-normal opacity-85">
                                                ({item.amountSource === 'Client Payables' ? 'from Client Payables' : item.amountSource === 'Client Retainer Profile' ? 'from Client Profile' : 'from Saved Preset'})
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Bottom Create Custom Item Footer Button / Form Toggle */}
                          <div className="p-2.5 bg-slate-50 border-t border-slate-200">
                            {!showCreateCustomSection ? (
                              <button
                                type="button"
                                onClick={() => setShowCreateCustomSection(true)}
                                className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>+ Create Another / Custom Item</span>
                              </button>
                            ) : (
                              <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2 text-xs shadow-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 text-[11px]">Create New Custom Item</span>
                                  <button
                                    type="button"
                                    onClick={() => setShowCreateCustomSection(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    placeholder="Item Description (e.g. Service Charge)"
                                    value={customItemName}
                                    onChange={e => setCustomItemName(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder={`Period (e.g. ${selectedMonth} ${selectedYear})`}
                                      value={customItemPeriod}
                                      onChange={e => setCustomItemPeriod(e.target.value)}
                                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const client = clients.find(c => c.id === selectedClientId);
                                        const defaultRate = client?.monthlyRetainerFee || 0;
                                        setPeriodCoverageModal({
                                          isOpen: true,
                                          itemIndex: -1,
                                          itemDescription: customItemName || 'Custom Item',
                                          currentPeriod: customItemPeriod || '',
                                          currentAmount: customItemAmount || 0,
                                          defaultMonthlyRate: defaultRate,
                                          targetList: 'custom',
                                        });
                                      }}
                                      className="p-1 text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg shrink-0 cursor-pointer transition-colors"
                                      title="Open Multi-Month / Period Coverage Builder"
                                    >
                                      <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                                    </button>
                                  </div>
                                  <CurrencyInput
                                    placeholder="Amount (₱)"
                                    value={customItemAmount}
                                    onChange={val => setCustomItemAmount(val)}
                                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                                  />
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                  <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={saveCustomForFuture}
                                      onChange={e => setSaveCustomForFuture(e.target.checked)}
                                      className="rounded text-emerald-600 focus:ring-0"
                                    />
                                    Save to presets
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleCreateCustomItem()}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-2xs cursor-pointer"
                                  >
                                    Add Line
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>

                    {/* Blank Line Button */}
                    <button
                      type="button"
                      onClick={handleAddServiceLine}
                      className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                      <span>+ Blank Line</span>
                    </button>

                    {/* Add Notes Box Toggle Button ⭐ */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotesBox(prev => {
                          const next = !prev;
                          if (next && !billingNotes) {
                            setBillingNotes('Kindly Pay To FFCSI');
                          }
                          return next;
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                        showNotesBox 
                          ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-200' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                      title="Toggle centered plain clear Notes Box under Item / Service Description"
                    >
                      <MessageSquarePlus className={`w-3.5 h-3.5 ${showNotesBox ? 'text-white' : 'text-emerald-600'}`} />
                      <span>Add Notes Box</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                        showNotesBox ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {showNotesBox ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    {/* Previous Billing Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowPreviousBilling(prev => !prev)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                        showPreviousBilling 
                          ? 'bg-amber-500 text-white border-amber-600' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                      title="Toggle to view the last billed period and amount for each item"
                    >
                      <History className={`w-3.5 h-3.5 ${showPreviousBilling ? 'text-white' : 'text-slate-500'}`} />
                      <span>Previous Billing</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                        showPreviousBilling ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {showPreviousBilling ? 'ON' : 'OFF'}
                      </span>
                    </button>

                  </div>
                </div>

                {/* Service Line Column Headers */}
                <div className="grid grid-cols-11 gap-2 text-[11px] font-bold text-slate-700 pt-1 border-t border-slate-100 pb-1 px-1">
                  <div className="col-span-5">Item / Service Description</div>
                  <div className="col-span-3">Month and Year</div>
                  <div className="col-span-3">Amount (PHP)</div>
                </div>

                {services.length === 0 ? (
                  <div className="py-6 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                    <Receipt className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                    <p className="font-semibold text-xs text-slate-600">No items or services added yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Select a client with active payables, pick a BIR form or benefit from above, or click "+ Blank Line".</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {services.map((item, idx) => {
                      const prevInfo = showPreviousBilling && selectedClientId ? getPreviousBillingInfo(selectedClientId, item.description) : null;
                      return (
                        <div key={idx} className="bg-slate-50/80 p-2 border border-slate-200 rounded-xl space-y-1.5">
                          <div className="grid grid-cols-11 gap-2 items-center">
                            <div className="col-span-5 relative">
                              <SmartServiceInput
                                required
                                placeholder="e.g. 0619E, Retainers Fee"
                                value={item.description || ''}
                                onChange={val => {
                                  handleServiceChange(idx, 'description', val);
                                  if (descriptionErrors[idx]) {
                                    setDescriptionErrors(prev => {
                                      const next = { ...prev };
                                      delete next[idx];
                                      return next;
                                    });
                                  }
                                }}
                                onSelectSuggestion={catalogItem => {
                                  if (catalogItem.defaultAmount && !item.amount) {
                                    handleServiceChange(idx, 'amount', catalogItem.defaultAmount);
                                  }
                                }}
                                hasError={!!descriptionErrors[idx]}
                              />
                              {descriptionErrors[idx] && (
                                <div className="absolute left-0 -bottom-6 z-30 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>{descriptionErrors[idx]}</span>
                                </div>
                              )}
                            </div>
                            <div className="col-span-3 flex items-center gap-1 relative">
                              <div className="w-full relative">
                                <SmartPeriodInput
                                  placeholder="e.g. July 2026, Q2 2026"
                                  value={item.monthYear !== undefined && item.monthYear !== null ? item.monthYear : ''}
                                  selectedYear={selectedYear}
                                  onChange={val => {
                                    handleServiceChange(idx, 'monthYear', val);
                                    if (monthYearErrors[idx]) {
                                      setMonthYearErrors(prev => {
                                        const next = { ...prev };
                                        delete next[idx];
                                        return next;
                                      });
                                    }
                                  }}
                                  hasError={!!monthYearErrors[idx]}
                                />
                                {monthYearErrors[idx] && (
                                  <div className="absolute left-0 -bottom-6 z-30 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    <span>{monthYearErrors[idx]}</span>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const client = clients.find(c => c.id === selectedClientId);
                                  const defaultRate = client?.monthlyRetainerFee || 0;
                                  setPeriodCoverageModal({
                                    isOpen: true,
                                    itemIndex: idx,
                                    itemDescription: item.description || 'Line Item',
                                    currentPeriod: item.monthYear || '',
                                    currentAmount: item.amount || 0,
                                    defaultMonthlyRate: defaultRate,
                                    initialDivideToMonths: item.divideToMonths !== undefined ? item.divideToMonths : true,
                                  });
                                }}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg shrink-0 cursor-pointer transition-colors"
                                title="Open Multi-Month & Period Coverage Builder (Range, Discrete Months, Quarterly, Annual)"
                              >
                                <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            </div>
                            <div className="col-span-3 flex items-center gap-1.5 relative">
                              <div className="w-full relative">
                                <CurrencyInput
                                  value={item.amount}
                                  onChange={val => {
                                    handleServiceChange(idx, 'amount', val);
                                    if (amountErrors[idx]) {
                                      setAmountErrors(prev => {
                                        const next = { ...prev };
                                        delete next[idx];
                                        return next;
                                      });
                                    }
                                  }}
                                  placeholder="0.00"
                                  className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-slate-900 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-100 min-w-[120px] transition-all ${
                                    amountErrors[idx]
                                      ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/70 text-rose-950 placeholder-rose-400'
                                      : 'border-slate-200'
                                  }`}
                                />
                                {amountErrors[idx] && (
                                  <div className="absolute left-0 -bottom-6 z-30 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    <span>Amount is empty</span>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleRemoveServiceLine(idx);
                                  if (amountErrors[idx]) {
                                    setAmountErrors(prev => {
                                      const next = { ...prev };
                                      delete next[idx];
                                      return next;
                                    });
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 cursor-pointer transition-colors"
                                title="Remove line item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Previous Billing History Banner when Toggle is ON */}
                          {showPreviousBilling && selectedClientId && (
                            <div className="pt-1 border-t border-slate-200/60">
                              {prevInfo ? (
                                <div className="flex items-center justify-between text-[10px] text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2 py-1 rounded-md">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <History className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>
                                      Last Billed: <strong className="font-semibold text-slate-900">{prevInfo.monthYear}</strong> — <strong className="font-mono text-emerald-800">₱{prevInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> <span className="text-slate-400 font-mono">({prevInfo.invoiceNumber})</span>
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApplyPreviousAmountModal({
                                        isOpen: true,
                                        itemIndex: idx,
                                        itemDescription: item.description || 'This item',
                                        previousMonthYear: prevInfo.monthYear,
                                        previousAmount: prevInfo.amount,
                                        currentAmount: item.amount
                                      });
                                    }}
                                    className="ml-2 px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded text-[9px] cursor-pointer shrink-0 transition-colors flex items-center gap-1"
                                    title="Click to apply last billed amount to this line"
                                  >
                                    Apply ₱{prevInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 italic px-1 py-0.5">
                                  <History className="w-3 h-3 text-slate-300 shrink-0" />
                                  <span>No previous billing record found for this item</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ⚡ Set Action Triggered in To-Do List Badge */}
                          {lineSetActionStatus[idx] && (
                            <div className="flex items-center justify-between text-[10px] text-amber-950 bg-amber-50/95 border border-amber-300 px-2.5 py-1.5 rounded-lg animate-in fade-in slide-in-from-top-1 shadow-2xs">
                              <div className="flex items-center gap-1.5 font-medium truncate">
                                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-amber-500 animate-pulse" />
                                <span>
                                  ⚡ <strong>Set Action Triggered:</strong> <strong className="text-amber-950 font-bold">{lineSetActionStatus[idx].ruleCode}</strong> ({lineSetActionStatus[idx].periodLabel}) updated to <strong>Payable Logged</strong> (₱{Number(lineSetActionStatus[idx].amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) in To-Do List
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 shrink-0 ml-2">
                                To-Do List Synced ✓
                              </span>
                            </div>
                          )}

                          {/* Multi-Month Breakdown indicator */}
                          {(() => {
                            const months = getLineCoveredMonths(item);
                            if (months.length > 1) {
                              const isDivided = item.divideToMonths !== false;
                              const perMo = (Number(item.amount) || 0) / months.length;
                              return (
                                <div className={`flex items-center justify-between text-[10px] px-2 py-0.5 rounded-md border ${
                                  isDivided 
                                    ? 'text-emerald-900 bg-emerald-50/80 border-emerald-200/80' 
                                    : 'text-indigo-900 bg-indigo-50/80 border-indigo-200/80'
                                }`}>
                                  <span className="font-semibold flex items-center gap-1">
                                    <CalendarRange className={`w-3 h-3 shrink-0 ${isDivided ? 'text-emerald-600' : 'text-indigo-600'}`} />
                                    Covers {months.length} Months ({months.join(', ')}):
                                  </span>
                                  <span className={`font-mono font-bold ${isDivided ? 'text-emerald-800' : 'text-indigo-800'}`}>
                                    {isDivided 
                                      ? `₱${perMo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month in records`
                                      : `₱${(Number(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Single lump-sum)`
                                    }
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Centered Plain Clear Notes Box under Item / Service Description & Month and Year ⭐ */}
                {showNotesBox && (
                  <div className="bg-emerald-50/80 border border-emerald-300/80 rounded-xl p-3 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <StickyNote className="w-4 h-4 text-emerald-600" />
                        <span>Billing Notes / Remarks (e.g. Kindly Pay To FFCSI)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {savedNotesPresets.length > 0 && (
                          <select
                            aria-label="Select saved note preset"
                            className="text-[11px] bg-white border border-emerald-200 text-slate-700 rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-400"
                            onChange={(e) => {
                              if (e.target.value) {
                                setBillingNotes(e.target.value);
                              }
                            }}
                            value=""
                          >
                            <option value="" disabled>Load Saved Preset...</option>
                            {savedNotesPresets.map((preset, pIdx) => (
                              <option key={pIdx} value={preset}>{preset}</option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotesBox(false);
                            setBillingNotes('');
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                          title="Remove Notes Box"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Plain Clear Text Box centered across Item / Service Description and Month/Year */}
                    <div className="grid grid-cols-11 gap-2 items-center">
                      <div className="col-span-8">
                        <input
                          type="text"
                          value={billingNotes}
                          onChange={(e) => setBillingNotes(e.target.value)}
                          placeholder="Enter notes (e.g. Kindly Pay To FFCSI, bank account details, or specific payment remarks)..."
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400 shadow-2xs"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (billingNotes.trim()) {
                              handleSaveNotePreset(billingNotes.trim());
                              setAlertModal({
                                isOpen: true,
                                title: 'Note Preset Saved',
                                message: 'Note saved to presets library for future SOAs!',
                                type: 'success'
                              });
                            }
                          }}
                          disabled={!billingNotes.trim()}
                          className="w-full px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          title="Save this note to reusable presets"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets Chips */}
                    {savedNotesPresets.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-emerald-800 font-semibold">Saved Presets:</span>
                        {savedNotesPresets.map((preset, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1 bg-white border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md text-[10px] shadow-2xs"
                          >
                            <button
                              type="button"
                              onClick={() => setBillingNotes(preset)}
                              className="hover:text-emerald-700 font-medium cursor-pointer"
                            >
                              {preset.length > 35 ? preset.substring(0, 33) + '...' : preset}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotePreset(preset)}
                              className="text-slate-300 hover:text-rose-600 cursor-pointer ml-0.5"
                              title="Delete preset"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Line Item Validation Error Banner */}
              {(Object.keys(descriptionErrors).length > 0 || Object.keys(monthYearErrors).length > 0 || Object.keys(amountErrors).length > 0) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Please complete all required fields (Item Description, Month and Year, and Amount) for the highlighted item(s) before generating the SOA.
                  </span>
                </div>
              )}

              {/* Total Calculation Summary (12% VAT removed) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-900 font-bold text-sm">
                  <span>Total Amount Due:</span>
                  <span className="font-mono text-emerald-600">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Ask First Before Creating Invoice ⭐ */}
      {confirmGenerateModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-800 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0 border border-emerald-200">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Generate Statement of Account (SOA)
                </h3>
                <p className="text-slate-700 text-xs leading-relaxed">
                  Generating Collection # <strong className="text-slate-900 font-mono">({confirmGenerateModal.collectionNumber} (Unique Serial No.))</strong> For <strong className="text-slate-900">{confirmGenerateModal.clientName}</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Client:</span>
                <span className="font-bold text-slate-900 text-right">{confirmGenerateModal.clientName}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Collection Serial #:</span>
                <span className="font-mono font-bold text-emerald-700">#{confirmGenerateModal.collectionNumber}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Billing Dates:</span>
                <span className="text-slate-700">Issue: {confirmGenerateModal.issueDate} • Due: {confirmGenerateModal.dueDate}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Billable Items:</span>
                <span className="font-semibold text-slate-800">{confirmGenerateModal.servicesCount} item{confirmGenerateModal.servicesCount > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center pt-1 font-bold">
                <span className="text-slate-900">Total Amount:</span>
                <span className="font-mono text-emerald-700 text-base">₱{confirmGenerateModal.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmGenerateModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateInvoice}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL 3: Printable SOA Statement Preview */}
      {showSoaModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 text-xs shadow-2xl text-slate-800">
            
            {/* Header Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-900 text-sm">Statement of Account Document</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Notes Box Toggle Button on SOA Document ⭐ */}
                <button
                  type="button"
                  onClick={() => setSoaPreviewShowNotes(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border shadow-2xs cursor-pointer ${
                    soaPreviewShowNotes 
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-200' 
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                  title="Toggle Notes Box on / off on Statement of Account"
                >
                  <MessageSquarePlus className={`w-3.5 h-3.5 ${soaPreviewShowNotes ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Notes Box</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                    soaPreviewShowNotes ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {soaPreviewShowNotes ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const invToDownload = {
                      ...selectedInvoice,
                      billingNotes: soaPreviewShowNotes && soaPreviewNotesText.trim() ? soaPreviewNotesText.trim() : undefined
                    };
                    downloadInvoicePDF(invToDownload);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
                <button 
                  onClick={() => setShowSoaModal(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Live Inline Notes Editor Toolbar (when Notes Box is ON) */}
            {soaPreviewShowNotes && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2 print:hidden">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs shrink-0">
                  <StickyNote className="w-4 h-4 text-emerald-600" />
                  <span>SOA Notes Box:</span>
                </div>
                <input
                  type="text"
                  value={soaPreviewNotesText}
                  onChange={e => setSoaPreviewNotesText(e.target.value)}
                  placeholder="e.g. Kindly Pay To FFCSI, payment instructions or memo..."
                  className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-400 shadow-2xs"
                />
                {savedNotesPresets.length > 0 && (
                  <select
                    aria-label="Load saved note preset"
                    className="text-[11px] bg-white border border-emerald-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
                    onChange={e => {
                      if (e.target.value) {
                        setSoaPreviewNotesText(e.target.value);
                      }
                    }}
                    value=""
                  >
                    <option value="" disabled>Load Preset...</option>
                    {savedNotesPresets.map((preset, pIdx) => (
                      <option key={pIdx} value={preset}>{preset}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Printable SOA Document Area */}
            <div className="space-y-6 p-4">
              
              {/* Firm Header */}
              <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">FFCSI — FAMILY FRIENDS CONSULTANCY SERVICES INC.</h1>
                  <p className="text-[11px] text-slate-500 mt-1">Management Consultancy, Tax Advisory & Accounting Services</p>
                  <p className="text-[11px] text-slate-500">Ortigas Financial Center, Pasig City • VAT Reg. TIN 008-112-445-000</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-rose-700 tracking-wider uppercase block">STATEMENT OF ACCOUNT</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">Collection #: {selectedInvoice.collectionNumber || '1001'}</span>
                </div>
              </div>

              {/* SOA Info Grid */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">BILLED TO CLIENT:</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedInvoice.clientName}</p>
                  <p className="text-slate-600 mt-1">Client ID: {selectedInvoice.clientId}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p><strong className="text-slate-600">Issue Date:</strong> {selectedInvoice.issueDate}</p>
                  <p><strong className="text-slate-600">Payment Due Date:</strong> <span className="text-rose-600 font-bold">{selectedInvoice.dueDate}</span></p>
                  <p><strong className="text-slate-600">Status:</strong> <span className="font-bold uppercase text-emerald-700">{selectedInvoice.status}</span></p>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-900 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Item / Service Description</th>
                    <th className="py-2.5 px-3">Month and Year</th>
                    <th className="py-2.5 px-3 text-right">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoice.services.map((s, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3 font-medium text-slate-800">{s.description}</td>
                      <td className="py-3 px-3 font-medium text-slate-600">{s.monthYear || `${selectedMonth} ${selectedYear}`}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₱{s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {/* Centered Notes Box Row in SOA Table ⭐ */}
                  {soaPreviewShowNotes && soaPreviewNotesText.trim() && (
                    <tr className="bg-emerald-50/70 border-t border-b border-emerald-200">
                      <td colSpan={3} className="py-2.5 px-3 text-center">
                        <span className="font-bold text-slate-800 text-xs tracking-wide">
                          {soaPreviewNotesText.trim()}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Financial Calculation Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">₱{selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.vatAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>12% Output VAT:</span>
                      <span className="font-mono">₱{selectedInvoice.vatAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-800">
                    <span>Total Amount Billed:</span>
                    <span className="font-mono">₱{selectedInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Less Payments Received:</span>
                    <span className="font-mono">₱{(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 text-sm">
                    <span>Balance Due:</span>
                    <span className="font-mono">₱{(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Remittance Details */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px]">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Payment Remittance Instructions:</p>
                <p className="text-slate-600">Please settle checks payable to <strong>FFCSI</strong> or transfer via BDO Account # <strong>1200-4451-9981</strong>.</p>
                {selectedInvoice.officialReceiptNumber && (
                  <p className="text-emerald-700 font-bold">Official Receipt Issued: {selectedInvoice.officialReceiptNumber} ({selectedInvoice.paymentMethod})</p>
                )}
              </div>

              {/* Signatory Footer */}
              <div className="flex justify-between items-end pt-8 text-[11px] text-slate-500">
                <div>
                  <p className="italic">This statement serves as an official billing invoice for professional accounting services.</p>
                </div>
                <div className="text-center w-48">
                  <div className="border-b border-slate-800 pb-1 font-bold text-slate-900">Atty. Roberto Cruz, CPA</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Managing Partner, Finance & Tax</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: View / Print / Remit Collection Receipt (FFCSI Format) */}
      {showCrModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl ${isCrPaymentMode ? 'max-w-4xl' : 'max-w-2xl'} w-full p-6 text-xs shadow-2xl text-slate-800 space-y-4 max-h-[92vh] overflow-y-auto transition-all`}>
            {/* Header: Clean Title & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-base">Official Collection Receipt (FFCSI Format)</h3>
                {isCrPaymentMode && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Payment Remittance Mode
                  </span>
                )}
              </div>
              <button 
                onClick={() => setShowCrModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unified 5-Button Action Bar for Controls (Default Receipt, Payment, Edit, Download PDF, Print) - All Same Size ⭐ */}
            {!isCrPaymentMode ? (
              <div className={`grid gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 ${
                isSuperAdmin ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'
              }`}>
                {/* Button 1: Default Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setCrViewFormat('default');
                    setIsCrPaymentMode(false);
                  }}
                  className={`h-9 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs w-full text-center ${
                    crViewFormat === 'default' && !isCrPaymentMode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Standard Collection Receipt (FFCSI Format)"
                >
                  <Receipt className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Default Tab</span>
                </button>

                {/* Button 2: Payment */}
                <button
                  type="button"
                  onClick={() => {
                    setCrViewFormat('payment');
                    setIsCrPaymentMode(false);
                  }}
                  className={`h-9 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs w-full text-center ${
                    crViewFormat === 'payment' && !isCrPaymentMode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Payment Receipt: 3-Column PARTICULARS | AMOUNT | Payment info format"
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Payment</span>
                </button>

                {/* Button 3: Edit (Super Admin) */}
                {isSuperAdmin && (
                  <button
                    type="button"
                    disabled={selectedInvoice.status === 'Cancelled'}
                    onClick={() => handleOpenPayment(selectedInvoice)}
                    className={`h-9 px-2.5 py-1.5 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-2xs transition-colors w-full text-center ${
                      selectedInvoice.status === 'Cancelled'
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                        : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                    }`}
                    title={selectedInvoice.status === 'Cancelled' ? 'Payment editing is disabled for Cancelled transactions' : 'Edit payment remittance details, cheque info, and records'}
                  >
                    <Edit className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Edit</span>
                  </button>
                )}

                {/* Button 4: Download PDF */}
                <button
                  type="button"
                  onClick={() => {
                    if (crViewFormat === 'payment') {
                      downloadPaymentCollectionReceiptPDF(selectedInvoice, { showWatermark: showCrWatermark });
                    } else {
                      downloadCollectionReceiptPDF(selectedInvoice);
                    }
                  }}
                  className="h-9 px-2.5 py-1.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-2xs cursor-pointer transition-colors w-full text-center"
                  title={crViewFormat === 'payment' ? 'Download Payment Receipt PDF (3-Column)' : 'Download Collection Receipt PDF'}
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Download PDF</span>
                </button>

                {/* Button 5: Print */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-9 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs transition-colors w-full text-center"
                  title="Print Collection Receipt"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Print</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  Payment Remittance Mode
                </span>
                <button
                  type="button"
                  onClick={() => setIsCrPaymentMode(false)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
                >
                  <Eye className="w-3.5 h-3.5" /> Close Remittance Editor
                </button>
              </div>
            )}

            {/* In Payment Mode: Quick Notice */}
            {isCrPaymentMode && (
              <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5 shadow-xs">
                <CreditCard className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Payment Remittance Settings:</span> For each item below, set the amount and choose <strong>💵 Cash</strong> or <strong>📝 Cheque</strong> (select Bank, Cheque Number & Payee), then click <strong className="text-emerald-800">Paid</strong> to confirm the line item.
                </div>
              </div>
            )}

            {/* Exact 1:1 FFCSI Collection Receipt Replicated Document Canvas */}
            <div className="p-6 bg-white border border-slate-300 rounded-2xl space-y-4 font-sans text-slate-900 shadow-inner relative overflow-hidden">
              
              {/* Payment Tab Watermarks (Only active in 'Payment' Tab for Paid or Cancelled status when toggle is ON) ⭐ */}
              {crViewFormat === 'payment' && !isCrPaymentMode && showCrWatermark && (
                <>
                  {/* Watermark: PAID */}
                  {selectedInvoice.status === 'Paid' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 select-none overflow-hidden">
                      <div className="transform -rotate-25 border-4 sm:border-8 border-emerald-600/25 rounded-3xl px-8 py-3 sm:px-14 sm:py-5 flex flex-col items-center justify-center shadow-xs">
                        <span className="text-emerald-700/25 font-black text-6xl sm:text-7xl md:text-8xl tracking-[0.25em] uppercase font-sans leading-none">
                          PAID
                        </span>
                        <span className="text-emerald-800/25 font-extrabold text-xs sm:text-sm tracking-widest uppercase mt-1">
                          Official Collection Receipt
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Watermark: CANCELLED */}
                  {selectedInvoice.status === 'Cancelled' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 select-none overflow-hidden">
                      <div className="transform -rotate-25 border-4 sm:border-8 border-rose-600/25 rounded-3xl px-6 py-3 sm:px-12 sm:py-5 flex flex-col items-center justify-center shadow-xs">
                        <span className="text-rose-700/25 font-black text-5xl sm:text-6xl md:text-7xl tracking-[0.2em] uppercase font-sans leading-none">
                          CANCELLED
                        </span>
                        <span className="text-rose-800/25 font-extrabold text-xs sm:text-sm tracking-widest uppercase mt-1">
                          Void Transaction
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Prominent Void / Cancelled Stamp for Cancelled Invoices */}
              {selectedInvoice.status === 'Cancelled' && (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Ban className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-extrabold uppercase tracking-wider text-rose-700">
                        VOID / CANCELLED TRANSACTION
                      </span>
                      <p className="text-[11px] text-rose-800">
                        Cancelled on {selectedInvoice.cancelledAt?.substring(0, 10) || 'N/A'} by {selectedInvoice.cancelledBy || 'Staff'}.
                        {selectedInvoice.cancellationReason && ` Reason: "${selectedInvoice.cancellationReason}"`}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-rose-600 text-white font-extrabold text-[10px] uppercase rounded-md tracking-widest shrink-0">
                    CANCELLED
                  </span>
                </div>
              )}
              
              {/* Top Header */}
              <div className="text-center pt-1 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-red-700 text-white font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs tracking-widest uppercase shrink-0">
                    FFCSI
                  </div>
                  <h1 className="text-lg font-serif italic font-extrabold text-red-700">
                    Family Friends Consultancy Services Inc.
                  </h1>
                </div>
                <p className="text-[11px] text-slate-700"># 50-M Aguilar Street, Brgy. Bungad, Quezon City</p>
                <p className="text-[11px] text-slate-700">Tel. No.: (632) 8713-1412</p>
                <p className="text-[11px] text-slate-700">Email Add: ffcsi2019.acctg@gmail.com; ffcsi2018@gmail.com</p>

                <div className="mt-3 font-extrabold text-sm tracking-widest uppercase border-t-2 border-b-2 border-slate-900 py-1 inline-block px-8">
                  COLLECTION RECEIPT
                </div>
              </div>

              {/* Client Info Lines */}
              <div className="grid grid-cols-12 gap-y-2 text-xs font-bold pt-2 items-center">
                <div className="col-span-8 flex items-baseline gap-1.5">
                  <span className="shrink-0 text-slate-800">CLIENT :</span>
                  <span className="border-b border-slate-800 flex-1 px-1 font-bold text-slate-900">
                    {selectedInvoice.clientName}
                  </span>
                </div>
                <div className="col-span-4 text-right flex items-center justify-end gap-1.5">
                  <span className="text-slate-800 shrink-0">No. :</span>
                  <span className="text-red-600 font-extrabold font-mono text-sm tracking-wider">
                    {(selectedInvoice.collectionNumber || selectedInvoice.collectionReceiptNumber || selectedInvoice.officialReceiptNumber || orNumber || selectedInvoice.invoiceNumber || '1001').replace(/^(C\.?R\.?|CR|NO\.?)\s*#?\s*-?\s*/i, '').trim()}
                  </span>
                </div>

                <div className="col-span-8 flex items-baseline gap-1.5">
                  <span className="shrink-0 text-slate-800">Address :</span>
                  <span className="border-b border-slate-800 flex-1 px-1 font-bold text-slate-900">
                    Gen. Aguinaldo Hi-Way Panapaan V, Bacoor City
                  </span>
                </div>
                <div className="col-span-4 text-right flex items-center justify-end gap-1.5">
                  <span className="text-slate-800 shrink-0">Date :</span>
                  {isCrPaymentMode ? (
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="px-2 py-0.5 font-bold text-slate-900 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-slate-400"
                    />
                  ) : (
                    <span className="text-slate-900 font-bold">
                      {selectedInvoice.paymentDate || selectedInvoice.issueDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Particulars & Amount Table Frame */}
              <div className="border-2 border-slate-900 text-xs mt-3">
                {isCrPaymentMode ? (
                  // Payment Remittance Mode Table Header (PARTICULARS | AMOUNT | PAYMENT SETTINGS)
                  <div className="grid grid-cols-12 border-b-2 border-slate-900 font-extrabold bg-slate-100 py-2 px-2 text-center text-xs">
                    <div className="col-span-4 border-r-2 border-slate-900 text-slate-900">PARTICULARS</div>
                    <div className="col-span-2 border-r-2 border-slate-900 text-slate-900">AMOUNT</div>
                    <div className="col-span-6 text-slate-900 flex items-center justify-center gap-1">
                      <span>PAYMENT SETTINGS (CASH / CHEQUE & PAYEE)</span>
                    </div>
                  </div>
                ) : crViewFormat === 'payment' ? (
                  // Payment Format Table Header (PARTICULARS | AMOUNT | Payment info) ⭐
                  <div className="grid grid-cols-12 border-b-2 border-slate-900 font-extrabold bg-slate-100 py-2 px-2 text-xs">
                    <div className="col-span-5 border-r-2 border-slate-900 text-left pl-3 text-slate-900">PARTICULARS</div>
                    <div className="col-span-3 border-r-2 border-slate-900 text-right pr-4 text-slate-900">AMOUNT</div>
                    <div className="col-span-4 text-left pl-4 text-slate-900">Payment info</div>
                  </div>
                ) : (
                  // Default View Mode Table Header (PARTICULARS | AMOUNT)
                  <div className="grid grid-cols-12 border-b-2 border-slate-900 font-extrabold bg-slate-50 py-1.5 px-2 text-center text-xs">
                    <div className="col-span-8 border-r-2 border-slate-900">PARTICULARS</div>
                    <div className="col-span-4">AMOUNT</div>
                  </div>
                )}

                <div className="p-3 space-y-3 min-h-[140px]">
                  <p className="font-bold text-xs text-slate-900">Payment for the following:</p>
                  
                  {selectedInvoice.services && selectedInvoice.services.length > 0 ? (
                    selectedInvoice.services.map((srv, idx) => {
                      const itemCfg = crItemPaymentConfigs[idx] || {
                        mode: srv.paymentMode === 'Cheque' ? 'Cheque' : 'Cash',
                        amount: 0,
                        bank: 'BDO (Banco de Oro)',
                        customBank: '',
                        chequeNo: srv.chequeNumber || '',
                        payee: srv.chequePayee || 'FFCSI',
                        customPayee: '',
                        isPaid: false
                      };

                      const finalBank = itemCfg.bank === 'Other Bank' ? (itemCfg.customBank || 'Bank') : itemCfg.bank.split(' ')[0];
                      const finalPayee = itemCfg.payee === 'Other' ? (itemCfg.customPayee || 'Other') : itemCfg.payee;

                      if (isCrPaymentMode) {
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 text-xs items-start border-b border-slate-200 pb-3 last:border-b-0 last:pb-0 pt-1">
                            {/* Col 1: PARTICULARS */}
                            <div className="col-span-4 pl-2 space-y-0.5">
                              <div className="font-bold text-slate-900 text-[11px] leading-tight">
                                {srv.description}
                              </div>
                              {srv.monthYear && (
                                <div className="text-[10px] text-slate-600 font-semibold">
                                  Period: {srv.monthYear}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 font-medium">
                                Item #{idx + 1}
                              </div>
                            </div>

                            {/* Col 2: AMOUNT */}
                            <div className="col-span-2 px-2 text-right font-mono font-bold text-slate-900 text-xs pt-1 border-r border-slate-200">
                              ₱{srv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>

                            {/* Col 3: PAYMENT SETTINGS (CASH / CHEQUE & PAYEE) */}
                            <div className="col-span-6 pl-2 space-y-2">
                              {itemCfg.isPaid ? (
                                // Paid State: Hide selectors, show confirmed summary badge + Edit button
                                <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 shadow-2xs ${
                                  itemCfg.mode === 'Cash' 
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                                    : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                                }`}>
                                  <div className="space-y-0.5 text-xs">
                                    <div className="font-bold flex items-center gap-1.5 flex-wrap">
                                      {itemCfg.mode === 'Cash' ? (
                                        <>
                                          <span className="text-emerald-700 font-black">💵 Cash Payment</span>
                                          <span className="text-emerald-800 font-mono font-bold">
                                            ₱{(Number(itemCfg.amount) || srv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-indigo-700 font-black">📝 Cheque</span>
                                          <span className="font-mono text-indigo-900 font-bold">
                                            ({finalBank} {itemCfg.chequeNo ? `#${itemCfg.chequeNo}` : ''} to {finalPayee})
                                          </span>
                                          <span className="text-indigo-800 font-mono font-bold">
                                            ₱{(Number(itemCfg.amount) || srv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="font-semibold text-emerald-700">Marked as Paid</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemPayment(idx, { isPaid: false })}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                    title="Edit this item's payment details"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-slate-600" /> Edit
                                  </button>
                                </div>
                              ) : (
                                // Unpaid State: Show Mode Toggle, Amount input, Bank & Cheque details, and Paid confirmation button
                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                  {/* Mode Toggle & Amount Textbox */}
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemPayment(idx, { mode: 'Cash' })}
                                        className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                                          itemCfg.mode === 'Cash'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                                        }`}
                                      >
                                        <span>💵 Cash</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemPayment(idx, { mode: 'Cheque' })}
                                        className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                                          itemCfg.mode === 'Cheque'
                                            ? 'bg-indigo-600 text-white shadow-2xs'
                                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                                        }`}
                                      >
                                        <span>📝 Cheque</span>
                                      </button>
                                    </div>

                                    {/* Amount Textbox (defaulting to srv.amount) formatted as x,xxx,xxx.xx */}
                                    <div className="flex items-center gap-1">
                                      <label className="text-[10px] font-bold text-slate-700 shrink-0">Amount ₱:</label>
                                      <div className="w-28">
                                        <CurrencyInput
                                          value={itemCfg.amount}
                                          onChange={val => handleUpdateItemPayment(idx, { amount: val })}
                                          className="w-full px-2 py-0.5 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded text-xs text-right focus:ring-1 focus:ring-emerald-500"
                                          placeholder="0.00"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {itemCfg.mode === 'Cash' ? (
                                    <div className="flex items-center justify-between gap-2 bg-emerald-50/90 p-2 rounded-lg border border-emerald-200">
                                      <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span>Direct Cash Collection for FFCSI</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemPayment(idx, { isPaid: true })}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                      >
                                        <Check className="w-3.5 h-3.5" /> Paid
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-lg space-y-2">
                                      {/* Bank Dropdown & Cheque No Textbox */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                                            Bank Name:
                                          </label>
                                          <select
                                            value={itemCfg.bank}
                                            onChange={e => handleUpdateItemPayment(idx, { bank: e.target.value })}
                                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                          >
                                            {PH_BANKS.map(b => (
                                              <option key={b} value={b}>{b}</option>
                                            ))}
                                          </select>
                                          {itemCfg.bank === 'Other Bank' && (
                                            <input
                                              type="text"
                                              placeholder="Type custom bank name..."
                                              value={itemCfg.customBank}
                                              onChange={e => handleUpdateItemPayment(idx, { customBank: e.target.value })}
                                              className="w-full px-2 py-1 mt-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-indigo-500"
                                            />
                                          )}
                                        </div>

                                        <div>
                                          <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                                            Cheque Number *
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="e.g. 1312312"
                                            value={itemCfg.chequeNo}
                                            onChange={e => handleUpdateItemPayment(idx, { chequeNo: e.target.value })}
                                            className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                                          />
                                        </div>
                                      </div>

                                      {/* Payee Selection & Custom Payee */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-amber-900 mb-1">
                                          Paid To Payee:
                                        </label>
                                        <div className="flex flex-wrap gap-1">
                                          {['FFCSI', 'BIR', 'City Hall', 'SEC', 'SSS', 'Other'].map(p => (
                                            <button
                                              key={p}
                                              type="button"
                                              onClick={() => handleUpdateItemPayment(idx, { payee: p })}
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                                itemCfg.payee === p
                                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                              }`}
                                            >
                                              {p}
                                            </button>
                                          ))}
                                        </div>
                                        {itemCfg.payee === 'Other' && (
                                          <input
                                            type="text"
                                            placeholder="Type custom payee (e.g. Quezon City Hall, BIR RDO 50, etc.)"
                                            value={itemCfg.customPayee}
                                            onChange={e => handleUpdateItemPayment(idx, { customPayee: e.target.value })}
                                            className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 mt-1 focus:ring-1 focus:ring-indigo-500"
                                          />
                                        )}
                                      </div>

                                      {/* Mark as Paid button for Cheque */}
                                      <div className="flex justify-end pt-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!itemCfg.chequeNo.trim()) {
                                              setAlertModal({
                                                isOpen: true,
                                                title: 'Cheque Number Required',
                                                message: 'Please enter the Cheque Number before marking this item as Paid.',
                                                type: 'warning'
                                              });
                                              return;
                                            }
                                            handleUpdateItemPayment(idx, { isPaid: true });
                                          }}
                                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                        >
                                          <Check className="w-3.5 h-3.5" /> Paid
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Payment Format View Mode (3 columns: PARTICULARS | AMOUNT | Payment info) ⭐
                      if (crViewFormat === 'payment') {
                        const isLinePaid = Boolean(srv.isPaid || (selectedInvoice.status === 'Paid' && srv.isPaid !== false));
                        const isCheque = srv.paymentMode === 'Cheque' || (srv.paymentMethod && srv.paymentMethod.toLowerCase().includes('cheque')) || !!srv.chequeNumber;
                        return (
                          <div key={idx} className="grid grid-cols-12 text-xs font-bold pl-2 py-1.5 items-center border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                            <div className="col-span-5 text-slate-900 pr-2 border-r border-slate-200 pl-1">
                              <div className="leading-snug text-[11.5px] font-bold">
                                {srv.description} {srv.monthYear ? `— ${srv.monthYear}` : ''}
                              </div>
                            </div>
                            <div className="col-span-3 text-right font-mono font-bold text-slate-900 pr-4 border-r border-slate-200 text-xs">
                              {srv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="col-span-4 pl-4 pr-1">
                              {!isLinePaid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>Unpaid / Pending</span>
                                </span>
                              ) : isCheque ? (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-950 font-bold px-2 py-0.5 rounded-md border border-amber-300 shadow-2xs">
                                  📝 Cheque #{srv.chequeNumber ? srv.chequeNumber.replace(/^#/, '') : (itemCfg.chequeNo || 'N/A')} • Paid to {srv.chequePayee || itemCfg.payee || 'FFCSI'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-950 font-bold px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                                  💵 Cash • Paid to {srv.chequePayee || itemCfg.payee || 'FFCSI'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Default Tab View Mode Row (3 aligned columns matching Hardcopy Collection Receipt Alignment & Print Engine)
                      return (
                        <div key={idx} className="grid grid-cols-12 text-xs font-bold pl-2 pr-2 py-1 items-center hover:bg-slate-50/50">
                          <div className="col-span-5 text-slate-900 pr-2">
                            <span className="leading-snug">{srv.description}</span>
                          </div>
                          <div className="col-span-3 text-center text-slate-700 font-semibold">
                            {srv.monthYear ? <span>{srv.monthYear}</span> : null}
                          </div>
                          <div className="col-span-4 text-right font-mono text-slate-900">
                            {srv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })
                  ) : crViewFormat === 'payment' ? (
                    <div className="grid grid-cols-12 text-xs font-bold pl-2 py-1.5 items-center">
                      <div className="col-span-5 text-slate-900 pr-2 border-r border-slate-200 pl-1">
                        Professional Accounting Retainer Fee
                      </div>
                      <div className="col-span-3 text-right font-mono font-bold text-slate-900 pr-4 border-r border-slate-200 text-xs">
                        {(selectedInvoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-4 pl-4 pr-1">
                        {selectedInvoice.status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-950 font-bold px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                            💵 Cash • Paid to FFCSI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Unpaid / Pending</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-12 text-xs font-bold pl-2 pr-2 py-1 items-center">
                      <div className="col-span-5 text-slate-900 pr-2">Professional Accounting Retainer Fee</div>
                      <div className="col-span-3 text-center text-slate-700 font-semibold">
                        <span>{selectedInvoice.billingPeriod || ''}</span>
                      </div>
                      <div className="col-span-4 text-right font-mono text-slate-900">
                        {(selectedInvoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  {selectedInvoice.billingNotes && selectedInvoice.billingNotes.trim() && (
                    <div className="pl-3 pt-1 text-slate-600 font-bold text-[11px]">
                      {selectedInvoice.billingNotes.trim()}
                    </div>
                  )}
                </div>

                {/* Table Total Row */}
                <div className="grid grid-cols-12 border-t-2 border-slate-900 font-bold p-2.5 bg-slate-50 items-center">
                  {isCrPaymentMode ? (
                    <>
                      <div className="col-span-6 text-right pr-6 text-sm font-extrabold text-slate-900">
                        TOTAL   ₱
                      </div>
                      <div className="col-span-6 text-right text-sm font-extrabold text-slate-900 font-mono">
                        PHP {paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </>
                  ) : crViewFormat === 'payment' ? (
                    <>
                      <div className="col-span-5 text-right pr-4 text-sm font-extrabold text-slate-900">
                        TOTAL   ₱
                      </div>
                      <div className="col-span-3 text-right pr-4 text-sm font-extrabold text-slate-900 font-mono">
                        PHP {(selectedInvoice.paidAmount || selectedInvoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-4 pl-4 text-[11px] font-semibold text-slate-600">
                        Format: <span className="text-emerald-700 font-bold">Payment Itemized Info</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-8 text-right pr-6 text-sm font-extrabold text-slate-900">
                        TOTAL   ₱
                      </div>
                      <div className="col-span-4 text-right text-sm font-extrabold text-slate-900 font-mono">
                        PHP {(selectedInvoice.paidAmount || selectedInvoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer 3 Columns */}
              <div className="border-2 border-slate-900 p-3 grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1.5 font-bold text-slate-900">
                  <p className="flex items-center gap-1">
                    <span>CHECK :</span>
                    <span className="font-mono text-slate-900 border-b border-slate-800 flex-1 px-1 truncate">
                      {getActiveCheckSummary() || '____________________'}
                    </span>
                  </p>
                  <p className="flex items-center gap-1">
                    <span>DATE :</span>
                    <span className="font-mono text-slate-900 border-b border-slate-800 flex-1 px-1">
                      {paymentDate || selectedInvoice.paymentDate || selectedInvoice.issueDate}
                    </span>
                  </p>
                  <p>PREPARED BY : <span className="underline font-bold">Maricris</span></p>
                </div>
                <div className="text-center space-y-6">
                  <p className="font-bold text-slate-900">BILLING RECEIVED BY</p>
                  <div>
                    <div className="border-b border-slate-800 w-36 mx-auto"></div>
                    <p className="text-[10px] text-slate-600 mt-0.5">Signature over Printed Name</p>
                  </div>
                </div>
                <div className="text-center space-y-6">
                  <p className="font-bold text-slate-900">PAYMENT RECEIVED BY:</p>
                  <div>
                    <div className="border-b border-slate-800 w-36 mx-auto"></div>
                    <p className="text-[10px] text-slate-600 mt-0.5">Signature over Printed Name</p>
                  </div>
                </div>
              </div>

            </div>

            {/* In Payment Mode: Optional Notes Controls */}
            {isCrPaymentMode && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="block text-slate-700 font-bold text-xs mb-1">
                  Payment / Reference Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional reference details (deposited branch, client representative, etc.)"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            )}

            {/* Bottom Modal Actions & Watermark Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              {/* Watermark Toggle (Bottom of modal, default ON - Only visible when in Payment Tab) ⭐ */}
              {crViewFormat === 'payment' && !isCrPaymentMode ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCrWatermark(prev => !prev)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                      showCrWatermark
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                    title={`Toggle Watermark ${showCrWatermark ? 'OFF' : 'ON'} (Default: ON)`}
                  >
                    <Stamp className={`w-4 h-4 ${showCrWatermark ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>Watermark:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      showCrWatermark ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}>
                      {showCrWatermark ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    {showCrWatermark ? '(Watermark stamp enabled on receipt & PDF)' : '(Watermark stamp disabled)'}
                  </span>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {isCrPaymentMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCrPaymentMode(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel / View Receipt
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitPayment}
                      disabled={!!crError}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirm & Record Payment (Issue C.R. #{orNumber || '1001'})
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCrModal(false)}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Modify / Edit Transaction (Assigned Staff / Super Admin) */}
      {showEditModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 text-xs shadow-2xl text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Modify SOA Transaction</h3>
                  <p className="text-slate-500 text-[11px]">{selectedInvoice.invoiceNumber} • {selectedInvoice.clientName}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} className="space-y-4">
              {selectedInvoice.status === 'Cancelled' ? (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-700 text-xs">
                    <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                    This SOA Transaction is CANCELLED (Voided)
                  </p>
                  <p className="text-slate-700">
                    Cancelled on <strong>{selectedInvoice.cancelledAt?.substring(0, 10) || 'N/A'}</strong> by <strong>{selectedInvoice.cancelledBy || 'Staff'}</strong>.
                  </p>
                  {selectedInvoice.cancellationReason && (
                    <p className="text-slate-600 italic">
                      Reason: "{selectedInvoice.cancellationReason}"
                    </p>
                  )}
                  <p className="text-slate-500 text-[10px] pt-0.5">
                    All transaction items, billable locks, and linked payments have been undone.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Audit Trail Enforcement:
                  </p>
                  <p className="mt-0.5">Assigned staff can modify line items, but all modifications are permanently logged in an <strong>Amended History</strong> trail.</p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-2">Itemized Services & Deliverables</label>
                
                {/* Quick Add Pickers: Combined Searchable Dropdown with BIR Forms, Benefits, and Others (Modify SOA) ⭐ */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Add Service Line Options:</span>
                  <div className="flex flex-wrap items-center gap-2" ref={editServicePickerRef}>
                    
                    {/* Unified Searchable Dropdown Combobox */}
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditServicePickerOpen(!isEditServicePickerOpen);
                          setShowEditCreateCustomSection(false);
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add BIR Form, Benefit, or Service...</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isEditServicePickerOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isEditServicePickerOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 max-h-[440px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          {/* Search Bar */}
                          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              autoFocus
                              value={editServiceSearchTerm}
                              onChange={e => setEditServiceSearchTerm(e.target.value)}
                              placeholder="Search BIR forms, benefits, loans, retainers, service charge..."
                              className="w-full bg-transparent border-none text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                            />
                            {editServiceSearchTerm && (
                              <button
                                type="button"
                                onClick={() => setEditServiceSearchTerm('')}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Quick 1-Click Create Button if search term typed */}
                          {editServiceSearchTerm.trim() && (
                            <div className="p-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-emerald-900 truncate">
                                Add "<strong>{editServiceSearchTerm.trim()}</strong>"
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCreateEditCustomItem(editServiceSearchTerm.trim())}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-md shrink-0 shadow-2xs cursor-pointer"
                              >
                                + Add Line
                              </button>
                            </div>
                          )}

                          {/* Grouped Service List */}
                          <div className="overflow-y-auto flex-1 p-2 space-y-3 divide-y divide-slate-100 text-xs">
                            
                            {/* SECTION 1: BIR Tax Returns & Forms */}
                            {editUnifiedServiceCatalog.filter(item => 
                              item.category === 'BIR' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase()))
                            ).length > 0 && (
                              <div>
                                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 rounded-md mb-1 flex items-center justify-between">
                                  <span>BIR Tax Returns & Forms</span>
                                  <span className="font-mono text-[9px] font-bold text-amber-700">
                                    {editUnifiedServiceCatalog.filter(item => item.category === 'BIR' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase()))).length} items
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {editUnifiedServiceCatalog
                                    .filter(item => item.category === 'BIR' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase())))
                                    .map(item => (
                                      <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => handleSelectEditUnifiedItem(item)}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-amber-50/80 rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-amber-900 truncate text-[11px]">
                                          {item.name}
                                        </span>
                                        {item.defaultAmount > 0 && (
                                          <span
                                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs ${
                                              item.amountSource === 'Client Payables'
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-200'
                                                : item.amountSource === 'Client Retainer Profile'
                                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 ring-1 ring-indigo-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                            title={item.sourceDetail || `Amount originated from ${item.amountSource || 'Preset'}`}
                                          >
                                            <span className="font-mono font-extrabold">₱{item.defaultAmount.toLocaleString()}</span>
                                            {item.amountSource && (
                                              <span className="text-[9px] font-normal opacity-85">
                                                ({item.amountSource === 'Client Payables' ? 'from Client Payables' : item.amountSource === 'Client Retainer Profile' ? 'from Client Profile' : 'from Saved Preset'})
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* SECTION 2: Statutory Benefits & Loans */}
                            {editUnifiedServiceCatalog.filter(item => 
                              item.category === 'Benefits' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase()))
                            ).length > 0 && (
                              <div className="pt-2">
                                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 rounded-md mb-1 flex items-center justify-between">
                                  <span>Statutory Benefits & Loans</span>
                                  <span className="font-mono text-[9px] font-bold text-emerald-700">
                                    {editUnifiedServiceCatalog.filter(item => item.category === 'Benefits' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase()))).length} items
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {editUnifiedServiceCatalog
                                    .filter(item => item.category === 'Benefits' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase())))
                                    .map(item => (
                                      <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => handleSelectEditUnifiedItem(item)}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50/80 rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-emerald-900 truncate text-[11px]">
                                          {item.name}
                                        </span>
                                        {item.defaultAmount > 0 && (
                                          <span
                                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs ${
                                              item.amountSource === 'Client Payables'
                                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-1 ring-emerald-200'
                                                : item.amountSource === 'Client Retainer Profile'
                                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 ring-1 ring-indigo-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                            title={item.sourceDetail || `Amount originated from ${item.amountSource || 'Preset'}`}
                                          >
                                            <span className="font-mono font-extrabold">₱{item.defaultAmount.toLocaleString()}</span>
                                            {item.amountSource && (
                                              <span className="text-[9px] font-normal opacity-85">
                                                ({item.amountSource === 'Client Payables' ? 'from Client Payables' : item.amountSource === 'Client Retainer Profile' ? 'from Client Profile' : 'from Saved Preset'})
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* SECTION 3: Others (Retainers Fee, Service Charge, Bookkeeping, etc.) */}
                            {editUnifiedServiceCatalog.filter(item => 
                              item.category === 'Others' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase()))
                            ).length > 0 && (
                              <div className="pt-2">
                                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 bg-indigo-50 rounded-md mb-1 flex items-center justify-between">
                                  <span>Others & Professional Fees</span>
                                  <span className="font-mono text-[9px] font-bold text-indigo-700">
                                    {editUnifiedServiceCatalog.filter(item => item.category === 'Others' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase()))).length} items
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {editUnifiedServiceCatalog
                                    .filter(item => item.category === 'Others' && (!editServiceSearchTerm.trim() || item.name.toLowerCase().includes(editServiceSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(editServiceSearchTerm.toLowerCase())))
                                    .map(item => (
                                      <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => handleSelectEditUnifiedItem(item)}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50/80 rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-indigo-900 truncate text-[11px]">
                                          {item.name}
                                        </span>
                                        {item.defaultAmount > 0 && (
                                          <span
                                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs ${
                                              item.amountSource === 'Client Payables'
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-200'
                                                : item.amountSource === 'Client Retainer Profile'
                                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 ring-1 ring-indigo-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                            title={item.sourceDetail || `Amount originated from ${item.amountSource || 'Preset'}`}
                                          >
                                            <span className="font-mono font-extrabold">₱{item.defaultAmount.toLocaleString()}</span>
                                            {item.amountSource && (
                                              <span className="text-[9px] font-normal opacity-85">
                                                ({item.amountSource === 'Client Payables' ? 'from Client Payables' : item.amountSource === 'Client Retainer Profile' ? 'from Client Profile' : 'from Saved Preset'})
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Bottom Create Custom Item Footer Button / Form Toggle */}
                          <div className="p-2.5 bg-slate-50 border-t border-slate-200">
                            {!showEditCreateCustomSection ? (
                              <button
                                type="button"
                                onClick={() => setShowEditCreateCustomSection(true)}
                                className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>+ Create Another / Custom Item</span>
                              </button>
                            ) : (
                              <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2 text-xs shadow-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 text-[11px]">Create New Custom Item</span>
                                  <button
                                    type="button"
                                    onClick={() => setShowEditCreateCustomSection(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    placeholder="Item Description (e.g. Service Charge)"
                                    value={editCustomItemName}
                                    onChange={e => setEditCustomItemName(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder={`Period (e.g. ${selectedMonth} ${selectedYear})`}
                                      value={editCustomItemPeriod}
                                      onChange={e => setEditCustomItemPeriod(e.target.value)}
                                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const client = clients.find(c => c.id === selectedInvoice?.clientId);
                                        const defaultRate = client?.monthlyRetainerFee || 0;
                                        setPeriodCoverageModal({
                                          isOpen: true,
                                          itemIndex: -1,
                                          itemDescription: editCustomItemName || 'Custom Item',
                                          currentPeriod: editCustomItemPeriod || '',
                                          currentAmount: editCustomItemAmount || 0,
                                          defaultMonthlyRate: defaultRate,
                                          targetList: 'edit-custom',
                                        });
                                      }}
                                      className="p-1 text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg shrink-0 cursor-pointer transition-colors"
                                      title="Open Multi-Month / Period Coverage Builder"
                                    >
                                      <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                                    </button>
                                  </div>
                                  <CurrencyInput
                                    placeholder="Amount (₱)"
                                    value={editCustomItemAmount}
                                    onChange={val => setEditCustomItemAmount(val)}
                                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                                  />
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                  <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={saveEditCustomForFuture}
                                      onChange={e => setSaveEditCustomForFuture(e.target.checked)}
                                      className="rounded text-emerald-600 focus:ring-0"
                                    />
                                    <span>Save to presets</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleCreateEditCustomItem()}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-2xs cursor-pointer"
                                  >
                                    Add Line
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-700 px-1 mb-1">
                  <div className="col-span-5">Item / Service Description</div>
                  <div className="col-span-4">Month and Year</div>
                  <div className="col-span-3">Amount (PHP)</div>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editServices.map((s, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/80 p-1.5 border border-slate-200 rounded-xl">
                      <div className="col-span-5">
                        <SmartServiceInput
                          required
                          placeholder="e.g. 0619E, Retainers Fee"
                          value={s.description || ''}
                          onChange={val => {
                            const updated = [...editServices];
                            updated[idx].description = val;
                            setEditServices(updated);
                          }}
                          onSelectSuggestion={catalogItem => {
                            if (catalogItem.defaultAmount && !s.amount) {
                              const updated = [...editServices];
                              updated[idx].amount = catalogItem.defaultAmount;
                              setEditServices(updated);
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-4 flex items-center gap-1">
                        <SmartPeriodInput
                          placeholder="e.g. August 2026, Q3 2026"
                          value={s.monthYear !== undefined && s.monthYear !== null ? s.monthYear : ''}
                          selectedYear={selectedYear}
                          onChange={val => {
                            const updated = [...editServices];
                            updated[idx].monthYear = val;
                            setEditServices(updated);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const client = clients.find(c => c.id === selectedInvoice?.clientId);
                            const defaultRate = client?.monthlyRetainerFee || 0;
                            setPeriodCoverageModal({
                              isOpen: true,
                              itemIndex: idx,
                              itemDescription: s.description || 'Service Line',
                              currentPeriod: s.monthYear || '',
                              currentAmount: s.amount || 0,
                              defaultMonthlyRate: defaultRate,
                              initialDivideToMonths: s.divideToMonths !== undefined ? s.divideToMonths : true,
                              targetList: 'edit',
                            });
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg shrink-0 cursor-pointer transition-colors"
                          title="Open Multi-Month / Period Coverage Builder"
                        >
                          <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <CurrencyInput
                          value={s.amount}
                          onChange={val => {
                            const updated = [...editServices];
                            updated[idx].amount = val;
                            setEditServices(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-mono font-bold"
                        />
                        {editServices.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditServices(editServices.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-600 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditServices([...editServices, { description: '', monthYear: `${selectedMonth} ${selectedYear}`, amount: 0 }])}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item Line
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditNotesBox(prev => {
                        const next = !prev;
                        if (next && !editBillingNotes) {
                          setEditBillingNotes('Kindly Pay To FFCSI');
                        }
                        return next;
                      });
                    }}
                    className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border shadow-2xs transition-all ${
                      showEditNotesBox 
                        ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-200' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                    title="Toggle Notes Box on or off"
                  >
                    <MessageSquarePlus className={`w-3.5 h-3.5 ${showEditNotesBox ? 'text-white' : 'text-emerald-600'}`} />
                    <span>Add Notes Box</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                      showEditNotesBox ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {showEditNotesBox ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>

                {/* Edit Centered Plain Clear Notes Box ⭐ */}
                {showEditNotesBox && (
                  <div className="bg-emerald-50/80 border border-emerald-300/80 rounded-xl p-3 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <StickyNote className="w-4 h-4 text-emerald-600" />
                        <span>Billing Notes / Remarks (e.g. Kindly Pay To FFCSI)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {savedNotesPresets.length > 0 && (
                          <select
                            aria-label="Select saved note preset"
                            className="text-[11px] bg-white border border-emerald-200 text-slate-700 rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-400"
                            onChange={(e) => {
                              if (e.target.value) {
                                setEditBillingNotes(e.target.value);
                              }
                            }}
                            value=""
                          >
                            <option value="" disabled>Load Saved Preset...</option>
                            {savedNotesPresets.map((preset, pIdx) => (
                              <option key={pIdx} value={preset}>{preset}</option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditNotesBox(false);
                            setEditBillingNotes('');
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                          title="Remove Notes Box"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-11 gap-2 items-center">
                      <div className="col-span-8">
                        <input
                          type="text"
                          value={editBillingNotes}
                          onChange={(e) => setEditBillingNotes(e.target.value)}
                          placeholder="Enter notes (e.g. Kindly Pay To FFCSI)..."
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (editBillingNotes.trim()) {
                              handleSaveNotePreset(editBillingNotes.trim());
                              setAlertModal({
                                isOpen: true,
                                title: 'Note Preset Saved',
                                message: 'Note saved to presets library!',
                                type: 'success'
                              });
                            }
                          }}
                          disabled={!editBillingNotes.trim()}
                          className="w-full px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                          title="Save this note to presets"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>

                    {savedNotesPresets.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-emerald-800 font-semibold">Saved Presets:</span>
                        {savedNotesPresets.map((preset, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1 bg-white border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md text-[10px] shadow-2xs"
                          >
                            <button
                              type="button"
                              onClick={() => setEditBillingNotes(preset)}
                              className="hover:text-emerald-700 font-medium cursor-pointer"
                            >
                              {preset.length > 35 ? preset.substring(0, 33) + '...' : preset}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Amendment *</label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="e.g. Adjusted retainer amount per client agreement, added late filing fee."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {selectedInvoice.status !== 'Cancelled' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenCancelModal(selectedInvoice)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    title="Cancel SOA Transaction: Revert all items, undo payments, and mark as Cancelled"
                  >
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Cancel SOA Transaction</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-rose-600" />
                    Transaction Cancelled
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                  {selectedInvoice.status !== 'Cancelled' && (
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                    >
                      Save & Log Amendment
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

              {/* MODAL 6: View Transaction Ledger & Amended History */}
      {showHistoryModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 text-xs shadow-2xl text-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Invoice Payment Ledger & History Audit</h3>
                  <p className="text-slate-500 text-[11px]">{selectedInvoice.invoiceNumber} • {selectedInvoice.clientName}</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Ledger Section ⭐ */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Recorded Payments & Receipts
              </h4>
              {getInvoicePayments(selectedInvoice.id).length === 0 ? (
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 italic">
                  No payment transactions recorded yet.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3">Receipt / Ref</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        {isSuperAdmin && <th className="py-2 px-3 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getInvoicePayments(selectedInvoice.id).map(pmt => (
                        <tr key={pmt.id} className={pmt.status === 'Cancelled' ? 'bg-rose-50/30' : ''}>
                          <td className="py-2 px-3 font-mono">{pmt.paymentDate}</td>
                          <td className="py-2 px-3 font-medium">{pmt.paymentMethod}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {pmt.collectionReceiptNumber || pmt.referenceNumber || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ₱{pmt.amount.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              pmt.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {pmt.status}
                            </span>
                          </td>
                          {isSuperAdmin && (
                            <td className="py-2 px-3 text-center">
                              {pmt.status === 'Active' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelPaymentModal({
                                      isOpen: true,
                                      payment: pmt,
                                      reason: ''
                                    });
                                  }}
                                  className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded text-[10px] border border-rose-200 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">{pmt.cancellationReason || 'Cancelled'}</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Amended History Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <History className="w-4 h-4 text-amber-600" /> Invoice Structural Amendment History
              </h4>
              {(!selectedInvoice.amendedHistory || selectedInvoice.amendedHistory.length === 0) ? (
                <p className="text-slate-400 italic text-center py-3">No structural invoice amendments recorded.</p>
              ) : (
                selectedInvoice.amendedHistory.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex justify-between items-center font-semibold text-slate-800">
                      <span>Modified by: <strong className="text-indigo-700">{item.modifiedBy}</strong></span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                    </div>
                    <p className="text-slate-600 font-medium">{item.details}</p>
                    <div className="flex gap-4 text-[10px] text-slate-500 font-mono pt-1">
                      <span>Prev Total: ₱{item.previousTotal.toLocaleString()}</span>
                      <span>→ New Total: <strong>₱{item.newTotal.toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option 1: Drag & Drop Printable Template Customizer Modal */}
      <BillingTemplateCustomizerModal
        isOpen={showCustomizerModal}
        onClose={() => setShowCustomizerModal(false)}
        sampleInvoice={invoices[0]}
      />

      {/* MODAL: Collection Follow-Up Contact Log */}
      {showCollectionModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 text-xs shadow-xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">Log Collection Follow-Up Contact</h3>
              </div>
              <button
                onClick={() => setShowCollectionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">{selectedInvoice.clientName}</p>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">Collection #: {selectedInvoice.collectionNumber || '1001'} • Due: {selectedInvoice.dueDate}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] block">Outstanding Balance</span>
                <span className="font-mono font-bold text-amber-700 text-sm">₱{getInvoiceBalance(selectedInvoice.id).toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitCollectionLog} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={collectionContactPerson}
                    onChange={e => setCollectionContactPerson(e.target.value)}
                    required
                    placeholder="e.g., Ms. Jane Doe (CFO)"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Method</label>
                  <select
                    value={collectionContactMethod}
                    onChange={e => setCollectionContactMethod(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="Phone Call">Phone Call</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="In-Person">In-Person Visit</option>
                    <option value="Letter">Formal Demand Letter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Collection Status</label>
                  <select
                    value={collectionStatus}
                    onChange={e => setCollectionStatus(e.target.value as CollectionStatus)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="Follow-Up Required">Follow-Up Required</option>
                    <option value="Promise to Pay">Promise to Pay</option>
                    <option value="Due Soon">Due Soon</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Paid">Paid</option>
                    <option value="Disputed">Disputed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={collectionNextFollowUp}
                    onChange={e => setCollectionNextFollowUp(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Follow-Up Notes & Discussion Summary</label>
                <textarea
                  value={collectionNotes}
                  onChange={e => setCollectionNotes(e.target.value)}
                  rows={3}
                  required
                  placeholder="Record summary of conversation, promised payment date, or issues raised..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
              </div>

              {/* History of Past Collection Logs */}
              {selectedInvoice.collectionLogs && selectedInvoice.collectionLogs.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="font-bold text-slate-800 text-xs">Past Collection Contact Log History ({selectedInvoice.collectionLogs.length}):</p>
                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                    {selectedInvoice.collectionLogs.map(log => (
                      <div key={log.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{log.contactPerson} ({log.contactMethod})</span>
                          <span className="text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600 text-xs">{log.notes}</p>
                        <p className="text-[10px] text-amber-800 font-bold">Status: {log.status} • Logged by: {log.loggedByName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-4 h-4" /> Save Collection Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Duplicate Item Already Billed Warning */}
      {duplicateWarningModal && duplicateWarningModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-amber-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  ⚠️ Item / Period Already Billed
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This item (<strong>{duplicateWarningModal.itemName}</strong> for <strong>{duplicateWarningModal.monthYear}</strong> — <strong className="font-mono text-slate-900">₱{duplicateWarningModal.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>) overlaps with billing coverage <strong className="text-amber-900 font-semibold">{duplicateWarningModal.overlappingPeriod || duplicateWarningModal.monthYear}</strong> already billed under Invoice / Billing # <strong className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">{duplicateWarningModal.billingNumber}</strong>.
                </p>
                <p className="text-xs font-semibold text-slate-800 pt-1">
                  Do you want to proceed and allow this duplicate coverage anyway?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDuplicateWarningModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel / Do Not Add
              </button>
              <button
                type="button"
                onClick={() => {
                  if (duplicateWarningModal.existingIndex !== undefined) {
                    const updated = [...services];
                    if (updated[duplicateWarningModal.existingIndex]) {
                      updated[duplicateWarningModal.existingIndex] = duplicateWarningModal.pendingLine;
                      setServices(updated);
                    }
                  } else {
                    setServices(prev => [...prev, duplicateWarningModal.pendingLine]);
                  }
                  setDuplicateWarningModal(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                Allow and Keep Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Change Payable Amount from Previous Billing */}
      {applyPreviousAmountModal && applyPreviousAmountModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
                <History className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  Change Payable Amount?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Do you want to change the payable amount for <strong>{applyPreviousAmountModal.itemDescription}</strong> to <strong className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">₱{applyPreviousAmountModal.previousAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (from previous billing for <strong>{applyPreviousAmountModal.previousMonthYear}</strong>)?
                </p>
                {applyPreviousAmountModal.currentAmount > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Current line amount: <span className="font-mono line-through">₱{applyPreviousAmountModal.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApplyPreviousAmountModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleServiceChange(applyPreviousAmountModal.itemIndex, 'amount', applyPreviousAmountModal.previousAmount);
                  setApplyPreviousAmountModal(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Yes, Change Amount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Multi-Month & Period Coverage Builder */}
      {periodCoverageModal && periodCoverageModal.isOpen && (
        <PeriodCoverageModal
          isOpen={periodCoverageModal.isOpen}
          onClose={() => setPeriodCoverageModal(null)}
          itemDescription={periodCoverageModal.itemDescription}
          currentPeriod={periodCoverageModal.currentPeriod}
          currentAmount={periodCoverageModal.currentAmount}
          defaultMonthlyRate={periodCoverageModal.defaultMonthlyRate}
          initialDivideToMonths={periodCoverageModal.initialDivideToMonths}
          onApply={(periodText, newAmount, coveredMonths, monthlyRate, divideToMonths) => {
            if (periodCoverageModal.targetList === 'custom') {
              setCustomItemPeriod(periodText);
              if (newAmount !== undefined) {
                setCustomItemAmount(newAmount);
              }
            } else if (periodCoverageModal.targetList === 'edit-custom') {
              setEditCustomItemPeriod(periodText);
              if (newAmount !== undefined) {
                setEditCustomItemAmount(newAmount);
              }
            } else if (periodCoverageModal.targetList === 'edit') {
              const updated = [...editServices];
              if (updated[periodCoverageModal.itemIndex]) {
                updated[periodCoverageModal.itemIndex] = {
                  ...updated[periodCoverageModal.itemIndex],
                  monthYear: periodText,
                  amount: newAmount !== undefined ? newAmount : updated[periodCoverageModal.itemIndex].amount,
                  coveredMonths: coveredMonths,
                  monthlyRate: monthlyRate,
                  divideToMonths: divideToMonths
                };
                setEditServices(updated);
              }
            } else {
              const idx = periodCoverageModal.itemIndex;
              const updated = [...services];
              if (updated[idx]) {
                const finalAmt = newAmount !== undefined ? newAmount : (updated[idx].amount || 0);
                const pendingLine: InvoiceServiceLine = {
                  ...updated[idx],
                  monthYear: periodText,
                  amount: finalAmt,
                  unitPrice: finalAmt,
                  coveredMonths: coveredMonths,
                  monthlyRate: monthlyRate,
                  divideToMonths: divideToMonths
                };

                // Duplicate Check on Apply
                if (selectedClientId) {
                  const cleanDesc = pendingLine.description || periodCoverageModal.itemDescription;
                  const duplicateCheck = findAlreadyBilledInvoice(selectedClientId, cleanDesc, periodText, finalAmt, coveredMonths);
                  if (duplicateCheck.isBilled) {
                    setDuplicateWarningModal({
                      isOpen: true,
                      itemName: cleanDesc,
                      monthYear: periodText,
                      amount: finalAmt,
                      billingNumber: duplicateCheck.billingNumber || 'N/A',
                      overlappingPeriod: duplicateCheck.overlappingInfo,
                      pendingLine: pendingLine,
                      existingIndex: idx
                    });
                    return;
                  }
                }

                updated[idx] = pendingLine;
                setServices(updated);
                setMonthYearErrors(prev => {
                  const next = { ...prev };
                  delete next[idx];
                  return next;
                });
                setAmountErrors(prev => {
                  const next = { ...prev };
                  delete next[idx];
                  return next;
                });
              }
            }
          }}
        />
      )}

      {/* MODAL: Delete Invoice Confirmation */}
      {deleteInvoiceModal.isOpen && deleteInvoiceModal.invoice && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0 border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Delete Statement of Account?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete Collection # <strong className="font-mono text-slate-900">{deleteInvoiceModal.invoice.collectionNumber || deleteInvoiceModal.invoice.invoiceNumber}</strong> for <strong className="text-slate-900">{deleteInvoiceModal.invoice.clientName}</strong> (₱{deleteInvoiceModal.invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})?
                </p>
                <p className="text-[11px] text-rose-600 font-semibold pt-1">
                  ⚠️ This action cannot be undone and will remove the record from all AR and ledger views.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteInvoiceModal({ isOpen: false, invoice: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteInvoiceModal.invoice) {
                    deleteInvoice(deleteInvoiceModal.invoice.id);
                    setDeleteInvoiceModal({ isOpen: false, invoice: null });
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm & Record Official Collection Receipt Payment */}
      {confirmCrPaymentModal.isOpen && confirmCrPaymentModal.targetInv && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-800 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 border border-emerald-200">
                <Receipt className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Confirm & Issue C.R. #{confirmCrPaymentModal.finalCr}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Please review the payment remittance details before finalizing the Official Collection Receipt.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Client Company:</span>
                <span className="font-bold text-slate-900 text-right">{confirmCrPaymentModal.targetInv.clientName}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Collection Receipt (C.R.) #:</span>
                <span className="font-mono font-bold text-emerald-700">#{confirmCrPaymentModal.finalCr}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Payment Date & Method:</span>
                <span className="font-semibold text-slate-800">{confirmCrPaymentModal.paymentDate} • {confirmCrPaymentModal.overallMethod}</span>
              </div>
              {confirmCrPaymentModal.chequeRefs && (
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Cheque Breakdown:</span>
                  <span className="font-mono text-indigo-700 font-semibold">{confirmCrPaymentModal.chequeRefs}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Settlement Classification:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  confirmCrPaymentModal.isFullyPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {confirmCrPaymentModal.isFullyPaid ? 'Full Payment' : 'Partial Payment'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 font-bold">
                <span className="text-slate-900">Total Remittance Amount:</span>
                <span className="font-mono text-emerald-700 text-base">
                  ₱{confirmCrPaymentModal.finalPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Line items being settled */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              <p className="text-[11px] font-bold text-slate-700">Line Items Included in this Payment:</p>
              {confirmCrPaymentModal.updatedServices.map((item, idx) => (
                <div key={idx} className={`p-2 rounded-lg border text-xs flex justify-between items-center ${
                  item.isPaid ? 'bg-emerald-50/70 border-emerald-200 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  <div>
                    <span className="font-semibold text-slate-900">{item.description}</span>
                    <span className="text-[10px] text-slate-500 block">{item.monthYear} • {item.isPaid ? (item.paymentMode || 'Cash') : 'Unpaid / Pending'}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmCrPaymentModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel / Review
              </button>
              <button
                type="button"
                onClick={handleExecuteCrPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Issue C.R. #{confirmCrPaymentModal.finalCr}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel SOA Transaction Prompt */}
      {cancelInvoiceModal.isOpen && cancelInvoiceModal.invoice && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0 border border-rose-200">
                <Ban className="w-6 h-6 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Cancel SOA Transaction
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cancel transaction for <strong className="text-slate-900">{cancelInvoiceModal.invoice.clientName}</strong> (Collection #{cancelInvoiceModal.invoice.collectionNumber || cancelInvoiceModal.invoice.invoiceNumber}, <strong className="font-mono text-slate-900">₱{cancelInvoiceModal.invoice.totalAmount.toLocaleString()}</strong>).
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1 text-xs">
              <p className="font-bold flex items-center gap-1 text-rose-800">
                <AlertCircle className="w-3.5 h-3.5" /> Full Transaction Reversal Effect:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px] pl-0.5">
                <li>Sets invoice status to <strong>Cancelled</strong></li>
                <li>Undoes all line items and releases month billing locks</li>
                <li>Reverts running balance to ₱0 and marks linked payments as cancelled</li>
                <li>Permanently logs entry into <strong>Amended Audit History</strong></li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                rows={3}
                required
                value={cancelInvoiceModal.reason}
                onChange={e => setCancelInvoiceModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter detailed reason (e.g. Erroneous double billing, client requested cancellation, superseded by revised SOA)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-rose-200 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelInvoiceModal({ isOpen: false, invoice: null, reason: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                No, Keep Active
              </button>
              <button
                type="button"
                disabled={!cancelInvoiceModal.reason.trim()}
                onClick={handleConfirmCancelInvoice}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                Confirm & Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel Payment Prompt */}
      {cancelPaymentModal.isOpen && cancelPaymentModal.payment && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0 border border-rose-200">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Cancel Payment Transaction
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cancel recorded payment of <strong className="font-mono text-slate-900">₱{cancelPaymentModal.payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> ({cancelPaymentModal.payment.paymentMethod}, {cancelPaymentModal.payment.paymentDate}).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cancellation Reason *</label>
              <textarea
                rows={2}
                value={cancelPaymentModal.reason}
                onChange={e => setCancelPaymentModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter cancellation reason (e.g. Bounced cheque, wrong bank account, double entry)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelPaymentModal({ isOpen: false, payment: null, reason: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={!cancelPaymentModal.reason.trim()}
                onClick={() => {
                  if (cancelPaymentModal.payment && cancelPaymentModal.reason.trim()) {
                    const res = cancelInvoicePayment(cancelPaymentModal.payment.id, cancelPaymentModal.reason.trim(), currentUser?.id, currentUser?.fullName);
                    setCancelPaymentModal({ isOpen: false, payment: null, reason: '' });
                    setAlertModal({
                      isOpen: true,
                      title: 'Payment Cancelled',
                      message: res.message,
                      type: 'info'
                    });
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable AppModal for System Alerts & Messages */}
      <AppModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

    </div>
  );
};

