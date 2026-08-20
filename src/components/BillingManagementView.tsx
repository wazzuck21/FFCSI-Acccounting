import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InvoiceItem, InvoiceServiceLine, Payment, CollectionStatus, ServiceBillingFrequency, CollectionLog, AuditLog, ClientProfile } from '../types';
import { CurrencyInput } from './CurrencyInput';
import { SearchableClientSelect } from './SearchableClientSelect';
import { BillingTemplateCustomizerModal } from './BillingTemplateCustomizerModal';
import { PeriodCoverageModal } from './PeriodCoverageModal';
import { HardcopyReceiptModal } from './HardcopyReceiptModal';
import { generateCustomizedInvoicePDF, generateFFCSICollectionReceiptPDF, getBillingTemplateConfig } from '../utils/billingTemplateUtils';
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
  PlusCircle
} from 'lucide-react';

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
  doc.text('INVOICE #', 18, y + 5.5);
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
    doc.text(inv.invoiceNumber, 18, y);
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
    cancelInvoicePayment,
    getInvoicePayments,
    getInvoiceBalance,
    collectionLogs,
    addCollectionLog,
    generateRecurringInvoices,
    updateInvoiceStatus, 
    deleteInvoice, 
    addAuditLog,
    getNextCrNumber,
    isCrNumberUsed,
    getNextCollectionNumber,
    isCollectionNumberUsed,
    saveCustomService,
    billerCatalog
  } = useData();
  const { currentUser, isSuperAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSoaModal, setShowSoaModal] = useState(false);
  const [showCrModal, setShowCrModal] = useState(false);
  const [showHardcopyModal, setShowHardcopyModal] = useState(false);
  const [hardcopySelectedInvoice, setHardcopySelectedInvoice] = useState<InvoiceItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Phase 4 & Phase 5 Sub-Tab Navigation ⭐
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'ar' | 'soa' | 'reports' | 'analytics' | 'audit'>('invoices');

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
    targetList?: 'create' | 'edit' | 'custom';
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

  // Unified Service Picker Dropdown State ⭐
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [showCreateCustomSection, setShowCreateCustomSection] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPeriod, setCustomItemPeriod] = useState('');
  const [customItemAmount, setCustomItemAmount] = useState<number>(0);
  const [saveCustomForFuture, setSaveCustomForFuture] = useState(true);
  const servicePickerRef = useRef<HTMLDivElement>(null);

  // Close service picker when clicking outside
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

  // Edit SOA Form state
  const [editServices, setEditServices] = useState<InvoiceServiceLine[]>([]);
  const [editReason, setEditReason] = useState('');

  // SOA Billing Notes Box State & Saved Presets Library ⭐
  const [billingNotes, setBillingNotes] = useState<string>('');
  const [showNotesBox, setShowNotesBox] = useState<boolean>(false);
  const [editBillingNotes, setEditBillingNotes] = useState<string>('');
  const [showEditNotesBox, setShowEditNotesBox] = useState<boolean>(false);
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

  // Payment Form state
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

  // Handle Client Change in Create Modal: Only show items if there is an actual payable or fee/amount > 0 and NOT already invoiced
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
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
      alert('Please select a client company first.');
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
      alert(`No unbilled active payables or retainer fees found for ${selectedClient.companyName}.`);
    }
  };

  // Master combined items for the searchable dropdown
  const unifiedServiceCatalog = [
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
    { code: 'RETAINERS_FEE', name: 'Retainers Fee', category: 'Others' as const, defaultAmount: selectedClient?.retainersFee || 0 },
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

    setServices(prev => [...prev, pendingLine]);
    setIsServicePickerOpen(false);
    setServiceSearchTerm('');
  };

  // Create Custom Item from Unified Dropdown (with Duplicate Check Warning)
  const handleCreateCustomItem = (nameOverride?: string) => {
    const nameToUse = (nameOverride || customItemName || serviceSearchTerm).trim();
    if (!nameToUse) {
      alert('Please enter an item or service description.');
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

    setServices(prev => [...prev, pendingLine]);

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

  const handleRemoveServiceLine = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, field: 'description' | 'monthYear' | 'amount', value: any) => {
    const updated = [...services];
    const current = updated[index] || { description: '', monthYear: '', amount: 0 };
    if (field === 'monthYear') {
      const parsedMonths = parsePeriodToMonths(String(value || ''));
      const amt = Number(current.amount) || 0;
      updated[index] = {
        ...current,
        monthYear: value,
        coveredMonths: parsedMonths,
        monthlyRate: parsedMonths.length > 0 ? amt / parsedMonths.length : amt
      };
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
    } else {
      updated[index] = {
        ...current,
        [field]: value
      };
    }
    setServices(updated);
  };

  // Subtotal & Total Calculations (12% VAT removed per user request)
  const subtotal = services.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const vatAmount = 0;
  const totalAmount = subtotal;

  // Submit Create Invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Please select a client company.');
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
      alert('Please add at least one billable item or service line to generate the SOA.');
      return;
    }

    // Auto-save any custom service descriptions for future reuse
    services.forEach(s => {
      if (s.description && s.description.trim()) {
        saveCustomService({ description: s.description.trim(), defaultAmount: s.amount });
      }
    });

    addInvoice({
      clientId: client.id,
      clientName: client.companyName,
      collectionNumber: cleanColl,
      issueDate,
      dueDate,
      subtotal,
      vatAmount: 0,
      totalAmount,
      paidAmount: 0,
      status: 'Sent',
      services,
      billingNotes: showNotesBox && billingNotes.trim() ? billingNotes.trim() : undefined,
    });

    addAuditLog(
      'Invoice Generated',
      `Generated Statement of Account (Collection # ${cleanColl}) for ${client.companyName} amounting to ₱${totalAmount.toLocaleString()} (${billingPeriod}).`,
      currentUser?.id || 'system',
      currentUser?.fullName || 'System Admin'
    );

    setShowCreateModal(false);
    alert(`Statement of Account (Collection # ${cleanColl}) successfully created for ${client.companyName}!`);
  };

  // Open Payment Modal (Super Admin Only)
  const handleOpenPayment = (inv: InvoiceItem) => {
    if (!isSuperAdmin) {
      alert('🔒 Access Restricted: Only Super Admin can process and record payments for billing.');
      return;
    }
    setSelectedInvoice(inv);
    const balance = getInvoiceBalance(inv.id);
    setPaymentAmount(balance > 0 ? balance : 0);
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setPaymentMethod('Cash');
    setPaymentRefNum('');
    
    // Initialize per-item payment methods
    const initialMethods: { [serviceIdx: number]: string } = {};
    inv.services.forEach((s, idx) => {
      initialMethods[idx] = s.paymentMethod || 'Cash';
    });
    setServicePaymentMethods(initialMethods);

    // Auto-generate 4-digit unique Collection Receipt Number
    const next4Digit = getNextCrNumber();
    setOrNumber(next4Digit);
    setCrError('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  // Submit Record Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const currentBalance = getInvoiceBalance(selectedInvoice.id);
    if (paymentAmount > currentBalance) {
      if (!confirm(`Warning: Payment amount (₱${paymentAmount.toLocaleString()}) exceeds remaining invoice balance (₱${currentBalance.toLocaleString()}). Proceed with overpayment recording?`)) {
        return;
      }
    }

    // 4-Digit Unique C.R. # Enforcement
    const cleanDigits = orNumber.trim().replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length !== 4) {
      setCrError('Collection Receipt Number MUST be exactly 4 digits (e.g., 1001, 1002).');
      return;
    }

    if (isCrNumberUsed(cleanDigits) || isCrNumberUsed(orNumber)) {
      setCrError(`❌ C.R. # ${cleanDigits} has ALREADY been generated/used! Duplicate Collection Receipt numbers cannot be reused once assigned. Next available 4-digit C.R. # is ${getNextCrNumber()}.`);
      return;
    }

    const finalCr = `C.R.# ${cleanDigits}`;

    const updatedServices = selectedInvoice.services.map((s, idx) => ({
      ...s,
      paymentMethod: servicePaymentMethods[idx] || paymentMethod || 'Cash'
    }));

    const res = recordInvoicePayment(
      selectedInvoice.id,
      {
        amount: Number(paymentAmount),
        paymentDate,
        paymentMethod,
        referenceNumber: paymentRefNum,
        officialReceiptNumber: finalCr,
        collectionReceiptNumber: finalCr,
        notes: paymentNotes,
        updatedServices
      },
      currentUser?.id,
      currentUser?.fullName
    );

    if (res.success) {
      setShowPaymentModal(false);
      alert(`${res.message}\nUnique Collection Receipt ${finalCr} successfully generated and recorded.`);
    } else {
      alert(res.message);
    }
  };

  // Open SOA Modal
  const handleViewSoa = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setShowSoaModal(true);
  };

  // Open Edit SOA Modal for Assigned Staff / Super Admin
  const handleOpenEditModal = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setEditServices(inv.services.map(s => ({ ...s })));
    setEditReason('');
    setEditBillingNotes(inv.billingNotes || '');
    setShowEditNotesBox(Boolean(inv.billingNotes && inv.billingNotes.trim()));
    setShowEditModal(true);
  };

  // Submit Edit Invoice (Amended History preserved)
  const handleSaveEditInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (!editReason.trim()) {
      alert('Please provide a reason / details for modifying this transaction.');
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
    alert('Transaction successfully modified and recorded in Amended History!');
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
      alert('Please enter collection follow-up details or outcome notes.');
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

    alert(res.message);
    setShowCollectionModal(false);
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalBilled = invoices.filter(i => i.status !== 'Cancelled').reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.filter(i => i.status !== 'Cancelled').reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const totalOutstanding = totalBilled - totalCollected;
  const overdueCount = invoices.filter(i => i.status !== 'Cancelled' && (i.status === 'Overdue' || (i.status === 'Sent' && new Date(i.dueDate) < new Date()))).length;

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
            onClick={() => {
              if (filteredInvoices.length > 0) {
                setHardcopySelectedInvoice(filteredInvoices[0]);
                setShowHardcopyModal(true);
              } else if (invoices.length > 0) {
                setHardcopySelectedInvoice(invoices[0]);
                setShowHardcopyModal(true);
              }
            }}
            title="Open Hardcopy Stationery Print & Calibration Tool (Parentheses Overlay)"
            className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-red-600" /> Hardcopy Print Form
          </button>
          <button
            onClick={() => setShowCustomizerModal(true)}
            title="Customize Printable SOA & Invoice Layout (Drag & Drop)"
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Sliders className="w-4 h-4 text-indigo-600" /> Customize Layout
          </button>
          <button
            onClick={() => downloadBillingSummaryReportPDF(filteredInvoices)}
            title="Download Billing Summary PDF Report"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
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
            placeholder="Search invoice # or client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['ALL', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Draft'].map(status => (
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
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Issue & Due Date</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
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
                  const isPastDue = new Date(inv.dueDate) < new Date() && balance > 0;
                  const displayStatus = isPastDue ? 'Overdue' : inv.status;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => handleViewSoa(inv)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline text-xs flex items-center gap-1.5 cursor-pointer text-left"
                          title="Click to view Statement of Account (SOA)"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        <div>Issue: {inv.issueDate}</div>
                        <div className={isPastDue ? 'text-rose-600 font-bold' : 'text-slate-400'}>Due: {inv.dueDate}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₱{inv.totalAmount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        ₱{(inv.paidAmount || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                        ₱{balance.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          displayStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          displayStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          displayStatus === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          displayStatus === 'Sent' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleViewSoa(inv)}
                            title="View Statement of Account (SOA)"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => downloadInvoicePDF(inv)}
                            title="Download Statement of Account PDF"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Print on Hardcopy Stationery (Pre-Printed Form Overlay) */}
                          <button
                            onClick={() => {
                              setHardcopySelectedInvoice(inv);
                              setShowHardcopyModal(true);
                            }}
                            title="Print on Pre-Printed Hardcopy Template (Data Only / Parentheses Alignment)"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Modify Transaction for Assigned Staff / Super Admin */}
                          <button
                            onClick={() => handleOpenEditModal(inv)}
                            title="Modify Transaction / SOA Items"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

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

                          {balance > 0 && (
                            isSuperAdmin ? (
                              <button
                                onClick={() => handleOpenPayment(inv)}
                                title="Record Payment (Super Admin)"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
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

                          {(inv.collectionReceiptNumber || inv.officialReceiptNumber) && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setShowCrModal(true);
                              }}
                              title={`View Collection Receipt (${inv.collectionReceiptNumber || inv.officialReceiptNumber})`}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors shrink-0"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              {inv.collectionReceiptNumber || inv.officialReceiptNumber}
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete Invoice ${inv.invoiceNumber}?`)) {
                                  deleteInvoice(inv.id);
                                }
                              }}
                              title="Delete Invoice"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                    <th className="py-3 px-4 text-center">Actions</th>
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
                              onClick={() => handleViewSoa(inv)}
                              className="text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
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

                              {balance > 0 && isSuperAdmin && (
                                <button
                                  onClick={() => handleOpenPayment(inv)}
                                  title="Record Payment"
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <CreditCard className="w-3 h-3" /> Pay
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

      {/* SUB-TAB 4: REVENUE & COLLECTION ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Revenue & Collections Distribution Analytics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Service Categories Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                  Revenue Billed by Service Category
                </h4>
                <div className="space-y-2">
                  {['BIR Tax Compliance', 'Accounting Retainers', 'External Audit', 'Payroll Management', 'SEC & Corporate', 'Other Services'].map(cat => {
                    const catInvoices = invoices.filter(i => i.status !== 'Cancelled' && i.services.some(s => (s.serviceCategory || 'Other').toLowerCase().includes(cat.toLowerCase().split(' ')[0])));
                    const catAmount = catInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
                    const percentage = totalBilled > 0 ? (catAmount / totalBilled) * 100 : 0;

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800">{cat}</span>
                          <span className="font-mono font-bold text-slate-900">₱{catAmount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Client Collections Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                  Top Clients Accounts Receivable Leaderboard
                </h4>
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {clients.map(c => {
                    const clientInvs = invoices.filter(i => i.clientId === c.id && i.status !== 'Cancelled');
                    const cBilled = clientInvs.reduce((acc, i) => acc + i.totalAmount, 0);
                    const cPaid = clientInvs.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
                    const cBalance = cBilled - cPaid;

                    if (cBilled === 0) return null;

                    return (
                      <div key={c.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{c.companyName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Billed: ₱{cBilled.toLocaleString()} • Paid: ₱{cPaid.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-amber-600">₱{cBalance.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-emerald-700">
                            {cBilled > 0 ? `${((cPaid / cBilled) * 100).toFixed(0)}% paid` : '0%'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                          <th className="py-2.5 px-3">Invoice / Ref #</th>
                          <th className="py-2.5 px-3">Billing Period</th>
                          <th className="py-2.5 px-3">Services / Particulars</th>
                          <th className="py-2.5 px-3 text-right">Billed (+)</th>
                          <th className="py-2.5 px-3 text-right">Paid (-)</th>
                          <th className="py-2.5 px-3 text-center">C.R. #</th>
                          <th className="py-2.5 px-3 text-right">Running Balance</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clientSoa.entries.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-8 text-center text-slate-400">
                              No statement of account ledger entries found for this client and date filter.
                            </td>
                          </tr>
                        ) : (
                          clientSoa.entries.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{entry.date}</td>
                              <td className="py-3 px-3 font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  entry.type === 'Invoice' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  entry.type === 'Payment' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">#{entry.collectionNo}</td>
                              <td className="py-3 px-3 font-mono text-slate-700">{entry.refNo}</td>
                              <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{entry.billingPeriod}</td>
                              <td className="py-3 px-3 text-slate-800 font-medium max-w-xs truncate" title={entry.servicesDescription}>
                                {entry.servicesDescription}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                {entry.billedAmount > 0 ? `₱${entry.billedAmount.toLocaleString()}` : '-'}
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
                              <td className="py-3 px-3 text-center">
                                {entry.originalInvoiceId && (
                                  <button
                                    onClick={() => {
                                      const inv = invoices.find(i => i.id === entry.originalInvoiceId);
                                      if (inv) {
                                        setSelectedInvoice(inv);
                                        setShowSoaModal(true);
                                      }
                                    }}
                                    className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-md cursor-pointer inline-flex items-center gap-1 font-semibold text-[11px]"
                                    title="View Statement Modal"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>
                                )}
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
        const { auditLogs } = useData();

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
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-amber-50/80 rounded-lg flex items-center justify-between group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-amber-900 truncate text-[11px]">
                                          {item.name}
                                        </span>
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
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50/80 rounded-lg flex items-center justify-between group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-emerald-900 truncate text-[11px]">
                                          {item.name}
                                        </span>
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
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50/80 rounded-lg flex items-center justify-between group transition-colors cursor-pointer"
                                      >
                                        <span className="font-semibold text-slate-800 group-hover:text-indigo-900 truncate text-[11px]">
                                          {item.name} {item.defaultAmount ? `(₱${item.defaultAmount.toLocaleString()})` : ''}
                                        </span>
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

                    {/* Add Notes Box Button ⭐ */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotesBox(true);
                        if (!billingNotes) {
                          setBillingNotes('Kindly Pay To FFCSI');
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                        showNotesBox 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                      }`}
                      title="Add centered plain clear Notes Box under Item / Service Description"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>+ Add Notes Box</span>
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
                            <div className="col-span-5">
                              <input
                                type="text"
                                required
                                placeholder="e.g. Retainers Fee"
                                value={item.description || ''}
                                onChange={e => handleServiceChange(idx, 'description', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-100"
                              />
                            </div>
                            <div className="col-span-3 flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="e.g. May – Jul 2026"
                                value={item.monthYear !== undefined && item.monthYear !== null ? item.monthYear : ''}
                                onChange={e => handleServiceChange(idx, 'monthYear', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-100"
                              />
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
                                  });
                                }}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg shrink-0 cursor-pointer transition-colors"
                                title="Open Multi-Month & Period Coverage Builder (Range, Discrete Months, Quarterly, Annual)"
                              >
                                <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            </div>
                            <div className="col-span-3 flex items-center gap-1.5">
                              <CurrencyInput
                                value={item.amount}
                                onChange={val => handleServiceChange(idx, 'amount', val)}
                                placeholder="1,000,000.00"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-100 min-w-[120px]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveServiceLine(idx)}
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

                          {/* Multi-Month Breakdown indicator */}
                          {(() => {
                            const months = getLineCoveredMonths(item);
                            if (months.length > 1) {
                              const perMo = (Number(item.amount) || 0) / months.length;
                              return (
                                <div className="flex items-center justify-between text-[10px] text-emerald-900 bg-emerald-50/80 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                  <span className="font-semibold flex items-center gap-1">
                                    <CalendarRange className="w-3 h-3 text-emerald-600 shrink-0" />
                                    Covers {months.length} Months ({months.join(', ')}):
                                  </span>
                                  <span className="font-mono font-bold text-emerald-800">
                                    ₱{perMo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month in records
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
                              alert('Note saved to presets library for future SOAs!');
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

      {/* MODAL 2: Record Payment */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Payment Remittance</h3>
                <p className="text-slate-500">{selectedInvoice.invoiceNumber} • {selectedInvoice.clientName}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Total Invoice Amount:</span>
                <span className="font-mono font-semibold">₱{selectedInvoice.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Already Paid:</span>
                <span className="font-mono text-emerald-600 font-semibold">₱{(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Remaining Balance Due:</span>
                <span className="font-mono text-amber-700">₱{(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Payment Amount (₱) *</label>
                <CurrencyInput
                  required
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={val => setPaymentAmount(val)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Individual Payment Method per Billing Item */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Individual Payment Method per Item (Cash or Cheque to FFCSI) *
                </label>
                <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {selectedInvoice.services.map((srv, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs">
                      <div className="flex-1 pr-2">
                        <span className="font-bold text-slate-800 block text-[11px]">{srv.description}</span>
                        <span className="font-mono text-emerald-600 text-[10px] font-bold">₱{srv.amount.toLocaleString()}</span>
                      </div>
                      <select
                        value={servicePaymentMethods[idx] || 'Cash'}
                        onChange={e => setServicePaymentMethods({ ...servicePaymentMethods, [idx]: e.target.value })}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-emerald-100 cursor-pointer"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Cheque Payment to FFCSI">Cheque Payment to FFCSI</option>
                        <option value="Bank Transfer (BDO)">Bank Transfer (BDO Unibank)</option>
                        <option value="Bank Transfer (BPI)">Bank Transfer (BPI)</option>
                        <option value="Bank Transfer (Metrobank)">Bank Transfer (Metrobank)</option>
                        <option value="GCash">GCash</option>
                        <option value="Maya">Maya</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Overall Primary Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="Cash">Cash Collection</option>
                  <option value="Cheque Payment to FFCSI">Cheque Payment to FFCSI</option>
                  <option value="Bank Transfer (BDO)">Bank Transfer (BDO Unibank)</option>
                  <option value="Bank Transfer (BPI)">Bank Transfer (BPI)</option>
                  <option value="Bank Transfer (Metrobank)">Bank Transfer (Metrobank)</option>
                  <option value="GCash">GCash Remittance</option>
                  <option value="Maya">Maya Business</option>
                  <option value="Company Check">Company Check</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-700 font-bold">
                    Collection Receipt No. (C.R.#) - 4 Digits Only *
                  </label>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
                    4-Digits Unique
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. 1001"
                  value={orNumber}
                  onChange={e => {
                    const val = e.target.value;
                    setOrNumber(val);
                    const clean = val.replace(/\D/g, '');
                    if (clean && isCrNumberUsed(clean)) {
                      setCrError(`❌ C.R. # ${clean} has already been used! Next available 4-digit C.R. #: ${getNextCrNumber()}`);
                    } else if (clean && clean.length !== 4) {
                      setCrError('Collection Receipt number MUST be exactly 4 digits (e.g. 1001).');
                    } else {
                      setCrError('');
                    }
                  }}
                  className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:ring-2 ${
                    crError ? 'border-rose-400 focus:ring-rose-100 bg-rose-50/50' : 'border-slate-200 focus:ring-emerald-100'
                  }`}
                />
                {crError ? (
                  <p className="mt-1 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {crError}
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-500">
                    ⚡ Auto-assigned 4-digit unique Collection Receipt. Cannot be reused once recorded.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Payment Notes</label>
                <input
                  type="text"
                  placeholder="Optional reference details"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!crError}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-2xs"
                >
                  Confirm & Generate C.R.
                </button>
              </div>
            </form>
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
                <button
                  onClick={() => downloadInvoicePDF(selectedInvoice)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
                <button 
                  onClick={() => setShowSoaModal(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

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

      {/* MODAL 4: View / Print Collection Receipt (C.R. #) */}
      {showCrModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 text-xs shadow-2xl text-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Official Collection Receipt (FFCSI Format)</h3>
                  <p className="text-slate-500 text-[11px]">Replicated 1:1 Printable Collection Receipt Document</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHardcopySelectedInvoice(selectedInvoice);
                    setShowHardcopyModal(true);
                  }}
                  className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Align and print only items corresponding to parentheses onto hardcopy stationery"
                >
                  <Sliders className="w-4 h-4" /> Print on Hardcopy (Data Only)
                </button>
                <button
                  type="button"
                  onClick={() => downloadCollectionReceiptPDF(selectedInvoice)}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setShowCrModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Exact 1:1 FFCSI Collection Receipt Replicated Document Canvas */}
            <div className="p-6 bg-white border border-slate-300 rounded-2xl space-y-4 font-sans text-slate-900 shadow-inner">
              
              {/* Top Header */}
              <div className="text-center relative pt-1">
                <div className="absolute left-0 top-1 bg-red-700 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-xs tracking-wider">
                  FFCSI
                </div>
                <h1 className="text-lg font-serif italic font-extrabold text-red-700">
                  Family Friends Consultancy Services Inc.
                </h1>
                <p className="text-[11px] text-slate-700 mt-1"># 50-M Aguilar Street, Brgy. Bungad, Quezon City</p>
                <p className="text-[11px] text-slate-700">Tel. No.: (632) 8713-1412</p>
                <p className="text-[11px] text-slate-700">Email Add: ffcsi2019.acctg@gmail.com; ffcsi2018@gmail.com</p>

                <div className="mt-3 font-extrabold text-sm tracking-widest uppercase border-t-2 border-b-2 border-slate-900 py-1 inline-block px-8">
                  COLLECTION RECEIPT
                </div>
                <span className="absolute right-0 top-11 text-sm font-bold text-slate-900">
                  {selectedInvoice.collectionReceiptNumber || selectedInvoice.officialReceiptNumber || '35428'}
                </span>
              </div>

              {/* Client Info Lines */}
              <div className="grid grid-cols-12 gap-y-2 text-xs font-bold pt-2">
                <div className="col-span-8 flex items-baseline gap-1.5">
                  <span className="shrink-0 text-slate-800">CLIENT :</span>
                  <span className="border-b border-slate-800 flex-1 px-1 font-bold text-slate-900">
                    {selectedInvoice.clientName}
                  </span>
                </div>
                <div className="col-span-4 text-right flex items-center justify-end gap-1">
                  <span className="text-slate-800">No.</span>
                  <span className="text-red-600 font-extrabold">
                    : {selectedInvoice.collectionReceiptNumber || selectedInvoice.officialReceiptNumber || '35428'}
                  </span>
                </div>

                <div className="col-span-8 flex items-baseline gap-1.5">
                  <span className="shrink-0 text-slate-800">Address :</span>
                  <span className="border-b border-slate-800 flex-1 px-1 font-bold text-slate-900">
                    Gen. Aguinaldo Hi-Way Panapaan V, Bacoor City
                  </span>
                </div>
                <div className="col-span-4 text-right flex items-center justify-end gap-1">
                  <span className="text-slate-800">Date</span>
                  <span className="text-slate-900">: {selectedInvoice.paymentDate || selectedInvoice.issueDate}</span>
                </div>
              </div>

              {/* Particulars & Amount Table Frame */}
              <div className="border-2 border-slate-900 text-xs mt-3">
                <div className="grid grid-cols-12 border-b-2 border-slate-900 font-extrabold bg-slate-50 py-1.5 px-2 text-center text-xs">
                  <div className="col-span-8 border-r-2 border-slate-900">PARTICULARS</div>
                  <div className="col-span-4">AMOUNT</div>
                </div>
                <div className="p-3 space-y-2 min-h-[140px]">
                  <p className="font-bold text-xs text-slate-900">Payment for the following:</p>
                  {selectedInvoice.services && selectedInvoice.services.length > 0 ? (
                    selectedInvoice.services.map((srv, idx) => (
                      <div key={idx} className="grid grid-cols-12 text-xs font-bold pl-3">
                        <div className="col-span-8 text-slate-900">{srv.description} {srv.monthYear ? `— ${srv.monthYear}` : ''}</div>
                        <div className="col-span-4 text-right font-mono text-slate-900">{srv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="grid grid-cols-12 text-xs font-bold pl-3">
                        <div className="col-span-8">W/Holding Tax ... for 2nd Qtr. 2026</div>
                        <div className="col-span-4 text-right font-mono">242.21</div>
                      </div>
                      <div className="grid grid-cols-12 text-xs font-bold pl-3">
                        <div className="col-span-8">Retainer's Fee for July 2026</div>
                        <div className="col-span-4 text-right font-mono">4,500.00</div>
                      </div>
                      <div className="grid grid-cols-12 text-xs font-bold pl-3">
                        <div className="col-span-8">Sales Tax</div>
                        <div className="col-span-4 text-right font-mono">0.00</div>
                      </div>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-12 border-t-2 border-slate-900 font-bold p-2.5 bg-slate-50 items-center">
                  <div className="col-span-8 text-right pr-6 text-sm font-extrabold text-slate-900">TOTAL   ₱</div>
                  <div className="col-span-4 text-right text-sm font-extrabold text-slate-900 font-mono">
                    PHP {(selectedInvoice.paidAmount || selectedInvoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Footer 3 Columns */}
              <div className="border-2 border-slate-900 p-3 grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1.5 font-bold text-slate-900">
                  <p>CHECK   : <span className="border-b border-slate-800 inline-block w-24"></span></p>
                  <p>DATE      : <span className="border-b border-slate-800 inline-block w-24"></span></p>
                  <p>PREPARED BY : <span className="underline">Maricris</span></p>
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

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCrModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Close
              </button>
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
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Audit Trail Enforcement:
                </p>
                <p className="mt-0.5">Assigned staff can modify line items, but all modifications are permanently logged in an <strong>Amended History</strong> trail.</p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-2">Itemized Services & Deliverables</label>
                
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-700 px-1 mb-1">
                  <div className="col-span-5">Item / Service Description</div>
                  <div className="col-span-4">Month and Year</div>
                  <div className="col-span-3">Amount (PHP)</div>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editServices.map((s, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/80 p-1.5 border border-slate-200 rounded-xl">
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          value={s.description || ''}
                          onChange={e => {
                            const updated = [...editServices];
                            updated[idx].description = e.target.value;
                            setEditServices(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium"
                        />
                      </div>
                      <div className="col-span-4 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="e.g. August 2026"
                          value={s.monthYear !== undefined && s.monthYear !== null ? s.monthYear : ''}
                          onChange={e => {
                            const updated = [...editServices];
                            updated[idx].monthYear = e.target.value;
                            setEditServices(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium"
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
                      setShowEditNotesBox(true);
                      if (!editBillingNotes) {
                        setEditBillingNotes('Kindly Pay To FFCSI');
                      }
                    }}
                    className={`text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      showEditNotesBox ? 'text-emerald-800' : 'text-emerald-600 hover:text-emerald-800'
                    }`}
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" /> + Add Notes Box
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
                              alert('Note saved to presets library!');
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs"
                >
                  Save & Log Amendment
                </button>
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
                                    const reason = prompt(`Enter cancellation reason for payment of ₱${pmt.amount.toLocaleString()}:`);
                                    if (reason && reason.trim()) {
                                      const res = cancelInvoicePayment(pmt.id, reason.trim(), currentUser?.id, currentUser?.fullName);
                                      alert(res.message);
                                    }
                                  }}
                                  className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded text-[10px] border border-rose-200"
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
          onApply={(periodText, newAmount, coveredMonths, monthlyRate) => {
            if (periodCoverageModal.targetList === 'custom') {
              setCustomItemPeriod(periodText);
              if (newAmount !== undefined) {
                setCustomItemAmount(newAmount);
              }
            } else if (periodCoverageModal.targetList === 'edit') {
              const updated = [...editServices];
              if (updated[periodCoverageModal.itemIndex]) {
                updated[periodCoverageModal.itemIndex] = {
                  ...updated[periodCoverageModal.itemIndex],
                  monthYear: periodText,
                  amount: newAmount !== undefined ? newAmount : updated[periodCoverageModal.itemIndex].amount,
                  coveredMonths: coveredMonths,
                  monthlyRate: monthlyRate
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
                  monthlyRate: monthlyRate
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
              }
            }
          }}
        />
      )}

      {/* MODAL: Hardcopy Receipt Alignment & Print Engine ⭐ */}
      {showHardcopyModal && hardcopySelectedInvoice && (
        <HardcopyReceiptModal
          invoice={hardcopySelectedInvoice}
          clientAddress={
            clients.find(c => c.id === hardcopySelectedInvoice.clientId)?.address || 
            (hardcopySelectedInvoice as any).clientAddress ||
            'Gen. Aguinaldo Hi-Way Panapaan V, Bacoor City'
          }
          defaultPreparedBy={currentUser?.name || 'Maricris'}
          onClose={() => setShowHardcopyModal(false)}
        />
      )}

    </div>
  );
};

