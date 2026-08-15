import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ComplianceItem, CustomDeadlineRule, PaymentBehavior, FilingRequired, SubmissionMethod, ComplianceCategory } from '../types';
import { 
  MONTHS_LIST, 
  MONTH_FULL_NAMES, 
  MONTH_INDEX 
} from '../data/masterTables';
import { calculateClientDeadline, formatDeadlinePretty, isPayableObligation, getPaymentBehavior, getComplianceCategory, getSubmissionMethod, getFilingRequired } from '../utils/deadlineEngine';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  Building2, 
  Search, 
  AlertCircle,
  FileCheck2,
  Check,
  X,
  User,
  Users,
  Filter,
  Layers,
  Zap,
  Kanban,
  Columns,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Lock,
  ArrowUpDown,
  Sparkles,
  MapPin,
  MessageSquare
} from 'lucide-react';

export const ComplianceMonitoringView: React.FC = () => {
  const { complianceItems, payables, clients, masterChoices, updateComplianceStatus, addComplianceItem, cancelPayablePayment, deletePayable, resetPayableAssessment } = useData();
  const { isSuperAdmin } = useAuth();

  // Get current calendar month (e.g. 'Aug') and year
  const currentMonthCode = (MONTHS_LIST[new Date().getMonth()] || 'Aug') as ('Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec');
  const currentYearNum = new Date().getFullYear();

  // Controls & Filters (Default to current real month and year)
  const [selectedMonth, setSelectedMonth] = useState<('Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec')>(currentMonthCode);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [clientStatusTab, setClientStatusTab] = useState<'ALL' | 'Active' | 'For Compliance'>('ALL');
  const [filerTypeFilter, setFilerTypeFilter] = useState<'ALL' | 'Manual' | 'eFPS'>('ALL');
  const [deadlineSortOrder, setDeadlineSortOrder] = useState<'DateAsc' | 'ClientAsc'>('DateAsc');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GroupedByDate' | 'Kanban' | 'AllCards'>('Kanban');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Done'>('ALL');
  const [showEnrolledClientsModal, setShowEnrolledClientsModal] = useState(false);
  const [enrolledSearchQuery, setEnrolledSearchQuery] = useState('');

  // Revert Modal State & Toast Notifications
  const [revertModalOpen, setRevertModalOpen] = useState(false);
  const [itemToRevert, setItemToRevert] = useState<CompiledClientDeadline | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Revert form choice / reset item back to Action Pending in To-Do list
  const handleCancelFormChoice = (item: CompiledClientDeadline) => {
    if (item.status === 'Already Paid' && !isSuperAdmin) {
      setToastMessage(`Only Admin users are allowed to revert Settled & Paid items back to pending.`);
      setTimeout(() => setToastMessage(null), 4500);
      return;
    }
    setItemToRevert(item);
    setRevertModalOpen(true);
  };

  const confirmRevertToPending = () => {
    if (!itemToRevert) return;
    if (itemToRevert.status === 'Already Paid' && !isSuperAdmin) {
      setToastMessage(`Only Admin users are allowed to revert Settled & Paid items back to pending.`);
      setTimeout(() => setToastMessage(null), 4500);
      setRevertModalOpen(false);
      setItemToRevert(null);
      return;
    }
    resetPayableAssessment(itemToRevert.clientId, itemToRevert.ruleCode);
    setRevertModalOpen(false);
    
    // Show toast message confirmation
    setToastMessage(`Filing status for ${itemToRevert.clientName} (${itemToRevert.ruleCode}) has been successfully reverted to Action Pending.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    setItemToRevert(null);
  };

  // Helper to format YYYY-MM-DD into "July 10, 2026"
  const formatDatePretty = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    
    const mName = MONTHS_LIST[mIdx] ? MONTH_FULL_NAMES[MONTHS_LIST[mIdx]] : `Month ${mIdx + 1}`;
    return `${mName} ${d}, ${y}`;
  };

  // 1. Clients belonging to current Active vs For Compliance vs ALL tab
  const allNonArchivedClients = clients.filter(c => c.status !== 'Archived');
  const activeClientsList = clients.filter(c => c.status === 'Active');
  const forComplianceClientsList = clients.filter(c => c.status === 'For Compliance');

  const currentTabClients = clients.filter(c => {
    if (c.status === 'Archived') return false;
    if (clientStatusTab === 'Active') return c.status === 'Active';
    if (clientStatusTab === 'For Compliance') return c.status === 'For Compliance';
    return true; // 'ALL'
  });

  const manualClientsCount = currentTabClients.filter(c => (c.registrationMethod || 'Manual') === 'Manual').length;
  const efpsClientsCount = currentTabClients.filter(c => c.registrationMethod === 'eFPS').length;

  // Filter matching clients based on status tab, filer type (Manual vs eFPS), and search
  const activeMatchingClients = currentTabClients.filter(c => {
    const regMethod = c.registrationMethod || 'Manual';
    if (filerTypeFilter === 'Manual' && regMethod !== 'Manual') return false;
    if (filerTypeFilter === 'eFPS' && regMethod !== 'eFPS') return false;

    if (!(searchQuery || '').trim()) return true;

    const q = (searchQuery || '').toLowerCase();
    return (
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.tradeName || '').toLowerCase().includes(q) ||
      (c.tinNumber || '').toLowerCase().includes(q)
    );
  });

  // 2. Combine Master BIR & Benefits Rules
  const allMasterRules: CustomDeadlineRule[] = [
    ...(masterChoices.birTaxOptions || []),
    ...(masterChoices.benefitsOptions || [])
  ];

  // 3. Compile list of client deadlines for the selected month and year based on Master Table / Deadline Picker rules
  interface CompiledClientDeadline {
    id: string;
    clientId: string;
    clientName: string;
    tinNumber: string;
    ruleCode: string;
    ruleName: string;
    category: 'BIR' | 'Benefits' | 'DTI' | 'SEC' | 'Other';
    frequency: string;
    dueDate: string; // YYYY-MM-DD
    formattedDateStr: string; // e.g. July 10, 2026
    periodLabel: string;
    status: 'Pending' | 'For Payment' | 'Due Today' | 'Overdue' | 'Already Paid';
    assessmentTag?: 'Assessed - For Payment' | 'Assessed - Excess Input Tax' | 'Assessed - Zero Return / No Payment' | 'Done Filing' | 'Already Paid' | 'Pending' | 'Due Today' | 'Overdue';
    isUnenrolledForm?: boolean;
    assignedStaffName: string;
    isBranch?: boolean;
    branchCode?: string;
    parentClientName?: string;
    baseTin?: string;
    amountDue?: number;
    payableAmount?: number;
    paidDate?: string;
    existingCompItemId?: string;
    accountingPeriod?: 'Calendar' | 'Fiscal';
    fiscalYearEndMonth?: string;
    registrationMethod?: 'Manual' | 'eFPS';
    rdoNumber?: string;
    wasShifted?: boolean;
    holidayAdjustment?: any;
    extensionOverride?: any;
    deadlineSource?: string;
    paymentBehavior?: PaymentBehavior;
    filingRequired?: FilingRequired;
    submissionMethod?: SubmissionMethod;
    complianceCategory?: ComplianceCategory;
    notes?: string;
    remarks?: string;
    comment?: string;
  }

  const compiledDeadlines: CompiledClientDeadline[] = [];

  activeMatchingClients.forEach(client => {
    allMasterRules.forEach(rule => {
      // Category filter check
      if (categoryFilter !== 'ALL' && rule.category !== categoryFilter) return;

      // Check if client is currently enrolled in this rule
      const isBir = rule.category === 'BIR';
      const hasBir = isBir && (client.birTaxServices || []).some(s => s.toLowerCase() === rule.code.toLowerCase());
      const hasBen = !isBir && (client.benefitsServices || []).some(s => s.toLowerCase().includes(rule.code.toLowerCase()) || rule.code.toLowerCase().includes(s.toLowerCase()));

      // Centralized Client-Based Deadline Engine Calculation
      const deadlineInfo = calculateClientDeadline({
        client,
        rule,
        month: selectedMonth,
        year: selectedYear,
        masterChoices
      });

      if (deadlineInfo && !deadlineInfo.isNotRequired && deadlineInfo.finalDeadline !== 'N/A') {
        const cleanRuleCode = rule.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const cleanRuleName = rule.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        // Check if there's an existing compliance item in DataContext state
        const existing = complianceItems.find(ci => {
          if (ci.clientId !== client.id) return false;
          const cleanTitle = ci.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const isNameMatch = cleanTitle.includes(cleanRuleCode) || cleanRuleCode.includes(cleanTitle) || (cleanRuleName.length > 3 && cleanTitle.includes(cleanRuleName));
          const isDateMatch = ci.dueDate === deadlineInfo.finalDeadline || ci.dueDate.startsWith(`${selectedYear}-${String(MONTH_INDEX[selectedMonth] + 1).padStart(2, '0')}`);
          return isNameMatch && isDateMatch;
        });

        // Check if there is a matching payable record created/tagged in BIR/Benefits Payables
        const matchedPayable = payables.find(p => {
          if (p.clientId !== client.id) return false;
          const cleanItemName = p.itemName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const isNameMatch = cleanItemName.includes(cleanRuleCode) || cleanRuleCode.includes(cleanItemName);
          const isMonthMatch = p.month.toLowerCase().includes(selectedMonth.toLowerCase()) || p.month.includes(`${selectedYear}`);
          return isNameMatch && isMonthMatch;
        });

        const isHistoricalAssessed = Boolean(existing || matchedPayable);

        // Include item if client is enrolled OR if a historical/assessed compliance record exists
        if (hasBir || hasBen || isHistoricalAssessed) {
          const isUnenrolledForm = !(hasBir || hasBen);
          const recordedAmount = matchedPayable ? matchedPayable.payableAmount : existing?.amountDue;

          const isTagAsPaidInPayables = matchedPayable?.status === 'Paid';
          const isPayableUnpaid = matchedPayable?.status === 'Unpaid';
          const isNoPayment = matchedPayable?.status === 'No Payment';
          const isNeverPayableRule = rule.paymentBehavior === 'NEVER_PAYABLE' || !isPayableObligation(rule.code);
          const isExcessInput = recordedAmount !== undefined && recordedAmount !== null && recordedAmount < 0;

          let calculatedStatus: CompiledClientDeadline['status'] = 'Pending';
          let assessmentTag: CompiledClientDeadline['assessmentTag'] = 'Pending';

          if (isTagAsPaidInPayables) {
            calculatedStatus = 'Already Paid';
            assessmentTag = isNeverPayableRule ? 'Done Filing' : 'Already Paid';
          } else if (isExcessInput) {
            calculatedStatus = 'Already Paid';
            assessmentTag = 'Assessed - Excess Input Tax';
          } else if (isNoPayment) {
            calculatedStatus = 'Already Paid';
            assessmentTag = 'Assessed - Zero Return / No Payment';
          } else if (existing?.status === 'Already Paid' && !isPayableUnpaid) {
            calculatedStatus = 'Already Paid';
            assessmentTag = isNeverPayableRule ? 'Done Filing' : 'Already Paid';
          } else {
            const todayStr = new Date().toISOString().substring(0, 10);
            if (deadlineInfo.finalDeadline === todayStr) {
              calculatedStatus = 'Due Today';
              assessmentTag = 'Due Today';
            } else if (deadlineInfo.finalDeadline < todayStr) {
              calculatedStatus = 'Overdue';
              assessmentTag = 'Overdue';
            } else if (
              existing?.status === 'For Payment' || 
              isPayableUnpaid || 
              (recordedAmount !== undefined && recordedAmount !== null && recordedAmount > 0)
            ) {
              calculatedStatus = 'For Payment';
              assessmentTag = 'Assessed - For Payment';
            } else {
              calculatedStatus = (existing?.status && existing.status !== 'Already Paid') ? existing.status : 'Pending';
              assessmentTag = 'Pending';
            }
          }

          compiledDeadlines.push({
            id: existing?.id || `compiled_${client.id}_${rule.code}_${selectedMonth}_${selectedYear}`,
            clientId: client.id,
            clientName: client.companyName,
            tinNumber: client.tinNumber,
            ruleCode: rule.code,
            ruleName: rule.name,
            category: rule.category,
            frequency: rule.frequency || 'Monthly',
            dueDate: deadlineInfo.finalDeadline,
            formattedDateStr: formatDeadlinePretty(deadlineInfo.finalDeadline),
            periodLabel: deadlineInfo.taxablePeriod,
            status: calculatedStatus,
            assessmentTag,
            isUnenrolledForm,
            assignedStaffName: client.assignedStaffName || 'Unassigned',
            isBranch: client.isBranch,
            branchCode: client.branchCode,
            parentClientName: client.parentClientName,
            baseTin: client.baseTin,
            amountDue: recordedAmount,
            payableAmount: recordedAmount,
            paidDate: existing?.paidDate || matchedPayable?.paymentDetails?.paidDate,
            existingCompItemId: existing?.id,
            accountingPeriod: client.accountingPeriod,
            fiscalYearEndMonth: client.fiscalYearEndMonth,
            registrationMethod: client.registrationMethod || 'Manual',
            rdoNumber: client.rdoNumber,
            wasShifted: deadlineInfo.wasShifted,
            holidayAdjustment: deadlineInfo.holidayAdjustment,
            extensionOverride: deadlineInfo.appliedExtensionTitle || deadlineInfo.overrideDeadline,
            deadlineSource: deadlineInfo.deadlineSource,
            paymentBehavior: rule.paymentBehavior || getPaymentBehavior(rule.code, rule),
            filingRequired: rule.filingRequired || getFilingRequired(rule.code, rule),
            submissionMethod: rule.submissionMethod || getSubmissionMethod(rule.code, rule),
            complianceCategory: rule.complianceCategory || getComplianceCategory(rule.code, rule),
            notes: matchedPayable?.notes || matchedPayable?.remarks || matchedPayable?.comment || existing?.remarks || existing?.notes,
            remarks: matchedPayable?.remarks || matchedPayable?.notes || matchedPayable?.comment || existing?.remarks || existing?.notes,
            comment: matchedPayable?.comment || matchedPayable?.notes || matchedPayable?.remarks || existing?.remarks || existing?.notes
          });
        }
      }
    });
  });

  // 1. Initial filter by search query (client name, form code, rule name, date)
  const searchFilteredDeadlines = compiledDeadlines.filter(item => {
    if (!(searchQuery || '').trim()) return true;
    const q = (searchQuery || '').toLowerCase();
    return (
      (item.clientName || '').toLowerCase().includes(q) ||
      (item.ruleCode || '').toLowerCase().includes(q) ||
      (item.ruleName || '').toLowerCase().includes(q) ||
      (item.formattedDateStr || '').toLowerCase().includes(q)
    );
  });

  // Summary counts for selected month
  const totalDeadlines = searchFilteredDeadlines.length;
  const settledCount = searchFilteredDeadlines.filter(d => d.status === 'Already Paid').length;
  const pendingCount = totalDeadlines - settledCount;
  const uniqueClientsCount = new Set(searchFilteredDeadlines.map(d => d.clientId)).size;

  // Derived unique enrolled clients in current selected month/year schedule
  const enrolledClientWorkspaces = React.useMemo(() => {
    const clientMap = new Map<string, {
      client: typeof clients[0];
      deadlinesCount: number;
      settledCount: number;
      pendingCount: number;
    }>();

    searchFilteredDeadlines.forEach(item => {
      if (!clientMap.has(item.clientId)) {
        const clientObj = clients.find(c => c.id === item.clientId);
        if (clientObj) {
          clientMap.set(item.clientId, {
            client: clientObj,
            deadlinesCount: 0,
            settledCount: 0,
            pendingCount: 0
          });
        }
      }

      const entry = clientMap.get(item.clientId);
      if (entry) {
        entry.deadlinesCount++;
        if (item.status === 'Already Paid') {
          entry.settledCount++;
        } else {
          entry.pendingCount++;
        }
      }
    });

    return Array.from(clientMap.values());
  }, [searchFilteredDeadlines, clients]);

  // Filter searchFilteredDeadlines by statusFilter
  const statusFilteredDeadlines = searchFilteredDeadlines.filter(item => {
    if (statusFilter === 'Pending') {
      return item.status !== 'Already Paid';
    }
    if (statusFilter === 'Done') {
      return item.status === 'Already Paid';
    }
    return true;
  });

  // Sort deadlines by deadlineSortOrder
  const filteredDeadlines = [...statusFilteredDeadlines].sort((a, b) => {
    if (deadlineSortOrder === 'ClientAsc') {
      return a.clientName.localeCompare(b.clientName);
    }
    return a.dueDate.localeCompare(b.dueDate);
  });

  // Group compiled deadlines by Due Date
  const groupedByDateMap: Record<string, CompiledClientDeadline[]> = {};
  filteredDeadlines.forEach(item => {
    if (!groupedByDateMap[item.dueDate]) {
      groupedByDateMap[item.dueDate] = [];
    }
    groupedByDateMap[item.dueDate].push(item);
  });

  // Sorted list of due dates
  const sortedDueDates = Object.keys(groupedByDateMap).sort();

  // Helper function to count pending deadlines for a given client set in current month/year
  const getPendingCountForClients = (clientList: typeof clients) => {
    let pending = 0;
    clientList.forEach(client => {
      allMasterRules.forEach(rule => {
        const isBir = rule.category === 'BIR';
        const hasBir = isBir && (client.birTaxServices || []).some(s => s.toLowerCase() === rule.code.toLowerCase());
        const hasBen = !isBir && (client.benefitsServices || []).some(s => s.toLowerCase().includes(rule.code.toLowerCase()) || rule.code.toLowerCase().includes(s.toLowerCase()));

        if (hasBir || hasBen) {
          const deadlineInfo = calculateClientDeadline({
            client,
            rule,
            month: selectedMonth,
            year: selectedYear,
            masterChoices
          });
          if (deadlineInfo && !deadlineInfo.isNotRequired && deadlineInfo.finalDeadline !== 'N/A') {
            const cleanRuleCode = rule.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const cleanRuleName = rule.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

            const existing = complianceItems.find(ci => {
              if (ci.clientId !== client.id) return false;
              const cleanTitle = ci.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              const isNameMatch = cleanTitle.includes(cleanRuleCode) || cleanRuleCode.includes(cleanTitle) || (cleanRuleName.length > 3 && cleanTitle.includes(cleanRuleName));
              const isDateMatch = ci.dueDate === deadlineInfo.finalDeadline || ci.dueDate.startsWith(`${selectedYear}-${String(MONTH_INDEX[selectedMonth] + 1).padStart(2, '0')}`);
              return isNameMatch && isDateMatch;
            });

            const matchedPayable = payables.find(p => {
              if (p.clientId !== client.id) return false;
              const cleanItemName = p.itemName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              const isNameMatch = cleanItemName.includes(cleanRuleCode) || cleanRuleCode.includes(cleanItemName);
              const isMonthMatch = p.month.toLowerCase().includes(selectedMonth.toLowerCase()) || p.month.includes(`${selectedYear}`);
              return isNameMatch && isMonthMatch;
            });

            const isPaid = (matchedPayable?.status === 'Paid') ||
                           (matchedPayable?.status === 'No Payment') ||
                           (matchedPayable?.payableAmount !== undefined && matchedPayable?.payableAmount <= 0) ||
                           (existing?.status === 'Already Paid' && matchedPayable?.status !== 'Unpaid');
            if (!isPaid) {
              pending++;
            }
          }
        }
      });
    });
    return pending;
  };

  const allPendingCount = React.useMemo(() => getPendingCountForClients(allNonArchivedClients), [clients, complianceItems, payables, selectedMonth, selectedYear, masterChoices]);
  const activePendingCount = React.useMemo(() => getPendingCountForClients(activeClientsList), [clients, complianceItems, payables, selectedMonth, selectedYear, masterChoices]);
  const forCompliancePendingCount = React.useMemo(() => getPendingCountForClients(forComplianceClientsList), [clients, complianceItems, payables, selectedMonth, selectedYear, masterChoices]);

  // Toggle status handler for an item
  const handleToggleStatus = (item: CompiledClientDeadline) => {
    const newStatus = item.status === 'Already Paid' ? 'Pending' : 'Already Paid';
    if (item.existingCompItemId) {
      updateComplianceStatus(item.existingCompItemId, newStatus);
    } else {
      addComplianceItem({
        clientId: item.clientId,
        clientName: item.clientName,
        title: `${item.ruleCode} - ${item.ruleName}`,
        category: item.category,
        dueDate: item.dueDate,
        status: newStatus,
        paidDate: newStatus === 'Already Paid' ? new Date().toISOString().substring(0, 10) : undefined,
        assignedStaffName: item.assignedStaffName,
        description: `Applicable Period: ${item.periodLabel}`
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
            Deadline Monitoring & Compliance Schedule
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Incoming filing deadlines for BIR returns, statutory remittances (SSS, PhilHealth, Pag-IBIG), SEC & DTI grouped by date based on the Deadline Picker rules.
          </p>
        </div>
      </div>

      {/* Month & Year Selection Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Target Period Schedule
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                Incoming Deadlines for {MONTH_FULL_NAMES[selectedMonth]} {selectedYear}
              </h3>

              {/* Client Status Dropdown (Default: ALL) */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
                <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <label htmlFor="clientStatusSelect" className="font-bold text-slate-600 shrink-0">Clients:</label>
                <select
                  id="clientStatusSelect"
                  value={clientStatusTab}
                  onChange={e => setClientStatusTab(e.target.value as 'ALL' | 'Active' | 'For Compliance')}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All ({allNonArchivedClients.length}) • {allPendingCount} Pending</option>
                  <option value="Active">Active Clients ({activeClientsList.length}) • {activePendingCount} Pending</option>
                  <option value="For Compliance">For Compliance ({forComplianceClientsList.length}) • {forCompliancePendingCount} Pending</option>
                </select>
              </div>

              {/* Filer Method Dropdown (Default: ALL) */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <label htmlFor="filerTypeSelect" className="font-bold text-slate-600 shrink-0">Filer:</label>
                <select
                  id="filerTypeSelect"
                  value={filerTypeFilter}
                  onChange={e => setFilerTypeFilter(e.target.value as 'ALL' | 'Manual' | 'eFPS')}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Filers</option>
                  <option value="Manual">Manual Filer ({manualClientsCount})</option>
                  <option value="eFPS">eFPS Filer ({efpsClientsCount})</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Month Selector Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <label className="font-bold text-slate-600">Month:</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {MONTHS_LIST.map(m => (
                  <option key={m} value={m}>{MONTH_FULL_NAMES[m]} ({m})</option>
                ))}
              </select>
            </div>

            {/* Year Selector Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <label className="font-bold text-slate-600">Year:</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search client or form (1601C, 2550Q)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Category Filter Dropdown */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="BIR">BIR Tax Returns</option>
              <option value="Benefits">Statutory Benefits (SSS/PhilHealth/Pag-IBIG)</option>
            </select>
          </div>

          {/* View Mode & Sort By Selector Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Dropdown (Default: Kanban Board) */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <Kanban className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <label htmlFor="viewModeSelect" className="text-slate-600 shrink-0">View Layout:</label>
              <select
                id="viewModeSelect"
                value={viewMode}
                onChange={e => {
                  const mode = e.target.value as 'Kanban' | 'GroupedByDate' | 'AllCards';
                  setViewMode(mode);
                  if (mode === 'Kanban') {
                    setSelectedMonth(currentMonthCode);
                  }
                }}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="Kanban">Kanban Board</option>
                <option value="GroupedByDate">Grouped by Date</option>
                <option value="AllCards">All Deadline Cards ({filteredDeadlines.length})</option>
              </select>
            </div>

            {/* Sort By Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <label htmlFor="deadlineSortSelect" className="text-slate-600 shrink-0">Sort By:</label>
              <select
                id="deadlineSortSelect"
                value={deadlineSortOrder}
                onChange={e => setDeadlineSortOrder(e.target.value as any)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="DateAsc">Due Date (Earliest First)</option>
                <option value="ClientAsc">Client Name (A - Z)</option>
              </select>
            </div>
          </div>

        </div>

      </div>

      {/* Summary KPI Banner for Month */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Total Client Deadlines */}
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`text-left bg-white border p-4 rounded-2xl shadow-2xs space-y-1 transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'ring-2 ring-indigo-500 border-indigo-300'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Client Deadlines</p>
            {statusFilter === 'ALL' && (
              <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.5 rounded-full font-bold">All</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalDeadlines}</span>
            <span className="text-xs text-slate-500 font-medium">items for {selectedMonth} {selectedYear}</span>
          </div>
        </button>

        {/* 2. Already Paid / Settled */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('Done');
          }}
          className={`text-left bg-white border p-4 rounded-2xl shadow-2xs space-y-1 transition-all cursor-pointer ${
            statusFilter === 'Done'
              ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/40'
              : 'border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-300 hover:bg-emerald-50/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Already Paid / Settled</p>
            {statusFilter === 'Done' && (
              <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">Active Filter</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{settledCount}</span>
            <span className="text-xs text-emerald-600 font-semibold">({totalDeadlines > 0 ? Math.round((settledCount/totalDeadlines)*100) : 0}%)</span>
          </div>
        </button>

        {/* 3. Pending / Action Needed */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('Pending');
          }}
          className={`text-left bg-white border p-4 rounded-2xl shadow-2xs space-y-1 transition-all cursor-pointer ${
            statusFilter === 'Pending'
              ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/40'
              : 'border-amber-200/80 bg-amber-50/20 hover:border-amber-300 hover:bg-amber-50/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending / Action Needed</p>
            {statusFilter === 'Pending' && (
              <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-bold">Active Filter</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-800">{pendingCount}</span>
            <span className="text-xs text-amber-700 font-medium">due for filing</span>
          </div>
        </button>

        {/* 4. Enrolled Clients */}
        <button
          type="button"
          onClick={() => {
            setEnrolledSearchQuery('');
            setShowEnrolledClientsModal(true);
          }}
          className="text-left bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1 transition-all cursor-pointer hover:border-indigo-400 hover:ring-2 hover:ring-indigo-500/20 hover:bg-indigo-50/20 group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-700 transition-colors">Enrolled Clients</p>
            <span className="text-[9px] bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded-full font-bold transition-all">
              View Workspaces →
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{uniqueClientsCount}</span>
            <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600 transition-colors">active workspace(s)</span>
          </div>
        </button>
      </div>

      {/* Active Filter Indicator Banner */}
      {statusFilter !== 'ALL' && (
        <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-950 font-medium">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Filtering schedule by <strong>{statusFilter === 'Pending' ? 'Pending / Action Needed' : 'Already Paid / Settled'}</strong> status: showing <strong>{filteredDeadlines.length}</strong> of {totalDeadlines} compliance items.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            Show All Deadlines ({totalDeadlines})
          </button>
        </div>
      )}

      {/* VIEW MODE 0: KANBAN BOARD VIEW */}
      {viewMode === 'Kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {[
            { 
              id: 'Pending' as const, 
              label: 'Action Pending', 
              subtitle: 'Scheduled filings',
              dotColor: 'bg-amber-500', 
              headerBg: 'bg-amber-50 border-amber-200 text-amber-900',
              badgeBg: 'bg-amber-100 text-amber-800'
            },
            { 
              id: 'For Payment' as const, 
              label: 'For Payment', 
              subtitle: 'Assessed amount ready for payment',
              dotColor: 'bg-indigo-600', 
              headerBg: 'bg-indigo-50 border-indigo-200 text-indigo-900',
              badgeBg: 'bg-indigo-100 text-indigo-800'
            },
            { 
              id: 'Due Today' as const, 
              label: 'Due Today', 
              subtitle: 'Requires immediate action',
              dotColor: 'bg-rose-500', 
              headerBg: 'bg-rose-50 border-rose-200 text-rose-900',
              badgeBg: 'bg-rose-100 text-rose-800'
            },
            { 
              id: 'Overdue' as const, 
              label: 'Overdue Filings', 
              subtitle: 'Passed statutory due date',
              dotColor: 'bg-red-600', 
              headerBg: 'bg-red-50 border-red-200 text-red-900',
              badgeBg: 'bg-red-100 text-red-800'
            },
            { 
              id: 'Already Paid' as const, 
              label: 'Settled & Paid', 
              subtitle: 'Completed compliance items',
              dotColor: 'bg-emerald-600', 
              headerBg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
              badgeBg: 'bg-emerald-100 text-emerald-800'
            },
          ].map(col => {
            const colItems = filteredDeadlines.filter(item => {
              if (col.id === 'Pending') {
                return item.status === 'Pending' && (!item.payableAmount || item.payableAmount <= 0);
              }
              if (col.id === 'For Payment') {
                return item.status === 'For Payment' || (item.status === 'Pending' && !!item.payableAmount && item.payableAmount > 0);
              }
              return item.status === col.id;
            });

            return (
              <div key={col.id} className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3 space-y-3 min-h-[500px]">
                
                {/* Column Header */}
                <div className={`p-3 rounded-xl border flex items-center justify-between shadow-2xs ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                    <div>
                      <h3 className="font-extrabold text-xs uppercase tracking-wider">{col.label}</h3>
                      <p className="text-[10px] text-slate-500 font-medium">{col.subtitle}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 font-bold font-mono text-xs rounded-full border ${col.badgeBg}`}>
                    {colItems.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3">
                  {colItems.map((item, itemIdx) => (
                    <div
                      key={`${col.id}_${item.id}_${itemIdx}`}
                      className={`p-3.5 rounded-xl border shadow-2xs transition-all space-y-2.5 bg-white flex flex-col justify-between ${
                        item.status === 'Already Paid'
                          ? 'border-emerald-200/90 hover:border-emerald-300 bg-emerald-50/20'
                          : item.status === 'For Payment'
                          ? 'border-indigo-300 ring-1 ring-indigo-200/60 bg-indigo-50/20'
                          : item.status === 'Due Today'
                          ? 'border-rose-300 ring-1 ring-rose-200/60 bg-rose-50/20'
                          : item.status === 'Overdue'
                          ? 'border-red-300 ring-1 ring-red-200/60 bg-red-50/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* 1. Company Name & Branch / Unenrolled Tag */}
                      <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-100">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug break-words" title={item.clientName}>
                              {item.clientName}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1">
                              {item.isBranch ? (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-100 text-purple-800 shrink-0 w-max">
                                  Branch ({item.branchCode || '001'})
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[8px] font-bold bg-indigo-50 text-indigo-700 shrink-0 w-max">
                                  Main Office
                                </span>
                              )}
                              {item.accountingPeriod === 'Fiscal' && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-100 text-purple-800 shrink-0 w-max" title={`Fiscal Year Ends in ${item.fiscalYearEndMonth || 'June'}`}>
                                  Fiscal ({item.fiscalYearEndMonth || 'June'})
                                </span>
                              )}
                              {item.isUnenrolledForm && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-200 text-slate-700 border border-slate-300 shrink-0 w-max" title="This tax/benefit form was unenrolled from client settings, but historical record is preserved.">
                                  [{item.category === 'BIR' ? 'Unenrolled Tax Form' : 'Unenrolled Benefit'}]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          item.category === 'BIR' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.category}
                        </span>
                      </div>

                      {/* 2. Form & Applicable Period Code */}
                      <div className="bg-slate-50/90 p-2 rounded-lg border border-slate-200/80 text-xs">
                        <span className="font-mono bg-indigo-100 text-indigo-900 px-2 py-1 rounded-md text-[11px] font-bold block text-center shadow-2xs">
                          {item.ruleCode.toUpperCase()} ( {item.periodLabel} )
                        </span>
                      </div>

                      {/* 3. Amount if available */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Assessment:</span>
                        {item.paymentBehavior === 'NEVER_PAYABLE' || !isPayableObligation(item.ruleCode) ? (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                            <span>📁</span> Filing Only
                          </span>
                        ) : item.assessmentTag === 'Assessed - Excess Input Tax' ? (
                          <span className="font-mono font-extrabold text-purple-700 text-xs">
                            ₱{Math.abs(item.payableAmount || 0).toLocaleString()} (Tax Credit)
                          </span>
                        ) : item.assessmentTag === 'Assessed - Zero Return / No Payment' ? (
                          <span className="font-mono font-bold text-amber-800 text-xs">
                            ₱0.00 (Zero / Filed)
                          </span>
                        ) : item.payableAmount !== undefined && item.payableAmount !== null && item.payableAmount > 0 ? (
                          <span className="font-mono font-extrabold text-emerald-700 text-xs">
                            ₱{item.payableAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Not Assessed</span>
                        )}
                      </div>

                      {/* Due Date & Settlement Status */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span>Due: <strong className="text-slate-800 font-mono">{item.formattedDateStr}</strong></span>
                        <div className="flex items-center gap-1">
                          {item.assessmentTag === 'Assessed - Excess Input Tax' ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-purple-900 font-bold bg-purple-100 border border-purple-200 px-2 py-0.5 rounded text-[10px]">
                                Excess Input Tax
                              </span>
                              {(item.notes || item.remarks || item.comment) && (
                                <span className="text-[9px] text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0 text-purple-700" />
                                  <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                                </span>
                              )}
                            </div>
                          ) : item.assessmentTag === 'Assessed - Zero Return / No Payment' ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-amber-900 font-bold bg-amber-100 border border-amber-200 px-2 py-0.5 rounded text-[10px] text-right">
                                No Payment Needed / Zero Tax Filed / No Need To File
                              </span>
                              {(item.notes || item.remarks || item.comment) && (
                                <span className="text-[9px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0 text-amber-700" />
                                  <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                                </span>
                              )}
                            </div>
                          ) : item.assessmentTag === 'Done Filing' || (item.status === 'Already Paid' && (item.paymentBehavior === 'NEVER_PAYABLE' || !isPayableObligation(item.ruleCode))) ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-emerald-800 font-bold bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ( Done Filing )
                              </span>
                              {(item.notes || item.remarks || item.comment) && (
                                <span className="text-[9px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0 text-emerald-700" />
                                  <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                                </span>
                              )}
                            </div>
                          ) : item.status === 'Already Paid' ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Paid & Settled
                              </span>
                              {(item.notes || item.remarks || item.comment) && (
                                <span className="text-[9px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0 text-emerald-700" />
                                  <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                                </span>
                              )}
                            </div>
                          ) : item.status === 'For Payment' ? (
                            <span className="text-indigo-800 font-semibold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              For Payment
                            </span>
                          ) : (
                            <span className="text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Pending
                            </span>
                          )}

                          {/* Icon-only button to cancel choice */}
                          {(item.status === 'For Payment' || item.status === 'Already Paid' || (item.payableAmount !== undefined && item.payableAmount > 0)) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelFormChoice(item);
                              }}
                              className={`p-1 border rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                                item.status === 'Already Paid' && !isSuperAdmin
                                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              }`}
                              title={item.status === 'Already Paid' && !isSuperAdmin ? "Only Admin can revert Settled & Paid items" : "Revert to pending"}
                            >
                              {item.status === 'Already Paid' && !isSuperAdmin ? (
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}

                  {colItems.length === 0 && (
                    <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-medium bg-white/50">
                      No filings in this column
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 1: GROUPED BY DEADLINE DATE (e.g. July 10 2026, July 25 2026) */}
      {viewMode === 'GroupedByDate' && (
        <div className="space-y-6">
          {sortedDueDates.length > 0 ? (
            sortedDueDates.map(dueDateKey => {
              const itemsForDate = groupedByDateMap[dueDateKey];
              const prettyDate = formatDatePretty(dueDateKey);
              const settledForDate = itemsForDate.filter(i => i.status === 'Already Paid').length;

              return (
                <div key={dueDateKey} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                  
                  {/* Group Header: e.g. July 10, 2026 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                          {prettyDate}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {itemsForDate.length} client deadline(s) scheduled on this date
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold font-mono">
                        {settledForDate}/{itemsForDate.length} Settled
                      </span>
                    </div>
                  </div>

                  {/* List of Clients with Deadlines on this Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {itemsForDate.map((item, itemIdx) => (
                      <div 
                        key={`${dueDateKey}_${item.id}_${itemIdx}`} 
                        className={`p-4 rounded-2xl border transition-all space-y-3 relative flex flex-col justify-between ${
                          item.status === 'Already Paid'
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : item.status === 'Due Today'
                            ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-300/50'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        
                        {/* Top: Category & Status */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.category === 'BIR' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {item.category} • {item.periodLabel}
                            </span>

                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                              item.status === 'Already Paid' ? 'bg-emerald-600 text-white' :
                              item.status === 'Due Today' ? 'bg-rose-600 text-white' :
                              item.status === 'Overdue' ? 'bg-amber-600 text-white' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          {/* Client Name & Form Name */}
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="truncate">{item.clientName}</span>
                            </h4>
                            <div className="text-xs font-bold text-indigo-700 mt-1 flex items-center gap-1">
                              <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[11px]">
                                {item.ruleCode}
                              </span>
                              <span className="truncate text-slate-700 text-[11px]" title={item.ruleName}>{item.ruleName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Details & Status */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs gap-2">
                          <div className="text-[11px] text-slate-500 font-medium">
                            Staff: <strong className="text-slate-800">{item.assignedStaffName}</strong>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {item.status === 'Already Paid' ? (
                              item.assessmentTag === 'Assessed - Zero Return / No Payment' ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border bg-amber-50 text-amber-800 border-amber-200">
                                    <CheckCircle2 className="w-3 h-3 text-amber-600" />
                                    <span>No Payment Needed / Zero Tax Filed / No Need To File</span>
                                  </span>
                                  {(item.notes || item.remarks || item.comment) && (
                                    <span className="text-[9px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                                      <MessageSquare className="w-2.5 h-2.5 shrink-0 text-amber-700" />
                                      <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                                    </span>
                                  )}
                                </div>
                              ) : item.assessmentTag === 'Done Filing' || item.paymentBehavior === 'NEVER_PAYABLE' || !isPayableObligation(item.ruleCode) ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border bg-emerald-50 text-emerald-800 border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>( Done Filing )</span>
                                  </span>
                                  {(item.notes || item.remarks || item.comment) && (
                                    <span className="text-[9px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                                      <MessageSquare className="w-2.5 h-2.5 shrink-0 text-emerald-700" />
                                      <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border bg-emerald-50 text-emerald-800 border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Paid & Settled</span>
                                  </span>
                                  {(item.notes || item.remarks || item.comment) && (
                                    <span className="text-[9px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                                      <MessageSquare className="w-2.5 h-2.5 shrink-0 text-emerald-700" />
                                      <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                                    </span>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border bg-slate-100 text-slate-600 border-slate-200">
                                Pay in Payables
                              </span>
                            )}

                            {(item.status === 'For Payment' || item.status === 'Already Paid' || (item.payableAmount !== undefined && item.payableAmount > 0)) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelFormChoice(item);
                                }}
                                className={`p-1 border rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                                  item.status === 'Already Paid' && !isSuperAdmin
                                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                }`}
                                title={item.status === 'Already Paid' && !isSuperAdmin ? "Only Admin can revert Settled & Paid items" : "Revert to pending"}
                              >
                                {item.status === 'Already Paid' && !isSuperAdmin ? (
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                </div>
              );
            })
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3 shadow-2xs">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Incoming Deadlines Found for {MONTH_FULL_NAMES[selectedMonth]} {selectedYear}</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No active client services have scheduled filings on this month, or all forms were marked as Not Applicable in the Master Deadline Picker.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: ALL CARDS VIEW */}
      {viewMode === 'AllCards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeadlines.map((item, itemIdx) => (
            <div key={`${item.id}_${itemIdx}`} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 relative flex flex-col justify-between">
              
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    item.category === 'BIR' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {item.category} • {item.periodLabel}
                  </span>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    item.status === 'Already Paid' ? 'bg-emerald-600 text-white' :
                    item.status === 'Due Today' ? 'bg-rose-600 text-white' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{item.clientName}</h4>
                  <p className="text-xs font-bold text-indigo-700 mt-0.5 flex items-center gap-1">
                    <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{item.ruleCode}</span>
                    <span className="truncate">{item.ruleName}</span>
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Statutory Due Date:</p>
                  <p className="font-mono font-bold text-indigo-900 text-sm">{item.formattedDateStr}</p>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'Already Paid' ? (
                    item.assessmentTag === 'Assessed - Zero Return / No Payment' ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border bg-amber-50 text-amber-800 border-amber-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>No Payment Needed / Zero Tax Filed / No Need To File</span>
                        </span>
                        {(item.notes || item.remarks || item.comment) && (
                          <span className="text-[9px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                            <MessageSquare className="w-2.5 h-2.5 shrink-0 text-amber-700" />
                            <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                          </span>
                        )}
                      </div>
                    ) : item.assessmentTag === 'Done Filing' || item.paymentBehavior === 'NEVER_PAYABLE' || !isPayableObligation(item.ruleCode) ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border bg-emerald-50 text-emerald-800 border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>( Done Filing )</span>
                        </span>
                        {(item.notes || item.remarks || item.comment) && (
                          <span className="text-[9px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                            <MessageSquare className="w-2.5 h-2.5 shrink-0 text-emerald-700" />
                            <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border bg-emerald-50 text-emerald-800 border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Settled</span>
                        </span>
                        {(item.notes || item.remarks || item.comment) && (
                          <span className="text-[9px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 flex items-center gap-1 max-w-[200px] truncate" title={item.notes || item.remarks || item.comment}>
                            <MessageSquare className="w-2.5 h-2.5 shrink-0 text-emerald-700" />
                            <span className="truncate">{item.notes || item.remarks || item.comment}</span>
                          </span>
                        )}
                      </div>
                    )
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border bg-slate-100 text-slate-600 border-slate-200">
                      Pay in BIR/Benefits Payables
                    </span>
                  )}

                  {(item.status === 'For Payment' || item.status === 'Already Paid' || (item.payableAmount !== undefined && item.payableAmount > 0)) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelFormChoice(item);
                      }}
                      className={`p-1.5 border rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                        item.status === 'Already Paid' && !isSuperAdmin
                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      }`}
                      title={item.status === 'Already Paid' && !isSuperAdmin ? "Only Admin can revert Settled & Paid items" : "Revert to pending"}
                    >
                      {item.status === 'Already Paid' && !isSuperAdmin ? (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}

          {filteredDeadlines.length === 0 && (
            <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-3xl text-slate-500 text-xs font-medium">
              No compliance records match your filters for {MONTH_FULL_NAMES[selectedMonth]} {selectedYear}.
            </div>
          )}
        </div>
      )}

      {/* ENROLLED CLIENT WORKSPACES MODAL */}
      {showEnrolledClientsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-900 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-2xl shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Enrolled Client Workspaces</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {enrolledClientWorkspaces.length} active client workspaces scheduled for <strong>{MONTH_FULL_NAMES[selectedMonth]} {selectedYear}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEnrolledClientsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-Modal Search Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search enrolled client name or TIN..."
                value={enrolledSearchQuery}
                onChange={e => setEnrolledSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-xs"
              />
            </div>

            {/* Workspace Cards List */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {enrolledClientWorkspaces
                .filter(item => {
                  if (!(enrolledSearchQuery || '').trim()) return true;
                  const q = (enrolledSearchQuery || '').toLowerCase();
                  return (
                    (item.client?.name || '').toLowerCase().includes(q) ||
                    (item.client?.tin && String(item.client.tin).includes(q))
                  );
                })
                .map(item => (
                  <div
                    key={item.client.id}
                    className="p-3.5 bg-slate-50 hover:bg-indigo-50/30 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{item.client.name}</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                          {item.client.registrationMethod || 'Manual'} Filer
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {item.client.tin && (
                          <span>TIN: <strong className="font-mono text-slate-700">{item.client.tin}</strong></span>
                        )}
                        <span>Branch: <strong className="font-mono text-slate-700">{item.client.branchCode || '00000'}</strong></span>
                        <span>Type: <strong className="text-slate-700">{item.client.companyType || 'Corporation'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right text-[11px] mr-1">
                        <span className="font-bold text-slate-900 block">{item.deadlinesCount} Scheduled Deadlines</span>
                        <span className="text-emerald-700 font-semibold">{item.settledCount} Settled</span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span className="text-amber-800 font-semibold">{item.pendingCount} Pending</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery(item.client.name);
                          setShowEnrolledClientsModal(false);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer shrink-0"
                      >
                        Filter Schedule
                      </button>
                    </div>
                  </div>
                ))}

              {enrolledClientWorkspaces.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-medium">
                  No enrolled client workspaces found for {MONTH_FULL_NAMES[selectedMonth]} {selectedYear}.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Showing {enrolledClientWorkspaces.length} active client workspace(s)
              </span>
              <button
                type="button"
                onClick={() => setShowEnrolledClientsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM REVERT TO PENDING CONFIRMATION MODAL */}
      {revertModalOpen && itemToRevert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl shrink-0">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Revert Filing Status</h3>
                  <p className="text-xs font-bold text-rose-600 mt-0.5">Are you sure you want to revert to pending?</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRevertModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item Overview */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Client / Company:</span>
                <span className="font-extrabold text-slate-900">{itemToRevert.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Requirement / Form:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {itemToRevert.ruleCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Target Period Code:</span>
                <span className="font-mono font-bold text-slate-800">{itemToRevert.periodLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {itemToRevert.status}
                </span>
              </div>
            </div>

            {/* Warning Details */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Reverting will remove any recorded tax assessment, zero payment entry, or payment tag for this form, returning the item back to <strong>Action Pending</strong> in the user's To-Do list.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevertModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevertToPending}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Yes, Revert to Pending
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-5 duration-200 max-w-md">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Check className="w-4 h-4" />
          </div>
          <p className="font-medium">{toastMessage}</p>
        </div>
      )}

    </div>
  );
};
