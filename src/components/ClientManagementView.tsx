import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ClientProfile } from '../types';
import { ClientRegistrationModal } from './ClientRegistrationModal';
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
  X
} from 'lucide-react';

interface Props {
  onSelectClientWorkspace: (clientId: string) => void;
}

export const ClientManagementView: React.FC<Props> = ({ onSelectClientWorkspace }) => {
  const { clients, deleteClient, addAuditLog } = useData();
  const { isSuperAdmin, currentUser, allUsers } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [taxFilter, setTaxFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);

  // Delete Confirmation Modal State
  const [clientToDelete, setClientToDelete] = useState<ClientProfile | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Filter clients
  const filteredClients = clients.filter(c => {
    // Search query
    const matchSearch = 
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tinNumber.includes(searchQuery) ||
      c.rdoNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;

    // Tax filter
    const matchTax = taxFilter === 'ALL' || c.birTaxServices.includes(taxFilter);

    // Staff filter
    const matchStaff = staffFilter === 'ALL' || c.assignedStaffName === staffFilter;

    return matchSearch && matchStatus && matchTax && matchStaff;
  });

  const confirmDeleteClient = () => {
    if (!clientToDelete) return;

    if (!isSuperAdmin) {
      setPasswordError('🔒 Access Denied: Only Super Admin accounts can delete client profiles.');
      return;
    }

    if (!adminPasswordInput.trim()) {
      setPasswordError('Please enter your Super Admin password to authorize deletion.');
      return;
    }

    const requiredPassword = currentUser?.password || 'admin123';
    if (adminPasswordInput.trim() !== requiredPassword) {
      setPasswordError('❌ Invalid Super Admin Password! Deletion cancelled.');
      return;
    }

    const companyName = clientToDelete.companyName;
    const clientId = clientToDelete.id;

    deleteClient(clientId);
    addAuditLog('Client Deleted', `Permanently deleted client profile for ${companyName}`, currentUser?.id || '', currentUser?.fullName || '');
    
    setDeleteSuccessMsg(`Client "${companyName}" has been permanently deleted.`);
    setClientToDelete(null);
    setAdminPasswordInput('');
    setPasswordError('');

    setTimeout(() => {
      setDeleteSuccessMsg(null);
    }, 4000);
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
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm text-xs flex items-center gap-2 transition-all shrink-0"
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
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Clients</option>
            <option value="For Compliance">For Compliance</option>
            <option value="Inactive">Inactive</option>
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
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Company Name & Entity */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 shrink-0 mt-0.5">
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
                        : client.status === 'For Compliance'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
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
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {client.assignedStaffName}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onSelectClientWorkspace(client.id)}
                        title="Open Workspace"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                        <button
                          onClick={() => {
                            setAdminPasswordInput('');
                            setPasswordError('');
                            setClientToDelete(client);
                          }}
                          title="Delete Client"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Banner Notification */}
      {deleteSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{deleteSuccessMsg}</span>
          <button 
            onClick={() => setDeleteSuccessMsg(null)}
            className="p-1 text-emerald-300 hover:text-white rounded-lg ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">🔒 Delete Client Profile</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-900">{clientToDelete.companyName}</strong> (TIN: {clientToDelete.tinNumber})?
                </p>
                <p className="text-[11px] text-rose-600 font-semibold mt-2 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  ⚠️ This action cannot be undone and will remove the client profile record from the directory.
                </p>
              </div>
            </div>

            {/* Super Admin Password Verification Input */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
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
                  if (e.key === 'Enter') confirmDeleteClient();
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
                autoFocus
              />
              {passwordError && (
                <p className="text-[11px] font-bold text-rose-600">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setClientToDelete(null);
                  setAdminPasswordInput('');
                  setPasswordError('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Authorize & Delete
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
