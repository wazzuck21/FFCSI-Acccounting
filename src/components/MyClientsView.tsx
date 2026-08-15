import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ClientProfile, PayableCategory, CustomDeadlineRule, PaymentBehavior, FilingRequired, SubmissionMethod, ComplianceCategory } from '../types';
import { MONTHS_LIST, MONTH_FULL_NAMES, MONTH_INDEX } from '../data/masterTables';
import { calculateClientDeadline, isPayableObligation, getPaymentBehavior, getComplianceCategory, getSubmissionMethod, getFilingRequired } from '../utils/deadlineEngine';
import { CurrencyInput } from './CurrencyInput';
import { SearchableClientSelect } from './SearchableClientSelect';
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  ChevronRight, 
  Receipt, 
  ShieldCheck, 
  CheckSquare, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Building2, 
  Plus, 
  X, 
  Zap, 
  Check, 
  Ban, 
  Laptop, 
  FileText, 
  Download, 
  ExternalLink,
  Sparkles,
  Layers,
  Lock,
  MessageSquare
} from 'lucide-react';
import jsPDF from 'jspdf';

interface Props {
  onSelectClientWorkspace: (clientId: string) => void;
}

export const MyClientsView: React.FC<Props> = ({ onSelectClientWorkspace }) => {
  const { currentUser, isSuperAdmin, allUsers } = useAuth();
  const { clients, payables, complianceItems, masterChoices, addPayable, deletePayable, resetPayableAssessment, addAuditLog } = useData();

  // Current calendar month and year default
  const currentMonthCode = (MONTHS_LIST[new Date().getMonth()] || 'Aug') as ('Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec');
  const currentYearNum = new Date().getFullYear();

  // Selected Period: Month & Year (Default to current real month and year)
  const [selectedMonth, setSelectedMonth] = useState<('Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec')>(currentMonthCode);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);

  // Selected staff filter
  const [selectedStaffName, setSelectedStaffName] = useState<string>(
    currentUser?.fullName || (allUsers.length > 0 ? allUsers[0].fullName : 'ALL_STAFF')
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'BIR' | 'Benefits'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_ACTION' | 'LOGGED' | 'ZERO_PAYMENT'>('PENDING_ACTION');
  const [clientStatusFilter, setClientStatusFilter] = useState<'ALL' | 'Active' | 'For Compliance'>('ALL');

  // View Mode: 'TO_DO_LIST' vs 'DONE_FILING' ⭐
  const [viewMode, setViewMode] = useState<'TO_DO_LIST' | 'DONE_FILING'>('TO_DO_LIST');

  // Set Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionClient, setActionClient] = useState<ClientProfile | null>(null);
  const [actionFormCode, setActionFormCode] = useState('');
  const [actionFormTitle, setActionFormTitle] = useState('');
  const [actionCategory, setActionCategory] = useState<PayableCategory>('BIR');
  const [actionDueDate, setActionDueDate] = useState('');
  
  // Form Action Choices
  const [actionChoice, setActionChoice] = useState<'PAYABLE' | 'EXCESS_INPUT' | 'NO_PAYMENT' | 'FILED' | 'RESET'>('PAYABLE');
  const [payableAmountInput, setPayableAmountInput] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionPeriodLabel, setActionPeriodLabel] = useState('');

  // Assessment / Create Payable Modal State
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false);
  const [assessmentClientId, setAssessmentClientId] = useState<string>('');
  const [assessmentCategory, setAssessmentCategory] = useState<PayableCategory>('BIR');
  const [assessmentItemName, setAssessmentItemName] = useState<string>('0619E');
  const [assessmentMonth, setAssessmentMonth] = useState<string>('2026-08');
  const [assessmentYear, setAssessmentYear] = useState<number>(2026);
  const [isNoPaymentChoice, setIsNoPaymentChoice] = useState<boolean>(false);
  const [assessmentPayableAmount, setAssessmentPayableAmount] = useState<string>('');
  const [assessmentNotes, setAssessmentNotes] = useState<string>('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Calculate Target Applicable Month Period based on BIR & Statutory Schedule Matrix (e.g., Aug 2026 deadlines -> July 2026 target period)
  const getTargetPeriodForMonth = (mName: typeof MONTHS_LIST[number], yr: number) => {
    const mIdx = MONTH_INDEX[mName];
    let prevMIdx = mIdx - 1;
    let targetYr = yr;
    if (prevMIdx < 0) {
      prevMIdx = 11;
      targetYr = yr - 1;
    }
    const prevMStr = String(prevMIdx + 1).padStart(2, '0');
    const prevMName = MONTHS_LIST[prevMIdx];
    const prevMFullName = MONTH_FULL_NAMES[prevMName];
    return {
      code: `${prevMStr}-${targetYr}`,
      fullName: `${prevMFullName} ${targetYr}`,
      shortName: `${prevMName}-${String(targetYr).slice(-2)}`
    };
  };

  const monthNumStr = String(MONTH_INDEX[selectedMonth] + 1).padStart(2, '0');
  const targetPeriodInfo = getTargetPeriodForMonth(selectedMonth, selectedYear);
  const currentPeriodCode = targetPeriodInfo.code; // e.g. "07-2026" for August 2026 deadline

  // Filter clients assigned to selected staff member (excluding Archived clients from active operational checklist)
  const myAssignedClients = clients
    .filter(client => client.status !== 'Archived')
    .filter(client => {
      if (clientStatusFilter === 'Active') return client.status === 'Active';
      if (clientStatusFilter === 'For Compliance') return client.status === 'For Compliance';
      return true;
    })
    .filter(client => {
    if (selectedStaffName === 'ALL_STAFF') return true;
    const match = client.assignedStaffName === selectedStaffName || 
                  client.assignedStaffId === currentUser?.id ||
                  (currentUser?.fullName && client.assignedStaffName?.toLowerCase().includes(currentUser.fullName.toLowerCase()));
    return match;
  }).filter(client => {
    if (!(searchQuery || '').trim()) return true;
    const q = (searchQuery || '').toLowerCase();
    return (client.companyName || '').toLowerCase().includes(q) ||
           (client.tinNumber || '').includes(q) ||
           (client.birTaxServices || []).some(t => t.toLowerCase().includes(q)) ||
           (client.benefitsServices || []).some(b => b.toLowerCase().includes(q));
  });

  // Client counts for status filter options
  const assignedBaseClients = clients
    .filter(client => client.status !== 'Archived')
    .filter(client => {
      if (selectedStaffName === 'ALL_STAFF') return true;
      return client.assignedStaffName === selectedStaffName || 
             client.assignedStaffId === currentUser?.id ||
             (currentUser?.fullName && client.assignedStaffName?.toLowerCase().includes(currentUser.fullName.toLowerCase()));
    });
  const activeClientsCount = assignedBaseClients.filter(c => c.status === 'Active').length;
  const forComplianceClientsCount = assignedBaseClients.filter(c => c.status === 'For Compliance').length;

  // Combine Master BIR & Benefits options
  const allMasterRules: CustomDeadlineRule[] = [
    ...(masterChoices.birTaxOptions || []),
    ...(masterChoices.benefitsOptions || [])
  ];

  // Helper: Get Deadline Date string for a rule in selectedMonth & selectedYear
  const getDeadlineInfo = (rule: CustomDeadlineRule, client?: ClientProfile) => {
    if (!client) return null;
    const res = calculateClientDeadline({
      client,
      rule,
      month: selectedMonth,
      year: selectedYear,
      masterChoices
    });
    if (!res || res.isNotRequired || res.finalDeadline === 'N/A') {
      return null;
    }
    return {
      dueDateStr: res.finalDeadline,
      label: res.taxablePeriod,
      isNotRequired: res.isNotRequired
    };
  };

  // Structure Deadline Groups for To-Do List
  interface ToDoItem {
    client: ClientProfile;
    formCode: string;
    formTitle: string;
    category: PayableCategory;
    dueDateStr: string;
    periodLabel: string;
    existingPayable?: any;
    status: 'NO_ACTION' | 'PAYABLE_LOGGED' | 'NO_PAYMENT' | 'FILED';
    paymentBehavior?: PaymentBehavior;
    filingRequired?: FilingRequired;
    submissionMethod?: SubmissionMethod;
    complianceCategory?: ComplianceCategory;
  }

  interface ToDoGroup {
    dueDateStr: string;
    formattedDueDate: string;
    formCodesStr: string;
    items: ToDoItem[];
  }

  // Compile To-Do Items or Done Filing Items
  const compileToDoGroups = (filterMode: 'TO_DO_LIST' | 'DONE_FILING'): ToDoGroup[] => {
    const groupMap: Record<string, { dueDateStr: string; formCodes: Set<string>; items: ToDoItem[] }> = {};

    myAssignedClients.forEach(client => {
      allMasterRules.forEach(rule => {
        // Category filter check
        if (categoryFilter !== 'ALL' && rule.category !== categoryFilter) return;

        // Check if client has this rule assigned
        const isBirAssigned = rule.category === 'BIR' && client.birTaxServices.some(s => s.toLowerCase() === rule.code.toLowerCase());
        const isBenAssigned = rule.category === 'Benefits' && client.benefitsServices.some(s => s.toLowerCase().includes(rule.code.toLowerCase()) || rule.code.toLowerCase().includes(s.toLowerCase()));

        if (isBirAssigned || isBenAssigned) {
          const dInfo = getDeadlineInfo(rule, client);
          if (!dInfo) return; // Skip if N/A or not required for this month

          // Check if payable already recorded
          const matchingPayable = payables.find(p => 
            p.clientId === client.id && 
            p.itemName.toLowerCase() === rule.code.toLowerCase() &&
            (p.month === `${selectedYear}-${monthNumStr}` || p.month === currentPeriodCode || p.month.includes(selectedMonth))
          );

          let status: ToDoItem['status'] = 'NO_ACTION';
          if (matchingPayable) {
            if (matchingPayable.status === 'Paid') {
              status = 'FILED';
            } else if (matchingPayable.status === 'No Payment') {
              status = 'NO_PAYMENT';
            } else if (matchingPayable.payableAmount === 0) {
              status = 'NO_PAYMENT';
            } else {
              status = 'PAYABLE_LOGGED';
            }
          }

          // Separate Pending To-Do items vs Completed / Done Filing items ⭐
          if (filterMode === 'TO_DO_LIST') {
            if (status !== 'NO_ACTION') return; // Hide completed items from To-Do List
          } else if (filterMode === 'DONE_FILING') {
            if (status === 'NO_ACTION') return; // Hide pending items from Done Filing View
          }

          const groupKey = dInfo.dueDateStr;
          if (!groupMap[groupKey]) {
            groupMap[groupKey] = {
              dueDateStr: dInfo.dueDateStr,
              formCodes: new Set(),
              items: []
            };
          }

          groupMap[groupKey].formCodes.add(rule.code);
          groupMap[groupKey].items.push({
            client,
            formCode: rule.code,
            formTitle: rule.name,
            category: rule.category as PayableCategory,
            dueDateStr: dInfo.dueDateStr,
            periodLabel: dInfo.label || currentPeriodCode,
            existingPayable: matchingPayable,
            status,
            paymentBehavior: rule.paymentBehavior || getPaymentBehavior(rule.code, rule),
            filingRequired: rule.filingRequired || getFilingRequired(rule.code, rule),
            submissionMethod: rule.submissionMethod || getSubmissionMethod(rule.code, rule),
            complianceCategory: rule.complianceCategory || getComplianceCategory(rule.code, rule),
          });
        }
      });
    });

    // Convert map to sorted list by date
    const sortedDates = Object.keys(groupMap).sort();
    return sortedDates.map(dateKey => {
      const g = groupMap[dateKey];
      
      // Format date e.g. "August 10, 2026"
      const parts = dateKey.split('-');
      let formatted = dateKey;
      if (parts.length === 3) {
        const y = parts[0];
        const mIdx = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const mName = MONTHS_LIST[mIdx] ? MONTH_FULL_NAMES[MONTHS_LIST[mIdx]] : '';
        formatted = `${mName} ${d}, ${y}`;
      }

      return {
        dueDateStr: dateKey,
        formattedDueDate: formatted,
        formCodesStr: Array.from(g.formCodes).join(' / '),
        items: g.items
      };
    });
  };

  const toDoGroups = compileToDoGroups('TO_DO_LIST');
  const doneFilingGroups = compileToDoGroups('DONE_FILING');
  const pendingCount = toDoGroups.reduce((acc, g) => acc + g.items.length, 0);
  const doneCount = doneFilingGroups.reduce((acc, g) => acc + g.items.length, 0);

  // Open Set Action Modal
  const handleOpenSetAction = (item: ToDoItem) => {
    if ((item.status === 'FILED' || item.existingPayable?.status === 'Paid') && !isSuperAdmin) {
      showToast('Only Admin users are allowed to modify items tagged as Filed & Completed.');
      return;
    }

    setActionClient(item.client);
    setActionFormCode(item.formCode);
    setActionFormTitle(item.formTitle);
    setActionCategory(item.category);
    setActionDueDate(item.dueDateStr);
    setActionPeriodLabel(item.periodLabel || currentPeriodCode);
    
    const isNeverPayable = item.paymentBehavior === 'NEVER_PAYABLE' || !isPayableObligation(item.formCode);

    if (item.existingPayable) {
      if (item.existingPayable.status === 'Paid') {
        setActionChoice('FILED');
        setPayableAmountInput(String(item.existingPayable.payableAmount || 0));
      } else if (item.existingPayable.payableAmount > 0 && !isNeverPayable) {
        setActionChoice('PAYABLE');
        setPayableAmountInput(String(item.existingPayable.payableAmount));
      } else {
        setActionChoice('NO_PAYMENT');
        setPayableAmountInput('0');
      }
      setActionNotes(item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment || '');
    } else {
      if (isNeverPayable) {
        setActionChoice('FILED');
        setPayableAmountInput('0');
      } else {
        setActionChoice('PAYABLE');
        setPayableAmountInput('');
      }
      setActionNotes('');
    }

    setActionModalOpen(true);
  };

  // Submit Action Choice
  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionClient) return;

    // Check if modifying a Filed & Completed item
    const existingPayable = payables.find(p => 
      p.clientId === actionClient.id && 
      p.itemName.toLowerCase() === actionFormCode.toLowerCase()
    );
    if (existingPayable?.status === 'Paid' && !isSuperAdmin) {
      showToast('Only Admin users are allowed to modify items tagged as Filed & Completed.');
      setActionModalOpen(false);
      return;
    }

    const monthStr = `${selectedYear}-${monthNumStr}`;
    const cleanNotes = actionNotes.trim();

    if (actionChoice === 'PAYABLE') {
      const amount = Number(payableAmountInput);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid payable amount (greater than ₱0).');
        return;
      }

      addPayable({
        clientId: actionClient.id,
        clientName: actionClient.companyName,
        category: actionCategory,
        itemName: actionFormCode,
        month: monthStr,
        year: selectedYear,
        payableAmount: amount,
        status: 'Unpaid',
        notes: cleanNotes || undefined,
        remarks: cleanNotes || undefined,
        comment: cleanNotes || undefined,
        createdById: currentUser?.id || 'staff',
        createdByName: currentUser?.fullName || 'Accountant',
      });

      addAuditLog(
        'Set Payable Action',
        `Logged ₱${amount.toLocaleString()} payable for ${actionClient.companyName} (${actionFormCode}) - ${currentPeriodCode}${cleanNotes ? ` [Notes: ${cleanNotes}]` : ''}`,
        currentUser?.id || '',
        currentUser?.fullName || ''
      );

      showToast(`Set ₱${amount.toLocaleString()} Payable for ${actionClient.companyName} (${actionFormCode})!`);
    } else if (actionChoice === 'EXCESS_INPUT') {
      const rawAmount = Number(payableAmountInput);
      if (isNaN(rawAmount) || rawAmount === 0) {
        alert('Please enter a valid amount for excess input.');
        return;
      }
      const negativeAmount = -Math.abs(rawAmount);

      addPayable({
        clientId: actionClient.id,
        clientName: actionClient.companyName,
        category: actionCategory,
        itemName: actionFormCode,
        month: monthStr,
        year: selectedYear,
        payableAmount: negativeAmount,
        status: 'No Payment',
        notes: cleanNotes || undefined,
        remarks: cleanNotes || undefined,
        comment: cleanNotes || undefined,
        createdById: currentUser?.id || 'staff',
        createdByName: currentUser?.fullName || 'Accountant',
      });

      addAuditLog(
        'Set Excess Input Action',
        `Logged Excess Input ₱${negativeAmount.toLocaleString()} credit for ${actionClient.companyName} (${actionFormCode}) - ${currentPeriodCode}${cleanNotes ? ` [Notes: ${cleanNotes}]` : ''}`,
        currentUser?.id || '',
        currentUser?.fullName || ''
      );

      showToast(`Set ₱${negativeAmount.toLocaleString()} Excess Input for ${actionClient.companyName} (${actionFormCode})!`);
    } else if (actionChoice === 'NO_PAYMENT') {
      addPayable({
        clientId: actionClient.id,
        clientName: actionClient.companyName,
        category: actionCategory,
        itemName: actionFormCode,
        month: monthStr,
        year: selectedYear,
        payableAmount: 0,
        status: 'No Payment',
        notes: cleanNotes || undefined,
        remarks: cleanNotes || undefined,
        comment: cleanNotes || undefined,
        createdById: currentUser?.id || 'staff',
        createdByName: currentUser?.fullName || 'Accountant',
      });

      addAuditLog(
        'Set No Payment / No Need To File Action',
        `Logged No Payment Needed / Zero Tax Filed / No Need To File for ${actionClient.companyName} (${actionFormCode}) - ${currentPeriodCode}${cleanNotes ? ` [Reason/Comment: ${cleanNotes}]` : ''}`,
        currentUser?.id || '',
        currentUser?.fullName || ''
      );

      showToast(`Logged No Payment Needed / Zero Tax Filed / No Need To File for ${actionClient.companyName} (${actionFormCode})!`);
    } else if (actionChoice === 'FILED') {
      addPayable({
        clientId: actionClient.id,
        clientName: actionClient.companyName,
        category: actionCategory,
        itemName: actionFormCode,
        month: monthStr,
        year: selectedYear,
        payableAmount: Number(payableAmountInput) || 0,
        status: 'Paid',
        notes: cleanNotes || undefined,
        remarks: cleanNotes || undefined,
        comment: cleanNotes || undefined,
        createdById: currentUser?.id || 'staff',
        createdByName: currentUser?.fullName || 'Accountant',
      });

      addAuditLog(
        'Done Filing Action',
        `Marked ( Done Filing ) for ${actionClient.companyName} (${actionFormCode}) - ${currentPeriodCode}${cleanNotes ? ` [Notes: ${cleanNotes}]` : ''}`,
        currentUser?.id || '',
        currentUser?.fullName || ''
      );

      showToast(`Marked ( Done Filing ) for ${actionClient.companyName} (${actionFormCode})!`);
    } else if (actionChoice === 'RESET') {
      resetPayableAssessment(actionClient.id, actionFormCode, monthStr);
      showToast(`Reset ${actionClient.companyName} (${actionFormCode}) back to Action Pending in To-Do List!`);
    }

    setActionModalOpen(false);
  };

  // Submit Assessment / Create Payable
  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = clients.find(c => c.id === (assessmentClientId || clients[0]?.id));
    if (!targetClient) {
      alert('Please select a client company.');
      return;
    }

    const amount = isNoPaymentChoice ? 0 : Number(assessmentPayableAmount);
    if (!isNoPaymentChoice && (isNaN(amount) || amount <= 0)) {
      alert('Please enter a valid assessment payable amount (greater than ₱0).');
      return;
    }

    const cleanNotes = assessmentNotes.trim();

    addPayable({
      clientId: targetClient.id,
      clientName: targetClient.companyName,
      category: assessmentCategory,
      itemName: assessmentItemName,
      month: assessmentMonth || `${assessmentYear}-${monthNumStr}`,
      year: Number(assessmentYear),
      payableAmount: amount,
      status: isNoPaymentChoice ? 'No Payment' : 'Unpaid',
      notes: cleanNotes || undefined,
      remarks: cleanNotes || undefined,
      comment: cleanNotes || undefined,
      createdById: currentUser?.id || 'staff',
      createdByName: currentUser?.fullName || 'Accountant',
    });

    addAuditLog(
      isNoPaymentChoice ? 'Zero Payment Assessment Created' : 'Payable Assessment Created',
      isNoPaymentChoice 
        ? `Created No Payment Needed / Zero Tax Filed / Need To File assessment for ${targetClient.companyName} (${assessmentCategory} ${assessmentItemName})${cleanNotes ? ` [Reason: ${cleanNotes}]` : ''}`
        : `Created ${assessmentCategory} ${assessmentItemName} payable of ₱${amount.toLocaleString()} for ${targetClient.companyName}${cleanNotes ? ` [Notes: ${cleanNotes}]` : ''}`,
      currentUser?.id || '',
      currentUser?.fullName || ''
    );

    showToast(`Created ${assessmentCategory} (${assessmentItemName}) ${isNoPaymentChoice ? 'No Payment / Zero Tax' : 'Payable'} Assessment for ${targetClient.companyName}!`);
    setShowCreateAssessmentModal(false);
    setIsNoPaymentChoice(false);
    setAssessmentPayableAmount('');
    setAssessmentNotes('');
  };

  // Export PDF To-Do List or Done Filing
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const activeGroups = viewMode === 'DONE_FILING' ? doneFilingGroups : toDoGroups;
    const reportTitle = viewMode === 'DONE_FILING' 
      ? `COMPLETED STATUTORY FILINGS REPORT (${MONTH_FULL_NAMES[selectedMonth]} ${selectedYear})`
      : `MONTHLY STATUTORY DEADLINE TO-DO LIST (${MONTH_FULL_NAMES[selectedMonth]} ${selectedYear})`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle, 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Assigned Accountant: ${selectedStaffName === 'ALL_STAFF' ? 'All Staff Members' : selectedStaffName}`, 14, 24);
    doc.text(`Period Code: ${currentPeriodCode} | Total Groups: ${activeGroups.length}`, 14, 29);

    let y = 36;

    activeGroups.forEach((group) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, y, 182, 10, 2, 2, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`DEADLINE: ${group.formattedDueDate} ( ${group.formCodesStr} ) - ${group.items.length} Companies`, 18, y + 6.5);

      y += 14;

      group.items.forEach((item, index) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${index + 1}. ${item.client.companyName}`, 22, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Period: ${item.periodLabel || currentPeriodCode} | Form: ${item.formCode} | Status: ${item.status}`, 190, y, { align: 'right' });
        y += 5;
      });

      y += 4;
    });

    const filePrefix = viewMode === 'DONE_FILING' ? 'Completed_Filings' : 'Monthly_ToDo_List';
    doc.save(`${filePrefix}_${selectedMonth}_${selectedYear}_${selectedStaffName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 antialiased">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">My Clients - Monthly Deadline To-Do List</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assigned BIR & statutory benefit filings for the current month. Click <strong>Set Action</strong> to enter payable amounts or mark zero payment filings.
          </p>
        </div>

        {/* Controls: Month/Year, Staff Switcher, Export */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 text-xs">
          
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold">
            <Calendar className="w-4 h-4 text-indigo-600 ml-1 shrink-0" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value as any)}
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer text-xs font-bold"
            >
              {MONTHS_LIST.map(m => (
                <option key={m} value={m}>{MONTH_FULL_NAMES[m]}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer text-xs font-bold border-l border-slate-300 pl-1.5"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Staff Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-semibold shrink-0">Staff:</span>
            <select
              value={selectedStaffName}
              onChange={e => setSelectedStaffName(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {isSuperAdmin && <option value="ALL_STAFF">-- All Staff Members --</option>}
              {allUsers.map(u => (
                <option key={u.id} value={u.fullName}>
                  {u.fullName} ({u.position})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (clients.length > 0 && !assessmentClientId) {
                setAssessmentClientId(clients[0].id);
              }
              setAssessmentMonth(`${selectedYear}-${monthNumStr}`);
              setAssessmentYear(selectedYear);
              setShowCreateAssessmentModal(true);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Assessment / Create Payable
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-2 shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" /> Export To-Do List
          </button>
        </div>
      </div>

      {/* Filter & View Mode Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search company or tax form (e.g. 0619e, Company A)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('TO_DO_LIST')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'TO_DO_LIST' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Monthly To-Do List ({pendingCount})
          </button>
          
          <button
            onClick={() => setViewMode('DONE_FILING')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'DONE_FILING' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Done Filing ({doneCount})
          </button>
        </div>

        {/* Client Status Filter Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0 font-bold">
          <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <label htmlFor="myClientsStatusFilter" className="font-bold text-slate-600 shrink-0">Clients:</label>
          <select
            id="myClientsStatusFilter"
            value={clientStatusFilter}
            onChange={e => setClientStatusFilter(e.target.value as 'ALL' | 'Active' | 'For Compliance')}
            className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Clients ({assignedBaseClients.length})</option>
            <option value="Active">Active Clients ({activeClientsCount})</option>
            <option value="For Compliance">For Compliance ({forComplianceClientsCount})</option>
          </select>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              categoryFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Forms
          </button>
          <button
            onClick={() => setCategoryFilter('BIR')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              categoryFilter === 'BIR' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            BIR Tax
          </button>
          <button
            onClick={() => setCategoryFilter('Benefits')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              categoryFilter === 'Benefits' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Benefits
          </button>
        </div>

      </div>

      {/* VIEW MODE 1: REVISED REQUSTED MONTHLY TO-DO LIST */}
      {viewMode === 'TO_DO_LIST' && (
        <div className="space-y-6">
          
          {toDoGroups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Pending To-Do Deadlines Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No active deadlines found for <strong className="text-slate-800">{MONTH_FULL_NAMES[selectedMonth]} {selectedYear}</strong> assigned to {selectedStaffName}.
              </p>
            </div>
          ) : (
            toDoGroups.map((group, groupIdx) => (
              <div 
                key={`${group.dueDateStr}_${groupIdx}`}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-xs"
              >
                {/* Deadline Group Header as Requested in Sample */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        Deadline For {group.formattedDueDate} <span className="text-amber-300 font-mono">({group.formCodesStr})</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Target Month Period: <strong className="text-amber-300 font-mono font-bold">{Array.from(new Set(group.items.map(i => i.periodLabel || currentPeriodCode))).join(' / ')}</strong> <span className="text-slate-300">({targetPeriodInfo.fullName})</span>
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-slate-800/80 border border-slate-700 text-slate-300 font-bold rounded-xl text-[11px] shrink-0">
                    {group.items.length} {group.items.length === 1 ? 'Company' : 'Companies'}
                  </span>
                </div>

                {/* Company Items List under Deadline */}
                <div className="divide-y divide-slate-100">
                  {group.items.map((item, index) => {
                    return (
                      <div 
                        key={`${item.client.id}_${item.formCode}_${index}`}
                        className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                            {index + 1}
                          </span>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{item.client.companyName}</span>

                              {item.client.isBranch ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  Branch ({item.client.branchCode || '001'})
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Main Office
                                </span>
                              )}

                              {item.client.accountingPeriod === 'Fiscal' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={`Fiscal Year Ends in ${item.client.fiscalYearEndMonth || 'June'}`}>
                                  Fiscal ({item.client.fiscalYearEndMonth || 'June'})
                                </span>
                              )}
                              
                              <span className={`px-2 py-0.5 font-mono font-bold rounded text-[10px] ${
                                item.category === 'BIR' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}>
                                {item.formCode}
                              </span>

                              {item.paymentBehavior === 'NEVER_PAYABLE' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                                  <span>📁</span> Filing Only
                                </span>
                              )}

                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded text-[10px] border border-slate-200">
                                Period: {item.periodLabel || currentPeriodCode}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 mt-1">
                              {item.formTitle} • TIN: <span className="font-mono font-bold text-slate-800">{item.client.tinNumber}</span>
                              {item.client.parentClientName && <span className="text-purple-700 font-medium"> • HQ: {item.client.parentClientName}</span>}
                              <span> • Staff: {item.client.assignedStaffName}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge & Requested "Set Action" Button */}
                        <div className="flex items-center gap-3 shrink-0">
                          
                          {/* Current Status Indicator with Enlarged Prominent Amount */}
                          {item.status === 'PAYABLE_LOGGED' && (
                            <div className="text-right flex flex-col items-end">
                              <span className="font-mono font-black text-rose-700 text-sm sm:text-base bg-rose-50 px-3 py-1 rounded-xl border border-rose-200 block shadow-2xs">
                                ₱{item.existingPayable?.payableAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-100/60 px-2 py-0.5 rounded border border-rose-200 mt-0.5">
                                Unpaid Payable
                              </span>
                            </div>
                          )}

                          {item.status === 'NO_PAYMENT' && (
                            <div className="text-right flex flex-col items-end">
                              <span className="font-mono font-black text-amber-800 text-sm sm:text-base bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 block shadow-2xs">
                                ₱0.00
                              </span>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200 mt-0.5 max-w-[240px] text-right">
                                No Payment Needed / Zero Tax Filed / No Need To File
                              </span>
                              {(item.existingPayable?.notes || item.existingPayable?.remarks || item.existingPayable?.comment) && (
                                <span className="text-[9px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 flex items-center gap-1 max-w-[220px] truncate" title={item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {item.status === 'FILED' && (
                            <div className="text-right flex flex-col items-end">
                              <span className="font-mono font-black text-emerald-800 text-sm sm:text-base bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 block shadow-2xs">
                                ₱{item.existingPayable?.payableAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200 mt-0.5">
                                {item.paymentBehavior === 'NEVER_PAYABLE' || !isPayableObligation(item.formCode) ? '( Done Filing )' : 'Filed & Completed'}
                              </span>
                              {(item.existingPayable?.notes || item.existingPayable?.remarks || item.existingPayable?.comment) && (
                                <span className="text-[9px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5 flex items-center gap-1 max-w-[220px] truncate" title={item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {item.status === 'NO_ACTION' && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 font-bold rounded-lg text-[10px] italic">
                              Action Pending
                            </span>
                          )}

                          {/* Requested SET ACTION Button */}
                          <button
                            onClick={() => handleOpenSetAction(item)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" /> Set Action
                          </button>

                          <button
                            onClick={() => onSelectClientWorkspace(item.client.id)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs"
                            title="Open Client Profile Workspace"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

        </div>
      )}

      {/* VIEW MODE 2: DONE FILING VIEW ⭐ */}
      {viewMode === 'DONE_FILING' && (
        <div className="space-y-6">
          {doneFilingGroups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <Clock className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Done Filings Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No completed or actioned filings recorded for <strong className="text-slate-800">{MONTH_FULL_NAMES[selectedMonth]} {selectedYear}</strong> assigned to {selectedStaffName}. Set actions on items in the Monthly To-Do List to move them here.
              </p>
            </div>
          ) : (
            doneFilingGroups.map((group, groupIdx) => (
              <div 
                key={`${group.dueDateStr}_${groupIdx}`}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-xs"
              >
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        Done Filings for {group.formattedDueDate} <span className="text-emerald-300 font-mono">({group.formCodesStr})</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Target Month Period: <strong className="text-emerald-300 font-mono font-bold">{Array.from(new Set(group.items.map(i => i.periodLabel || currentPeriodCode))).join(' / ')}</strong> <span className="text-slate-300">({targetPeriodInfo.fullName})</span>
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-bold rounded-xl text-[11px] shrink-0">
                    {group.items.length} {group.items.length === 1 ? 'Filing Completed' : 'Filings Completed'}
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {group.items.map((item, index) => (
                    <div 
                      key={`${item.client.id}_${item.formCode}_${index}`}
                      className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                          ✓
                        </span>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{item.client.companyName}</span>

                            {item.client.isBranch ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Branch ({item.client.branchCode || '001'})
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Main Office
                              </span>
                            )}
                            
                            <span className={`px-2 py-0.5 font-mono font-bold rounded text-[10px] ${
                              item.category === 'BIR' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}>
                              {item.formCode}
                            </span>

                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded text-[10px] border border-slate-200">
                              Period: {item.periodLabel || currentPeriodCode}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 mt-1">
                            {item.formTitle} • TIN: <span className="font-mono font-bold text-slate-800">{item.client.tinNumber}</span>
                            {item.client.parentClientName && <span className="text-purple-700 font-medium"> • HQ: {item.client.parentClientName}</span>}
                            <span> • Staff: {item.client.assignedStaffName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Badge & Action Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        {item.status === 'PAYABLE_LOGGED' && (
                          <div className="text-right">
                            <span className={`font-mono font-bold text-xs block ${
                              (item.existingPayable?.payableAmount || 0) < 0 ? 'text-rose-600' : 'text-indigo-700'
                            }`}>
                              {(item.existingPayable?.payableAmount || 0) < 0 ? '' : '₱'}{item.existingPayable?.payableAmount?.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Payable Assessed
                            </span>
                          </div>
                        )}

                        {item.status === 'NO_PAYMENT' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-lg text-[10px] flex items-center gap-1">
                              <Ban className="w-3 h-3 text-amber-600 shrink-0" /> No Payment Needed / Zero Tax Filed / No Need To File
                            </span>
                            {(item.existingPayable?.notes || item.existingPayable?.remarks || item.existingPayable?.comment) && (
                              <span className="text-[9px] text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 max-w-[220px] truncate" title={item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment}>
                                <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {item.status === 'FILED' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {item.paymentBehavior === 'NEVER_PAYABLE' || !isPayableObligation(item.formCode) ? '( Done Filing )' : 'Filed & Completed'}
                            </span>
                            {(item.existingPayable?.notes || item.existingPayable?.remarks || item.existingPayable?.comment) && (
                              <span className="text-[9px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1 max-w-[220px] truncate" title={item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment}>
                                <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{item.existingPayable.notes || item.existingPayable.remarks || item.existingPayable.comment}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {item.status === 'FILED' && !isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => showToast('Only Admin users are allowed to modify items tagged as Filed & Completed.')}
                            className="px-3.5 py-2 bg-slate-100 text-slate-400 border border-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed opacity-80"
                            title="Only Admin is allowed to modify Filed & Completed items"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" /> Locked (Admin Only)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSetAction(item)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Modify Action or Reset back to To-Do List"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" /> Modify Action
                          </button>
                        )}

                        <button
                          onClick={() => onSelectClientWorkspace(item.client.id)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs"
                          title="Open Client Profile Workspace"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SET ACTION MODAL (Entering Payable or Zero Payment) */}
      {actionModalOpen && actionClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl">
                  <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Set Action for {actionFormCode}</h3>
                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span>{actionClient.companyName}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-bold text-[11px]">
                      Target Month Period: {actionPeriodLabel || currentPeriodCode}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="space-y-4">
              
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Company / Client Profile</label>
                <input
                  type="text"
                  readOnly
                  value={`${actionClient.companyName} (${actionClient.isBranch ? `Branch ${actionClient.branchCode || '001'}` : 'Main Office'})`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                />
              </div>

              {/* Action Choices Radio Selector */}
              <div className="space-y-2">
                <label className="block text-slate-900 font-bold text-xs">Select Action Type:</label>

                {(() => {
                  const isNeverPayable = !isPayableObligation(actionFormCode);
                  if (isNeverPayable) {
                    return (
                      <div className="space-y-2">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                          <span className="text-base">📁</span>
                          <div>
                            <p className="font-bold">Filing / Submission Only (Never Payable)</p>
                            <p className="text-[11px] text-amber-800">This compliance requirement (e.g. SAWT, QAP, AT RELIEF, SLSP, 1604) is strictly for document submission or schedule filing with no tax payment obligation.</p>
                          </div>
                        </div>

                        {viewMode === 'DONE_FILING' ? (
                          <>
                            <div 
                              onClick={() => setActionChoice('RESET')}
                              className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                actionChoice === 'RESET' 
                                  ? 'bg-amber-50/80 border-amber-500 text-slate-900 ring-2 ring-amber-200' 
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs block text-amber-900">
                                  Cancel submission status / reset to action pending
                                </span>
                                <p className="text-[11px] text-slate-500">Removes logged status and returns item back to To-Do List.</p>
                              </div>
                              {actionChoice === 'RESET' && <Check className="w-5 h-5 text-amber-600 shrink-0" />}
                            </div>

                            <div 
                              onClick={() => setActionChoice('FILED')}
                              className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                actionChoice === 'FILED' 
                                  ? 'bg-emerald-50/80 border-emerald-500 text-slate-900 ring-2 ring-emerald-200' 
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs block text-emerald-900">
                                  1. ( Done Filing )
                                </span>
                                <p className="text-[11px] text-slate-500">Confirms that this schedule/attachment has been filed and submitted.</p>
                              </div>
                              {actionChoice === 'FILED' && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
                            </div>

                            <div 
                              onClick={() => setActionChoice('NO_PAYMENT')}
                              className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                actionChoice === 'NO_PAYMENT' 
                                  ? 'bg-amber-50/80 border-amber-500 text-slate-900 ring-2 ring-amber-200' 
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs block text-amber-900">
                                  2. No Payment Needed / Zero Tax Filed / No Need To File
                                </span>
                                <p className="text-[11px] text-slate-500">Marks as zero filing or no need to file (e.g. Nothing to Relief / SAWT, Nil return, etc.).</p>
                              </div>
                              {actionChoice === 'NO_PAYMENT' && <Check className="w-5 h-5 text-amber-600 shrink-0" />}
                            </div>
                          </>
                        ) : (
                          <>
                            <div 
                              onClick={() => setActionChoice('FILED')}
                              className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                actionChoice === 'FILED' 
                                  ? 'bg-emerald-50/80 border-emerald-500 text-slate-900 ring-2 ring-emerald-200' 
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs block text-emerald-900">
                                  1. ( Done Filing )
                                </span>
                                <p className="text-[11px] text-slate-500">Confirms that this schedule/attachment has been filed and submitted.</p>
                              </div>
                              {actionChoice === 'FILED' && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
                            </div>

                            <div 
                              onClick={() => setActionChoice('NO_PAYMENT')}
                              className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                actionChoice === 'NO_PAYMENT' 
                                  ? 'bg-amber-50/80 border-amber-500 text-slate-900 ring-2 ring-amber-200' 
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs block text-amber-900">
                                  2. No Payment Needed / Zero Tax Filed / No Need To File
                                </span>
                                <p className="text-[11px] text-slate-500">Marks as zero filing or no need to file (e.g. Nothing to Relief / SAWT, Nil return, etc.).</p>
                              </div>
                              {actionChoice === 'NO_PAYMENT' && <Check className="w-5 h-5 text-amber-600 shrink-0" />}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <>
                      <div 
                        onClick={() => setActionChoice('PAYABLE')}
                        className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                          actionChoice === 'PAYABLE' 
                            ? 'bg-indigo-50/80 border-indigo-500 text-slate-900 ring-2 ring-indigo-200' 
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs block text-slate-900">1. Enter Payable Amount (₱)</span>
                          <p className="text-[11px] text-slate-500">Creates an assessment payable record for client billing & settlement.</p>
                        </div>
                        {actionChoice === 'PAYABLE' && <Check className="w-5 h-5 text-indigo-600 shrink-0" />}
                      </div>

                      {actionCategory === 'BIR' && (
                        <div 
                          onClick={() => setActionChoice('EXCESS_INPUT')}
                          className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            actionChoice === 'EXCESS_INPUT' 
                              ? 'bg-purple-50/80 border-purple-500 text-slate-900 ring-2 ring-purple-200' 
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs block text-purple-900">2. Excess Input (Negative Payable Amount)</span>
                            <p className="text-[11px] text-slate-500">Converts amount to negative (e.g. input 1,000 becomes -1,000 payable credit).</p>
                          </div>
                          {actionChoice === 'EXCESS_INPUT' && <Check className="w-5 h-5 text-purple-600 shrink-0" />}
                        </div>
                      )}

                      {viewMode === 'DONE_FILING' ? (
                        <div 
                          onClick={() => setActionChoice('RESET')}
                          className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            actionChoice === 'RESET' 
                              ? 'bg-amber-50/80 border-amber-500 text-slate-900 ring-2 ring-amber-200' 
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs block text-amber-900">
                              {actionCategory === 'BIR' ? '3. Cancel choice / reset to action pending' : '2. Cancel choice / reset to action pending'}
                            </span>
                            <p className="text-[11px] text-slate-500">Removes logged assessment and returns item back to To-Do List.</p>
                          </div>
                          {actionChoice === 'RESET' && <Check className="w-5 h-5 text-amber-600 shrink-0" />}
                        </div>
                      ) : (
                        <div 
                          onClick={() => setActionChoice('NO_PAYMENT')}
                          className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            actionChoice === 'NO_PAYMENT' 
                              ? 'bg-emerald-50/80 border-emerald-500 text-slate-900 ring-2 ring-emerald-200' 
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs block text-emerald-900">
                              {actionCategory === 'BIR' ? '3. No Payment Needed / Zero Tax Filed / No Need To File' : '2. No Payment Needed / Zero Tax Filed / No Need To File'}
                            </span>
                            <p className="text-[11px] text-slate-500">Marks this return as filed with zero payment / no tax due, or no filing required for this period.</p>
                          </div>
                          {actionChoice === 'NO_PAYMENT' && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tagging payables as PAID is performed in Payables Management.</span>
                </div>
              </div>

              {/* Amount Input (Prominent & Larger Text) */}
              {actionChoice === 'PAYABLE' && isPayableObligation(actionFormCode) && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 space-y-1.5">
                  <label className="block text-indigo-950 font-extrabold text-sm">
                    Enter Assessed Payable Amount (₱) *
                  </label>
                  <div className="relative">
                    <CurrencyInput
                      placeholder="0.00"
                      value={payableAmountInput}
                      onChange={val => setPayableAmountInput(String(val))}
                      className="w-full bg-white border-2 border-indigo-500 rounded-xl px-4 py-3 text-slate-900 font-mono font-black text-xl shadow-xs focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Specify the assessed tax or statutory benefit payable for {actionFormCode}.
                  </p>
                </div>
              )}

              {actionChoice === 'EXCESS_INPUT' && isPayableObligation(actionFormCode) && (
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-1.5">
                  <label className="block text-purple-950 font-extrabold text-sm">
                    Enter Excess Input Amount (Will convert to -₱) *
                  </label>
                  <div className="relative">
                    <CurrencyInput
                      placeholder="0.00"
                      value={payableAmountInput}
                      onChange={val => setPayableAmountInput(String(val))}
                      className="w-full bg-white border-2 border-purple-500 rounded-xl px-4 py-3 text-purple-950 font-mono font-black text-xl shadow-xs focus:outline-none focus:ring-4 focus:ring-purple-100"
                    />
                  </div>
                  {payableAmountInput && Number(payableAmountInput) > 0 && (
                    <p className="text-[11px] text-purple-700 font-bold">
                      Note: Will be saved as -₱{Number(payableAmountInput).toLocaleString()} credit.
                    </p>
                  )}
                </div>
              )}

              {/* Comment / Reason Box (Ex. Nothing to Relief / SAWT, Nil return, etc.) */}
              {(actionChoice === 'NO_PAYMENT' || (!isPayableObligation(actionFormCode) && actionChoice !== 'RESET')) && (
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-amber-950 font-bold text-xs flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                      Comment / Reason Box (Ex. Nothing to Relief / SAWT, Nil return, etc.):
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Optional Note
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    placeholder="Ex. Nothing to Relief / SAWT, Nil return, Zero gross sales, Non-taxable period, etc."
                    className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-xl px-3.5 py-2 text-slate-900 text-xs shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-200 placeholder:text-slate-400 font-medium"
                  />

                  {/* Quick Suggestions / Presets */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Quick Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Nothing to Relief / SAWT',
                        'Zero Tax Due / Nil Return',
                        'Excess Input Credit Carried Over',
                        'No Transactions / Inactive Period',
                        'Filing / Attachment Only',
                        'Exempt / Non-Taxable'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setActionNotes(preset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                            actionNotes === preset
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-200'
                          }`}
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Action
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Monthly Assessment / Payable */}
      {showCreateAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                Create Monthly Assessment / Payable
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateAssessmentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4">
              <div>
                <SearchableClientSelect
                  clients={clients}
                  selectedClientId={assessmentClientId || clients[0]?.id || ''}
                  onSelectClient={setAssessmentClientId}
                  label="Select Client Company"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Assessment Category</label>
                  <select
                    value={assessmentCategory}
                    onChange={e => {
                      const cat = e.target.value as PayableCategory;
                      setAssessmentCategory(cat);
                      setAssessmentItemName(cat === 'BIR' ? '0619E' : 'SSS Contribution');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                  >
                    <option value="BIR">BIR Statutory Tax</option>
                    <option value="Benefits">Employee Benefits</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Item / Tax Form</label>
                  <select
                    value={assessmentItemName}
                    onChange={e => setAssessmentItemName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                  >
                    {assessmentCategory === 'BIR' ? (
                      masterChoices.birTaxOptions && masterChoices.birTaxOptions.length > 0 ? (
                        masterChoices.birTaxOptions
                          .filter(opt => isPayableObligation(opt.code, opt))
                          .map((opt, idx) => (
                            <option key={`bir_${opt.id}_${idx}`} value={opt.code}>{opt.code} - {opt.name}</option>
                          ))
                      ) : (
                        <>
                          <option value="0619E">0619E Withholding Expanded</option>
                          <option value="1601EQ">1601EQ Quarterly</option>
                          <option value="2550Q">2550Q VAT Return</option>
                          <option value="1701Q">1701Q Income Tax</option>
                          <option value="1702Q">1702Q Corporate Tax</option>
                          <option value="ITR">Annual ITR</option>
                        </>
                      )
                    ) : (
                      masterChoices.benefitsOptions && masterChoices.benefitsOptions.length > 0 ? (
                        masterChoices.benefitsOptions
                          .filter(opt => isPayableObligation(opt.code, opt))
                          .map((opt, idx) => (
                            <option key={`ben_${opt.id}_${idx}`} value={opt.code}>{opt.code} - {opt.name}</option>
                          ))
                      ) : (
                        <>
                          <option value="SSS Contribution">SSS Contribution</option>
                          <option value="SSS Salary Loan">SSS Salary Loan</option>
                          <option value="HDMF Contribution">Pag-IBIG Contribution</option>
                          <option value="HDMF Loan">Pag-IBIG Housing Loan</option>
                          <option value="PhilHealth Cont.">PhilHealth Contribution</option>
                        </>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Applicable Month (YYYY-MM)</label>
                  <input
                    type="month"
                    value={assessmentMonth}
                    onChange={e => setAssessmentMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Year</label>
                  <input
                    type="number"
                    value={assessmentYear}
                    onChange={e => setAssessmentYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* No Payment Choice Checkbox */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
                  <input
                    type="checkbox"
                    checked={isNoPaymentChoice}
                    onChange={e => setIsNoPaymentChoice(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>Choice: No Payment Needed / Zero Tax Filed / No Need To File for this month</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                  Check this if the client has zero tax due, schedule submission only (e.g. SAWT/Relief), or no payment required for this specific filing period.
                </p>
              </div>

              {/* Comment / Reason Box for Create Assessment */}
              {isNoPaymentChoice && (
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-amber-950 font-bold text-xs flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                      Comment / Reason Box (Ex. Nothing to Relief / SAWT, Nil return, etc.):
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-full">
                      Optional Note
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    value={assessmentNotes}
                    onChange={e => setAssessmentNotes(e.target.value)}
                    placeholder="Ex. Nothing to Relief / SAWT, Nil return, Zero gross sales, Non-taxable period, etc."
                    className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-xl px-3 py-2 text-slate-900 text-xs shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-200 placeholder:text-slate-400 font-medium"
                  />

                  {/* Quick Suggestions / Presets */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Quick Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Nothing to Relief / SAWT',
                        'Zero Tax Due / Nil Return',
                        'Excess Input Credit Carried Over',
                        'No Transactions / Inactive Period',
                        'Filing / Attachment Only',
                        'Exempt / Non-Taxable'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAssessmentNotes(preset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                            assessmentNotes === preset
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-200'
                          }`}
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Payable Amount Input */}
              {!isNoPaymentChoice && (
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Assessment Payable Amount (₱) *</label>
                  <CurrencyInput
                    required={!isNoPaymentChoice}
                    placeholder="19,000.00"
                    value={assessmentPayableAmount}
                    onChange={val => setAssessmentPayableAmount(String(val))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateAssessmentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
