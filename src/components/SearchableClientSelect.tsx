import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Building2 } from 'lucide-react';
import { ClientProfile } from '../types';

interface SearchableClientSelectProps {
  clients: ClientProfile[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export const SearchableClientSelect: React.FC<SearchableClientSelectProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  placeholder = 'Select a Client...',
  className = '',
  label,
  required = false,
  disabled = false,
  showAllOption = false,
  allOptionLabel = 'All Clients',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredClients = clients.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.tradeName || '').toLowerCase().includes(q) ||
      (c.tin || '').toLowerCase().includes(q) ||
      (c.clientCode || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 text-left flex items-center justify-between shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'cursor-pointer'
        }`}
      >
        <span className="truncate flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {selectedClientId === 'ALL' && showAllOption ? (
            <span className="font-bold text-blue-600">{allOptionLabel}</span>
          ) : selectedClient ? (
            <span className="font-semibold text-slate-900">
              {selectedClient.companyName}{' '}
              {selectedClient.tradeName ? `(${selectedClient.tradeName})` : ''}
              {selectedClient.clientCode ? ` - [${selectedClient.clientCode}]` : ''}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by company name, TIN, code..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {showAllOption && (
              <div
                onClick={() => {
                  onSelectClient('ALL');
                  setIsOpen(false);
                }}
                className={`p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors ${
                  selectedClientId === 'ALL' ? 'bg-blue-50/80 font-bold text-blue-700' : 'text-slate-700'
                }`}
              >
                <span>{allOptionLabel}</span>
                {selectedClientId === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </div>
            )}

            {filteredClients.length === 0 ? (
              <div className="p-3 text-center text-slate-400 italic">No matching clients found</div>
            ) : (
              filteredClients.map(client => {
                const isSelected = client.id === selectedClientId;
                return (
                  <div
                    key={client.id}
                    onClick={() => {
                      onSelectClient(client.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-blue-50/70 font-bold text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-slate-900 truncate">
                        {client.companyName}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {client.tin && <span>TIN: {client.tin}</span>}
                        {client.clientCode && (
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                            {client.clientCode}
                          </span>
                        )}
                        {client.businessType && <span>• {client.businessType}</span>}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
