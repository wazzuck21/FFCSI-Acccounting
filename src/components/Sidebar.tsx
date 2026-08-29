import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FFCSILogo } from './FFCSILogo';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Briefcase,
  SlidersHorizontal, 
  Receipt, 
  ShieldAlert, 
  CheckSquare, 
  FolderGit2, 
  DollarSign, 
  UserCog, 
  Settings,
  Sparkles,
  ChevronRight,
  X,
  Key,
  Banknote,
  CreditCard,
  Database,
  BarChart3,
  UserCheck2,
  UserSquare2
} from 'lucide-react';

export type NavTab = 
  | 'dashboard' 
  | 'profile'
  | 'executive-bi'
  | 'my-clients'
  | 'clients' 
  | 'workspaces' 
  | 'dynamic-builder' 
  | 'payables' 
  | 'compliance' 
  | 'tasks' 
  | 'documents' 
  | 'billing' 
  | 'payroll'
  | 'company-expenses'
  | 'credentials'
  | 'users' 
  | 'settings'
  | 'system-integrity';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unpaidPayablesCount?: number;
  pendingComplianceCount?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  unpaidPayablesCount = 0,
  pendingComplianceCount = 0,
  mobileOpen = false,
  onMobileClose
}) => {
  const { hasPermission, isSuperAdmin } = useAuth();

  const menuItems: { id: NavTab; label: string; icon: any; permissionKey?: any; badge?: number; highlight?: boolean }[] = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard, permissionKey: 'dashboard' },
    { id: 'profile', label: 'My Profile & Directory', icon: UserSquare2, highlight: true },
    { id: 'executive-bi', label: 'Executive BI Analytics', icon: BarChart3, permissionKey: 'reports', highlight: true },
    { id: 'my-clients', label: 'My Clients (To-Do List)', icon: Briefcase, permissionKey: 'clients' },
    { id: 'clients', label: 'Client Management', icon: Building2, permissionKey: 'clients' },
    { 
      id: 'payables', 
      label: 'BIR & Benefits Payables', 
      icon: Receipt, 
      permissionKey: 'payables',
      badge: unpaidPayablesCount 
    },
    { 
      id: 'compliance', 
      label: 'Deadline Monitoring', 
      icon: ShieldAlert, 
      permissionKey: 'compliance',
      badge: pendingComplianceCount 
    },
    { id: 'tasks', label: 'Task & Workflow', icon: CheckSquare, permissionKey: 'dashboard' },
    { id: 'documents', label: 'Document Library', icon: FolderGit2, permissionKey: 'documents' },
    { id: 'billing', label: 'Billing & Invoices', icon: DollarSign, permissionKey: 'billing' },
    { id: 'payroll', label: 'Company Payroll & HR', icon: Banknote, permissionKey: 'payroll' },
    { id: 'company-expenses', label: 'Company Expenses & Bills', icon: CreditCard, permissionKey: 'companyExpenses' },
    { id: 'credentials', label: 'Core Credentials Vault', icon: Key, permissionKey: 'clients' },
    { id: 'users', label: 'User Management', icon: UserCog, permissionKey: 'userManagement' },
    { id: 'settings', label: 'System & Master Tables', icon: Settings, permissionKey: 'settings' },
    { id: 'system-integrity', label: 'Data Integrity & Sync', icon: Database, permissionKey: 'settings' },
  ];

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const navContent = (
    <>
      <div className="p-4 flex-1 space-y-1">
        <p className="px-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
          Core Navigation
        </p>

        {menuItems.map((item) => {
          // Permission filter check
          if (item.permissionKey && !hasPermission(item.permissionKey)) {
            return null;
          }

          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs'
                  : item.highlight
                  ? 'bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : item.highlight ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.highlight && !isActive && (
                  <Sparkles className="w-3 h-3 text-amber-500" />
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Role Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Role Status:</span>
          <span className={`font-bold ${isSuperAdmin ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200'}`}>
            {isSuperAdmin ? 'Super Admin' : 'Staff Member'}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 shrink-0 hidden md:flex flex-col min-h-[calc(100vh-65px)] shadow-xs">
        {navContent}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs md:hidden flex"
          onClick={onMobileClose}
        >
          <div 
            className="w-72 bg-white h-full shadow-2xl flex flex-col p-2 overflow-y-auto animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 mb-1">
              <div className="flex items-center gap-2.5">
                <FFCSILogo size={32} variant="icon" />
                <div>
                  <h3 className="font-extrabold font-serif text-slate-900 text-sm">FFCSI Navigation</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Family Friends Consultancy Services Inc.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onMobileClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
