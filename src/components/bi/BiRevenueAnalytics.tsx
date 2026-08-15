import React from 'react';
import { RevenueAnalyticsData, ServiceProfitabilityData } from '../../lib/biEngine';
import { DollarSign, TrendingUp, Layers, CheckCircle2, ArrowUpRight, BarChart2 } from 'lucide-react';

interface BiRevenueAnalyticsProps {
  revenueData: RevenueAnalyticsData;
  profitabilityData: ServiceProfitabilityData;
}

export const BiRevenueAnalytics: React.FC<BiRevenueAnalyticsProps> = ({ revenueData, profitabilityData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Revenue Performance & MRR Box (2 Columns) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Revenue Milestones Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue</p>
            <p className="text-lg font-bold text-slate-900 mt-1">₱{revenueData.monthlyRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Current Calendar Month</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quarterly Revenue</p>
            <p className="text-lg font-bold text-slate-900 mt-1">₱{revenueData.quarterlyRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Current Quarter</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Revenue</p>
            <p className="text-lg font-bold text-slate-900 mt-1">₱{revenueData.annualRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Current Year</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recurring MRR</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">₱{profitabilityData.monthlyRecurringRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-700 font-semibold">Contract Retainers</p>
          </div>
        </div>

        {/* Recurring vs One-Time Revenue Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Revenue Composition & Contract Retention
              </h3>
              <p className="text-xs text-slate-500">Monthly recurring retainers vs one-time statutory/special project billings</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {revenueData.recurringPercentage}% Recurring
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${revenueData.recurringPercentage}%` }} 
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`Recurring: ₱${revenueData.recurringRevenue.toLocaleString()}`}
            />
            <div 
              style={{ width: `${revenueData.oneTimePercentage}%` }} 
              className="bg-blue-500 h-full transition-all duration-500"
              title={`One-Time: ₱${revenueData.oneTimeRevenue.toLocaleString()}`}
            />
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
              <span className="font-bold text-emerald-800">Recurring Subscription Revenue</span>
              <p className="text-base font-extrabold text-emerald-900 mt-1">₱{revenueData.recurringRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">{revenueData.recurringPercentage}% of total billings</p>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl">
              <span className="font-bold text-blue-800">One-Time Project Revenue</span>
              <p className="text-base font-extrabold text-blue-900 mt-1">₱{revenueData.oneTimeRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">{revenueData.oneTimePercentage}% of total billings</p>
            </div>
          </div>
        </div>

        {/* Service Profitability & Revenue by Service */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Service Engagement Profitability & Volume
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                  <th className="py-2.5 px-3">Service Code / Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Subscribed Clients</th>
                  <th className="py-2.5 px-3 text-right">Avg Fee / Client</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profitabilityData.totalRevenueByService.map((s) => (
                  <tr key={s.serviceName} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{s.serviceName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{s.clientCount}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">₱{s.averageFee.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                      ₱{s.totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right Column: Top Clients & Highest/Lowest Services */}
      <div className="space-y-6">
        
        {/* Top Clients by Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            Top Clients by Revenue Contribution
          </h3>

          <div className="space-y-2.5">
            {revenueData.revenueByClient.slice(0, 6).map((c, idx) => (
              <div key={c.clientId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span className="truncate flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-black">
                      {idx + 1}
                    </span>
                    {c.clientName}
                  </span>
                  <span className="font-mono text-emerald-600">₱{c.revenue.toLocaleString()}</span>
                </div>
                {/* Mini Bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: `${Math.min(c.percentage * 3, 100)}%` }} className="bg-indigo-600 h-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highest vs Lowest Services */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600" />
            Top Revenue Drivers
          </h3>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Highest Performing</p>
            {profitabilityData.highestRevenueServices.map((s) => (
              <div key={s.serviceName} className="p-2.5 bg-emerald-50/60 border border-emerald-200/60 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-900 truncate">{s.serviceName}</span>
                <span className="font-mono font-bold text-emerald-700">₱{s.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
