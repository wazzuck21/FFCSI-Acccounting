import React from 'react';
import { BiFilterContext, DatePreset, getDateRangeForPreset } from '../../lib/biEngine';
import { 
  Calendar, 
  Filter, 
  RotateCcw, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Building2, 
  User, 
  Briefcase, 
  MapPin, 
  CheckCircle2 
} from 'lucide-react';

interface BiFilterBarProps {
  filters: BiFilterContext;
  onFilterChange: (newFilters: BiFilterContext) => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  clientsList: { id: string; companyName: string }[];
  staffList: { id: string; fullName: string }[];
  rdoList: string[];
  serviceCategoryList: string[];
  canExport?: boolean;
}

export const BiFilterBar: React.FC<BiFilterBarProps> = ({
  filters,
  onFilterChange,
  onExportExcel,
  onExportCsv,
  onExportPdf,
  clientsList,
  staffList,
  rdoList,
  serviceCategoryList,
  canExport = true
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  const handlePresetClick = (preset: DatePreset) => {
    const range = getDateRangeForPreset(preset);
    onFilterChange({
      ...filters,
      datePreset: preset,
      startDate: range.startDate,
      endDate: range.endDate
    });
  };

  const handleReset = () => {
    const range = getDateRangeForPreset('THIS_MONTH');
    onFilterChange({
      datePreset: 'THIS_MONTH',
      startDate: range.startDate,
      endDate: range.endDate,
      clientId: 'ALL',
      staffId: 'ALL',
      serviceCategory: 'ALL',
      serviceCode: 'ALL',
      rdoCode: 'ALL',
      status: 'ALL'
    });
  };

  const isCustomOrActive = filters.clientId !== 'ALL' || filters.staffId !== 'ALL' || filters.serviceCategory !== 'ALL' || filters.rdoCode !== 'ALL' || filters.status !== 'ALL' || filters.datePreset !== 'THIS_MONTH';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
      {/* Top Row: Date Presets & Export Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        
        {/* Date Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs font-semibold">
          <span className="text-slate-400 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" /> Date:
          </span>
          {(['THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'LAST_30_DAYS', 'ALL'] as DatePreset[]).map((preset) => {
            const labels: Record<DatePreset, string> = {
              THIS_MONTH: 'This Month',
              THIS_QUARTER: 'This Quarter',
              THIS_YEAR: 'This Year',
              LAST_30_DAYS: 'Last 30 Days',
              ALL: 'All Time',
              CUSTOM: 'Custom'
            };
            const active = filters.datePreset === preset;
            return (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  active
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        {/* Custom Date Pickers & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ ...filters, datePreset: 'CUSTOM', startDate: e.target.value })}
              className="bg-transparent border-0 focus:outline-none font-medium text-slate-800"
            />
            <span className="text-slate-300">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ ...filters, datePreset: 'CUSTOM', endDate: e.target.value })}
              className="bg-transparent border-0 focus:outline-none font-medium text-slate-800"
            />
          </div>

          {/* Reset Filters */}
          {isCustomOrActive && (
            <button
              onClick={handleReset}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Export Dropdown */}
          {canExport && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Export BI Report
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1 divide-y divide-slate-100 text-xs">
                  <button
                    onClick={() => { setShowExportMenu(false); onExportExcel(); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-slate-700 font-medium"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Spreadsheet (.xlsx)
                  </button>
                  <button
                    onClick={() => { setShowExportMenu(false); onExportCsv(); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-slate-700 font-medium"
                  >
                    <FileText className="w-4 h-4 text-blue-600" /> CSV Data File (.csv)
                  </button>
                  <button
                    onClick={() => { setShowExportMenu(false); onExportPdf(); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-slate-700 font-medium"
                  >
                    <FileText className="w-4 h-4 text-rose-600" /> Formatted PDF Report (.pdf)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Row: Filter Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        
        {/* Client Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Client
          </label>
          <select
            value={filters.clientId}
            onChange={(e) => onFilterChange({ ...filters, clientId: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Clients</option>
            {clientsList.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>

        {/* Staff Officer Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <User className="w-3 h-3" /> Staff Officer
          </label>
          <select
            value={filters.staffId}
            onChange={(e) => onFilterChange({ ...filters, staffId: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Staff</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.fullName}>{s.fullName}</option>
            ))}
          </select>
        </div>

        {/* Service Category */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Category
          </label>
          <select
            value={filters.serviceCategory}
            onChange={(e) => onFilterChange({ ...filters, serviceCategory: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Categories</option>
            <option value="BIR">BIR Tax Services</option>
            <option value="Benefits">Benefits & HR</option>
            <option value="Accounting">Accounting & Bookkeeping</option>
            <option value="Audit">Audit</option>
            <option value="Payroll">Payroll</option>
            <option value="SEC">SEC / Legal</option>
            <option value="Consulting">Consulting</option>
          </select>
        </div>

        {/* RDO Code */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> BIR RDO
          </label>
          <select
            value={filters.rdoCode}
            onChange={(e) => onFilterChange({ ...filters, rdoCode: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All RDOs</option>
            {rdoList.map((rdo) => (
              <option key={rdo} value={rdo}>RDO {rdo}</option>
            ))}
          </select>
        </div>

        {/* Client Status */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="For Compliance">For Compliance</option>
            <option value="Inactive">Inactive</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {/* Active Filters Tag */}
        <div className="flex items-end">
          <div className="w-full bg-blue-50 border border-blue-200/60 rounded-xl px-2.5 py-1.5 text-[11px] text-blue-800 font-medium flex items-center justify-between truncate">
            <span className="truncate">
              {filters.clientId !== 'ALL' ? 'Filtered Client' : 'Global Scope'}
            </span>
            <Filter className="w-3 h-3 text-blue-600 shrink-0 ml-1" />
          </div>
        </div>

      </div>
    </div>
  );
};
