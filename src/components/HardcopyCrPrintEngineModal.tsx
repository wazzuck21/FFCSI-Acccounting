import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { 
  X, 
  Printer, 
  Download, 
  Sliders, 
  Crosshair, 
  RotateCcw, 
  Save, 
  Check, 
  Eye, 
  EyeOff, 
  Grid, 
  Layers, 
  Move, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  Info, 
  FileText, 
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Settings2
} from 'lucide-react';
import { InvoiceItem } from '../types';

export interface HardcopyAlignmentConfig {
  // Paper & Preset
  presetName: string;
  paperSize: 'half_letter' | 'a5' | 'letter' | 'a4' | 'continuous_custom';
  paperWidthMm: number; // e.g. 139.7 (5.5") or 215.9 (8.5") or 148 (A5)
  paperHeightMm: number; // e.g. 215.9 (8.5") or 139.7 (5.5") or 210 (A5)
  orientation: 'portrait' | 'landscape';
  printMode: 'preprinted_overlay' | 'full_document' | 'calibration_grid';

  // Master Alignment Offsets (in mm)
  masterOffsetX_mm: number; // Left/Right shift (-40 to +40mm)
  masterOffsetY_mm: number; // Top/Bottom shift (-40 to +40mm)

  // Header & Info Coordinates (in mm) - X & Y Axes
  datePosX_mm: number;
  datePosY_mm: number;
  crNoPosX_mm: number;
  crNoPosY_mm: number;
  
  clientNamePosX_mm: number;
  clientNamePosY_mm: number;
  addressPosX_mm: number;
  addressPosY_mm: number;

  // Table Line Items Start & Pitch (in mm)
  tableStartY_mm: number;
  rowPitch_mm: number; // Line pitch / height per row
  descColX_mm: number;
  periodColX_mm: number;
  amountColX_mm: number;
  maxTableLines: number;

  // Totals, Payment & Signatory (in mm) - X & Y Axes
  totalAmountPosX_mm: number;
  totalAmountPosY_mm: number;
  paymentDetailsPosX_mm: number;
  paymentDetailsPosY_mm: number;
  signatoryPosX_mm: number;
  signatoryPosY_mm: number;

  // Font & Typography
  fontSize_pt: number;
  fontFamily: 'Courier' | 'Helvetica' | 'Times-Roman';
  fontWeight: 'bold' | 'normal';
  fontColor: string;

  // Visual Guides
  showGhostBackground: boolean;
  ghostOpacity: number;
  showRulerGrid: boolean;
  gridStepMm: number;
}

// Default Factory Presets
export const DEFAULT_HARDCOPY_PRESETS: Record<string, HardcopyAlignmentConfig> = {
  ffcsi_standard_booklet: {
    presetName: 'FFCSI Standard 2-Ply Booklet (5.5" x 8.5" Portrait)',
    paperSize: 'half_letter',
    paperWidthMm: 139.7,
    paperHeightMm: 215.9,
    orientation: 'portrait',
    printMode: 'preprinted_overlay',

    masterOffsetX_mm: 0,
    masterOffsetY_mm: 0,

    datePosX_mm: 98,
    datePosY_mm: 38,
    crNoPosX_mm: 98,
    crNoPosY_mm: 44,

    clientNamePosX_mm: 36,
    clientNamePosY_mm: 52,
    addressPosX_mm: 36,
    addressPosY_mm: 64,

    tableStartY_mm: 86,
    rowPitch_mm: 7.2,
    descColX_mm: 14,
    periodColX_mm: 72,
    amountColX_mm: 126,
    maxTableLines: 8,

    totalAmountPosX_mm: 126,
    totalAmountPosY_mm: 154,
    paymentDetailsPosX_mm: 14,
    paymentDetailsPosY_mm: 168,
    signatoryPosX_mm: 88,
    signatoryPosY_mm: 194,

    fontSize_pt: 10,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    fontColor: '#000000',

    showGhostBackground: true,
    ghostOpacity: 0.38,
    showRulerGrid: true,
    gridStepMm: 10,
  },
  dotmatrix_continuous: {
    presetName: 'Dot Matrix Continuous Form (8.5" x 5.5" Landscape)',
    paperSize: 'half_letter',
    paperWidthMm: 215.9,
    paperHeightMm: 139.7,
    orientation: 'landscape',
    printMode: 'preprinted_overlay',

    masterOffsetX_mm: 0,
    masterOffsetY_mm: 0,

    datePosX_mm: 160,
    datePosY_mm: 22,
    crNoPosX_mm: 160,
    crNoPosY_mm: 28,

    clientNamePosX_mm: 42,
    clientNamePosY_mm: 36,
    addressPosX_mm: 42,
    addressPosY_mm: 48,

    tableStartY_mm: 65,
    rowPitch_mm: 6.5,
    descColX_mm: 18,
    periodColX_mm: 110,
    amountColX_mm: 195,
    maxTableLines: 5,

    totalAmountPosX_mm: 195,
    totalAmountPosY_mm: 102,
    paymentDetailsPosX_mm: 18,
    paymentDetailsPosY_mm: 112,
    signatoryPosX_mm: 150,
    signatoryPosY_mm: 124,

    fontSize_pt: 10,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    fontColor: '#000000',

    showGhostBackground: true,
    ghostOpacity: 0.35,
    showRulerGrid: true,
    gridStepMm: 10,
  },
  standard_a5: {
    presetName: 'Standard A5 Sheet (148mm x 210mm Portrait)',
    paperSize: 'a5',
    paperWidthMm: 148,
    paperHeightMm: 210,
    orientation: 'portrait',
    printMode: 'preprinted_overlay',

    masterOffsetX_mm: 0,
    masterOffsetY_mm: 0,

    datePosX_mm: 102,
    datePosY_mm: 36,
    crNoPosX_mm: 102,
    crNoPosY_mm: 42,

    clientNamePosX_mm: 38,
    clientNamePosY_mm: 50,
    addressPosX_mm: 38,
    addressPosY_mm: 62,

    tableStartY_mm: 84,
    rowPitch_mm: 7.0,
    descColX_mm: 16,
    periodColX_mm: 76,
    amountColX_mm: 132,
    maxTableLines: 8,

    totalAmountPosX_mm: 132,
    totalAmountPosY_mm: 150,
    paymentDetailsPosX_mm: 16,
    paymentDetailsPosY_mm: 164,
    signatoryPosX_mm: 92,
    signatoryPosY_mm: 188,

    fontSize_pt: 10,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    fontColor: '#000000',

    showGhostBackground: true,
    ghostOpacity: 0.35,
    showRulerGrid: true,
    gridStepMm: 10,
  },
  full_plain_paper: {
    presetName: 'Full Document Replica (A4 / Letter Plain Paper)',
    paperSize: 'a4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    orientation: 'portrait',
    printMode: 'full_document',

    masterOffsetX_mm: 0,
    masterOffsetY_mm: 0,

    datePosX_mm: 140,
    datePosY_mm: 45,
    crNoPosX_mm: 140,
    crNoPosY_mm: 52,

    clientNamePosX_mm: 40,
    clientNamePosY_mm: 62,
    addressPosX_mm: 40,
    addressPosY_mm: 78,

    tableStartY_mm: 105,
    rowPitch_mm: 8.5,
    descColX_mm: 20,
    periodColX_mm: 105,
    amountColX_mm: 185,
    maxTableLines: 10,

    totalAmountPosX_mm: 185,
    totalAmountPosY_mm: 200,
    paymentDetailsPosX_mm: 20,
    paymentDetailsPosY_mm: 216,
    signatoryPosX_mm: 135,
    signatoryPosY_mm: 245,

    fontSize_pt: 10.5,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
    fontColor: '#0f172a',

    showGhostBackground: false,
    ghostOpacity: 0.2,
    showRulerGrid: false,
    gridStepMm: 10,
  }
};

// Helper: Convert number to Philippine Peso words
export function numberToPhilippineWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Pesos Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Million', 'Billion'];

  function convertGroup(num: number): string {
    let groupStr = '';
    const hundred = Math.floor(num / 100);
    const rest = num % 100;

    if (hundred > 0) {
      groupStr += `${units[hundred]} Hundred `;
    }

    if (rest > 0) {
      if (rest < 20) {
        groupStr += units[rest];
      } else {
        const ten = Math.floor(rest / 10);
        const unit = rest % 10;
        groupStr += tens[ten] + (unit > 0 ? `-${units[unit]}` : '');
      }
    }
    return groupStr.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  if (integerPart === 0 && decimalPart > 0) {
    return `${decimalPart}/100 Centavos Only`;
  }

  let words = '';
  let groupIdx = 0;
  let remaining = integerPart;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkWords = convertGroup(chunk);
      words = `${chunkWords} ${thousands[groupIdx]} ${words}`.trim();
    }
    remaining = Math.floor(remaining / 1000);
    groupIdx++;
  }

  words = words.trim();
  if (decimalPart > 0) {
    return `${words} & ${decimalPart}/100 Pesos Only`;
  } else {
    return `${words} Pesos Only`;
  }
}

// Helper to get saved calibration from localStorage
export const getSavedHardcopyConfig = (): HardcopyAlignmentConfig => {
  try {
    const saved = localStorage.getItem('ffcsi_cr_hardcopy_calibration');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_HARDCOPY_PRESETS.ffcsi_standard_booklet,
        ...parsed,
        totalAmountPosX_mm: parsed.totalAmountPosX_mm ?? parsed.amountColX_mm ?? 126,
        paymentDetailsPosX_mm: parsed.paymentDetailsPosX_mm ?? parsed.descColX_mm ?? 14,
      };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_HARDCOPY_PRESETS.ffcsi_standard_booklet };
};

// Generate jsPDF matching exact millimeter calibration
export const generateCalibratedHardcopyCrPDF = (
  invoice: InvoiceItem,
  config: HardcopyAlignmentConfig
): jsPDF => {
  const doc = new jsPDF({
    orientation: config.orientation,
    unit: 'mm',
    format: [config.paperWidthMm, config.paperHeightMm]
  });

  const offX = config.masterOffsetX_mm;
  const offY = config.masterOffsetY_mm;

  // Clean data values
  const crNo = invoice.collectionReceiptNumber || invoice.collectionNumber || invoice.officialReceiptNumber || invoice.invoiceNumber || '1001';
  const cleanCrNo = crNo.replace(/^(C\.?R\.?|CR|NO\.?)\s*#?\s*-?\s*/i, '').trim() || crNo;
  const displayDate = invoice.paymentDate || invoice.issueDate || new Date().toISOString().substring(0, 10);
  const formattedDate = new Date(displayDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const clientName = invoice.clientName || 'Client Name';
  const clientAddress = (invoice as any).clientAddress || 'Metro Manila, Philippines';
  const totalAmount = invoice.totalAmount || 0;
  const preparedBy = (invoice as any).preparedBy || 'Maricris';
  const paymentMethod = invoice.paymentMethod || 'Cash';
  const checkNo = (invoice as any).chequeNumber || (invoice as any).checkNo || '';
  const bankName = (invoice as any).bankName || '';

  const lineItems = (invoice.services && invoice.services.length > 0) 
    ? invoice.services 
    : [{ description: 'Professional Accounting Retainer Fee', monthYear: invoice.billingPeriod || '', amount: totalAmount }];

  // 1. If Full Document Mode, render the letterhead, boxes, and table borders
  if (config.printMode === 'full_document') {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(185, 28, 28);
    doc.text('Family Friends Consultancy Services Inc.', config.paperWidthMm / 2, 16 + offY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('# 50-M Aguilar Street, Brgy. Bungad, Quezon City | Tel: (632) 8713-1412', config.paperWidthMm / 2, 21 + offY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('COLLECTION RECEIPT', config.paperWidthMm / 2, 28 + offY, { align: 'center' });

    // Labels
    doc.setFontSize(8.5);
    doc.text('DATE:', (config.datePosX_mm - 14) + offX, config.datePosY_mm + offY);
    doc.text('C.R. NO.:', (config.crNoPosX_mm - 16) + offX, config.crNoPosY_mm + offY);
    doc.text('RECEIVED FROM:', 14 + offX, config.clientNamePosY_mm + offY);
    doc.text('ADDRESS:', 14 + offX, config.addressPosY_mm + offY);

    // Table Box
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.rect(12 + offX, config.tableStartY_mm - 6 + offY, config.paperWidthMm - 24, 6, 'S');
    doc.setFontSize(8);
    doc.text('PARTICULARS / DESCRIPTION', config.descColX_mm + offX, config.tableStartY_mm - 2 + offY);
    doc.text('PERIOD', config.periodColX_mm + offX, config.tableStartY_mm - 2 + offY);
    doc.text('AMOUNT (PHP)', config.amountColX_mm + offX, config.tableStartY_mm - 2 + offY, { align: 'right' });
  }

  // 2. If Calibration Grid Mode, render millimeter ticks & measurement boxes
  if (config.printMode === 'calibration_grid') {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.15);

    // 10mm grid lines
    for (let x = 0; x <= config.paperWidthMm; x += 10) {
      doc.line(x, 0, x, config.paperHeightMm);
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`${x}mm`, x + 0.5, 4);
    }
    for (let y = 0; y <= config.paperHeightMm; y += 10) {
      doc.line(0, y, config.paperWidthMm, y);
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`${y}mm`, 1, y - 0.5);
    }

    // Calibration Crosshair in center
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.4);
    doc.line(config.paperWidthMm / 2 - 10, config.paperHeightMm / 2, config.paperWidthMm / 2 + 10, config.paperHeightMm / 2);
    doc.line(config.paperWidthMm / 2, config.paperHeightMm / 2 - 10, config.paperWidthMm / 2, config.paperHeightMm / 2 + 10);
    doc.setFontSize(8);
    doc.setTextColor(239, 68, 68);
    doc.text('CENTER ALIGNMENT CROSSHAIR (50% X / 50% Y)', config.paperWidthMm / 2, config.paperHeightMm / 2 + 14, { align: 'center' });
  }

  // 3. Render Calibrated Text Elements (Always active in all modes)
  doc.setFont(config.fontFamily.toLowerCase(), config.fontWeight);
  doc.setFontSize(config.fontSize_pt);
  doc.setTextColor(config.fontColor);

  // Date
  doc.text(formattedDate, config.datePosX_mm + offX, config.datePosY_mm + offY);

  // Collection Receipt Number
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text(`#${cleanCrNo}`, config.crNoPosX_mm + offX, config.crNoPosY_mm + offY);

  // Client Info
  doc.setFont(config.fontFamily.toLowerCase(), config.fontWeight);
  doc.setTextColor(config.fontColor);
  doc.text(clientName, config.clientNamePosX_mm + offX, config.clientNamePosY_mm + offY);
  doc.text(clientAddress, config.addressPosX_mm + offX, config.addressPosY_mm + offY);

  // Particulars Table Rows
  doc.setFontSize(config.fontSize_pt);
  let curY = config.tableStartY_mm + offY;
  const itemsToPrint = lineItems.slice(0, config.maxTableLines);

  itemsToPrint.forEach((item) => {
    // Description
    doc.text(item.description || '', config.descColX_mm + offX, curY);
    // Period
    if (item.monthYear) {
      doc.text(item.monthYear, config.periodColX_mm + offX, curY);
    }
    // Amount (right aligned)
    const amtStr = (item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.text(amtStr, config.amountColX_mm + offX, curY, { align: 'right' });

    curY += config.rowPitch_mm;
  });

  // Total Amount
  doc.setFont('helvetica', 'bold');
  const totalAmountX = (config.totalAmountPosX_mm ?? config.amountColX_mm) + offX;
  doc.text(
    `PHP ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totalAmountX,
    config.totalAmountPosY_mm + offY,
    { align: 'right' }
  );

  // Payment Info
  doc.setFont(config.fontFamily.toLowerCase(), 'normal');
  doc.setFontSize(config.fontSize_pt * 0.9);
  const payStr = paymentMethod === 'Cheque' 
    ? `Cheque Payment: ${bankName} #${checkNo}` 
    : `Cash Payment - Received in Full`;
  const payX = (config.paymentDetailsPosX_mm ?? config.descColX_mm) + offX;
  doc.text(payStr, payX, config.paymentDetailsPosY_mm + offY);

  // Signatory
  doc.setFont('helvetica', 'bold');
  doc.text(preparedBy, config.signatoryPosX_mm + offX, config.signatoryPosY_mm + offY, { align: 'center' });

  return doc;
};

// Standalone direct print function for Pre-Printed Booklet Overlay
export const printHardcopyCrOverlay = (
  invoice: InvoiceItem,
  customConfig?: Partial<HardcopyAlignmentConfig>
) => {
  const baseConfig = getSavedHardcopyConfig();
  const config: HardcopyAlignmentConfig = {
    ...baseConfig,
    ...customConfig,
    printMode: 'preprinted_overlay'
  };

  const doc = generateCalibratedHardcopyCrPDF(invoice, config);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  let iframe = document.getElementById('ffcsi_hardcopy_cr_print_iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'ffcsi_hardcopy_cr_print_iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  iframe.src = blobUrl;
  iframe.onload = () => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch {
      window.open(blobUrl, '_blank');
    }
  };
};

interface Props {
  invoice: InvoiceItem;
  invoices?: InvoiceItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const HardcopyCrPrintEngineModal: React.FC<Props> = ({ invoice, invoices, isOpen, onClose }) => {
  const [activeInvoice, setActiveInvoice] = useState<InvoiceItem>(invoice);

  useEffect(() => {
    setActiveInvoice(invoice);
  }, [invoice]);

  const [config, setConfig] = useState<HardcopyAlignmentConfig>(() => getSavedHardcopyConfig());

  const [activeTab, setActiveTab] = useState<'positioning' | 'typography' | 'canvas_view' | 'presets'>('positioning');
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Clean data values
  const crNo = activeInvoice.collectionReceiptNumber || activeInvoice.collectionNumber || activeInvoice.officialReceiptNumber || activeInvoice.invoiceNumber || '1001';
  const cleanCrNo = crNo.replace(/^(C\.?R\.?|CR|NO\.?)\s*#?\s*-?\s*/i, '').trim() || crNo;
  const displayDate = activeInvoice.paymentDate || activeInvoice.issueDate || new Date().toISOString().substring(0, 10);
  const formattedDate = new Date(displayDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const clientName = activeInvoice.clientName || 'Client Name';
  const clientAddress = (activeInvoice as any).clientAddress || 'Metro Manila, Philippines';
  const totalAmount = activeInvoice.totalAmount || 0;
  const preparedBy = (activeInvoice as any).preparedBy || 'Maricris';
  const paymentMethod = activeInvoice.paymentMethod || 'Cash';
  const checkNo = (activeInvoice as any).chequeNumber || (activeInvoice as any).checkNo || '';
  const bankName = (activeInvoice as any).bankName || '';

  // Calculate actual line items
  const lineItems = (activeInvoice.services && activeInvoice.services.length > 0) 
    ? activeInvoice.services 
    : [{ description: 'Professional Accounting Retainer Fee', monthYear: activeInvoice.billingPeriod || '', amount: totalAmount }];

  // Save current config
  const handleSaveConfig = () => {
    localStorage.setItem('ffcsi_cr_hardcopy_calibration', JSON.stringify(config));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Reset to default preset
  const handleResetToPreset = (presetKey: string) => {
    if (DEFAULT_HARDCOPY_PRESETS[presetKey]) {
      const newCfg = { ...DEFAULT_HARDCOPY_PRESETS[presetKey] };
      setConfig(newCfg);
      localStorage.setItem('ffcsi_cr_hardcopy_calibration', JSON.stringify(newCfg));
    }
  };

  // Generate jsPDF matching exact millimeter calibration
  const generateCalibratedPDF = (forPrint = false): jsPDF => {
    return generateCalibratedHardcopyCrPDF(activeInvoice, config);
  };

  // Trigger Direct Print
  const handlePrint = () => {
    const doc = generateCalibratedPDF(true);
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // Use hidden iframe to trigger clean print dialogue without extra page headers
    let iframe = printIframeRef.current;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      printIframeRef.current = iframe;
    }

    iframe.src = blobUrl;
    iframe.onload = () => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (e) {
        window.open(blobUrl, '_blank');
      }
    };
  };

  // Download Calibrated PDF
  const handleDownloadPDF = () => {
    const doc = generateCalibratedPDF(false);
    const modeLabel = config.printMode === 'preprinted_overlay' ? 'Hardcopy_Overlay' : config.printMode === 'calibration_grid' ? 'Test_Grid' : 'Full_Replica';
    doc.save(`FFCSI_CR_${cleanCrNo}_${modeLabel}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl text-slate-800 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  Hardcopy Collection Receipt Alignment & Print Engine
                </h2>
                <span className="text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full uppercase">
                  Continuous & Booklet Feed
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Calibrate millimeter X-Y offsets for pre-printed BIR receipt booklets or continuous dot-matrix forms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveConfig}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                saveSuccess 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
              title="Save current calibration settings as default for this workstation"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5 text-slate-500" />}
              <span>{saveSuccess ? 'Saved Default' : 'Save Calibration'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Toolbar: Print Modes & Primary Actions */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Print Mode Selector Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, printMode: 'preprinted_overlay' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  config.printMode === 'preprinted_overlay'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Only prints text fields without background or boxes, intended for feeding pre-printed carbonless receipt forms"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Pre-Printed Booklet Overlay</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, printMode: 'full_document' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  config.printMode === 'full_document'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Prints full receipt including FFCSI letterhead, borders, labels, and text on plain paper"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Full Document Replica (Plain Paper)</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, printMode: 'calibration_grid' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  config.printMode === 'calibration_grid'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Prints millimeter ruler ticks and alignment crosshairs to measure your printer offset against your physical booklet"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Calibration Test Grid</span>
              </button>
            </div>

            {/* Optional Invoice / Client Switcher */}
            {invoices && invoices.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Receipt / Client:</span>
                <select
                  value={activeInvoice.id}
                  onChange={(e) => {
                    const found = invoices.find(inv => inv.id === e.target.value);
                    if (found) setActiveInvoice(found);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 max-w-[220px] truncate focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.collectionReceiptNumber || inv.officialReceiptNumber || inv.invoiceNumber} - {inv.clientName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02]"
              title="Send aligned output directly to printer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Calibrated CR</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              title="Download calibrated PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Main Content Body (Left Controls, Right Live Visual Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left Panel: Calibration Controls (5 cols) */}
          <div className="lg:col-span-5 border-r border-slate-200 flex flex-col bg-slate-50/50 overflow-y-auto max-h-[calc(95vh-160px)] p-4 space-y-4">
            
            {/* Control Tabs */}
            <div className="flex border-b border-slate-200 pb-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('positioning')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'positioning' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📐 X-Y Positioning
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('typography')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'typography' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔤 Font & Spacing
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'presets' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📋 Presets & Sizes
              </button>
            </div>

            {/* TAB 1: Master Positioning & Field Offsets */}
            {activeTab === 'positioning' && (
              <div className="space-y-4 text-xs">
                {/* Master Global Shifts */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Move className="w-3.5 h-3.5 text-red-600" />
                      Master Printer Offsets (Global Shift)
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, masterOffsetX_mm: 0, masterOffsetY_mm: 0 }))}
                      className="text-[10px] text-slate-500 hover:text-red-600 cursor-pointer font-bold"
                    >
                      Reset 0,0
                    </button>
                  </div>

                  {/* Master X Shift */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>Horizontal Shift (X Offset):</span>
                      <span className="font-mono text-red-700 font-bold">{config.masterOffsetX_mm >= 0 ? `+${config.masterOffsetX_mm}` : config.masterOffsetX_mm} mm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setConfig(p => ({ ...p, masterOffsetX_mm: Math.max(-40, p.masterOffsetX_mm - 0.5) }))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        -0.5
                      </button>
                      <input
                        type="range"
                        min="-30"
                        max="30"
                        step="0.5"
                        value={config.masterOffsetX_mm}
                        onChange={e => setConfig(p => ({ ...p, masterOffsetX_mm: parseFloat(e.target.value) || 0 }))}
                        className="flex-1 accent-red-600 cursor-pointer"
                      />
                      <button 
                        type="button"
                        onClick={() => setConfig(p => ({ ...p, masterOffsetX_mm: Math.min(40, p.masterOffsetX_mm + 0.5) }))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        +0.5
                      </button>
                    </div>
                  </div>

                  {/* Master Y Shift */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>Vertical Shift (Y Offset):</span>
                      <span className="font-mono text-red-700 font-bold">{config.masterOffsetY_mm >= 0 ? `+${config.masterOffsetY_mm}` : config.masterOffsetY_mm} mm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setConfig(p => ({ ...p, masterOffsetY_mm: Math.max(-40, p.masterOffsetY_mm - 0.5) }))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        -0.5
                      </button>
                      <input
                        type="range"
                        min="-30"
                        max="30"
                        step="0.5"
                        value={config.masterOffsetY_mm}
                        onChange={e => setConfig(p => ({ ...p, masterOffsetY_mm: parseFloat(e.target.value) || 0 }))}
                        className="flex-1 accent-red-600 cursor-pointer"
                      />
                      <button 
                        type="button"
                        onClick={() => setConfig(p => ({ ...p, masterOffsetY_mm: Math.min(40, p.masterOffsetY_mm + 0.5) }))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        +0.5
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table Line Items & Pitch Calibration */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Grid className="w-3.5 h-3.5 text-emerald-600" />
                    Particulars Table & Line Pitch
                  </span>

                  {/* Table Start Y */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>First Row Y-Position:</span>
                      <span className="font-mono text-slate-900 font-bold">{config.tableStartY_mm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      step="0.5"
                      value={config.tableStartY_mm}
                      onChange={e => setConfig(p => ({ ...p, tableStartY_mm: parseFloat(e.target.value) || 86 }))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Row Height / Pitch */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>Row Height / Pitch Spacing:</span>
                      <span className="font-mono text-slate-900 font-bold">{config.rowPitch_mm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="14"
                      step="0.2"
                      value={config.rowPitch_mm}
                      onChange={e => setConfig(p => ({ ...p, rowPitch_mm: parseFloat(e.target.value) || 7.2 }))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Amount Column X */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>Amount Column Right-Align X:</span>
                      <span className="font-mono text-slate-900 font-bold">{config.amountColX_mm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="210"
                      step="0.5"
                      value={config.amountColX_mm}
                      onChange={e => setConfig(p => ({ ...p, amountColX_mm: parseFloat(e.target.value) || 126 }))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Specific Field Offsets */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs">
                      Fine-Tune Section Coordinates (X & Y in mm)
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Millimeter Offsets</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Date */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-[11px]">📅 Date</span>
                        <span className="text-[10px] font-mono text-slate-500">X: {config.datePosX_mm}mm | Y: {config.datePosY_mm}mm</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">X Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.datePosX_mm} 
                            onChange={e => setConfig(p => ({ ...p, datePosX_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Y Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.datePosY_mm} 
                            onChange={e => setConfig(p => ({ ...p, datePosY_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* C.R. # */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-[11px]">🔢 C.R. # (Receipt Number)</span>
                        <span className="text-[10px] font-mono text-red-600 font-bold">X: {config.crNoPosX_mm}mm | Y: {config.crNoPosY_mm}mm</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">X Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.crNoPosX_mm} 
                            onChange={e => setConfig(p => ({ ...p, crNoPosX_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Y Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.crNoPosY_mm} 
                            onChange={e => setConfig(p => ({ ...p, crNoPosY_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Client Name */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-[11px]">🏢 Client Name (Received From)</span>
                        <span className="text-[10px] font-mono text-slate-500">X: {config.clientNamePosX_mm}mm | Y: {config.clientNamePosY_mm}mm</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">X Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.clientNamePosX_mm} 
                            onChange={e => setConfig(p => ({ ...p, clientNamePosX_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Y Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.clientNamePosY_mm} 
                            onChange={e => setConfig(p => ({ ...p, clientNamePosY_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-[11px]">📍 Client Address</span>
                        <span className="text-[10px] font-mono text-slate-500">X: {config.addressPosX_mm}mm | Y: {config.addressPosY_mm}mm</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">X Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.addressPosX_mm} 
                            onChange={e => setConfig(p => ({ ...p, addressPosX_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Y Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.addressPosY_mm} 
                            onChange={e => setConfig(p => ({ ...p, addressPosY_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-900 text-[11px]">💰 Total Amount</span>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold">X: {config.totalAmountPosX_mm}mm | Y: {config.totalAmountPosY_mm}mm</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-emerald-800 font-semibold block mb-0.5">X Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.totalAmountPosX_mm} 
                            onChange={e => setConfig(p => ({ ...p, totalAmountPosX_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-emerald-300 rounded font-mono text-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-emerald-800 font-semibold block mb-0.5">Y Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.totalAmountPosY_mm} 
                            onChange={e => setConfig(p => ({ ...p, totalAmountPosY_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-emerald-300 rounded font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Signatory */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-[11px]">✍️ Authorized Signatory</span>
                        <span className="text-[10px] font-mono text-slate-500">X: {config.signatoryPosX_mm}mm | Y: {config.signatoryPosY_mm}mm</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">X Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.signatoryPosX_mm} 
                            onChange={e => setConfig(p => ({ ...p, signatoryPosX_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Y Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.signatoryPosY_mm} 
                            onChange={e => setConfig(p => ({ ...p, signatoryPosY_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payment Remarks */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-[11px]">💳 Payment Remarks / Details</span>
                        <span className="text-[10px] font-mono text-slate-500">X: {config.paymentDetailsPosX_mm}mm | Y: {config.paymentDetailsPosY_mm}mm</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">X Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.paymentDetailsPosX_mm} 
                            onChange={e => setConfig(p => ({ ...p, paymentDetailsPosX_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Y Axis (mm):</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            value={config.paymentDetailsPosY_mm} 
                            onChange={e => setConfig(p => ({ ...p, paymentDetailsPosY_mm: parseFloat(e.target.value) || 0 }))} 
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Typography & Styling */}
            {activeTab === 'typography' && (
              <div className="space-y-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <span className="font-extrabold text-slate-900 text-xs">
                    Print Font & Text Weight
                  </span>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Font Family:</label>
                    <select
                      value={config.fontFamily}
                      onChange={e => setConfig(p => ({ ...p, fontFamily: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="Helvetica">Helvetica / Arial (Clean Modern)</option>
                      <option value="Courier">Courier (Monospace - Ideal for Dot Matrix)</option>
                      <option value="Times-Roman">Times New Roman (Classic Formal)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>Font Size:</span>
                      <span className="font-mono text-red-700 font-bold">{config.fontSize_pt} pt</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="14"
                      step="0.5"
                      value={config.fontSize_pt}
                      onChange={e => setConfig(p => ({ ...p, fontSize_pt: parseFloat(e.target.value) || 10 }))}
                      className="w-full accent-red-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.fontWeight === 'bold'}
                        onChange={e => setConfig(p => ({ ...p, fontWeight: e.target.checked ? 'bold' : 'normal' }))}
                        className="rounded text-red-600"
                      />
                      <span className="font-bold text-slate-800">Bold Text Output</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Presets & Paper Sizes */}
            {activeTab === 'presets' && (
              <div className="space-y-3 text-xs">
                <span className="font-extrabold text-slate-900 text-xs block">
                  Select Hardcopy Printer Preset
                </span>

                {Object.entries(DEFAULT_HARDCOPY_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleResetToPreset(key)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      config.presetName === preset.presetName
                        ? 'bg-red-50/80 border-red-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-xs">{preset.presetName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Dimensions: {preset.paperWidthMm}mm × {preset.paperHeightMm}mm ({preset.orientation})
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Visual Guide Toggles */}
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <span className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wider block">
                Visual Overlay Helpers
              </span>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.showGhostBackground}
                    onChange={e => setConfig(p => ({ ...p, showGhostBackground: e.target.checked }))}
                    className="rounded text-red-600"
                  />
                  <span>Show Pre-Printed Form Ghost</span>
                </label>
                {config.showGhostBackground && (
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={config.ghostOpacity}
                    onChange={e => setConfig(p => ({ ...p, ghostOpacity: parseFloat(e.target.value) || 0.35 }))}
                    className="w-20 accent-red-600 cursor-pointer"
                    title="Ghost Opacity"
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.showRulerGrid}
                    onChange={e => setConfig(p => ({ ...p, showRulerGrid: e.target.checked }))}
                    className="rounded text-red-600"
                  />
                  <span>Millimeter Grid Ticks (10mm)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Interactive Visual Canvas (7 cols) */}
          <div className="lg:col-span-7 bg-slate-200/70 p-4 flex flex-col items-center justify-center overflow-auto relative">
            
            {/* Zoom Controls */}
            <div className="absolute top-3 right-3 flex items-center bg-white/90 backdrop-blur-xs border border-slate-300 rounded-lg p-1 shadow-xs gap-1 z-20">
              <button
                type="button"
                onClick={() => setZoomScale(z => Math.max(0.6, z - 0.1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-700 px-1">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(z => Math.min(1.6, z + 0.1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Calibrated Document Canvas Frame */}
            <div
              style={{
                width: `${config.paperWidthMm * 3.7795 * zoomScale}px`,
                height: `${config.paperHeightMm * 3.7795 * zoomScale}px`,
                fontFamily: config.fontFamily === 'Courier' ? 'monospace' : config.fontFamily === 'Times-Roman' ? 'serif' : 'sans-serif',
              }}
              className="bg-white border-2 border-slate-400 shadow-2xl relative overflow-hidden transition-transform select-none"
            >
              {/* Millimeter Grid Overlay */}
              {config.showRulerGrid && (
                <div 
                  className="absolute inset-0 pointer-events-none opacity-25"
                  style={{
                    backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
                    backgroundSize: `${10 * 3.7795 * zoomScale}px ${10 * 3.7795 * zoomScale}px`
                  }}
                />
              )}

              {/* Ghost Pre-Printed Form Outline (Replica of physical booklet) */}
              {config.showGhostBackground && config.printMode !== 'full_document' && (
                <div 
                  className="absolute inset-0 pointer-events-none p-6 text-slate-900 border border-dashed border-red-300 flex flex-col justify-between"
                  style={{ opacity: config.ghostOpacity }}
                >
                  <div className="text-center">
                    <div className="font-serif italic font-bold text-base text-red-800">
                      Family Friends Consultancy Services Inc.
                    </div>
                    <div className="text-[8px] text-slate-600">#50-M Aguilar St., Bungad, QC • Tel: 8713-1412</div>
                    <div className="font-sans font-extrabold text-xs tracking-wider mt-1 text-slate-800">
                      COLLECTION RECEIPT
                    </div>
                  </div>

                  <div className="text-[9px] space-y-1.5 my-2">
                    <div className="flex justify-between border-b border-slate-300 pb-0.5">
                      <span>RECEIVED FROM: __________________________</span>
                      <span>DATE: __________</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-300 pb-0.5">
                      <span>ADDRESS: _________________________________</span>
                      <span>NO. <span className="text-red-600 font-bold">#</span>__________</span>
                    </div>
                  </div>

                  <div className="border border-slate-400 rounded text-[9px] h-36 flex flex-col">
                    <div className="grid grid-cols-12 bg-slate-100 font-bold border-b border-slate-400 px-1 py-0.5">
                      <div className="col-span-6">PARTICULARS</div>
                      <div className="col-span-3 text-center">PERIOD</div>
                      <div className="col-span-3 text-right">AMOUNT</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end text-[8px] mt-2 border-t border-slate-300 pt-1">
                    <div>Cash / Cheque Payment Info</div>
                    <div className="text-center">
                      <div className="w-28 border-b border-slate-400"></div>
                      <div>Authorized Signature</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Document Replica Frame (When in Plain Paper Mode) */}
              {config.printMode === 'full_document' && (
                <div className="absolute inset-0 pointer-events-none p-5 text-slate-900 flex flex-col">
                  <div className="text-center pb-2 border-b border-slate-200">
                    <div className="font-serif italic font-bold text-sm text-red-700">
                      Family Friends Consultancy Services Inc.
                    </div>
                    <div className="text-[7.5px] text-slate-600">#50-M Aguilar St., Bungad, Quezon City</div>
                    <div className="font-bold text-xs uppercase tracking-wider text-slate-900 mt-0.5">
                      COLLECTION RECEIPT
                    </div>
                  </div>
                </div>
              )}

              {/* CALIBRATED DYNAMIC PRINT TEXT OVERLAYS (Millimeter positioning) */}
              
              {/* Date */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(config.datePosX_mm + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                  top: `${(config.datePosY_mm + config.masterOffsetY_mm) * 3.7795 * zoomScale}px`,
                  fontSize: `${config.fontSize_pt * 1.333 * zoomScale}px`,
                  fontWeight: config.fontWeight,
                  color: config.fontColor,
                }}
                className="whitespace-nowrap font-sans font-bold"
              >
                {formattedDate}
              </div>

              {/* CR No */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(config.crNoPosX_mm + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                  top: `${(config.crNoPosY_mm + config.masterOffsetY_mm) * 3.7795 * zoomScale}px`,
                  fontSize: `${config.fontSize_pt * 1.333 * zoomScale}px`,
                  fontWeight: 'bold',
                }}
                className="whitespace-nowrap font-mono text-red-700 font-extrabold"
              >
                #{cleanCrNo}
              </div>

              {/* Client Name */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(config.clientNamePosX_mm + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                  top: `${(config.clientNamePosY_mm + config.masterOffsetY_mm) * 3.7795 * zoomScale}px`,
                  fontSize: `${config.fontSize_pt * 1.333 * zoomScale}px`,
                  fontWeight: config.fontWeight,
                  color: config.fontColor,
                }}
                className="whitespace-nowrap font-bold"
              >
                {clientName}
              </div>

              {/* Address */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(config.addressPosX_mm + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                  top: `${(config.addressPosY_mm + config.masterOffsetY_mm) * 3.7795 * zoomScale}px`,
                  fontSize: `${config.fontSize_pt * 1.2 * zoomScale}px`,
                  fontWeight: config.fontWeight,
                  color: config.fontColor,
                }}
                className="whitespace-nowrap max-w-[340px] truncate"
              >
                {clientAddress}
              </div>

              {/* Line Items Table Rows */}
              {lineItems.slice(0, config.maxTableLines).map((item, idx) => {
                const rowY = (config.tableStartY_mm + (idx * config.rowPitch_mm) + config.masterOffsetY_mm) * 3.7795 * zoomScale;
                return (
                  <React.Fragment key={idx}>
                    {/* Item Description */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(config.descColX_mm + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                        top: `${rowY}px`,
                        fontSize: `${config.fontSize_pt * 1.2 * zoomScale}px`,
                        fontWeight: config.fontWeight,
                        color: config.fontColor,
                      }}
                      className="whitespace-nowrap max-w-[180px] truncate"
                    >
                      {item.description}
                    </div>

                    {/* Period */}
                    {item.monthYear && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${(config.periodColX_mm + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                          top: `${rowY}px`,
                          fontSize: `${config.fontSize_pt * 1.15 * zoomScale}px`,
                          fontWeight: config.fontWeight,
                          color: config.fontColor,
                        }}
                        className="whitespace-nowrap"
                      >
                        {item.monthYear}
                      </div>
                    )}

                    {/* Amount */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(config.amountColX_mm + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                        top: `${rowY}px`,
                        fontSize: `${config.fontSize_pt * 1.25 * zoomScale}px`,
                        fontWeight: config.fontWeight,
                        color: config.fontColor,
                        transform: 'translateX(-100%)',
                      }}
                      className="whitespace-nowrap font-mono font-bold"
                    >
                      {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Total Amount */}
              <div
                style={{
                  position: 'absolute',
                  left: `${((config.totalAmountPosX_mm ?? config.amountColX_mm) + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                  top: `${(config.totalAmountPosY_mm + config.masterOffsetY_mm) * 3.7795 * zoomScale}px`,
                  fontSize: `${config.fontSize_pt * 1.35 * zoomScale}px`,
                  fontWeight: 'bold',
                  color: config.fontColor,
                  transform: 'translateX(-100%)',
                }}
                className="whitespace-nowrap font-mono font-extrabold"
              >
                PHP {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Payment Details */}
              <div
                style={{
                  position: 'absolute',
                  left: `${((config.paymentDetailsPosX_mm ?? config.descColX_mm) + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                  top: `${(config.paymentDetailsPosY_mm + config.masterOffsetY_mm) * 3.7795 * zoomScale}px`,
                  fontSize: `${config.fontSize_pt * 1.1 * zoomScale}px`,
                  color: config.fontColor,
                }}
                className="whitespace-nowrap text-[10px]"
              >
                {paymentMethod === 'Cheque' ? `Cheque: ${bankName} #${checkNo}` : '💵 Cash Payment'}
              </div>

              {/* Signatory */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(config.signatoryPosX_mm + config.masterOffsetX_mm) * 3.7795 * zoomScale}px`,
                  top: `${(config.signatoryPosY_mm + config.masterOffsetY_mm) * 3.7795 * zoomScale}px`,
                  fontSize: `${config.fontSize_pt * 1.25 * zoomScale}px`,
                  fontWeight: 'bold',
                  color: config.fontColor,
                  transform: 'translateX(-50%)',
                }}
                className="whitespace-nowrap font-bold"
              >
                {preparedBy}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Info className="w-4 h-4 text-slate-400" />
            <span>
              Tip: Print the <strong>Calibration Test Grid</strong> first and hold it against your pre-printed booklet to measure the exact millimeter offset.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleResetToPreset('ffcsi_standard_booklet')}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-semibold rounded-lg cursor-pointer transition-colors"
            >
              Reset to Standard FFCSI
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
