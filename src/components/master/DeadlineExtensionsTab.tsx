import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { DeadlineExtensionRule } from '../../types';
import { 
  DEFAULT_DEADLINE_EXTENSIONS,
  getAvailableClientRDOs,
  getAvailableClientForms,
  getClientsMatchingDeadlineExtension
} from '../../utils/deadlineEngine';
import { TablePagination } from '../TablePagination';
import { usePagination } from '../../utils/usePagination';
import { 
  ShieldAlert, 
  Plus, 
  Edit3, 
  Trash2, 
  FileText, 
  Check, 
  X, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  AlertCircle, 
  Calendar as CalendarIcon,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Square,
  Users,
  Layers,
  History
} from 'lucide-react';

export const DeadlineExtensionsTab: React.FC = () => {
  const { masterChoices, clients, addDeadlineExtension, updateDeadlineExtension, deleteDeadlineExtension } = useData();
  const { isSuperAdmin, currentUser } = useAuth();

  const extensions = masterChoices.deadlineExtensions || DEFAULT_DEADLINE_EXTENSIONS;

  // Filter & Search states
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'All Clients' | 'RDO' | 'Client' | 'Form'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Expired'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingExt, setEditingExt] = useState<DeadlineExtensionRule | null>(null);
  const [title, setTitle] = useState('');
  const [statutoryType, setStatutoryType] = useState<'BIR' | 'BENEFITS'>('BIR');
  const [scope, setScope] = useState<'RDO' | 'Form' | 'Client' | 'All Clients'>('RDO');

  // Dynamic Multi-Select States
  const [selectedRdos, setSelectedRdos] = useState<string[]>([]);
  const [rdoSearch, setRdoSearch] = useState('');

  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [formSearch, setFormSearch] = useState('');

  const [targetClientId, setTargetClientId] = useState('');

  // Dates
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []); // YYYY-MM
  
  const [targetMonth, setTargetMonth] = useState<string>(currentMonthStr);
  const [extendedDeadlineDate, setExtendedDeadlineDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'Active' | 'Expired'>('Active');

  // Available RDOs & Forms derived purely from Master Client Data
  const availableRdos = useMemo(() => getAvailableClientRDOs(clients), [clients]);
  const availableForms = useMemo(() => getAvailableClientForms(clients, statutoryType), [clients, statutoryType]);

  // Clients matching RDO counts
  const rdoClientCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      if (c.status === 'Archived') return;
      const rdo = (c.rdoNumber || '').trim();
      if (rdo) {
        counts[rdo] = (counts[rdo] || 0) + 1;
      }
    });
    return counts;
  }, [clients]);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingExt(null);
    setTitle('');
    setStatutoryType('BIR');
    setScope('RDO');
    setSelectedRdos(availableRdos.length > 0 ? [availableRdos[0]] : []);
    setRdoSearch('');
    setSelectedForms([]);
    setFormSearch('');
    setTargetClientId('');
    setTargetMonth(currentMonthStr);
    setExtendedDeadlineDate(todayStr);
    setReason('');
    setStatus('Active');
    setShowModal(true);
  };

  const handleOpenEdit = (ext: DeadlineExtensionRule) => {
    setEditingExt(ext);
    setTitle(ext.title || '');
    const statType = ext.statutoryType || (ext.category === 'Benefits' ? 'BENEFITS' : 'BIR');
    setStatutoryType(statType);
    setScope(ext.scope || (ext.targetClientId ? 'Client' : ext.targetRdoCodes && ext.targetRdoCodes.length > 0 ? 'RDO' : 'All Clients'));
    
    // RDOS
    const rdos = ext.targetRdoCodes || ext.targetRdos || (ext.targetRdo ? [ext.targetRdo] : []);
    setSelectedRdos(rdos);
    setRdoSearch('');

    // Forms
    const forms = ext.applicableFormCodes || ext.targetFormCodes || (ext.targetFormCode ? [ext.targetFormCode] : []);
    setSelectedForms(forms);
    setFormSearch('');

    setTargetClientId(ext.targetClientId || '');
    
    // Month
    if (ext.targetMonth) {
      setTargetMonth(ext.targetMonth);
    } else if (ext.applicableYear && ext.applicableMonth && ext.applicableMonth !== 'ALL') {
      const monthMap: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const mNum = monthMap[ext.applicableMonth.substring(0, 3)] || '01';
      setTargetMonth(`${ext.applicableYear}-${mNum}`);
    } else {
      setTargetMonth(currentMonthStr);
    }

    setExtendedDeadlineDate(ext.extendedDeadlineDate || ext.extendedDueDate || todayStr);
    setReason(ext.reason || '');
    setStatus(ext.status === 'Active' || ext.status === 'ACTIVE' ? 'Active' : 'Expired');
    setShowModal(true);
  };

  // Quick Select Helpers for RDOs
  const filteredRdos = useMemo(() => {
    if (!rdoSearch.trim()) return availableRdos;
    return availableRdos.filter(r => r.toLowerCase().includes(rdoSearch.toLowerCase()));
  }, [availableRdos, rdoSearch]);

  const handleToggleRdo = (rdo: string) => {
    setSelectedRdos(prev => 
      prev.includes(rdo) ? prev.filter(r => r !== rdo) : [...prev, rdo]
    );
  };

  const handleSelectAllRdos = () => {
    setSelectedRdos(Array.from(new Set([...selectedRdos, ...filteredRdos])));
  };

  const handleClearAllRdos = () => {
    setSelectedRdos([]);
  };

  // Quick Select Helpers for Forms
  const filteredForms = useMemo(() => {
    if (!formSearch.trim()) return availableForms;
    return availableForms.filter(f => f.toLowerCase().includes(formSearch.toLowerCase()));
  }, [availableForms, formSearch]);

  const handleToggleForm = (form: string) => {
    setSelectedForms(prev => 
      prev.includes(form) ? prev.filter(f => f !== form) : [...prev, form]
    );
  };

  const handleSelectAllForms = () => {
    setSelectedForms(Array.from(new Set([...selectedForms, ...filteredForms])));
  };

  const handleClearAllForms = () => {
    setSelectedForms([]);
  };

  // Real-time matching clients preview
  const draftRulePreview: DeadlineExtensionRule = useMemo(() => {
    const yr = targetMonth ? parseInt(targetMonth.substring(0, 4), 10) : 2026;
    return {
      id: 'draft',
      title: title.trim() || 'Draft Extension Rule',
      statutoryType,
      category: statutoryType === 'BIR' ? 'BIR' : 'Benefits',
      scope,
      targetRdoCodes: scope === 'RDO' ? selectedRdos : [],
      targetRdos: scope === 'RDO' ? selectedRdos : [],
      targetRdo: scope === 'RDO' && selectedRdos.length === 1 ? selectedRdos[0] : undefined,
      applicableFormCodes: selectedForms,
      targetFormCodes: selectedForms,
      targetClientId: scope === 'Client' ? targetClientId : undefined,
      targetMonth,
      applicableYear: yr,
      extendedDeadlineDate,
      reason: reason.trim(),
      status: 'Active',
      createdAt: new Date().toISOString()
    };
  }, [title, statutoryType, scope, selectedRdos, selectedForms, targetClientId, targetMonth, extendedDeadlineDate, reason]);

  const matchingClients = useMemo(() => {
    return getClientsMatchingDeadlineExtension(draftRulePreview, clients);
  }, [draftRulePreview, clients]);

  const handleSaveExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !extendedDeadlineDate) {
      alert('Please provide extension title and extended deadline date.');
      return;
    }

    if (scope === 'RDO' && selectedRdos.length === 0) {
      alert('Please select at least one Target RDO Code.');
      return;
    }

    if (scope === 'Client' && !targetClientId) {
      alert('Please select a client.');
      return;
    }

    const yr = targetMonth ? parseInt(targetMonth.substring(0, 4), 10) : 2026;
    const mParts = targetMonth ? targetMonth.split('-') : ['2026', '08'];
    const monthNum = parseInt(mParts[1] || '1', 10);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const applicableMonth = monthNames[monthNum - 1] || 'ALL';

    const clientObj = targetClientId ? clients.find(c => c.id === targetClientId) : undefined;
    const nowIso = new Date().toISOString();

    const payload: Partial<DeadlineExtensionRule> = {
      title: title.trim(),
      statutoryType,
      category: statutoryType === 'BIR' ? 'BIR' : 'Benefits',
      scope,
      targetRdoCodes: scope === 'RDO' ? selectedRdos : [],
      targetRdos: scope === 'RDO' ? selectedRdos : [],
      targetRdo: scope === 'RDO' && selectedRdos.length === 1 ? selectedRdos[0] : undefined,
      targetClientId: scope === 'Client' ? targetClientId : undefined,
      targetClientName: clientObj?.companyName,
      applicableFormCodes: selectedForms,
      targetFormCodes: selectedForms,
      targetFormCode: selectedForms.length === 1 ? selectedForms[0] : undefined,
      targetMonth,
      applicableYear: yr,
      applicableMonth,
      extendedDeadlineDate,
      extendedDueDate: extendedDeadlineDate,
      reason: reason.trim(),
      status,
      updatedAt: nowIso,
      updatedBy: currentUser?.fullName || 'Super Admin'
    };

    if (editingExt) {
      updateDeadlineExtension(editingExt.id, payload);
      showToast(`Updated deadline extension rule "${title.trim()}".`);
    } else {
      addDeadlineExtension({
        ...payload,
        createdAt: nowIso,
        createdBy: currentUser?.fullName || 'Super Admin'
      } as any);
      showToast(`Created dynamic deadline extension rule "${title.trim()}".`);
    }

    setShowModal(false);
  };

  const handleDelete = (ext: DeadlineExtensionRule) => {
    if (window.confirm(`Are you sure you want to delete extension rule "${ext.title}"?`)) {
      deleteDeadlineExtension(ext.id);
      showToast(`Deleted extension "${ext.title}".`);
    }
  };

  const handleToggleStatus = (ext: DeadlineExtensionRule) => {
    const isAct = ext.status === 'Active' || ext.status === 'ACTIVE';
    const newStatus = isAct ? 'Expired' : 'Active';
    updateDeadlineExtension(ext.id, { 
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.fullName || 'Super Admin'
    });
    showToast(`Extension "${ext.title}" marked as ${newStatus}.`);
  };

  // Filtered list
  const filteredExtensions = extensions.filter(ext => {
    if (scopeFilter !== 'ALL' && ext.scope !== scopeFilter) return false;
    const isAct = ext.status === 'Active' || ext.status === 'ACTIVE';
    if (statusFilter === 'Active' && !isAct) return false;
    if (statusFilter === 'Expired' && isAct) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (ext.title || '').toLowerCase().includes(q);
      const matchReason = (ext.reason || '').toLowerCase().includes(q);
      const matchRdo = (ext.targetRdoCodes || ext.targetRdos || [ext.targetRdo || '']).some(r => r.toLowerCase().includes(q));
      const matchForm = (ext.applicableFormCodes || ext.targetFormCodes || [ext.targetFormCode || '']).some(f => f.toLowerCase().includes(q));
      if (!matchTitle && !matchReason && !matchRdo && !matchForm) return false;
    }
    return true;
  });

  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems: paginatedExtensions,
    setCurrentPage,
    setPageSize,
    loadMore,
    hasMoreToLoad,
  } = usePagination(filteredExtensions, {
    initialPageSize: 15,
    resetOnChange: `${scopeFilter}_${statusFilter}_${searchQuery}`,
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Dynamic Deadline Extension Rules & RMC Overrides
            </h2>
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-full">
              Authoritative Single Source of Truth
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure dynamic BIR and Benefit deadline extensions. Directly drives deadline calculations across Deadline Monitoring, Payables, and Staff Tasks without hardcoded RDOs or forms.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Extension Rule
          </button>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
          </div>

          <select
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:bg-white"
          >
            <option value="ALL">All Scopes</option>
            <option value="RDO">RDO Specific</option>
            <option value="Form">Form / Obligation Specific</option>
            <option value="Client">Client Specific</option>
            <option value="All Clients">All Clients (Nationwide)</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Expired">Expired / Inactive Only</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search RMC, RDO, Form Code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-100"
          />
        </div>
      </div>

      {/* Extensions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                <th className="py-2.5 px-3">Title & Circular Reference</th>
                <th className="py-2.5 px-3">Target Scope & RDOs</th>
                <th className="py-2.5 px-3">Applicable Forms / Benefits</th>
                <th className="py-2.5 px-3">Target Month</th>
                <th className="py-2.5 px-3">Extended Due Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredExtensions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    No deadline extension rules found matching current criteria.
                  </td>
                </tr>
              ) : (
                paginatedExtensions.map(ext => {
                  const clientObj = ext.targetClientId ? clients.find(c => c.id === ext.targetClientId) : null;
                  const rdos = ext.targetRdoCodes || ext.targetRdos || (ext.targetRdo ? [ext.targetRdo] : []);
                  const forms = ext.applicableFormCodes || ext.targetFormCodes || (ext.targetFormCode ? [ext.targetFormCode] : []);
                  const isAct = ext.status === 'Active' || ext.status === 'ACTIVE';

                  return (
                    <tr key={ext.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{ext.title}</span>
                        {ext.reason && (
                          <span className="text-[10px] text-slate-500 line-clamp-1">{ext.reason}</span>
                        )}
                        {ext.createdBy && (
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            Created by {ext.createdBy} {ext.createdAt && `• ${ext.createdAt.substring(0, 10)}`}
                          </span>
                        )}
                      </td>
                      
                      <td className="py-2.5 px-3">
                        {rdos.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            {rdos.map(r => (
                              <span key={r} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[10px]">
                                <MapPin className="w-2.5 h-2.5 text-amber-600" /> RDO {r}
                              </span>
                            ))}
                          </div>
                        ) : ext.scope === 'Client' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold border border-purple-200 text-[10px]">
                            <Building2 className="w-3 h-3 text-purple-600" />
                            {clientObj?.companyName || ext.targetClientId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                            All Clients (Nationwide)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {forms.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            {forms.map(f => (
                              <span key={f} className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px]">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">All Obligations</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {ext.targetMonth || (ext.applicableMonth && ext.applicableYear ? `${ext.applicableMonth} ${ext.applicableYear}` : 'All Months')}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                          {ext.extendedDeadlineDate || ext.extendedDueDate}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(ext)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] transition-colors cursor-pointer ${
                            isAct
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Active / Expired"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isAct ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                          {isAct ? 'Active' : 'Expired'}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isSuperAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(ext)}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Edit Extension"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(ext)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete Extension"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredExtensions.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onLoadMore={loadMore}
            hasMoreToLoad={hasMoreToLoad}
            itemLabel="extension rules"
          />
        )}
      </div>

      {/* Add / Edit Dynamic Extension Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full space-y-4 text-xs shadow-xl text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  {editingExt ? 'Edit Dynamic Deadline Extension Rule' : 'Create Dynamic Deadline Extension Rule'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dynamic rules automatically adapt to client master records.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExtension} className="space-y-4">
              
              {/* Title / Circular */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Title / Circular Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BIR RMC No. 18-2026 — RDO 038 & 044 2550Q Extended Deadline"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-100 font-medium text-xs"
                />
              </div>

              {/* Statutory Type & Scope Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Statutory Category *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatutoryType('BIR')}
                      className={`px-3 py-2 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                        statutoryType === 'BIR'
                          ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-100'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      BIR Taxes
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatutoryType('BENEFITS')}
                      className={`px-3 py-2 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                        statutoryType === 'BENEFITS'
                          ? 'bg-purple-50 border-purple-300 text-purple-800 ring-2 ring-purple-100'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Statutory Benefits
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Target Scope *</label>
                  <select
                    value={scope}
                    onChange={e => setScope(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="RDO">Target RDO Code(s)</option>
                    <option value="Form">Form / Obligation Only (All Clients)</option>
                    <option value="Client">Single Client Specific</option>
                    <option value="All Clients">All Clients (Nationwide)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic RDO Multi-Select (When Scope is RDO) */}
              {scope === 'RDO' && (
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-amber-900 font-bold flex items-center gap-1.5 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-amber-700" />
                      Dynamic Target RDO Codes ({availableRdos.length} active in Master Data)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllRdos}
                        className="text-[10px] text-amber-700 hover:underline font-semibold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllRdos}
                        className="text-[10px] text-slate-500 hover:underline font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* RDO Search Bar */}
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Search RDO codes (e.g. 038, 044)..."
                      value={rdoSearch}
                      onChange={e => setRdoSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>

                  {/* RDO Multi-Select Grid */}
                  <div className="max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-white/80 rounded-lg border border-amber-100">
                    {filteredRdos.length === 0 ? (
                      <div className="col-span-3 py-3 text-center text-slate-400 text-[11px]">
                        No client RDOs matching "{rdoSearch}".
                      </div>
                    ) : (
                      filteredRdos.map(rdo => {
                        const isChecked = selectedRdos.includes(rdo);
                        const count = rdoClientCounts[rdo] || 0;
                        return (
                          <button
                            key={rdo}
                            type="button"
                            onClick={() => handleToggleRdo(rdo)}
                            className={`px-2.5 py-1.5 rounded-md text-left flex items-center justify-between border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-amber-100/80 border-amber-300 text-amber-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-xs font-mono">
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-amber-700" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              RDO {rdo}
                            </span>
                            <span className="text-[10px] font-normal text-slate-500 bg-white/60 px-1 rounded">
                              {count} {count === 1 ? 'client' : 'clients'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="text-[10px] text-amber-800 font-medium">
                    {selectedRdos.length} RDO{selectedRdos.length === 1 ? '' : 's'} selected
                  </div>
                </div>
              )}

              {/* Single Client Selection (When Scope is Client) */}
              {scope === 'Client' && (
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Select Target Client *</label>
                  <select
                    required
                    value={targetClientId}
                    onChange={e => setTargetClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} (RDO: {c.rdoNumber || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Applicable Forms / Benefit Obligations Multi-Select */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Applicable Forms / Obligations ({availableForms.length} assigned to clients)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllForms}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllForms}
                      className="text-[10px] text-slate-500 hover:underline font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Form Search Bar */}
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search form codes (e.g. 0619E, 2550Q, SSS)..."
                    value={formSearch}
                    onChange={e => setFormSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Forms Multi-Select Grid */}
                <div className="max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-white rounded-lg border border-slate-200">
                  {filteredForms.length === 0 ? (
                    <div className="col-span-3 py-3 text-center text-slate-400 text-[11px]">
                      No active {statutoryType} obligations found matching "{formSearch}".
                    </div>
                  ) : (
                    filteredForms.map(form => {
                      const isChecked = selectedForms.includes(form);
                      return (
                        <button
                          key={form}
                          type="button"
                          onClick={() => handleToggleForm(form)}
                          className={`px-2.5 py-1.5 rounded-md text-left flex items-center gap-1.5 border transition-all cursor-pointer text-xs ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{form}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {selectedForms.length === 0 ? 'All forms / obligations apply by default' : `${selectedForms.length} specific obligation(s) selected`}
                </div>
              </div>

              {/* Target Month & Extended Due Date (Defaults to Current System Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    Target Month (Affected Period) *
                  </label>
                  <input
                    type="month"
                    required
                    value={targetMonth}
                    onChange={e => setTargetMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-amber-100 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Affects ONLY deadlines falling in this month.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    Extended Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={extendedDeadlineDate}
                    onChange={e => setExtendedDeadlineDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-amber-800 focus:bg-white focus:ring-2 focus:ring-amber-100 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    New mandatory deadline for affected clients.
                  </p>
                </div>
              </div>

              {/* Justification / Reason */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Reason / Legal Basis</label>
                <input
                  type="text"
                  placeholder="e.g. Extended per BIR Operations Memorandum No. 2026-08 / Typhoon holiday adjustment"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-100 text-xs"
                />
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-1">
                <label className="text-slate-700 font-bold">Rule Status</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus(prev => prev === 'Active' ? 'Expired' : 'Active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                    {status === 'Active' ? 'Active Rule' : 'Inactive / Expired'}
                  </button>
                </div>
              </div>

              {/* Real-Time Impacted Clients Preview */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="font-bold text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    Impacted Clients Preview: {matchingClients.length} client{matchingClients.length === 1 ? '' : 's'}
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">Auto-Calculated</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  {matchingClients.length === 0
                    ? 'No current clients match the selected RDOs / forms.'
                    : `Will immediately extend due dates for ${matchingClients.slice(0, 4).map(c => c.companyName).join(', ')}${matchingClients.length > 4 ? ` and ${matchingClients.length - 4} others` : ''}.`}
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  {editingExt ? 'Save Changes' : 'Create Extension Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
