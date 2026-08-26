import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  Calculator, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  HelpCircle, 
  TrendingUp, 
  CheckCircle2, 
  Building2, 
  UserCheck, 
  Info, 
  ArrowRight, 
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Save,
  RefreshCw
} from 'lucide-react';
import { 
  calculateSSSContribution, 
  calculatePhilHealthContribution, 
  calculatePagIbigContribution, 
  calculateSemiMonthlyBIRTax, 
  calculateMonthlyBIRTax,
  computeDoleShiftOvertime,
  DOLE_DAY_RATE_RULES,
  DOLE_WORKING_FACTORS,
  DoleDayType,
  DoleWorkingFactor
} from '../lib/dolePayroll';

interface DolePayrollSandboxProps {
  initialEmployeeId?: string;
}

export const DolePayrollSandbox: React.FC<DolePayrollSandboxProps> = ({ initialEmployeeId }) => {
  const { employees, updateEmployee, addAuditLog } = useData();
  const { currentUser } = useAuth();

  // Mode selection: 'shift_ot' (Shift & Overtime) or 'salary_tax' (Statutory Contributions & BIR Tax) or 'both'
  const [activeSubTab, setActiveSubTab] = useState<'both' | 'shift_ot' | 'contributions'>('both');

  // Employee Sync Selection
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'Active'), [employees]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || activeEmployees[0]?.id || '');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Input states
  const [monthlySalary, setMonthlySalary] = useState<number>(20000);
  const [payPeriodFrequency, setPayPeriodFrequency] = useState<'Semi-Monthly' | 'Monthly'>('Semi-Monthly');
  const [workingFactor, setWorkingFactor] = useState<DoleWorkingFactor>('261');
  
  // Shift inputs
  const [timeIn, setTimeIn] = useState<string>('08:30 AM');
  const [timeOut, setTimeOut] = useState<string>('10:00 PM');
  const [unpaidBreakMinutes, setUnpaidBreakMinutes] = useState<number>(60);
  const [dayType, setDayType] = useState<DoleDayType>('ORDINARY_DAY');
  const [otherAllowances, setOtherAllowances] = useState<number>(0);
  const [valeDeduction, setValeDeduction] = useState<number>(0);

  // Reference tables expanded toggle
  const [showReferenceTables, setShowReferenceTables] = useState<boolean>(false);

  // Handle Load from Selected Employee
  const handleLoadEmployeeData = (empId: string) => {
    setSelectedEmpId(empId);
    const target = employees.find(e => e.id === empId);
    if (target) {
      setMonthlySalary(target.monthlyBasicSalary);
      setValeDeduction(target.defaultValeDeduction || target.currentValeBalance || 0);
      setSyncStatusMsg(`Loaded ${target.fullName}'s setup (₱${target.monthlyBasicSalary.toLocaleString()}/mo)`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Sync initial employee if prop provided
  useEffect(() => {
    if (initialEmployeeId) {
      handleLoadEmployeeData(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  // Apply Calculated Rates Back to Employee Profile in Directory
  const handleApplyRatesToEmployee = () => {
    const target = employees.find(e => e.id === selectedEmpId);
    if (!target) {
      alert('Please select an active employee first.');
      return;
    }

    const calculatedDaily = shiftResult.dailyRate;
    const calculatedHourly = shiftResult.hourlyRate;

    updateEmployee(target.id, {
      monthlyBasicSalary: monthlySalary,
      dailyRate: calculatedDaily,
      hourlyRate: calculatedHourly,
      defaultValeDeduction: valeDeduction
    });

    if (currentUser) {
      addAuditLog(
        'Updated Staff Salary from DOLE Sandbox',
        `Adjusted salary and rates for ${target.fullName} (${target.employeeNo}): Monthly: ₱${monthlySalary.toLocaleString()}, Daily: ₱${calculatedDaily.toFixed(2)}, Hourly: ₱${calculatedHourly.toFixed(2)}`,
        currentUser.id,
        currentUser.fullName
      );
    }

    setSyncStatusMsg(`✅ Saved rates directly to ${target.fullName}'s profile in Employee Directory!`);
    setTimeout(() => setSyncStatusMsg(null), 4000);
  };

  // Quick Preset Handlers
  const handleApplyPreset = (salary: number, inTime: string, outTime: string, day: DoleDayType) => {
    setMonthlySalary(salary);
    setTimeIn(inTime);
    setTimeOut(outTime);
    setDayType(day);
  };

  // 1. Compute Shift & Overtime Breakdown
  const shiftResult = useMemo(() => {
    return computeDoleShiftOvertime(
      timeIn,
      timeOut,
      monthlySalary,
      workingFactor,
      dayType,
      unpaidBreakMinutes,
      '08:30 AM',
      '05:30 PM'
    );
  }, [timeIn, timeOut, monthlySalary, workingFactor, dayType, unpaidBreakMinutes]);

  // 2. Compute Statutory Contributions (SSS, PHIC, HDMF)
  const sssResult = useMemo(() => calculateSSSContribution(monthlySalary), [monthlySalary]);
  const phicResult = useMemo(() => calculatePhilHealthContribution(monthlySalary), [monthlySalary]);
  const hdmfResult = useMemo(() => calculatePagIbigContribution(monthlySalary), [monthlySalary]);

  // Split for semi-monthly if applicable
  const isSemi = payPeriodFrequency === 'Semi-Monthly';
  const periodBasic = isSemi ? monthlySalary / 2 : monthlySalary;
  
  const sssEE = isSemi ? Number((sssResult.ee / 2).toFixed(2)) : sssResult.ee;
  const sssER = isSemi ? Number((sssResult.er / 2).toFixed(2)) : sssResult.er;
  
  const phicEE = isSemi ? Number((phicResult.ee / 2).toFixed(2)) : phicResult.ee;
  const phicER = isSemi ? Number((phicResult.er / 2).toFixed(2)) : phicResult.er;
  
  const hdmfEE = isSemi ? Number((hdmfResult.ee / 2).toFixed(2)) : hdmfResult.ee;
  const hdmfER = isSemi ? Number((hdmfResult.er / 2).toFixed(2)) : hdmfResult.er;

  const totalEEContributions = Number((sssEE + phicEE + hdmfEE).toFixed(2));
  const totalERContributions = Number((sssER + phicER + hdmfER).toFixed(2));
  const totalGovRemittance = Number((totalEEContributions + totalERContributions).toFixed(2));

  // 3. Compute Taxable Income & BIR Withholding Tax (TRAIN Law)
  // Gross pay for statutory computation (basic + allowances)
  const grossPayForTax = periodBasic + otherAllowances;
  const taxableIncome = Math.max(0, grossPayForTax - totalEEContributions);
  
  const birTaxResult = useMemo(() => {
    if (isSemi) {
      return calculateSemiMonthlyBIRTax(taxableIncome);
    } else {
      return calculateMonthlyBIRTax(taxableIncome);
    }
  }, [isSemi, taxableIncome]);

  const birWithholdingTax = birTaxResult.tax;
  const totalDeductions = Number((totalEEContributions + birWithholdingTax + valeDeduction).toFixed(2));
  const netTakeHomePay = Number((grossPayForTax - totalDeductions).toFixed(2));

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-400/20 text-blue-300 border border-blue-400/30 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-blue-300" /> Interactive DOLE & BIR Sandbox
              </span>
              <span className="text-xs text-slate-300 font-mono">DOLE Labor Code • TRAIN Law (RA 10963)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Philippine Payroll, Overtime & Statutory Tax Sandbox</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Live simulation engine for computing exact DOLE Overtime Rate rules, Night Shift Differential (NSD), SSS (with WISP & EC), PhilHealth 5%, Pag-IBIG HDMF, and TRAIN Law BIR Withholding Tax tables.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSubTab('both')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'both' ? 'bg-blue-500 text-white shadow-xs' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Full Interactive Suite
            </button>
            <button
              onClick={() => setActiveSubTab('shift_ot')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'shift_ot' ? 'bg-blue-500 text-white shadow-xs' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Shift & Overtime Only
            </button>
            <button
              onClick={() => setActiveSubTab('contributions')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'contributions' ? 'bg-blue-500 text-white shadow-xs' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              SSS, PHIC, HDMF & BIR
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-300 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Quick Load Examples:
          </span>
          <button
            onClick={() => handleApplyPreset(20000, '08:30 AM', '10:00 PM', 'ORDINARY_DAY')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-amber-200 border border-amber-300/30 rounded-lg font-semibold transition-all cursor-pointer"
          >
            ₱20k Salary • 8:30 AM - 10:00 PM Shift (4.5h OT)
          </button>
          <button
            onClick={() => handleApplyPreset(25000, '08:00 AM', '08:00 PM', 'REGULAR_HOLIDAY')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-purple-200 border border-purple-300/30 rounded-lg font-semibold transition-all cursor-pointer"
          >
            ₱25k Salary • Regular Holiday (Double Pay + OT)
          </button>
          <button
            onClick={() => handleApplyPreset(35000, '01:00 PM', '11:00 PM', 'REST_DAY')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-emerald-200 border border-emerald-300/30 rounded-lg font-semibold transition-all cursor-pointer"
          >
            ₱35k Salary • Rest Day + Night Shift Differential
          </button>
          <button
            onClick={() => handleApplyPreset(50000, '08:30 AM', '05:30 PM', 'ORDINARY_DAY')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-blue-200 border border-blue-300/30 rounded-lg font-semibold transition-all cursor-pointer"
          >
            ₱50k Salary • TRAIN Law Tax Bracket 4 & WISP
          </button>
        </div>
      </div>

      {/* Cross-Tab Sync: Employee Directory Connector Bar */}
      <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 grow">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Sync with Staff Directory</span>
              <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Live Synced</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedEmpId}
                onChange={(e) => handleLoadEmployeeData(e.target.value)}
                className="bg-slate-50 border border-slate-300 font-bold text-xs text-slate-800 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeNo}) — ₱{emp.monthlyBasicSalary.toLocaleString()}/mo • {emp.position}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleLoadEmployeeData(selectedEmpId)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Reload this employee's basic salary and vale balance"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" /> Reload Data
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {syncStatusMsg && (
            <span className="text-xs font-bold text-emerald-700 animate-pulse">
              {syncStatusMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleApplyRatesToEmployee}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
          >
            <Save className="w-4 h-4" /> Save Rates to Employee Directory
          </button>
        </div>
      </div>

      {/* Main Sandbox Controls Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <Layers className="w-4 h-4 text-blue-600" />
          Base Compensation & Simulation Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Monthly Basic Salary */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Monthly Basic Salary (₱)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400">₱</span>
              <input
                type="number"
                min="0"
                step="500"
                value={monthlySalary}
                onChange={e => setMonthlySalary(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="20000"
              />
            </div>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {[15000, 20000, 25000, 35000, 50000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMonthlySalary(amt)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                    monthlySalary === amt ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ₱{(amt / 1000)}k
                </button>
              ))}
            </div>
          </div>

          {/* Pay Period Frequency */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Payroll Cutoff Frequency
            </label>
            <select
              value={payPeriodFrequency}
              onChange={e => setPayPeriodFrequency(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="Semi-Monthly">Semi-Monthly (1st Half / 2nd Half)</option>
              <option value="Monthly">Monthly (Full Month Payout)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              {isSemi ? 'Splits SSS/PHIC/HDMF & computes Semi-Monthly BIR tax' : 'Computes full monthly statutory taxes'}
            </p>
          </div>

          {/* DOLE Working Factor */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              DOLE Working Days Factor
            </label>
            <select
              value={workingFactor}
              onChange={e => setWorkingFactor(e.target.value as DoleWorkingFactor)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="261">261 Days (5 Days/wk, Mon-Fri • 21.75 d/mo)</option>
              <option value="313">313 Days (6 Days/wk, Mon-Sat • 26.08 d/mo)</option>
              <option value="365">365 Days (Everyday with paid rest days)</option>
              <option value="393.8">393.8 Days (Rest Days + Holiday Premium)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Formula: (Salary × 12) ÷ {DOLE_WORKING_FACTORS[workingFactor].days}
            </p>
          </div>

          {/* Additional Allowance */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Other Allowances / De Minimis (₱)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400">₱</span>
              <input
                type="number"
                min="0"
                step="100"
                value={otherAllowances}
                onChange={e => setOtherAllowances(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="0"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Added to gross taxable compensation
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: DOLE SHIFT & OVERTIME SIMULATION (e.g. 8:30 AM - 10:00 PM) */}
      {(activeSubTab === 'both' || activeSubTab === 'shift_ot') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                1. DOLE Shift, Overtime & Daily Rate Calculation Engine
              </h3>
              <p className="text-xs text-slate-500">
                Simulates real-world attendance shift logs (e.g. 8:30 AM to 10:00 PM) across all 7 Philippine DOLE holiday & rest day tiers.
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-bold text-xs font-mono self-start sm:self-auto">
              Daily Rate: ₱{shiftResult.dailyRate.toFixed(2)} • Hourly: ₱{shiftResult.hourlyRate.toFixed(2)}
            </span>
          </div>

          {/* Shift Parameter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Time In */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Time In</label>
              <input
                type="text"
                value={timeIn}
                onChange={e => setTimeIn(e.target.value)}
                placeholder="08:30 AM"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center text-sm shadow-2xs"
              />
              <div className="flex gap-1 mt-1 justify-center">
                {['08:00 AM', '08:30 AM', '09:00 AM'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeIn(t)}
                    className="text-[10px] text-indigo-600 hover:underline font-mono"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Out */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Time Out</label>
              <input
                type="text"
                value={timeOut}
                onChange={e => setTimeOut(e.target.value)}
                placeholder="10:00 PM"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center text-sm shadow-2xs"
              />
              <div className="flex gap-1 mt-1 justify-center">
                {['05:30 PM', '08:00 PM', '10:00 PM', '11:30 PM'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeOut(t)}
                    className="text-[10px] text-indigo-600 hover:underline font-mono"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal / Lunch Break */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Unpaid Meal Break (Mins)</label>
              <input
                type="number"
                min="0"
                step="15"
                value={unpaidBreakMinutes}
                onChange={e => setUnpaidBreakMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center text-sm shadow-2xs"
              />
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                DOLE Standard: 60 mins (1 hr) unpaid lunch
              </p>
            </div>

            {/* Day Type / Holiday Tier */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Day Type Classification</label>
              <select
                value={dayType}
                onChange={e => setDayType(e.target.value as DoleDayType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs shadow-2xs cursor-pointer"
              >
                {Object.values(DOLE_DAY_RATE_RULES).map(rule => (
                  <option key={rule.type} value={rule.type}>
                    {rule.label} ({rule.shortLabel})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                OT Multiplier: {(shiftResult.dayRule.otMultiplier * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Shift Time Breakdown Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Shift Elapsed</span>
              <p className="text-base font-extrabold font-mono text-slate-800 mt-0.5">{shiftResult.totalElapsedHours} hrs</p>
              <span className="text-[10px] text-slate-400">{timeIn} → {timeOut}</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">Regular Work Hours</span>
              <p className="text-base font-extrabold font-mono text-blue-900 mt-0.5">{shiftResult.regularHours} hrs</p>
              <span className="text-[10px] text-blue-600 font-medium">Standard 8h Shift (Pay: ₱{shiftResult.regularPay.toFixed(2)})</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Overtime Hours</span>
              <p className="text-base font-extrabold font-mono text-emerald-900 mt-0.5">{shiftResult.regularOtHours} hrs</p>
              <span className="text-[10px] text-emerald-600 font-medium">Beyond 8h (OT Pay: ₱{shiftResult.overtimePay.toFixed(2)})</span>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
              <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">Night Diff (10PM - 6AM)</span>
              <p className="text-base font-extrabold font-mono text-purple-900 mt-0.5">{shiftResult.totalNightDiffHours} hrs</p>
              <span className="text-[10px] text-purple-600 font-medium">+10% NSD Premium (₱{shiftResult.nightDiffPay.toFixed(2)})</span>
            </div>
          </div>

          {/* Shift Gross Pay Result Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
            <div>
              <span className="text-xs text-slate-300 font-sans block">Total Gross Earnings for this Daily Shift</span>
              <div className="flex items-center gap-2 text-xs text-indigo-300 mt-0.5">
                <span>Regular: ₱{shiftResult.regularPay.toFixed(2)}</span>
                <span>+</span>
                <span>OT: ₱{shiftResult.overtimePay.toFixed(2)}</span>
                {shiftResult.nightDiffPay > 0 && (
                  <>
                    <span>+</span>
                    <span>NSD: ₱{shiftResult.nightDiffPay.toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                ₱{shiftResult.grossDailyPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Step-by-Step DOLE Mathematical Audit Trail */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Step-by-Step DOLE Calculation Formula & Audit Trail
            </h4>
            <div className="space-y-1 font-mono text-[11px] text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
              {shiftResult.calculationSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 py-0.5 border-b border-slate-100 last:border-0">
                  <span className="text-indigo-600 font-bold shrink-0">{idx + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2 & 3: MANDATORY STATUTORY CONTRIBUTIONS & TRAIN LAW BIR TAX */}
      {(activeSubTab === 'both' || activeSubTab === 'contributions') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SSS, PhilHealth & Pag-IBIG HDMF Contributions Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  2. Mandatory Government Contributions (SSS, PHIC, HDMF)
                </h3>
                <p className="text-xs text-slate-500">
                  Calculates side-by-side Employee (EE) payroll deduction and Employer (ER) statutory burden for 2025/2026.
                </p>
              </div>

              {/* SSS Card */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-blue-700" /> SSS (Social Security System)
                  </span>
                  <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                    MSC: ₱{sssResult.breakdown?.msc.toLocaleString() || '20,000'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1">
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Employee (EE)</span>
                    <strong className="text-rose-600 text-sm">₱{sssEE.toFixed(2)}</strong>
                    <span className="text-[9px] text-slate-400 block font-sans">(4.5% MSC)</span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Employer (ER)</span>
                    <strong className="text-slate-800 text-sm">₱{sssER.toFixed(2)}</strong>
                    <span className="text-[9px] text-slate-400 block font-sans">(9.5% + EC)</span>
                  </div>

                  <div className="bg-blue-100/60 p-2 rounded-lg border border-blue-200">
                    <span className="text-[10px] text-blue-800 font-sans font-bold block">Total Remittance</span>
                    <strong className="text-blue-900 text-sm">₱{(sssEE + sssER).toFixed(2)}</strong>
                    <span className="text-[9px] text-blue-600 block font-sans">{isSemi ? 'Per Half' : 'Per Month'}</span>
                  </div>
                </div>

                {/* SSS Detailed Breakdown Notes */}
                {sssResult.breakdown && (
                  <div className="text-[10px] text-slate-600 flex justify-between pt-1 border-t border-blue-100/80 font-mono">
                    <span>Regular SSS: EE ₱{sssResult.breakdown.regularEE} / ER ₱{sssResult.breakdown.regularER}</span>
                    {sssResult.breakdown.wispEE > 0 && (
                      <span className="text-indigo-700">WISP: EE ₱{sssResult.breakdown.wispEE} / ER ₱{sssResult.breakdown.wispER}</span>
                    )}
                    <span className="text-slate-500">EC: ₱{sssResult.breakdown.ecER}</span>
                  </div>
                )}
              </div>

              {/* PhilHealth (PHIC) Card */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" /> PhilHealth (PHIC 5% Premium)
                  </span>
                  <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    Floor: ₱10k • Cap: ₱100k
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1">
                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Employee (EE)</span>
                    <strong className="text-rose-600 text-sm">₱{phicEE.toFixed(2)}</strong>
                    <span className="text-[9px] text-slate-400 block font-sans">(2.5% Premium)</span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Employer (ER)</span>
                    <strong className="text-slate-800 text-sm">₱{phicER.toFixed(2)}</strong>
                    <span className="text-[9px] text-slate-400 block font-sans">(2.5% Premium)</span>
                  </div>

                  <div className="bg-emerald-100/60 p-2 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-sans font-bold block">Total Premium</span>
                    <strong className="text-emerald-900 text-sm">₱{(phicEE + phicER).toFixed(2)}</strong>
                    <span className="text-[9px] text-emerald-600 block font-sans">{isSemi ? 'Per Half' : 'Per Month'}</span>
                  </div>
                </div>
              </div>

              {/* Pag-IBIG (HDMF) Card */}
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-amber-700" /> Pag-IBIG Fund (HDMF)
                  </span>
                  <span className="font-mono text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                    Standard 2% Max ₱200 Cap
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1">
                  <div className="bg-white p-2 rounded-lg border border-amber-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Employee (EE)</span>
                    <strong className="text-rose-600 text-sm">₱{hdmfEE.toFixed(2)}</strong>
                    <span className="text-[9px] text-slate-400 block font-sans">(Max ₱200/mo)</span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-amber-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Employer (ER)</span>
                    <strong className="text-slate-800 text-sm">₱{hdmfER.toFixed(2)}</strong>
                    <span className="text-[9px] text-slate-400 block font-sans">(Max ₱200/mo)</span>
                  </div>

                  <div className="bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-900 font-sans font-bold block">Total Remittance</span>
                    <strong className="text-amber-950 text-sm">₱{(hdmfEE + hdmfER).toFixed(2)}</strong>
                    <span className="text-[9px] text-amber-700 block font-sans">{isSemi ? 'Per Half' : 'Per Month'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Contributions Summary Box */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex justify-between items-center text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-sans block">Total EE Deductions ({payPeriodFrequency})</span>
                <span className="text-base font-bold text-rose-400">-₱{totalEEContributions.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-sans block">Employer Total Burden</span>
                <span className="text-base font-bold text-blue-300">+₱{totalERContributions.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* TRAIN Law BIR Withholding Tax & Net Take-Home Payout Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  3. TRAIN Law BIR Withholding Tax & Net Pay
                </h3>
                <p className="text-xs text-slate-500">
                  Applies Revised TRAIN Law Withholding Tax Schedule for {payPeriodFrequency} compensation.
                </p>
              </div>

              {/* Tax Computation Step by Step */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-sans">Gross Compensation ({payPeriodFrequency}):</span>
                  <span className="font-bold">₱{grossPayForTax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-rose-600">
                  <span className="font-sans">Less Non-Taxable SSS, PHIC, HDMF:</span>
                  <span className="font-bold">-₱{totalEEContributions.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900 text-sm font-bold">
                  <span className="font-sans">Net Taxable Income:</span>
                  <span className="text-indigo-700">₱{taxableIncome.toFixed(2)}</span>
                </div>
              </div>

              {/* Applied Tax Bracket Box */}
              <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                birWithholdingTax === 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                  : 'bg-indigo-50 border-indigo-200 text-indigo-950'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Applied BIR Bracket Level {birTaxResult.bracket.level}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    birWithholdingTax === 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-indigo-200 text-indigo-900'
                  }`}>
                    {birWithholdingTax === 0 ? 'Tax Exempt' : 'Taxable'}
                  </span>
                </div>

                <p className="font-medium text-slate-700">
                  Formula: <strong className="font-mono">{birTaxResult.bracket.formulaDescription}</strong>
                </p>

                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-mono text-sm">
                  <span className="font-sans font-bold">BIR Withholding Tax:</span>
                  <span className="text-base font-extrabold text-rose-600">
                    ₱{birWithholdingTax.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Net Payout Computation */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">Total Statutory EE Deductions:</span>
                  <span>₱{totalEEContributions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">BIR Withholding Tax:</span>
                  <span>₱{birWithholdingTax.toFixed(2)}</span>
                </div>
                {valeDeduction > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span className="font-sans">Vale (Cash Advance) Deduction:</span>
                    <span>₱{valeDeduction.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t font-bold text-rose-700 text-sm">
                  <span className="font-sans">Total Deductions:</span>
                  <span>-₱{totalDeductions.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Net Take-Home Pay Result Callout */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-4 rounded-xl flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">
                  Net Take-Home Pay ({payPeriodFrequency})
                </span>
                <span className="text-xs text-emerald-200">
                  Direct Bank Credit / GCash Payout
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-300">
                ₱{netTakeHomePay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section: Official Statutory & DOLE Rate Reference Tables */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <button
          type="button"
          onClick={() => setShowReferenceTables(!showReferenceTables)}
          className="w-full flex items-center justify-between text-slate-900 font-bold text-sm cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Official Philippine DOLE, SSS, PhilHealth & TRAIN Law Reference Tables
          </span>
          {showReferenceTables ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showReferenceTables && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100 text-xs">
            {/* DOLE Overtime Multiplier Reference */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" /> DOLE Labor Code Overtime & Holiday Rates
              </h4>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.values(DOLE_DAY_RATE_RULES).map(rule => (
                  <div key={rule.type} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{rule.label}</span>
                      <span className="text-indigo-700">OT: {(rule.otMultiplier * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">{rule.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* TRAIN Law Tax Table Reference */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" /> Revised TRAIN Law Withholding Tax Schedule
              </h4>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                  <span>Semi-Monthly: ≤ ₱10,417 (Monthly: ≤ ₱20,833)</span>
                  <strong className="text-emerald-600">0.00 (Exempt)</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                  <span>Semi-Monthly: ₱10,417 - ₱16,666</span>
                  <strong className="text-blue-600">15% of excess</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                  <span>Semi-Monthly: ₱16,667 - ₱33,332</span>
                  <strong className="text-blue-600">₱937.50 + 20%</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                  <span>Semi-Monthly: ₱33,333 - ₱83,332</span>
                  <strong className="text-blue-600">₱4,270.83 + 25%</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                  <span>Semi-Monthly: ₱83,333 - ₱333,332</span>
                  <strong className="text-blue-600">₱16,770.83 + 30%</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                  <span>Semi-Monthly: &gt; ₱333,332</span>
                  <strong className="text-blue-600">₱91,770.83 + 35%</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
