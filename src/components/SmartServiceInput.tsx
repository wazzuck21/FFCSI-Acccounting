import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

export interface ServiceCatalogItem {
  code: string;
  name: string;
  category: 'BIR' | 'Benefits' | 'Others' | string;
  defaultAmount?: number;
  description?: string;
}

interface SmartServiceInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectSuggestion?: (item: ServiceCatalogItem) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  catalog?: ServiceCatalogItem[];
  id?: string;
  required?: boolean;
}

export const DEFAULT_SERVICE_CATALOG: ServiceCatalogItem[] = [
  // BIR Compliance Forms
  { code: '0619E', name: '0619E (Monthly Remittance Withheld (Expanded))', category: 'BIR', defaultAmount: 0 },
  { code: '1601C', name: '1601C (Monthly Remittance of Income Taxes Withheld - Compensation)', category: 'BIR', defaultAmount: 0 },
  { code: '1601EQ', name: '1601EQ (Quarterly Remittance Withheld (Expanded))', category: 'BIR', defaultAmount: 0 },
  { code: '0605', name: '0605 (Payment Form / Annual Registration Fee)', category: 'BIR', defaultAmount: 0 },
  { code: '2550Q', name: '2550Q (Quarterly Value-Added Tax Return)', category: 'BIR', defaultAmount: 0 },
  { code: '2550M', name: '2550M (Monthly Value-Added Tax Declaration)', category: 'BIR', defaultAmount: 0 },
  { code: '2551Q', name: '2551Q (Quarterly Percentage Tax Return)', category: 'BIR', defaultAmount: 0 },
  { code: '1701Q', name: '1701Q (Quarterly Income Tax Return - Individual)', category: 'BIR', defaultAmount: 0 },
  { code: '1702Q', name: '1702Q (Quarterly Income Tax Return - Corporate)', category: 'BIR', defaultAmount: 0 },
  { code: 'ITR', name: 'ITR (Annual Income Tax Return - 1702RT / 1701)', category: 'BIR', defaultAmount: 0 },
  { code: '1604C', name: '1604C (Annual Information Return - Compensation)', category: 'BIR', defaultAmount: 0 },
  { code: '1604E', name: '1604E (Annual Information Return - Expanded)', category: 'BIR', defaultAmount: 0 },
  { code: '1604F', name: '1604F (Annual Information Return - Final Taxes)', category: 'BIR', defaultAmount: 0 },
  { code: 'SAWT', name: 'SAWT (Summary Alphalist of Withholding Taxes)', category: 'BIR', defaultAmount: 0 },
  { code: 'QAP', name: 'QAP (Quarterly Alphabetical List of Payees)', category: 'BIR', defaultAmount: 0 },
  { code: 'SLSP', name: 'SLSP (Summary List of Sales and Purchases)', category: 'BIR', defaultAmount: 0 },
  { code: 'BIR_TAX_PACKAGE', name: 'BIR Corporate Tax Services (BIR_TAX_PACKAGE)', category: 'BIR', defaultAmount: 0 },

  // Government Statutory Benefits & Loans
  { code: 'SSS', name: 'SSS (Social Security System Contribution)', category: 'Benefits', defaultAmount: 0 },
  { code: 'SSS Salary Loan', name: 'SSS Salary Loan (SSS Salary Loan Remittance)', category: 'Benefits', defaultAmount: 0 },
  { code: 'SSS Calamity Loan', name: 'SSS Calamity Loan (SSS Calamity Loan Remittance)', category: 'Benefits', defaultAmount: 0 },
  { code: 'PhilHealth', name: 'PhilHealth (Philippine Health Insurance Corp)', category: 'Benefits', defaultAmount: 0 },
  { code: 'HDMF', name: 'HDMF (Pag-IBIG Fund Contribution)', category: 'Benefits', defaultAmount: 0 },
  { code: 'HDMF Multi-Purpose Loan', name: 'HDMF Multi-Purpose Loan (Pag-IBIG MPL Remittance)', category: 'Benefits', defaultAmount: 0 },
  { code: 'HDMF Calamity Loan', name: 'HDMF Calamity Loan (Pag-IBIG Calamity Loan Remittance)', category: 'Benefits', defaultAmount: 0 },

  // Professional Fees & General Services
  { code: 'RETAINERS_FEE', name: 'Retainers Fee', category: 'Others', defaultAmount: 0 },
  { code: 'BOOKKEEPING_FEE', name: 'Accounting & Bookkeeping Fee', category: 'Others', defaultAmount: 0 },
  { code: 'FINANCIAL_STATEMENTS', name: 'Financial Statement Preparation & Auditing', category: 'Others', defaultAmount: 0 },
  { code: 'CONSULTATION_FEE', name: 'Consultation & Tax Advisory Fee', category: 'Others', defaultAmount: 0 },
  { code: 'BUSINESS_PERMIT', name: 'Business Permit / Mayor\'s Permit Renewal', category: 'Others', defaultAmount: 0 },
  { code: 'SEC_DTI_COMPLIANCE', name: 'SEC / DTI Annual Compliance & Registration', category: 'Others', defaultAmount: 0 },
  { code: 'SERVICE_CHARGE', name: 'Service Charge', category: 'Others', defaultAmount: 0 },
  { code: 'LATE_FILING_ASSISTANCE', name: 'Late Filing & Penalty Assistance Charge', category: 'Others', defaultAmount: 0 },
  { code: 'DOC_PROCESSING', name: 'Document Processing & Courier Charge', category: 'Others', defaultAmount: 0 },
];

export const SmartServiceInput: React.FC<SmartServiceInputProps> = ({
  value,
  onChange,
  onSelectSuggestion,
  placeholder = 'e.g. 0619E, Retainers Fee...',
  className = '',
  hasError = false,
  catalog = DEFAULT_SERVICE_CATALOG,
  id,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter items based on user input
  const suggestions = useMemo(() => {
    const rawQuery = (value || '').trim().toLowerCase();
    if (!rawQuery) {
      // Show top relevant suggestions if input is blank but focused
      return catalog.slice(0, 10);
    }

    const cleanQuery = rawQuery.replace(/[^a-z0-9]/g, '');

    return catalog.filter(item => {
      const codeClean = item.code.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameClean = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const catClean = (item.category || '').toLowerCase();

      // Direct code match (e.g. typing "06" matches 0619E, 0605; typing "16" matches 1601eq, 1601c)
      if (codeClean.includes(cleanQuery)) return true;
      if (nameClean.includes(cleanQuery)) return true;
      if (catClean.includes(cleanQuery)) return true;

      // Smart alias mapping (e.g. typing "06" also surfaces expanded withholding 1601eq, typing "expanded" surfaces 0619e & 1601eq)
      if (cleanQuery === '06' && (codeClean.includes('0619e') || codeClean.includes('1601eq') || codeClean.includes('0605'))) return true;
      if (cleanQuery === '16' && (codeClean.includes('1601c') || codeClean.includes('1601eq') || codeClean.includes('1604'))) return true;
      if (cleanQuery === '25' && (codeClean.includes('2550') || codeClean.includes('2551'))) return true;
      if (cleanQuery === '17' && (codeClean.includes('1701') || codeClean.includes('1702'))) return true;
      if (cleanQuery.includes('tax') && (item.category === 'BIR' || codeClean.includes('tax'))) return true;
      if (cleanQuery.includes('loan') && (codeClean.includes('loan') || nameClean.includes('loan'))) return true;
      if (cleanQuery.includes('pag') && (codeClean.includes('hdmf') || nameClean.includes('pag'))) return true;

      return false;
    });
  }, [value, catalog]);

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

  const handleSelect = (item: ServiceCatalogItem) => {
    onChange(item.name);
    if (onSelectSuggestion) {
      onSelectSuggestion(item);
    }
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
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
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
          className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-slate-900 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all ${
            hasError
              ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/70 text-rose-950 placeholder-rose-400'
              : 'border-slate-200'
          } ${className}`}
        />
      </div>

      {/* Smart Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-sm bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="bg-slate-50 px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700">
              <Sparkles className="w-3 h-3" /> Smart Suggestions
            </span>
            <span className="text-slate-400">↑↓ to navigate, Enter to select</span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((item, idx) => {
              const isSelected = idx === highlightedIndex;
              const isBir = item.category === 'BIR';
              const isBenefits = item.category === 'Benefits';

              return (
                <div
                  key={`${item.code}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2 truncate">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black shrink-0 ${
                        isBir
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : isBenefits
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {item.code}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-[11px] truncate leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">
                        {item.category === 'BIR' ? 'BIR Compliance Form' : item.category === 'Benefits' ? 'Govt Benefit / Loan' : 'Service Fee'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
