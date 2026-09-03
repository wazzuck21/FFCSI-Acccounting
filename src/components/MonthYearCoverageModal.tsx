import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Check, 
  CalendarRange, 
  Sparkles, 
  ArrowRight, 
  Coins, 
  Copy, 
  RotateCcw, 
  Divide 
} from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

export const MONTHS_LIST_CONFIG = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthYearCoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPeriod: string;
  selectedYear: string;
  selectedMonth: string;
  initialAmount?: number;
  initialMonthlyBreakdown?: Record<string, number>;
  onApply: (
    coverageText: string, 
    selectedMonthCodes: string[], 
    year: string,
    monthlyBreakdown?: Record<string, number>,
    totalAmount?: number
  ) => void;
}

type CoverageMode = 'range' | 'discrete' | 'quarterly' | 'annual' | 'custom_text';

export const MonthYearCoverageModal: React.FC<MonthYearCoverageModalProps> = ({
  isOpen,
  onClose,
  currentPeriod,
  selectedYear,
  selectedMonth,
  initialAmount,
  initialMonthlyBreakdown,
  onApply
}) => {
  const [activeTab, setActiveTab] = useState<CoverageMode>('range');
  const [year, setYear] = useState<string>(selectedYear || new Date().getFullYear().toString());
  
  // Multi-month range
  const [startMonth, setStartMonth] = useState<string>(selectedMonth || 'Jan');
  const [endMonth, setEndMonth] = useState<string>(selectedMonth || 'Dec');
  
  // Discrete individual months
  const [selectedMonths, setSelectedMonths] = useState<string[]>([selectedMonth || 'Jan']);
  
  // Quarterly
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  
  // Manual / Custom input
  const [customTextInput, setCustomTextInput] = useState<string>(currentPeriod || '');

  // Monthly amounts breakdown state (e.g. { 'Jan': 1000, 'Feb': 2000, 'Mar': 4000 })
  const [monthlyAmounts, setMonthlyAmounts] = useState<Record<string, number | string>>({});
  const [enableMonthlyAmounts, setEnableMonthlyAmounts] = useState<boolean>(false);

  useEffect(() => {
    if (selectedYear) setYear(selectedYear);
    if (selectedMonth) {
      setStartMonth(selectedMonth);
      setEndMonth(selectedMonth);
      setSelectedMonths([selectedMonth]);
    }
    if (initialMonthlyBreakdown && Object.keys(initialMonthlyBreakdown).length > 0) {
      setMonthlyAmounts({ ...initialMonthlyBreakdown });
      setEnableMonthlyAmounts(true);
    }
  }, [selectedYear, selectedMonth, initialMonthlyBreakdown]);

  if (!isOpen) return null;

  const currentYearNum = parseInt(year, 10) || new Date().getFullYear();
  const yearOptions = Array.from({ length: 9 }, (_, i) => (currentYearNum - 4 + i).toString());

  // Toggle individual month in discrete selector
  const toggleMonth = (m: string) => {
    if (selectedMonths.includes(m)) {
      if (selectedMonths.length > 1) {
        setSelectedMonths(selectedMonths.filter(x => x !== m));
      }
    } else {
      const newArr = [...selectedMonths, m].sort(
        (a, b) => MONTHS_LIST_CONFIG.indexOf(a) - MONTHS_LIST_CONFIG.indexOf(b)
      );
      setSelectedMonths(newArr);
    }
  };

  const selectAllMonths = () => {
    setSelectedMonths([...MONTHS_LIST_CONFIG]);
  };
  const selectFirstHalf = () => {
    setSelectedMonths(MONTHS_LIST_CONFIG.slice(0, 6));
  };
  const selectSecondHalf = () => {
    setSelectedMonths(MONTHS_LIST_CONFIG.slice(6, 12));
  };

  // Generate preview label & month codes based on current tab
  const getCoverageResult = (): { text: string; months: string[] } => {
    if (activeTab === 'range') {
      const sIdx = MONTHS_LIST_CONFIG.indexOf(startMonth);
      const eIdx = MONTHS_LIST_CONFIG.indexOf(endMonth);
      const minIdx = Math.min(sIdx, eIdx);
      const maxIdx = Math.max(sIdx, eIdx);
      const covered = MONTHS_LIST_CONFIG.slice(minIdx, maxIdx + 1);
      
      if (minIdx === maxIdx) {
        return {
          text: `${MONTHS_LIST_CONFIG[minIdx]} ${year}`,
          months: covered
        };
      }
      return {
        text: `${MONTHS_LIST_CONFIG[minIdx]} - ${MONTHS_LIST_CONFIG[maxIdx]} ${year}`,
        months: covered
      };
    }

    if (activeTab === 'discrete') {
      if (selectedMonths.length === 0) {
        return { text: `${year}`, months: [] };
      }
      if (selectedMonths.length === 12) {
        return { text: `${year}`, months: [...MONTHS_LIST_CONFIG] };
      }
      if (selectedMonths.length === 1) {
        return { text: `${selectedMonths[0]} ${year}`, months: selectedMonths };
      }
      return {
        text: `${selectedMonths.join(', ')} ${year}`,
        months: selectedMonths
      };
    }

    if (activeTab === 'quarterly') {
      const qMonthsMap = {
        Q1: ['Jan', 'Feb', 'Mar'],
        Q2: ['Apr', 'May', 'Jun'],
        Q3: ['Jul', 'Aug', 'Sep'],
        Q4: ['Oct', 'Nov', 'Dec']
      };
      return {
        text: `${selectedQuarter} ${year}`,
        months: qMonthsMap[selectedQuarter]
      };
    }

    if (activeTab === 'annual') {
      return {
        text: `${year}`,
        months: [...MONTHS_LIST_CONFIG]
      };
    }

    return {
      text: customTextInput.trim() || `${selectedMonth} ${year}`,
      months: []
    };
  };

  const { text: previewText, months: coveredMonths } = getCoverageResult();

  // Helper for monthly amounts
  const handleMonthlyAmountChange = (month: string, val: number) => {
    setMonthlyAmounts(prev => ({
      ...prev,
      [month]: val
    }));
    setEnableMonthlyAmounts(true);
  };

  // Calculate total across selected discrete months
  const activeMonthsList = activeTab === 'discrete' ? selectedMonths : [];

  const totalMonthlyAmount = activeMonthsList.reduce((sum, m) => {
    const val = parseFloat(String(monthlyAmounts[m] ?? '0'));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const hasAnyMonthlyAmount = activeMonthsList.some(m => {
    const val = parseFloat(String(monthlyAmounts[m] ?? '0'));
    return !isNaN(val) && val > 0;
  });

  // Action: Apply same amount across all months
  const handleApplySameToAll = () => {
    const firstNonZero = activeMonthsList.find(m => parseFloat(String(monthlyAmounts[m] ?? '0')) > 0);
    const targetVal = firstNonZero ? monthlyAmounts[firstNonZero] : (initialAmount || 1000);
    const updated: Record<string, number | string> = {};
    activeMonthsList.forEach(m => {
      updated[m] = targetVal;
    });
    setMonthlyAmounts(updated);
    setEnableMonthlyAmounts(true);
  };

  // Action: Evenly split initial/current total amount across months
  const handleEvenSplit = () => {
    const baseTotal = totalMonthlyAmount > 0 ? totalMonthlyAmount : (initialAmount || 0);
    if (activeMonthsList.length > 0 && baseTotal > 0) {
      const perMonth = Math.round((baseTotal / activeMonthsList.length) * 100) / 100;
      const updated: Record<string, number | string> = {};
      activeMonthsList.forEach(m => {
        updated[m] = perMonth;
      });
      setMonthlyAmounts(updated);
      setEnableMonthlyAmounts(true);
    }
  };

  // Action: Clear all amounts
  const handleClearAmounts = () => {
    setMonthlyAmounts({});
  };

  const handleApply = () => {
    const breakdownToSave: Record<string, number> = {};
    if (activeTab === 'discrete' && (enableMonthlyAmounts || hasAnyMonthlyAmount)) {
      selectedMonths.forEach(m => {
        const val = parseFloat(String(monthlyAmounts[m] ?? '0'));
        if (!isNaN(val) && val > 0) {
          breakdownToSave[m] = val;
        }
      });
    }

    const calculatedTotal = activeTab === 'discrete' && (enableMonthlyAmounts || hasAnyMonthlyAmount) && totalMonthlyAmount > 0 
      ? totalMonthlyAmount 
      : undefined;

    onApply(
      previewText, 
      coveredMonths, 
      year,
      Object.keys(breakdownToSave).length > 0 ? breakdownToSave : undefined,
      calculatedTotal
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <CalendarRange className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Month and Year Coverage Builder</h3>
              <p className="text-xs text-emerald-100/90">Select multi-month spans, specific months, and optional per-month amounts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target Year Selector */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Target Year:
            </span>
            <div className="flex items-center gap-2">
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Coverage Mode Selection Tabs */}
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('range')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'range' 
                  ? 'bg-white text-emerald-700 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month Range
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('discrete')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'discrete' 
                  ? 'bg-white text-emerald-700 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Select Months
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quarterly')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'quarterly' 
                  ? 'bg-white text-emerald-700 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quarterly
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('annual')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'annual' 
                  ? 'bg-white text-emerald-700 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom_text')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'custom_text' 
                  ? 'bg-white text-emerald-700 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          {/* TAB 1: RANGE BUILDER */}
          {activeTab === 'range' && (
            <div className="space-y-3 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Start Month
                  </label>
                  <select
                    value={startMonth}
                    onChange={e => setStartMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {MONTHS_LIST_CONFIG.map(m => (
                      <option key={`start-${m}`} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    End Month
                  </label>
                  <select
                    value={endMonth}
                    onChange={e => setEndMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {MONTHS_LIST_CONFIG.map(m => (
                      <option key={`end-${m}`} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Range Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-semibold mr-1">Quick Spans:</span>
                {[
                  { label: 'Jan - Mar', s: 'Jan', e: 'Mar' },
                  { label: 'Jan - Jun', s: 'Jan', e: 'Jun' },
                  { label: 'Jul - Dec', s: 'Jul', e: 'Dec' },
                  { label: 'Jan - Dec (Full Year)', s: 'Jan', e: 'Dec' }
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setStartMonth(preset.s);
                      setEndMonth(preset.e);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DISCRETE MONTHS CHECKBOXES */}
          {activeTab === 'discrete' && (
            <div className="space-y-4">
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Select Included Months:</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAllMonths}
                      className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                    >
                      All 12 Mo
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={selectFirstHalf}
                      className="text-slate-600 hover:underline cursor-pointer"
                    >
                      H1 (Jan-Jun)
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={selectSecondHalf}
                      className="text-slate-600 hover:underline cursor-pointer"
                    >
                      H2 (Jul-Dec)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {MONTHS_LIST_CONFIG.map(m => {
                    const isSelected = selectedMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMonth(m)}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ⭐ MONTHLY AMOUNT BREAKDOWN BUILDER (ONLY IN SELECT MONTHS TAB) */}
              {selectedMonths.length > 0 && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950">
                        Optionally Set Amount per Month
                      </span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-semibold px-1.5 py-0.2 rounded">
                        {selectedMonths.length} month{selectedMonths.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={handleApplySameToAll}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-semibold transition-colors cursor-pointer shadow-2xs"
                        title="Copy first amount to all months"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Set Same</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEvenSplit}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-semibold transition-colors cursor-pointer shadow-2xs"
                        title="Divide total evenly across all months"
                      >
                        <Divide className="w-3 h-3" />
                        <span>Split Even</span>
                      </button>
                      {hasAnyMonthlyAmount && (
                        <button
                          type="button"
                          onClick={handleClearAmounts}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-semibold transition-colors cursor-pointer shadow-2xs"
                          title="Clear monthly amounts"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Monthly Inputs Grid: Large, Wide, and Formatted x,xxx,xxx.xx */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {selectedMonths.map(m => (
                      <div key={m} className="bg-white border border-emerald-200/90 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-400 transition-colors">
                        <div className="flex items-center gap-2 min-w-[75px] shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-xs font-bold text-slate-800">{m} {year}</span>
                        </div>
                        <div className="flex-1">
                          <CurrencyInput
                            value={monthlyAmounts[m] !== undefined ? monthlyAmounts[m] : ''}
                            onChange={val => handleMonthlyAmountChange(m, val)}
                            placeholder="0.00"
                            className="bg-slate-50 hover:bg-white focus:bg-white border-slate-300 focus:border-emerald-500 text-sm font-bold text-right text-emerald-950 rounded-lg py-1.5 shadow-inner"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Monthly Amount Summary Bar */}
                  {totalMonthlyAmount > 0 && (
                    <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-100/90 rounded-xl border border-emerald-300 text-emerald-950 text-xs font-bold shadow-2xs">
                      <span>Total Calculated Amount ({selectedMonths.length} Months):</span>
                      <span className="font-mono text-sm font-extrabold text-emerald-900">
                        ₱{totalMonthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUARTERLY */}
          {activeTab === 'quarterly' && (
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {[
                { q: 'Q1', title: '1st Quarter', months: 'Jan, Feb, Mar' },
                { q: 'Q2', title: '2nd Quarter', months: 'Apr, May, Jun' },
                { q: 'Q3', title: '3rd Quarter', months: 'Jul, Aug, Sep' },
                { q: 'Q4', title: '4th Quarter', months: 'Oct, Nov, Dec' }
              ].map(qItem => (
                <button
                  key={qItem.q}
                  type="button"
                  onClick={() => setSelectedQuarter(qItem.q as any)}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    selectedQuarter === qItem.q
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{qItem.q} ({qItem.title})</span>
                    {selectedQuarter === qItem.q && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{qItem.months} {year}</p>
                </button>
              ))}
            </div>
          )}

          {/* TAB 4: ANNUAL */}
          {activeTab === 'annual' && (
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Annual Retainer / Service Coverage</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Applies full 12-month coverage (January to December {year}) for annual retainers, ITR filing, or yearly audits. Label will display as <strong>{year}</strong>.
              </p>
            </div>
          )}

          {/* TAB 5: CUSTOM INPUT */}
          {activeTab === 'custom_text' && (
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700">
                Custom Period Label (Direct Text)
              </label>
              <input
                type="text"
                value={customTextInput}
                onChange={e => setCustomTextInput(e.target.value)}
                placeholder="e.g. Aug-Oct 2026, Q3-Q4 2026, Mid-Year Retainer"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">
                Type any custom date range or wording you wish to appear on the Statement of Account line.
              </p>
            </div>
          )}

          {/* Live Preview Display */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block">
                Generated Statement of Account Period:
              </span>
              <span className="text-sm font-extrabold text-white tracking-wide">
                {previewText}
              </span>
              {coveredMonths.length > 0 && (
                <span className="text-[11px] text-slate-300 block mt-0.5">
                  ({coveredMonths.length} month{coveredMonths.length > 1 ? 's' : ''} covered: {coveredMonths.join(', ')})
                </span>
              )}
              {activeTab === 'discrete' && totalMonthlyAmount > 0 && (
                <span className="text-[11px] text-emerald-300 font-semibold block mt-0.5">
                  Total Amount: ₱{totalMonthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-emerald-600/30 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-500/30">
              <Check className="w-3.5 h-3.5" />
              <span>Ready</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Apply Period Coverage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

