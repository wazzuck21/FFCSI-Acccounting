import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ClientProfile, InvoiceItem } from '../types';
import { downloadInvoicePDF } from './BillingManagementView';
import { extractBaseTin } from '../utils/tinBranchUtils';
import { ClientServicesManager } from './ClientServicesManager';
import { buildClientSoaLedger } from '../utils/soaCalculator';
import { exportSOAExcel } from '../utils/excelExportUtils';
import { generateClientStatementOfAccountPDF } from '../utils/soaPdfGenerator';
import { 
  Building2, 
  FileText, 
  Receipt, 
  ShieldCheck, 
  FolderGit2, 
  DollarSign, 
  CheckSquare, 
  SlidersHorizontal, 
  ArrowLeft,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  Users,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  FileDown,
  Table,
  Plus,
  Sparkles,
  GitFork,
  Eye,
  Printer,
  X,
  Archive,
  Lock,
  Upload
} from 'lucide-react';

interface Props {
  selectedClientId?: string | null;
  onSelectClient?: (clientId: string | null) => void;
  clientId?: string;
  onBack?: () => void;
}

export const ClientWorkspaceView: React.FC<Props> = ({ 
  selectedClientId: propSelectedId, 
  onSelectClient: propOnSelect,
  clientId: legacyClientId,
  onBack
}) => {
  const { clients, clientServices, dynamicSections, payables, complianceItems, documents, invoices, payments, tasks, masterChoices, updateClient } = useData();
  const { isSuperAdmin } = useAuth();

  // Selected client state
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    propSelectedId || legacyClientId || (clients.length > 0 ? clients[0].id : null)
  );

  // Sync with prop if it changes
  const activeClientId = propSelectedId !== undefined ? propSelectedId : internalSelectedId;

  const handleSelectClient = (id: string | null) => {
    setInternalSelectedId(id);
    if (propOnSelect) {
      propOnSelect(id);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'overview' | 'info' | 'services' | 'payables' | 'compliance' | 'documents' | 'billing' | 'tasks' | 'branches'>('overview');

  // SOA Modal Preview State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [showSoaModal, setShowSoaModal] = useState(false);

  // Currently active client profile
  const client = clients.find(c => c.id === activeClientId);

  // Registered branches for active Head / Main Office
  const activeBaseTin = client ? (client.baseTin || extractBaseTin(client.tinNumber)) : '';
  const registeredBranches = clients.filter(c => 
    c.id !== client?.id && 
    (c.parentClientId === client?.id || (c.isBranch && (c.baseTin || extractBaseTin(c.tinNumber)) === activeBaseTin))
  );

  // Filtered list of registered clients for switcher / grid
  const filteredClients = clients.filter(c => {
    const matchSearch = c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.tinNumber.includes(searchQuery) ||
                        c.rdoNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Client specific records
  const clientPayables = payables.filter(p => p.clientId === client?.id);
  const clientCompliance = complianceItems.filter(c => c.clientId === client?.id);
  const clientDocs = documents.filter(d => d.clientId === client?.id);
  const clientInvoices = invoices.filter(i => i.clientId === client?.id);
  const clientTasks = tasks.filter(t => t.clientId === client?.id);

  // Local state for dynamic section data editing
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>(client?.dynamicData || {});

  const handleSaveDynamicData = () => {
    if (!client) return;
    updateClient(client.id, { dynamicData: dynamicValues });
    alert(`Dynamic information updated for ${client.companyName}!`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Client Switcher & Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Switcher Title & Registered Client Count */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Client Workspace</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-full text-[10px]">
                {clients.length} Registered
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Select a registered client to inspect their tax workspace & records.</p>
          </div>
        </div>

        {/* Quick Dropdown Switcher & Search Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto shrink-0">
          
          {/* Registered Client Dropdown */}
          <div className="relative flex-1 md:w-64">
            <select
              value={activeClientId || ''}
              onChange={e => handleSelectClient(e.target.value || null)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-100 truncate"
            >
              <option value="">-- All Registered Clients ({clients.length}) --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.companyName} (RDO #{c.rdoNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle View All Clients */}
          <button
            onClick={() => handleSelectClient(null)}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
              activeClientId === null
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> All Clients
          </button>
        </div>
      </div>

      {/* VIEW MODE A: ALL REGISTERED CLIENTS GRID */}
      {activeClientId === null ? (
        <div className="space-y-4">
          
          {/* Search & Filter Bar for Registered Clients */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search registered client, TIN, RDO..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <span className="text-slate-500 font-semibold text-[11px] shrink-0">Filter Status:</span>
              {['ALL', 'Active', 'For Compliance', 'Inactive'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-colors ${
                    statusFilter === st ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Clients Bento Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(c => {
              const cPayables = payables.filter(p => p.clientId === c.id);
              const cInvoices = invoices.filter(i => i.clientId === c.id);
              const cUnpaidPayables = cPayables.filter(p => p.status === 'Unpaid').length;
              const cPendingInvoices = cInvoices.filter(i => i.status !== 'Paid').length;

              return (
                <div 
                  key={c.id} 
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-xs"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-base shadow-2xs shrink-0">
                          {c.companyName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{c.companyName}</h3>
                          <p className="text-[11px] text-slate-500">{c.entityType} • {c.registrationMethod}</p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        c.status === 'For Compliance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">TIN Number:</span>
                        <span className="font-mono font-bold text-slate-800">{c.tinNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">RDO Office:</span>
                        <span className="font-mono font-bold text-amber-700">RDO #{c.rdoNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Period:</span>
                        <span className="font-bold text-slate-800">{c.accountingPeriod || 'Calendar'} Year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned Staff:</span>
                        <span className="font-bold text-indigo-700">{c.assignedStaffName}</span>
                      </div>
                      {isSuperAdmin && (
                        <div className="flex justify-between pt-1 border-t border-slate-200">
                          <span className="text-slate-500 font-semibold">Monthly Retainer:</span>
                          <span className="font-mono font-bold text-emerald-700">₱{c.retainersFee.toLocaleString()}/mo</span>
                        </div>
                      )}
                    </div>

                    {/* Tax badges */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(c.birTaxServices || []).map(tax => (
                        <span key={tax} className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold">
                          {tax}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                      <span>{cUnpaidPayables} Payables</span>
                      <span>•</span>
                      <span>{cPendingInvoices} Invoices</span>
                    </div>

                    <button
                      onClick={() => handleSelectClient(c.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1 text-[11px] shadow-2xs transition-all"
                    >
                      Open Workspace <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : client ? (
        
        /* VIEW MODE B: ACTIVE CLIENT WORKSPACE */
        <div className="space-y-6">
          
          {/* Selected Client Workspace Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-2xs shrink-0">
                  {client.companyName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">{client.companyName}</h2>
                    {client.isBranch ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Branch ({client.branchCode || '001'})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Main Office (-000)
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      client.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      client.status === 'For Compliance' || client.status === 'Compliance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      client.status === 'Archived' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {client.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>TIN: <strong className="font-mono text-slate-800">{client.tinNumber}</strong></span>
                    <span>•</span>
                    <span>RDO: <strong className="font-mono text-amber-700 font-bold">#{client.rdoNumber}</strong></span>
                    <span>•</span>
                    <span>Period: <strong className="text-slate-800 font-bold">{client.accountingPeriod || 'Calendar'} Year</strong></span>
                    <span>•</span>
                    <span>Entity: <strong className="text-slate-800">{client.entityType}</strong></span>
                    {client.parentClientName && (
                      <>
                        <span>•</span>
                        <span className="text-purple-700 font-bold">Head Office: {client.parentClientName}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Assigned: <strong className="text-indigo-700 font-bold">{client.assignedStaffName}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {!client.isBranch ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('branches')}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <GitFork className="w-4 h-4" />
                    List Branches ({registeredBranches.length})
                  </button>
                ) : client.parentClientId ? (
                  <button
                    type="button"
                    onClick={() => handleSelectClient(client.parentClientId || null)}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-purple-600" />
                    Go to Head Office ({client.parentClientName})
                  </button>
                ) : null}

                {isSuperAdmin && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-right">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Monthly Retainer</span>
                    <span className="text-base font-mono font-bold text-emerald-900">₱{client.retainersFee.toLocaleString()}/mo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Archived Status Notification Banner */}
            {client.status === 'Archived' && (
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-3 text-purple-950">
                <div className="flex items-center gap-2.5">
                  <Archive className="w-5 h-5 text-purple-700 shrink-0" />
                  <div>
                    <p className="font-extrabold text-xs text-purple-900">ARCHIVED CLIENT PROFILE RECORD</p>
                    <p className="text-[11px] text-purple-800">
                      This client profile is in Archived status. All historical payables, tax filings, invoices, payments, compliance logs, tasks, and documents remain permanently accessible for audit purposes.
                      {client.archivedAt && ` Archived on ${new Date(client.archivedAt).toLocaleString()}${client.archivedBy ? ` by ${client.archivedBy}` : ''}.`}
                      {client.archiveReason && ` Reason: "${client.archiveReason}".`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Workspace Navigation Tabs */}
            <div className="flex overflow-x-auto gap-2 pt-2 border-t border-slate-200 text-xs font-medium">
              {[
                { id: 'overview', label: 'Overview', icon: Building2 },
                { id: 'info', label: 'Company Profile', icon: FileText },
                { id: 'services', label: `Services & Engagements (${clientServices.filter(s => s.clientId === activeClientId).length})`, icon: Briefcase },
                { id: 'payables', label: `BIR Payables (${clientPayables.length})`, icon: Receipt },
                { id: 'compliance', label: `Compliance (${clientCompliance.length})`, icon: ShieldCheck },
                { id: 'documents', label: `Documents (${clientDocs.length})`, icon: FolderGit2 },
                { id: 'billing', label: `Billing & SOA (${clientInvoices.length})`, icon: DollarSign },
                { id: 'tasks', label: `Tasks (${clientTasks.length})`, icon: CheckSquare },
                ...(!client.isBranch ? [{ id: 'branches', label: `Branches (${registeredBranches.length})`, icon: GitFork }] : [])
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                      isActive ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="md:col-span-2 space-y-6">
                
                {/* Registered BIR Tax Types */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-600" /> Registered BIR Tax Returns & Recurring Deadlines
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(client.birTaxServices || []).map(tax => {
                      const upperTax = tax.toUpperCase();
                      const linkedRule = (masterChoices.formLinkages || []).find(
                        l => l.primaryCode.toUpperCase() === upperTax || (l.linkedCodes || []).map(c => c.toUpperCase()).includes(upperTax)
                      );
                      return (
                        <div key={tax} className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold uppercase text-xs flex items-center gap-2 shadow-2xs">
                          <span>{tax}</span>
                          {linkedRule && (
                            <span className="px-1.5 py-0.5 rounded-md bg-white border border-amber-300/80 text-[10px] font-mono font-bold text-indigo-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                              {(linkedRule.linkedCodes || []).join(', ')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Employee Benefits Services */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Registered Employee Benefits Remittances
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(client.benefitsServices || []).map(ben => (
                      <span key={ben} className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold uppercase text-xs">
                        {ben}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Pending Payables</span>
                    <p className="text-lg font-mono font-bold text-slate-900 mt-1">{clientPayables.filter(p => p.status === 'Unpaid').length}</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Compliance Items</span>
                    <p className="text-lg font-mono font-bold text-amber-600 mt-1">{clientCompliance.length}</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Documents Filed</span>
                    <p className="text-lg font-mono font-bold text-blue-600 mt-1">{clientDocs.length}</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Active Tasks</span>
                    <p className="text-lg font-mono font-bold text-indigo-600 mt-1">{clientTasks.length}</p>
                  </div>
                </div>

              </div>

              {/* Contact Sidebar Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">Contact & Business Details</h3>
                
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{client.mobileNumber || 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{client.emailAddress || 'N/A'}</span>
                  </div>

                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{client.address || 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Contact: <strong>{client.contactPerson}</strong></span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Accountant Notes:</span>
                  <p className="text-slate-600 italic mt-1 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    "{client.notes || 'No special notes recorded.'}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANY PROFILE */}
          {activeTab === 'info' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 text-xs shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">Complete Company & Tax Registration Profile</h3>
                <span className="text-slate-500">Registered on: {client.registrationDate}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Company Name</span>
                  <p className="font-bold text-slate-900 text-sm">{client.companyName}</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Tax Identification Number (TIN)</span>
                  <p className="font-mono font-bold text-slate-900 text-sm">{client.tinNumber}</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Revenue District Office (RDO)</span>
                  <p className="font-mono font-bold text-amber-700 text-sm">RDO #{client.rdoNumber}</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Entity / Organization Type</span>
                  <p className="font-semibold text-slate-800">{client.entityType}</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Registration Channel</span>
                  <p className="font-semibold text-slate-800">{client.registrationMethod}</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Accounting Period</span>
                  <p className="font-semibold text-slate-800">{client.accountingPeriod || 'Calendar'} Year</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Assigned Senior Accountant</span>
                  <p className="font-bold text-indigo-700">{client.assignedStaffName}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SERVICES & ENGAGEMENTS */}
          {activeTab === 'services' && client && (
            <ClientServicesManager clientId={client.id} isSuperAdmin={isSuperAdmin} />
          )}

          {/* TAB 3: BIR & BENEFITS PAYABLES */}
          {activeTab === 'payables' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Recorded Payables for {client.companyName}</h3>
                <span className="text-slate-500 font-mono">{clientPayables.length} itemized records</span>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                    <th className="py-2.5 px-3">Item / Form</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-right">Payable Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientPayables.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No BIR or Employee Benefits payables recorded for this client.
                      </td>
                    </tr>
                  ) : (
                    clientPayables.map(p => (
                      <tr key={p.id}>
                        <td className="py-3 px-3 font-semibold text-slate-900">{p.itemName}</td>
                        <td className="py-3 px-3 text-slate-500">{p.category}</td>
                        <td className="py-3 px-3 text-slate-600">{p.month}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₱{p.payableAmount.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: REGISTERED BRANCHES (FOR MAIN OFFICE) */}
          {activeTab === 'branches' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 text-xs shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <GitFork className="w-5 h-5 text-purple-600" /> Registered Branch Offices
                  </h3>
                  <p className="text-slate-500 mt-0.5">
                    Branches linked to Head Office: <strong>{client.companyName}</strong> (Base TIN: <span className="font-mono">{activeBaseTin}</span>)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 font-bold rounded-xl text-xs">
                    {registeredBranches.length} {registeredBranches.length === 1 ? 'Branch' : 'Branches'} Registered
                  </span>
                </div>
              </div>

              {registeredBranches.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-3">
                  <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">No Linked Branches Registered</h4>
                  <p className="text-slate-500 max-w-md mx-auto text-xs">
                    This Head Office currently has no branch locations registered in the system. When registering new clients, choose "Branch Office" and select this company as the parent.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {registeredBranches.map(br => (
                    <div 
                      key={br.id}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 transition-colors flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => handleSelectClient(br.id)}
                              className="font-extrabold text-slate-900 text-sm hover:text-purple-600 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                            >
                              <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>{br.companyName}</span>
                            </button>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Branch Code Suffix: <strong className="font-mono text-purple-800 font-bold">Branch ({br.branchCode || '001'})</strong>
                            </p>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            br.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {br.status}
                          </span>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Full 12-Digit TIN:</span>
                            <span className="font-mono font-bold text-slate-900">{br.tinNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">BIR RDO Office:</span>
                            <span className="font-mono font-bold text-amber-700">RDO #{br.rdoNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Address:</span>
                            <span className="text-slate-700 font-medium truncate max-w-[200px]">{br.address || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Assigned Staff:</span>
                            <span className="font-bold text-indigo-700">{br.assignedStaffName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">{br.birTaxServices.length} Tax Services</span>
                        <button
                          type="button"
                          onClick={() => handleSelectClient(br.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          Open Workspace <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COMPLIANCE MONITOR */}
          {activeTab === 'compliance' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Tax & Corporate Compliance Deadlines</h3>
              <div className="divide-y divide-slate-100">
                {clientCompliance.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No compliance items tagged for this client.</p>
                ) : (
                  clientCompliance.map(c => (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{c.taskName}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.agency} • Form: {c.formNumber}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-600 font-semibold">{c.dueDate}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          c.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'Due Today' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CENTRALIZED CLIENT DOCUMENTS & RECORD ARCHIVE */}
          {activeTab === 'documents' && (() => {
            const clientDocList = documents.filter(d => d.clientId === client.id);

            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        Client Document Archive & Vault ({clientDocList.length})
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Centralized repository for BIR tax returns, payment confirmations, SEC/DTI licenses, and billing proofs for <strong className="text-slate-800">{client.companyName}</strong>.
                    </p>
                  </div>

                  {client.status !== 'Archived' ? (
                    <button 
                      onClick={() => {
                        // Open main document view or trigger document upload modal
                        alert(`To upload a new document for ${client.companyName}, use the Centralized Document Management section or navigate to Documents tab.`);
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Document
                    </button>
                  ) : (
                    <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-xl font-bold text-[11px] flex items-center gap-1.5 shrink-0">
                      <Lock className="w-3.5 h-3.5 text-purple-700" /> Archival Read-Only
                    </span>
                  )}
                </div>

                {client.status === 'Archived' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-purple-900 text-xs">
                    <Archive className="w-4 h-4 text-purple-700 shrink-0" />
                    <p>
                      <strong>Preserved Historical Record:</strong> Client is archived. All {clientDocList.length} documents are protected and preserved for tax audit compliance and historical reporting. New uploads are locked.
                    </p>
                  </div>
                )}

                {/* Client Documents Grid / Table */}
                {clientDocList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700 text-xs">No documents on file for this client.</p>
                    <p className="text-[11px] text-slate-400">
                      Upload BIR returns, SEC certificates, or payment receipts to store them in this client's vault.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {clientDocList.map(doc => {
                      const taskObj = doc.taskId ? tasks.find(t => t.id === doc.taskId) : null;
                      const invoiceObj = doc.invoiceId ? invoices.find(i => i.id === doc.invoiceId) : null;

                      return (
                        <div key={doc.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl space-y-2.5 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-white border border-slate-200 rounded-lg shrink-0">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[9px] uppercase">
                                {doc.category}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-mono font-bold text-[10px]">
                              v{doc.version}
                            </span>
                          </div>

                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1">{doc.title}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{doc.fileName}</p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Period: <strong className="text-slate-800">{doc.taxablePeriod || 'N/A'}</strong></span>
                            <span>{doc.uploadDate}</span>
                          </div>

                          {(taskObj || invoiceObj || doc.paymentId) && (
                            <div className="flex flex-wrap gap-1 text-[9px]">
                              {taskObj && (
                                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded font-bold">
                                  Task: {taskObj.formCode || taskObj.title}
                                </span>
                              )}
                              {invoiceObj && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold">
                                  Collection #{invoiceObj.collectionNumber || invoiceObj.invoiceNumber || '1001'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 7: BILLING HISTORY & STATEMENT OF ACCOUNT LEDGER */}
          {activeTab === 'billing' && (() => {
            const clientSoa = buildClientSoaLedger(client.id, invoices, payments);

            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs shadow-sm space-y-5">
                
                {/* SOA Header & Metrics Cards */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-900 text-sm">Statement of Account Ledger — {client.companyName}</h3>
                      {client.status === 'Archived' && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md border border-slate-200">
                          Archived History
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Formula: Opening Balance → Invoices (+) → Payments (-) → Adjustments → Closing Balance
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateClientStatementOfAccountPDF(client, clientSoa)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Statement PDF
                    </button>
                    <button
                      onClick={() => exportSOAExcel(client, clientSoa)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Excel Ledger
                    </button>
                  </div>
                </div>

                {/* SOA KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Opening Balance</span>
                    <div className="text-base font-mono font-bold text-slate-800 mt-0.5">₱{clientSoa.openingBalance.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Total Billed (+)</span>
                    <div className="text-base font-mono font-bold text-blue-900 mt-0.5">₱{clientSoa.totalBilled.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Total Payments (-)</span>
                    <div className="text-base font-mono font-bold text-emerald-900 mt-0.5">₱{clientSoa.totalPaid.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Closing Balance Due</span>
                    <div className="text-base font-mono font-bold text-amber-900 mt-0.5">₱{clientSoa.closingBalance.toLocaleString()}</div>
                  </div>
                </div>

                {/* SOA Running Balance Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Tx Type</th>
                        <th className="py-2.5 px-3">Coll #</th>
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3">Services / Particulars</th>
                        <th className="py-2.5 px-3 text-right">Billed (+)</th>
                        <th className="py-2.5 px-3 text-right">Paid (-)</th>
                        <th className="py-2.5 px-3 text-center">C.R. #</th>
                        <th className="py-2.5 px-3 text-right">Running Balance</th>
                        <th className="py-2.5 px-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientSoa.entries.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No Statement of Account ledger transactions recorded for this client.
                          </td>
                        </tr>
                      ) : (
                        clientSoa.entries.map(entry => (
                          <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">{entry.date}</td>
                            <td className="py-3 px-3 font-bold whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap inline-block ${
                                entry.type === 'Invoice' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                entry.type === 'Payment' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {entry.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px] whitespace-nowrap">#{entry.collectionNo}</td>
                            <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap">{entry.billingPeriod}</td>
                            <td className="py-3 px-3 text-slate-800 font-medium max-w-xs truncate" title={entry.servicesDescription}>
                              {entry.servicesDescription}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                              {entry.billedAmount > 0 ? `₱${entry.billedAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                              {entry.paidAmount > 0 ? `₱${entry.paidAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 text-[11px]">
                              {entry.crNumber || '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                              ₱{entry.runningBalance.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-left">
                              {entry.originalInvoiceId && (
                                <div className="flex items-center justify-start">
                                  <button
                                    onClick={() => {
                                      const inv = invoices.find(i => i.id === entry.originalInvoiceId);
                                      if (inv) {
                                        setSelectedInvoice(inv);
                                        setShowSoaModal(true);
                                      }
                                    }}
                                    className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-md cursor-pointer inline-flex items-center gap-1 font-semibold text-[11px]"
                                    title="View Invoice Statement"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })()}

          {/* TAB 8: WORK ASSIGNMENTS */}
          {activeTab === 'tasks' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Assigned Client Tasks & Compliance Engagements</h3>
                <span className="text-[11px] text-slate-500">Total: <strong>{clientTasks.length}</strong> tasks</span>
              </div>
              <div className="divide-y divide-slate-100">
                {clientTasks.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No tasks assigned to this client.</p>
                ) : (
                  clientTasks.map(t => (
                    <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{t.title}</p>
                          {t.formCode && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold font-mono">
                              {t.formCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Assigned to: <strong className="text-slate-800">{t.assignedToName}</strong>
                          {t.taxablePeriod && <span> • Period: {t.taxablePeriod}</span>}
                        </p>
                        {t.reviewNotes && (
                          <p className="text-[10px] text-amber-900 bg-amber-50 p-1.5 rounded mt-1 border border-amber-200">
                            <strong>Note:</strong> {t.reviewNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono">
                          <span className="text-slate-700 font-bold text-xs">{t.dueDate}</span>
                          {t.isOverriddenDeadline && (
                            <span className="text-[9px] text-purple-700 block font-sans">Deadline Extended</span>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          t.status === 'For Review' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      ) : null}

      {/* Printable SOA Statement Preview Modal */}
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
                    <th className="py-2.5">Service Item Description</th>
                    <th className="py-2.5 text-right">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoice.services.map((svc, idx) => (
                    <tr key={idx}>
                      <td className="py-3 text-slate-800 font-medium">{svc.description}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">₱{svc.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900">
                    <td className="py-3 font-bold text-slate-900 text-sm">TOTAL AMOUNT DUE:</td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-700 text-base">₱{selectedInvoice.totalAmount.toLocaleString()}</td>
                  </tr>
                  {selectedInvoice.paidAmount > 0 && (
                    <>
                      <tr>
                        <td className="py-1 text-slate-600 font-semibold text-xs">Less Payments Received:</td>
                        <td className="py-1 text-right font-mono font-bold text-emerald-600 text-xs">- ₱{selectedInvoice.paidAmount.toLocaleString()}</td>
                      </tr>
                      <tr className="border-t border-slate-300">
                        <td className="py-2 font-bold text-slate-900 text-xs">REMAINING UNPAID BALANCE:</td>
                        <td className="py-2 text-right font-mono font-bold text-rose-600 text-sm">₱{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toLocaleString()}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
