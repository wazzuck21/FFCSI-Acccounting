import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  BillerMasterItem, 
  BillerCategory, 
  BillerPaymentType, 
  BillerRecurringFrequency 
} from '../types';
import { CurrencyInput } from './CurrencyInput';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  X, 
  RotateCw, 
  Sparkles, 
  Layers, 
  FileText, 
  Clock, 
  Calendar,
  AlertCircle,
  HelpCircle,
  Tag,
  DollarSign
} from 'lucide-react';

const CATEGORY_STYLES: Record<BillerCategory, { bg: string; text: string; border: string }> = {
  'BIR Tax Return': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Statutory Benefits / Loans': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Retainer Fee': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  'Service Charges': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  'Special Engagements': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  'Adjustments': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' }
};

export const BillerMasterCatalogView: React.FC = () => {
  const { 
    billerCatalog, 
    addBiller, 
    updateBiller, 
    deleteBiller, 
    toggleBillerActive,
    syncBillersFromRules 
  } = useData();
  const { isSuperAdmin } = useAuth();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BillerMasterItem | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<BillerCategory>('Retainer Fee');
  const [formPaymentType, setFormPaymentType] = useState<BillerPaymentType>('Recurring');
  const [formFrequency, setFormFrequency] = useState<BillerRecurringFrequency>('Monthly');
  const [formDefaultAmount, setFormDefaultAmount] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Sync notification message
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormCode('');
    setFormShortName('');
    setFormName('');
    setFormCategory('Retainer Fee');
    setFormPaymentType('Recurring');
    setFormFrequency('Monthly');
    setFormDefaultAmount(0);
    setFormDescription('');
    setFormActive(true);
    setFormError('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: BillerMasterItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormShortName(item.shortName || item.code);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPaymentType(item.paymentType);
    setFormFrequency(item.frequency || 'Monthly');
    setFormDefaultAmount(item.defaultAmount || 0);
    setFormDescription(item.description || '');
    setFormActive(item.active);
    setFormError('');
    setShowEditModal(true);
  };

  // Handle Save New Biller
  const handleSaveNewBiller = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = formCode.trim().toUpperCase();
    const cleanName = formName.trim();

    if (!cleanCode) {
      setFormError('Biller Code / Form Code is required (e.g. 0619E, RET-FEE).');
      return;
    }
    if (!cleanName) {
      setFormError('Official Form / Remittance Title is required.');
      return;
    }

    // Check duplicate code in catalog
    const isDuplicate = billerCatalog.some(
      b => b.code.toUpperCase() === cleanCode
    );
    if (isDuplicate) {
      setFormError(`A biller with code "${cleanCode}" already exists in the catalog.`);
      return;
    }

    addBiller({
      code: cleanCode,
      shortName: formShortName.trim() || cleanCode,
      name: cleanName,
      category: formCategory,
      paymentType: formPaymentType,
      frequency: formPaymentType === 'Recurring' ? formFrequency : undefined,
      defaultAmount: Number(formDefaultAmount) || 0,
      description: formDescription.trim(),
      active: formActive,
      isSystemDefault: false
    });

    setShowAddModal(false);
  };

  // Handle Update Existing Biller
  const handleUpdateBiller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError('');

    const cleanCode = formCode.trim().toUpperCase();
    const cleanName = formName.trim();

    if (!cleanCode) {
      setFormError('Biller Code / Form Code is required.');
      return;
    }
    if (!cleanName) {
      setFormError('Official Form / Remittance Title is required.');
      return;
    }

    // Check duplicate code (excluding itself)
    const isDuplicate = billerCatalog.some(
      b => b.id !== editingItem.id && b.code.toUpperCase() === cleanCode
    );
    if (isDuplicate) {
      setFormError(`Another biller with code "${cleanCode}" already exists.`);
      return;
    }

    updateBiller(editingItem.id, {
      code: cleanCode,
      shortName: formShortName.trim() || cleanCode,
      name: cleanName,
      category: formCategory,
      paymentType: formPaymentType,
      frequency: formPaymentType === 'Recurring' ? formFrequency : undefined,
      defaultAmount: Number(formDefaultAmount) || 0,
      description: formDescription.trim(),
      active: formActive
    });

    setShowEditModal(false);
    setEditingItem(null);
  };

  // Handle Delete
  const handleDeleteBiller = (item: BillerMasterItem) => {
    if (window.confirm(`Are you sure you want to remove biller "${item.code} - ${item.name}" from the master catalog?`)) {
      deleteBiller(item.id);
    }
  };

  // Handle Sync from BIR & Benefits rules
  const handleSyncRules = () => {
    const result = syncBillersFromRules();
    setSyncNotice(result.message);
    setTimeout(() => setSyncNotice(null), 6000);
  };

  // Filtered List
  const filteredBillers = billerCatalog.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      item.code.toLowerCase().includes(query) ||
      (item.shortName || '').toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query);

    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchType = selectedPaymentType === 'ALL' || item.paymentType === selectedPaymentType;
    const matchStatus = selectedStatus === 'ALL' || (selectedStatus === 'ACTIVE' ? item.active : !item.active);

    return matchSearch && matchCat && matchType && matchStatus;
  });

  // Summary counts
  const totalCount = billerCatalog.length;
  const birCount = billerCatalog.filter(b => b.category === 'BIR Tax Return').length;
  const benCount = billerCatalog.filter(b => b.category === 'Statutory Benefits / Loans').length;
  const retCount = billerCatalog.filter(b => b.category === 'Retainer Fee').length;
  const srvCount = billerCatalog.filter(b => b.category === 'Service Charges' || b.category === 'Special Engagements').length;
  const recurringCount = billerCatalog.filter(b => b.paymentType === 'Recurring').length;
  const oneTimeCount = billerCatalog.filter(b => b.paymentType === 'One-Time').length;

  const categoriesList: BillerCategory[] = [
    'BIR Tax Return',
    'Statutory Benefits / Loans',
    'Retainer Fee',
    'Service Charges',
    'Special Engagements',
    'Adjustments'
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Biller Master Data & Billable Items Catalog
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized master list of all compliance billers (0619E, 2550Q, SSS, HDMF, PhilHealth), Retainer Fees, and Service Charges with configurable frequencies and default rates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSyncRules}
            title="Auto-sync billers from BIR & Benefits compliance master rules"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer border border-slate-200"
          >
            <RotateCw className="w-4 h-4 text-slate-600" />
            Sync from BIR & Benefits Rules
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Biller / Fee Item
          </button>
        </div>
      </div>

      {/* Sync Notice Alert */}
      {syncNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-900 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button 
            onClick={() => setSyncNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics & Categorical Overview Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Billers</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">{totalCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{recurringCount} recurring • {oneTimeCount} one-time</span>
        </div>

        <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 block">BIR Tax Returns</span>
          <span className="text-xl font-extrabold text-amber-900 mt-1 block">{birCount}</span>
          <span className="text-[10px] text-amber-600/80 mt-0.5 block">0619E, 2550Q, 1601C, ITR</span>
        </div>

        <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">Benefits & Loans</span>
          <span className="text-xl font-extrabold text-emerald-900 mt-1 block">{benCount}</span>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">SSS, HDMF, PhilHealth</span>
        </div>

        <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-700 block">Retainer Fees</span>
          <span className="text-xl font-extrabold text-indigo-900 mt-1 block">{retCount}</span>
          <span className="text-[10px] text-indigo-600/80 mt-0.5 block">Monthly / Qtr Retainers</span>
        </div>

        <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-700 block">Service Charges</span>
          <span className="text-xl font-extrabold text-purple-900 mt-1 block">{srvCount}</span>
          <span className="text-[10px] text-purple-600/80 mt-0.5 block">Ad-Hoc / Liaison / SEC</span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-600 block">Active Status</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1 block">
            {billerCatalog.filter(b => b.active).length}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Ready for Invoicing</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Code (0619E, SSS), Remittance Title, or Description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-56 shrink-0">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Categories ({totalCount})</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({billerCatalog.filter(b => b.category === cat).length})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Type Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={selectedPaymentType}
              onChange={e => setSelectedPaymentType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Payment Types</option>
              <option value="Recurring">Recurring ({recurringCount})</option>
              <option value="One-Time">One-Time Only ({oneTimeCount})</option>
            </select>
          </div>

          {/* Active Status Filter */}
          <div className="w-full md:w-36 shrink-0">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

        </div>

        {/* Quick Filter Tag Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-[11px]">
          <span className="text-slate-400 font-medium mr-1 text-[10px] uppercase tracking-wider">Quick:</span>
          <button
            onClick={() => { setSelectedCategory('ALL'); setSelectedPaymentType('ALL'); setSelectedStatus('ALL'); setSearchQuery(''); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedCategory === 'ALL' && selectedPaymentType === 'ALL' && selectedStatus === 'ALL' && !searchQuery
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          {categoriesList.map(cat => {
            const count = billerCatalog.filter(b => b.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 shrink-0 ${
                  isSelected 
                    ? 'bg-emerald-700 text-white font-bold shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Billers Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900 text-sm">
              Biller Master Catalog Records
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-mono text-xs font-semibold">
              {filteredBillers.length} {filteredBillers.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click edit to update default rate or payment cadence
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-28">Form / Code</th>
                <th className="py-3 px-4 min-w-[240px]">Official Form / Remittance Title</th>
                <th className="py-3 px-4 w-44">Category</th>
                <th className="py-3 px-4 w-36">Payment Type</th>
                <th className="py-3 px-4 w-32 text-right">Default Rate</th>
                <th className="py-3 px-4 w-24 text-center">Status</th>
                <th className="py-3 px-4 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBillers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700 text-sm">No billers found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery || selectedCategory !== 'ALL' || selectedPaymentType !== 'ALL'
                          ? 'No catalog items match your search filter criteria.'
                          : 'Your Biller Master Catalog is empty. Click "Add New Biller" or "Sync from BIR & Benefits Rules" to start.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBillers.map(biller => {
                  const catStyle = CATEGORY_STYLES[biller.category] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
                  
                  return (
                    <tr 
                      key={biller.id}
                      className={`hover:bg-slate-50/70 transition-colors ${!biller.active ? 'opacity-60 bg-slate-50/30' : ''}`}
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-slate-800 text-xs inline-block">
                          {biller.code}
                        </span>
                      </td>

                      {/* Title & Short Name & Description */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-xs">
                            {biller.name}
                          </div>
                          {biller.description && (
                            <div className="text-[11px] text-slate-400 font-normal line-clamp-1">
                              {biller.description}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                          {biller.category}
                        </span>
                      </td>

                      {/* Payment Type & Frequency */}
                      <td className="py-3 px-4">
                        {biller.paymentType === 'Recurring' ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-indigo-700 font-semibold bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/60">
                            <RotateCw className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>{biller.frequency || 'Monthly'}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>One-Time / Ad-Hoc</span>
                          </div>
                        )}
                      </td>

                      {/* Default Rate */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {biller.defaultAmount && biller.defaultAmount > 0 ? (
                          <span className="text-emerald-700">₱{biller.defaultAmount.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-normal italic">₱0 (Pass-Through)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleBillerActive(biller.id)}
                          title={`Click to ${biller.active ? 'deactivate' : 'activate'} this biller`}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            biller.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {biller.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(biller)}
                            title="Edit Biller Details"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteBiller(biller)}
                            title="Delete from Catalog"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add New Biller */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Add New Biller / Billable Item
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewBiller} className="space-y-4 text-xs">
              
              {/* Category */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Biller Category *</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as BillerCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-100"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Code and Short Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Form Code / Short Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 0619E, 2550Q, RET-FEE"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Unique code used for matching.</p>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Display Badge / Short Name</label>
                  <input
                    type="text"
                    value={formShortName}
                    onChange={e => setFormShortName(e.target.value)}
                    placeholder="e.g. 0619E, Retainer Fee"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Short label for compact displays.</p>
                </div>
              </div>

              {/* Official Remittance / Form Title */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Official Form / Remittance Title *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Monthly Remittance Return of Creditable Income Taxes Withheld (Expanded)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Payment Frequency / Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Payment Type *</label>
                  <select
                    value={formPaymentType}
                    onChange={e => setFormPaymentType(e.target.value as BillerPaymentType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="Recurring">Recurring (Periodic)</option>
                    <option value="One-Time">One-Time Only (Ad-Hoc / Per Engagement)</option>
                  </select>
                </div>

                {formPaymentType === 'Recurring' ? (
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Recurring Frequency *</label>
                    <select
                      value={formFrequency}
                      onChange={e => setFormFrequency(e.target.value as BillerRecurringFrequency)}
                      className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-indigo-900 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Semi-Annually">Semi-Annually</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Billing Mode</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium">
                      Per Engagement / Ad-Hoc
                    </div>
                  </div>
                )}
              </div>

              {/* Default Amount */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  Default / Standard Amount (₱)
                </label>
                <CurrencyInput
                  value={formDefaultAmount}
                  onChange={val => setFormDefaultAmount(val)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave ₱0 for pass-through payments or variable tax remittance amounts. Can always be overridden when billing.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Optional scope, filing deadline note, or billing instructions..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="addFormActive"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="addFormActive" className="text-slate-700 font-semibold cursor-pointer">
                  Active (Available for selection in invoicing & collections)
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-xs"
                >
                  Save Biller Item
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Biller */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                Edit Biller Item: {editingItem.code}
              </h3>
              <button 
                onClick={() => { setShowEditModal(false); setEditingItem(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateBiller} className="space-y-4 text-xs">
              
              {/* Category */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Biller Category *</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as BillerCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-100"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Code and Short Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Form Code / Short Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Display Badge / Short Name</label>
                  <input
                    type="text"
                    value={formShortName}
                    onChange={e => setFormShortName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Official Remittance / Form Title */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Official Form / Remittance Title *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Payment Frequency / Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Payment Type *</label>
                  <select
                    value={formPaymentType}
                    onChange={e => setFormPaymentType(e.target.value as BillerPaymentType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="Recurring">Recurring (Periodic)</option>
                    <option value="One-Time">One-Time Only (Ad-Hoc / Per Engagement)</option>
                  </select>
                </div>

                {formPaymentType === 'Recurring' ? (
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Recurring Frequency *</label>
                    <select
                      value={formFrequency}
                      onChange={e => setFormFrequency(e.target.value as BillerRecurringFrequency)}
                      className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-indigo-900 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Semi-Annually">Semi-Annually</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Billing Mode</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium">
                      Per Engagement / Ad-Hoc
                    </div>
                  </div>
                )}
              </div>

              {/* Default Amount */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  Default / Standard Amount (₱)
                </label>
                <CurrencyInput
                  value={formDefaultAmount}
                  onChange={val => setFormDefaultAmount(val)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editFormActive"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="editFormActive" className="text-slate-700 font-semibold cursor-pointer">
                  Active (Available for selection in invoicing & collections)
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingItem(null); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-xs"
                >
                  Update Biller
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
