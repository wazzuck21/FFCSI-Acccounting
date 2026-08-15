import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { HolidayItem } from '../../types';
import { DEFAULT_HOLIDAYS } from '../../utils/deadlineEngine';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  Globe, 
  MapPin, 
  ShieldAlert, 
  Check, 
  X, 
  Search, 
  Filter, 
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const HolidayMasterTab: React.FC = () => {
  const { masterChoices, addHoliday, updateHoliday, deleteHoliday } = useData();
  const { isSuperAdmin } = useAuth();

  const holidays = masterChoices.holidays || DEFAULT_HOLIDAYS;

  // Filter & Search states
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'Nationwide' | 'Regional'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Regular' | 'Special Non-Working' | 'Special Working' | 'Custom'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayItem | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('2026-01-01');
  const [type, setType] = useState<HolidayItem['type']>('Regular');
  const [scope, setScope] = useState<'Nationwide' | 'Regional'>('Nationwide');
  const [rdoCode, setRdoCode] = useState('');
  const [year, setYear] = useState<number>(2026);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setName('');
    setDate(`${selectedYear}-01-01`);
    setType('Regular');
    setScope('Nationwide');
    setRdoCode('');
    setYear(selectedYear);
    setShowModal(true);
  };

  const handleOpenEdit = (h: HolidayItem) => {
    setEditingHoliday(h);
    setName(h.name || '');
    setDate(h.date || '');
    setType(h.type || 'Regular');
    setScope(h.scope || 'Nationwide');
    setRdoCode(h.rdoCode || '');
    setYear(h.year || parseInt(h.date.split('-')[0], 10) || 2026);
    setShowModal(true);
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      alert('Please provide holiday name and valid date.');
      return;
    }

    const calculatedYear = parseInt(date.split('-')[0], 10) || year;

    if (editingHoliday) {
      updateHoliday(editingHoliday.id, {
        name: name.trim(),
        date,
        type,
        scope,
        rdoCode: scope === 'Regional' ? rdoCode.trim() : undefined,
        year: calculatedYear
      });
      showToast(`Updated holiday "${name.trim()}".`);
    } else {
      addHoliday({
        name: name.trim(),
        date,
        type,
        scope,
        rdoCode: scope === 'Regional' ? rdoCode.trim() : undefined,
        year: calculatedYear
      });
      showToast(`Added holiday "${name.trim()}".`);
    }

    setShowModal(false);
  };

  const handleDelete = (h: HolidayItem) => {
    if (window.confirm(`Are you sure you want to delete holiday "${h.name}" on ${h.date}?`)) {
      deleteHoliday(h.id);
      showToast(`Deleted holiday "${h.name}".`);
    }
  };

  const handleResetDefaultHolidays = () => {
    if (window.confirm('Reset holiday master table to standard 2026 Philippine Official Holidays?')) {
      DEFAULT_HOLIDAYS.forEach(h => {
        const exists = holidays.some(ex => ex.date === h.date && ex.name === h.name);
        if (!exists) {
          addHoliday(h);
        }
      });
      showToast('Loaded standard Philippine Official Holidays.');
    }
  };

  // Helper date formatter
  const formatDatePretty = (dStr: string) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dStr;
    }
  };

  // Filtered list
  const filteredHolidays = holidays.filter(h => {
    const hYear = h.year || parseInt(h.date.split('-')[0], 10);
    if (selectedYear !== 0 && hYear !== selectedYear) return false;
    if (scopeFilter !== 'ALL' && h.scope !== scopeFilter) return false;
    if (typeFilter !== 'ALL' && h.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.date.includes(q) ||
        (h.rdoCode && h.rdoCode.toLowerCase().includes(q))
      );
    }
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Counts for selected year
  const yearHolidays = holidays.filter(h => (h.year || parseInt(h.date.split('-')[0], 10)) === selectedYear);
  const regularCount = yearHolidays.filter(h => h.type === 'Regular').length;
  const specialCount = yearHolidays.filter(h => h.type === 'Special Non-Working').length;
  const regionalCount = yearHolidays.filter(h => h.scope === 'Regional').length;

  return (
    <div className="space-y-4 text-xs">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-bold shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border border-rose-200 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              Philippine & Regional Holiday Master
              <span className="bg-rose-100 text-rose-800 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                {filteredHolidays.length} Holidays
              </span>
            </h3>
            <p className="text-[11px] text-slate-600">
              Configures regular, special non-working, and regional RDO local holidays. The Deadline Engine automatically detects falling holidays and advances filing deadlines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleResetDefaultHolidays}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-xl flex items-center gap-1 text-xs transition-colors cursor-pointer"
            title="Reset standard Philippine holidays"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Defaults
          </button>

          {isSuperAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Year Total</span>
          <span className="text-xl font-mono font-bold text-slate-900">{yearHolidays.length}</span>
          <span className="text-[10px] text-slate-400 block">{selectedYear} Calendar</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">Regular Holidays</span>
          <span className="text-xl font-mono font-bold text-rose-700">{regularCount}</span>
          <span className="text-[10px] text-slate-400 block">Nationwide 100% Non-Working</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">Special Non-Working</span>
          <span className="text-xl font-mono font-bold text-amber-700">{specialCount}</span>
          <span className="text-[10px] text-slate-400 block">Non-Working Days</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">Regional / RDO</span>
          <span className="text-xl font-mono font-bold text-indigo-700">{regionalCount}</span>
          <span className="text-[10px] text-slate-400 block">Local City & District Scope</span>
        </div>
      </div>

      {/* Control Bar: Year, Type, Scope, Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {[2024, 2025, 2026, 2027].map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all ${
                  selectedYear === yr ? 'bg-white text-rose-700 shadow-2xs font-mono' : 'text-slate-600 hover:text-slate-900 font-mono'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Scope Filter */}
          <select
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:bg-white text-xs"
          >
            <option value="ALL">All Scopes</option>
            <option value="Nationwide">Nationwide Only</option>
            <option value="Regional">Regional / RDO Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:bg-white text-xs"
          >
            <option value="ALL">All Types</option>
            <option value="Regular">Regular Holiday</option>
            <option value="Special Non-Working">Special Non-Working</option>
            <option value="Special Working">Special Working</option>
            <option value="Custom">Custom / Local</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search holiday name, date, RDO..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </div>

      {/* Holidays Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Holiday Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Applicable Scope</th>
                <th className="py-2.5 px-3">Deadline Shift Rule</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    No holidays found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredHolidays.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatDatePretty(h.date)}
                      <span className="text-[10px] text-slate-400 block font-normal">{h.date}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {h.name}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        h.type === 'Regular' ? 'bg-red-100 text-red-800' :
                        h.type === 'Special Non-Working' ? 'bg-amber-100 text-amber-800' :
                        h.type === 'Special Working' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {h.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {h.scope === 'Regional' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[10px]">
                          <MapPin className="w-3 h-3" />
                          Regional {h.rdoCode ? `(RDO ${h.rdoCode})` : 'Local'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                          <Globe className="w-3 h-3 text-slate-500" />
                          Nationwide
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      {h.type === 'Special Working' ? (
                        <span className="text-slate-400">Regular working day (No shift)</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Shifts falling deadlines to Next Working Day
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {isSuperAdmin && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(h)}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Holiday"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(h)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Holiday"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs shadow-xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-rose-600" />
                {editingHoliday ? 'Edit Master Holiday' : 'Add Master Holiday'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Holiday Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Araw ng Kagitingan, Rizal Day"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Date (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Holiday Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="Regular">Regular Holiday</option>
                    <option value="Special Non-Working">Special Non-Working</option>
                    <option value="Special Working">Special Working</option>
                    <option value="Custom">Custom / Local</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Scope</label>
                  <select
                    value={scope}
                    onChange={e => setScope(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="Nationwide">Nationwide (All Clients)</option>
                    <option value="Regional">Regional / RDO Specific</option>
                  </select>
                </div>

                {scope === 'Regional' && (
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Target RDO Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 038, 044, 050"
                      value={rdoCode}
                      onChange={e => setRdoCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  The deadline calculation engine uses this table to resolve final dates. Any filing deadline landing on this date will be adjusted according to your Weekend & Holiday configuration rules.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                >
                  {editingHoliday ? 'Save Changes' : 'Create Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
