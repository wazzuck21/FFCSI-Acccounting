import React, { useState, useEffect } from 'react';
import { 
  BillingTemplateConfig, 
  TemplateSectionKey,
  PaperSize,
  PaperOrientation,
  CustomBlockItem
} from '../types';
import { 
  getBillingTemplateConfig, 
  saveBillingTemplateConfig, 
  resetBillingTemplateConfig, 
  DEFAULT_BILLING_TEMPLATE_CONFIG,
  FFCSI_COLLECTION_RECEIPT_CONFIG,
  generateCustomizedInvoicePDF,
  generateFFCSICollectionReceiptPDF,
  replaceTokens
} from '../utils/billingTemplateUtils';
import { InvoiceItem } from '../types';
import { 
  X, 
  GripVertical, 
  MoveUp, 
  MoveDown, 
  Eye, 
  RotateCcw, 
  Check, 
  Download, 
  Printer, 
  Sparkles, 
  Sliders, 
  Palette, 
  FileText, 
  Building2, 
  Receipt, 
  PenTool, 
  Info,
  Type,
  Plus,
  Trash2,
  Maximize2,
  FileBox,
  Layers,
  Wand2
} from 'lucide-react';

interface CustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleInvoice?: InvoiceItem;
}

const SECTION_LABELS: Record<TemplateSectionKey, { title: string; desc: string; icon: string }> = {
  header: { 
    title: 'Firm Header & Company Name', 
    desc: 'Accounting firm branding, address, BIR TIN & SOA title',
    icon: '🏛️'
  },
  clientInfo: { 
    title: 'Billed To Client Card', 
    desc: 'Client name, ID, invoice issue date & payment due date',
    icon: '👤'
  },
  servicesTable: { 
    title: 'Services & Deliverables Table', 
    desc: 'List of accounting/tax services and amounts breakdown',
    icon: '📋'
  },
  totals: { 
    title: 'Financial Breakdown & Balance Due', 
    desc: 'Subtotal, 12% Output VAT, payments received & net balance',
    icon: '💰'
  },
  remittance: { 
    title: 'Payment Remittance Instructions', 
    desc: 'Bank deposit account details and payment terms note',
    icon: '🏦'
  },
  signatory: { 
    title: 'Authorized Signatory Line', 
    desc: 'Managing partner name, CPA title & signature line',
    icon: '✍️'
  },
  footnote: { 
    title: 'Footer Disclaimer Note', 
    desc: 'Legal disclaimer & official statement footnote',
    icon: '📄'
  },
  customText: {
    title: 'Custom Scratch Text Blocks',
    desc: 'User-created custom headings, paragraphs and tokens',
    icon: '📝'
  },
  customNote: {
    title: 'Custom Terms & Notice Block',
    desc: 'Special payment terms or client notes',
    icon: '🔖'
  }
};

const PAPER_SIZES: { id: PaperSize; name: string; dims: string; aspectPortrait: string }[] = [
  { id: 'a4', name: 'A4 Standard', dims: '210 x 297 mm', aspectPortrait: 'aspect-[210/297]' },
  { id: 'letter', name: 'US Letter', dims: '215.9 x 279.4 mm (8.5 x 11 in)', aspectPortrait: 'aspect-[215/279]' },
  { id: 'legal', name: 'US Legal', dims: '215.9 x 355.6 mm (8.5 x 14 in)', aspectPortrait: 'aspect-[215/355]' },
  { id: 'a5', name: 'A5 Half Sheet', dims: '148 x 210 mm', aspectPortrait: 'aspect-[148/210]' },
  { id: 'statement', name: 'Statement / Half Letter', dims: '139.7 x 215.9 mm (5.5 x 8.5 in)', aspectPortrait: 'aspect-[139/215]' },
];

const COLOR_PALETTES = [
  { name: 'Emerald CPA (Default)', hex: '#047857', bgClass: 'bg-emerald-600' },
  { name: 'Corporate Slate', hex: '#0f172a', bgClass: 'bg-slate-900' },
  { name: 'Royal Blue', hex: '#1d4ed8', bgClass: 'bg-blue-700' },
  { name: 'Midnight Navy', hex: '#1e1b4b', bgClass: 'bg-indigo-950' },
  { name: 'Burgundy Red', hex: '#881337', bgClass: 'bg-rose-900' },
  { name: 'Amber Gold', hex: '#b45309', bgClass: 'bg-amber-600' },
];

export const BillingTemplateCustomizerModal: React.FC<CustomizerModalProps> = ({
  isOpen,
  onClose,
  sampleInvoice
}) => {
  const [config, setConfig] = useState<BillingTemplateConfig>(getBillingTemplateConfig);
  const [activeTab, setActiveTab] = useState<'paper' | 'layout' | 'scratch' | 'branding' | 'content'>('paper');
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Custom Block Editor State
  const [newBlockType, setNewBlockType] = useState<CustomBlockItem['type']>('heading');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockContent, setNewBlockContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfig(getBillingTemplateConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Demo invoice for live preview canvas
  const previewInvoice: InvoiceItem = sampleInvoice || {
    id: 'INV-DEMO',
    invoiceNumber: 'SOA-2026-0881',
    clientId: 'CL-1002',
    clientName: 'ACME Global Trading Philippines Inc.',
    issueDate: '2026-08-01',
    dueDate: '2026-08-15',
    subtotal: 35000,
    vatAmount: 4200,
    totalAmount: 39200,
    paidAmount: 15000,
    status: 'Partially Paid',
    services: [
      { description: 'Monthly Retainer - BIR Tax Compliance & Filing (0619E, 1601EQ)', amount: 25000 },
      { description: 'Quarterly Financial Statement Preparation & Audit Review', amount: 10000 },
    ],
    officialReceiptNumber: 'OR-88214',
    paymentMethod: 'Bank Transfer (BDO)'
  };

  const handleSave = () => {
    saveBillingTemplateConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    if (confirm('Reset billing printable layout to firm default standard settings?')) {
      const reset = resetBillingTemplateConfig();
      setConfig(reset);
    }
  };

  // Build from scratch option
  const handleStartFromScratch = () => {
    if (confirm('Start from Scratch? This will clear all default sections and create a blank layout canvas for you to build completely custom blocks.')) {
      setConfig({
        ...config,
        isScratchTemplate: true,
        templateName: 'My Custom Scratch Layout',
        sectionOrder: ['header', 'customText', 'servicesTable', 'totals', 'signatory'],
        customBlocks: [
          {
            id: 'scratch-title',
            type: 'heading',
            title: 'STATEMENT OF ACCOUNT',
            content: 'Invoice #{invoiceNumber} for {clientName}',
            fontSize: 12,
            bold: true,
            align: 'left'
          },
          {
            id: 'scratch-terms',
            type: 'paragraph',
            title: 'Payment Terms',
            content: 'Total Billed: {totalAmount}. Balance Due: {balanceDue}. Payment due by {dueDate}.',
            fontSize: 9,
            bold: false,
            align: 'left'
          }
        ]
      });
      setActiveTab('scratch');
    }
  };

  const handleAddCustomBlock = () => {
    if (!newBlockContent && newBlockType !== 'divider') {
      alert('Please enter content for your custom block.');
      return;
    }
    const newBlock: CustomBlockItem = {
      id: `blk-${Date.now()}`,
      type: newBlockType,
      title: newBlockTitle || (newBlockType === 'heading' ? 'Heading' : 'Note'),
      content: newBlockContent,
      fontSize: newBlockType === 'heading' ? 11 : 9,
      bold: newBlockType === 'heading',
      align: 'left'
    };

    const updatedBlocks = [...(config.customBlocks || []), newBlock];
    let updatedSectionOrder = [...config.sectionOrder];
    if (!updatedSectionOrder.includes('customText')) {
      updatedSectionOrder.push('customText');
    }

    setConfig({
      ...config,
      customBlocks: updatedBlocks,
      sectionOrder: updatedSectionOrder
    });

    setNewBlockTitle('');
    setNewBlockContent('');
  };

  const handleDeleteCustomBlock = (id: string) => {
    const updated = (config.customBlocks || []).filter(b => b.id !== id);
    setConfig({ ...config, customBlocks: updated });
  };

  // Re-order drag and drop logic
  const handleMoveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= config.sectionOrder.length) return;
    const newOrder = [...config.sectionOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setConfig({ ...config, sectionOrder: newOrder });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSectionIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSectionIndex === null || draggedSectionIndex === index) return;
    handleMoveSection(draggedSectionIndex, index);
    setDraggedSectionIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedSectionIndex(null);
  };

  const handleDownloadTestPDF = () => {
    saveBillingTemplateConfig(config);
    if (config.templateName.includes('FFCSI') || config.firmName.includes('Family Friends')) {
      generateFFCSICollectionReceiptPDF(previewInvoice, { preparedBy: config.signatoryName || 'Maricris' });
    } else {
      generateCustomizedInvoicePDF(previewInvoice, config);
    }
  };

  const handleLoadFFCSIPreset = () => {
    setConfig(FFCSI_COLLECTION_RECEIPT_CONFIG);
    saveBillingTemplateConfig(FFCSI_COLLECTION_RECEIPT_CONFIG);
  };

  const handleLoadStandardPreset = () => {
    setConfig(DEFAULT_BILLING_TEMPLATE_CONFIG);
    saveBillingTemplateConfig(DEFAULT_BILLING_TEMPLATE_CONFIG);
  };

  const selectedPaperInfo = PAPER_SIZES.find(p => p.id === config.paperSize) || PAPER_SIZES[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Customizable Billing Printable Format & Paper Studio
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 font-mono text-[10px] rounded-full font-bold">
                  Paper Size + Scratch Builder
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set paper dimensions (A4, Letter, Legal, A5, Statement), orientation, or build custom layout from scratch.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartFromScratch}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Clear sections and build from blank template"
            >
              <Wand2 className="w-3.5 h-3.5" /> Start From Scratch
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Reset to default firm layout"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Sub-Header Tabs */}
        <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 overflow-x-auto text-xs font-bold shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('paper')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'paper' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileBox className="w-3.5 h-3.5 text-indigo-600" /> Paper Size & Orientation
            </button>

            <button
              onClick={() => setActiveTab('layout')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'layout' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GripVertical className="w-3.5 h-3.5 text-emerald-600" /> Drag & Drop Layout
            </button>

            <button
              onClick={() => setActiveTab('scratch')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'scratch' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" /> Custom Scratch Blocks ({config.customBlocks?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('branding')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'branding' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-amber-600" /> Firm Header & Colors
            </button>

            <button
              onClick={() => setActiveTab('content')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'content' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" /> Signatories & Remittance
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shrink-0">
            Paper: <strong className="text-slate-900">{config.paperSize.toUpperCase()}</strong> ({config.orientation})
          </div>
        </div>

        {/* Modal Main Grid: Editor Side (Left) vs Printable Canvas Side (Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50">
          
          {/* LEFT PANEL: Controls & Settings (5 cols) */}
          <div className="lg:col-span-5 p-5 border-r border-slate-200 overflow-y-auto space-y-5 bg-white">
            
            {/* Quick Template Preset Loader Banner */}
            <div className="p-3.5 bg-gradient-to-r from-red-50 via-amber-50 to-emerald-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-red-600" /> Target Printable Layout Presets:
                </span>
                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-200">
                  Image Replica Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                Instantly load pre-configured billing layouts including the <strong>Family Friends Collection Receipt (1:1 Replica)</strong> or standard CPA Statement of Account.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleLoadFFCSIPreset}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    config.templateName.includes('FFCSI') || config.firmName.includes('Family Friends')
                      ? 'bg-red-700 text-white border-red-800 shadow-xs ring-2 ring-red-200'
                      : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" /> FFCSI Collection Receipt (Image Replica)
                </button>
                <button
                  type="button"
                  onClick={handleLoadStandardPreset}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    !config.templateName.includes('FFCSI') && !config.firmName.includes('Family Friends')
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-200'
                      : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Standard CPA SOA
                </button>
              </div>
            </div>
            
            {/* TAB: PAPER SIZE & ORIENTATION */}
            {activeTab === 'paper' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 font-medium">
                  <strong>Paper & Page Format Configuration:</strong> Select the physical paper size and print orientation for generated PDF invoices and Statements of Account.
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-2">1. Select Paper Size</label>
                  <div className="space-y-2">
                    {PAPER_SIZES.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setConfig({ ...config, paperSize: p.id })}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          config.paperSize === p.id 
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{p.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{p.dims}</span>
                        </div>
                        {config.paperSize === p.id && (
                          <span className="p-1 bg-indigo-600 text-white rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-2">2. Page Orientation</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, orientation: 'portrait' })}
                      className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                        config.orientation === 'portrait' 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="text-lg block mb-1">📄</span>
                      Portrait (Vertical)
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, orientation: 'landscape' })}
                      className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                        config.orientation === 'landscape' 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="text-lg block mb-1">📜</span>
                      Landscape (Horizontal)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-800 mb-1">
                    <span>3. Print Margin Width (mm):</span>
                    <span className="font-mono text-emerald-700">{config.marginMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="25"
                    value={config.marginMm}
                    onChange={e => setConfig({ ...config, marginMm: Number(e.target.value) })}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: DRAG & DROP LAYOUT */}
            {activeTab === 'layout' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-bold">Drag and Drop Reordering</strong>
                    Drag any element block up or down to manually adjust its vertical sequence on the printed document.
                  </div>
                </div>

                <div className="space-y-2">
                  {config.sectionOrder.map((sectionKey, index) => {
                    const info = SECTION_LABELS[sectionKey] || { title: sectionKey, desc: 'Custom Block', icon: '🧩' };
                    return (
                      <div
                        key={sectionKey}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 bg-white border rounded-xl flex items-center justify-between gap-3 shadow-2xs transition-all ${
                          draggedSectionIndex === index 
                            ? 'border-emerald-500 bg-emerald-50/50 opacity-60 scale-98 ring-2 ring-emerald-500/20' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-1.5 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing rounded hover:bg-slate-100"
                            title="Drag to re-order"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="text-base select-none">{info.icon}</div>

                          <div>
                            <span className="font-bold text-slate-900 text-xs block">
                              {index + 1}. {info.title}
                            </span>
                            <span className="text-[11px] text-slate-500 leading-tight block">
                              {info.desc}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveSection(index, index - 1)}
                            className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded cursor-pointer"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === config.sectionOrder.length - 1}
                            onClick={() => handleMoveSection(index, index + 1)}
                            className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded cursor-pointer"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: BUILD FROM SCRATCH / CUSTOM BLOCKS */}
            {activeTab === 'scratch' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-medium">
                  <strong>Scratch Block Creator:</strong> Add custom headings, paragraphs, or note blocks. You can use dynamic variables in curly braces:
                  <div className="font-mono text-[11px] mt-1 text-blue-800 font-bold">
                    &#123;firmName&#125;, &#123;clientName&#125;, &#123;invoiceNumber&#125;, &#123;totalAmount&#125;, &#123;balanceDue&#125;, &#123;dueDate&#125;
                  </div>
                </div>

                {/* Form to Add New Custom Block */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Plus className="w-4 h-4 text-emerald-600" /> Create New Custom Block
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Block Type</label>
                      <select
                        value={newBlockType}
                        onChange={e => setNewBlockType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                      >
                        <option value="heading">Heading Title</option>
                        <option value="paragraph">Text Paragraph</option>
                        <option value="keyvalue">Key - Value Pair</option>
                        <option value="divider">Horizontal Line</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Title / Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Terms Note"
                        value={newBlockTitle}
                        onChange={e => setNewBlockTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Content / Message</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Total Billed: {totalAmount}. Balance due on {dueDate}."
                      value={newBlockContent}
                      onChange={e => setNewBlockContent(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCustomBlock}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Block To Layout
                  </button>
                </div>

                {/* List of Created Custom Blocks */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900">Your Scratch Blocks:</h4>
                  {(!config.customBlocks || config.customBlocks.length === 0) ? (
                    <p className="text-slate-400 italic text-xs">No custom scratch blocks added yet.</p>
                  ) : (
                    config.customBlocks.map((blk) => (
                      <div key={blk.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{blk.title || 'Untitled Block'}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                              {blk.type}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] font-mono mt-1 leading-tight">
                            {blk.content}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomBlock(blk.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Delete Block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: BRANDING & COLORS */}
            {activeTab === 'branding' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Accounting Firm Name *</label>
                  <input
                    type="text"
                    value={config.firmName}
                    onChange={e => setConfig({ ...config, firmName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Firm Subtitle / Specialization</label>
                  <input
                    type="text"
                    value={config.firmSubtitle}
                    onChange={e => setConfig({ ...config, firmSubtitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Firm Office Address</label>
                  <input
                    type="text"
                    value={config.firmAddress}
                    onChange={e => setConfig({ ...config, firmAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">BIR VAT Registered TIN</label>
                  <input
                    type="text"
                    value={config.firmTIN}
                    onChange={e => setConfig({ ...config, firmTIN: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-2">Accent Color Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {COLOR_PALETTES.map(p => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setConfig({ ...config, accentColor: p.hex })}
                        className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          config.accentColor === p.hex 
                            ? 'border-slate-900 ring-2 ring-slate-900/10 font-bold bg-slate-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${p.bgClass} shrink-0`} />
                        <span className="text-[10px] truncate text-slate-900">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Print Font Family</label>
                  <select
                    value={config.fontFamily}
                    onChange={e => setConfig({ ...config, fontFamily: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="helvetica">Helvetica (Clean Sans-Serif - Standard)</option>
                    <option value="times">Times New Roman (Formal Legal CPA Serif)</option>
                    <option value="courier">Courier (Monospaced Technical)</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB: CONTENT & SIGNATORIES */}
            {activeTab === 'content' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Authorized Signatory Name</label>
                  <input
                    type="text"
                    value={config.signatoryName}
                    onChange={e => setConfig({ ...config, signatoryName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Signatory Title</label>
                  <input
                    type="text"
                    value={config.signatoryTitle}
                    onChange={e => setConfig({ ...config, signatoryTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Bank Account Remittance Details</label>
                  <input
                    type="text"
                    value={config.bankAccountDetails}
                    onChange={e => setConfig({ ...config, bankAccountDetails: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Footer Footnote Text</label>
                  <input
                    type="text"
                    value={config.footnoteText}
                    onChange={e => setConfig({ ...config, footnoteText: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 italic"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Live Printable Paper Canvas Preview (7 cols) */}
          <div className="lg:col-span-7 p-6 overflow-y-auto flex flex-col items-center justify-start bg-slate-200/80">
            
            {/* Paper Format Status Ribbon */}
            <div className="w-full max-w-[560px] flex items-center justify-between mb-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-slate-700" /> Printable Paper Canvas Preview
              </span>
              <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-mono font-bold">
                {selectedPaperInfo.name} • {config.orientation.toUpperCase()} ({selectedPaperInfo.dims})
              </span>
            </div>

            {/* Paper Sheet Simulator with Aspect Ratio */}
            <div 
              className={`w-full max-w-[560px] bg-white rounded-lg shadow-2xl border border-slate-300 p-8 space-y-4 text-slate-900 transition-all relative select-none min-h-[620px] ${
                config.orientation === 'landscape' ? 'aspect-[297/210]' : selectedPaperInfo.aspectPortrait
              }`}
              style={{
                fontFamily: config.fontFamily === 'times' ? 'Georgia, serif' : config.fontFamily === 'courier' ? 'monospace' : 'ui-sans-serif, system-ui, sans-serif',
                padding: `${Math.max(16, config.marginMm * 1.5)}px`
              }}
            >
              {config.templateName.includes('FFCSI') || config.firmName.includes('Family Friends') ? (
                /* FFCSI Collection Receipt 1:1 Image Replica Preview */
                <div className="space-y-4 text-slate-900 text-xs">
                  {/* Header */}
                  <div className="text-center relative pt-1">
                    <div className="absolute left-0 top-1 bg-red-700 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-xs tracking-wider">
                      FFCSI
                    </div>
                    <h1 className="text-lg font-serif italic font-extrabold text-red-700">
                      Family Friends Consultancy Services Inc.
                    </h1>
                    <p className="text-[10px] text-slate-700 mt-1"># 50-M Aguilar Street, Brgy. Bungad, Quezon City</p>
                    <p className="text-[10px] text-slate-700">Tel. No.: (632) 8713-1412</p>
                    <p className="text-[10px] text-slate-700">Email Add: ffcsi2019.acctg@gmail.com; ffcsi2018@gmail.com</p>

                    <div className="mt-3 font-extrabold text-sm tracking-widest uppercase border-t border-b border-slate-800 py-0.5 inline-block px-6">
                      COLLECTION RECEIPT
                    </div>
                    <span className="absolute right-0 top-11 text-xs font-bold text-slate-900">
                      35428
                    </span>
                  </div>

                  {/* Client Details Underline Lines */}
                  <div className="grid grid-cols-12 gap-y-2 text-xs font-bold pt-1">
                    <div className="col-span-8 flex items-baseline gap-1.5">
                      <span className="shrink-0">CLIENT :</span>
                      <span className="border-b border-slate-700 flex-1 px-1 font-bold text-slate-900">{previewInvoice.clientName || 'Nasar Realty Devt. Corp'}</span>
                    </div>
                    <div className="col-span-4 text-right flex items-center justify-end gap-1">
                      <span>No.</span>
                      <span className="text-red-600 font-extrabold">: {previewInvoice.collectionReceiptNumber || previewInvoice.invoiceNumber || '35428'}</span>
                    </div>

                    <div className="col-span-8 flex items-baseline gap-1.5">
                      <span className="shrink-0">Address :</span>
                      <span className="border-b border-slate-700 flex-1 px-1 text-[11px] font-bold">Gen. Aguinaldo Hi-Way Panapaan V, Bacoor City</span>
                    </div>
                    <div className="col-span-4 text-right flex items-center justify-end gap-1">
                      <span>Date</span>
                      <span>: {previewInvoice.issueDate || '05/08/2026'}</span>
                    </div>
                  </div>

                  {/* Particulars & Amount Table Frame */}
                  <div className="border border-slate-900 text-xs mt-3">
                    <div className="grid grid-cols-12 border-b border-slate-900 font-bold bg-slate-50 py-1 px-2 text-center text-[11px]">
                      <div className="col-span-8 border-r border-slate-900">PARTICULARS</div>
                      <div className="col-span-4">AMOUNT</div>
                    </div>
                    <div className="p-2 space-y-2 min-h-[130px]">
                      <p className="font-bold text-[11px] text-slate-800">Payment for the following:</p>
                      {previewInvoice.services && previewInvoice.services.length > 0 ? (
                        previewInvoice.services.map((srv, idx) => (
                          <div key={idx} className="grid grid-cols-12 text-xs font-bold pl-3">
                            <div className="col-span-8">{srv.description}</div>
                            <div className="col-span-4 text-right font-mono">{srv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="grid grid-cols-12 text-xs font-bold pl-3">
                            <div className="col-span-8">W/Holding Tax ... for 2nd Qtr. 2026</div>
                            <div className="col-span-4 text-right font-mono">242.21</div>
                          </div>
                          <div className="grid grid-cols-12 text-xs font-bold pl-3">
                            <div className="col-span-8">Retainer's Fee for July 2026</div>
                            <div className="col-span-4 text-right font-mono">4,500.00</div>
                          </div>
                          <div className="grid grid-cols-12 text-xs font-bold pl-3">
                            <div className="col-span-8">Sales Tax</div>
                            <div className="col-span-4 text-right font-mono">0.00</div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-12 border-t border-slate-900 font-bold p-2 bg-slate-50 items-center">
                      <div className="col-span-8 text-right pr-4 text-xs font-extrabold">TOTAL   ₱</div>
                      <div className="col-span-4 text-right text-xs font-extrabold text-slate-900 font-mono">
                        PHP {previewInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Footer 3 Columns */}
                  <div className="border border-slate-900 p-2.5 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="space-y-1 font-bold">
                      <p>CHECK   : <span className="border-b border-slate-700 inline-block w-20"></span></p>
                      <p>DATE      : <span className="border-b border-slate-700 inline-block w-20"></span></p>
                      <p>PREPARED BY : <span className="underline">{config.signatoryName || 'Maricris'}</span></p>
                    </div>
                    <div className="text-center space-y-5">
                      <p className="font-bold">BILLING RECEIVED BY</p>
                      <div>
                        <div className="border-b border-slate-700 w-28 mx-auto"></div>
                        <p className="text-[9px] text-slate-500 mt-0.5">Signature over Printed Name</p>
                      </div>
                    </div>
                    <div className="text-center space-y-5">
                      <p className="font-bold">PAYMENT RECEIVED BY:</p>
                      <div>
                        <div className="border-b border-slate-700 w-28 mx-auto"></div>
                        <p className="text-[9px] text-slate-500 mt-0.5">Signature over Printed Name</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Render Standard Custom Order Sections Dynamically */
                config.sectionOrder.map((sectionKey) => {
                if (sectionKey === 'header') {
                  return (
                    <div key="header" className="pb-3 border-b-2" style={{ borderColor: config.accentColor }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="font-extrabold text-slate-900 leading-tight" style={{ fontSize: `${config.headerFontSize}px` }}>
                            {config.firmName}
                          </h1>
                          <p className="text-[11px] text-slate-500 font-medium">{config.firmSubtitle}</p>
                          <p className="text-[10px] text-slate-400">{config.firmAddress} • {config.firmTIN}</p>
                        </div>
                        <div className="text-right">
                          <h2 className="text-sm font-extrabold tracking-tight" style={{ color: config.accentColor }}>
                            STATEMENT OF ACCOUNT
                          </h2>
                          <p className="text-xs font-mono font-bold text-slate-900">{previewInvoice.invoiceNumber}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (sectionKey === 'clientInfo') {
                  return (
                    <div key="clientInfo" className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block">BILLED TO CLIENT:</span>
                        <strong className="text-slate-900 font-extrabold text-sm block mt-0.5">{previewInvoice.clientName}</strong>
                        <span className="text-[11px] text-slate-500">Client ID: {previewInvoice.clientId}</span>
                      </div>
                      <div className="text-right text-[11px] space-y-0.5">
                        <p className="text-slate-600">Issue Date: <strong className="text-slate-900">{previewInvoice.issueDate}</strong></p>
                        <p className="text-slate-600">Due Date: <strong className="text-slate-900">{previewInvoice.dueDate}</strong></p>
                        <p className="font-bold" style={{ color: config.accentColor }}>Status: {previewInvoice.status.toUpperCase()}</p>
                      </div>
                    </div>
                  );
                }

                if (sectionKey === 'servicesTable') {
                  return (
                    <div key="servicesTable" className="space-y-1.5 text-xs">
                      <div className="grid grid-cols-12 px-3 py-1.5 bg-slate-100 rounded-lg font-bold text-slate-700 text-[11px]">
                        <span className="col-span-5">ITEM / SERVICE DESCRIPTION</span>
                        <span className="col-span-4">MONTH AND YEAR</span>
                        <span className="col-span-3 text-right">AMOUNT (PHP)</span>
                      </div>
                      {previewInvoice.services.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 px-3 py-1.5 border-b border-slate-100 text-xs items-center">
                          <span className="col-span-5 font-medium text-slate-800">{item.description}</span>
                          <span className="col-span-4 font-medium text-slate-600">{item.monthYear || 'August 2026'}</span>
                          <span className="col-span-3 text-right font-mono font-bold text-slate-900">
                            ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }

                if (sectionKey === 'totals') {
                  const balance = previewInvoice.totalAmount - previewInvoice.paidAmount;
                  return (
                    <div key="totals" className="flex flex-col items-end text-xs space-y-1 pt-1">
                      <div className="flex justify-between w-64 text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono font-bold text-slate-900">₱{previewInvoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>

                      {config.showVatBreakdown && previewInvoice.vatAmount > 0 && (
                        <div className="flex justify-between w-64 text-slate-600">
                          <span>12% Output VAT:</span>
                          <span className="font-mono text-slate-900">₱{previewInvoice.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}

                      <div className="flex justify-between w-64 font-bold text-slate-900 pt-1 border-t border-slate-200">
                        <span>Total Amount Billed:</span>
                        <span className="font-mono text-sm">₱{previewInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex justify-between w-64 text-emerald-700 font-bold">
                        <span>Less Payments Received:</span>
                        <span className="font-mono">₱{previewInvoice.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex justify-between w-64 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-extrabold mt-1">
                        <span>Balance Due:</span>
                        <span className="font-mono text-sm">₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                }

                if (sectionKey === 'customText' || sectionKey === 'customNote') {
                  if (!config.customBlocks || config.customBlocks.length === 0) return null;
                  return (
                    <div key={sectionKey} className="space-y-2 my-2">
                      {config.customBlocks.map(blk => {
                        const parsed = replaceTokens(blk.content, previewInvoice, config);
                        if (blk.type === 'heading') {
                          return (
                            <h3 key={blk.id} className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                              {blk.title ? `${blk.title}: ` : ''}{parsed}
                            </h3>
                          );
                        } else if (blk.type === 'paragraph') {
                          return (
                            <p key={blk.id} className="text-xs text-slate-700 leading-normal">
                              {parsed}
                            </p>
                          );
                        } else if (blk.type === 'divider') {
                          return <hr key={blk.id} className="border-slate-300 my-2" />;
                        } else if (blk.type === 'keyvalue') {
                          return (
                            <div key={blk.id} className="flex gap-2 text-xs">
                              <span className="font-bold text-slate-900">{blk.title}:</span>
                              <span className="text-slate-700">{parsed}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                }

                if (sectionKey === 'remittance' && config.showRemittanceBox) {
                  return (
                    <div key="remittance" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
                      <strong className="text-slate-900 block font-bold">PAYMENT REMITTANCE INSTRUCTIONS:</strong>
                      <p className="text-slate-600">{config.remittanceText}</p>
                      <p className="font-mono font-bold text-slate-800">{config.bankAccountDetails}</p>
                    </div>
                  );
                }

                if (sectionKey === 'signatory' && config.showSignatory) {
                  return (
                    <div key="signatory" className="pt-3 flex justify-end text-xs">
                      <div className="text-center w-52 space-y-1">
                        <div className="h-5" />
                        <p className="font-extrabold text-slate-900 border-t border-slate-400 pt-1">
                          {config.signatoryName}
                        </p>
                        <p className="text-[11px] text-slate-500">{config.signatoryTitle}</p>
                      </div>
                    </div>
                  );
                }

                if (sectionKey === 'footnote' && config.showFootnote) {
                  return (
                    <div key="footnote" className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic text-center">
                      {config.footnoteText}
                    </div>
                  );
                }

                return null;
              })
            )}

            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTestPDF}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" /> Test Download {config.paperSize.toUpperCase()} PDF
            </button>

            {saveSuccess && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" /> Printable layout and paper settings saved!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Custom Layout & Paper Size
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
