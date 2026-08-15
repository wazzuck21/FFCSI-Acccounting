import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { WeekendAdjustmentConfig } from '../../types';
import { DEFAULT_WEEKEND_CONFIG, calculateClientDeadline } from '../../utils/deadlineEngine';
import { 
  Calendar as CalendarIcon, 
  Sliders, 
  Check, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  Building2, 
  Zap, 
  Sun, 
  HelpCircle,
  Clock,
  MapPin,
  FileText
} from 'lucide-react';

export const WeekendRulesTab: React.FC = () => {
  const { masterChoices, clients, updateWeekendConfig } = useData();
  const { isSuperAdmin } = useAuth();

  const weekendConfig = masterChoices.weekendConfig || DEFAULT_WEEKEND_CONFIG;

  // Sandbox testing states
  const [testClientId, setTestClientId] = useState<string>(clients[0]?.id || '');
  const [testRuleCode, setTestRuleCode] = useState<string>('2550Q');
  const [testMonth, setTestMonth] = useState<string>('Apr');
  const [testYear, setTestYear] = useState<number>(2026);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateRule = (rule: WeekendAdjustmentConfig['rule']) => {
    if (!isSuperAdmin) {
      alert('Only Admin users can modify system weekend configuration.');
      return;
    }
    updateWeekendConfig({ rule });
    showToast(`Weekend adjustment rule updated to "${rule}".`);
  };

  const handleToggleHolidays = (adjustForHolidays: boolean) => {
    if (!isSuperAdmin) {
      alert('Only Admin users can modify system weekend configuration.');
      return;
    }
    updateWeekendConfig({ adjustForHolidays });
    showToast(`Holiday adjustment ${adjustForHolidays ? 'enabled' : 'disabled'}.`);
  };

  // Run calculation in sandbox
  const selectedClient = clients.find(c => c.id === testClientId) || clients[0];
  const allMasterRules = [
    ...(masterChoices.birTaxOptions || []),
    ...(masterChoices.benefitsOptions || [])
  ];
  let selectedRule = allMasterRules.find(r => r.code.toLowerCase() === testRuleCode.toLowerCase());
  if (!selectedRule) {
    selectedRule = {
      id: testRuleCode,
      code: testRuleCode,
      name: testRuleCode,
      category: 'BIR',
      frequency: 'Quarterly',
      deadlineDay: 25,
      customDescription: ''
    };
  }

  const sandboxResult = selectedClient && selectedRule ? calculateClientDeadline({
    client: selectedClient,
    rule: selectedRule,
    month: testMonth,
    year: testYear,
    masterChoices
  }) : null;

  return (
    <div className="space-y-4 text-xs">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-bold shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              Weekend & Working Day Rules Configuration
              <span className="bg-blue-100 text-blue-800 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                Rule: {weekendConfig.rule}
              </span>
            </h3>
            <p className="text-[11px] text-slate-600">
              Controls the automatic shifting engine when a base filing deadline or statutory due date lands on a Saturday, Sunday, or Official Philippine / Regional Holiday.
            </p>
          </div>
        </div>
      </div>

      {/* Rules Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Option 1: Next Working Day */}
        <div 
          onClick={() => handleUpdateRule('NEXT_WORKING_DAY')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            weekendConfig.rule === 'NEXT_WORKING_DAY'
              ? 'bg-blue-50/70 border-blue-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-blue-600" />
              Next Working Day (Standard)
            </span>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              weekendConfig.rule === 'NEXT_WORKING_DAY' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
            }`}>
              {weekendConfig.rule === 'NEXT_WORKING_DAY' && <Check className="w-3 h-3" />}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Standard BIR and statutory practice. If the deadline lands on a Saturday or Sunday, the deadline is automatically deferred to the following Monday.
          </p>
        </div>

        {/* Option 2: Previous Working Day */}
        <div 
          onClick={() => handleUpdateRule('PREVIOUS_WORKING_DAY')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            weekendConfig.rule === 'PREVIOUS_WORKING_DAY'
              ? 'bg-blue-50/70 border-blue-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              Previous Working Day
            </span>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              weekendConfig.rule === 'PREVIOUS_WORKING_DAY' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
            }`}>
              {weekendConfig.rule === 'PREVIOUS_WORKING_DAY' && <Check className="w-3 h-3" />}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Conservative compliance schedule. If a deadline lands on a weekend, the due date is pulled back to the preceding Friday.
          </p>
        </div>

        {/* Option 3: Exact Date / No Adjustment */}
        <div 
          onClick={() => handleUpdateRule('NO_ADJUSTMENT')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            weekendConfig.rule === 'NO_ADJUSTMENT'
              ? 'bg-blue-50/70 border-blue-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-purple-600" />
              Exact Date (No Shift)
            </span>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              weekendConfig.rule === 'NO_ADJUSTMENT' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
            }`}>
              {weekendConfig.rule === 'NO_ADJUSTMENT' && <Check className="w-3 h-3" />}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Displays the literal calendar day without advancing for weekends or non-working days.
          </p>
        </div>
      </div>

      {/* Holiday Shifting Option */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Automatic Holiday Adjustment Cascade
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5">
            When enabled, if a shifted weekend date also coincides with an official Philippine Regular, Special Non-Working, or Regional RDO holiday, the engine cascades forward to the next business day.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={weekendConfig.adjustForHolidays}
            onChange={e => handleToggleHolidays(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* LIVE INTERACTIVE DEADLINE ENGINE RESOLUTION SANDBOX */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-sm text-white">Live Client-Based Deadline Engine Sandbox</h4>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono">
            Pipeline: Client Master → Base Rule → Override/RMC → Shift Engine → Final Date
          </span>
        </div>

        {/* Sandbox Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">1. Test Client Profile</label>
            <select
              value={testClientId}
              onChange={e => setTestClientId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.companyName} (TIN: {c.tinNumber} | RDO: {c.rdoNumber || '038'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">2. Compliance Form / Rule</label>
            <select
              value={testRuleCode}
              onChange={e => setTestRuleCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allMasterRules.map(r => (
                <option key={r.id} value={r.code}>
                  {r.code} - {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">3. Filing Month</label>
            <select
              value={testMonth}
              onChange={e => setTestMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">4. Year</label>
            <input
              type="number"
              value={testYear}
              onChange={e => setTestYear(parseInt(e.target.value, 10) || 2026)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Live Calculation Pipeline Result */}
        {sandboxResult && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-[11px]">
              {/* Step 1 */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[9px] block">1. Client Master</span>
                <span className="font-bold text-white block">{sandboxResult.clientName}</span>
                <span className="text-slate-400 text-[10px] block">TIN: {sandboxResult.tinNumber}</span>
                <span className="text-amber-400 font-bold text-[10px] block">RDO: {sandboxResult.rdoNumber || 'N/A'}</span>
                <span className="text-indigo-300 text-[10px] block">Method: {sandboxResult.registrationMethod}</span>
              </div>

              {/* Step 2 */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[9px] block">2. Base Schedule</span>
                <span className="font-mono text-slate-300 block">{sandboxResult.defaultDeadline}</span>
                <span className="text-slate-400 text-[10px] block">Period: {sandboxResult.taxablePeriod}</span>
                <span className="text-slate-500 text-[10px] block">Rule: {sandboxResult.formCode}</span>
              </div>

              {/* Step 3 */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[9px] block">3. Override / RMC</span>
                {sandboxResult.overrideDeadline ? (
                  <span className="font-mono font-bold text-amber-400 block">{sandboxResult.overrideDeadline}</span>
                ) : (
                  <span className="text-slate-500 block">No active RMC override</span>
                )}
                <span className="text-[10px] text-slate-400 block line-clamp-1">{sandboxResult.deadlineSource}</span>
              </div>

              {/* Step 4 */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[9px] block">4. Shift Inspection</span>
                {sandboxResult.wasShifted ? (
                  <span className="text-emerald-400 font-bold text-[10px] block">
                    ✓ Shifted: {sandboxResult.shiftReason || 'Weekend/Holiday'}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px] block">Lands on valid business day</span>
                )}
                {sandboxResult.holidayAdjustment && (
                  <span className="text-[9px] text-amber-300 block">Holiday Adjustment Applied</span>
                )}
              </div>

              {/* Step 5 - Final */}
              <div className="p-3 bg-blue-950/60 border border-blue-800 rounded-lg space-y-1">
                <span className="text-blue-400 font-bold uppercase text-[9px] block">5. Final Client Deadline</span>
                <span className="font-mono font-bold text-white text-base block">{sandboxResult.finalDeadline}</span>
                <span className="text-emerald-300 font-semibold text-[10px] block">
                  {sandboxResult.taxablePeriod}
                </span>
                <span className="bg-blue-900/80 text-blue-200 text-[9px] px-1.5 py-0.5 rounded block text-center font-mono">
                  Synced Across 3 Modules
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
