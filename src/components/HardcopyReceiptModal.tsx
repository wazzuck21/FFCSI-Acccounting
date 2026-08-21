import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Sliders, 
  RotateCcw, 
  Save, 
  Eye, 
  Layers, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Move, 
  Maximize2,
  Info,
  CheckCircle2,
  FileText,
  Target,
  Grid,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { InvoiceItem, InvoiceServiceLine } from '../types';
import { 
  HardcopyPrintConfig, 
  DEFAULT_HARDCOPY_CONFIG,
  getHardcopyPrintConfig, 
  saveHardcopyPrintConfig, 
  resetHardcopyPrintConfig,
  printHardcopyReceiptDirectly,
  downloadHardcopyReceiptPDF,
  createHardcopyReceiptDoc,
  printCalibrationTestGridDirectly
} from '../utils/hardcopyReceiptPrinter';

interface HardcopyReceiptModalProps {
  invoice: InvoiceItem;
  clientAddress?: string;
  defaultPreparedBy?: string;
  onClose: () => void;
}

type CalibrationCategory = 'all' | 'header' | 'table' | 'footer';

export const HardcopyReceiptModal: React.FC<HardcopyReceiptModalProps> = ({
  invoice,
  clientAddress = 'Gen. Aguinaldo Hi-Way Panapaan V, Bacoor City',
  defaultPreparedBy = 'Maricris',
  onClose,
}) => {
  // Config state
  const [config, setConfig] = useState<HardcopyPrintConfig>(getHardcopyPrintConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'services' | 'calibration'>('preview');
  const [calibCategory, setCalibCategory] = useState<CalibrationCategory>('all');
  const [calibSearch, setCalibSearch] = useState('');
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [copiedConfig, setCopiedConfig] = useState(false);

  // Preview display mode
  const [previewMode, setPreviewMode] = useState<'overlay' | 'data-only' | 'full'>('overlay');

  // Editable dynamic fields
  const [clientName, setClientName] = useState(invoice.clientName);
  const [address, setAddress] = useState(clientAddress);
  const [crNumber, setCrNumber] = useState(() => {
    const raw = invoice.collectionReceiptNumber || invoice.officialReceiptNumber || invoice.collectionNumber || invoice.invoiceNumber || '1001';
    return raw.replace(/^(C\.?R\.?|CR|NO\.?)\s*#?\s*-?\s*/i, '').trim() || raw;
  });
  const [issueDate, setIssueDate] = useState(invoice.paymentDate || invoice.issueDate || new Date().toISOString().substring(0, 10));
  const [preparedBy, setPreparedBy] = useState(defaultPreparedBy);
  const [billingNotes, setBillingNotes] = useState(invoice.billingNotes || '');

  // Adaptable Services List
  const initialServices: InvoiceServiceLine[] = useMemo(() => {
    if (invoice.services && invoice.services.length > 0) {
      return invoice.services.map(s => ({ ...s }));
    }
    return [
      {
        description: 'Professional Retainer Fee',
        monthYear: invoice.billingPeriod || 'May 2026',
        amount: invoice.totalAmount || 0,
      }
    ];
  }, [invoice]);

  const [selectedServices, setSelectedServices] = useState<InvoiceServiceLine[]>(initialServices);
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    initialServices.map((_, i) => i)
  );

  // Calculate dynamic total of selected items
  const activeItemsToPrint = useMemo(() => {
    return selectedServices.filter((_, idx) => selectedIndices.includes(idx));
  }, [selectedServices, selectedIndices]);

  const computedTotal = useMemo(() => {
    return activeItemsToPrint.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [activeItemsToPrint]);

  // Handle service field changes
  const handleServiceChange = (index: number, field: keyof InvoiceServiceLine, value: any) => {
    const updated = [...selectedServices];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedServices(updated);
  };

  const handleToggleService = (index: number) => {
    if (selectedIndices.includes(index)) {
      if (selectedIndices.length === 1) return; // Keep at least one
      setSelectedIndices(selectedIndices.filter(i => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const handleAddServiceLine = () => {
    const newLine: InvoiceServiceLine = {
      description: 'Additional Service / Filing',
      monthYear: '',
      amount: 0,
    };
    const updated = [...selectedServices, newLine];
    setSelectedServices(updated);
    setSelectedIndices([...selectedIndices, updated.length - 1]);
  };

  const handleDeleteServiceLine = (index: number) => {
    if (selectedServices.length <= 1) return;
    const updated = selectedServices.filter((_, i) => i !== index);
    setSelectedServices(updated);
    setSelectedIndices(updated.map((_, i) => i));
  };

  // Config adjustment handlers
  const handleSaveCalibration = () => {
    saveHardcopyPrintConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetCalibration = () => {
    if (confirm('Reset all printer micro-alignment coordinates to factory defaults?')) {
      const def = resetHardcopyPrintConfig();
      setConfig(def);
    }
  };

  const handleResetSingleField = (keys: (keyof HardcopyPrintConfig)[]) => {
    const updated = { ...config };
    keys.forEach(k => {
      (updated as any)[k] = DEFAULT_HARDCOPY_CONFIG[k];
    });
    setConfig(updated);
  };

  const handleNudge = (key: keyof HardcopyPrintConfig, delta: number) => {
    const current = Number(config[key] ?? DEFAULT_HARDCOPY_CONFIG[key] ?? 0);
    const updatedVal = Number((current + delta).toFixed(1));
    setConfig({ ...config, [key]: updatedVal });
  };

  const handleCopyConfigJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  // Print handlers
  const handlePrint = (mode: 'data-only' | 'full') => {
    const invToPrint = { ...invoice, billingNotes: billingNotes.trim() || undefined };
    printHardcopyReceiptDirectly(invToPrint, {
      mode,
      config,
      preparedBy,
      clientAddress: address,
      customServices: activeItemsToPrint,
      overrideCrNo: crNumber,
      overrideDate: issueDate,
      customTotal: computedTotal,
    });
  };

  const handleDownloadPdf = (mode: 'data-only' | 'full') => {
    const invToPrint = { ...invoice, billingNotes: billingNotes.trim() || undefined };
    downloadHardcopyReceiptPDF(invToPrint, {
      mode,
      config,
      preparedBy,
      clientAddress: address,
      customServices: activeItemsToPrint,
      overrideCrNo: crNumber,
      overrideDate: issueDate,
      customTotal: computedTotal,
    });
  };

  // Adaptable row spacing calculation for preview
  const serviceCount = Math.max(activeItemsToPrint.length, 1);
  const effectiveRowSpacing = useMemo(() => {
    if (!config.autoFitRowSpacing) return config.rowSpacingMm;
    const maxAvailable = config.maxTableHeightMm || 52;
    const computed = maxAvailable / serviceCount;
    return Math.min(config.rowSpacingMm, Math.max(computed, 4.5));
  }, [config.autoFitRowSpacing, config.rowSpacingMm, config.maxTableHeightMm, serviceCount]);

  // Micro-adjustment component helper for coordinates
  const renderCoordinateControl = (
    label: string,
    key: keyof HardcopyPrintConfig,
    min: number,
    max: number,
    step: number = 0.5,
    unit: string = 'mm',
    defaultVal?: number
  ) => {
    const val = Number(config[key] ?? defaultVal ?? 0);
    const def = defaultVal ?? (DEFAULT_HARDCOPY_CONFIG[key] as number) ?? 0;
    const isModified = Math.abs(val - def) > 0.01;

    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-800 flex items-center gap-1.5">
            <span>{label}</span>
            {isModified && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-mono">
                {val > def ? `+${(val - def).toFixed(1)}` : (val - def).toFixed(1)}{unit}
              </span>
            )}
          </label>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
              {val.toFixed(1)} {unit}
            </span>
            {isModified && (
              <button
                type="button"
                onClick={() => handleResetSingleField([key])}
                className="text-[10px] text-slate-400 hover:text-indigo-600 font-bold px-1 py-0.5 rounded hover:bg-slate-200"
                title={`Reset to default (${def}${unit})`}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stepper buttons + range slider */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNudge(key, -1)}
            className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded font-mono font-bold text-[10px] text-slate-700 cursor-pointer"
            title="Step -1.0 mm"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => handleNudge(key, -0.1)}
            className="px-1.5 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded font-mono font-bold text-[10px] text-slate-700 cursor-pointer"
            title="Micro step -0.1 mm"
          >
            -0.1
          </button>

          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={val}
            onChange={(e) => setConfig({ ...config, [key]: parseFloat(e.target.value) || 0 })}
            className="flex-1 accent-indigo-600 cursor-pointer"
          />

          <button
            type="button"
            onClick={() => handleNudge(key, +0.1)}
            className="px-1.5 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded font-mono font-bold text-[10px] text-slate-700 cursor-pointer"
            title="Micro step +0.1 mm"
          >
            +0.1
          </button>
          <button
            type="button"
            onClick={() => handleNudge(key, +1)}
            className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded font-mono font-bold text-[10px] text-slate-700 cursor-pointer"
            title="Step +1.0 mm"
          >
            +1
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-sm text-white shadow-sm">
              FFCSI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">
                  Hardcopy Collection Receipt Alignment & Print Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono text-[10px] font-bold border border-red-500/30">
                  Pre-Printed Form Overlay
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Aligns and prints only items corresponding to the red parentheses onto your physical pre-printed stationery.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Eye className="w-4 h-4 text-red-600" />
              1. Visual Live Preview & Print
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-600" />
              2. Adaptable Multi-Service Lines
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                {activeItemsToPrint.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('calibration')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'calibration'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-600" />
              3. Printer Alignment (X / Y Offset)
            </button>
          </div>

          {/* Quick Print CTA in Header Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint('data-only')}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print on Hardcopy (Data Only)
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: VISUAL LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-5">
              
              {/* Preview Controls Bar */}
              <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Preview Mode:</span>
                  <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      onClick={() => setPreviewMode('overlay')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        previewMode === 'overlay'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Overlay Guide (Stationery + Red Parentheses)
                    </button>
                    <button
                      onClick={() => setPreviewMode('data-only')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        previewMode === 'data-only'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Print-Ready (Data Only to Printer)
                    </button>
                    <button
                      onClick={() => setPreviewMode('full')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        previewMode === 'full'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Full Form (For Blank Paper)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[11px]">
                    Paper: <strong>{config.paperSize.toUpperCase()}</strong> | Shift: X:{config.globalOffsetX}mm Y:{config.globalOffsetY}mm
                  </span>
                </div>
              </div>

              {/* Exact 1:1 Visual Receipt Canvas */}
              <div className="flex justify-center bg-slate-200/70 p-4 sm:p-6 rounded-2xl overflow-x-auto border border-slate-300">
                <div 
                  className={`bg-white border-2 border-slate-300 rounded-lg p-8 w-full max-w-2xl min-h-[580px] shadow-lg relative font-sans text-slate-900 transition-all ${
                    previewMode === 'data-only' ? 'bg-white' : ''
                  }`}
                  style={{
                    fontFamily: config.fontFamily === 'times' ? 'Times New Roman, serif' : config.fontFamily === 'courier' ? 'Courier New, monospace' : 'inherit'
                  }}
                >
                  {/* Top Static Branding (Hidden in Data-Only preview) */}
                  {previewMode !== 'data-only' && (
                    <div className="text-center pt-1 mb-5 space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <div className="bg-red-700 text-white font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs tracking-widest uppercase shrink-0">
                          FFCSI
                        </div>
                        <h1 className="text-xl font-serif italic font-extrabold text-red-700">
                          Family Friends Consultancy Services Inc.
                        </h1>
                      </div>
                      <p className="text-[11px] text-slate-700"># 50-M Aguilar Street, Brgy. Bungad, Quezon City</p>
                      <p className="text-[11px] text-slate-700">Tel. No.: (632) 8713-1412</p>
                      <p className="text-[11px] text-slate-700">Email Add: ffcsi2019.acctg@gmail.com; ffcsi2018@gmail.com</p>

                      <div className="mt-3 font-extrabold text-sm tracking-widest uppercase border-t-2 border-b-2 border-slate-900 py-1 inline-block px-8">
                        COLLECTION RECEIPT
                      </div>
                    </div>
                  )}

                  {/* Top Dynamic Row: CLIENT / No. / Address / Date */}
                  <div className="space-y-2 text-xs font-bold pt-2 mb-4">
                    {/* Row 1: CLIENT & No. */}
                    <div className="grid grid-cols-12 gap-2 items-baseline">
                      <div className="col-span-8 flex items-baseline gap-1.5">
                        {previewMode !== 'data-only' && <span className="shrink-0 text-slate-800">CLIENT :</span>}
                        <span className={`flex-1 px-1 font-bold ${
                          previewMode === 'overlay' 
                            ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5' 
                            : 'text-slate-900 border-b border-slate-800'
                        }`}>
                          {previewMode === 'overlay' ? `( ${clientName} )` : clientName}
                        </span>
                      </div>
                      <div className="col-span-4 text-right flex items-center justify-end gap-1">
                        {previewMode !== 'data-only' && <span className="text-slate-800">No. :</span>}
                        <span className={`font-extrabold font-mono ${
                          previewMode === 'overlay' 
                            ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5' 
                            : 'text-red-600'
                        }`}>
                          {(() => {
                            const clean = crNumber.replace(/^(C\.?R\.?|CR|NO\.?)\s*#?\s*-?\s*/i, '').trim();
                            return previewMode === 'overlay' ? `( ${clean} )` : clean;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Address & Date */}
                    <div className="grid grid-cols-12 gap-2 items-baseline">
                      <div className="col-span-8 flex items-baseline gap-1.5">
                        {previewMode !== 'data-only' && <span className="shrink-0 text-slate-800">Address :</span>}
                        <span className={`flex-1 px-1 font-bold ${
                          previewMode === 'overlay' 
                            ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5' 
                            : 'text-slate-900 border-b border-slate-800'
                        }`}>
                          {previewMode === 'overlay' ? `( ${address} )` : address}
                        </span>
                      </div>
                      <div className="col-span-4 text-right flex items-center justify-end gap-1">
                        {previewMode !== 'data-only' && <span className="text-slate-800">Date :</span>}
                        <span className={`font-bold ${
                          previewMode === 'overlay' 
                            ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5' 
                            : 'text-slate-900'
                        }`}>
                          {previewMode === 'overlay' ? `( ${issueDate} )` : issueDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Table Box */}
                  <div className={`text-xs mt-4 ${
                    previewMode !== 'data-only' ? 'border-2 border-slate-900' : 'border border-dashed border-slate-200'
                  }`}>
                    {previewMode !== 'data-only' && (
                      <div className="grid grid-cols-12 border-b-2 border-slate-900 font-extrabold bg-slate-50 py-1.5 px-2 text-center text-xs">
                        <div className="col-span-8 border-r-2 border-slate-900">PARTICULARS</div>
                        <div className="col-span-4">AMOUNT</div>
                      </div>
                    )}

                    <div className="p-3 space-y-2 min-h-[140px]">
                      {previewMode !== 'data-only' && (
                        <p className="font-bold text-xs text-slate-900">Payment for the following:</p>
                      )}

                      {/* Render Adaptable Services */}
                      {activeItemsToPrint.map((srv, idx) => (
                        <div 
                          key={idx} 
                          className="grid grid-cols-12 text-xs font-bold pl-2 gap-2 items-center"
                          style={{ marginBottom: `${effectiveRowSpacing - 5}px` }}
                        >
                          <div className="col-span-5 text-slate-900">
                            <span className={previewMode === 'overlay' ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5' : 'text-slate-900'}>
                              {previewMode === 'overlay' ? `( ${srv.description} )` : srv.description}
                            </span>
                          </div>
                          <div className="col-span-3 text-center text-slate-700 font-medium">
                            {srv.monthYear && (
                              <span className={previewMode === 'overlay' ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5 font-bold' : 'text-slate-700 font-bold'}>
                                {previewMode === 'overlay' ? `( ${srv.monthYear} )` : srv.monthYear}
                              </span>
                            )}
                          </div>
                          <div className="col-span-4 text-right font-mono text-slate-900">
                            <span className={previewMode === 'overlay' ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5' : 'text-slate-900'}>
                              {previewMode === 'overlay' 
                                ? `( ${(srv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} )` 
                                : (srv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                              }
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Centered Billing Notes (e.g. Kindly Pay To FFCSI) */}
                      {billingNotes && billingNotes.trim() && (
                        <div 
                          className="grid grid-cols-12 text-xs font-bold pl-2 gap-2 items-center"
                          style={{ marginBottom: `${effectiveRowSpacing - 5}px` }}
                        >
                          <div className="col-span-8 text-center">
                            <span className={previewMode === 'overlay' ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5 font-bold' : 'text-slate-900 font-bold'}>
                              {previewMode === 'overlay' ? `( ${billingNotes.trim()} )` : billingNotes.trim()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Table TOTAL line */}
                    <div className={`grid grid-cols-12 font-bold p-2.5 items-center ${
                      previewMode !== 'data-only' ? 'border-t-2 border-slate-900 bg-slate-50' : 'border-t border-dashed border-slate-200'
                    }`}>
                      <div className="col-span-8 text-right pr-6 text-sm font-extrabold text-slate-900">
                        {previewMode !== 'data-only' ? 'TOTAL   ₱' : ''}
                      </div>
                      <div className="col-span-4 text-right text-sm font-extrabold font-mono">
                        <span className={previewMode === 'overlay' ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5' : 'text-slate-900'}>
                          {previewMode === 'overlay' 
                            ? `( PHP ${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} )` 
                            : `PHP ${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer 3 Columns */}
                  <div className={`p-3 grid grid-cols-3 gap-3 text-xs mt-4 ${
                    previewMode !== 'data-only' ? 'border-2 border-slate-900' : 'border border-dashed border-slate-200'
                  }`}>
                    <div className="space-y-1.5 font-bold text-slate-900">
                      {previewMode !== 'data-only' && <p>CHECK   : <span className="border-b border-slate-800 inline-block w-24"></span></p>}
                      {previewMode !== 'data-only' && <p>DATE      : <span className="border-b border-slate-800 inline-block w-24"></span></p>}
                      <p className="flex items-center gap-1">
                        {previewMode !== 'data-only' && <span>PREPARED BY : </span>}
                        <span className={previewMode === 'overlay' ? 'text-red-700 bg-red-50/80 ring-1 ring-red-300 rounded px-1.5' : 'text-slate-900 underline'}>
                          {previewMode === 'overlay' ? `( ${preparedBy} )` : preparedBy}
                        </span>
                      </p>
                    </div>

                    {previewMode !== 'data-only' && (
                      <div className="text-center space-y-6">
                        <p className="font-bold text-slate-900">BILLING RECEIVED BY</p>
                        <div>
                          <div className="border-b border-slate-800 w-36 mx-auto"></div>
                          <p className="text-[10px] text-slate-600 mt-0.5">Signature over Printed Name</p>
                        </div>
                      </div>
                    )}

                    {previewMode !== 'data-only' && (
                      <div className="text-center space-y-6">
                        <p className="font-bold text-slate-900">PAYMENT RECEIVED BY:</p>
                        <div>
                          <div className="border-b border-slate-800 w-36 mx-auto"></div>
                          <p className="text-[10px] text-slate-600 mt-0.5">Signature over Printed Name</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint('data-only')}
                    className="px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print on Hardcopy Stationery (Data Only)
                  </button>
                  <button
                    onClick={() => handleDownloadPdf('data-only')}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    Download Data-Only PDF
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint('full')}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    Print Full Form (Blank Paper)
                  </button>
                  <button
                    onClick={() => handleDownloadPdf('full')}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    Download Full PDF
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ADAPTABLE MULTI-SERVICE LINES */}
          {activeTab === 'services' && (
            <div className="space-y-5 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">Adaptable Multi-Service Line Manager</h4>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Select which service lines to print on this receipt, customize descriptions, or adjust line spacing so multi-item invoices fit within your physical form.
                  </p>
                </div>
              </div>

              {/* Service Line Items Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Receipt Service Line Items</h4>
                  <button
                    onClick={handleAddServiceLine}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Service Line
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {selectedServices.map((srv, index) => {
                    const isChecked = selectedIndices.includes(index);
                    return (
                      <div 
                        key={index}
                        className={`p-3.5 rounded-xl border transition-all grid grid-cols-12 gap-3 items-center ${
                          isChecked ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/50 border-slate-200 opacity-60'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="col-span-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleToggleService(index)}
                            className="text-slate-700 hover:text-emerald-600 cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        </div>

                        {/* Description */}
                        <div className="col-span-5">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            ( Item / Service Description )
                          </label>
                          <input
                            type="text"
                            value={srv.description}
                            onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                            placeholder="e.g. Monthly Accounting Retainer"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>

                        {/* Month / Year */}
                        <div className="col-span-3">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Month and Year
                          </label>
                          <input
                            type="text"
                            value={srv.monthYear || ''}
                            onChange={(e) => handleServiceChange(index, 'monthYear', e.target.value)}
                            placeholder="e.g. July 2026 or 2nd Qtr. 2026"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>

                        {/* Amount */}
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Amount (PHP)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={srv.amount}
                            onChange={(e) => handleServiceChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-right focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>

                        {/* Delete action */}
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => handleDeleteServiceLine(index)}
                            title="Delete this row"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Summary */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between font-bold">
                  <span className="text-slate-700">
                    Selected Items for Receipt ({activeItemsToPrint.length} rows):
                  </span>
                  <span className="text-base text-slate-900 font-mono">
                    Total: PHP {computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Hardcopy Notes / Remarks Box ⭐ */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Receipt Notes / Remarks (e.g. Kindly Pay To FFCSI)
                  </h4>
                  {billingNotes && (
                    <button
                      type="button"
                      onClick={() => setBillingNotes('')}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear Note
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  placeholder="e.g. Kindly Pay To FFCSI"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:ring-2 focus:ring-emerald-200"
                />
                <p className="text-[11px] text-slate-500">
                  This note prints centered directly in the open space below the service line items on your hardcopy receipt.
                </p>
              </div>

              {/* Adaptability Controls */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  Dynamic Spacing & Table Area Adaptability
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Auto-Fit Row Spacing:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="autoFitCheck"
                        checked={config.autoFitRowSpacing}
                        onChange={(e) => setConfig({ ...config, autoFitRowSpacing: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <label htmlFor="autoFitCheck" className="text-slate-700 font-medium cursor-pointer">
                        Dynamically scale row heights so multi-line services never collide with the TOTAL line
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700">Row Spacing Height:</label>
                      <span className="font-mono text-slate-500">{config.rowSpacingMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={12}
                      step={0.5}
                      value={config.rowSpacingMm}
                      onChange={(e) => setConfig({ ...config, rowSpacingMm: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700">Table Font Size:</label>
                      <span className="font-mono text-slate-500">{config.fontSizePt} pt</span>
                    </div>
                    <input
                      type="range"
                      min={7}
                      max={12}
                      step={0.5}
                      value={config.fontSizePt}
                      onChange={(e) => setConfig({ ...config, fontSizePt: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Font Family:</label>
                    <select
                      value={config.fontFamily}
                      onChange={(e) => setConfig({ ...config, fontFamily: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    >
                      <option value="helvetica">Helvetica / Standard Sans-Serif</option>
                      <option value="courier">Courier (Dot-Matrix Style)</option>
                      <option value="times">Times New Roman (Serif)</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PRINTER ALIGNMENT & PER-FIELD DYNAMIC CALIBRATION (MILLIMETERS) */}
          {activeTab === 'calibration' && (
            <div className="space-y-6 text-xs">
              
              {/* Calibration Header & Info */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-indigo-950 text-sm">Dynamic Printer Micro-Alignment Calibration (Millimeters)</h4>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono text-[10px] font-extrabold">
                        0.1 mm Precision
                      </span>
                    </div>
                    <p className="text-indigo-800 text-xs mt-0.5">
                      Adjust global shifts or fine-tune exact (X, Y) coordinates for each individual data field (Client Name, Address, C.R. No, Date, Columns, Total, etc.) to perfectly fit your pre-printed form.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => printCalibrationTestGridDirectly(config)}
                    className="px-3.5 py-2 bg-white hover:bg-indigo-100/80 border border-indigo-300 text-indigo-900 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Print a 10mm coordinate grid test sheet to measure physical feeder offsets"
                  >
                    <Grid className="w-4 h-4 text-indigo-600" />
                    <span>Print 10mm Test Grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyConfigJson}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Copy calibration JSON configuration profile to clipboard"
                  >
                    {copiedConfig ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Export Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 1. Global Offset Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Move className="w-4 h-4 text-indigo-600" />
                    Global Alignment Shift (All Form Elements)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Moves the entire document at once
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderCoordinateControl('Global Horizontal Shift (X Offset)', 'globalOffsetX', -30, 30, 0.5, 'mm', 0)}
                  {renderCoordinateControl('Global Vertical Shift (Y Offset)', 'globalOffsetY', -30, 30, 0.5, 'mm', 0)}
                </div>
              </div>

              {/* 2. Category Filter & Search for Per-Field Dynamic Calibration */}
              <div className="bg-slate-100 p-2.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'all', label: 'All Dynamic Info' },
                    { id: 'header', label: '1. Client & Header' },
                    { id: 'table', label: '2. Table Columns & Spacing' },
                    { id: 'footer', label: '3. Total, Notes & Signatory' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCalibCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        calibCategory === cat.id
                          ? 'bg-white text-indigo-900 shadow-2xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search info field..."
                      value={calibSearch}
                      onChange={(e) => setCalibSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-400 w-44"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION A: Client & Header Fields */}
              {(calibCategory === 'all' || calibCategory === 'header') && (!calibSearch || 'client name address date cr no'.includes(calibSearch.toLowerCase())) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-red-600" />
                      Client & Header Information Coordinates
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleResetSingleField(['clientNameX', 'clientNameY', 'clientAddressX', 'clientAddressY', 'crNoX', 'crNoY', 'dateX', 'dateY'])}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-bold"
                    >
                      Reset Header Group
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Client Name */}
                    {(!calibSearch || 'client name'.includes(calibSearch.toLowerCase())) && (
                      <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">CLIENT NAME ( Next to "CLIENT :" )</span>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">Default: X:36mm, Y:52mm</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {renderCoordinateControl('Client Name — X (Horizontal)', 'clientNameX', 0, 200, 0.5, 'mm', 36)}
                          {renderCoordinateControl('Client Name — Y (Vertical)', 'clientNameY', 0, 200, 0.5, 'mm', 52)}
                        </div>
                      </div>
                    )}

                    {/* Client Address */}
                    {(!calibSearch || 'client address'.includes(calibSearch.toLowerCase())) && (
                      <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">CLIENT ADDRESS ( Next to "Address :" )</span>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">Default: X:36mm, Y:59mm</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {renderCoordinateControl('Client Address — X (Horizontal)', 'clientAddressX', 0, 200, 0.5, 'mm', 36)}
                          {renderCoordinateControl('Client Address — Y (Vertical)', 'clientAddressY', 0, 200, 0.5, 'mm', 59)}
                        </div>
                      </div>
                    )}

                    {/* C.R. / Official Receipt No. */}
                    {(!calibSearch || 'cr number no receipt'.includes(calibSearch.toLowerCase())) && (
                      <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">RECEIPT NUMBER ( Next to "No. :" )</span>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">Default: X:182mm, Y:52mm</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {renderCoordinateControl('Receipt No. — X Position', 'crNoX', 50, 210, 0.5, 'mm', 182)}
                          {renderCoordinateControl('Receipt No. — Y Position', 'crNoY', 0, 200, 0.5, 'mm', 52)}
                        </div>
                      </div>
                    )}

                    {/* Issue Date */}
                    {(!calibSearch || 'date issue'.includes(calibSearch.toLowerCase())) && (
                      <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">PAYMENT / ISSUE DATE ( Next to "Date :" )</span>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">Default: X:182mm, Y:59mm</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {renderCoordinateControl('Issue Date — X Position', 'dateX', 50, 210, 0.5, 'mm', 182)}
                          {renderCoordinateControl('Issue Date — Y Position', 'dateY', 0, 200, 0.5, 'mm', 59)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION B: Table Columns, Start Y & Spacing */}
              {(calibCategory === 'all' || calibCategory === 'table') && (!calibSearch || 'table particulars month year amount spacing font'.includes(calibSearch.toLowerCase())) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Table Columns & Service Line Item Coordinates
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleResetSingleField(['tableStartY', 'particularsDescX', 'monthYearX', 'amountX', 'rowSpacingMm', 'fontSizePt'])}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-bold"
                    >
                      Reset Table Group
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Table Start Top Y */}
                    {renderCoordinateControl('Table First Row Start — Top Y', 'tableStartY', 40, 150, 0.5, 'mm', 82)}

                    {/* Particulars Description Column X */}
                    {renderCoordinateControl('Particulars / Description — Column X', 'particularsDescX', 10, 100, 0.5, 'mm', 20)}

                    {/* Month & Year Column X */}
                    {renderCoordinateControl('Month and Year — Column X', 'monthYearX', 50, 160, 0.5, 'mm', 110)}

                    {/* Amount Column X */}
                    {renderCoordinateControl('Amount (PHP) — Right Anchor X', 'amountX', 120, 210, 0.5, 'mm', 188)}

                    {/* Row Spacing */}
                    {renderCoordinateControl('Row Spacing Height', 'rowSpacingMm', 4, 15, 0.5, 'mm', 7)}

                    {/* Table Font Size */}
                    {renderCoordinateControl('Table Font Size', 'fontSizePt', 6, 14, 0.5, 'pt', 9.5)}
                  </div>
                </div>
              )}

              {/* SECTION C: Total, Remarks Notes & Signatory */}
              {(calibCategory === 'all' || calibCategory === 'footer') && (!calibSearch || 'total amount notes remarks prepared signatory'.includes(calibSearch.toLowerCase())) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      Total Amount, Billing Notes & Signatories
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleResetSingleField(['totalAmountX', 'totalAmountY', 'preparedByX', 'preparedByY', 'billingNotesXOffset', 'billingNotesYOffset'])}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-bold"
                    >
                      Reset Totals Group
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Total Amount */}
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">TOTAL AMOUNT ( Next to "TOTAL ₱" )</span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">Default: X:188mm, Y:142mm</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderCoordinateControl('Total Amount — Right Anchor X', 'totalAmountX', 120, 210, 0.5, 'mm', 188)}
                        {renderCoordinateControl('Total Amount — Baseline Y', 'totalAmountY', 100, 220, 0.5, 'mm', 142)}
                      </div>
                    </div>

                    {/* Prepared By Signatory */}
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">PREPARED BY ( Next to "PREPARED BY :" )</span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">Default: X:42mm, Y:168mm</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderCoordinateControl('Prepared By — X Position', 'preparedByX', 10, 100, 0.5, 'mm', 42)}
                        {renderCoordinateControl('Prepared By — Y Position', 'preparedByY', 120, 250, 0.5, 'mm', 168)}
                      </div>
                    </div>

                    {/* Notes Box Micro Offset */}
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">RECEIPT NOTES / REMARKS (e.g. Kindly Pay To FFCSI)</span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">Fine-tune note offset in table space</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderCoordinateControl('Notes Horizontal Micro Offset (X)', 'billingNotesXOffset', -40, 40, 0.5, 'mm', 0)}
                        {renderCoordinateControl('Notes Vertical Micro Offset (Y)', 'billingNotesYOffset', -20, 20, 0.5, 'mm', 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paper Format Selection */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Paper Stationery Format</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'a4', label: 'A4 (210 × 297 mm)', desc: 'Standard CPA Form Format' },
                    { id: 'letter', label: 'Letter (8.5 × 11 in)', desc: 'Short Bond Paper' },
                    { id: 'half-letter', label: 'Half-Letter (5.5 × 8.5 in)', desc: 'Continuous Dot-Matrix Size' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setConfig({ ...config, paperSize: p.id as any })}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        config.paperSize === p.id
                          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-bold text-slate-900">{p.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save & Reset Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetCalibration}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Reset All Factory Defaults
                </button>

                <div className="flex items-center gap-2">
                  {savedSuccess && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 animate-pulse">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Saved as Default Calibration!
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCalibration}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Default Calibration Profile
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Document: <strong>FFCSI Collection Receipt</strong> • Ref: <span className="font-mono font-bold text-red-600">{crNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => handlePrint('data-only')}
              className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print on Hardcopy Stationery (Data Only)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
