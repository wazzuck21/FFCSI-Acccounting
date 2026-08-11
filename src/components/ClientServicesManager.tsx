import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ClientService, ServiceCategory, ServiceStatus, ServiceBillingFrequency } from '../types';
import { 
  Briefcase, 
  Plus, 
  Edit3, 
  PauseCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  User, 
  FileText, 
  ShieldCheck, 
  Layers, 
  Search, 
  Filter,
  Receipt,
  Info
} from 'lucide-react';

interface ClientServicesManagerProps {
  clientId: string;
  isSuperAdmin?: boolean;
}

export const ClientServicesManager: React.FC<ClientServicesManagerProps> = ({ clientId, isSuperAdmin = true }) => {
  const { 
    clients, 
    clientServices, 
    addClientService, 
    updateClientService, 
    suspendClientService, 
    endClientService, 
    restoreClientService,
    employees,
    masterChoices
  } = useData();

  const client = clients.find(c => c.id === clientId);
  const services = clientServices.filter(s => s.clientId === clientId);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<ClientService | null>(null);
  const [suspendingService, setSuspendingService] = useState<ClientService | null>(null);
  const [endingService, setEndingService] = useState<ClientService | null>(null);

  // Action Feedback
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    category: 'BIR' as ServiceCategory,
    serviceCode: '',
    serviceName: '',
    fee: 0,
    billingFrequency: 'Monthly' as ServiceBillingFrequency,
    startDate: new Date().toISOString().substring(0, 10),
    assignedStaffId: client?.assignedStaffId || '',
    assignedStaffName: client?.assignedStaffName || '',
    billable: true,
    generatesCompliance: true,
    notes: ''
  });

  // Action Reason inputs
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [endReason, setEndReason] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>(new Date().toISOString().substring(0, 10));

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleOpenAdd = () => {
    setFormData({
      category: 'BIR',
      serviceCode: '',
      serviceName: '',
      fee: 0,
      billingFrequency: 'Monthly',
      startDate: new Date().toISOString().substring(0, 10),
      assignedStaffId: client?.assignedStaffId || '',
      assignedStaffName: client?.assignedStaffName || '',
      billable: true,
      generatesCompliance: true,
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (svc: ClientService) => {
    setEditingService(svc);
    setFormData({
      category: svc.category,
      serviceCode: svc.serviceCode,
      serviceName: svc.serviceName,
      fee: svc.fee || 0,
      billingFrequency: svc.billingFrequency || 'Monthly',
      startDate: svc.startDate || new Date().toISOString().substring(0, 10),
      assignedStaffId: svc.assignedStaffId || '',
      assignedStaffName: svc.assignedStaffName || '',
      billable: svc.billable !== false,
      generatesCompliance: svc.generatesCompliance !== false,
      notes: svc.notes || ''
    });
  };

  // Quick preset selection from Master Tables
  const handleSelectPreset = (code: string, name: string, category: ServiceCategory) => {
    setFormData(prev => ({
      ...prev,
      category,
      serviceCode: code,
      serviceName: name
    }));
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceCode.trim() || !formData.serviceName.trim()) {
      showFeedback('error', 'Service Code and Service Name are required.');
      return;
    }

    const res = addClientService({
      clientId,
      category: formData.category,
      serviceCode: formData.serviceCode.trim().toUpperCase(),
      serviceName: formData.serviceName.trim(),
      status: 'Active',
      startDate: formData.startDate,
      fee: Number(formData.fee) || 0,
      billingFrequency: formData.billingFrequency,
      assignedStaffId: formData.assignedStaffId,
      assignedStaffName: formData.assignedStaffName,
      billable: formData.billable,
      generatesCompliance: formData.generatesCompliance,
      notes: formData.notes
    });

    if (res.success) {
      showFeedback('success', res.message);
      setShowAddModal(false);
    } else {
      showFeedback('error', res.message);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    const res = updateClientService(editingService.id, {
      category: formData.category,
      serviceName: formData.serviceName.trim(),
      fee: Number(formData.fee) || 0,
      billingFrequency: formData.billingFrequency,
      startDate: formData.startDate,
      assignedStaffId: formData.assignedStaffId,
      assignedStaffName: formData.assignedStaffName,
      billable: formData.billable,
      generatesCompliance: formData.generatesCompliance,
      notes: formData.notes
    });

    if (res.success) {
      showFeedback('success', res.message);
      setEditingService(null);
    } else {
      showFeedback('error', res.message);
    }
  };

  const handleConfirmSuspend = () => {
    if (!suspendingService) return;
    const res = suspendClientService(suspendingService.id, suspendReason);
    if (res.success) {
      showFeedback('success', res.message);
      setSuspendingService(null);
      setSuspendReason('');
    } else {
      showFeedback('error', res.message);
    }
  };

  const handleConfirmEnd = () => {
    if (!endingService) return;
    const res = endClientService(endingService.id, endDateInput, endReason);
    if (res.success) {
      showFeedback('success', res.message);
      setEndingService(null);
      setEndReason('');
    } else {
      showFeedback('error', res.message);
    }
  };

  const handleRestore = (id: string) => {
    const res = restoreClientService(id);
    if (res.success) {
      showFeedback('success', res.message);
    } else {
      showFeedback('error', res.message);
    }
  };

  // Filtered Services
  const filteredServices = services.filter(s => {
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
    const matchesSearch = searchQuery.trim() === '' || 
      s.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.serviceCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Summary Metrics
  const activeCount = services.filter(s => s.status === 'Active').length;
  const suspendedCount = services.filter(s => s.status === 'Suspended').length;
  const endedCount = services.filter(s => s.status === 'Ended').length;
  const totalMonthlyFee = services
    .filter(s => s.status === 'Active' && s.billable !== false)
    .reduce((sum, s) => {
      const mult = s.billingFrequency === 'Monthly' ? 1 : s.billingFrequency === 'Quarterly' ? 1/3 : s.billingFrequency === 'Annual' ? 1/12 : 0;
      return sum + ((s.fee || 0) * mult);
    }, 0);

  const getCategoryBadgeClass = (cat: ServiceCategory) => {
    switch (cat) {
      case 'BIR': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Benefits': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Accounting': return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Audit': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Payroll': return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Legal / SEC': return 'bg-rose-100 text-rose-900 border-rose-300';
      default: return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  const getStatusBadgeClass = (st: ServiceStatus) => {
    switch (st) {
      case 'Active': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Suspended': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Ended': return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between font-medium text-xs shadow-xs transition-all ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
      )}

      {/* Header & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Engagements</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold font-mono text-emerald-700">{activeCount}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-80" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Est. Monthly Service Revenue</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold font-mono text-indigo-700">₱{totalMonthlyFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            <DollarSign className="w-5 h-5 text-indigo-500 opacity-80" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Suspended Services</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold font-mono text-amber-700">{suspendedCount}</span>
            <PauseCircle className="w-5 h-5 text-amber-500 opacity-80" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ended Services</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold font-mono text-slate-500">{endedCount}</span>
            <XCircle className="w-5 h-5 text-slate-400 opacity-80" />
          </div>
        </div>
      </div>

      {/* Filters and Action Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Client Service Engagements</h3>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">
              {services.length} Total
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Engagement Service
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search service name or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Category:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="BIR">BIR Tax Compliance</option>
              <option value="Benefits">Statutory Benefits</option>
              <option value="Accounting">Accounting / Retainers</option>
              <option value="Audit">External Audit</option>
              <option value="Payroll">Payroll Processing</option>
              <option value="Legal / SEC">Legal & Corporate / SEC</option>
              <option value="Other">Other Custom Services</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Status:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Suspended">Suspended Only</option>
              <option value="Ended">Ended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services Table / List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {filteredServices.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No client services match your search filters.</p>
            {services.length === 0 && (
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                No active service engagements recorded for this client yet. Click "Add Engagement Service" above to enroll tax returns, retainer fees, or consulting services.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Service Code & Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Billing & Fee</th>
                  <th className="p-3.5">Assigned Staff</th>
                  <th className="p-3.5">Start / End Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map(svc => (
                  <tr key={svc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 text-[10px]">
                          {svc.serviceCode}
                        </span>
                        <span>{svc.serviceName}</span>
                      </div>
                      {svc.notes && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">{svc.notes}</p>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] ${getCategoryBadgeClass(svc.category)}`}>
                        {svc.category}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-800">
                        ₱{(svc.fee || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">/{svc.billingFrequency}</span>
                      </div>
                      {!svc.billable && (
                        <span className="text-[10px] text-amber-600 font-semibold">Non-billable</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{svc.assignedStaffName || 'Unassigned'}</span>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      <div>Start: {svc.startDate}</div>
                      {svc.endDate && <div className="text-rose-600 font-semibold">End: {svc.endDate}</div>}
                    </td>

                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md border font-bold text-[10px] inline-flex items-center gap-1 ${getStatusBadgeClass(svc.status)}`}>
                        {svc.status === 'Active' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {svc.status === 'Suspended' && <PauseCircle className="w-3 h-3 text-amber-600" />}
                        {svc.status === 'Ended' && <XCircle className="w-3 h-3 text-slate-400" />}
                        {svc.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(svc)}
                              title="Edit Service Details"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {svc.status === 'Active' && (
                              <button
                                onClick={() => {
                                  setSuspendingService(svc);
                                  setSuspendReason('');
                                }}
                                title="Suspend Service Engagement"
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <PauseCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {svc.status !== 'Ended' && (
                              <button
                                onClick={() => {
                                  setEndingService(svc);
                                  setEndReason('');
                                  setEndDateInput(new Date().toISOString().substring(0, 10));
                                }}
                                title="End / Terminate Service Engagement"
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {(svc.status === 'Suspended' || svc.status === 'Ended') && (
                              <button
                                onClick={() => handleRestore(svc.id)}
                                title="Reactivate Service Engagement"
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD SERVICE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Add New Service Engagement</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            {/* Presets Helper */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Quick Preset Select:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(masterChoices.birTaxOptions || []).slice(0, 5).map(opt => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleSelectPreset(opt.code, opt.name, 'BIR')}
                    className="px-2 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-[10px] font-bold text-amber-900 transition-colors"
                  >
                    BIR {opt.code}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSelectPreset('BOOKKEEPING', 'Monthly Retainer & Accounting Bookkeeping Services', 'Accounting')}
                  className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-[10px] font-bold text-blue-900 transition-colors"
                >
                  Bookkeeping Retainer
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('AUDIT_FINANCIALS', 'Annual Financial Statement Audit & Opinion', 'Audit')}
                  className="px-2 py-1 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-lg text-[10px] font-bold text-purple-900 transition-colors"
                >
                  Annual Audit
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="BIR">BIR Tax Compliance</option>
                    <option value="Benefits">Statutory Benefits (SSS/HDMF/PHIC)</option>
                    <option value="Accounting">Accounting / Bookkeeping Retainer</option>
                    <option value="Audit">External Financial Audit</option>
                    <option value="Payroll">Payroll Processing</option>
                    <option value="Legal / SEC">Legal & SEC / Corporate</option>
                    <option value="Other">Other Custom Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Service Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. 1702Q, BOOKKEEPING"
                    value={formData.serviceCode}
                    onChange={e => setFormData({ ...formData, serviceCode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Service Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Corporate Income Tax Return (Quarterly)"
                  value={formData.serviceName}
                  onChange={e => setFormData({ ...formData, serviceName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Service Fee (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.fee}
                    onChange={e => setFormData({ ...formData, fee: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Billing Cycle</label>
                  <select
                    value={formData.billingFrequency}
                    onChange={e => setFormData({ ...formData, billingFrequency: e.target.value as ServiceBillingFrequency })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                    <option value="One-Time">One-Time Engagement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Assigned Staff / Accountant</label>
                <select
                  value={formData.assignedStaffId}
                  onChange={e => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    setFormData({
                      ...formData,
                      assignedStaffId: e.target.value,
                      assignedStaffName: emp ? `${emp.firstName} ${emp.lastName}` : ''
                    });
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select Staff Member...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.billable}
                    onChange={e => setFormData({ ...formData, billable: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-slate-700">Billable Service</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.generatesCompliance}
                    onChange={e => setFormData({ ...formData, generatesCompliance: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-slate-700">Auto-Generates Compliance Deadlines</span>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Engagement Notes / Scope</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or contract details..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Save Service Engagement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SERVICE */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Edit Service: {editingService.serviceCode}</h3>
              </div>
              <button onClick={() => setEditingService(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Service Title</label>
                <input
                  type="text"
                  value={formData.serviceName}
                  onChange={e => setFormData({ ...formData, serviceName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Service Fee (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.fee}
                    onChange={e => setFormData({ ...formData, fee: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Billing Cycle</label>
                  <select
                    value={formData.billingFrequency}
                    onChange={e => setFormData({ ...formData, billingFrequency: e.target.value as ServiceBillingFrequency })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                    <option value="One-Time">One-Time Engagement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Assigned Staff</label>
                <select
                  value={formData.assignedStaffId}
                  onChange={e => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    setFormData({
                      ...formData,
                      assignedStaffId: e.target.value,
                      assignedStaffName: emp ? `${emp.firstName} ${emp.lastName}` : ''
                    });
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select Staff Member...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Update Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUSPEND SERVICE */}
      {suspendingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-amber-600">
              <PauseCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">Suspend Service Engagement</h3>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to suspend <strong>{suspendingService.serviceName}</strong> ({suspendingService.serviceCode})?
              Historical billing and compliance logs will be retained.
            </p>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Reason for Suspension (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Client temporarily paused business operations..."
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSuspendingService(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: END SERVICE */}
      {endingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">End / Terminate Service Engagement</h3>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to terminate <strong>{endingService.serviceName}</strong> ({endingService.serviceCode})?
              The service will be marked as Ended, preventing future automated billing while preserving all historical records.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Effective Termination Date</label>
                <input
                  type="date"
                  value={endDateInput}
                  onChange={e => setEndDateInput(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Termination Reason (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Contract expired, client transferred BIR RDO..."
                  value={endReason}
                  onChange={e => setEndReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEndingService(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEnd}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Terminate Engagement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
