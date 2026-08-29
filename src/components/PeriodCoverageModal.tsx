import React, { useState, useEffect } from 'react';
import { Calendar, CalendarRange, Check, Layers, Sparkles, X, Calculator, HelpCircle, ListOrdered } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

interface PeriodCoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemDescription: string;
  currentPeriod: string;
  currentAmount: number;
  defaultMonthlyRate?: number;
  initialDivideToMonths?: boolean;
  onApply: (periodText: string, newAmount?: number, coveredMonths?: string[], monthlyRate?: number, divideToMonths?: boolean) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const YEARS = Array.from({ length: 15 }, (_, i) => 2020 + i);

export const PeriodCoverageModal: React.FC<PeriodCoverageModalProps> = ({
  isOpen,
  onClose,
  itemDescription,
  currentPeriod,
  currentAmount,
  defaultMonthlyRate = 0,
  initialDivideToMonths = true,
  onApply,
}) => {
  const [activeTab, setActiveTab] = useState<'range' | 'discrete' | 'quarterly' | 'annual'>('range');

  // Mode 1: Continuous Range
  const currentYearNum = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const [fromMonth, setFromMonth] = useState<number>(currentMonthIdx);
  const [fromYear, setFromYear] = useState<number>(currentYearNum);
  const [toMonth, setToMonth] = useState<number>((currentMonthIdx + 2) % 12);
  const [toYear, setToYear] = useState<number>(currentMonthIdx + 2 >= 12 ? currentYearNum + 1 : currentYearNum);

  // Mode 2: Discrete Months
  const [discreteYear, setDiscreteYear] = useState<number>(currentYearNum);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonthIdx]);

  // Mode 3: Quarterly
  const [quarterYear, setQuarterYear] = useState<number>(currentYearNum);
  const [quarterMode, setQuarterMode] = useState<'single' | 'range' | 'custom'>('range');
  const [selectedQuarters, setSelectedQuarters] = useState<number[]>([1, 2]); // 1-indexed: 1Q, 2Q, 3Q, 4Q
  const [fromQuarter, setFromQuarter] = useState<number>(1);
  const [toQuarter, setToQuarter] = useState<number>(3);

  // Mode 4: Annual / Multi-Year
  const [annualMode, setAnnualMode] = useState<'single' | 'range'>('single');
  const [singleAnnualYear, setSingleAnnualYear] = useState<number>(currentYearNum);
  const [fromAnnualYear, setFromAnnualYear] = useState<number>(currentYearNum - 1);
  const [toAnnualYear, setToAnnualYear] = useState<number>(currentYearNum);

  // Divide across covered months selector ⭐
  const [divideToMonths, setDivideToMonths] = useState<boolean>(initialDivideToMonths);

  // Smart Multiplier state
  const initialBaseRate = currentAmount > 0 ? currentAmount : (defaultMonthlyRate > 0 ? defaultMonthlyRate : 0);
  const [baseRate, setBaseRate] = useState<number>(initialBaseRate);
  const [applyCalculatedAmount, setApplyCalculatedAmount] = useState<boolean>(true);
  const [customFinalAmount, setCustomFinalAmount] = useState<number>(0);
  const [isCustomAmountManual, setIsCustomAmountManual] = useState<boolean>(false);

  // Initialize or parse existing currentPeriod if possible
  useEffect(() => {
    if (isOpen) {
      const base = currentAmount > 0 ? currentAmount : (defaultMonthlyRate > 0 ? defaultMonthlyRate : 0);
      setBaseRate(base);
      setIsCustomAmountManual(false);
      setDivideToMonths(initialDivideToMonths !== undefined ? initialDivideToMonths : true);
    }
  }, [isOpen, currentAmount, defaultMonthlyRate, initialDivideToMonths]);

  if (!isOpen) return null;

  // Calculate duration, generated text, and discrete covered months list
  let periodText = '';
  let multiplierCount = 1;
  let unitLabel = 'Month';
  const coveredMonths: string[] = [];

  if (activeTab === 'range') {
    const totalMonths = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
    multiplierCount = Math.max(1, totalMonths);
    unitLabel = multiplierCount === 1 ? 'Month' : 'Months';

    let currY = fromYear;
    let currM = fromMonth;
    while (currY < toYear || (currY === toYear && currM <= toMonth)) {
      coveredMonths.push(`${MONTH_NAMES[currM]} ${currY}`);
      currM++;
      if (currM > 11) {
        currM = 0;
        currY++;
      }
    }

    if (totalMonths <= 1 && fromYear === toYear && fromMonth === toMonth) {
      periodText = `${MONTH_NAMES[fromMonth]} ${fromYear}`;
    } else if (fromYear === toYear) {
      periodText = `${MONTH_NAMES[fromMonth]} – ${MONTH_NAMES[toMonth]} ${fromYear} (${multiplierCount} Mos)`;
    } else {
      periodText = `${MONTH_NAMES[fromMonth]} ${fromYear} – ${MONTH_NAMES[toMonth]} ${toYear} (${multiplierCount} Mos)`;
    }
  } else if (activeTab === 'discrete') {
    const sorted = [...selectedMonths].sort((a, b) => a - b);
    multiplierCount = Math.max(1, sorted.length);
    unitLabel = multiplierCount === 1 ? 'Month' : 'Months';
    sorted.forEach(m => coveredMonths.push(`${MONTH_NAMES[m]} ${discreteYear}`));
    const monthListStr = sorted.map(m => MONTH_SHORT[m]).join(', ');
    periodText = `${monthListStr} ${discreteYear} (${multiplierCount} Mos)`;
  } else if (activeTab === 'quarterly') {
    const qMonthsMap: Record<number, number[]> = {
      1: [0, 1, 2],
      2: [3, 4, 5],
      3: [6, 7, 8],
      4: [9, 10, 11]
    };

    if (quarterMode === 'single') {
      multiplierCount = 1;
      unitLabel = 'Quarter';
      periodText = `${fromQuarter}Q ${quarterYear}`;
      if (qMonthsMap[fromQuarter]) {
        qMonthsMap[fromQuarter].forEach(mIdx => coveredMonths.push(`${MONTH_NAMES[mIdx]} ${quarterYear}`));
      }
    } else if (quarterMode === 'range') {
      const qCount = Math.max(1, toQuarter - fromQuarter + 1);
      multiplierCount = qCount;
      unitLabel = qCount === 1 ? 'Quarter' : 'Quarters';
      periodText = fromQuarter === toQuarter 
        ? `${fromQuarter}Q ${quarterYear}` 
        : `${fromQuarter}Q – ${toQuarter}Q ${quarterYear} (${qCount} Qtrs)`;
      for (let q = fromQuarter; q <= toQuarter; q++) {
        if (qMonthsMap[q]) {
          qMonthsMap[q].forEach(mIdx => coveredMonths.push(`${MONTH_NAMES[mIdx]} ${quarterYear}`));
        }
      }
    } else {
      const sortedQ = [...selectedQuarters].sort((a, b) => a - b);
      multiplierCount = Math.max(1, sortedQ.length);
      unitLabel = multiplierCount === 1 ? 'Quarter' : 'Quarters';
      periodText = `${sortedQ.map(q => `${q}Q`).join(', ')} ${quarterYear} (${multiplierCount} Qtrs)`;
      sortedQ.forEach(q => {
        if (qMonthsMap[q]) {
          qMonthsMap[q].forEach(mIdx => coveredMonths.push(`${MONTH_NAMES[mIdx]} ${quarterYear}`));
        }
      });
    }
  } else if (activeTab === 'annual') {
    if (annualMode === 'single') {
      multiplierCount = 1;
      unitLabel = 'Year';
      periodText = `Annual ${singleAnnualYear}`;
      MONTH_NAMES.forEach(m => coveredMonths.push(`${m} ${singleAnnualYear}`));
    } else {
      const yCount = Math.max(1, toAnnualYear - fromAnnualYear + 1);
      multiplierCount = yCount;
      unitLabel = yCount === 1 ? 'Year' : 'Years';
      periodText = `${fromAnnualYear} – ${toAnnualYear} (${yCount} Yrs)`;
      for (let y = fromAnnualYear; y <= toAnnualYear; y++) {
        MONTH_NAMES.forEach(m => coveredMonths.push(`${m} ${y}`));
      }
    }
  }

  // Calculate suggested amount:
  // If divideToMonths is true, the total is baseRate * multiplierCount (or custom amount).
  // If divideToMonths is false (lump sum / single charge), default total amount can just be baseRate (or custom amount).
  const autoCalculatedTotal = divideToMonths ? (baseRate * multiplierCount) : baseRate;
  const finalAmountToDisplay = isCustomAmountManual ? customFinalAmount : autoCalculatedTotal;
  const perMonthBreakdownAmt = (divideToMonths && coveredMonths.length > 0) ? (finalAmountToDisplay / coveredMonths.length) : finalAmountToDisplay;

  const handleApply = () => {
    onApply(
      periodText, 
      applyCalculatedAmount ? finalAmountToDisplay : undefined,
      coveredMonths,
      perMonthBreakdownAmt,
      divideToMonths
    );
    onClose();
  };

  const toggleDiscreteMonth = (mIdx: number) => {
    setSelectedMonths(prev => {
      if (prev.includes(mIdx)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter(m => m !== mIdx);
      } else {
        return [...prev, mIdx];
      }
    });
  };

  const toggleQuarter = (q: number) => {
    setSelectedQuarters(prev => {
      if (prev.includes(q)) {
        if (prev.length === 1) return prev;
        return prev.filter(item => item !== q);
      } else {
        return [...prev, q];
      }
    });
  };

  return (
    <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 text-slate-800 text-xs my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-emerald-600" />
              Multi-Month & Period Coverage Builder
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-sm">
              Item: <strong className="text-slate-800 font-semibold">{itemDescription || 'Selected Service'}</strong>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl font-semibold text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('range')}
            className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'range' 
                ? 'bg-white text-emerald-800 font-bold shadow-2xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Month Range
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discrete')}
            className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'discrete' 
                ? 'bg-white text-emerald-800 font-bold shadow-2xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Custom Months
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quarterly')}
            className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'quarterly' 
                ? 'bg-white text-emerald-800 font-bold shadow-2xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quarterly
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('annual')}
            className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'annual' 
                ? 'bg-white text-emerald-800 font-bold shadow-2xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual
          </button>
        </div>

        {/* TAB 1: Continuous Month Range */}
        {activeTab === 'range' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Select Continuous Billing Span (From → To)</span>
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-[10px]">
                {multiplierCount} {unitLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* FROM */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">From Month & Year</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={fromMonth}
                    onChange={e => setFromMonth(Number(e.target.value))}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={fromYear}
                    onChange={e => setFromYear(Number(e.target.value))}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TO */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">To Month & Year</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={toMonth}
                    onChange={e => setToMonth(Number(e.target.value))}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={toYear}
                    onChange={e => setToYear(Number(e.target.value))}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Range Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60 text-[10px]">
              <span className="text-slate-400 font-semibold">Quick Span:</span>
              <button
                type="button"
                onClick={() => { setToMonth((fromMonth + 1) % 12); setToYear(fromMonth + 1 >= 12 ? fromYear + 1 : fromYear); }}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
              >
                2 Months
              </button>
              <button
                type="button"
                onClick={() => { setToMonth((fromMonth + 2) % 12); setToYear(fromMonth + 2 >= 12 ? fromYear + 1 : fromYear); }}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
              >
                3 Months (Quarter)
              </button>
              <button
                type="button"
                onClick={() => { setToMonth((fromMonth + 5) % 12); setToYear(fromMonth + 5 >= 12 ? fromYear + 1 : fromYear); }}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
              >
                6 Months (Semi-Annual)
              </button>
              <button
                type="button"
                onClick={() => { setToMonth((fromMonth + 11) % 12); setToYear(fromMonth + 11 >= 12 ? fromYear + 1 : fromYear); }}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
              >
                12 Months (1 Year)
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Discrete / Specific Months Picker */}
        {activeTab === 'discrete' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Click to Select Specific Months (e.g. Jan, Mar, Nov)</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-semibold">Year:</span>
                <select
                  value={discreteYear}
                  onChange={e => setDiscreteYear(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800"
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 12-Month Interactive Grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_NAMES.map((name, idx) => {
                const isSel = selectedMonths.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDiscreteMonth(idx)}
                    className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                      isSel 
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSel && <Check className="w-3 h-3 text-white" />}
                    <span>{MONTH_SHORT[idx]}</span>
                  </button>
                );
              })}
            </div>

            {/* Helper quick actions */}
            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedMonths([0, 1, 2])}
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Q1 (Jan-Mar)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonths([3, 4, 5])}
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Q2 (Apr-Jun)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonths([6, 7, 8])}
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Q3 (Jul-Sep)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonths([9, 10, 11])}
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Q4 (Oct-Dec)
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])}
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold"
                >
                  Select All (12)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Quarterly Mode */}
        {activeTab === 'quarterly' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Quarterly Coverage (1Q, 2Q, 3Q, 4Q)</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-semibold">Year:</span>
                <select
                  value={quarterYear}
                  onChange={e => setQuarterYear(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800"
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quarter Range Picker */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">From Quarter</label>
                <select
                  value={fromQuarter}
                  onChange={e => setFromQuarter(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-800"
                >
                  <option value={1}>1Q (Jan – Mar)</option>
                  <option value={2}>2Q (Apr – Jun)</option>
                  <option value={3}>3Q (Jul – Sep)</option>
                  <option value={4}>4Q (Oct – Dec)</option>
                </select>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">To Quarter</label>
                <select
                  value={toQuarter}
                  onChange={e => setToQuarter(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-800"
                >
                  <option value={1}>1Q (Jan – Mar)</option>
                  <option value={2}>2Q (Apr – Jun)</option>
                  <option value={3}>3Q (Jul – Sep)</option>
                  <option value={4}>4Q (Oct – Dec)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[1, 2, 3, 4].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setFromQuarter(q); setToQuarter(q); }}
                  className={`py-1.5 px-2 rounded-lg font-bold text-xs border transition-colors cursor-pointer text-center ${
                    fromQuarter === q && toQuarter === q
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {q}Q Single
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Annual / Multi-Year */}
        {activeTab === 'annual' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Annual & Multi-Year Coverage</span>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAnnualMode('single')}
                  className={`px-2 py-0.5 rounded font-bold ${annualMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}`}
                >
                  Single Year
                </button>
                <button
                  type="button"
                  onClick={() => setAnnualMode('range')}
                  className={`px-2 py-0.5 rounded font-bold ${annualMode === 'range' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}`}
                >
                  Year Range
                </button>
              </div>
            </div>

            {annualMode === 'single' ? (
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Select Annual Year</label>
                <select
                  value={singleAnnualYear}
                  onChange={e => setSingleAnnualYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800"
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>Annual {y}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">From Year</label>
                  <select
                    value={fromAnnualYear}
                    onChange={e => setFromAnnualYear(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-800"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">To Year</label>
                  <select
                    value={toAnnualYear}
                    onChange={e => setToAnnualYear(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-800"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SMART MULTIPLIER & AMOUNT CALCULATION CARD ⭐ */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              Smart Multiplier & Amount Calculator
            </span>
            <span className="px-2 py-0.5 bg-indigo-200 text-indigo-900 rounded-full font-bold text-[10px]">
              Multiplier: ×{multiplierCount} {unitLabel}
            </span>
          </div>

          {/* DIVIDE TO MONTHS TOGGLE SELECTOR ⭐ */}
          {coveredMonths.length > 1 && (
            <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Distribution Mode across {coveredMonths.length} Months
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Choose whether to divide the amount across each covered month or bill as a single amount.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDivideToMonths(true);
                  }}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    divideToMonths 
                      ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${divideToMonths ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      Divide to Months
                    </span>
                    {divideToMonths && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Multiplies base rate by {multiplierCount} {unitLabel} (₱{(baseRate * multiplierCount).toLocaleString()}), apportioning ₱{baseRate.toLocaleString()}/mo in records.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDivideToMonths(false);
                  }}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    !divideToMonths 
                      ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 shadow-2xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${!divideToMonths ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                      Do Not Divide (Fixed Total)
                    </span>
                    {!divideToMonths && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Single lump-sum total payable (₱{baseRate.toLocaleString()}) covering the whole period without multiplying per month.
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-indigo-800 mb-1">
                {divideToMonths ? `Base Rate (Per ${activeTab === 'quarterly' ? 'Quarter' : activeTab === 'annual' ? 'Year' : 'Month'})` : 'Fixed Lump-Sum Rate'}
              </label>
              <CurrencyInput
                value={baseRate}
                onChange={val => {
                  setBaseRate(val);
                  setIsCustomAmountManual(false);
                }}
                placeholder="15,000"
                className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-indigo-800 mb-1 flex items-center justify-between">
                <span>Total Calculated Amount</span>
                {isCustomAmountManual && <span className="text-[9px] text-amber-700 font-bold uppercase">(Custom)</span>}
              </label>
              <CurrencyInput
                value={finalAmountToDisplay}
                onChange={val => {
                  setCustomFinalAmount(val);
                  setIsCustomAmountManual(true);
                }}
                placeholder="45,000"
                className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Formula calculation preview */}
          <div className="flex items-center justify-between text-[11px] bg-white/90 p-2 rounded-lg border border-indigo-100">
            <span className="text-slate-600">
              {divideToMonths ? (
                <>Calculation: <strong className="font-mono text-slate-900">₱{baseRate.toLocaleString()}</strong> × <strong className="font-semibold text-indigo-700">{multiplierCount} {unitLabel}</strong></>
              ) : (
                <>Calculation: Fixed lump-sum <strong className="font-mono text-slate-900">₱{baseRate.toLocaleString()}</strong> across entire span</>
              )}
            </span>
            <span className="font-mono font-bold text-emerald-700 text-xs">
              = ₱{autoCalculatedTotal.toLocaleString()}
            </span>
          </div>

          <label className="flex items-center gap-2 text-[11px] font-medium text-indigo-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyCalculatedAmount}
              onChange={e => setApplyCalculatedAmount(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0"
            />
            <span>Apply calculated amount (₱{finalAmountToDisplay.toLocaleString()}) to this line item</span>
          </label>
        </div>

        {/* RECORDS & LEDGER MONTHLY BREAKDOWN PREVIEW */}
        {coveredMonths.length > 1 && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 text-[11px] flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-emerald-700" />
                Ledger & Records Monthly Breakdown ({coveredMonths.length} Months):
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                {divideToMonths ? 'Divided Across Months' : 'Single Lump-Sum Period'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto pr-1">
              {coveredMonths.map((m, idx) => (
                <div key={idx} className="bg-white px-2 py-1.5 rounded-lg border border-emerald-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-700 font-medium truncate mr-1">{m}</span>
                  <span className="font-mono font-bold text-emerald-800 shrink-0">
                    {divideToMonths ? (
                      `₱${perMonthBreakdownAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      'Lump-Sum'
                    )}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-emerald-700">
              {divideToMonths ? (
                <>* On the SOA, this appears as one consolidated line (<strong>{periodText}</strong>). In your records and financial reports, each month is accounted as <strong>₱{perMonthBreakdownAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>.</>
              ) : (
                <>* On the SOA, this appears as one consolidated line (<strong>{periodText}</strong>) with a total of <strong>₱{finalAmountToDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> and is not divided per month.</>
              )}
            </p>
          </div>
        )}

        {/* LIVE PREVIEW BANNER */}
        <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
          <div className="space-y-0.5 truncate mr-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Generated Period Label</span>
            <span className="font-bold text-emerald-400 text-xs truncate block">{periodText}</span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payable Amount</span>
            <span className="font-mono font-bold text-white text-xs">
              ₱{finalAmountToDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Apply Period & Amount
          </button>
        </div>

      </div>
    </div>
  );
};
