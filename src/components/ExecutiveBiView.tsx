import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  BiFilterContext, 
  BiFullState, 
  calculateBiMetrics, 
  getDateRangeForPreset, 
  generateManagementAlerts 
} from '../lib/biEngine';
import { 
  exportExecutiveReportToExcel, 
  exportExecutiveReportToCsv, 
  exportExecutiveReportToPdf, 
  ReportExportMetadata 
} from '../lib/biExporter';
import { BiFilterBar } from './bi/BiFilterBar';
import { BiExecutiveMetricsCards } from './bi/BiExecutiveMetricsCards';
import { BiRevenueAnalytics } from './bi/BiRevenueAnalytics';
import { BiArAgingSection } from './bi/BiArAgingSection';
import { BiComplianceSection } from './bi/BiComplianceSection';
import { BiTrendCharts } from './bi/BiTrendCharts';
import { BiManagementAlerts } from './bi/BiManagementAlerts';
import { Client360Modal } from './bi/Client360Modal';

import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Receipt, 
  ShieldCheck, 
  AlertOctagon, 
  Building2, 
  Sparkles, 
  Lock,
  Download,
  CheckCircle2
} from 'lucide-react';

export const ExecutiveBiView: React.FC<{ onNavigate?: (tab: any) => void }> = ({ onNavigate }) => {
  const { 
    clients, 
    clientServices, 
    invoices, 
    payments, 
    complianceItems, 
    tasks, 
    documents, 
    payables, 
    collectionLogs, 
    companyExpenses, 
    employees,
    syncStatus 
  } = useData();

  const { currentUser, isSuperAdmin, hasPermission } = useAuth();

  // Active Tab View
  const [activeTab, setActiveTab] = React.useState<'OVERVIEW' | 'REVENUE' | 'AR_COLLECTIONS' | 'COMPLIANCE_STAFF' | 'TRENDS' | 'ALERTS'>('OVERVIEW');

  // Selected Client for 360 View
  const [selectedClient360Id, setSelectedClient360Id] = React.useState<string | null>(null);

  // Filter State
  const defaultRange = getDateRangeForPreset('THIS_MONTH');
  const [filters, setFilters] = React.useState<BiFilterContext>({
    datePreset: 'THIS_MONTH',
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    clientId: 'ALL',
    staffId: 'ALL',
    serviceCategory: 'ALL',
    serviceCode: 'ALL',
    rdoCode: 'ALL',
    status: 'ALL'
  });

  // RBAC Permission Check
  const canViewReports = isSuperAdmin || hasPermission('reports') || hasPermission('dashboard');
  if (!canViewReports) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm my-12">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Executive BI Access Restricted</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your account role does not have authorization to view financial analytics, revenue performance, or executive business intelligence reports. Please contact a Super Administrator.
        </p>
      </div>
    );
  }

  // Full state object
  const fullState: BiFullState = React.useMemo(() => ({
    clients,
    clientServices,
    invoices,
    payments,
    complianceItems,
    tasks,
    documents,
    payables,
    collectionLogs,
    companyExpenses,
    employees,
    syncStatus
  }), [clients, clientServices, invoices, payments, complianceItems, tasks, documents, payables, collectionLogs, companyExpenses, employees, syncStatus]);

  // Compute Metrics memoized
  const metrics = React.useMemo(() => {
    return calculateBiMetrics(fullState, filters);
  }, [fullState, filters]);

  // Compute Intelligent Management Alerts
  const alerts = React.useMemo(() => {
    return generateManagementAlerts(fullState, metrics);
  }, [fullState, metrics]);

  // Master lists for filters
  const clientsList = React.useMemo(() => clients.map(c => ({ id: c.id, companyName: c.companyName })), [clients]);
  const staffList = React.useMemo(() => employees.map(e => ({ id: e.id, fullName: e.fullName })), [employees]);
  const rdoList = React.useMemo(() => Array.from(new Set(clients.map(c => c.rdoNumber).filter(Boolean))), [clients]);
  const serviceCategoryList = React.useMemo(() => ['BIR', 'Benefits', 'Accounting', 'Audit', 'Payroll', 'SEC', 'Consulting'], []);

  // Export handlers
  const metadata: ReportExportMetadata = {
    title: 'Executive Management & Business Intelligence Report',
    generatedBy: currentUser?.fullName || 'Super Admin',
    generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    filters
  };

  const handleExportExcel = () => exportExecutiveReportToExcel(metrics, metadata);
  const handleExportCsv = () => exportExecutiveReportToCsv(metrics, metadata);
  const handleExportPdf = () => exportExecutiveReportToPdf(metrics, metadata);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Executive BI & Business Intelligence
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Phase 10 Intelligence Layer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative financial analytics, Accounts Receivable aging schedules, staff capacity metrics, and statutory compliance indicators.
          </p>
        </div>

        {/* Global Filter Summary */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
            {metrics.clientAnalytics.activeCount} Active Clients
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold">
            ₱{metrics.revenueAnalytics.periodRevenue.toLocaleString()} Revenue
          </div>
        </div>
      </div>

      {/* Global Dashboard Filter Bar */}
      <BiFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        clientsList={clientsList}
        staffList={staffList}
        rdoList={rdoList}
        serviceCategoryList={serviceCategoryList}
        canExport={isSuperAdmin || hasPermission('reports')}
      />

      {/* Top Executive KPI Cards */}
      <BiExecutiveMetricsCards metrics={metrics} onNavigateTab={onNavigate} />

      {/* BI Section Navigation Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'OVERVIEW' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Overview Dashboard
        </button>

        <button
          onClick={() => setActiveTab('REVENUE')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'REVENUE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Revenue & Profitability
        </button>

        <button
          onClick={() => setActiveTab('AR_COLLECTIONS')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'AR_COLLECTIONS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" /> AR & Collections
        </button>

        <button
          onClick={() => setActiveTab('COMPLIANCE_STAFF')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'COMPLIANCE_STAFF' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Compliance & Productivity
        </button>

        <button
          onClick={() => setActiveTab('TRENDS')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'TRENDS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <PieChart className="w-4 h-4" /> Financial Trends
        </button>

        <button
          onClick={() => setActiveTab('ALERTS')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ALERTS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-rose-400" /> Alerts ({alerts.length})
        </button>
      </div>

      {/* Main View Content Tab Rendering */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <BiManagementAlerts alerts={alerts.slice(0, 4)} onNavigateTab={onNavigate} />
          <BiTrendCharts state={fullState} filters={filters} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BiRevenueAnalytics revenueData={metrics.revenueAnalytics} profitabilityData={metrics.serviceProfitability} />
            <BiArAgingSection arData={metrics.arAging} collectionsData={metrics.collectionsAnalytics} onSelectClient360={setSelectedClient360Id} />
          </div>
        </div>
      )}

      {activeTab === 'REVENUE' && (
        <BiRevenueAnalytics revenueData={metrics.revenueAnalytics} profitabilityData={metrics.serviceProfitability} />
      )}

      {activeTab === 'AR_COLLECTIONS' && (
        <BiArAgingSection arData={metrics.arAging} collectionsData={metrics.collectionsAnalytics} onSelectClient360={setSelectedClient360Id} />
      )}

      {activeTab === 'COMPLIANCE_STAFF' && (
        <BiComplianceSection complianceData={metrics.compliancePerformance} staffData={metrics.staffProductivity} />
      )}

      {activeTab === 'TRENDS' && (
        <BiTrendCharts state={fullState} filters={filters} />
      )}

      {activeTab === 'ALERTS' && (
        <BiManagementAlerts alerts={alerts} onNavigateTab={onNavigate} />
      )}

      {/* Client 360 Slide-Over Modal */}
      {selectedClient360Id && (
        <Client360Modal
          clientId={selectedClient360Id}
          state={fullState}
          onClose={() => setSelectedClient360Id(null)}
        />
      )}

    </div>
  );
};
