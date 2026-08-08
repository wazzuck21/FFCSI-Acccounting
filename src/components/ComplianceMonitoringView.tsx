import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ComplianceItem, CustomDeadlineRule } from '../types';
import { 
  MONTHS_LIST, 
  MONTH_FULL_NAMES, 
  MONTH_INDEX, 
  getRuleDeadlineForMonth 
} from '../data/masterTables';
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
  Filter,
  Layers,
  Sparkles,
  Zap,
  Kanban,
  Columns,
  ArrowRight,
  RotateCcw
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
  const [clientStatusTab, setClientStatusTab] = useState<'Active' | 'For Compliance'>('Active');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GroupedByDate' | 'Kanban' | 'AllCards'>('Kanban');

  // Revert form choice / reset item back to Action Pending in To-Do list
  const handleCancelFormChoice = (item: CompiledClientDeadline) => {
    if (confirm(`Revert choice for ${item.clientName} (${item.ruleCode})?\n\nThis will remove any recorded assessment or payment tag and return the item back to Action Pending in the user's To-Do list.`)) {
      resetPayableAssessment(item.clientId, item.ruleCode);
      alert(`Reverted to pending for ${item.clientName} (${item.ruleCode})!`);
    }
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

  // 1. Filter matching clients based on status tab (Active vs For Compliance) and search
  const activeMatchingClients = clients.filter(c => {
    const statusMatch = clientStatusTab === 'Active' ? c.status === 'Active' : c.status === 'For Compliance';
    if (!statusMatch) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.tradeName?.toLowerCase().includes(q) ||
      c.tinNumber.toLowerCase().includes(q)
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
  }

  const compiledDeadlines: CompiledClientDeadline[] = [];

  activeMatchingClients.forEach(client => {
    allMasterRules.forEach(rule => {
      // Category filter check
      if (categoryFilter !== 'ALL' && rule.category !== categoryFilter) return;

      // Check if client is enrolled in this rule
      const isBir = rule.category === 'BIR';
      const hasBir = isBir && (client.birTaxServices || []).some(s => s.toLowerCase() === rule.code.toLowerCase());
      const hasBen = !isBir && (client.benefitsServices || []).some(s => s.toLowerCase().includes(rule.code.toLowerCase()) || rule.code.toLowerCase().includes(s.toLowerCase()));

      if (hasBir || hasBen) {
        // Get deadline rule for selected month & year (accounting for fiscal year client shift)
        const deadlineInfo = getRuleDeadlineForMonth(rule, selectedMonth, selectedYear, client);

        // Include only if deadline is active and NOT marked N/A / Not Required
        if (deadlineInfo && !deadlineInfo.isNotRequired && deadlineInfo.dueDateStr !== 'N/A') {
          const cleanRuleCode = rule.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const cleanRuleName = rule.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

          // Check if there's an existing compliance item in DataContext state
          const existing = complianceItems.find(ci => {
            if (ci.clientId !== client.id) return false;
            const cleanTitle = ci.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const isNameMatch = cleanTitle.includes(cleanRuleCode) || cleanRuleCode.includes(cleanTitle) || (cleanRuleName.length > 3 && cleanTitle.includes(cleanRuleName));
            const isDateMatch = ci.dueDate === deadlineInfo.dueDateStr || ci.dueDate.startsWith(`${selectedYear}-${String(MONTH_INDEX[selectedMonth] + 1).padStart(2, '0')}`);
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

          const recordedAmount = matchedPayable ? matchedPayable.payableAmount : existing?.amountDue;

          // If tagged as paid in BIR/Benefits Payables or existing item is Already Paid (and payable is NOT revoked to Unpaid):
          const isTagAsPaidInPayables = matchedPayable?.status === 'Paid';
          const isPayableUnpaid = matchedPayable?.status === 'Unpaid';
          
          let calculatedStatus: CompiledClientDeadline['status'] = 'Pending';

          if (isTagAsPaidInPayables || (existing?.status === 'Already Paid' && !isPayableUnpaid)) {
            calculatedStatus = 'Already Paid';
          } else {
            const todayStr = new Date().toISOString().substring(0, 10);
            if (deadlineInfo.dueDateStr === todayStr) {
              calculatedStatus = 'Due Today';
            } else if (deadlineInfo.dueDateStr < todayStr) {
              calculatedStatus = 'Overdue';
            } else if (
              existing?.status === 'For Payment' || 
              isPayableUnpaid || 
              (recordedAmount !== undefined && recordedAmount !== null && recordedAmount > 0)
            ) {
              calculatedStatus = 'For Payment';
            } else {
              calculatedStatus = (existing?.status && existing.status !== 'Already Paid') ? existing.status : 'Pending';
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
            dueDate: deadlineInfo.dueDateStr,
            formattedDateStr: formatDatePretty(deadlineInfo.dueDateStr),
            periodLabel: deadlineInfo.label,
            status: calculatedStatus,
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
            fiscalYearEndMonth: client.fiscalYearEndMonth
          });
        }
      }
    });
  });

  // Filter compiled deadlines by search query (if search targets form code or rule name)
  const filteredDeadlines = compiledDeadlines.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.clientName.toLowerCase().includes(q) ||
      item.ruleCode.toLowerCase().includes(q) ||
      item.ruleName.toLowerCase().includes(q) ||
      item.formattedDateStr.toLowerCase().includes(q)
    );
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

  // Summary counts for selected month
  const totalDeadlines = filteredDeadlines.length;
  const settledCount = filteredDeadlines.filter(d => d.status === 'Already Paid').length;
  const pendingCount = totalDeadlines - settledCount;
  const uniqueClientsCount = new Set(filteredDeadlines.map(d => d.clientId)).size;

  // Active Clients vs For Compliance Clients Pending Deadline Counts
  const activeClientsList = clients.filter(c => c.status === 'Active');
  const forComplianceClientsList = clients.filter(c => c.status === 'For Compliance');

  // Helper function to count pending deadlines for a given client set in current month/year
  const getPendingCountForClients = (clientList: typeof clients) => {
    let pending = 0;
    clientList.forEach(client => {
      allMasterRules.forEach(rule => {
        const isBir = rule.category === 'BIR';
        const hasBir = isBir && (client.birTaxServices || []).some(s => s.toLowerCase() === rule.code.toLowerCase());
        const hasBen = !isBir && (client.benefitsServices || []).some(s => s.toLowerCase().includes(rule.code.toLowerCase()) || rule.code.toLowerCase().includes(s.toLowerCase()));

        if (hasBir || hasBen) {
          const deadlineInfo = getRuleDeadlineForMonth(rule, selectedMonth, selectedYear, client);
          if (deadlineInfo && !deadlineInfo.isNotRequired && deadlineInfo.dueDateStr !== 'N/A') {
            const cleanRuleCode = rule.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const cleanRuleName = rule.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

            const existing = complianceItems.find(ci => {
              if (ci.clientId !== client.id) return false;
              const cleanTitle = ci.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              const isNameMatch = cleanTitle.includes(cleanRuleCode) || cleanRuleCode.includes(cleanTitle) || (cleanRuleName.length > 3 && cleanTitle.includes(cleanRuleName));
              const isDateMatch = ci.dueDate === deadlineInfo.dueDateStr || ci.dueDate.startsWith(`${selectedYear}-${String(MONTH_INDEX[selectedMonth] + 1).padStart(2, '0')}`);
              return isNameMatch && isDateMatch;
            });

            const matchedPayable = payables.find(p => {
              if (p.clientId !== client.id) return false;
              const cleanItemName = p.itemName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              const isNameMatch = cleanItemName.includes(cleanRuleCode) || cleanRuleCode.includes(cleanItemName);
              const isMonthMatch = p.month.toLowerCase().includes(selectedMonth.toLowerCase()) || p.month.includes(`${selectedYear}`);
              return isNameMatch && isMonthMatch;
            });

            const isPaid = (matchedPayable?.status === 'Paid') || (existing?.status === 'Already Paid' && matchedPayable?.status !== 'Unpaid');
            if (!isPaid) {
              pending++;
            }
          }
        }
      });
    });
    return pending;
  };

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

              {/* Client Status Tabs placed directly after Incoming Deadlines with pending count inside! ⭐ */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setClientStatusTab('Active')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    clientStatusTab === 'Active' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Active Clients ({activeClientsList.length})</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                    clientStatusTab === 'Active' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {activePendingCount} Pending
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setClientStatusTab('For Compliance')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    clientStatusTab === 'For Compliance' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>For Compliance Clients ({forComplianceClientsList.length})</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                    clientStatusTab === 'For Compliance' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {forCompliancePendingCount} Pending
                  </span>
                </button>
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

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('Kanban');
                setSelectedMonth(currentMonthCode);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'Kanban' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('GroupedByDate')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'GroupedByDate' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Grouped by Date</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('AllCards')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'AllCards' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Deadline Cards ({filteredDeadlines.length})</span>
            </button>
          </div>

        </div>

      </div>

      {/* Summary KPI Banner for Month */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Client Deadlines</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalDeadlines}</span>
            <span className="text-xs text-slate-500 font-medium">items for {selectedMonth} {selectedYear}</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200/80 p-4 rounded-2xl shadow-2xs space-y-1 bg-emerald-50/20">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Already Paid / Settled</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{settledCount}</span>
            <span className="text-xs text-emerald-600 font-semibold">({totalDeadlines > 0 ? Math.round((settledCount/totalDeadlines)*100) : 0}%)</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 p-4 rounded-2xl shadow-2xs space-y-1 bg-amber-50/20">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending / Action Needed</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-800">{pendingCount}</span>
            <span className="text-xs text-amber-700 font-medium">due for filing</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enrolled Clients</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{uniqueClientsCount}</span>
            <span className="text-xs text-slate-500 font-medium">active workspace(s)</span>
          </div>
        </div>
      </div>

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
                  {colItems.map(item => (
                    <div
                      key={item.id}
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
                      {/* 1. Company Name & Branch Tag */}
                      <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-100">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug break-words" title={item.clientName}>
                              {item.clientName}
                            </h4>
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
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          item.category === 'BIR' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.category}
                        </span>
                      </div>

                      {/* 2. Form & Applicable Period Code */}
                      <div className="bg-slate-50/90 p-2 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
                        <span className="font-mono bg-indigo-100 text-indigo-900 px-2 py-1 rounded-md text-[11px] font-bold block text-center shadow-2xs">
                          {item.ruleCode.toUpperCase()} ( {MONTH_FULL_NAMES[selectedMonth]} {selectedYear} )
                        </span>

                        {(() => {
                          const upperRule = item.ruleCode.toUpperCase();
                          const linkedRule = (masterChoices.formLinkages || []).find(
                            l => l.primaryCode.toUpperCase() === upperRule || (l.linkedCodes || []).map(c => c.toUpperCase()).includes(upperRule)
                          );
                          if (!linkedRule) return null;
                          return (
                            <div className="flex items-center justify-between text-[10px] bg-indigo-50/80 border border-indigo-200/80 px-2 py-0.5 rounded font-medium text-indigo-900">
                              <span className="font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" /> Attachments:
                              </span>
                              <span className="font-mono font-bold text-indigo-800">
                                {(linkedRule.linkedCodes || []).join(', ')}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 3. Amount if available */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">For Payment:</span>
                        {item.payableAmount !== undefined && item.payableAmount !== null && item.payableAmount > 0 ? (
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
                          {item.status === 'Already Paid' ? (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Paid & Settled
                            </span>
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
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Revert to pending"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
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
                    {itemsForDate.map(item => (
                      <div 
                        key={item.id} 
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
                            <span className={`px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border ${
                              item.status === 'Already Paid'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {item.status === 'Already Paid' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Paid</span>
                                </>
                              ) : (
                                <span>Pay in Payables</span>
                              )}
                            </span>

                            {(item.status === 'For Payment' || item.status === 'Already Paid' || (item.payableAmount !== undefined && item.payableAmount > 0)) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelFormChoice(item);
                                }}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                title="Revert to pending"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
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
          {filteredDeadlines.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 relative flex flex-col justify-between">
              
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

                <span className={`px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border ${
                  item.status === 'Already Paid'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {item.status === 'Already Paid' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Settled</span>
                    </>
                  ) : (
                    <span>Pay in BIR/Benefits Payables</span>
                  )}
                </span>
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

    </div>
  );
};
