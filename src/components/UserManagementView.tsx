import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, UserRole, CompanyServicePermission } from '../types';
import { hashPassword } from '../lib/cryptoUtils';
import { ROLE_LABELS, normalizeUserRole } from '../lib/rbac';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import { DEFAULT_BIR_TAX_OPTIONS, DEFAULT_BENEFITS_OPTIONS } from '../data/masterTables';
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
  Sparkles,
  KeyRound,
  Key,
  Banknote,
  CreditCard,
  CheckSquare,
  Filter,
  CheckCheck,
  PlusCircle,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';

// Comprehensive BIR Standard Master List
const ALL_STANDARD_BIR_OPTIONS: { code: string; name: string }[] = [
  { code: '0619E', name: 'Monthly Remittance of Creditable Income Taxes Withheld (Expanded)' },
  { code: '1601C', name: 'Monthly Remittance of Income Taxes Withheld on Compensation' },
  { code: '1601EQ', name: 'Quarterly Remittance of Creditable Income Taxes Withheld (Expanded)' },
  { code: '2550Q', name: 'Quarterly Value-Added Tax (VAT) Return' },
  { code: '2551Q', name: 'Quarterly Percentage Tax Return' },
  { code: '1702Q', name: 'Quarterly Corporate Income Tax Return' },
  { code: '1701Q', name: 'Quarterly Individual Income Tax Return' },
  { code: '1702RT', name: 'Annual Corporate Income Tax Return (Regular Rate)' },
  { code: '1702EX', name: 'Annual Corporate Income Tax Return (Exempt)' },
  { code: '1702MX', name: 'Annual Corporate Income Tax Return (Mixed Rate)' },
  { code: '1701', name: 'Annual Individual Income Tax Return' },
  { code: '1701A', name: 'Annual Income Tax Return (Purely Business/Profession)' },
  { code: '0605', name: 'Payment Form (Annual Registration Fee / Deficiencies)' },
  { code: 'SAWT', name: 'Summary Alphalist of Withholding Taxes (Attachment)' },
  { code: 'SLSP', name: 'Summary List of Sales and Purchases (VAT Attachment)' },
  { code: 'QAP', name: 'Quarterly Alphabetical List of Payees (Alphalist)' },
  { code: '1604C', name: 'Annual Information Return of Compensation Withholding' },
  { code: '1604E', name: 'Annual Information Return of Expanded Withholding' },
  { code: '1604F', name: 'Annual Information Return of Final Withholding Taxes' },
  { code: '2307', name: 'Certificate of Creditable Tax Withheld at Source' },
  { code: '2316', name: 'Certificate of Compensation Payment / Tax Withheld' }
];

// Comprehensive Statutory Benefits Master List
const ALL_STANDARD_BENEFITS_OPTIONS: { code: string; name: string }[] = [
  { code: 'SSS Contribution', name: 'Social Security System (SSS) Monthly Contribution' },
  { code: 'SSS Salary Loan', name: 'SSS Salary Loan Monthly Amortization' },
  { code: 'SSS Calamity Loan', name: 'SSS Calamity Loan Amortization' },
  { code: 'PhilHealth Contribution', name: 'Philippine Health Insurance Corp (PhilHealth) Contribution' },
  { code: 'HDMF Contribution', name: 'Pag-IBIG Fund (HDMF) Monthly Savings Contribution' },
  { code: 'HDMF Multi-Purpose Loan (MPL)', name: 'Pag-IBIG Fund Multi-Purpose Loan (MPL) Amortization' },
  { code: 'HDMF Calamity Loan', name: 'Pag-IBIG Fund Calamity Loan Amortization' },
  { code: 'HDMF Housing Loan', name: 'Pag-IBIG Fund Housing Loan Amortization' },
  { code: 'Pag-IBIG MP2', name: 'Pag-IBIG Modified Pag-IBIG II (MP2) Savings' },
  { code: 'EC Contribution', name: "Employees' Compensation Program Contribution" }
];

export const UserManagementView: React.FC = () => {
  const { allUsers, currentUser, isSuperAdmin, updateUsers, resetUserPassword } = useAuth();
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
  const [permCompanyExpenses, setPermCompanyExpenses] = useState(false);
  const [permCredentials, setPermCredentials] = useState(false);
  const [permDocuments, setPermDocuments] = useState(true);
  const [permSettings, setPermSettings] = useState(false);
  const [permUserManagement, setPermUserManagement] = useState(false);
  const [permDynamicFields, setPermDynamicFields] = useState(false);

  // Company Restrictions & Granular Service Permissions
  const [restrictedClients, setRestrictedClients] = useState<string[]>([]);
  const [clientServicePerms, setClientServicePerms] = useState<Record<string, CompanyServicePermission>>({});
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Modal client search & filtering state
  const [clientModalSearchQuery, setClientModalSearchQuery] = useState('');
  const [clientModalFilterType, setClientModalFilterType] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED' | 'eFPS' | 'Manual'>('ALL');

  // Local search and custom add states inside individual client configure panels
  const [birSearchQueryPerClient, setBirSearchQueryPerClient] = useState<Record<string, string>>({});
  const [benefitsSearchQueryPerClient, setBenefitsSearchQueryPerClient] = useState<Record<string, string>>({});
  const [customBirInputPerClient, setCustomBirInputPerClient] = useState<Record<string, string>>({});
  const [customBenefitInputPerClient, setCustomBenefitInputPerClient] = useState<Record<string, string>>({});

  const filteredUsers = allUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems: paginatedUsers,
    setCurrentPage,
    setPageSize,
    loadMore,
    hasMoreToLoad,
  } = usePagination(filteredUsers, {
    initialPageSize: 15,
    resetOnChange: searchQuery,
  });

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Helper to auto-update all core navigation choices based on Role Type
  const applyRolePermissions = (targetRole: UserRole) => {
    const norm = normalizeUserRole(targetRole);
    switch (norm) {
      case 'SUPER_ADMIN':
      case 'ADMINISTRATOR':
        setPermDashboard(true);
        setPermClients(true);
        setPermBilling(true);
        setPermPayables(true);
        setPermCompliance(true);
        setPermReports(true);
        setPermPayroll(true);
        setPermCompanyExpenses(true);
        setPermCredentials(true);
        setPermDocuments(true);
        setPermSettings(true);
        setPermUserManagement(true);
        setPermDynamicFields(true);
        break;
      case 'SENIOR_ACCOUNTANT':
      case 'BENEFITS':
        setPermDashboard(true);
        setPermClients(true);
        setPermBilling(false);
        setPermPayables(true);
        setPermCompliance(true);
        setPermReports(true);
        setPermPayroll(true);
        setPermCompanyExpenses(true);
        setPermCredentials(false);
        setPermDocuments(true);
        setPermSettings(false);
        setPermUserManagement(false);
        setPermDynamicFields(false);
        break;
      case 'ACCOUNTANT':
      case 'ACCOUNTING':
        setPermDashboard(true);
        setPermClients(true);
        setPermBilling(false);
        setPermPayables(true);
        setPermCompliance(true);
        setPermReports(true);
        setPermPayroll(true);
        setPermCompanyExpenses(false);
        setPermCredentials(false);
        setPermDocuments(true);
        setPermSettings(false);
        setPermUserManagement(false);
        setPermDynamicFields(false);
        break;
      case 'BILLING_STAFF':
      case 'BILLING':
        setPermDashboard(true);
        setPermClients(true);
        setPermBilling(true);
        setPermPayables(true);
        setPermCompliance(false);
        setPermReports(true);
        setPermPayroll(false);
        setPermCompanyExpenses(false);
        setPermCredentials(false);
        setPermDocuments(true);
        setPermSettings(false);
        setPermUserManagement(false);
        setPermDynamicFields(false);
        break;
      case 'STAFF':
      default:
        setPermDashboard(true);
        setPermClients(true);
        setPermBilling(false);
        setPermPayables(false);
        setPermCompliance(true);
        setPermReports(false);
        setPermPayroll(false);
        setPermCompanyExpenses(false);
        setPermCredentials(false);
        setPermDocuments(true);
        setPermSettings(false);
        setPermUserManagement(false);
        setPermDynamicFields(false);
        break;
    }
  };

  // Preset core navigation permissions based on selected Role Type
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    applyRolePermissions(newRole);
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
    
    // Auto-update core navigation choices for Staff default
    applyRolePermissions('STAFF');

    setRestrictedClients([]);
    setClientServicePerms({});
    setExpandedClientId(null);
    setClientModalSearchQuery('');
    setClientModalFilterType('ALL');
    setBirSearchQueryPerClient({});
    setBenefitsSearchQueryPerClient({});
    setCustomBirInputPerClient({});
    setCustomBenefitInputPerClient({});
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
    setPermCompanyExpenses(p.companyExpenses ?? false);
    setPermCredentials(p.credentials ?? (p.clients && (user.role === 'SUPER_ADMIN' || user.role === 'ADMINISTRATOR')));
    setPermDocuments(p.documents ?? true);
    setPermSettings(p.settings ?? false);
    setPermUserManagement(p.userManagement ?? false);
    setPermDynamicFields(p.dynamicFields ?? false);

    setRestrictedClients(p.clientAccessList || []);
    setClientServicePerms(p.clientServicePermissions || {});
    setExpandedClientId((p.clientAccessList && p.clientAccessList.length > 0) ? p.clientAccessList[0] : null);
    setClientModalSearchQuery('');
    setClientModalFilterType('ALL');
    setBirSearchQueryPerClient({});
    setBenefitsSearchQueryPerClient({});
    setCustomBirInputPerClient({});
    setCustomBenefitInputPerClient({});
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

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      alert('Please fill in Full Name and Username.');
      return;
    }

    let passwordHashToUse = editingUser?.passwordHash;
    let saltToUse = editingUser?.salt;

    // If new password entered or creating new user
    if (password || !editingUser) {
      const rawPass = password || 'password123';
      const hashed = await hashPassword(rawPass);
      passwordHashToUse = hashed.hash;
      saltToUse = hashed.salt;
    }

    const userData: User = {
      id: editingUser ? editingUser.id : `user_${Date.now()}`,
      fullName,
      username,
      passwordHash: passwordHashToUse,
      salt: saltToUse,
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
        companyExpenses: permCompanyExpenses,
        credentials: permCredentials || role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR',
        documents: permDocuments,
        settings: permSettings || role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR',
        userManagement: permUserManagement || role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR',
        dynamicFields: permDynamicFields || role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR',
        clientAccessList: restrictedClients,
        clientServicePermissions: clientServicePerms
      }
    };

    if (editingUser) {
      const updated = allUsers.map(u => u.id === editingUser.id ? userData : u);
      updateUsers(updated);
      addAuditLog(
        'User Account Updated',
        `Updated account details and permissions for ${fullName} (${role})`,
        currentUser?.id || '',
        currentUser?.fullName || '',
        'User',
        editingUser.id
      );
    } else {
      const updated = [...allUsers, userData];
      updateUsers(updated);
      addAuditLog(
        'User Account Created',
        `Created new user account for ${fullName} (${role}) with PBKDF2 hash security`,
        currentUser?.id || '',
        currentUser?.fullName || '',
        'User',
        userData.id
      );
    }

    setShowUserModal(false);
  };

  const getRoleLabel = (r: UserRole) => {
    return ROLE_LABELS[r] || r;
  };

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case 'SUPER_ADMIN': return 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold';
      case 'ADMINISTRATOR': return 'bg-purple-50 text-purple-800 border-purple-300 font-bold';
      case 'SENIOR_ACCOUNTANT': return 'bg-indigo-50 text-indigo-800 border-indigo-300 font-bold';
      case 'ACCOUNTANT':
      case 'ACCOUNTING': return 'bg-blue-50 text-blue-800 border-blue-300 font-bold';
      case 'BILLING':
      case 'BILLING_STAFF': return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'BENEFITS': return 'bg-cyan-50 text-cyan-800 border-cyan-300 font-bold';
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
              {paginatedUsers.map(u => {
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

                    {/* Username & Security Status */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <p className="font-mono text-indigo-700 font-bold">@{u.username}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <KeyRound className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-bold">
                            PBKDF2 Hashed
                          </span>
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

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onLoadMore={loadMore}
          hasMoreToLoad={hasMoreToLoad}
          itemLabel="users"
        />
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
                      value={fullName || ''}
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
                      value={contactNumber || ''}
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
                        value={username || ''}
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
                        value={password || ''}
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-semibold">Role Type *</label>
                      <span className="text-[11px] text-indigo-600 font-medium">Auto-configures navigation</span>
                    </div>
                    <select
                      value={role}
                      onChange={e => handleRoleChange(e.target.value as UserRole)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-sm"
                    >
                      <option value="SUPER_ADMIN">Super Admin (Full Permanent System Access)</option>
                      <option value="ADMINISTRATOR">Administrator (Full Administrative Control)</option>
                      <option value="SENIOR_ACCOUNTANT">Senior Accountant (Payroll, Expenses, Payables & Filing)</option>
                      <option value="ACCOUNTANT">Accountant (Payables, Payroll, Compliance & Reports)</option>
                      <option value="BILLING_STAFF">Billing Staff (Invoices, Client Billing & Payables)</option>
                      <option value="STAFF">General Staff (Client Monitor & Document Access)</option>
                      <option value="ACCOUNTING">Accounting Specialist</option>
                      <option value="BILLING">Billing Specialist</option>
                      <option value="BENEFITS">Benefits Specialist</option>
                    </select>
                  </div>

                  {/* Account Status Select */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Account Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-sm"
                    >
                      <option value="Active">Active</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* SECTION 2: Core Navigation Access Restrictions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Core Navigation Access Restrictions
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Auto-updated when changing Role, or customize granular tab access below:
                      </p>
                    </div>
                  </div>
                  
                  {/* Preset Auto-Action Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyRolePermissions(role)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors shadow-xs"
                      title="Reset navigation choices based on the currently selected Role"
                    >
                      <RefreshCw className="w-3 h-3" /> Auto-Update from Role
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPermDashboard(true);
                        setPermClients(true);
                        setPermBilling(true);
                        setPermPayables(true);
                        setPermCompliance(true);
                        setPermReports(true);
                        setPermPayroll(true);
                        setPermCompanyExpenses(true);
                        setPermCredentials(true);
                        setPermDocuments(true);
                        setPermSettings(true);
                        setPermUserManagement(true);
                        setPermDynamicFields(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      <CheckCheck className="w-3 h-3 text-emerald-600" /> Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPermDashboard(true);
                        setPermClients(true);
                        setPermBilling(false);
                        setPermPayables(false);
                        setPermCompliance(false);
                        setPermReports(false);
                        setPermPayroll(false);
                        setPermCompanyExpenses(false);
                        setPermCredentials(false);
                        setPermDocuments(false);
                        setPermSettings(false);
                        setPermUserManagement(false);
                        setPermDynamicFields(false);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      <X className="w-3 h-3 text-rose-500" /> Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white p-3 border border-slate-200 rounded-xl shadow-xs">
                  
                  {/* 1. Operations Dashboard */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permDashboard ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permDashboard}
                      onChange={e => setPermDashboard(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Operations Dashboard</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Overview KPI charts and quick cards</span>
                    </div>
                  </label>

                  {/* 2. Client Management & Workspaces */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permClients ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permClients}
                      onChange={e => setPermClients(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Client Management</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Assigned company workspaces & tasks</span>
                    </div>
                  </label>

                  {/* 3. BIR & Benefits Payables */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permPayables ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permPayables}
                      onChange={e => setPermPayables(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <Receipt className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>BIR & Benefits Payables</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Tax dues & statutory remittances</span>
                    </div>
                  </label>

                  {/* 4. Compliance & Deadline Monitor */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permCompliance ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permCompliance}
                      onChange={e => setPermCompliance(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Deadline Monitoring</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Compliance calendars and filing alerts</span>
                    </div>
                  </label>

                  {/* 5. Billing & Invoices */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permBilling ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permBilling}
                      onChange={e => setPermBilling(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Billing & Invoices</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Client retainer & statement billing</span>
                    </div>
                  </label>

                  {/* 6. Executive BI & Reports */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permReports ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permReports}
                      onChange={e => setPermReports(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <BarChart3 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Executive BI Analytics</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Reports & financial performance</span>
                    </div>
                  </label>

                  {/* 7. Company Payroll & HR */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permPayroll ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permPayroll}
                      onChange={e => setPermPayroll(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <Banknote className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Company Payroll & HR</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Payslips, vale ledger & leave management</span>
                    </div>
                  </label>

                  {/* 8. Company Expenses & Bills */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permCompanyExpenses ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permCompanyExpenses}
                      onChange={e => setPermCompanyExpenses(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <CreditCard className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>Company Expenses & Bills</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Operational disbursements & vouchers</span>
                    </div>
                  </label>

                  {/* 9. Confidential Core Credentials Vault */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permCredentials ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permCredentials}
                      onChange={e => setPermCredentials(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <Key className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>Core Credentials Vault</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">PBKDF2 secured eFPS & portal logins</span>
                    </div>
                  </label>

                  {/* 10. Document Storage & Library */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permDocuments ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permDocuments}
                      onChange={e => setPermDocuments(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <FolderGit2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Document Library</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">File repository and tax filings</span>
                    </div>
                  </label>

                  {/* 11. User Management */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permUserManagement ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permUserManagement}
                      onChange={e => setPermUserManagement(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <UserCog className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>User Management</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Staff roles, permissions and accounts</span>
                    </div>
                  </label>

                  {/* 12. System Settings & Master Tables */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permSettings ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permSettings}
                      onChange={e => setPermSettings(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <Settings className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>System & Master Tables</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Tax calendars, rates & system sync</span>
                    </div>
                  </label>

                  {/* 13. Dynamic Fields Builder */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${permDynamicFields ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}>
                    <input
                      type="checkbox"
                      checked={permDynamicFields}
                      onChange={e => setPermDynamicFields(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Dynamic Fields Builder</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">Custom form builder & dynamic metadata</span>
                    </div>
                  </label>

                </div>
              </div>

              {/* SECTION 3: Company Access & Granular Filing Restrictions */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-700" /> Company Access & Granular Filing Restrictions
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Unchecked = Full access to all companies. Check specific companies below to restrict this user, then configure whether <strong>ALL filings</strong> or <strong>Custom Selected BIR / Benefits</strong> are allowed.
                    </p>
                  </div>
                  {restrictedClients.length > 0 && (
                    <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold self-start sm:self-auto shrink-0">
                      {restrictedClients.length} of {clients.length} Companies Restricted
                    </span>
                  )}
                </div>

                {/* Client Search and Filter Bar */}
                <div className="space-y-2 pt-1 border-t border-amber-200/70">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={clientModalSearchQuery}
                        onChange={e => setClientModalSearchQuery(e.target.value)}
                        placeholder="Search client by company name, trade name, or TIN..."
                        className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder-slate-400 shadow-2xs"
                      />
                      {clientModalSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setClientModalSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {}}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search Client</span>
                    </button>
                  </div>

                  {/* Filter Pills & Bulk Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1">
                      {(['ALL', 'ASSIGNED', 'UNASSIGNED', 'eFPS', 'Manual'] as const).map(tab => {
                        const count = 
                          tab === 'ALL' ? clients.length :
                          tab === 'ASSIGNED' ? restrictedClients.length :
                          tab === 'UNASSIGNED' ? clients.length - restrictedClients.length :
                          tab === 'eFPS' ? clients.filter(c => (c.registrationMethod || '').toLowerCase() === 'efps').length :
                          clients.filter(c => (c.registrationMethod || '').toLowerCase() !== 'efps').length;

                        const isActive = clientModalFilterType === tab;
                        const label = 
                          tab === 'ALL' ? 'All Clients' :
                          tab === 'ASSIGNED' ? 'Assigned' :
                          tab === 'UNASSIGNED' ? 'Unassigned' :
                          tab === 'eFPS' ? 'eFPS Filers' : 'Manual Filers';

                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setClientModalFilterType(tab)}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                              isActive 
                                ? 'bg-amber-600 text-white shadow-2xs' 
                                : 'bg-white/80 hover:bg-white text-slate-700 border border-amber-200/80'
                            }`}
                          >
                            {label} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const matchingIds = clients
                            .filter(c => {
                              if (clientModalSearchQuery.trim()) {
                                const q = clientModalSearchQuery.toLowerCase();
                                return (c.companyName || '').toLowerCase().includes(q) ||
                                  (c.tradeName || '').toLowerCase().includes(q) ||
                                  (c.tin || '').toLowerCase().includes(q);
                              }
                              return true;
                            })
                            .map(c => c.id);
                          
                          setRestrictedClients(prev => Array.from(new Set([...prev, ...matchingIds])));
                        }}
                        className="text-amber-800 hover:text-amber-950 font-bold hover:underline"
                      >
                        + Assign Filtered
                      </button>
                      <span className="text-amber-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          const matchingIds = clients
                            .filter(c => {
                              if (clientModalSearchQuery.trim()) {
                                const q = clientModalSearchQuery.toLowerCase();
                                return (c.companyName || '').toLowerCase().includes(q) ||
                                  (c.tradeName || '').toLowerCase().includes(q) ||
                                  (c.tin || '').toLowerCase().includes(q);
                              }
                              return true;
                            })
                            .map(c => c.id);
                          
                          setRestrictedClients(prev => prev.filter(id => !matchingIds.includes(id)));
                        }}
                        className="text-slate-600 hover:text-slate-900 font-semibold hover:underline"
                      >
                        Clear Filtered
                      </button>
                    </div>
                  </div>
                </div>

                {/* Client Company Selection List */}
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {(() => {
                    const filteredModalClients = clients.filter(client => {
                      if (clientModalSearchQuery.trim()) {
                        const q = clientModalSearchQuery.toLowerCase();
                        const matchName = (client.companyName || '').toLowerCase().includes(q);
                        const matchTrade = (client.tradeName || '').toLowerCase().includes(q);
                        const matchTin = (client.tin || '').toLowerCase().includes(q);
                        const matchMethod = (client.registrationMethod || '').toLowerCase().includes(q);
                        if (!matchName && !matchTrade && !matchTin && !matchMethod) return false;
                      }

                      if (clientModalFilterType === 'ASSIGNED') {
                        return restrictedClients.includes(client.id);
                      }
                      if (clientModalFilterType === 'UNASSIGNED') {
                        return !restrictedClients.includes(client.id);
                      }
                      if (clientModalFilterType === 'eFPS') {
                        return (client.registrationMethod || '').toLowerCase() === 'efps';
                      }
                      if (clientModalFilterType === 'Manual') {
                        return (client.registrationMethod || '').toLowerCase() !== 'efps';
                      }
                      return true;
                    });

                    if (filteredModalClients.length === 0) {
                      return (
                        <div className="p-6 bg-white/70 border border-dashed border-amber-300 rounded-xl text-center">
                          <Building2 className="w-8 h-8 text-amber-400 mx-auto mb-1.5" />
                          <p className="text-xs font-bold text-slate-700">No client companies found</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Try searching with a different keyword or resetting your filter tabs.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setClientModalSearchQuery('');
                              setClientModalFilterType('ALL');
                            }}
                            className="mt-2.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-xs transition-colors"
                          >
                            Reset Client Filter
                          </button>
                        </div>
                      );
                    }

                    return filteredModalClients.map(client => {
                      const isClientAssigned = restrictedClients.includes(client.id);
                      const isExpanded = expandedClientId === client.id;
                      const cPerm = clientServicePerms[client.id] || {
                        allowAllBIR: true,
                        allowedBIR: [],
                        allowAllBenefits: true,
                        allowedBenefits: []
                      };

                      // Active Registered Services for this Client
                      const clientActiveBIR = client.birTaxServices || [];
                      const clientActiveBenefits = client.benefitsServices || [];

                      // Master catalogue merging
                      const allBirCodes = Array.from(new Set([
                        ...clientActiveBIR,
                        ...ALL_STANDARD_BIR_OPTIONS.map(b => b.code),
                        ...(cPerm.allowedBIR || [])
                      ]));

                      const allBenefitNames = Array.from(new Set([
                        ...clientActiveBenefits,
                        ...ALL_STANDARD_BENEFITS_OPTIONS.map(b => b.code),
                        ...(cPerm.allowedBenefits || [])
                      ]));

                      // Local search queries
                      const birSearch = (birSearchQueryPerClient[client.id] || '').toLowerCase();
                      const benSearch = (benefitsSearchQueryPerClient[client.id] || '').toLowerCase();

                      const filteredBirCodes = allBirCodes.filter(code => {
                        if (!birSearch) return true;
                        const matchCode = code.toLowerCase().includes(birSearch);
                        const std = ALL_STANDARD_BIR_OPTIONS.find(s => s.code.toLowerCase() === code.toLowerCase());
                        const matchName = std ? std.name.toLowerCase().includes(birSearch) : false;
                        return matchCode || matchName;
                      });

                      const filteredBenefits = allBenefitNames.filter(name => {
                        if (!benSearch) return true;
                        return name.toLowerCase().includes(benSearch);
                      });

                      const isEfps = (client.registrationMethod || '').toLowerCase() === 'efps';

                      return (
                        <div 
                          key={client.id} 
                          className={`border rounded-xl transition-all ${
                            isClientAssigned 
                              ? 'bg-white border-amber-300 shadow-2xs ring-1 ring-amber-400/30' 
                              : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          {/* Company Header Row */}
                          <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <label className="flex items-start sm:items-center gap-2.5 cursor-pointer font-bold text-slate-900 text-xs flex-1">
                              <input
                                type="checkbox"
                                checked={isClientAssigned}
                                onChange={() => handleToggleClientAccess(client.id)}
                                className="mt-0.5 sm:mt-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0"
                              />
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-slate-900 font-bold">{client.companyName}</span>
                                  {client.tradeName && (
                                    <span className="text-slate-500 font-normal text-[11px]">({client.tradeName})</span>
                                  )}
                                  <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                                    isEfps ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {isEfps ? 'eFPS Filer' : 'Manual Filer'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-normal flex flex-wrap items-center gap-2">
                                  {client.tin && <span>TIN: {client.tin}</span>}
                                  {clientActiveBIR.length > 0 && (
                                    <span>• {clientActiveBIR.length} Active BIR Tax Forms</span>
                                  )}
                                  {clientActiveBenefits.length > 0 && (
                                    <span>• {clientActiveBenefits.length} Active Statutory Benefits</span>
                                  )}
                                </div>
                              </div>
                            </label>

                            {isClientAssigned && (
                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <div className="text-right hidden sm:block text-[10px] text-slate-500">
                                  <span className="font-semibold text-amber-800">
                                    {cPerm.allowAllBIR ? 'All BIR' : `${(cPerm.allowedBIR || []).length} BIR`}
                                  </span>
                                  <span className="mx-1">•</span>
                                  <span className="font-semibold text-emerald-800">
                                    {cPerm.allowAllBenefits ? 'All Benefits' : `${(cPerm.allowedBenefits || []).length} Benefits`}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                                  className={`px-3 py-1.5 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-all shadow-2xs ${
                                    isExpanded
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                  }`}
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                  <span>Configure Filings</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Expanded Granular BIR & Benefits Configuration Panel */}
                          {isClientAssigned && isExpanded && (
                            <div className="p-3.5 border-t border-amber-200 bg-slate-50/90 rounded-b-xl space-y-3.5 text-xs">
                              
                              {/* 1. BIR Tax Returns Access */}
                              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-amber-600" /> BIR Tax Returns Access
                                  </span>
                                  {!cPerm.allowAllBIR && (
                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                      {(cPerm.allowedBIR || []).length} of {allBirCodes.length} BIR forms selected
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                                    <input
                                      type="radio"
                                      name={`bir_option_${client.id}`}
                                      checked={cPerm.allowAllBIR}
                                      onChange={() => handleUpdateCompanyServicePerm(client.id, { allowAllBIR: true })}
                                      className="text-amber-600 focus:ring-amber-500 h-4 w-4"
                                    />
                                    <span>Allow ALL BIR Filings</span>
                                  </label>

                                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                                    <input
                                      type="radio"
                                      name={`bir_option_${client.id}`}
                                      checked={!cPerm.allowAllBIR}
                                      onChange={() => {
                                        // Default to client's active registered forms if current selection is empty
                                        const initial = (cPerm.allowedBIR && cPerm.allowedBIR.length > 0)
                                          ? cPerm.allowedBIR
                                          : (client.birTaxServices && client.birTaxServices.length > 0 ? client.birTaxServices : ['0619E', '1601C', '2550Q']);
                                        handleUpdateCompanyServicePerm(client.id, { allowAllBIR: false, allowedBIR: initial });
                                      }}
                                      className="text-amber-600 focus:ring-amber-500 h-4 w-4"
                                    />
                                    <span>Selected BIR Filings Only</span>
                                  </label>
                                </div>

                                {/* Granular BIR Selection UI */}
                                {!cPerm.allowAllBIR && (
                                  <div className="space-y-2 pt-1">
                                    {/* BIR Search & Quick Actions */}
                                    <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
                                      <div className="relative flex-1">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input
                                          type="text"
                                          value={birSearchQueryPerClient[client.id] || ''}
                                          onChange={e => setBirSearchQueryPerClient(prev => ({ ...prev, [client.id]: e.target.value }))}
                                          placeholder="Filter BIR (e.g. 0619E, 1601C, 2550Q, 1702Q)..."
                                          className="w-full pl-8 pr-6 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                        {birSearchQueryPerClient[client.id] && (
                                          <button
                                            type="button"
                                            onClick={() => setBirSearchQueryPerClient(prev => ({ ...prev, [client.id]: '' }))}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                        {clientActiveBIR.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = Array.from(new Set([...(cPerm.allowedBIR || []), ...clientActiveBIR]));
                                              handleUpdateCompanyServicePerm(client.id, { allowedBIR: updated });
                                            }}
                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded"
                                          >
                                            + All Active ({clientActiveBIR.length})
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateCompanyServicePerm(client.id, { allowedBIR: allBirCodes });
                                          }}
                                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded"
                                        >
                                          Select All ({allBirCodes.length})
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateCompanyServicePerm(client.id, { allowedBIR: [] });
                                          }}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                                        >
                                          Deselect All
                                        </button>
                                      </div>
                                    </div>

                                    {/* BIR Checkbox Badges Grid */}
                                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                      {filteredBirCodes.map(birCode => {
                                        const isAllowed = (cPerm.allowedBIR || []).includes(birCode);
                                        const isClientActive = clientActiveBIR.includes(birCode);
                                        const stdMatch = ALL_STANDARD_BIR_OPTIONS.find(s => s.code.toLowerCase() === birCode.toLowerCase());

                                        return (
                                          <label
                                            key={birCode}
                                            className={`flex items-start gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                                              isAllowed
                                                ? 'bg-white border-amber-300 text-slate-900 shadow-2xs font-semibold'
                                                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isAllowed}
                                              onChange={e => {
                                                const current = cPerm.allowedBIR || [];
                                                const updated = e.target.checked
                                                  ? [...current, birCode]
                                                  : current.filter(b => b !== birCode);
                                                handleUpdateCompanyServicePerm(client.id, { allowedBIR: updated });
                                              }}
                                              className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1">
                                                <span className="font-bold text-[11px] text-amber-950">BIR {birCode}</span>
                                                {isClientActive && (
                                                  <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                                                    Client Active
                                                  </span>
                                                )}
                                              </div>
                                              {stdMatch && (
                                                <p className="text-[10px] text-slate-500 truncate" title={stdMatch.name}>
                                                  {stdMatch.name}
                                                </p>
                                              )}
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>

                                    {/* Add Custom BIR Code */}
                                    <div className="flex items-center gap-2 pt-1">
                                      <input
                                        type="text"
                                        value={customBirInputPerClient[client.id] || ''}
                                        onChange={e => setCustomBirInputPerClient(prev => ({ ...prev, [client.id]: e.target.value.toUpperCase() }))}
                                        placeholder="Add custom BIR tax code (e.g. 1600-WP, 2000, 1704)..."
                                        className="flex-1 px-2.5 py-1 text-[11px] bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const val = (customBirInputPerClient[client.id] || '').trim().toUpperCase();
                                          if (val) {
                                            const updated = Array.from(new Set([...(cPerm.allowedBIR || []), val]));
                                            handleUpdateCompanyServicePerm(client.id, { allowedBIR: updated });
                                            setCustomBirInputPerClient(prev => ({ ...prev, [client.id]: '' }));
                                          }
                                        }}
                                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md text-[11px] flex items-center gap-1 shrink-0"
                                      >
                                        <Plus className="w-3 h-3" /> Add BIR
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 2. Statutory Benefits Remittance Access */}
                              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Statutory Benefits Remittance Access
                                  </span>
                                  {!cPerm.allowAllBenefits && (
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      {(cPerm.allowedBenefits || []).length} of {allBenefitNames.length} Benefits selected
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                                    <input
                                      type="radio"
                                      name={`ben_option_${client.id}`}
                                      checked={cPerm.allowAllBenefits}
                                      onChange={() => handleUpdateCompanyServicePerm(client.id, { allowAllBenefits: true })}
                                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                    />
                                    <span>Allow ALL Statutory Benefits</span>
                                  </label>

                                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                                    <input
                                      type="radio"
                                      name={`ben_option_${client.id}`}
                                      checked={!cPerm.allowAllBenefits}
                                      onChange={() => {
                                        // Default to client's active registered benefits if current selection is empty
                                        const initial = (cPerm.allowedBenefits && cPerm.allowedBenefits.length > 0)
                                          ? cPerm.allowedBenefits
                                          : (client.benefitsServices && client.benefitsServices.length > 0 ? client.benefitsServices : ['SSS Contribution', 'PhilHealth Contribution', 'HDMF Contribution']);
                                        handleUpdateCompanyServicePerm(client.id, { allowAllBenefits: false, allowedBenefits: initial });
                                      }}
                                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                    />
                                    <span>Selected Benefits Only</span>
                                  </label>
                                </div>

                                {/* Granular Benefits Selection UI */}
                                {!cPerm.allowAllBenefits && (
                                  <div className="space-y-2 pt-1">
                                    {/* Benefits Search & Quick Actions */}
                                    <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
                                      <div className="relative flex-1">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input
                                          type="text"
                                          value={benefitsSearchQueryPerClient[client.id] || ''}
                                          onChange={e => setBenefitsSearchQueryPerClient(prev => ({ ...prev, [client.id]: e.target.value }))}
                                          placeholder="Filter benefits (e.g. SSS, PhilHealth, Pag-IBIG)..."
                                          className="w-full pl-8 pr-6 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                        {benefitsSearchQueryPerClient[client.id] && (
                                          <button
                                            type="button"
                                            onClick={() => setBenefitsSearchQueryPerClient(prev => ({ ...prev, [client.id]: '' }))}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                        {clientActiveBenefits.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = Array.from(new Set([...(cPerm.allowedBenefits || []), ...clientActiveBenefits]));
                                              handleUpdateCompanyServicePerm(client.id, { allowedBenefits: updated });
                                            }}
                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded"
                                          >
                                            + All Active ({clientActiveBenefits.length})
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateCompanyServicePerm(client.id, { allowedBenefits: allBenefitNames });
                                          }}
                                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded"
                                        >
                                          Select All ({allBenefitNames.length})
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateCompanyServicePerm(client.id, { allowedBenefits: [] });
                                          }}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                                        >
                                          Deselect All
                                        </button>
                                      </div>
                                    </div>

                                    {/* Benefits Checkbox Badges Grid */}
                                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {filteredBenefits.map(benName => {
                                        const isAllowed = (cPerm.allowedBenefits || []).includes(benName);
                                        const isClientActive = clientActiveBenefits.includes(benName);
                                        const stdMatch = ALL_STANDARD_BENEFITS_OPTIONS.find(s => s.code.toLowerCase() === benName.toLowerCase());

                                        return (
                                          <label
                                            key={benName}
                                            className={`flex items-start gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                                              isAllowed
                                                ? 'bg-white border-emerald-300 text-slate-900 shadow-2xs font-semibold'
                                                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isAllowed}
                                              onChange={e => {
                                                const current = cPerm.allowedBenefits || [];
                                                const updated = e.target.checked
                                                  ? [...current, benName]
                                                  : current.filter(b => b !== benName);
                                                handleUpdateCompanyServicePerm(client.id, { allowedBenefits: updated });
                                              }}
                                              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1">
                                                <span className="font-bold text-[11px] text-slate-900">{benName}</span>
                                                {isClientActive && (
                                                  <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                                                    Client Active
                                                  </span>
                                                )}
                                              </div>
                                              {stdMatch && stdMatch.name !== benName && (
                                                <p className="text-[10px] text-slate-500 truncate" title={stdMatch.name}>
                                                  {stdMatch.name}
                                                </p>
                                              )}
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>

                                    {/* Add Custom Benefit Name */}
                                    <div className="flex items-center gap-2 pt-1">
                                      <input
                                        type="text"
                                        value={customBenefitInputPerClient[client.id] || ''}
                                        onChange={e => setCustomBenefitInputPerClient(prev => ({ ...prev, [client.id]: e.target.value }))}
                                        placeholder="Add custom benefit / loan remittance (e.g. Pag-IBIG MP2, HMO, Provident Fund)..."
                                        className="flex-1 px-2.5 py-1 text-[11px] bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const val = (customBenefitInputPerClient[client.id] || '').trim();
                                          if (val) {
                                            const updated = Array.from(new Set([...(cPerm.allowedBenefits || []), val]));
                                            handleUpdateCompanyServicePerm(client.id, { allowedBenefits: updated });
                                            setCustomBenefitInputPerClient(prev => ({ ...prev, [client.id]: '' }));
                                          }
                                        }}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[11px] flex items-center gap-1 shrink-0"
                                      >
                                        <Plus className="w-3 h-3" /> Add Benefit
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
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
