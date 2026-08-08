import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, UserRole, CompanyServicePermission } from '../types';
import { 
  UserCog, 
  Plus, 
  ShieldCheck, 
  Lock, 
  Check, 
  X, 
  Search, 
  Edit3, 
  UserX, 
  UserCheck, 
  Building2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sliders,
  FileText,
  DollarSign,
  Receipt,
  ShieldAlert,
  BarChart3,
  FolderGit2,
  Users,
  LayoutDashboard,
  Settings,
  Sparkles
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { allUsers, currentUser, isSuperAdmin, updateUsers } = useAuth();
  const { clients, masterChoices, addAuditLog } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Table password visibility state map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Disabled'>('Active');

  // Core Navigation Access Permissions
  const [permDashboard, setPermDashboard] = useState(true);
  const [permClients, setPermClients] = useState(true);
  const [permBilling, setPermBilling] = useState(false);
  const [permPayables, setPermPayables] = useState(false);
  const [permCompliance, setPermCompliance] = useState(true);
  const [permReports, setPermReports] = useState(false);
  const [permPayroll, setPermPayroll] = useState(false);
  const [permDocuments, setPermDocuments] = useState(true);
  const [permSettings, setPermSettings] = useState(false);
  const [permUserManagement, setPermUserManagement] = useState(false);
  const [permDynamicFields, setPermDynamicFields] = useState(false);

  // Company Restrictions & Granular Service Permissions
  const [restrictedClients, setRestrictedClients] = useState<string[]>([]);
  const [clientServicePerms, setClientServicePerms] = useState<Record<string, CompanyServicePermission>>({});
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const filteredUsers = allUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Preset core navigation permissions based on selected Role Type
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'SUPER_ADMIN') {
      setPermDashboard(true);
      setPermClients(true);
      setPermBilling(true);
      setPermPayables(true);
      setPermCompliance(true);
      setPermReports(true);
      setPermPayroll(true);
      setPermDocuments(true);
      setPermSettings(true);
      setPermUserManagement(true);
      setPermDynamicFields(true);
    } else if (newRole === 'BILLING') {
      setPermDashboard(true);
      setPermClients(true);
      setPermBilling(true);
      setPermPayables(true);
      setPermCompliance(false);
      setPermReports(true);
      setPermPayroll(false);
      setPermDocuments(true);
      setPermSettings(false);
      setPermUserManagement(false);
      setPermDynamicFields(false);
    } else if (newRole === 'ACCOUNTING') {
      setPermDashboard(true);
      setPermClients(true);
      setPermBilling(false);
      setPermPayables(true);
      setPermCompliance(true);
      setPermReports(true);
      setPermPayroll(true);
      setPermDocuments(true);
      setPermSettings(false);
      setPermUserManagement(false);
      setPermDynamicFields(false);
    } else if (newRole === 'BENEFITS') {
      setPermDashboard(true);
      setPermClients(true);
      setPermBilling(false);
      setPermPayables(true);
      setPermCompliance(true);
      setPermReports(true);
      setPermPayroll(true);
      setPermDocuments(true);
      setPermSettings(false);
      setPermUserManagement(false);
      setPermDynamicFields(false);
    } else {
      // STAFF
      setPermDashboard(true);
      setPermClients(true);
      setPermBilling(false);
      setPermPayables(false);
      setPermCompliance(true);
      setPermReports(false);
      setPermPayroll(false);
      setPermDocuments(true);
      setPermSettings(false);
      setPermUserManagement(false);
      setPermDynamicFields(false);
    }
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setPassword('password123');
    setShowFormPassword(false);
    setContactNumber('');
    setRole('STAFF');
    setStatus('Active');
    
    // Default core navigation
    setPermDashboard(true);
    setPermClients(true);
    setPermBilling(false);
    setPermPayables(false);
    setPermCompliance(true);
    setPermReports(false);
    setPermPayroll(false);
    setPermDocuments(true);
    setPermSettings(false);
    setPermUserManagement(false);
    setPermDynamicFields(false);

    setRestrictedClients([]);
    setClientServicePerms({});
    setExpandedClientId(null);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setPassword(user.password || 'password123');
    setShowFormPassword(false);
    setContactNumber(user.contactNumber || '');
    setRole(user.role);
    setStatus(user.status);

    // Permissions
    const p = user.permissions;
    setPermDashboard(p.dashboard ?? true);
    setPermClients(p.clients ?? true);
    setPermBilling(p.billing ?? false);
    setPermPayables(p.payables ?? p.billing ?? false);
    setPermCompliance(p.compliance ?? true);
    setPermReports(p.reports ?? false);
    setPermPayroll(p.payroll ?? false);
    setPermDocuments(p.documents ?? true);
    setPermSettings(p.settings ?? false);
    setPermUserManagement(p.userManagement ?? false);
    setPermDynamicFields(p.dynamicFields ?? false);

    setRestrictedClients(p.clientAccessList || []);
    setClientServicePerms(p.clientServicePermissions || {});
    setExpandedClientId((p.clientAccessList && p.clientAccessList.length > 0) ? p.clientAccessList[0] : null);
    setShowUserModal(true);
  };

  const handleToggleStatus = (user: User) => {
    if (!isSuperAdmin) return;
    const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
    const updated = allUsers.map(u => u.id === user.id ? { ...u, status: newStatus } : u);
    updateUsers(updated);
    addAuditLog('User Status Changed', `Set user ${user.fullName} status to ${newStatus}`, currentUser?.id || '', currentUser?.fullName || '');
  };

  // Toggle client assignment
  const handleToggleClientAccess = (clientId: string) => {
    if (restrictedClients.includes(clientId)) {
      setRestrictedClients(prev => prev.filter(id => id !== clientId));
      if (expandedClientId === clientId) {
        setExpandedClientId(null);
      }
    } else {
      setRestrictedClients(prev => [...prev, clientId]);
      setExpandedClientId(clientId);
      // Initialize default permissions for this company if not existing
      if (!clientServicePerms[clientId]) {
        setClientServicePerms(prev => ({
          ...prev,
          [clientId]: {
            allowAllBIR: true,
            allowedBIR: [],
            allowAllBenefits: true,
            allowedBenefits: []
          }
        }));
      }
    }
  };

  // Update granular BIR/Benefits per company
  const handleUpdateCompanyServicePerm = (
    clientId: string,
    updates: Partial<CompanyServicePermission>
  ) => {
    setClientServicePerms(prev => {
      const current = prev[clientId] || {
        allowAllBIR: true,
        allowedBIR: [],
        allowAllBenefits: true,
        allowedBenefits: []
      };
      return {
        ...prev,
        [clientId]: { ...current, ...updates }
      };
    });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      alert('Please fill in Full Name and Username.');
      return;
    }

    const userData: User = {
      id: editingUser ? editingUser.id : `user_${Date.now()}`,
      fullName,
      username,
      password: password || 'password123',
      contactNumber,
      role,
      status,
      lastLogin: editingUser?.lastLogin,
      permissions: {
        dashboard: permDashboard,
        clients: permClients,
        billing: permBilling,
        payables: permPayables,
        compliance: permCompliance,
        reports: permReports,
        payroll: permPayroll,
        documents: permDocuments,
        settings: permSettings || role === 'SUPER_ADMIN',
        userManagement: permUserManagement || role === 'SUPER_ADMIN',
        dynamicFields: permDynamicFields || role === 'SUPER_ADMIN',
        clientAccessList: restrictedClients,
        clientServicePermissions: clientServicePerms
      }
    };

    if (editingUser) {
      const updated = allUsers.map(u => u.id === editingUser.id ? userData : u);
      updateUsers(updated);
      addAuditLog('User Edited', `Updated staff account for ${fullName} (${role})`, currentUser?.id || '', currentUser?.fullName || '');
    } else {
      const updated = [...allUsers, userData];
      updateUsers(updated);
      addAuditLog('User Created', `Created new user account for ${fullName} (${role})`, currentUser?.id || '', currentUser?.fullName || '');
    }

    setShowUserModal(false);
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'BILLING': return 'Billing';
      case 'ACCOUNTING': return 'Accounting';
      case 'BENEFITS': return 'Benefits';
      case 'STAFF': return 'Staff';
      default: return r;
    }
  };

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case 'SUPER_ADMIN': return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'BILLING': return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'ACCOUNTING': return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'BENEFITS': return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'STAFF': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-indigo-600" />
            User Management & Role-Based Access Control
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage employee credentials, role types, core navigation restrictions, and company-specific BIR & Benefits filing access.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handleOpenCreateUser}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs text-xs flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Create User Account
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        <input
          type="text"
          placeholder="Search users by name or username..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 text-xs"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Username & Password</th>
                <th className="py-3 px-4">Role Type</th>
                <th className="py-3 px-4">Navigation & Company Restrictions</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => {
                const isPasswordShown = visiblePasswords[u.id];
                const hasRestrictedCompanies = u.permissions.clientAccessList && u.permissions.clientAccessList.length > 0;
                
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Full Name */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 text-sm">{u.fullName}</p>
                      {u.contactNumber && (
                        <p className="text-[11px] text-slate-500">{u.contactNumber}</p>
                      )}
                    </td>

                    {/* Username & Password */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <p className="font-mono text-indigo-700 font-bold">@{u.username}</p>
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                          <span>{isPasswordShown ? (u.password || 'password123') : '••••••••'}</span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title={isPasswordShown ? 'Hide password' : 'Show password'}
                          >
                            {isPasswordShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Role Type */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getRoleBadgeStyle(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>

                    {/* Restrictions Summary */}
                    <td className="py-3.5 px-4 text-[11px]">
                      <div className="space-y-1">
                        {hasRestrictedCompanies ? (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded text-[10px] inline-block">
                            Restricted to {u.permissions.clientAccessList?.length} Company(ies)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded text-[10px] inline-block">
                            All Companies Allowed
                          </span>
                        )}

                        <p className="text-[10px] text-slate-500">
                          Nav: {[
                            u.permissions.clients && 'Clients',
                            u.permissions.billing && 'Billing',
                            u.permissions.payables && 'Payables',
                            u.permissions.compliance && 'Compliance',
                            u.permissions.payroll && 'Payroll',
                            u.permissions.reports && 'Reports',
                            u.permissions.documents && 'Docs'
                          ].filter(Boolean).join(', ') || 'Restricted Navigation'}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {u.lastLogin || 'Never'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      {isSuperAdmin && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit User Restrictions & Account"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u)}
                            title="Toggle Active / Disabled Status"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            {u.status === 'Active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create / Edit User & Granular Restrictions */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-3xl w-full max-h-[92vh] overflow-y-auto space-y-5 text-xs shadow-2xl text-slate-800">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingUser ? 'Edit User Credentials & Restrictions' : 'Create New Employee Account'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure login credentials, role type, core navigation access, and company-specific BIR/Benefits filings.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-5">
              
              {/* Account Credentials Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-indigo-600" /> Account Credentials & Profile
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria Santos"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +63 917 123 4567"
                      value={contactNumber}
                      onChange={e => setContactNumber(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Username *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 text-slate-400 font-mono font-bold">@</span>
                      <input
                        type="text"
                        required
                        placeholder="username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-indigo-900 font-mono font-bold focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-3 pr-9 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-indigo-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                      >
                        {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Role Type & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  
                  {/* Role Type Select */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Role Type *</label>
                    <select
                      value={role}
                      onChange={e => handleRoleChange(e.target.value as UserRole)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                    >
                      <option value="SUPER_ADMIN">Super Admin (Full Permanent Access)</option>
                      <option value="BILLING">Billing</option>
                      <option value="ACCOUNTING">Accounting</option>
                      <option value="BENEFITS">Benefits</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </div>

                  {/* Account Status Select */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Account Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* SECTION 2: Core Navigation Access Restrictions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" /> Core Navigation Access Restrictions
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">Toggle allowed tabs for this user</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 border border-slate-200 rounded-xl">
                  
                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permDashboard}
                      onChange={e => setPermDashboard(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Executive Dashboard</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permClients}
                      onChange={e => setPermClients(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Clients & Workspaces</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permBilling}
                      onChange={e => setPermBilling(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Billing & Invoices</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permPayables}
                      onChange={e => setPermPayables(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">BIR & Benefits Payables</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permCompliance}
                      onChange={e => setPermCompliance(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Compliance Monitor</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permReports}
                      onChange={e => setPermReports(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Reports & Analytics</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permPayroll}
                      onChange={e => setPermPayroll(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Payroll Management</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permDocuments}
                      onChange={e => setPermDocuments(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Document Storage</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permSettings}
                      onChange={e => setPermSettings(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">System Settings</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permUserManagement}
                      onChange={e => setPermUserManagement(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">User Management</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={permDynamicFields}
                      onChange={e => setPermDynamicFields(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Dynamic Fields Builder</span>
                  </label>

                </div>
              </div>

              {/* SECTION 3: Company & Granular Filing Access Restrictions */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <div>
                  <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-700" /> Company Access & Granular Filing Restrictions
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Unchecked = Full company access. Check specific companies below to restrict this user, then click on the company to configure whether <strong>ALL filings</strong> or <strong>SOME BIR / SOME Benefits</strong> are allowed.
                  </p>
                </div>

                {/* Client Company Selection List */}
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {clients.map(client => {
                    const isClientAssigned = restrictedClients.includes(client.id);
                    const isExpanded = expandedClientId === client.id;
                    const cPerm = clientServicePerms[client.id] || {
                      allowAllBIR: true,
                      allowedBIR: [],
                      allowAllBenefits: true,
                      allowedBenefits: []
                    };

                    return (
                      <div 
                        key={client.id} 
                        className={`border rounded-xl transition-all ${
                          isClientAssigned 
                            ? 'bg-white border-amber-300 shadow-2xs' 
                            : 'bg-white/60 border-slate-200 opacity-80'
                        }`}
                      >
                        {/* Company Header Row */}
                        <div className="p-3 flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-900 text-xs flex-1">
                            <input
                              type="checkbox"
                              checked={isClientAssigned}
                              onChange={() => handleToggleClientAccess(client.id)}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span>{client.companyName}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({client.registrationMethod} Filer)</span>
                          </label>

                          {isClientAssigned && (
                            <button
                              type="button"
                              onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5 text-amber-700" />
                              <span>Configure Filings</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Expanded Granular BIR & Benefits Configuration Panel */}
                        {isClientAssigned && isExpanded && (
                          <div className="p-3 border-t border-amber-200 bg-slate-50/80 rounded-b-xl space-y-3 text-xs">
                            
                            {/* BIR Filings Restriction */}
                            <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-amber-600" /> BIR Tax Returns Access
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-[11px]">
                                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                                  <input
                                    type="radio"
                                    name={`bir_option_${client.id}`}
                                    checked={cPerm.allowAllBIR}
                                    onChange={() => handleUpdateCompanyServicePerm(client.id, { allowAllBIR: true })}
                                    className="text-amber-600 focus:ring-amber-500"
                                  />
                                  Allow ALL BIR Filings
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                                  <input
                                    type="radio"
                                    name={`bir_option_${client.id}`}
                                    checked={!cPerm.allowAllBIR}
                                    onChange={() => handleUpdateCompanyServicePerm(client.id, { allowAllBIR: false })}
                                    className="text-amber-600 focus:ring-amber-500"
                                  />
                                  Selected BIR Filings Only
                                </label>
                              </div>

                              {/* BIR Checkbox List */}
                              {!cPerm.allowAllBIR && (
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                                  {(client.birTaxServices || []).map(birCode => {
                                    const isAllowed = (cPerm.allowedBIR || []).includes(birCode);
                                    return (
                                      <label key={birCode} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 p-1 hover:bg-white rounded">
                                        <input
                                          type="checkbox"
                                          checked={isAllowed}
                                          onChange={e => {
                                            const currentAllowed = cPerm.allowedBIR || [];
                                            const updatedBIR = e.target.checked
                                              ? [...currentAllowed, birCode]
                                              : currentAllowed.filter(b => b !== birCode);
                                            handleUpdateCompanyServicePerm(client.id, { allowedBIR: updatedBIR });
                                          }}
                                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        <span>BIR {birCode}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Statutory Benefits Restriction */}
                            <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Statutory Benefits Remittance Access
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-[11px]">
                                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                                  <input
                                    type="radio"
                                    name={`ben_option_${client.id}`}
                                    checked={cPerm.allowAllBenefits}
                                    onChange={() => handleUpdateCompanyServicePerm(client.id, { allowAllBenefits: true })}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                  />
                                  Allow ALL Statutory Benefits
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                                  <input
                                    type="radio"
                                    name={`ben_option_${client.id}`}
                                    checked={!cPerm.allowAllBenefits}
                                    onChange={() => handleUpdateCompanyServicePerm(client.id, { allowAllBenefits: false })}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                  />
                                  Selected Benefits Only
                                </label>
                              </div>

                              {/* Benefits Checkbox List */}
                              {!cPerm.allowAllBenefits && (
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                  {(client.benefitsServices || []).map(benName => {
                                    const isAllowed = (cPerm.allowedBenefits || []).includes(benName);
                                    return (
                                      <label key={benName} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 p-1 hover:bg-white rounded">
                                        <input
                                          type="checkbox"
                                          checked={isAllowed}
                                          onChange={e => {
                                            const currentAllowed = cPerm.allowedBenefits || [];
                                            const updatedBen = e.target.checked
                                              ? [...currentAllowed, benName]
                                              : currentAllowed.filter(b => b !== benName);
                                            handleUpdateCompanyServicePerm(client.id, { allowedBenefits: updatedBen });
                                          }}
                                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>{benName}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs"
                >
                  Save User Account & Restrictions
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
