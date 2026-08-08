import React, { useState, useEffect, useRef } from 'react';

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

export function formatLiveCurrency(val: string | number): string {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val);

  const isNegative = str.trim().startsWith('-');

  // Remove everything except digits and decimal point
  const cleaned = str.replace(/[^0-9.]/g, '');
  if (!cleaned) return isNegative ? '-' : '';

  const parts = cleaned.split('.');
  const rawInt = parts[0];

  let formattedInt = '';
  if (rawInt) {
    if (rawInt === '0') {
      formattedInt = '0';
    } else {
      const num = parseInt(rawInt, 10);
      formattedInt = isNaN(num) ? '' : num.toLocaleString('en-US');
    }
  } else if (parts.length > 1) {
    formattedInt = '0';
  }

  const prefix = isNegative ? '-' : '';

  if (parts.length > 1) {
    const decimalPart = parts.slice(1).join('').slice(0, 2);
    return `${prefix}${formattedInt}.${decimalPart}`;
  }

  return `${prefix}${formattedInt}`;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0.00',
  required = false,
  disabled = false,
  id,
  name,
  autoFocus,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === '' || value === 0 || value === undefined || value === null) return '';
    return formatLiveCurrency(value);
  });

  useEffect(() => {
    if (value === '' || value === 0 || value === undefined || value === null || isNaN(Number(value))) {
      if (displayValue && (displayValue.endsWith('.') || displayValue.endsWith('.0') || displayValue.endsWith('.00'))) {
        const currentNum = parseFloat(displayValue.replace(/,/g, ''));
        if (currentNum === Number(value)) return;
      }
      if (value === 0 && displayValue === '') return;
      setDisplayValue(value === 0 || value === '' ? '' : formatLiveCurrency(value));
    } else {
      const currentNum = parseFloat(displayValue.replace(/,/g, ''));
      if (currentNum !== Number(value)) {
        setDisplayValue(formatLiveCurrency(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (!raw.trim() || raw === '-') {
      setDisplayValue(raw);
      onChange(0);
      return;
    }

    const formatted = formatLiveCurrency(raw);
    setDisplayValue(formatted);

    const numeric = parseFloat(formatted.replace(/,/g, ''));
    onChange(isNaN(numeric) ? 0 : numeric);
  };

  const handleBlur = () => {
    const numeric = parseFloat(displayValue.replace(/,/g, ''));
    if (!isNaN(numeric) && numeric !== 0) {
      const absVal = Math.abs(numeric);
      const formattedAbs = absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setDisplayValue(numeric < 0 ? `-${formattedAbs}` : formattedAbs);
      onChange(numeric);
    } else {
      setDisplayValue('');
      onChange(0);
    }
  };

  const hasBg = className.includes('bg-');
  const hasText = className.includes('text-');
  const hasBorder = className.includes('border');

  return (
    <div className="relative flex items-center w-full">
      <span className="absolute left-2.5 text-slate-400 font-bold select-none text-xs pointer-events-none">₱</span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full pl-6 pr-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
          hasBg ? '' : 'bg-slate-50 focus:bg-white'
        } ${
          hasText ? '' : 'text-slate-900'
        } ${
          hasBorder ? '' : 'border border-slate-200'
        } ${className}`}
      />
    </div>
  );
};
