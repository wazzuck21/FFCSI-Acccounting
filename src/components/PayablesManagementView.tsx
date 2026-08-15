import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PayableRecord, PayableCategory, CustomDeadlineRule, ClientProfile } from '../types';
import { 
  MONTHS_LIST, 
  MONTH_FULL_NAMES 
} from '../data/masterTables';
import { calculateClientDeadline, isPayableObligation } from '../utils/deadlineEngine';
import { CurrencyInput } from './CurrencyInput';
import { SearchableClientSelect } from './SearchableClientSelect';
import { 
  Receipt, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Filter, 
  Search, 
  Building2, 
  Calendar, 
  DollarSign,
  Lock,
  RotateCcw,
  Edit2,
  History,
  X,
  Check
} from 'lucide-react';

export const PayablesManagementView: React.FC = () => {
  const { 
    clients, 
    payables, 
    addPayable, 
    tagPayablePaid, 
    amendPayablePayment,
    cancelPayablePayment,
    deletePayable,
    masterChoices, 
    addAuditLog 
  } = useData();

  const { isSuperAdmin, currentUser } = useAuth();

  // Current real month and year formatted string defaults
  const currentRealMonthStr = `-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentRealYearStr = String(new Date().getFullYear());

  // Helper: Calculate Applicable Month / Target Period based on Deadline Matrix
  const getApplicablePeriodFromMatrix = (itemCode: string, monthStr: string, client?: ClientProfile) => {
    if (!monthStr) return 'N/A';

    let yearNum = new Date().getFullYear();
    let monthCode: 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec' = MONTHS_LIST[new Date().getMonth()];

    if (monthStr.includes('-')) {
      const parts = monthStr.split('-').filter(Boolean);
      if (parts.length === 2) {
        yearNum = parseInt(parts[0], 10) || yearNum;
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthCode = MONTHS_LIST[mIdx];
        }
      } else if (parts.length === 1) {
        const mIdx = parseInt(parts[0], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthCode = MONTHS_LIST[mIdx];
        }
      }
    } else {
      const monthKey = Object.keys(MONTH_FULL_NAMES).find(
        k => k.toLowerCase() === monthStr.toLowerCase() || MONTH_FULL_NAMES[k].toLowerCase() === monthStr.toLowerCase()
      );
      if (monthKey && MONTHS_LIST.includes(monthKey as any)) {
        monthCode = monthKey as any;
      }
    }

    const allRules: CustomDeadlineRule[] = [
      ...(masterChoices.birTaxOptions || []),
      ...(masterChoices.benefitsOptions || [])
    ];

    let rule = allRules.find(r => r.code.toLowerCase() === itemCode.toLowerCase());

    if (!rule) {
      const codeUpper = itemCode.toUpperCase();
      let frequency: 'Monthly' | 'Quarterly' | 'Annually' = 'Monthly';
      if (codeUpper.includes('Q') || codeUpper.includes('QUARTER')) frequency = 'Quarterly';
      if (codeUpper === 'ITR' || codeUpper.includes('ANNUAL') || codeUpper.includes('1702') || codeUpper.includes('1701')) frequency = 'Annually';

      rule = {
        id: itemCode,
        code: itemCode,
        name: itemCode,
        category: 'BIR',
        frequency,
        deadlineDay: 10,
        customDescription: ''
      };
    }

    if (client) {
      const res = calculateClientDeadline({
        client,
        rule,
        month: monthCode,
        year: yearNum,
        masterChoices
      });
      if (res && res.taxablePeriod && res.taxablePeriod !== 'N/A' && res.taxablePeriod !== 'Not Required') {
        return res.taxablePeriod;
      }
    }

    const mIdx = MONTHS_LIST.indexOf(monthCode);
    if (mIdx >= 0) {
      const prevM = mIdx === 0 ? `Dec-${String(yearNum - 1).slice(-2)}` : `${MONTHS_LIST[mIdx - 1]}-${String(yearNum).slice(-2)}`;
      return prevM;
    }

    return monthStr;
  };

  // Create Payable Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [category, setCategory] = useState<PayableCategory>('BIR');
  const [itemName, setItemName] = useState('0619E');
  const [month, setMonth] = useState(`${currentRealYearStr}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isNoPaymentChoice, setIsNoPaymentChoice] = useState(false);
  const [payableAmount, setPayableAmount] = useState<number>(1000);

  // Super Admin Tag Paid Modal State
  const [showTagPaidModal, setShowTagPaidModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<PayableRecord | null>(null);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'Bank' | 'Maya' | 'GCash' | 'Check' | 'Cash'>('Bank');
  const [bankName, setBankName] = useState(masterChoices.banksList[0] || 'BDO Unibank');
  const [enteredAmountPaid, setEnteredAmountPaid] = useState<number>(0);
  const [refNumber, setRefNumber] = useState('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');

  // Modify Payment Tag Modal State
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyPayable, setModifyPayable] = useState<PayableRecord | null>(null);
  const [modifyPaidDate, setModifyPaidDate] = useState('');
  const [modifyPaymentMethod, setModifyPaymentMethod] = useState<'Bank' | 'Maya' | 'GCash' | 'Check' | 'Cash'>('Bank');
  const [modifyBankName, setModifyBankName] = useState('');
  const [modifyRefNumber, setModifyRefNumber] = useState('');
  const [modifyAmountPaid, setModifyAmountPaid] = useState<number>(0);
  const [modifyNotes, setModifyNotes] = useState('');

  // Modify History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPayable, setHistoryPayable] = useState<PayableRecord | null>(null);

  // Custom Modal States & Toast Notifications
  const [showRevokeConfirmModal, setShowRevokeConfirmModal] = useState(false);
  const [revokePayableTarget, setRevokePayableTarget] = useState<PayableRecord | null>(null);

  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetPayableTarget, setResetPayableTarget] = useState<PayableRecord | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Table Filters & Sort (Always default to All Categories, Unpaid/Awaiting Payment, Current Month & Year) ⭐
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'BIR' | 'Benefits'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Unpaid' | 'Paid' | 'No Payment'>('Unpaid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMonth, setSortMonth] = useState<string>(currentRealMonthStr);
  const [sortYear, setSortYear] = useState<string>(currentRealYearStr);
  const [sortItem, setSortItem] = useState<string>('ALL');

  // Dynamic Item Names from Master BIR & Benefits options + Payables history (Excluding NEVER_PAYABLE items)
  const availableItemNames = React.useMemo(() => {
    const set = new Set<string>();
    (masterChoices.birTaxOptions || []).filter(o => isPayableObligation(o.code, o)).forEach(o => set.add(o.code));
    (masterChoices.benefitsOptions || []).filter(o => isPayableObligation(o.code, o)).forEach(o => set.add(o.code));
    payables.forEach(p => {
      if (p.itemName && isPayableObligation(p.itemName)) set.add(p.itemName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterChoices, payables]);

  // Open Modify Payment Modal
  const handleOpenModifyModal = (p: PayableRecord) => {
    setModifyPayable(p);
    setModifyPaidDate(p.paymentDetails?.paidDate || new Date().toISOString().substring(0, 10));
    setModifyPaymentMethod(p.paymentDetails?.paymentMethod || 'Bank');
    setModifyBankName(p.paymentDetails?.bankName || masterChoices.banksList[0] || 'BDO Unibank');
    setModifyRefNumber(p.paymentDetails?.referenceNumber || '');
    setModifyAmountPaid(p.paymentDetails?.amountPaid || p.payableAmount);
    setModifyNotes('');
    setShowModifyModal(true);
  };

  // Submit Payment Modifications
  const handleSaveModificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyPayable) return;

    const updatedPayment: NonNullable<PayableRecord['paymentDetails']> = {
      paidDate: modifyPaidDate,
      paymentMethod: modifyPaymentMethod,
      bankName: modifyPaymentMethod === 'Bank' ? modifyBankName : undefined,
      amountPaid: Number(modifyAmountPaid),
      taggedById: currentUser?.id || 'admin',
      taggedByName: currentUser?.fullName || 'User',
      referenceNumber: modifyRefNumber,
      notes: modifyNotes
    };

    const detailsStr = modifyNotes.trim()
      ? `Modified details: ${modifyNotes}`
      : `Updated payment details (Paid Date: ${modifyPaidDate}, Amount: ₱${Number(modifyAmountPaid).toLocaleString()}, Ref: ${modifyRefNumber || 'N/A'})`;

    amendPayablePayment(modifyPayable.id, updatedPayment, detailsStr, currentUser?.fullName || 'User');
    setShowModifyModal(false);
    triggerToast(`Payment tag details successfully modified for ${modifyPayable.clientName} (${modifyPayable.itemName})!`);
  };

  // Revoke / Reset Payment Tag inside Modify Modal
  const handleRevokePaymentInModal = () => {
    if (!modifyPayable) return;
    setRevokePayableTarget(modifyPayable);
    setShowRevokeConfirmModal(true);
  };

  const confirmRevokePayment = () => {
    if (!revokePayableTarget) return;
    const reason = modifyNotes.trim() || 'Re-audit / Revoked payment tag by admin';
    cancelPayablePayment(revokePayableTarget.id, reason, currentUser?.fullName || 'User');
    setShowRevokeConfirmModal(false);
    setShowModifyModal(false);
    triggerToast(`Payment tag revoked for ${revokePayableTarget.clientName}. Item returned to Unpaid status.`);
    setRevokePayableTarget(null);
  };

  // Handle Delete / Reset Payable Assessment
  const handleDeletePayableAssessment = (p: PayableRecord) => {
    setResetPayableTarget(p);
    setShowResetConfirmModal(true);
  };

  const confirmResetAssessment = () => {
    if (!resetPayableTarget) return;
    deletePayable(resetPayableTarget.id);
    setShowResetConfirmModal(false);
    triggerToast(`Assessment for ${resetPayableTarget.clientName} (${resetPayableTarget.itemName}) reset. Returned to Action Pending.`);
    setResetPayableTarget(null);
  };

  // Handle create payable submission
  const handleCreatePayable = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = clients.find(c => c.id === selectedClientId);
    if (!targetClient) return;

    addPayable({
      clientId: targetClient.id,
      clientName: targetClient.companyName,
      category,
      itemName,
      month,
      year: Number(year),
      payableAmount: isNoPaymentChoice ? 0 : Number(payableAmount),
      status: isNoPaymentChoice ? 'No Payment' : 'Unpaid',
      createdById: currentUser?.id || 'user_staff_1',
      createdByName: currentUser?.fullName || 'Staff User',
    });

    addAuditLog(
      'Payable Assessment Created', 
      `Created ${category} ${itemName} payable of ₱${isNoPaymentChoice ? 0 : payableAmount} for ${targetClient.companyName}`, 
      currentUser?.id || '', 
      currentUser?.fullName || ''
    );

    setShowCreateModal(false);
    setIsNoPaymentChoice(false);
  };

  // Open Tag Paid Modal (SUPER ADMIN ONLY)
  const handleOpenTagPaidModal = (p: PayableRecord) => {
    if (!isSuperAdmin) {
      alert('Only Super Admin accounts can verify and tag payables as PAID.');
      return;
    }
    setSelectedPayable(p);
    setEnteredAmountPaid('' as any);
    setRefNumber('');
    setPaymentErrorMessage('');
    setShowTagPaidModal(true);
  };

  // Handle Tag Paid Verification Submit
  const handleVerifyPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;

    const result = tagPayablePaid(selectedPayable.id, {
      paidDate,
      paymentMethod,
      bankName: paymentMethod === 'Bank' ? bankName : undefined,
      amountPaid: Number(enteredAmountPaid),
      taggedById: currentUser?.id || '',
      taggedByName: currentUser?.fullName || '',
      referenceNumber: refNumber,
    });

    if (!result.success) {
      setPaymentErrorMessage(result.message);
      return;
    }

    addAuditLog(
      'Payment Tagged & Verified',
      `Verified payment of ₱${enteredAmountPaid} for ${selectedPayable.clientName} (${selectedPayable.itemName})`,
      currentUser?.id || '',
      currentUser?.fullName || ''
    );

    setShowTagPaidModal(false);
  };

  // Filter & Sort Payables List: Always prioritize Unpaid/Awaiting Payment at top, sorted dynamically by Item Name ⭐
  const filteredPayables = React.useMemo(() => {
    return payables.filter(p => {
      // Items tagged as Excess Input, No Payment, or NEVER_PAYABLE forms (e.g. SAWT, QAP) do not go to Monthly Assessment & Payables Engine
      if (p.status === 'No Payment' || (p.payableAmount !== undefined && p.payableAmount <= 0) || !isPayableObligation(p.itemName)) {
        return false;
      }

      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchSearch = p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || p.itemName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMonth = sortMonth === 'ALL' || p.month.includes(sortMonth);
      const matchYear = sortYear === 'ALL' || String(p.year) === sortYear;
      const matchItem = sortItem === 'ALL' || p.itemName === sortItem;

      return matchCategory && matchStatus && matchSearch && matchMonth && matchYear && matchItem;
    }).sort((a, b) => {
      // 1. Unpaid / Awaiting Payment prioritized at the very top
      if (a.status === 'Unpaid' && b.status !== 'Unpaid') return -1;
      if (a.status !== 'Unpaid' && b.status === 'Unpaid') return 1;

      // 2. Sort combined categories dynamically by Item Name alphabetically
      const itemCompare = a.itemName.localeCompare(b.itemName);
      if (itemCompare !== 0) return itemCompare;

      // 3. Secondary sort by Client Name
      return a.clientName.localeCompare(b.clientName);
    });
  }, [payables, categoryFilter, statusFilter, searchQuery, sortMonth, sortYear, sortItem]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            Monthly Assessment & Payables Engine (BIR & Benefits)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Create monthly statutory payables for clients. Super Admins verify payment amounts & methods before marking as PAID.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-sm text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Assessment / Create Payable
        </button>
      </div>

      {/* Filter and Sorting Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search client or tax item..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-medium"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">All Categories (BIR & Benefits)</option>
            <option value="BIR">BIR Taxes Only</option>
            <option value="Benefits">Benefits Only</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Unpaid">Unpaid / Awaiting Payment</option>
            <option value="Paid">Verified & Paid</option>
            <option value="No Payment">No Payment For Month</option>
          </select>
        </div>

        {/* Filter by Month */}
        <div>
          <select
            value={sortMonth}
            onChange={e => setSortMonth(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 font-bold"
          >
            <option value="ALL">All Months</option>
            <option value="-01">01 - January</option>
            <option value="-02">02 - February</option>
            <option value="-03">03 - March</option>
            <option value="-04">04 - April</option>
            <option value="-05">05 - May</option>
            <option value="-06">06 - June</option>
            <option value="-07">07 - July</option>
            <option value="-08">08 - August</option>
            <option value="-09">09 - September</option>
            <option value="-10">10 - October</option>
            <option value="-11">11 - November</option>
            <option value="-12">12 - December</option>
          </select>
        </div>

        {/* Dynamic Sort by Item Name (Combined BIR & Benefits Forms) ⭐ */}
        <div>
          <select
            value={sortItem}
            onChange={e => setSortItem(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 font-bold"
          >
            <option value="ALL">Sort By Item Name (All Forms)</option>
            {availableItemNames.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        {/* Sort by Year */}
        <div>
          <select
            value={sortYear}
            onChange={e => setSortYear(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 font-bold"
          >
            <option value="ALL">All Years</option>
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Payables Records Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Applicable Month</th>
                <th className="py-3 px-4 text-right">Payable Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Payment Details / Verification</th>
                <th className="py-3 px-4 text-center">Super Admin Tagging</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredPayables.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  <td className="py-3.5 px-4 font-bold text-slate-900">{p.clientName}</td>
                  
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.category === 'BIR' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {p.category}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-800">{p.itemName}</td>

                  <td className="py-3.5 px-4 text-slate-800">
                    <div className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg text-xs inline-block">
                      {getApplicablePeriodFromMatrix(p.itemName, p.month, clients.find(c => c.id === p.clientId))}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Filing Month: {p.month}</p>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                    ₱{p.payableAmount.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      p.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : p.status === 'Unpaid'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {p.status}
                    </span>
                  </td>

                  {/* Payment Info */}
                  <td className="py-3.5 px-4 text-[11px] text-slate-600">
                    {p.status === 'Paid' && p.paymentDetails ? (
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-700">
                          {p.paymentDetails.paymentMethod} {p.paymentDetails.bankName ? `(${p.paymentDetails.bankName})` : ''}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Paid: {p.paymentDetails.paidDate} • Verified by {p.paymentDetails.taggedByName}
                          {p.paymentDetails.referenceNumber ? ` • Ref: ${p.paymentDetails.referenceNumber}` : ''}
                        </p>

                        {/* Modify History Trigger */}
                        {p.amendedHistory && p.amendedHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryPayable(p);
                              setShowHistoryModal(true);
                            }}
                            className="mt-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <History className="w-3 h-3 text-amber-600" />
                            <span>Modify History ({p.amendedHistory.length})</span>
                          </button>
                        )}
                      </div>
                    ) : p.status === 'No Payment' ? (
                      <div className="space-y-0.5">
                        <span className="text-amber-800 font-bold block text-[11px]">No Payment Needed / Zero Tax Filed / No Need To File</span>
                        {(p.notes || p.remarks || p.comment) ? (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block max-w-xs truncate" title={p.notes || p.remarks || p.comment}>
                            Note: {p.notes || p.remarks || p.comment}
                          </span>
                        ) : (
                          <span className="italic text-slate-400 text-[10px]">Nil return / zero tax filed</span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-amber-700 font-bold block">Awaiting Super Admin Payment</span>
                        {p.amendedHistory && p.amendedHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryPayable(p);
                              setShowHistoryModal(true);
                            }}
                            className="mt-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <History className="w-3 h-3 text-amber-600" />
                            <span>Modify History ({p.amendedHistory.length})</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Tag Paid / Modify Button */}
                  <td className="py-3.5 px-4 text-center">
                    {p.status === 'Unpaid' ? (
                      <button
                        onClick={() => handleOpenTagPaidModal(p)}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 mx-auto ${
                          isSuperAdmin 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        {isSuperAdmin ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" /> Tag as Paid
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> Admin Only
                          </>
                        )}
                      </button>
                    ) : p.status === 'Paid' ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-emerald-600 font-bold text-[10px] flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleOpenModifyModal(p)}
                            title="Modify Payment Tag & Details"
                            className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" /> Modify
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">-</span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Payable Assessment */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs shadow-xl text-slate-800 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600" />
              Create Monthly Assessment / Payable
            </h3>

            <div>
              <SearchableClientSelect
                clients={clients}
                selectedClientId={selectedClientId}
                onSelectClient={setSelectedClientId}
                label="Select Client Company"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Assessment Category</label>
                <select
                  value={category}
                  onChange={e => {
                    const cat = e.target.value as PayableCategory;
                    setCategory(cat);
                    setItemName(cat === 'BIR' ? '0619E' : 'SSS Contribution');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 font-semibold"
                >
                  <option value="BIR">BIR Statutory Tax</option>
                  <option value="Benefits">Employee Benefits</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Item Name</label>
                <select
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 font-semibold"
                >
                  {category === 'BIR' ? (
                    masterChoices.birTaxOptions && masterChoices.birTaxOptions.length > 0 ? (
                      masterChoices.birTaxOptions
                        .filter(opt => isPayableObligation(opt.code, opt))
                        .map(opt => (
                          <option key={opt.id} value={opt.code}>{opt.code} - {opt.name}</option>
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
                        .map(opt => (
                          <option key={opt.id} value={opt.code}>{opt.code} - {opt.name}</option>
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
                <label className="block text-slate-600 mb-1 font-semibold">Filing Month (YYYY-MM)</label>
                <input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Target Period calculated from Deadline Matrix */}
            <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Deadline Matrix Applicable Period:
              </span>
              <span className="font-mono font-bold text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-xs shadow-2xs">
                {getApplicablePeriodFromMatrix(itemName, month, clients.find(c => c.id === selectedClientId))}
              </span>
            </div>

            {/* No Payment Choice Checkbox */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
                <input
                  type="checkbox"
                  checked={isNoPaymentChoice}
                  onChange={e => setIsNoPaymentChoice(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Choice: No Payment for this month</span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6">
                Check this if the client has zero payable for this specific period (e.g. no taxable payments made).
              </p>
            </div>

            {/* Payable Amount Input */}
            {!isNoPaymentChoice && (
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Assessment Payable Amount (₱) *</label>
                <CurrencyInput
                  required
                  placeholder="19,000.00"
                  value={payableAmount}
                  onChange={val => setPayableAmount(val)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePayable}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-2xs"
              >
                Create Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Super Admin Tag Paid & Verification */}
      {showTagPaidModal && selectedPayable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs shadow-xl text-slate-800 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-amber-600" /> Super Admin Payment Tagging & Verification
            </div>

            <p className="text-slate-600">
              Verifying payment for <span className="font-bold text-slate-900">{selectedPayable.clientName}</span> -{' '}
              <span className="text-amber-800 font-bold">{selectedPayable.itemName}</span> ({selectedPayable.month}).
            </p>

            {paymentErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-bold">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{paymentErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Date Payment Made *</label>
                <input
                  type="date"
                  required
                  value={paidDate}
                  onChange={e => setPaidDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Bank">Bank Deposit / Transfer</option>
                  <option value="Maya">Maya E-Wallet</option>
                  <option value="GCash">GCash E-Wallet</option>
                  <option value="Check">Manager's Check</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {paymentMethod === 'Bank' && (
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Select Bank *</label>
                  <select
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    {masterChoices.banksList.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Reference / OR Number</label>
                <input
                  type="text"
                  placeholder="e.g. OR-992102 or Bank Ref 88123"
                  value={refNumber}
                  onChange={e => setRefNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-amber-900 font-bold mb-1">
                  Enter Payment Amount to Verify *
                </label>
                <CurrencyInput
                  required
                  placeholder="Enter exact payment amount..."
                  value={enteredAmountPaid}
                  onChange={val => setEnteredAmountPaid(val)}
                  className="w-full bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTagPaidModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Verify & Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modify Payment Tag Details */}
      {showModifyModal && modifyPayable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-blue-300 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs shadow-xl text-slate-800 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
              <Edit2 className="w-5 h-5 text-blue-600" /> Modify Payment Tag Details
            </div>

            <p className="text-slate-600">
              Modifying payment tag for <span className="font-bold text-slate-900">{modifyPayable.clientName}</span> -{' '}
              <span className="text-blue-800 font-bold">{modifyPayable.itemName}</span> ({modifyPayable.month}).
            </p>

            <form onSubmit={handleSaveModificationSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Date Payment Made *</label>
                <input
                  type="date"
                  required
                  value={modifyPaidDate}
                  onChange={e => setModifyPaidDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Payment Method *</label>
                <select
                  value={modifyPaymentMethod}
                  onChange={e => setModifyPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Bank">Bank Deposit / Transfer</option>
                  <option value="Maya">Maya E-Wallet</option>
                  <option value="GCash">GCash E-Wallet</option>
                  <option value="Check">Manager's Check</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {modifyPaymentMethod === 'Bank' && (
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Select Bank *</label>
                  <select
                    value={modifyBankName}
                    onChange={e => setModifyBankName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    {masterChoices.banksList.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Reference / OR Number</label>
                <input
                  type="text"
                  placeholder="e.g. OR-992102 or Bank Ref 88123"
                  value={modifyRefNumber}
                  onChange={e => setModifyRefNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Verified Payment Amount *
                </label>
                <CurrencyInput
                  required
                  placeholder="Enter exact payment amount..."
                  value={modifyAmountPaid}
                  onChange={val => setModifyAmountPaid(val)}
                  className="w-full bg-blue-50/50 border border-blue-200 rounded-lg text-blue-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Reason for Modification / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Corrected Official Receipt number / updated payment amount"
                  value={modifyNotes}
                  onChange={e => setModifyNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleRevokePaymentInModal}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Revoke to Unpaid
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModifyModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Modify History */}
      {showHistoryModal && historyPayable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs shadow-xl text-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                <History className="w-5 h-5 text-amber-600" /> Payment Tag Modification History
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="font-extrabold text-slate-900 text-sm">{historyPayable.clientName}</p>
              <p className="text-slate-500 text-xs">
                {historyPayable.category} • <strong className="text-slate-800">{historyPayable.itemName}</strong> ({historyPayable.month})
              </p>
            </div>

            {/* Audit Log Timeline */}
            <div className="space-y-3 pt-2">
              {historyPayable.amendedHistory && historyPayable.amendedHistory.length > 0 ? (
                historyPayable.amendedHistory.map((log, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1 text-slate-700">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{log.date}</span>
                      <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        By {log.modifiedBy}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{log.details}</p>
                    {log.previousAmount !== undefined && log.newAmount !== undefined && log.previousAmount !== log.newAmount && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        Amount adjusted: <span className="line-through text-rose-600">₱{log.previousAmount.toLocaleString()}</span> → <span className="text-emerald-700 font-bold">₱{log.newAmount.toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic text-center py-4">No modifications logged for this item yet.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM REVOKE PAYMENT TAG MODAL */}
      {showRevokeConfirmModal && revokePayableTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl shrink-0">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Revoke Payment Tag</h3>
                  <p className="text-xs font-bold text-rose-600 mt-0.5">Are you sure you want to revert to unpaid?</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRevokeConfirmModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Client / Company:</span>
                <span className="font-extrabold text-slate-900">{revokePayableTarget.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Requirement / Form:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {revokePayableTarget.itemName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Target Month:</span>
                <span className="font-mono font-bold text-slate-800">{revokePayableTarget.month}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Revoking this payment tag will return the item back to <strong>Unpaid status</strong> in the Payables dashboard.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRevokeConfirmModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevokePayment}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Yes, Revoke Payment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM RESET ASSESSMENT MODAL */}
      {showResetConfirmModal && resetPayableTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl shrink-0">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Reset Assessment Record</h3>
                  <p className="text-xs font-bold text-rose-600 mt-0.5">Are you sure you want to revert to pending?</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Client / Company:</span>
                <span className="font-extrabold text-slate-900">{resetPayableTarget.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Requirement / Form:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {resetPayableTarget.itemName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Amount Recorded:</span>
                <span className="font-mono font-bold text-slate-900">₱{resetPayableTarget.payableAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Resetting will remove this recorded payable assessment and return the form back to <strong>Action Pending</strong> in the user's To-Do list.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetAssessment}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Yes, Revert to Pending
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TOAST BANNER */}
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
