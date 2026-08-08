import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CompanyExpense, CompanyExpenseCategory } from '../types';
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
  Search
} from 'lucide-react';

export const CompanyExpensesView: React.FC = () => {
  const { companyExpenses, addCompanyExpense, updateCompanyExpense, markExpensePaid, deleteCompanyExpense, addAuditLog } = useData();
  const { currentUser } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState('August 2026');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CompanyExpense | null>(null);
  const [showPayModal, setShowPayModal] = useState<CompanyExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Categories list
  const [categories, setCategories] = useState<string[]>([
    'Electricity',
    'Water',
    'Internet',
    'Phone & Mobile',
    'Credit Card',
    'Office Rent',
    'Software & Subscriptions',
    'Office Supplies & Maintenance',
    'Custom'
  ]);

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);

  // Form State for Add / Edit
  const [formState, setFormState] = useState<Omit<CompanyExpense, 'id' | 'createdAt'>>({
    title: '',
    category: 'Electricity',
    vendorProvider: '',
    amountType: 'Manual Statement',
    amount: 0,
    dueDateType: 'Fixed Monthly Day',
    fixedDueDay: 15,
    dueDate: new Date().toISOString().split('T')[0],
    monthYear: selectedMonth,
    status: 'Unpaid',
    accountNumber: '',
    notes: ''
  });

  // Pay Form State
  const [payDetails, setPayDetails] = useState({
    paidDate: new Date().toISOString().split('T')[0],
    paidAmount: 0,
    paymentMethod: 'Bank Transfer (BDO)',
    referenceNo: '',
    receiptNotes: ''
  });

  // Filter expenses by selected month and search term
  const filteredExpenses = companyExpenses.filter(exp => {
    const matchesMonth = exp.monthYear === selectedMonth;
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          exp.vendorProvider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (exp.accountNumber && exp.accountNumber.includes(searchTerm));
    return matchesMonth && matchesCategory && matchesSearch;
  });

  // Summary Metrics
  const totalMonthlyAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = filteredExpenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + (e.paidDetails?.paidAmount || e.amount), 0);
  const totalUnpaid = filteredExpenses.filter(e => e.status !== 'Paid').reduce((sum, e) => sum + e.amount, 0);
  const totalCreditCards = filteredExpenses.filter(e => e.category === 'Credit Card').reduce((sum, e) => sum + e.amount, 0);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense) {
      updateCompanyExpense(editingExpense.id, formState);
    } else {
      addCompanyExpense(formState);
    }

    if (currentUser) {
      addAuditLog(
        editingExpense ? 'Updated Company Expense' : 'Added Company Expense',
        `${formState.title} (${formState.category}) - ₱${formState.amount.toLocaleString()} for ${formState.monthYear}`,
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

    markExpensePaid(showPayModal.id, payDetails);

    if (currentUser) {
      addAuditLog(
        'Paid Company Expense',
        `Marked ${showPayModal.title} paid ₱${payDetails.paidAmount.toLocaleString()} via ${payDetails.paymentMethod} (Ref: ${payDetails.referenceNo || 'N/A'})`,
        currentUser.id,
        currentUser.fullName
      );
    }

    setShowPayModal(null);
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
                <Receipt className="w-3.5 h-3.5 text-amber-400" /> Internal Firm Accounts Payable
              </span>
              <span className="text-xs text-slate-400 font-mono">Monthly Utilities & Credit Cards</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Company Operating Expenses & Bills</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Monthly tracking for company bills (Electricity, Water, Internet, Phone), Credit Cards, Office Rent, and custom dynamic operational expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingExpense(null);
                setFormState({
                  title: '',
                  category: 'Electricity',
                  vendorProvider: '',
                  amountType: 'Manual Statement',
                  amount: 0,
                  dueDateType: 'Fixed Monthly Day',
                  fixedDueDay: 15,
                  dueDate: new Date().toISOString().split('T')[0],
                  monthYear: selectedMonth,
                  status: 'Unpaid',
                  accountNumber: '',
                  notes: ''
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Company Bill / Expense
            </button>
          </div>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Total Expenses ({selectedMonth}):</span>
            <p className="text-lg font-bold text-white mt-0.5">₱{totalMonthlyAmount.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium font-sans">Settled / Paid:</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">₱{totalPaid.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium font-sans">Pending Unpaid Due:</span>
            <p className="text-lg font-bold text-rose-400 mt-0.5">₱{totalUnpaid.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium font-sans">Credit Cards Balance:</span>
            <p className="text-lg font-bold text-amber-400 mt-0.5">₱{totalCreditCards.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Month Selector & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-bold text-slate-700">Billing Month:</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-slate-50"
            >
              <option value="August 2026">August 2026</option>
              <option value="July 2026">July 2026</option>
              <option value="June 2026">June 2026</option>
              <option value="September 2026">September 2026</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-slate-50"
            >
              <option value="All">All Categories ({categories.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
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

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider">Monthly Operating Bills ({filteredExpenses.length})</span>
          <span className="text-slate-500 font-mono">Showing {selectedMonth}</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredExpenses.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No Expenses Recorded for {selectedMonth}</p>
              <p className="text-xs text-slate-400">Click "Add Company Bill / Expense" above to track electricity, water, internet, phone, or credit card statements.</p>
            </div>
          ) : (
            filteredExpenses.map(expense => (
              <div key={expense.id} className="p-5 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                      {getCategoryIcon(expense.category)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{expense.title}</h4>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-medium text-[10px] rounded border border-slate-200">
                          {expense.category}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          expense.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          expense.status === 'Overdue' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {expense.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Vendor: <strong className="text-slate-700">{expense.vendorProvider}</strong>
                        {expense.accountNumber && <span> • Account #: <strong className="font-mono text-slate-700">{expense.accountNumber}</strong></span>}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 flex items-center gap-3 pl-11">
                    <span>Deadline: <strong className="text-slate-800 font-mono">{expense.dueDateType === 'Fixed Monthly Day' ? `Every ${expense.fixedDueDay}th of month` : expense.dueDate}</strong></span>
                    <span>•</span>
                    <span className="text-slate-600 font-sans">{expense.amountType}</span>
                    {expense.notes && (
                      <>
                        <span>•</span>
                        <span className="italic text-slate-500 font-sans">"{expense.notes}"</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-6 pl-11 md:pl-0">
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block font-sans">Bill Amount</span>
                    <span className="text-base font-bold text-slate-900">₱{expense.amount.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {expense.status !== 'Paid' ? (
                      <button
                        onClick={() => {
                          setShowPayModal(expense);
                          setPayDetails({
                            paidDate: new Date().toISOString().split('T')[0],
                            paidAmount: expense.amount,
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
                        setFormState(expense);
                        setShowAddModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer"
                      title="Edit Expense"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete bill "${expense.title}"?`)) {
                          deleteCompanyExpense(expense.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: ADD / EDIT COMPANY BILL / EXPENSE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveExpense} className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                {editingExpense ? 'Edit Operating Expense' : 'Add New Company Bill / Expense'}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Expense / Bill Title</label>
                <input
                  type="text"
                  required
                  value={formState.title}
                  onChange={e => setFormState({ ...formState, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Meralco Main Office Electricity, PLDT Fiber, BDO Credit Card #1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Category</label>
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

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vendor / Provider</label>
                <input
                  type="text"
                  required
                  value={formState.vendorProvider}
                  onChange={e => setFormState({ ...formState, vendorProvider: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Meralco, Maynilad, Globe, BDO"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Type</label>
                <select
                  value={formState.amountType}
                  onChange={e => setFormState({ ...formState, amountType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Fixed Monthly">Fixed Monthly Amount</option>
                  <option value="Manual Statement">Manual Statement Amount</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Due (₱)</label>
                <input
                  type="number"
                  required
                  value={formState.amount}
                  onChange={e => setFormState({ ...formState, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  placeholder="e.g. 18500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deadline Type</label>
                <select
                  value={formState.dueDateType}
                  onChange={e => setFormState({ ...formState, dueDateType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Fixed Monthly Day">Fixed Day Every Month (e.g. 15th)</option>
                  <option value="Manual Specific Date">Manual Specific Date</option>
                </select>
              </div>

              {formState.dueDateType === 'Fixed Monthly Day' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Due Day of Month (1-31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formState.fixedDueDay || 15}
                    onChange={e => setFormState({ ...formState, fixedDueDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Specific Due Date</label>
                  <input
                    type="date"
                    value={formState.dueDate}
                    onChange={e => setFormState({ ...formState, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Account / Subscriber Number</label>
                <input
                  type="text"
                  value={formState.accountNumber || ''}
                  onChange={e => setFormState({ ...formState, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  placeholder="e.g. 1029384812"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Billing Month/Year</label>
                <input
                  type="text"
                  value={formState.monthYear}
                  onChange={e => setFormState({ ...formState, monthYear: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={formState.notes || ''}
                  onChange={e => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Higher consumption due to aircon summer load"
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
                className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Save Operating Bill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MARK EXPENSE PAID */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleConfirmPayment} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
                <span className="text-slate-600">Statement Amount:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">₱{showPayModal.amount.toLocaleString()}</span>
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
                <label className="font-bold text-slate-700 block mb-1">Transaction Ref / Confirmation #</label>
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
                className="px-5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
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
