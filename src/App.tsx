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
  Menu
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { payables, complianceItems, tasks, invoices, addAuditLog } = useData();
  const { currentUser, isSuperAdmin } = useAuth();

  if (!currentUser) {
    return <LoginView />;
  }

  const unpaidPayablesCount = payables.filter(p => p.status === 'Unpaid').length;
  const pendingComplianceCount = complianceItems.filter(c => c.status === 'Pending' || c.status === 'Due Today').length;

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
          onTabChange={(tab) => {
            setActiveTab(tab);
          }}
          unpaidPayablesCount={unpaidPayablesCount}
          pendingComplianceCount={pendingComplianceCount}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView onNavigate={setActiveTab} />
          )}

          {activeTab === 'executive-bi' && (
            <ExecutiveBiView onNavigate={setActiveTab} />
          )}

          {activeTab === 'my-clients' && (
            <MyClientsView 
              onSelectClientWorkspace={(clientId) => {
                setSelectedClientId(clientId);
                setActiveTab('workspaces');
              }} 
            />
          )}

          {activeTab === 'clients' && (
            <ClientManagementView 
              onSelectClientWorkspace={(clientId) => {
                setSelectedClientId(clientId);
                setActiveTab('workspaces');
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
            <ComplianceMonitoringView />
          )}

          {activeTab === 'users' && (
            <UserManagementView />
          )}

          {/* Task & Workflow View */}
          {activeTab === 'tasks' && (
            <TaskWorkflowView 
              onNavigateToClient={(clientId) => {
                setSelectedClientId(clientId);
                setActiveTab('workspaces');
              }} 
            />
          )}

          {/* Document Management & Record Archiving View */}
          {activeTab === 'documents' && (
            <DocumentLibraryView 
              onNavigateToClient={(clientId) => {
                setSelectedClientId(clientId);
                setActiveTab('workspaces');
              }} 
            />
          )}

          {/* Billing & Invoices View */}
          {activeTab === 'billing' && (
            <BillingManagementView 
              onNavigateToClient={(clientId) => {
                setSelectedClientId(clientId);
                setActiveTab('workspaces');
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

