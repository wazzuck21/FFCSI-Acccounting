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

          {/* Document Library View */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <FolderGit2 className="w-5 h-5 text-blue-600" />
                    Firm Document Repository & Archival
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Store BIR 2307 certificates, SEC articles, Mayor's permits, and audited financial statements.
                  </p>
                </div>
                <button 
                  onClick={() => alert('Document Upload')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload Document
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: 'Tax Returns & Filing Receipts', count: '142 Files', color: 'text-blue-600' },
                  { title: 'Corporate SEC & DTI Reg', count: '58 Files', color: 'text-indigo-600' },
                  { title: 'BIR Form 2307 Credentials', count: '210 Files', color: 'text-emerald-600' },
                  { title: 'Audited Financial Statements', count: '34 Files', color: 'text-amber-600' },
                ].map((cat, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 cursor-pointer">
                    <FolderGit2 className={`w-8 h-8 ${cat.color} mb-2`} />
                    <h4 className="font-bold text-slate-800 text-xs">{cat.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{cat.count}</p>
                  </div>
                ))}
              </div>
            </div>
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

