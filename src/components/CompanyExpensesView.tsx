import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CompanyExpense, CompanyExpenseCategory } from '../types';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import { 
  CreditCard, 
  Plus, 
  Receipt, 
  Calendar, 
  Zap, 
  Droplet, 
  Wifi, 
  PhoneCall, 
  Building2, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Edit2, 
  Trash2, 
  Filter, 
  XCircle, 
  Layers, 
  FileText,
  Search,
  ArrowUpDown,
  Repeat,
  Tag,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Database,
  SlidersHorizontal,
  BookmarkPlus
} from 'lucide-react';

const MONTH_NAMES = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026',
  'May 2026', 'June 2026', 'July 2026', 'August 2026',
  'September 2026', 'October 2026', 'November 2026', 'December 2026',
  'January 2027', 'February 2027', 'March 2027', 'April 2027'
];

// Helper to format deadline date for a given target month
const formatDueDateForMonth = (
  monthYear: string, 
  dueDateType: string, 
  fixedDueDay?: number, 
  originalDueDate?: string
): string => {
  if (dueDateType === 'Date to input in Future') {
    return '';
  }

  const parts = (monthYear || '').trim().split(' ');
  if (parts.length < 2) return originalDueDate || '';
  const monthName = parts[0];
  const year = parts[1];

  const monthMap: Record<string, string> = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };

  const monthNum = monthMap[monthName] || '01';
  let day = fixedDueDay;
  if (!day && originalDueDate) {
    const parsed = parseInt(originalDueDate.split('-')[2] || '15', 10);
    day = isNaN(parsed) ? 15 : parsed;
  }
  day = day || 15;
  const paddedDay = String(Math.min(Math.max(day, 1), 31)).padStart(2, '0');
  
  return `${year}-${monthNum}-${paddedDay}`;
};

export const CompanyExpensesView: React.FC = () => {
  const { companyExpenses, addCompanyExpense, updateCompanyExpense, markExpensePaid, deleteCompanyExpense, addAuditLog } = useData();
  const { currentUser } = useAuth();

  const currentMonthYearDefault = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const [activeTab, setActiveTab] = useState<'monthly' | 'master'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYearDefault);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'deadline' | 'amount'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'all' | 'recurring' | 'unpaid' | 'paid'>('unpaid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CompanyExpense | null>(null);
  const [showPayModal, setShowPayModal] = useState<CompanyExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Master Data state
  const [masterSearchTerm, setMasterSearchTerm] = useState('');
  const [masterCategoryFilter, setMasterCategoryFilter] = useState('All');
  const [masterSortBy, setMasterSortBy] = useState<'title' | 'category' | 'amount' | 'dueDay'>('title');
  const [masterSortOrder, setMasterSortOrder] = useState<'asc' | 'desc'>('asc');

  // Categories list
  const [categories, setCategories] = useState<string[]>([
    'Electricity',
    'Water',
    'Internet',
    'Phone & Mobile',
    'Credit Card',
    'Office Rent',
    'Software & Subscriptions',
    'Taxes & Permits',
    'Office Supplies & Maintenance',
    'Professional Fees & Retainers',
    'Insurance & Security',
    'Custom'
  ]);

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);

  // Form State for Add / Edit (all non-title fields made non-mandatory/graceful)
  const [formState, setFormState] = useState<Omit<CompanyExpense, 'id' | 'createdAt'>>({
    title: '',
    category: 'Electricity',
    vendorProvider: '',
    amountType: 'Manual Statement',
    amount: 0,
    dueDateType: 'Fixed Monthly Day',
    fixedDueDay: 15,
    dueDate: '',
    monthYear: selectedMonth,
    status: 'Unpaid',
    accountNumber: '',
    notes: '',
    isRecurring: true
  });

  // Pay Form State
  const [payDetails, setPayDetails] = useState({
    paidDate: new Date().toISOString().split('T')[0],
    paidAmount: 0,
    paymentMethod: 'Bank Transfer (BDO)',
    referenceNo: '',
    receiptNotes: ''
  });

  // Automatically resolve all expenses for selectedMonth:
  // Persistent recurring items appear in every single month automatically!
  const monthlyExpenses = useMemo(() => {
    // 1. Explicit expenses stored directly for this selected month
    const explicitForMonth = companyExpenses.filter(exp => exp.monthYear === selectedMonth);
    const explicitIdentifiers = new Set<string>();

    explicitForMonth.forEach(e => {
      if (e.templateId) explicitIdentifiers.add(e.templateId.toLowerCase().trim());
      if (e.id) explicitIdentifiers.add(e.id.toLowerCase().trim());
      if (e.title) explicitIdentifiers.add(e.title.toLowerCase().trim());
    });

    // 2. Identify all recurring template items from anywhere in companyExpenses
    const recurringTemplates: CompanyExpense[] = [];
    const seenTemplateKeys = new Set<string>();

    companyExpenses.forEach(exp => {
      const isRec = exp.isRecurring !== false && (
        exp.isRecurring === true ||
        exp.dueDateType === 'Fixed Monthly Day' ||
        exp.dueDateType === 'Date to input in Future' ||
        exp.amountType === 'Fixed Monthly' ||
        // Seed default items are all recurring
        ['exp_001', 'exp_002', 'exp_003', 'exp_004', 'exp_005', 'exp_006'].includes(exp.id)
      );

      if (isRec) {
        const key = (exp.templateId || exp.id || exp.title).toLowerCase().trim();
        if (!seenTemplateKeys.has(key)) {
          seenTemplateKeys.add(key);
          recurringTemplates.push(exp);
        }
      }
    });

    // 3. For any recurring template not already recorded in selectedMonth, create an active monthly instance
    const syntheticForMonth: CompanyExpense[] = [];

    recurringTemplates.forEach(template => {
      const key = (template.templateId || template.id || template.title).toLowerCase().trim();
      const alreadyInMonth = explicitIdentifiers.has(key) || 
        explicitForMonth.some(e => e.title.toLowerCase().trim() === template.title.toLowerCase().trim());

      if (!alreadyInMonth) {
        const targetDueDate = template.dueDateType === 'Date to input in Future'
          ? ''
          : formatDueDateForMonth(selectedMonth, template.dueDateType, template.fixedDueDay, template.dueDate);

        syntheticForMonth.push({
          ...template,
          id: `rec_${template.id}_${selectedMonth.replace(/\s+/g, '_')}`,
          templateId: template.templateId || template.id,
          monthYear: selectedMonth,
          status: 'Unpaid',
          dueDate: targetDueDate,
          paidDetails: undefined,
          isRecurring: true
        });
      }
    });

    return [...explicitForMonth, ...syntheticForMonth];
  }, [companyExpenses, selectedMonth]);

  // Filter expenses by category, search term, and view mode
  const filteredExpenses = monthlyExpenses.filter(exp => {
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
    const matchesSearch = (exp.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (exp.vendorProvider || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (exp.accountNumber && exp.accountNumber.includes(searchTerm));
    
    let matchesViewMode = true;
    if (viewMode === 'recurring') {
      matchesViewMode = exp.isRecurring !== false && (
        exp.dueDateType === 'Fixed Monthly Day' || 
        exp.dueDateType === 'Date to input in Future' || 
        exp.amountType === 'Fixed Monthly' ||
        exp.isRecurring === true
      );
    } else if (viewMode === 'unpaid') {
      matchesViewMode = exp.status !== 'Paid';
    } else if (viewMode === 'paid') {
      matchesViewMode = exp.status === 'Paid';
    }

    return matchesCategory && matchesSearch && matchesViewMode;
  });

  // Sort expenses
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'title') {
      comparison = (a.title || '').localeCompare(b.title || '');
    } else if (sortBy === 'category') {
      comparison = (a.category || '').localeCompare(b.category || '');
      if (comparison === 0) {
        comparison = (a.title || '').localeCompare(b.title || '');
      }
    } else if (sortBy === 'deadline') {
      const getDayValue = (exp: CompanyExpense) => {
        if (exp.dueDateType === 'Date to input in Future' && !exp.dueDate) return 99; // Future / TBD sorted to end
        if (exp.dueDateType === 'Fixed Monthly Day') return exp.fixedDueDay || 15;
        if (exp.dueDate) {
          const parsed = parseInt(exp.dueDate.split('-')[2] || '15', 10);
          return isNaN(parsed) ? 15 : parsed;
        }
        return 50;
      };
      comparison = getDayValue(a) - getDayValue(b);
    } else if (sortBy === 'amount') {
      comparison = (a.amount || 0) - (b.amount || 0);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Master Billing Items (All master billing templates & profiles across the company)
  const masterBillingList = useMemo(() => {
    const map = new Map<string, CompanyExpense>();

    companyExpenses.forEach(exp => {
      const key = (exp.templateId || (exp.isRecurring ? exp.id : '') || exp.title).toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, exp);
      } else {
        const existing = map.get(key)!;
        if (!existing.isRecurring && exp.isRecurring) {
          map.set(key, exp);
        }
      }
    });

    return Array.from(map.values());
  }, [companyExpenses]);

  // Master Data metrics
  const totalMasterCount = masterBillingList.length;
  const totalMasterFixedBaseline = masterBillingList
    .filter(m => m.amountType === 'Fixed Monthly' || (m.amount && m.amount > 0))
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalVariableMasterCount = masterBillingList.filter(m => m.amountType === 'Manual Statement').length;

  const filteredMasterList = useMemo(() => {
    return masterBillingList.filter(item => {
      const matchesCategory = masterCategoryFilter === 'All' || item.category === masterCategoryFilter;
      const matchesSearch = (item.title || '').toLowerCase().includes(masterSearchTerm.toLowerCase()) ||
                            (item.vendorProvider || '').toLowerCase().includes(masterSearchTerm.toLowerCase()) ||
                            (item.accountNumber && item.accountNumber.includes(masterSearchTerm));
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      let comp = 0;
      if (masterSortBy === 'title') {
        comp = (a.title || '').localeCompare(b.title || '');
      } else if (masterSortBy === 'category') {
        comp = (a.category || '').localeCompare(b.category || '');
      } else if (masterSortBy === 'amount') {
        comp = (a.amount || 0) - (b.amount || 0);
      } else if (masterSortBy === 'dueDay') {
        const dayA = a.dueDateType === 'Fixed Monthly Day' ? (a.fixedDueDay || 15) : 99;
        const dayB = b.dueDateType === 'Fixed Monthly Day' ? (b.fixedDueDay || 15) : 99;
        comp = dayA - dayB;
      }
      return masterSortOrder === 'asc' ? comp : -comp;
    });
  }, [masterBillingList, masterCategoryFilter, masterSearchTerm, masterSortBy, masterSortOrder]);

  // Local Pagination Hook specifically for "Operating Bills & Recurring Payments" area ONLY
  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems: paginatedExpenses,
    setCurrentPage,
    setPageSize,
    loadMore,
    hasMoreToLoad,
  } = usePagination(sortedExpenses, {
    initialPageSize: 15,
    resetOnChange: `${selectedMonth}_${selectedCategory}_${searchTerm}_${viewMode}_${sortBy}_${sortOrder}`,
  });

  // Summary Metrics
  const totalMonthlyAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPaid = filteredExpenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + (e.paidDetails?.paidAmount || e.amount || 0), 0);
  const totalUnpaid = filteredExpenses.filter(e => e.status !== 'Paid').reduce((sum, e) => sum + (e.amount || 0), 0);
  const recurringCount = monthlyExpenses.filter(e => 
    e.isRecurring === true || 
    e.dueDateType === 'Fixed Monthly Day' || 
    e.dueDateType === 'Date to input in Future' || 
    e.amountType === 'Fixed Monthly'
  ).length;

  const handleOpenAddMasterBilling = () => {
    setEditingExpense(null);
    setFormState({
      title: '',
      category: masterCategoryFilter !== 'All' ? (masterCategoryFilter as any) : 'Electricity',
      vendorProvider: '',
      amountType: 'Fixed Monthly',
      amount: 0,
      dueDateType: 'Fixed Monthly Day',
      fixedDueDay: 15,
      dueDate: '',
      monthYear: selectedMonth,
      status: 'Unpaid',
      accountNumber: '',
      notes: '',
      isRecurring: true
    });
    setShowAddModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      alert('Please enter a Bill Name for this recurring payment / expense item.');
      return;
    }

    const isRec = formState.isRecurring !== false && (
      formState.isRecurring === true ||
      formState.dueDateType === 'Fixed Monthly Day' ||
      formState.dueDateType === 'Date to input in Future' ||
      formState.amountType === 'Fixed Monthly'
    );

    let calculatedDueDate = formState.dueDate;
    if (formState.dueDateType === 'Fixed Monthly Day') {
      calculatedDueDate = formatDueDateForMonth(
        formState.monthYear || selectedMonth,
        formState.dueDateType,
        formState.fixedDueDay,
        formState.dueDate
      );
    } else if (formState.dueDateType === 'Date to input in Future' && !formState.dueDate) {
      calculatedDueDate = '';
    }

    const payload = {
      ...formState,
      amount: Number(formState.amount) || 0,
      monthYear: formState.monthYear || selectedMonth,
      isRecurring: isRec,
      dueDate: calculatedDueDate
    };

    if (editingExpense) {
      if (editingExpense.id.startsWith('rec_')) {
        // Converting a synthetic recurring instance to a saved specific month record
        addCompanyExpense({
          ...payload,
          templateId: editingExpense.templateId || editingExpense.id.replace('rec_', '').split('_')[0]
        });
      } else {
        updateCompanyExpense(editingExpense.id, payload);
      }
    } else {
      addCompanyExpense(payload);
    }

    if (currentUser) {
      addAuditLog(
        editingExpense ? 'Updated Company Expense' : 'Added Company Expense',
        `${payload.title} (${payload.category}) - ₱${payload.amount.toLocaleString()} for ${payload.monthYear}`,
        currentUser.id,
        currentUser.fullName
      );
    }

    setShowAddModal(false);
    setEditingExpense(null);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal) return;

    if (showPayModal.id.startsWith('rec_')) {
      // It's a synthetic recurring item for this month: save it as an official Paid record for this month
      const newPersistedExpense: Omit<CompanyExpense, 'id' | 'createdAt'> = {
        title: showPayModal.title,
        category: showPayModal.category,
        vendorProvider: showPayModal.vendorProvider || '',
        accountNumber: showPayModal.accountNumber || '',
        amountType: showPayModal.amountType || 'Manual Statement',
        amount: Number(showPayModal.amount) || 0,
        dueDateType: showPayModal.dueDateType,
        fixedDueDay: showPayModal.fixedDueDay,
        dueDate: showPayModal.dueDate || '',
        monthYear: selectedMonth,
        status: 'Paid',
        isRecurring: true,
        templateId: showPayModal.templateId || showPayModal.id.replace('rec_', '').split('_')[0],
        notes: showPayModal.notes || '',
        paidDetails: payDetails
      };
      addCompanyExpense(newPersistedExpense);
    } else {
      markExpensePaid(showPayModal.id, payDetails);
    }

    if (currentUser) {
      addAuditLog(
        'Paid Company Expense',
        `Marked ${showPayModal.title} paid ₱${payDetails.paidAmount.toLocaleString()} via ${payDetails.paymentMethod} (Ref: ${payDetails.referenceNo || 'N/A'}) for ${selectedMonth}`,
        currentUser.id,
        currentUser.fullName
      );
    }

    setShowPayModal(null);
  };

  const handleDeleteExpense = (expense: CompanyExpense) => {
    if (confirm(`Delete bill "${expense.title}"?`)) {
      if (expense.id.startsWith('rec_')) {
        const masterId = expense.templateId || expense.id.replace('rec_', '').split('_')[0];
        deleteCompanyExpense(masterId);
      } else {
        deleteCompanyExpense(expense.id);
      }
    }
  };

  const handleAddCustomCategory = () => {
    if (newCategoryInput.trim() && !categories.includes(newCategoryInput.trim())) {
      setCategories([...categories, newCategoryInput.trim()]);
      setFormState({ ...formState, category: newCategoryInput.trim() as any });
      setNewCategoryInput('');
      setShowNewCatInput(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Electricity': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Water': return <Droplet className="w-4 h-4 text-blue-500" />;
      case 'Internet': return <Wifi className="w-4 h-4 text-indigo-500" />;
      case 'Phone & Mobile': return <PhoneCall className="w-4 h-4 text-emerald-500" />;
      case 'Credit Card': return <CreditCard className="w-4 h-4 text-rose-500" />;
      case 'Office Rent': return <Building2 className="w-4 h-4 text-purple-500" />;
      case 'Software & Subscriptions': return <Layers className="w-4 h-4 text-cyan-500" />;
      case 'Taxes & Permits': return <FileText className="w-4 h-4 text-amber-600" />;
      default: return <Receipt className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <CreditCard className="w-64 h-64 text-white" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-400" /> Internal Accounts Payable & Bills
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Repeat className="w-3 h-3 text-cyan-400" /> {recurringCount} Recurring Bills (Auto-carried Every Month)
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Company Operating Expenses & Bills</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Track and manage all recurring operational payments, utility bills (Electricity, Water, Internet, Mobile), credit cards, office rentals, and customizable recurring expense items with flexible deadline dates and amounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingExpense(null);
                setFormState({
                  title: '',
                  category: selectedCategory !== 'All' ? selectedCategory : 'Electricity',
                  vendorProvider: '',
                  amountType: 'Manual Statement',
                  amount: 0,
                  dueDateType: 'Fixed Monthly Day',
                  fixedDueDay: 15,
                  dueDate: '',
                  monthYear: selectedMonth,
                  status: 'Unpaid',
                  accountNumber: '',
                  notes: '',
                  isRecurring: true
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Item / Recurring Bill
            </button>
          </div>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Total Monthly Expenses:</span>
            <p className="text-lg font-bold text-white mt-0.5">₱{totalMonthlyAmount.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium font-sans">Settled / Paid:</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">₱{totalPaid.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium font-sans">Pending / Unpaid Due:</span>
            <p className="text-lg font-bold text-rose-400 mt-0.5">₱{totalUnpaid.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium font-sans">Recurring Items in {selectedMonth}:</span>
            <p className="text-lg font-bold text-cyan-400 mt-0.5">{recurringCount} Active</p>
          </div>
        </div>
      </div>

      {/* Navigation Switcher: Monthly Ledger vs Master Data */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'monthly'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> Monthly Operating Bills & Ledger ({monthlyExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('master')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'master'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" /> Billing Master Data & Profiles ({masterBillingList.length})
        </button>
      </div>

      {activeTab === 'monthly' ? (
        <>
          {/* Month Selector, Category Filter, Sort By & View Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-bold text-slate-700">Billing Month:</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 cursor-pointer"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <Filter className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-bold text-slate-700">Category:</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sort By Bill Name / Date of Deadline / Category / Amount */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <ArrowUpDown className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-bold text-slate-700">Sort By:</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 cursor-pointer"
                >
                  <option value="title">Bill Name</option>
                  <option value="deadline">Date of Deadline</option>
                  <option value="category">Category</option>
                  <option value="amount">Bill Amount</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                  title={sortOrder === 'asc' ? 'Ascending (A-Z / Earliest)' : 'Descending (Z-A / Latest)'}
                >
                  {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>

              {/* View Mode (All / Recurring / Unpaid / Paid) */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-3 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    viewMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({monthlyExpenses.length})
                </button>
                <button
                  onClick={() => setViewMode('recurring')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                    viewMode === 'recurring' ? 'bg-white text-cyan-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Repeat className="w-3 h-3" /> Recurring
                </button>
                <button
                  onClick={() => setViewMode('unpaid')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    viewMode === 'unpaid' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unpaid Due
                </button>
                <button
                  onClick={() => setViewMode('paid')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    viewMode === 'paid' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Settled
                </button>
              </div>
            </div>

            <div className="relative w-full lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search provider, bill title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Operating Bills & Recurring Payments Section with Local Pagination */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Operating Bills & Recurring Payments ({sortedExpenses.length})
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded text-[10px]">
                  Sorted by: {sortBy === 'title' ? 'Bill Name' : sortBy === 'deadline' ? 'Date of Deadline' : sortBy === 'category' ? 'Category' : 'Bill Amount'} ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
                </span>
              </div>
              <span className="text-slate-500 font-mono font-semibold">Active Month: <strong className="text-blue-600">{selectedMonth}</strong></span>
            </div>

            <div className="divide-y divide-slate-100">
              {sortedExpenses.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No Operating Expenses Found for {selectedMonth}</p>
                  <p className="text-xs text-slate-400">
                    Click "+ Add Item / Recurring Bill" above to add recurring utility bills, subscriptions, rentals, or credit card obligations.
                  </p>
                </div>
              ) : (
                paginatedExpenses.map(expense => {
                  const isRecurringItem = expense.isRecurring !== false && (
                    expense.dueDateType === 'Fixed Monthly Day' || 
                    expense.dueDateType === 'Date to input in Future' || 
                    expense.amountType === 'Fixed Monthly' ||
                    expense.isRecurring === true
                  );

                  return (
                    <div key={expense.id} className="p-5 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                            {getCategoryIcon(expense.category)}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-sm">{expense.title}</h4>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-medium text-[10px] rounded border border-slate-200">
                                {expense.category}
                              </span>
                              {isRecurringItem && (
                                <span className="px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold text-[10px] rounded flex items-center gap-1">
                                  <Repeat className="w-2.5 h-2.5" /> Recurring (Monthly)
                                </span>
                              )}
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                expense.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                expense.status === 'Overdue' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {expense.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              Vendor / Provider: <strong className="text-slate-700">{expense.vendorProvider || 'Not specified'}</strong>
                              {expense.accountNumber && <span> • Account #: <strong className="font-mono text-slate-700">{expense.accountNumber}</strong></span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-11 text-[11px] text-slate-500 flex-wrap">
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            Date of Deadline: <strong className="text-slate-900 font-mono">
                              {expense.dueDateType === 'Fixed Monthly Day'
                                ? `Every ${expense.fixedDueDay || 15}th of month (${expense.dueDate || `${expense.fixedDueDay || 15}th`})`
                                : expense.dueDateType === 'Date to input in Future'
                                ? (expense.dueDate ? `${expense.dueDate} (Future / Variable)` : 'Date to input in Future (Variable / Statement Pending)')
                                : (expense.dueDate || 'Unspecified Date')}
                            </strong>
                          </span>
                          {expense.dueDateType === 'Date to input in Future' && !expense.dueDate && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] rounded font-bold">
                              Date to input in Future
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-slate-600 font-sans">{expense.amountType || 'Manual Statement'}</span>
                          {expense.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-500 font-sans max-w-md truncate" title={expense.notes}>"{expense.notes}"</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 pl-11 md:pl-0">
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block font-sans">Amount Due</span>
                          <span className="text-base font-bold text-slate-900">₱{(expense.amount || 0).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {expense.status !== 'Paid' ? (
                            <button
                              onClick={() => {
                                setShowPayModal(expense);
                                setPayDetails({
                                  paidDate: new Date().toISOString().split('T')[0],
                                  paidAmount: expense.amount || 0,
                                  paymentMethod: 'Bank Transfer (BDO)',
                                  referenceNo: '',
                                  receiptNotes: ''
                                });
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          ) : (
                            <div className="text-right text-[11px] bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                              <span className="font-bold text-emerald-800 block">Paid {expense.paidDetails?.paidDate}</span>
                              <span className="text-emerald-700 font-mono text-[10px]">{expense.paidDetails?.paymentMethod} (Ref: {expense.paidDetails?.referenceNo || 'N/A'})</span>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setEditingExpense(expense);
                              setFormState({
                                title: expense.title,
                                category: expense.category,
                                vendorProvider: expense.vendorProvider || '',
                                amountType: expense.amountType || 'Manual Statement',
                                amount: expense.amount || 0,
                                dueDateType: expense.dueDateType || 'Fixed Monthly Day',
                                fixedDueDay: expense.fixedDueDay || 15,
                                dueDate: expense.dueDate || '',
                                monthYear: expense.monthYear || selectedMonth,
                                status: expense.status || 'Unpaid',
                                accountNumber: expense.accountNumber || '',
                                notes: expense.notes || '',
                                isRecurring: expense.isRecurring !== false
                              });
                              setShowAddModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteExpense(expense)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Component - Rendered ONLY for Operating Bills & Recurring Payments */}
            {sortedExpenses.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onLoadMore={loadMore}
                hasMoreToLoad={hasMoreToLoad}
                itemLabel="operating bills"
              />
            )}
          </div>
        </>
      ) : (
        /* MASTER DATA SECTION: ALL LIST OF ALL BILLING + ADD BILLING */
        <div className="space-y-4">
          {/* Master KPI Baseline Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gradient-to-r from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-xs">
            <div>
              <span className="text-indigo-200 text-xs font-medium">Master Billing Items:</span>
              <p className="text-xl font-bold text-white mt-1">{totalMasterCount} Registered</p>
            </div>
            <div>
              <span className="text-indigo-200 text-xs font-medium">Fixed Monthly Baseline:</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">₱{totalMasterFixedBaseline.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-indigo-200 text-xs font-medium">Variable Statement Bills:</span>
              <p className="text-xl font-bold text-amber-300 mt-1">{totalVariableMasterCount} Items</p>
            </div>
            <div>
              <span className="text-indigo-200 text-xs font-medium">Categories In Master:</span>
              <p className="text-xl font-bold text-cyan-300 mt-1">{new Set(masterBillingList.map(m => m.category)).size} Categories</p>
            </div>
          </div>

          {/* Master Toolbar: Search, Filter, Sort & "+ Add Billing" */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-bold text-slate-700">Category:</label>
                <select
                  value={masterCategoryFilter}
                  onChange={e => setMasterCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <ArrowUpDown className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-bold text-slate-700">Sort By:</label>
                <select
                  value={masterSortBy}
                  onChange={e => setMasterSortBy(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 cursor-pointer"
                >
                  <option value="title">Bill Name</option>
                  <option value="category">Category</option>
                  <option value="amount">Default Amount</option>
                  <option value="dueDay">Due Day</option>
                </select>
                <button
                  onClick={() => setMasterSortOrder(masterSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  {masterSortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full lg:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search master billings..."
                  value={masterSearchTerm}
                  onChange={e => setMasterSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                onClick={handleOpenAddMasterBilling}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <BookmarkPlus className="w-4 h-4" /> Add Billing
              </button>
            </div>
          </div>

          {/* Master Billing List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  Master Billing Directory & Templates ({filteredMasterList.length})
                </span>
                <span className="text-slate-500">
                  • Centralized list of all company billing profiles auto-carried every month
                </span>
              </div>
              <button
                onClick={handleOpenAddMasterBilling}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Billing
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredMasterList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Database className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No Master Billing Profiles Found</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Create master billing templates to automatically track your utilities, rent, subscriptions, and vendor payables across all future months.
                  </p>
                  <button
                    onClick={handleOpenAddMasterBilling}
                    className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Billing Master
                  </button>
                </div>
              ) : (
                filteredMasterList.map(masterItem => {
                  const isFixed = masterItem.amountType === 'Fixed Monthly';
                  return (
                    <div
                      key={masterItem.id}
                      className="p-5 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                            {getCategoryIcon(masterItem.category)}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-sm">{masterItem.title}</h4>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-medium text-[10px] rounded border border-slate-200">
                                {masterItem.category}
                              </span>
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px] rounded flex items-center gap-1">
                                <Repeat className="w-2.5 h-2.5" /> Auto-carried Every Month
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                isFixed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {isFixed ? 'Fixed Amount' : 'Variable Statement'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Vendor / Provider: <strong className="text-slate-700">{masterItem.vendorProvider || 'Not specified'}</strong>
                              {masterItem.accountNumber && (
                                <span> • Account / Reference #: <strong className="font-mono text-slate-700">{masterItem.accountNumber}</strong></span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-12 text-[11px] text-slate-500 flex-wrap">
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            Default Due Schedule: <strong className="text-slate-900 font-mono">
                              {masterItem.dueDateType === 'Fixed Monthly Day'
                                ? `Every ${masterItem.fixedDueDay || 15}th of calendar month`
                                : masterItem.dueDateType === 'Date to input in Future'
                                ? 'Date to input in Future (Variable / Statement)'
                                : (masterItem.dueDate || 'Manual Date')}
                            </strong>
                          </span>
                          {masterItem.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-500 font-sans max-w-md truncate" title={masterItem.notes}>
                                "{masterItem.notes}"
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 pl-12 md:pl-0">
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block font-sans">
                            {isFixed ? 'Default Monthly Amount' : 'Statement Baseline'}
                          </span>
                          <span className="text-base font-bold text-slate-900">
                            {masterItem.amount && masterItem.amount > 0 ? `₱${masterItem.amount.toLocaleString()}` : 'Variable (Statement)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingExpense(masterItem);
                              setFormState({
                                title: masterItem.title,
                                category: masterItem.category,
                                vendorProvider: masterItem.vendorProvider || '',
                                amountType: masterItem.amountType || 'Fixed Monthly',
                                amount: masterItem.amount || 0,
                                dueDateType: masterItem.dueDateType || 'Fixed Monthly Day',
                                fixedDueDay: masterItem.fixedDueDay || 15,
                                dueDate: masterItem.dueDate || '',
                                monthYear: masterItem.monthYear || selectedMonth,
                                status: masterItem.status || 'Unpaid',
                                accountNumber: masterItem.accountNumber || '',
                                notes: masterItem.notes || '',
                                isRecurring: true
                              });
                              setShowAddModal(true);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-all"
                            title="Edit Master Billing Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit Master
                          </button>

                          <button
                            onClick={() => handleDeleteExpense(masterItem)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Delete Master Billing Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT COMPANY BILL / EXPENSE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveExpense} className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                {editingExpense ? 'Edit Operating Expense Item' : 'Add Item / Recurring Operating Bill'}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Title (Only Mandatory Field) */}
              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">
                  Bill Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.title}
                  onChange={e => setFormState({ ...formState, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  placeholder="e.g. Meralco Main Office Electricity, PLDT Fiber, Office Rent, BDO Card"
                />
              </div>

              {/* Category */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category (Optional)</label>
                <div className="flex items-center gap-1">
                  <select
                    value={formState.category}
                    onChange={e => setFormState({ ...formState, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(!showNewCatInput)}
                    className="px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs cursor-pointer shrink-0"
                    title="Add Custom Category"
                  >
                    + Category
                  </button>
                </div>
              </div>

              {showNewCatInput && (
                <div className="md:col-span-2 flex items-center gap-2 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <input
                    type="text"
                    placeholder="Enter custom category name..."
                    value={newCategoryInput}
                    onChange={e => setNewCategoryInput(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                  >
                    Save Category
                  </button>
                </div>
              )}

              {/* Vendor / Provider */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Vendor / Provider (Optional)</label>
                <input
                  type="text"
                  value={formState.vendorProvider}
                  onChange={e => setFormState({ ...formState, vendorProvider: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Meralco, Maynilad, Globe, BDO, Landlord"
                />
              </div>

              {/* Amount Type */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Behavior</label>
                <select
                  value={formState.amountType}
                  onChange={e => setFormState({ ...formState, amountType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Fixed Monthly">Fixed Recurring Amount</option>
                  <option value="Manual Statement">Variable / Monthly Statement Amount</option>
                </select>
              </div>

              {/* Amount (Optional / Can set amount) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Due (₱) (Optional)</label>
                <input
                  type="number"
                  min={0}
                  value={formState.amount}
                  onChange={e => setFormState({ ...formState, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  placeholder="e.g. 18500 or 0 if statement pending"
                />
              </div>

              {/* Date of Deadline Type ⭐ */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date of Deadline Type</label>
                <select
                  value={formState.dueDateType}
                  onChange={e => {
                    const val = e.target.value as any;
                    setFormState({ 
                      ...formState, 
                      dueDateType: val,
                      dueDate: val === 'Date to input in Future' ? '' : formState.dueDate
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="Fixed Monthly Day">Fixed Recurring Day (e.g. 15th of every month)</option>
                  <option value="Date to input in Future">Date to input in Future (Variable / Changing Monthly)</option>
                  <option value="Manual Specific Date">Specific Fixed Date (YYYY-MM-DD)</option>
                </select>
              </div>

              {/* Dynamic Deadline Inputs */}
              {formState.dueDateType === 'Fixed Monthly Day' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Recurring Due Day (1-31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formState.fixedDueDay || 15}
                    onChange={e => setFormState({ ...formState, fixedDueDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="15"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Due every {formState.fixedDueDay || 15}th of every calendar month.</p>
                </div>
              )}

              {formState.dueDateType === 'Date to input in Future' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Optional Specific Date for this Month</label>
                  <input
                    type="date"
                    value={formState.dueDate || ''}
                    onChange={e => setFormState({ ...formState, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" /> Due date is not constant / changing. Leave blank if awaiting bill statement.
                  </p>
                </div>
              )}

              {formState.dueDateType === 'Manual Specific Date' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Specific Deadline Date</label>
                  <input
                    type="date"
                    value={formState.dueDate || ''}
                    onChange={e => setFormState({ ...formState, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              )}

              {/* Account Number */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account / Reference # (Optional)</label>
                <input
                  type="text"
                  value={formState.accountNumber || ''}
                  onChange={e => setFormState({ ...formState, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  placeholder="e.g. 1029384812"
                />
              </div>

              {/* Billing Month */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Billing Month/Year</label>
                <input
                  type="text"
                  value={formState.monthYear}
                  onChange={e => setFormState({ ...formState, monthYear: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Notes / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={formState.notes || ''}
                  onChange={e => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Auto-debit scheduled or contact details for vendor"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Save Operating Bill / Recurring Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MARK EXPENSE PAID */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleConfirmPayment} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Record Payment for {showPayModal.title}
              </h3>
              <button type="button" onClick={() => setShowPayModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-600 block">Statement Amount:</span>
                  <span className="text-[11px] text-blue-600 font-medium">Month: {selectedMonth}</span>
                </div>
                <span className="font-bold text-slate-900 font-mono text-sm">₱{(showPayModal.amount || 0).toLocaleString()}</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paid Amount (₱)</label>
                <input
                  type="number"
                  required
                  value={payDetails.paidAmount}
                  onChange={e => setPayDetails({ ...payDetails, paidAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={payDetails.paidDate}
                  onChange={e => setPayDetails({ ...payDetails, paidDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method / Channel</label>
                <select
                  value={payDetails.paymentMethod}
                  onChange={e => setPayDetails({ ...payDetails, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Bank Transfer (BDO)">Bank Transfer (BDO)</option>
                  <option value="Bank Transfer (BPI)">Bank Transfer (BPI)</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Company Credit Card">Company Credit Card</option>
                  <option value="Check">Check Payment</option>
                  <option value="Petty Cash">Petty Cash</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Transaction Ref / Confirmation # (Optional)</label>
                <input
                  type="text"
                  value={payDetails.referenceNo}
                  onChange={e => setPayDetails({ ...payDetails, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  placeholder="e.g. BDO-98230198 or GCash Ref # 102938"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowPayModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Confirm Payment Settled
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
