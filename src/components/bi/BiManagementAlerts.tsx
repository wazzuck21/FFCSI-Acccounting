import React from 'react';
import { ManagementAlert, AlertSeverity } from '../../lib/biEngine';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react';

interface BiManagementAlertsProps {
  alerts: ManagementAlert[];
  onNavigateTab?: (tab: string) => void;
}

export const BiManagementAlerts: React.FC<BiManagementAlertsProps> = ({ alerts, onNavigateTab }) => {
  const [selectedSeverity, setSelectedSeverity] = React.useState<AlertSeverity | 'ALL'>('ALL');

  const filteredAlerts = alerts.filter(a => selectedSeverity === 'ALL' || a.severity === selectedSeverity);

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.severity === 'WARNING').length;
  const attentionCount = alerts.filter(a => a.severity === 'ATTENTION').length;
  const healthyCount = alerts.filter(a => a.severity === 'HEALTHY').length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      
      {/* Header & Severity Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            Executive Management & Operational Risk Feeds
          </h3>
          <p className="text-xs text-slate-500">Automated multi-system health alerts, capacity limits, and compliance warnings</p>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setSelectedSeverity('ALL')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              selectedSeverity === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('CRITICAL')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
              selectedSeverity === 'CRITICAL' ? 'bg-rose-600 text-white font-bold' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            🔴 Critical ({criticalCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('WARNING')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
              selectedSeverity === 'WARNING' ? 'bg-amber-600 text-white font-bold' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            🟠 Warning ({warningCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('ATTENTION')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
              selectedSeverity === 'ATTENTION' ? 'bg-blue-600 text-white font-bold' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            🟡 Attention ({attentionCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('HEALTHY')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
              selectedSeverity === 'HEALTHY' ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            🟢 Healthy ({healthyCount})
          </button>
        </div>
      </div>

      {/* Alert Feed Cards */}
      {filteredAlerts.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No alerts found matching the selected severity level.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const severityStyles = {
              CRITICAL: 'bg-rose-50/70 border-rose-200 text-rose-950',
              WARNING: 'bg-amber-50/70 border-amber-200 text-amber-950',
              ATTENTION: 'bg-blue-50/70 border-blue-200 text-blue-950',
              HEALTHY: 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }[alert.severity];

            const badgeStyles = {
              CRITICAL: 'bg-rose-600 text-white',
              WARNING: 'bg-amber-600 text-white',
              ATTENTION: 'bg-blue-600 text-white',
              HEALTHY: 'bg-emerald-600 text-white'
            }[alert.severity];

            const Icon = alert.severity === 'CRITICAL' ? AlertOctagon :
                         alert.severity === 'WARNING' ? AlertTriangle :
                         alert.severity === 'ATTENTION' ? Info : CheckCircle2;

            return (
              <div 
                key={alert.id} 
                className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${severityStyles}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${badgeStyles}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{alert.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-white border border-slate-200 text-slate-700">
                        {alert.category}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{alert.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {alert.metricValue && (
                    <span className="font-mono font-bold text-slate-800 bg-white/80 px-2.5 py-1 rounded-xl border border-slate-200/80">
                      {alert.metricValue}
                    </span>
                  )}

                  {alert.targetTab && onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab(alert.targetTab!)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      Resolve <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
