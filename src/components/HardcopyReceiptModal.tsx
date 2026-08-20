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
  FileText
} from 'lucide-react';
import { InvoiceItem, InvoiceServiceLine } from '../types';
import { 
  HardcopyPrintConfig, 
  getHardcopyPrintConfig, 
  saveHardcopyPrintConfig, 
  resetHardcopyPrintConfig,
  printHardcopyReceiptDirectly,
  downloadHardcopyReceiptPDF,
  createHardcopyReceiptDoc
} from '../utils/hardcopyReceiptPrinter';

interface HardcopyReceiptModalProps {
  invoice: InvoiceItem;
  clientAddress?: string;
  defaultPreparedBy?: string;
  onClose: () => void;
}

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

  // Preview display mode
  const [previewMode, setPreviewMode] = useState<'overlay' | 'data-only' | 'full'>('overlay');

  // Editable dynamic fields
  const [clientName, setClientName] = useState(invoice.clientName);
  const [address, setAddress] = useState(clientAddress);
  const [crNumber, setCrNumber] = useState(
    invoice.collectionReceiptNumber || invoice.officialReceiptNumber || invoice.collectionNumber || invoice.invoiceNumber || '35428'
  );
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
    if (confirm('Reset printer alignment and coordinates to factory defaults?')) {
      const def = resetHardcopyPrintConfig();
      setConfig(def);
    }
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
                    <div className="text-center relative pt-1 mb-5">
                      <div className="absolute left-0 top-1 bg-red-700 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-xs tracking-wider">
                        FFCSI
                      </div>
                      <h1 className="text-xl font-serif italic font-extrabold text-red-700">
                        Family Friends Consultancy Services Inc.
                      </h1>
                      <p className="text-[11px] text-slate-700 mt-1"># 50-M Aguilar Street, Brgy. Bungad, Quezon City</p>
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
                          {previewMode === 'overlay' ? `( ${crNumber} )` : crNumber}
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

          {/* TAB 3: PRINTER ALIGNMENT & CALIBRATION (X / Y OFFSET) */}
          {activeTab === 'calibration' && (
            <div className="space-y-5 text-xs">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
                <Sliders className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Printer Micro-Alignment Calibration (Millimeters)</h4>
                  <p className="text-indigo-700 text-xs mt-0.5">
                    Physical printers have slight feeder variations. Adjust these global and coordinate offsets so every printed value lands cleanly on your hardcopy underlines.
                  </p>
                </div>
              </div>

              {/* Global Offsets Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Move className="w-4 h-4 text-indigo-600" />
                  Global Alignment Shift (All Elements)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Global X */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-700">Horizontal Shift (X Offset):</label>
                      <span className="font-mono font-bold text-indigo-600">
                        {config.globalOffsetX > 0 ? `+${config.globalOffsetX}` : config.globalOffsetX} mm
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfig({ ...config, globalOffsetX: Number((config.globalOffsetX - 1).toFixed(1)) })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-mono font-bold cursor-pointer"
                      >
                        -1mm
                      </button>
                      <input
                        type="range"
                        min={-25}
                        max={25}
                        step={0.5}
                        value={config.globalOffsetX}
                        onChange={(e) => setConfig({ ...config, globalOffsetX: parseFloat(e.target.value) })}
                        className="flex-1 accent-indigo-600"
                      />
                      <button
                        onClick={() => setConfig({ ...config, globalOffsetX: Number((config.globalOffsetX + 1).toFixed(1)) })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-mono font-bold cursor-pointer"
                      >
                        +1mm
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">Negative shifts Left, Positive shifts Right</p>
                  </div>

                  {/* Global Y */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-700">Vertical Shift (Y Offset):</label>
                      <span className="font-mono font-bold text-indigo-600">
                        {config.globalOffsetY > 0 ? `+${config.globalOffsetY}` : config.globalOffsetY} mm
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfig({ ...config, globalOffsetY: Number((config.globalOffsetY - 1).toFixed(1)) })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-mono font-bold cursor-pointer"
                      >
                        -1mm
                      </button>
                      <input
                        type="range"
                        min={-25}
                        max={25}
                        step={0.5}
                        value={config.globalOffsetY}
                        onChange={(e) => setConfig({ ...config, globalOffsetY: parseFloat(e.target.value) })}
                        className="flex-1 accent-indigo-600"
                      />
                      <button
                        onClick={() => setConfig({ ...config, globalOffsetY: Number((config.globalOffsetY + 1).toFixed(1)) })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-mono font-bold cursor-pointer"
                      >
                        +1mm
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">Negative shifts Up, Positive shifts Down</p>
                  </div>
                </div>
              </div>

              {/* Paper Format Selection */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Paper Dimensions</h4>
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
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleResetCalibration}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Factory Defaults
                </button>

                <div className="flex items-center gap-2">
                  {savedSuccess && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Saved as Default!
                    </span>
                  )}
                  <button
                    onClick={handleSaveCalibration}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Default Calibration
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
