import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ClientProfile, User, CompanyServicePermission } from '../types';
import { ROLE_LABELS } from '../lib/rbac';
import { 
  Building2, 
  Users, 
  Search, 
  Filter, 
  Plus, 
  X, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  ShieldCheck, 
  Receipt, 
  Banknote, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Settings2,
  Sparkles,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';

interface ClientStaffAssignmentMatrixProps {
  onSelectClientWorkspace?: (clientId: string) => void;
}

export const ClientStaffAssignmentMatrix: React.FC<ClientStaffAssignmentMatrixProps> = ({
  onSelectClientWorkspace
}) => {
  const { allUsers, currentUser, isSuperAdmin, updateUsers } = useAuth();
  const { clients, updateClient, addAuditLog } = useData();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FULLY_ASSIGNED' | 'NEEDS_BIR' | 'NEEDS_BENEFITS' | 'UNASSIGNED' | 'eFPS' | 'Manual'>('ALL');
  const [rdoFilter, setRdoFilter] = useState<string>('ALL');

  // Quick Popover Dropdown state for assigning staff directly in table
  const [activePopover, setActivePopover] = useState<{ clientId: string; type: 'BIR' | 'BENEFITS' } | null>(null);
  const [popoverSearchQuery, setPopoverSearchQuery] = useState('');

  // Detailed Modal configuration state
  const [configuringClient, setConfiguringClient] = useState<ClientProfile | null>(null);
  const [modalBirStaffIds, setModalBirStaffIds] = useState<string[]>([]);
  const [modalBenefitsStaffIds, setModalBenefitsStaffIds] = useState<string[]>([]);
  const [modalCustomPerms, setModalCustomPerms] = useState<Record<string, CompanyServicePermission>>({});
  const [modalStaffSearch, setModalStaffSearch] = useState('');
  const [modalActiveTab, setModalActiveTab] = useState<'BIR' | 'BENEFITS'>('BIR');

  // Filter clients to active ones
  const activeClients = useMemo(() => {
    return clients.filter(c => c.status !== 'Archived');
  }, [clients]);

  // Unique RDOs for filter
  const uniqueRdos = useMemo(() => {
    const set = new Set<string>();
    activeClients.forEach(c => {
      if (c.rdoNumber) set.add(c.rdoNumber);
    });
    return Array.from(set).sort();
  }, [activeClients]);

  // Metric summaries
  const metrics = useMemo(() => {
    const total = activeClients.length;
    let fullyAssigned = 0;
    let birAssigned = 0;
    let benefitsAssigned = 0;
    let unassigned = 0;

    activeClients.forEach(c => {
      const hasBirStaff = (c.birAssignedStaffIds && c.birAssignedStaffIds.length > 0) || !!c.assignedStaffId;
      const hasBenefitsStaff = (c.benefitsAssignedStaffIds && c.benefitsAssignedStaffIds.length > 0) || !!c.assignedStaffId;

      if (hasBirStaff) birAssigned++;
      if (hasBenefitsStaff) benefitsAssigned++;
      if (hasBirStaff && hasBenefitsStaff) fullyAssigned++;
      if (!hasBirStaff && !hasBenefitsStaff) unassigned++;
    });

    return { total, fullyAssigned, birAssigned, benefitsAssigned, unassigned };
  }, [activeClients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return activeClients.filter(c => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        c.companyName.toLowerCase().includes(q) ||
        c.tinNumber.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.rdoNumber && c.rdoNumber.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.birAssignedStaffNames && c.birAssignedStaffNames.some(n => n.toLowerCase().includes(q))) ||
        (c.benefitsAssignedStaffNames && c.benefitsAssignedStaffNames.some(n => n.toLowerCase().includes(q)));

      if (!matchSearch) return false;

      // RDO
      if (rdoFilter !== 'ALL' && c.rdoNumber !== rdoFilter) {
        return false;
      }

      const hasBirStaff = (c.birAssignedStaffIds && c.birAssignedStaffIds.length > 0);
      const hasBenefitsStaff = (c.benefitsAssignedStaffIds && c.benefitsAssignedStaffIds.length > 0);

      // Status filter
      switch (statusFilter) {
        case 'FULLY_ASSIGNED':
          return hasBirStaff && hasBenefitsStaff;
        case 'NEEDS_BIR':
          return !hasBirStaff;
        case 'NEEDS_BENEFITS':
          return !hasBenefitsStaff;
        case 'UNASSIGNED':
          return !hasBirStaff && !hasBenefitsStaff;
        case 'eFPS':
          return c.registrationMethod === 'eFPS';
        case 'Manual':
          return c.registrationMethod === 'Manual';
        default:
          return true;
      }
    });
  }, [activeClients, searchQuery, statusFilter, rdoFilter]);

  // Pagination
  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems: paginatedClients,
    setCurrentPage,
    setPageSize,
    loadMore,
    hasMoreToLoad,
  } = usePagination(filteredClients, {
    initialPageSize: 15,
    resetOnChange: `${searchQuery}_${statusFilter}_${rdoFilter}`,
  });

  // Synchronize multi-staff assignment both to ClientProfile and User records
  const handleCommitStaffAssignment = (
    clientId: string,
    nextBirStaffIds: string[],
    nextBenefitsStaffIds: string[],
    customServicePerms?: Record<string, CompanyServicePermission>
  ) => {
    const targetClient = clients.find(c => c.id === clientId);
    if (!targetClient) return;

    const birStaffNames = nextBirStaffIds
      .map(id => allUsers.find(u => u.id === id)?.fullName)
      .filter(Boolean) as string[];

    const benefitsStaffNames = nextBenefitsStaffIds
      .map(id => allUsers.find(u => u.id === id)?.fullName)
      .filter(Boolean) as string[];

    const allAssignedIds = Array.from(new Set([...nextBirStaffIds, ...nextBenefitsStaffIds]));
    const allAssignedNames = Array.from(new Set([...birStaffNames, ...benefitsStaffNames]));

    // 1. Update Client Profile
    updateClient(clientId, {
      birAssignedStaffIds: nextBirStaffIds,
      birAssignedStaffNames: birStaffNames,
      benefitsAssignedStaffIds: nextBenefitsStaffIds,
      benefitsAssignedStaffNames: benefitsStaffNames,
      assignedStaffId: allAssignedIds[0] || '',
      assignedStaffName: allAssignedNames.join(', ') || 'Unassigned'
    });

    // 2. Synchronize User Records & RBAC permissions in allUsers
    const updatedUsers = allUsers.map(user => {
      // Super admin and administrator retain full global access
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMINISTRATOR') {
        return user;
      }

      const isBirAssigned = nextBirStaffIds.includes(user.id);
      const isBenAssigned = nextBenefitsStaffIds.includes(user.id);
      const isAssigned = isBirAssigned || isBenAssigned;

      let nextAccessList = user.permissions?.clientAccessList ? [...user.permissions.clientAccessList] : [];
      let nextServicePerms = user.permissions?.clientServicePermissions ? { ...user.permissions.clientServicePermissions } : {};

      if (isAssigned) {
        if (!nextAccessList.includes(clientId)) {
          nextAccessList.push(clientId);
        }

        const custom = customServicePerms?.[user.id] || nextServicePerms[clientId];

        nextServicePerms[clientId] = {
          allBIR: custom ? custom.allBIR : isBirAssigned,
          allowedBIR: custom ? custom.allowedBIR : (isBirAssigned ? targetClient.birTaxServices : []),
          allBenefits: custom ? custom.allBenefits : isBenAssigned,
          allowedBenefits: custom ? custom.allowedBenefits : (isBenAssigned ? targetClient.benefitsServices : [])
        };
      } else {
        // If this user was previously assigned to this client only, remove client if they are not in the list
        if (nextAccessList.includes(clientId)) {
          nextAccessList = nextAccessList.filter(id => id !== clientId);
          delete nextServicePerms[clientId];
        }
      }

      return {
        ...user,
        permissions: {
          ...user.permissions,
          clientAccessList: nextAccessList,
          clientServicePermissions: nextServicePerms
        }
      };
    });

    updateUsers(updatedUsers);

    addAuditLog(
      'Staff Assignment Updated',
      `Updated BIR & Benefits staff assignments for "${targetClient.companyName}": BIR Staff (${birStaffNames.join(', ') || 'None'}), Benefits Staff (${benefitsStaffNames.join(', ') || 'None'})`,
      currentUser?.id || '',
      currentUser?.fullName || '',
      'ClientProfile',
      clientId
    );
  };

  // Direct toggle from table quick popover
  const handleToggleStaffInPopover = (client: ClientProfile, staffId: string, type: 'BIR' | 'BENEFITS') => {
    const currentBirIds = client.birAssignedStaffIds || (client.assignedStaffId ? [client.assignedStaffId] : []);
    const currentBenIds = client.benefitsAssignedStaffIds || (client.assignedStaffId ? [client.assignedStaffId] : []);

    let nextBir = [...currentBirIds];
    let nextBen = [...currentBenIds];

    if (type === 'BIR') {
      if (nextBir.includes(staffId)) {
        nextBir = nextBir.filter(id => id !== staffId);
      } else {
        nextBir.push(staffId);
      }
    } else {
      if (nextBen.includes(staffId)) {
        nextBen = nextBen.filter(id => id !== staffId);
      } else {
        nextBen.push(staffId);
      }
    }

    handleCommitStaffAssignment(client.id, nextBir, nextBen);
  };

  // Direct remove staff chip
  const handleRemoveStaffChip = (client: ClientProfile, staffId: string, type: 'BIR' | 'BENEFITS', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentBirIds = client.birAssignedStaffIds || (client.assignedStaffId ? [client.assignedStaffId] : []);
    const currentBenIds = client.benefitsAssignedStaffIds || (client.assignedStaffId ? [client.assignedStaffId] : []);

    const nextBir = type === 'BIR' ? currentBirIds.filter(id => id !== staffId) : currentBirIds;
    const nextBen = type === 'BENEFITS' ? currentBenIds.filter(id => id !== staffId) : currentBenIds;

    handleCommitStaffAssignment(client.id, nextBir, nextBen);
  };

  // Open detailed client configuration modal
  const handleOpenConfigureModal = (client: ClientProfile) => {
    setConfiguringClient(client);
    const birIds = client.birAssignedStaffIds || (client.assignedStaffId ? [client.assignedStaffId] : []);
    const benIds = client.benefitsAssignedStaffIds || (client.assignedStaffId ? [client.assignedStaffId] : []);
    setModalBirStaffIds(birIds);
    setModalBenefitsStaffIds(benIds);

    // Build initial modal permissions per user
    const perms: Record<string, CompanyServicePermission> = {};
    allUsers.forEach(u => {
      if (u.permissions?.clientServicePermissions?.[client.id]) {
        perms[u.id] = { ...u.permissions.clientServicePermissions[client.id] };
      } else {
        perms[u.id] = {
          allowAllBIR: true,
          allowedBIR: client.birTaxServices || [],
          allowAllBenefits: true,
          allowedBenefits: client.benefitsServices || []
        };
      }
    });
    setModalCustomPerms(perms);
    setModalStaffSearch('');
    setModalActiveTab('BIR');
  };

  const handleSaveModalConfiguration = () => {
    if (!configuringClient) return;
    handleCommitStaffAssignment(configuringClient.id, modalBirStaffIds, modalBenefitsStaffIds, modalCustomPerms);
    setConfiguringClient(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px] block">Total Active Clients</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Client Companies</span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 shadow-xs">
          <span className="text-emerald-700 font-bold uppercase text-[10px] block">Fully Staffed</span>
          <p className="text-2xl font-black text-emerald-800 mt-1">{metrics.fullyAssigned}</p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Both BIR &amp; Benefits</span>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 shadow-xs">
          <span className="text-indigo-700 font-bold uppercase text-[10px] block">BIR Assigned</span>
          <p className="text-2xl font-black text-indigo-900 mt-1">{metrics.birAssigned}</p>
          <span className="text-[11px] text-indigo-600 mt-0.5 block">Tax Compliance Staff</span>
        </div>

        <div className="bg-cyan-50/70 border border-cyan-200 rounded-2xl p-4 shadow-xs">
          <span className="text-cyan-700 font-bold uppercase text-[10px] block">Benefits Assigned</span>
          <p className="text-2xl font-black text-cyan-900 mt-1">{metrics.benefitsAssigned}</p>
          <span className="text-[11px] text-cyan-600 mt-0.5 block">SSS / HDMF / PhilHealth</span>
        </div>

        <div className={`border rounded-2xl p-4 shadow-xs ${metrics.unassigned > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
          <span className="font-bold uppercase text-[10px] block text-amber-700">Unstaffed / Needs Action</span>
          <p className="text-2xl font-black text-amber-800 mt-1">{metrics.unassigned}</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">No Staff Assigned</span>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company name, TIN, RDO, or assigned staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 font-medium"
            />
          </div>

          {/* RDO Dropdown Filter */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">RDO:</label>
            <select
              value={rdoFilter}
              onChange={e => setRdoFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="ALL">All RDOs ({uniqueRdos.length})</option>
              {uniqueRdos.map(r => (
                <option key={r} value={r}>RDO {r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Status:</span>
          
          {[
            { key: 'ALL', label: `All Clients (${activeClients.length})` },
            { key: 'FULLY_ASSIGNED', label: `Fully Assigned (${metrics.fullyAssigned})` },
            { key: 'NEEDS_BIR', label: `Needs BIR Staff (${activeClients.length - metrics.birAssigned})` },
            { key: 'NEEDS_BENEFITS', label: `Needs Benefits Staff (${activeClients.length - metrics.benefitsAssigned})` },
            { key: 'UNASSIGNED', label: `Unassigned (${metrics.unassigned})` },
            { key: 'eFPS', label: 'eFPS Filers' },
            { key: 'Manual', label: 'Manual Filers' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === f.key
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                <th className="py-3 px-4">Client Company &amp; TIN</th>
                <th className="py-3 px-4">RDO &amp; Filing Method</th>
                <th className="py-3 px-4">Registered Services</th>
                <th className="py-3 px-4 min-w-[240px]">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    BIR Tax Returns Staff (1+ Staff)
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[240px]">
                  <div className="flex items-center gap-1.5 text-cyan-900 font-bold">
                    <Banknote className="w-3.5 h-3.5 text-cyan-600" />
                    Statutory Benefits Staff (1+ Staff)
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Quick Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedClients.map(client => {
                const birStaffIds = client.birAssignedStaffIds || (client.assignedStaffId ? [client.assignedStaffId] : []);
                const benStaffIds = client.benefitsAssignedStaffIds || (client.assignedStaffId ? [client.assignedStaffId] : []);

                const isBirPopoverOpen = activePopover?.clientId === client.id && activePopover?.type === 'BIR';
                const isBenPopoverOpen = activePopover?.clientId === client.id && activePopover?.type === 'BENEFITS';

                return (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Client Company & TIN */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 text-sm">{client.companyName}</p>
                          {client.isBranch && (
                            <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                              Branch {client.branchCode}
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-slate-500 font-medium">
                          TIN: <span className="text-slate-800 font-bold">{client.tinNumber}</span>
                        </p>
                        {client.parentClientName && (
                          <p className="text-[10px] text-purple-700 font-medium">
                            HQ: {client.parentClientName}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* RDO & Filing Method */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded text-[10px] inline-block">
                          RDO {client.rdoNumber}
                        </span>
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${
                            client.registrationMethod === 'eFPS' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {client.registrationMethod || 'Manual'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Registered Services Counts */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-bold text-indigo-700">{(client.birTaxServices || []).length}</span>
                          <span className="text-slate-500">BIR Form(s)</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-bold text-cyan-700">{(client.benefitsServices || []).length}</span>
                          <span className="text-slate-500">Benefit(s)</span>
                        </div>
                      </div>
                    </td>

                    {/* BIR Tax Compliance Staff (Multi-Staff Assignment) */}
                    <td className="py-3.5 px-4 relative">
                      <div className="space-y-1.5">
                        
                        {/* List of currently assigned BIR staff */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {birStaffIds.length > 0 ? (
                            birStaffIds.map(staffId => {
                              const staff = allUsers.find(u => u.id === staffId);
                              if (!staff) return null;
                              return (
                                <span
                                  key={staff.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-[11px] font-semibold group shadow-2xs"
                                  title={`${staff.fullName} (${ROLE_LABELS[staff.role] || staff.role})`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                  <span className="truncate max-w-[130px]">{staff.fullName}</span>
                                  {isSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleRemoveStaffChip(client, staff.id, 'BIR', e)}
                                      className="text-indigo-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors"
                                      title="Unassign this staff from BIR for this client"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded text-[10px] inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Unassigned
                            </span>
                          )}

                          {/* Add/Manage Popover Trigger */}
                          {isSuperAdmin && (
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBirPopoverOpen) {
                                    setActivePopover(null);
                                  } else {
                                    setActivePopover({ clientId: client.id, type: 'BIR' });
                                    setPopoverSearchQuery('');
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                                title="Add or remove staff assigned to BIR"
                              >
                                <Plus className="w-3 h-3" /> Staff
                              </button>

                              {/* Multi-Staff Selection Popover Dropdown */}
                              {isBirPopoverOpen && (
                                <div className="absolute left-0 top-full mt-1.5 z-40 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2 text-xs">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                      <Receipt className="w-3.5 h-3.5 text-indigo-600" /> Assign BIR Staff
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setActivePopover(null)}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <input
                                    type="text"
                                    placeholder="Filter staff by name..."
                                    value={popoverSearchQuery}
                                    onChange={e => setPopoverSearchQuery(e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400"
                                    autoFocus
                                  />

                                  <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-50">
                                    {allUsers
                                      .filter(u => !popoverSearchQuery || u.fullName.toLowerCase().includes(popoverSearchQuery.toLowerCase()))
                                      .map(u => {
                                        const isChecked = birStaffIds.includes(u.id);
                                        return (
                                          <label
                                            key={u.id}
                                            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                                              isChecked ? 'bg-indigo-50/80 text-indigo-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleStaffInPopover(client, u.id, 'BIR')}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                              />
                                              <div className="truncate">
                                                <p className="text-[11px] font-semibold truncate">{u.fullName}</p>
                                                <p className="text-[9px] text-slate-400">{ROLE_LABELS[u.role] || u.role}</p>
                                              </div>
                                            </div>
                                            {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                          </label>
                                        );
                                      })}
                                  </div>

                                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                                    <span>{birStaffIds.length} staff selected</span>
                                    <button
                                      type="button"
                                      onClick={() => setActivePopover(null)}
                                      className="font-bold text-indigo-600 hover:text-indigo-800"
                                    >
                                      Done
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </td>

                    {/* Statutory Benefits Staff (Multi-Staff Assignment) */}
                    <td className="py-3.5 px-4 relative">
                      <div className="space-y-1.5">
                        
                        {/* List of currently assigned Benefits staff */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {benStaffIds.length > 0 ? (
                            benStaffIds.map(staffId => {
                              const staff = allUsers.find(u => u.id === staffId);
                              if (!staff) return null;
                              return (
                                <span
                                  key={staff.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 border border-cyan-200 text-cyan-900 rounded-lg text-[11px] font-semibold group shadow-2xs"
                                  title={`${staff.fullName} (${ROLE_LABELS[staff.role] || staff.role})`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
                                  <span className="truncate max-w-[130px]">{staff.fullName}</span>
                                  {isSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleRemoveStaffChip(client, staff.id, 'BENEFITS', e)}
                                      className="text-cyan-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors"
                                      title="Unassign this staff from Benefits for this client"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded text-[10px] inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Unassigned
                            </span>
                          )}

                          {/* Add/Manage Popover Trigger */}
                          {isSuperAdmin && (
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBenPopoverOpen) {
                                    setActivePopover(null);
                                  } else {
                                    setActivePopover({ clientId: client.id, type: 'BENEFITS' });
                                    setPopoverSearchQuery('');
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-cyan-50 border border-slate-300 hover:border-cyan-300 text-slate-700 hover:text-cyan-700 rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                                title="Add or remove staff assigned to Statutory Benefits"
                              >
                                <Plus className="w-3 h-3" /> Staff
                              </button>

                              {/* Multi-Staff Selection Popover Dropdown */}
                              {isBenPopoverOpen && (
                                <div className="absolute left-0 top-full mt-1.5 z-40 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2 text-xs">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                      <Banknote className="w-3.5 h-3.5 text-cyan-600" /> Assign Benefits Staff
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setActivePopover(null)}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <input
                                    type="text"
                                    placeholder="Filter staff by name..."
                                    value={popoverSearchQuery}
                                    onChange={e => setPopoverSearchQuery(e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-cyan-400"
                                    autoFocus
                                  />

                                  <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-50">
                                    {allUsers
                                      .filter(u => !popoverSearchQuery || u.fullName.toLowerCase().includes(popoverSearchQuery.toLowerCase()))
                                      .map(u => {
                                        const isChecked = benStaffIds.includes(u.id);
                                        return (
                                          <label
                                            key={u.id}
                                            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                                              isChecked ? 'bg-cyan-50/80 text-cyan-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleStaffInPopover(client, u.id, 'BENEFITS')}
                                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                              />
                                              <div className="truncate">
                                                <p className="text-[11px] font-semibold truncate">{u.fullName}</p>
                                                <p className="text-[9px] text-slate-400">{ROLE_LABELS[u.role] || u.role}</p>
                                              </div>
                                            </div>
                                            {isChecked && <Check className="w-3.5 h-3.5 text-cyan-600 shrink-0" />}
                                          </label>
                                        );
                                      })}
                                  </div>

                                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                                    <span>{benStaffIds.length} staff selected</span>
                                    <button
                                      type="button"
                                      onClick={() => setActivePopover(null)}
                                      className="font-bold text-cyan-600 hover:text-cyan-800"
                                    >
                                      Done
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </td>

                    {/* Action Controls */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenConfigureModal(client)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Configure detailed filings and multi-staff assignment"
                          >
                            <Settings2 className="w-3.5 h-3.5" /> Dispatch
                          </button>
                        )}

                        {onSelectClientWorkspace && (
                          <button
                            type="button"
                            onClick={() => onSelectClientWorkspace(client.id)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Open Client Workspace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onLoadMore={loadMore}
          hasMoreToLoad={hasMoreToLoad}
          itemLabel="clients"
        />
      </div>

      {/* DETAILED MULTI-STAFF CONFIGURATION MODAL */}
      {configuringClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-3xl w-full max-h-[92vh] overflow-y-auto space-y-5 text-xs shadow-2xl text-slate-800">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Multi-Staff Dispatcher &amp; Service Filing Control
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign 1 or more staff members specifically for BIR Tax Returns and Statutory Benefits for <strong className="text-slate-800">{configuringClient.companyName}</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfiguringClient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Snapshot Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{configuringClient.companyName}</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded text-[10px]">
                    RDO {configuringClient.rdoNumber}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[10px]">
                    {configuringClient.registrationMethod || 'Manual'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  TIN: <strong className="text-slate-800">{configuringClient.tinNumber}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">BIR Forms</span>
                  <strong className="text-indigo-700 font-bold">{configuringClient.birTaxServices.length} Active</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Benefits</span>
                  <strong className="text-cyan-700 font-bold">{configuringClient.benefitsServices.length} Active</strong>
                </div>
              </div>
            </div>

            {/* Tab Selector: BIR Tax Returns vs Statutory Benefits */}
            <div className="flex items-center border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setModalActiveTab('BIR')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalActiveTab === 'BIR'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-4 h-4" />
                BIR Tax Returns Staff ({modalBirStaffIds.length} assigned)
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('BENEFITS')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalActiveTab === 'BENEFITS'
                    ? 'border-cyan-600 text-cyan-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Statutory Benefits Staff ({modalBenefitsStaffIds.length} assigned)
              </button>
            </div>

            {/* Staff Search in Modal */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff members by name or role..."
                value={modalStaffSearch}
                onChange={e => setModalStaffSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Content for Active Tab */}
            {modalActiveTab === 'BIR' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Check one or more staff members responsible for BIR tax filings. You can grant access to <strong>ALL forms</strong> or <strong>selected forms</strong> for each staff.
                  </p>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setModalBirStaffIds(allUsers.map(u => u.id))}
                      className="text-indigo-600 hover:underline font-bold"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setModalBirStaffIds([])}
                      className="text-rose-600 hover:underline font-bold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {allUsers
                    .filter(u => !modalStaffSearch || u.fullName.toLowerCase().includes(modalStaffSearch.toLowerCase()) || u.role.toLowerCase().includes(modalStaffSearch.toLowerCase()))
                    .map(user => {
                      const isChecked = modalBirStaffIds.includes(user.id);
                      const userPerm = modalCustomPerms[user.id] || {
                        allBIR: true,
                        allowedBIR: configuringClient.birTaxServices || [],
                        allBenefits: true,
                        allowedBenefits: configuringClient.benefitsServices || []
                      };

                      return (
                        <div
                          key={user.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isChecked
                              ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setModalBirStaffIds(prev => prev.filter(id => id !== user.id));
                                  } else {
                                    setModalBirStaffIds(prev => [...prev, user.id]);
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                <p className="font-bold text-xs text-slate-900">{user.fullName}</p>
                                <p className="text-[10px] text-slate-500">
                                  @{user.username} • {ROLE_LABELS[user.role] || user.role}
                                </p>
                              </div>
                            </label>

                            {isChecked && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[10px]">
                                BIR Assigned
                              </span>
                            )}
                          </div>

                          {/* Granular BIR form options for this checked user */}
                          {isChecked && (
                            <div className="mt-2.5 pt-2.5 border-t border-indigo-100 space-y-2 text-[11px]">
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`bir_scope_${user.id}`}
                                    checked={userPerm.allBIR}
                                    onChange={() => {
                                      setModalCustomPerms(prev => ({
                                        ...prev,
                                        [user.id]: {
                                          ...userPerm,
                                          allBIR: true,
                                          allowedBIR: configuringClient.birTaxServices
                                        }
                                      }));
                                    }}
                                    className="text-indigo-600"
                                  />
                                  <span className="font-bold text-slate-800">Allow ALL Registered BIR Forms ({configuringClient.birTaxServices.length})</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`bir_scope_${user.id}`}
                                    checked={!userPerm.allBIR}
                                    onChange={() => {
                                      setModalCustomPerms(prev => ({
                                        ...prev,
                                        [user.id]: {
                                          ...userPerm,
                                          allBIR: false
                                        }
                                      }));
                                    }}
                                    className="text-indigo-600"
                                  />
                                  <span className="font-bold text-slate-800">Specific Returns Only</span>
                                </label>
                              </div>

                              {!userPerm.allBIR && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 bg-white rounded-lg border border-indigo-200">
                                  {configuringClient.birTaxServices.map(formCode => {
                                    const isFormAllowed = (userPerm.allowedBIR || []).includes(formCode);
                                    return (
                                      <label key={formCode} className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                                        <input
                                          type="checkbox"
                                          checked={isFormAllowed}
                                          onChange={() => {
                                            const currentAllowed = userPerm.allowedBIR || [];
                                            const nextAllowed = isFormAllowed
                                              ? currentAllowed.filter(f => f !== formCode)
                                              : [...currentAllowed, formCode];

                                            setModalCustomPerms(prev => ({
                                              ...prev,
                                              [user.id]: {
                                                ...userPerm,
                                                allowedBIR: nextAllowed
                                              }
                                            }));
                                          }}
                                          className="rounded border-slate-300 text-indigo-600"
                                        />
                                        <span className="font-mono font-bold text-slate-800">{formCode}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Content for Benefits Tab */}
            {modalActiveTab === 'BENEFITS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Check one or more staff members responsible for Statutory Benefits remittances (SSS, HDMF, PhilHealth).
                  </p>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setModalBenefitsStaffIds(allUsers.map(u => u.id))}
                      className="text-cyan-600 hover:underline font-bold"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setModalBenefitsStaffIds([])}
                      className="text-rose-600 hover:underline font-bold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {allUsers
                    .filter(u => !modalStaffSearch || u.fullName.toLowerCase().includes(modalStaffSearch.toLowerCase()) || u.role.toLowerCase().includes(modalStaffSearch.toLowerCase()))
                    .map(user => {
                      const isChecked = modalBenefitsStaffIds.includes(user.id);
                      const userPerm = modalCustomPerms[user.id] || {
                        allBIR: true,
                        allowedBIR: configuringClient.birTaxServices || [],
                        allBenefits: true,
                        allowedBenefits: configuringClient.benefitsServices || []
                      };

                      return (
                        <div
                          key={user.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isChecked
                              ? 'bg-cyan-50/50 border-cyan-200 text-cyan-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setModalBenefitsStaffIds(prev => prev.filter(id => id !== user.id));
                                  } else {
                                    setModalBenefitsStaffIds(prev => [...prev, user.id]);
                                  }
                                }}
                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                              />
                              <div>
                                <p className="font-bold text-xs text-slate-900">{user.fullName}</p>
                                <p className="text-[10px] text-slate-500">
                                  @{user.username} • {ROLE_LABELS[user.role] || user.role}
                                </p>
                              </div>
                            </label>

                            {isChecked && (
                              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 font-bold rounded text-[10px]">
                                Benefits Assigned
                              </span>
                            )}
                          </div>

                          {/* Granular Benefits options for this checked user */}
                          {isChecked && (
                            <div className="mt-2.5 pt-2.5 border-t border-cyan-100 space-y-2 text-[11px]">
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`ben_scope_${user.id}`}
                                    checked={userPerm.allBenefits}
                                    onChange={() => {
                                      setModalCustomPerms(prev => ({
                                        ...prev,
                                        [user.id]: {
                                          ...userPerm,
                                          allBenefits: true,
                                          allowedBenefits: configuringClient.benefitsServices
                                        }
                                      }));
                                    }}
                                    className="text-cyan-600"
                                  />
                                  <span className="font-bold text-slate-800">Allow ALL Statutory Benefits ({configuringClient.benefitsServices.length})</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`ben_scope_${user.id}`}
                                    checked={!userPerm.allBenefits}
                                    onChange={() => {
                                      setModalCustomPerms(prev => ({
                                        ...prev,
                                        [user.id]: {
                                          ...userPerm,
                                          allBenefits: false
                                        }
                                      }));
                                    }}
                                    className="text-cyan-600"
                                  />
                                  <span className="font-bold text-slate-800">Specific Remittances Only</span>
                                </label>
                              </div>

                              {!userPerm.allBenefits && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 bg-white rounded-lg border border-cyan-200">
                                  {configuringClient.benefitsServices.map(benName => {
                                    const isBenAllowed = (userPerm.allowedBenefits || []).includes(benName);
                                    return (
                                      <label key={benName} className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                                        <input
                                          type="checkbox"
                                          checked={isBenAllowed}
                                          onChange={() => {
                                            const currentAllowed = userPerm.allowedBenefits || [];
                                            const nextAllowed = isBenAllowed
                                              ? currentAllowed.filter(b => b !== benName)
                                              : [...currentAllowed, benName];

                                            setModalCustomPerms(prev => ({
                                              ...prev,
                                              [user.id]: {
                                                ...userPerm,
                                                allowedBenefits: nextAllowed
                                              }
                                            }));
                                          }}
                                          className="rounded border-slate-300 text-cyan-600"
                                        />
                                        <span className="font-medium text-slate-800">{benName}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                <span>Total BIR Staff: <strong className="text-indigo-700 font-bold">{modalBirStaffIds.length}</strong></span>
                <span className="mx-2">•</span>
                <span>Total Benefits Staff: <strong className="text-cyan-700 font-bold">{modalBenefitsStaffIds.length}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfiguringClient(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveModalConfiguration}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save &amp; Synchronize Staff Access
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
