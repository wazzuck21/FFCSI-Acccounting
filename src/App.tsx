/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ClientManagementView } from './components/ClientManagementView';
import { ClientWorkspaceView } from './components/ClientWorkspaceView';
import { DynamicInfoBuilderView } from './components/DynamicInfoBuilderView';
import { PayablesManagementView } from './components/PayablesManagementView';
import { ComplianceMonitoringView } from './components/ComplianceMonitoringView';
import { UserManagementView } from './components/UserManagementView';
import { BillingManagementView } from './components/BillingManagementView';
import { CoreCredentialsView } from './components/CoreCredentialsView';
import { MyClientsView } from './components/MyClientsView';
import { MasterTablesView } from './components/MasterTablesView';
import { CompanyPayrollView } from './components/CompanyPayrollView';
import { CompanyExpensesView } from './components/CompanyExpensesView';
import { TaskWorkflowView } from './components/TaskWorkflowView';
import { DocumentLibraryView } from './components/DocumentLibraryView';
import { DataIntegrityBackupView } from './components/DataIntegrityBackupView';
import { ExecutiveBiView } from './components/ExecutiveBiView';
import { LoginView } from './components/LoginView';
import { 
  CheckSquare, 
  FolderGit2, 
  DollarSign, 
  Settings, 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Upload,
  Calendar,
  Sparkles,
  ShieldCheck,
  Building2,
  Clock,
  ArrowUpRight,
  Filter,
  LayoutDashboard,
  Briefcase,
  Receipt,
  ShieldAlert,
  Menu,
  ArrowLeft
} from 'lucide-react';

export const TAB_LABELS: Record<NavTab, string> = {
  'dashboard': 'Operations Dashboard',
  'executive-bi': 'Executive BI Analytics',
  'my-clients': 'My Clients (To-Do List)',
  'clients': 'Client Management',
  'workspaces': 'Client Workspace',
  'dynamic-builder': 'Dynamic Info Builder',
  'payables': 'BIR & Benefits Payables',
  'compliance': 'Deadline Monitoring',
  'tasks': 'Task & Workflow',
  'documents': 'Document Library',
  'billing': 'Billing & Invoices',
  'payroll': 'Company Payroll & HR',
  'company-expenses': 'Company Expenses & Bills',
  'credentials': 'Core Credentials Vault',
  'users': 'User Management',
  'settings': 'System & Master Tables',
  'system-integrity': 'Data Integrity & Sync'
};

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [navHistory, setNavHistory] = useState<NavTab[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { payables, complianceItems, tasks, invoices, addAuditLog } = useData();
  const { currentUser, isSuperAdmin } = useAuth();

  const handleTabChange = (nextTab: NavTab) => {
    if (nextTab !== activeTab) {
      setNavHistory(prev => [...prev, activeTab]);
      setActiveTab(nextTab);
    }
  };

  const handleReturnPrevious = () => {
    if (navHistory.length > 0) {
      const prevTab = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, -1));
      setActiveTab(prevTab);
    }
  };

  if (!currentUser) {
    return <LoginView />;
  }

  const unpaidPayablesCount = payables.filter(p => p.status === 'Unpaid').length;
  const pendingComplianceCount = complianceItems.filter(c => c.status === 'Pending' || c.status === 'Due Today').length;
  const previousTab = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-800 font-sans flex flex-col antialiased">
      {/* Top Header Navbar */}
      <Navbar 
        onSearchQuery={setGlobalSearch} 
        onToggleMobileMenu={() => setMobileNavOpen(!mobileNavOpen)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Desktop & Mobile Drawer) */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          unpaidPayablesCount={unpaidPayablesCount}
          pendingComplianceCount={pendingComplianceCount}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
          {/* Quick Return to Previous Core Navigation Banner */}
          {previousTab && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs">
              <button
                type="button"
                onClick={handleReturnPrevious}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors group cursor-pointer"
                title={`Return to ${TAB_LABELS[previousTab]}`}
              >
                <span className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-600 group-hover:text-slate-900 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </span>
                <span>
                  Return to <strong className="text-slate-900 underline decoration-slate-300 underline-offset-2">{TAB_LABELS[previousTab]}</strong>
                </span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <span>Current View:</span>
                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{TAB_LABELS[activeTab]}</span>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView onNavigate={handleTabChange} />
          )}

          {activeTab === 'executive-bi' && (
            <ExecutiveBiView onNavigate={handleTabChange} />
          )}

          {activeTab === 'my-clients' && (
            <MyClientsView 
              onSelectClientWorkspace={(clientId) => {
                setSelectedClientId(clientId);
                handleTabChange('workspaces');
              }} 
            />
          )}

          {activeTab === 'clients' && (
            <ClientManagementView 
              onSelectClientWorkspace={(clientId) => {
                setSelectedClientId(clientId);
                handleTabChange('workspaces');
              }} 
            />
          )}

          {activeTab === 'workspaces' && (
            <ClientWorkspaceView 
              selectedClientId={selectedClientId} 
              onSelectClient={setSelectedClientId} 
            />
          )}

          {activeTab === 'dynamic-builder' && (
            <DynamicInfoBuilderView />
          )}

          {activeTab === 'payables' && (
            <PayablesManagementView />
          )}

          {activeTab === 'compliance' && (
            <ComplianceMonitoringView 
              onNavigate={handleTabChange}
              onReturnPrevious={previousTab ? handleReturnPrevious : undefined}
              previousTabName={previousTab ? TAB_LABELS[previousTab] : undefined}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView />
          )}

          {/* Task & Workflow View */}
          {activeTab === 'tasks' && (
            <TaskWorkflowView 
              onNavigateToClient={(clientId) => {
                setSelectedClientId(clientId);
                handleTabChange('workspaces');
              }} 
            />
          )}

          {/* Document Management & Record Archiving View */}
          {activeTab === 'documents' && (
            <DocumentLibraryView 
              onNavigateToClient={(clientId) => {
                setSelectedClientId(clientId);
                handleTabChange('workspaces');
              }}
              onNavigate={handleTabChange}
              onReturnPrevious={previousTab ? handleReturnPrevious : undefined}
              previousTabName={previousTab ? TAB_LABELS[previousTab] : undefined}
            />
          )}

          {/* Billing & Invoices View */}
          {activeTab === 'billing' && (
            <BillingManagementView 
              onNavigateToClient={(clientId) => {
                setSelectedClientId(clientId);
                handleTabChange('workspaces');
              }} 
            />
          )}

          {/* Internal Company Payroll & HR View */}
          {activeTab === 'payroll' && (
            <CompanyPayrollView />
          )}

          {/* Company Operating Expenses & Bills View */}
          {activeTab === 'company-expenses' && (
            <CompanyExpensesView />
          )}

          {/* Confidential Core Credentials Vault */}
          {activeTab === 'credentials' && (
            <CoreCredentialsView />
          )}

          {/* Settings & Master Tables View */}
          {activeTab === 'settings' && (
            <MasterTablesView />
          )}

          {/* System Health, Integrity, Sync & Backup View */}
          {activeTab === 'system-integrity' && (
            <DataIntegrityBackupView />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainAppContent />
      </DataProvider>
    </AuthProvider>
  );
}

