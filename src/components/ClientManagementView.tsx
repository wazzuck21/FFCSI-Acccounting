import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ClientProfile } from '../types';
import { ClientRegistrationModal } from './ClientRegistrationModal';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import { getFormattedStaffAssignment, isStaffAssignedToClient, getAssignedUsersForClient } from '../utils/staffAssignmentHelper';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Tag, 
  ExternalLink,
  AlertTriangle,
  X,
  Archive,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

interface Props {
  onSelectClientWorkspace: (clientId: string) => void;
}

export const ClientManagementView: React.FC<Props> = ({ onSelectClientWorkspace }) => {
  const { clients, archiveClient, restoreClient, addAuditLog } = useData();
  const { isSuperAdmin, currentUser, allUsers } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [taxFilter, setTaxFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);

  // Archive Confirmation Modal State
  const [clientToArchive, setClientToArchive] = useState<ClientProfile | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Restore Confirmation Modal State
  const [clientToRestore, setClientToRestore] = useState<ClientProfile | null>(null);

  // Helper to get formatted display name of assigned staff for client directory
  const getClientStaffDisplay = (client: ClientProfile) => {
    return getFormattedStaffAssignment(client, allUsers, 'ALL');
  };

  // Filter clients
  const filteredClients = clients.filter(c => {
    // Search query
    const matchSearch = 
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tinNumber.includes(searchQuery) ||
      c.rdoNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    let matchStatus = true;
    if (statusFilter === 'ALL') {
      matchStatus = c.status !== 'Archived';
    } else if (statusFilter === 'ALL_INCLUDING_ARCHIVED') {
      matchStatus = true;
    } else {
      matchStatus = c.status === statusFilter;
    }

    // Tax filter
    const matchTax = taxFilter === 'ALL' || c.birTaxServices.includes(taxFilter);

    // Staff filter
    let matchStaff = true;
    if (staffFilter === 'ALL') {
      matchStaff = true;
    } else if (staffFilter === 'UNASSIGNED') {
      const assigned = getAssignedUsersForClient(c, allUsers, 'ALL');
      matchStaff = assigned.length === 0;
    } else {
      const selectedUser = allUsers.find(u => u.fullName === staffFilter);
      if (selectedUser) {
        matchStaff = isStaffAssignedToClient(selectedUser, c, 'ALL');
      } else {
        const staffDisplay = getClientStaffDisplay(c);
        matchStaff = staffDisplay.includes(staffFilter);
      }
    }

    return matchSearch && matchStatus && matchTax && matchStaff;
  });

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
    resetOnChange: `${searchQuery}_${statusFilter}_${taxFilter}_${staffFilter}`,
  });

  const confirmArchiveClient = () => {
    if (!clientToArchive) return;

    if (!isSuperAdmin) {
      setPasswordError('🔒 Access Denied: Only Super Admin accounts can archive client profiles.');
      return;
    }

    if (!adminPasswordInput.trim()) {
      setPasswordError('Please enter your Super Admin password to authorize archiving.');
      return;
    }

    const requiredPassword = currentUser?.password || 'admin123';
    if (adminPasswordInput.trim() !== requiredPassword) {
      setPasswordError('❌ Invalid Super Admin Password! Archiving cancelled.');
      return;
    }

    const companyName = clientToArchive.companyName;
    const clientId = clientToArchive.id;

    archiveClient(clientId, archiveReason.trim() || 'Client profile archived', currentUser?.fullName || 'Super Admin');
    addAuditLog('CLIENT_ARCHIVED', `Archived client profile for ${companyName}. Reason: ${archiveReason.trim() || 'N/A'}. All historical records preserved.`, currentUser?.id || '', currentUser?.fullName || '');
    
    setActionSuccessMsg(`Client "${companyName}" has been moved to Archived status. All historical tax, billing, and compliance records have been retained.`);
    setClientToArchive(null);
    setArchiveReason('');
    setAdminPasswordInput('');
    setPasswordError('');

    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 5000);
  };

  const confirmRestoreClient = () => {
    if (!clientToRestore) return;

    const companyName = clientToRestore.companyName;
    const clientId = clientToRestore.id;

    restoreClient(clientId);
    addAuditLog('CLIENT_RESTORED', `Restored client profile for ${companyName} back to Active status.`, currentUser?.id || '', currentUser?.fullName || '');

    setActionSuccessMsg(`Client "${companyName}" has been restored to Active status.`);
    setClientToRestore(null);

    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Client Directory & Registration Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Centralized profile records, tax registrations, RDO routing, and assigned accountants.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Register New Client
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by company, TIN, RDO, contact..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 font-semibold"
          >
            <option value="ALL">Active / Compliance / Inactive (Default)</option>
            <option value="Active">Active Clients</option>
            <option value="For Compliance">For Compliance</option>
            <option value="Inactive">Inactive</option>
            <option value="Archived">Archived Clients Only</option>
            <option value="ALL_INCLUDING_ARCHIVED">All Clients (Including Archived)</option>
          </select>
        </div>

        {/* Tax Filter */}
        <div>
          <select
            value={taxFilter}
            onChange={e => setTaxFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">All Tax Services</option>
            <option value="0619E">0619E Withholding</option>
            <option value="1601EQ">1601EQ Expanded</option>
            <option value="2550Q">2550Q VAT</option>
            <option value="1701Q">1701Q Individual</option>
            <option value="1702Q">1702Q Corporate</option>
            <option value="ITR">Annual ITR</option>
          </select>
        </div>

        {/* Assigned Staff Filter */}
        <div>
          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">All Staff Members</option>
            <option value="UNASSIGNED">Not yet assigned</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.fullName}>
                {u.fullName} ({u.position})
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Client List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                <th className="py-3 px-4">Company & Entity</th>
                <th className="py-3 px-4">TIN & RDO</th>
                <th className="py-3 px-4">Tax & Benefits</th>
                <th className="py-3 px-4">Status</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Retainer Fee</th>}
                <th className="py-3 px-4">Assigned Staff</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedClients.map((client) => {
                const isArchived = client.status === 'Archived';

                return (
                  <tr key={client.id} className={`hover:bg-slate-50/80 transition-colors ${isArchived ? 'bg-slate-50/50 opacity-80' : ''}`}>
                    
                    {/* Company Name & Entity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold border shrink-0 mt-0.5 ${
                          isArchived 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {client.companyName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => onSelectClientWorkspace(client.id)}
                              className="font-bold text-slate-900 hover:text-blue-600 text-sm text-left block transition-colors"
                            >
                              {client.companyName}
                            </button>
                            {client.isBranch ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={`Branch of ${client.parentClientName || 'Head Office'}`}>
                                Branch ({client.branchCode || '001'})
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Main Office
                              </span>
                            )}
                            {isArchived && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                                <Archive className="w-2.5 h-2.5" /> Archived
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-700">{client.entityType}</span>
                            <span>•</span>
                            <span>{client.registrationMethod}</span>
                            {client.parentClientName && (
                              <>
                                <span>•</span>
                                <span className="text-purple-700 font-medium">HQ: {client.parentClientName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* TIN & RDO */}
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-slate-800 font-bold">{client.tinNumber}</p>
                      <p className="text-[10px] text-amber-700 font-bold">RDO #{client.rdoNumber}</p>
                    </td>

                    {/* Tax & Benefits badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(client.birTaxServices || []).slice(0, 3).map(tax => (
                          <span key={tax} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {tax}
                          </span>
                        ))}
                        {(client.birTaxServices || []).length > 3 && (
                          <span className="text-[9px] text-slate-400">+{(client.birTaxServices || []).length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        client.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : client.status === 'For Compliance' || client.status === 'Compliance'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : client.status === 'Archived'
                          ? 'bg-purple-100 text-purple-900 border border-purple-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`} title={client.archivedAt ? `Archived on ${client.archivedAt.substring(0, 10)} by ${client.archivedBy || 'Admin'}` : ''}>
                        {client.status}
                      </span>
                    </td>

                    {/* Retainer Fee (Super Admin Only) */}
                    {isSuperAdmin && (
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-800">
                        ₱{client.retainersFee.toLocaleString()}
                      </td>
                    )}

                    {/* Assigned Staff */}
                    <td className="py-3.5 px-4 font-medium">
                      {getClientStaffDisplay(client) === 'Not yet assigned' ? (
                        <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-amber-200/80 inline-block">
                          Not yet assigned
                        </span>
                      ) : (
                        <span className="text-slate-800 font-semibold">{getClientStaffDisplay(client)}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectClientWorkspace(client.id)}
                          title="Open Workspace (View Historical Records)"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setEditingClient(client);
                              setIsModalOpen(true);
                            }}
                            title="Edit Profile"
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {isSuperAdmin && (
                          isArchived ? (
                            <button
                              onClick={() => setClientToRestore(client)}
                              title="Restore Client Profile to Active"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setAdminPasswordInput('');
                                setArchiveReason('');
                                setPasswordError('');
                                setClientToArchive(client);
                              }}
                              title="Archive Client Profile (Preserve All Records)"
                              className="p-1.5 text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Controls */}
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

      {/* Action Success Banner Notification */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{actionSuccessMsg}</span>
          <button 
            onClick={() => setActionSuccessMsg(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {clientToArchive && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 text-purple-800 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">Archive Client Profile</h3>
                <p className="text-xs text-purple-900 font-bold mt-0.5">
                  Archiving: <strong className="text-slate-900">{clientToArchive.companyName}</strong> (TIN: {clientToArchive.tinNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClientToArchive(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Historical Audit & Compliance Protection Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed pl-6 text-emerald-900 font-medium">
                Archiving will hide this client from active operational lists while <strong>permanently retaining all linked historical records</strong> in the system database (Invoices, Payments, Tax Filings, Compliance History, Payables, Documents, Tasks, and Credentials).
              </p>
            </div>

            {/* Optional Archive Reason */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-800">
                Archival Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Company transferred accountants, temporarily suspended operations..."
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-purple-400 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Super Admin Password Verification Input */}
            <div className="space-y-1 pt-1">
              <label className="block font-bold text-slate-800">
                Super Admin Authorization Password *
              </label>
              <input
                type="password"
                placeholder="Enter Super Admin password to authorize"
                value={adminPasswordInput}
                onChange={(e) => {
                  setAdminPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmArchiveClient();
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none"
                autoFocus
              />
              {passwordError && (
                <p className="text-[11px] font-bold text-rose-600">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setClientToArchive(null);
                  setArchiveReason('');
                  setAdminPasswordInput('');
                  setPasswordError('');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmArchiveClient}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all shadow-md shadow-purple-700/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-4 h-4" /> Authorize & Archive Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {clientToRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">Restore Client Profile</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Restore <strong className="text-slate-900">{clientToRestore.companyName}</strong> back to active client operations?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClientToRestore(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed font-medium">
              This client profile will be restored to <strong>Active</strong> status and will reappear in default active client directory lists and staff assignment views. All historical records remain safely attached.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClientToRestore(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestoreClient}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Restore Client Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration & Edit Modal */}
      <ClientRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingClient={editingClient}
      />

    </div>
  );
};
