import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Receipt, 
  Users, 
  DollarSign, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles,
  FileText,
  BarChart3
} from 'lucide-react';

export const DashboardView: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const { clients, payables, complianceItems, tasks, invoices, auditLogs } = useData();
  const { isSuperAdmin } = useAuth();

  // Metrics
  const activeDirectoryClients = clients.filter(c => c.status !== 'Archived');
  const totalClients = activeDirectoryClients.length;
  const activeClients = clients.filter(c => c.status === 'Active').length;
  const inactiveClients = clients.filter(c => c.status === 'Inactive').length;
  const forComplianceClients = clients.filter(c => c.status === 'For Compliance' || c.status === 'Compliance').length;
  const archivedClients = clients.filter(c => c.status === 'Archived').length;

  const unpaidPayables = payables.filter(p => p.status === 'Unpaid');
  const outstandingBillings = invoices
    .filter(i => i.status !== 'Paid')
    .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

  const pendingTasks = tasks.filter(t => t.status !== 'Completed').length;
  const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;

  const dueTodayCompliance = complianceItems.filter(c => c.status === 'Due Today' || c.status === 'Pending').length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Operations Dashboard
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live Firmware Sync
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time offline-first metrics, tax compliance deadlines, and financial assessments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('executive-bi')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <BarChart3 className="w-4 h-4 text-blue-400" /> Executive BI
          </button>
          <button
            onClick={() => onNavigate('payables')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <Receipt className="w-4 h-4" /> Manage Payables
          </button>
          <button
            onClick={() => onNavigate('dynamic-builder')}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs flex items-center gap-2 transition-all shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-amber-500" /> Dynamic Builder
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Total Clients */}
        <div 
          onClick={() => onNavigate('clients')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Clients</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalClients}</div>
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span className="text-emerald-600 font-bold">{activeClients} Active</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-600 font-bold">{forComplianceClients} Compliance</span>
          </div>
        </div>

        {/* Unpaid Payables */}
        <div 
          onClick={() => onNavigate('payables')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Unpaid Payables</span>
            <Receipt className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{unpaidPayables.length}</div>
          <p className="text-[11px] text-slate-500 mt-2">
            BIR & Benefits awaiting Super Admin validation
          </p>
        </div>

        {/* Outstanding Billings */}
        <div 
          onClick={() => onNavigate('billing')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Outstanding Billing</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            ₱{outstandingBillings.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Accounts Receivable</p>
        </div>

        {/* Tasks Due Today & Overdue */}
        <div 
          onClick={() => onNavigate('tasks')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Tasks</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{pendingTasks}</div>
          <p className="text-[11px] text-rose-600 mt-2 font-bold">
            {overdueTasks} Overdue Tasks
          </p>
        </div>

        {/* Upcoming Compliance Deadlines */}
        <div 
          onClick={() => onNavigate('compliance')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Compliance Items</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{dueTodayCompliance}</div>
          <p className="text-[11px] text-indigo-600 mt-2 font-bold">
            Pending Filings
          </p>
        </div>

      </div>

      {/* Main Grid Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Payables & Compliance Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Unpaid Payables Verification Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  Monthly Assessment Payables (BIR & Benefits)
                </h3>
                <p className="text-xs text-slate-500">
                  Assessments created by staff awaiting Super Admin payment verification.
                </p>
              </div>
              <button 
                onClick={() => onNavigate('payables')} 
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-right">Payable Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payables.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{p.clientName}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.category === 'BIR' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.itemName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        ₱{p.payableAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'Unpaid'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance Status Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Compliance Deadlines Monitor
              </h3>
              <button onClick={() => onNavigate('compliance')} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold">
                Manage Deadlines <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {complianceItems.map((comp) => (
                <div key={comp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{comp.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{comp.clientName} • Due: <span className="text-amber-700 font-bold">{comp.dueDate}</span></p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    comp.status === 'Already Paid'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : comp.status === 'Due Today'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {comp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Audit Logs & Workload */}
        <div className="space-y-6">
          
          {/* Quick Calendar & Deadlines */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-3">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              August 2026 Statutory Calendar
            </h3>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60">
                <div className="flex justify-between font-bold text-amber-800 text-[11px]">
                  <span>August 10</span>
                  <span>BIR 0619E & SSS Loan</span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">Monthly withholding tax remittance and SSS member loan amortizations.</p>
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/60">
                <div className="flex justify-between font-bold text-blue-800 text-[11px]">
                  <span>August 15</span>
                  <span>DTI Renewal & HDMF</span>
                </div>
                <p className="text-[11px] text-blue-700 mt-1">Pag-IBIG monthly savings and DTI certificate updates.</p>
              </div>

              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                <div className="flex justify-between font-bold text-emerald-800 text-[11px]">
                  <span>August 25 / 30</span>
                  <span>2550Q VAT & SSS Contrib</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">Quarterly VAT returns & SSS employer remittances.</p>
              </div>
            </div>
          </div>

          {/* Audit Logs Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-indigo-600" />
              System Activity & Audit Logs
            </h3>
            <div className="space-y-3">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs pb-2 border-b border-slate-100 last:border-0">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.substring(11, 16)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                  <p className="text-[10px] text-indigo-600 font-medium mt-0.5">By: {log.userName}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
