import React from 'react';
import { BiFullState, BiFilterContext, TrendGranularity, generateTrendData } from '../../lib/biEngine';
import { TrendingUp, BarChart2, Calendar, CheckCircle2 } from 'lucide-react';

interface BiTrendChartsProps {
  state: BiFullState;
  filters: BiFilterContext;
}

export const BiTrendCharts: React.FC<BiTrendChartsProps> = ({ state, filters }) => {
  const [granularity, setGranularity] = React.useState<TrendGranularity>('MONTHLY');
  const [activeMetric, setActiveMetric] = React.useState<'revenue' | 'collections' | 'newClients' | 'completedTasks'>('revenue');

  const trendData = React.useMemo(() => {
    return generateTrendData(state, filters, granularity);
  }, [state, filters, granularity]);

  const maxVal = React.useMemo(() => {
    if (trendData.length === 0) return 1;
    const vals = trendData.map(d => d[activeMetric]);
    return Math.max(...vals, 1);
  }, [trendData, activeMetric]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Financial & Operational Multi-Period Trends
          </h3>
          <p className="text-xs text-slate-500">Historical performance metrics grouped chronologically</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Granularity Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['DAILY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'] as TrendGranularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                  granularity === g ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Metric Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveMetric('revenue')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                activeMetric === 'revenue' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setActiveMetric('collections')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                activeMetric === 'collections' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Collections
            </button>
            <button
              onClick={() => setActiveMetric('newClients')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                activeMetric === 'newClients' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Clients
            </button>
            <button
              onClick={() => setActiveMetric('completedTasks')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                activeMetric === 'completedTasks' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tasks
            </button>
          </div>
        </div>
      </div>

      {/* SVG Interactive Trend Visualizer */}
      {trendData.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No trend records found for the selected filter range.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-200">
            {trendData.map((d, idx) => {
              const val = d[activeMetric];
              const pct = Math.max(Math.round((val / maxVal) * 100), 4);
              const isMoney = activeMetric === 'revenue' || activeMetric === 'collections';

              const colorClass = 
                activeMetric === 'revenue' ? 'bg-emerald-500 hover:bg-emerald-400' :
                activeMetric === 'collections' ? 'bg-blue-500 hover:bg-blue-400' :
                activeMetric === 'newClients' ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-amber-500 hover:bg-amber-400';

              return (
                <div key={d.periodKey} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  
                  {/* Tooltip */}
                  <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg z-20 whitespace-nowrap shadow-md pointer-events-none">
                    <span className="font-bold">{d.label}</span>
                    <span className="text-emerald-400">
                      {isMoney ? `₱${val.toLocaleString()}` : `${val} items`}
                    </span>
                  </div>

                  {/* Value Label above Bar */}
                  <span className="text-[9px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isMoney ? `₱${Math.round(val / 1000)}k` : val}
                  </span>

                  {/* Bar */}
                  <div 
                    style={{ height: `${pct}%` }} 
                    className={`w-full rounded-t-lg transition-all duration-300 ${colorClass}`}
                  />
                  
                  {/* X-Axis Label */}
                  <span className="text-[10px] font-mono text-slate-500 mt-2 truncate max-w-[60px]">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 px-2 font-medium">
            <span>Period Start: {trendData[0]?.label}</span>
            <span>Period End: {trendData[trendData.length - 1]?.label}</span>
          </div>
        </div>
      )}

    </div>
  );
};
