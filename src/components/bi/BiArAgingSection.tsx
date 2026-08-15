import React from 'react';
import { ArAgingData, CollectionsAnalyticsData } from '../../lib/biEngine';
import { Receipt, AlertTriangle, Clock, ShieldAlert, CheckCircle2, PhoneCall, Wallet, CreditCard } from 'lucide-react';

interface BiArAgingSectionProps {
  arData: ArAgingData;
  collectionsData: CollectionsAnalyticsData;
  onSelectClient360?: (clientId: string) => void;
}

export const BiArAgingSection: React.FC<BiArAgingSectionProps> = ({ arData, collectionsData, onSelectClient360 }) => {
  const totAr = Math.max(arData.totalOutstanding, 1);

  const getPercent = (amt: number) => Math.round((amt / totAr) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* AR Aging Buckets & Distribution (2 Columns) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* AR Aging Breakdown Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-600" />
                Accounts Receivable Aging Distribution
              </h3>
              <p className="text-xs text-slate-500">Aging schedule categorized by invoice due date thresholds</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Collection Rate:</span>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {arData.collectionRatePercentage}%
              </span>
            </div>
          </div>

          {/* Aging Stacked Bar */}
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div style={{ width: `${getPercent(arData.current)}%` }} className="bg-emerald-500 h-full" title={`Current: ₱${arData.current.toLocaleString()}`} />
            <div style={{ width: `${getPercent(arData.days1to30)}%` }} className="bg-amber-400 h-full" title={`1-30 Days: ₱${arData.days1to30.toLocaleString()}`} />
            <div style={{ width: `${getPercent(arData.days31to60)}%` }} className="bg-amber-600 h-full" title={`31-60 Days: ₱${arData.days31to60.toLocaleString()}`} />
            <div style={{ width: `${getPercent(arData.days61to90)}%` }} className="bg-rose-500 h-full" title={`61-90 Days: ₱${arData.days61to90.toLocaleString()}`} />
            <div style={{ width: `${getPercent(arData.over90)}%` }} className="bg-rose-700 h-full" title={`>90 Days: ₱${arData.over90.toLocaleString()}`} />
          </div>

          {/* Aging Grid Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
              <p className="text-[10px] font-bold text-emerald-800 uppercase">Current (Not Overdue)</p>
              <p className="text-sm font-extrabold text-emerald-950 mt-1">₱{arData.current.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">{getPercent(arData.current)}% of AR</p>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl">
              <p className="text-[10px] font-bold text-amber-800 uppercase">1 – 30 Days</p>
              <p className="text-sm font-extrabold text-amber-950 mt-1">₱{arData.days1to30.toLocaleString()}</p>
              <p className="text-[10px] text-amber-700 mt-0.5">{getPercent(arData.days1to30)}% of AR</p>
            </div>

            <div className="p-3 bg-orange-50/60 border border-orange-200/60 rounded-xl">
              <p className="text-[10px] font-bold text-orange-800 uppercase">31 – 60 Days</p>
              <p className="text-sm font-extrabold text-orange-950 mt-1">₱{arData.days31to60.toLocaleString()}</p>
              <p className="text-[10px] text-orange-700 mt-0.5">{getPercent(arData.days31to60)}% of AR</p>
            </div>

            <div className="p-3 bg-rose-50/60 border border-rose-200/60 rounded-xl">
              <p className="text-[10px] font-bold text-rose-800 uppercase">61 – 90 Days</p>
              <p className="text-sm font-extrabold text-rose-950 mt-1">₱{arData.days61to90.toLocaleString()}</p>
              <p className="text-[10px] text-rose-700 mt-0.5">{getPercent(arData.days61to90)}% of AR</p>
            </div>

            <div className="p-3 bg-rose-100/80 border border-rose-300 rounded-xl">
              <p className="text-[10px] font-extrabold text-rose-900 uppercase flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-600" /> &gt;90 Days Overdue
              </p>
              <p className="text-sm font-black text-rose-950 mt-1">₱{arData.over90.toLocaleString()}</p>
              <p className="text-[10px] text-rose-800 font-bold mt-0.5">{getPercent(arData.over90)}% Critical</p>
            </div>
          </div>
        </div>

        {/* Top Outstanding Clients Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Top Outstanding Client Accounts
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                  <th className="py-2.5 px-3">Client Company</th>
                  <th className="py-2.5 px-3 text-center">Unpaid Invoices</th>
                  <th className="py-2.5 px-3 text-center">Oldest Due Date</th>
                  <th className="py-2.5 px-3 text-center">Days Overdue</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {arData.topOutstandingClients.map((c) => (
                  <tr key={c.clientId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{c.clientName}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{c.overdueInvoicesCount}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{c.oldestDueDate}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.daysOverdue > 90 ? 'bg-rose-100 text-rose-800' : c.daysOverdue > 30 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.daysOverdue} days
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                      ₱{c.totalOutstanding.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {onSelectClient360 && (
                        <button
                          onClick={() => onSelectClient360(c.clientId)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] transition-colors"
                        >
                          Client 360
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right Column: Payment Methods & Collection Logs */}
      <div className="space-y-6">
        
        {/* Payment Methods Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            Payment Methods Distribution
          </h3>

          <div className="space-y-2.5">
            {collectionsData.paymentMethodsBreakdown.map((m) => (
              <div key={m.method} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{m.method} ({m.count} tx)</span>
                  <span className="font-mono text-emerald-600">₱{m.amount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: `${m.percentage}%` }} className="bg-emerald-500 h-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collection Follow-Up Logs & Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-indigo-600" />
            Collection Interaction Logs
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
              <p className="text-[10px] font-bold text-indigo-800 uppercase">Promise To Pay</p>
              <p className="text-lg font-black text-indigo-950 mt-0.5">{collectionsData.promiseToPayCount}</p>
            </div>
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <p className="text-[10px] font-bold text-rose-800 uppercase">Disputed Accounts</p>
              <p className="text-lg font-black text-rose-950 mt-0.5">{collectionsData.disputedAccountsCount}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {collectionsData.recentCollectionLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span className="truncate">{log.status}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{log.logDate.substring(0, 10)}</span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">{log.notes}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
