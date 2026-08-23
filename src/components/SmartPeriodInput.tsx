import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, Sparkles, ChevronRight } from 'lucide-react';

interface SmartPeriodInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  selectedYear?: string | number;
  id?: string;
  required?: boolean;
}

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SmartPeriodInput: React.FC<SmartPeriodInputProps> = ({
  value,
  onChange,
  placeholder = 'e.g. July 2026, Q2 2026...',
  className = '',
  hasError = false,
  selectedYear = new Date().getFullYear(),
  id,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const yr = String(selectedYear || new Date().getFullYear());

  // Generate period pool
  const periodPool = useMemo(() => {
    const pool: Array<{ label: string; desc: string; type: 'Monthly' | 'Quarterly' | 'Range' | 'Annual' }> = [];

    // Monthly
    MONTHS_LIST.forEach((m, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      pool.push({
        label: `${m} ${yr}`,
        desc: `Month ${monthNum} (${m})`,
        type: 'Monthly',
      });
    });

    // Quarterly
    pool.push({ label: `Q1 ${yr} (Jan – Mar)`, desc: '1st Quarter Compliance', type: 'Quarterly' });
    pool.push({ label: `Q2 ${yr} (Apr – Jun)`, desc: '2nd Quarter Compliance', type: 'Quarterly' });
    pool.push({ label: `Q3 ${yr} (Jul – Sep)`, desc: '3rd Quarter Compliance', type: 'Quarterly' });
    pool.push({ label: `Q4 ${yr} (Oct – Dec)`, desc: '4th Quarter Compliance', type: 'Quarterly' });

    // Multi-Month Ranges
    pool.push({ label: `Jan – Jun ${yr} (1st Sem)`, desc: 'First Semester', type: 'Range' });
    pool.push({ label: `Jul – Dec ${yr} (2nd Sem)`, desc: 'Second Semester', type: 'Range' });
    pool.push({ label: `May – Jul ${yr}`, desc: '3-Month Coverage', type: 'Range' });
    pool.push({ label: `Jun – Aug ${yr}`, desc: '3-Month Coverage', type: 'Range' });
    pool.push({ label: `Aug – Oct ${yr}`, desc: '3-Month Coverage', type: 'Range' });

    // Annual
    pool.push({ label: `Annual ${yr}`, desc: 'Full Year Coverage', type: 'Annual' });

    return pool;
  }, [yr]);

  // Filter based on input query
  const suggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) {
      return periodPool.slice(0, 8);
    }

    const cleanQ = query.replace(/[^a-z0-9]/g, '');

    return periodPool.filter(p => {
      const lClean = p.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dClean = p.desc.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (lClean.includes(cleanQ) || dClean.includes(cleanQ)) return true;

      // Numerical matching e.g. "06" -> June or Q2
      if (cleanQ === '06' || cleanQ === '6') {
        return p.label.includes('June') || p.label.includes('Q2') || p.label.includes('Jun');
      }
      if (cleanQ === '07' || cleanQ === '7') {
        return p.label.includes('July') || p.label.includes('Q3') || p.label.includes('Jul');
      }
      if (cleanQ === '08' || cleanQ === '8') {
        return p.label.includes('August') || p.label.includes('Q3') || p.label.includes('Aug');
      }
      if (cleanQ === '01' || cleanQ === '1') {
        return p.label.includes('Jan') || p.label.includes('Q1');
      }

      return false;
    });
  }, [value, periodPool]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (periodStr: string) => {
    onChange(periodStr);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex].label);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        required={required}
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-2 py-1.5 bg-white border rounded-lg text-slate-900 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all ${
          hasError
            ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/70 text-rose-950 placeholder-rose-400'
            : 'border-slate-200'
        } ${className}`}
      />

      {/* Smart Period Suggestions Popdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[240px] max-w-xs bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="bg-slate-50 px-2.5 py-1 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700">
              <Sparkles className="w-3 h-3" /> Month / Period
            </span>
            <span className="text-slate-400">Click to fill</span>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((item, idx) => {
              const isSelected = idx === highlightedIndex;
              return (
                <div
                  key={`${item.label}-${idx}`}
                  onClick={() => handleSelect(item.label)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-1.5 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[11px] leading-tight text-slate-900">
                      {item.label}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">
                      {item.desc}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    {item.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
