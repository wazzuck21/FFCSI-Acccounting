import React from 'react';
import { calculateBiMetrics } from '../../lib/biEngine';
import { 
  Building2, 
  DollarSign, 
  Receipt, 
  Wallet, 
  ShieldCheck, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle,
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';

interface BiExecutiveMetricsCardsProps {
  metrics: ReturnType<typeof calculateBiMetrics>;
  onNavigateTab?: (tab: string) => void;
}

export const BiExecutiveMetricsCards: React.FC<BiExecutiveMetricsCardsProps> = ({ metrics, onNavigateTab }) => {
  const { clientAnalytics, revenueAnalytics, arAging, collectionsAnalytics, compliancePerformance, serviceProfitability } = metrics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      
      {/* 1. Client Analytics Card */}
      <div 
        onClick={() => onNavigateTab && onNavigateTab('clients')}
        className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-center text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Clients Portfolio</span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">{clientAnalytics.totalClients}</div>
        <div className="mt-2 text-[11px] space-y-1">
          <div className="flex justify-between font-semibold">
            <span className="text-emerald-600">{clientAnalytics.activeCount} Active</span>
            <span className="text-amber-600">{clientAnalytics.forComplianceCount} Compliance</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>+{clientAnalytics.newClientsCount} New Onboarded</span>
            <span>{clientAnalytics.archivedCount} Archived</span>
          </div>
        </div>
      </div>

      {/* 2. Revenue Analytics Card */}
      <div 
        onClick={() => onNavigateTab && onNavigateTab('billing')}
        className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-center text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Period Revenue</span>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">
          ₱{revenueAnalytics.periodRevenue.toLocaleString()}
        </div>
        <div className="mt-2 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-1 font-bold text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>MRR: ₱{serviceProfitability.monthlyRecurringRevenue.toLocaleString()}</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            revenueAnalytics.growthRatePercentage >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            {revenueAnalytics.growthRatePercentage >= 0 ? '+' : ''}{revenueAnalytics.growthRatePercentage}%
          </span>
        </div>
      </div>

      {/* 3. Accounts Receivable Card */}
      <div 
        onClick={() => onNavigateTab && onNavigateTab('billing')}
        className="bg-white border border-slate-200 hover:border-rose-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-center text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding AR</span>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-rose-600">
          ₱{arAging.totalOutstanding.toLocaleString()}
        </div>
        <div className="mt-2 text-[11px] flex items-center justify-between font-semibold">
          <span className="text-rose-700">₱{arAging.over90.toLocaleString()} &gt;90d Overdue</span>
          <span className="text-slate-500">{arAging.overdueAccountsCount} Accounts</span>
        </div>
      </div>

      {/* 4. Collection Performance Card */}
      <div 
        onClick={() => onNavigateTab && onNavigateTab('billing')}
        className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-center text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Collection Rate</span>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">
          {arAging.collectionRatePercentage}%
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex justify-between font-medium">
          <span>Collected: ₱{collectionsAnalytics.totalCollectedInPeriod.toLocaleString()}</span>
          <span className="text-indigo-600 font-bold">{collectionsAnalytics.promiseToPayCount} Promised</span>
        </div>
      </div>

      {/* 5. Compliance Completion Card */}
      <div 
        onClick={() => onNavigateTab && onNavigateTab('compliance')}
        className="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-center text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Compliance Rate</span>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">
          {compliancePerformance.completionRatePercentage}%
        </div>
        <div className="mt-2 text-[11px] flex justify-between font-semibold">
          <span className="text-amber-700">{compliancePerformance.tasksDueToday} Due Today</span>
          <span className="text-rose-600">{compliancePerformance.tasksOverdue} Overdue</span>
        </div>
      </div>

    </div>
  );
};
