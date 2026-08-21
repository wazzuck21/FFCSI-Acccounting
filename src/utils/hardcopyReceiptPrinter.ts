import jsPDF from 'jspdf';
import { InvoiceItem, InvoiceServiceLine } from '../types';

export interface HardcopyPrintConfig {
  paperSize: 'letter' | 'a4' | 'half-letter';
  orientation: 'portrait';
  
  // Global printer alignment offsets (in mm)
  globalOffsetX: number; // -30mm to +30mm
  globalOffsetY: number; // -30mm to +30mm
  
  // 1. Client Header Information (in mm)
  clientNameX: number;
  clientNameY: number;
  clientNameFontSize?: number;

  clientAddressX: number;
  clientAddressY: number;
  clientAddressFontSize?: number;

  crNoX: number;
  crNoY: number;
  crNoFontSize?: number;

  dateX: number;
  dateY: number;
  dateFontSize?: number;
  
  // 2. Table dynamic service lines & columns (in mm)
  tableStartY: number;
  particularsDescX: number;
  monthYearX: number;
  amountX: number;
  rowSpacingMm: number; // default 7mm
  fontSizePt: number; // default 9.5pt
  fontFamily: 'courier' | 'helvetica' | 'times';
  fontBold: boolean;

  // Notes box alignment
  billingNotesXOffset?: number;
  billingNotesYOffset?: number;
  
  // Adaptable multi-service configuration
  autoFitRowSpacing: boolean;
  maxTableHeightMm: number; // default 55mm
  
  // 3. Total & Footer Signatories (in mm)
  totalAmountX: number;
  totalAmountY: number;
  totalAmountFontSize?: number;

  preparedByX: number;
  preparedByY: number;
  preparedByFontSize?: number;

  checkNoX?: number;
  checkNoY?: number;
  checkDateX?: number;
  checkDateY?: number;

  receivedByX?: number;
  receivedByY?: number;
  paymentReceivedByX?: number;
  paymentReceivedByY?: number;
}

export const DEFAULT_HARDCOPY_CONFIG: HardcopyPrintConfig = {
  paperSize: 'a4',
  orientation: 'portrait',
  globalOffsetX: 0,
  globalOffsetY: 0,
  
  // Header fields
  clientNameX: 36,     // Next to "CLIENT :"
  clientNameY: 52,
  clientNameFontSize: 9.5,

  clientAddressX: 36,  // Next to "Address :"
  clientAddressY: 59,
  clientAddressFontSize: 9.5,

  crNoX: 182,          // Next to "No. :" (Right aligned / anchored)
  crNoY: 52,
  crNoFontSize: 10.5,

  dateX: 182,          // Next to "Date :" (Right aligned / anchored)
  dateY: 59,
  dateFontSize: 9.5,
  
  // Table dynamic area
  tableStartY: 82,     // First service row Y (below "Payment for the following:")
  particularsDescX: 20,
  monthYearX: 110,
  amountX: 188,        // Right aligned
  rowSpacingMm: 7,     // 7mm per row
  fontSizePt: 9.5,
  fontFamily: 'helvetica',
  fontBold: true,
  billingNotesXOffset: 0,
  billingNotesYOffset: 0,
  
  // Adaptability
  autoFitRowSpacing: true,
  maxTableHeightMm: 52,
  
  // Total & Preparer
  totalAmountX: 188,    // Right aligned next to "TOTAL ₱"
  totalAmountY: 142,
  totalAmountFontSize: 10,

  preparedByX: 42,      // Next to "PREPARED BY :"
  preparedByY: 168,
  preparedByFontSize: 9,

  checkNoX: 28,
  checkNoY: 156,
  checkDateX: 28,
  checkDateY: 161,

  receivedByX: 85,
  receivedByY: 168,
  paymentReceivedByX: 145,
  paymentReceivedByY: 168,
};

const STORAGE_KEY = 'afms_hardcopy_receipt_printer_config';

export function getHardcopyPrintConfig(): HardcopyPrintConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_HARDCOPY_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to load hardcopy print config:', e);
  }
  return DEFAULT_HARDCOPY_CONFIG;
}

export function saveHardcopyPrintConfig(config: HardcopyPrintConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save hardcopy print config:', e);
  }
}

export function resetHardcopyPrintConfig(): HardcopyPrintConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset hardcopy print config:', e);
  }
  return DEFAULT_HARDCOPY_CONFIG;
}

export interface GenerateReceiptPdfOptions {
  mode: 'data-only' | 'full';
  config?: HardcopyPrintConfig;
  preparedBy?: string;
  clientAddress?: string;
  customServices?: InvoiceServiceLine[];
  overrideCrNo?: string;
  overrideDate?: string;
  customTotal?: number;
}

/**
 * Generates jsPDF instance for FFCSI Collection Receipt
 * - 'data-only': Prints ONLY the dynamic items corresponding to the red parentheses onto pre-printed stationery.
 * - 'full': Prints full form including FFCSI branding, labels, boxes, and underlines for blank paper.
 */
export function createHardcopyReceiptDoc(
  inv: InvoiceItem,
  options: GenerateReceiptPdfOptions
): jsPDF {
  const cfg = options.config || getHardcopyPrintConfig();
  const isDataOnly = options.mode === 'data-only';

  const doc = new jsPDF({
    orientation: cfg.orientation,
    unit: 'mm',
    format: cfg.paperSize === 'letter' ? [215.9, 279.4] : cfg.paperSize === 'half-letter' ? [139.7, 215.9] : 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const rightX = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;

  // Offsets
  const ox = cfg.globalOffsetX || 0;
  const oy = cfg.globalOffsetY || 0;

  // Dynamic Data Values
  const crNo = options.overrideCrNo || inv.collectionReceiptNumber || inv.collectionNumber || inv.officialReceiptNumber || inv.invoiceNumber || '1001';
  const cleanCrNo = crNo.replace(/^(C\.?R\.?|CR|NO\.?)\s*#?\s*-?\s*/i, '').trim() || crNo.replace(/\D/g, '') || crNo;
  const displayDate = options.overrideDate || inv.paymentDate || inv.issueDate || new Date().toLocaleDateString('en-US');
  const preparedBy = options.preparedBy || 'Maricris';
  const clientAddress = options.clientAddress || (inv as any).clientAddress || 'Gen. Aguinaldo Hi-Way Panapaan V, Bacoor City';
  const servicesToPrint: InvoiceServiceLine[] = (options.customServices && options.customServices.length > 0)
    ? options.customServices
    : (inv.services && inv.services.length > 0)
      ? inv.services
      : [{ description: "Professional Retainer Fee", amount: inv.totalAmount, monthYear: inv.billingPeriod || '' }];

  const totalAmount = options.customTotal !== undefined
    ? options.customTotal
    : servicesToPrint.reduce((sum, s) => sum + (s.amount || 0), 0) || inv.paidAmount || inv.totalAmount || 0;

  // ==========================================
  // 1. FULL MODE: Draw Static Stationery
  // ==========================================
  if (!isDataOnly) {
    let y = 16;

    // 1 & 2. FFCSI Logo Badge before Family Friends Consultancy Services Inc. (Centered row)
    const badgeWidth = 18;
    const badgeHeight = 6.5;
    const companyName = 'Family Friends Consultancy Services Inc.';
    
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    const textWidth = doc.getTextWidth(companyName);
    const gap = 3;
    const totalHeaderWidth = badgeWidth + gap + textWidth;
    const startX = (pageWidth - totalHeaderWidth) / 2;

    // Draw FFCSI red badge
    doc.setFillColor(185, 28, 28);
    doc.roundedRect(startX, y - 4.8, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('FFCSI', startX + (badgeWidth / 2), y - 0.2, { align: 'center' });

    // Draw Company Title
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(185, 28, 28);
    doc.text(companyName, startX + badgeWidth + gap, y);

    // Address & Contact Information
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('# 50-M Aguilar Street, Brgy. Bungad, Quezon City', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('Tel. No.: (632) 8713-1412', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('Email Add: ffcsi2019.acctg@gmail.com; ffcsi2018@gmail.com', pageWidth / 2, y, { align: 'center' });

    // Document Title: COLLECTION RECEIPT
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('COLLECTION RECEIPT', pageWidth / 2, y, { align: 'center' });

    // Static Client Labels & Underlines
    y += 10;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('CLIENT :', margin, y);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.4);
    doc.line(margin + 18, y + 1, margin + 115, y + 1);

    doc.text('No.', rightX - 42, y);
    doc.text(':', rightX - 34, y);

    y += 7;
    doc.text('Address :', margin, y);
    doc.line(margin + 18, y + 1, margin + 115, y + 1);

    doc.text('Date', rightX - 42, y);
    doc.text(':', rightX - 34, y);

    // Static Particulars / Amount Table Box
    y += 8;
    const tableTopY = y;
    const colDividerX = margin + 120;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(margin, y, rightX, y); // Top border

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('PARTICULARS', margin + 45, y);
    doc.text('AMOUNT', rightX - 25, y, { align: 'center' });

    y += 3;
    doc.line(margin, y, rightX, y); // Header bottom border

    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment for the following:', margin + 2, y);

    // Table Frame Box Bottom & Dividers
    const tableBottomY = cfg.totalAmountY + oy - 4;
    doc.setLineWidth(0.5);
    doc.line(colDividerX, tableTopY, colDividerX, tableBottomY + 7);
    doc.line(margin, tableTopY, margin, tableBottomY + 7);
    doc.line(rightX, tableTopY, rightX, tableBottomY + 7);
    doc.line(margin, tableBottomY + 7, rightX, tableBottomY + 7);

    // TOTAL Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL   ₱', colDividerX - 12, cfg.totalAmountY + oy, { align: 'right' });

    // Footer 3-Column Boxes
    const footerStartY = cfg.preparedByY + oy - 8;
    doc.line(margin, footerStartY, rightX, footerStartY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CHECK   :', margin + 2, footerStartY + 6);
    doc.line(margin + 20, footerStartY + 6.5, margin + 55, footerStartY + 6.5);

    doc.text('DATE      :', margin + 2, footerStartY + 11);
    doc.line(margin + 20, footerStartY + 11.5, margin + 55, footerStartY + 11.5);

    doc.text('PREPARED BY :', margin + 2, footerStartY + 16);
    doc.line(margin + 26, footerStartY + 16.5, margin + 55, footerStartY + 16.5);

    // Middle Column
    const midX = margin + 65;
    doc.text('BILLING RECEIVED BY', midX, footerStartY + 6);
    doc.line(midX, footerStartY + 16, midX + 50, footerStartY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Signature over Printed Name', midX + 6, footerStartY + 20);

    // Right Column
    const rightColX = margin + 125;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('PAYMENT RECEIVED BY:', rightColX, footerStartY + 6);
    doc.line(rightColX, footerStartY + 16, rightColX + 50, footerStartY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Signature over Printed Name', rightColX + 6, footerStartY + 20);

    // Footer outline
    doc.rect(margin, footerStartY, contentWidth, 24);
  }

  // ==========================================
  // 2. DYNAMIC PARENTHESES DATA VALUES
  // (Printed in both modes at precise coordinates)
  // ==========================================

  doc.setTextColor(15, 23, 42); // Black/Navy ink
  doc.setFont(cfg.fontFamily || 'helvetica', cfg.fontBold ? 'bold' : 'normal');

  // 1. ( Client Name )
  doc.setFontSize(cfg.clientNameFontSize || cfg.fontSizePt || 9.5);
  doc.text(inv.clientName, cfg.clientNameX + ox, cfg.clientNameY + oy);

  // 2. ( Client Address )
  const addrParts = clientAddress.split(',');
  const addrLine1 = addrParts[0] || clientAddress;
  doc.setFontSize(cfg.clientAddressFontSize || cfg.fontSizePt || 9.5);
  doc.text(addrLine1.trim(), cfg.clientAddressX + ox, cfg.clientAddressY + oy);

  // 3. No. : ( CR / SOA Number )
  doc.setTextColor(220, 38, 38); // Red ink for receipt number
  doc.setFontSize(cfg.crNoFontSize || 10.5);
  doc.text(cleanCrNo, cfg.crNoX + ox, cfg.crNoY + oy, { align: 'left' });

  // 4. ( SOA Issue Date * )
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(cfg.dateFontSize || cfg.fontSizePt || 9.5);
  doc.text(displayDate, cfg.dateX + ox, cfg.dateY + oy, { align: 'left' });

  // 5, 6, 7. Table Dynamic Items:
  // - ( Item / Service Description )
  // - Month and Year
  // - Amount (PHP)
  let currentY = cfg.tableStartY + oy;

  // Calculate adaptable row spacing
  const count = Math.max(servicesToPrint.length, 1);
  let effectiveRowSpacing = cfg.rowSpacingMm;
  if (cfg.autoFitRowSpacing && count > 0) {
    const availableHeight = (cfg.totalAmountY + oy) - (cfg.tableStartY + oy) - 8;
    const maxSpacing = availableHeight / count;
    effectiveRowSpacing = Math.min(cfg.rowSpacingMm, Math.max(maxSpacing, 4.5));
  }

  // Dynamic font size adaptation if there are many rows
  let effectiveFontSize = cfg.fontSizePt;
  if (count >= 5 && effectiveFontSize > 8.5) {
    effectiveFontSize = 8.5;
  }
  doc.setFontSize(effectiveFontSize);

  servicesToPrint.forEach((srv) => {
    // Description (Left column under PARTICULARS)
    const desc = srv.description || 'Professional Accounting Fee';
    doc.text(desc, cfg.particularsDescX + ox, currentY);

    // Month and Year (Center column under PARTICULARS)
    if (srv.monthYear) {
      doc.text(srv.monthYear, cfg.monthYearX + ox, currentY);
    }

    // Amount (PHP) (Right column under AMOUNT)
    const amtStr = (srv.amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    doc.text(amtStr, cfg.amountX + ox, currentY, { align: 'right' });

    currentY += effectiveRowSpacing;
  });

  // Dynamic Notes / Remarks printed in open space under items (e.g. Kindly Pay To FFCSI)
  if (inv.billingNotes && inv.billingNotes.trim()) {
    doc.setFont(cfg.fontFamily || 'helvetica', 'bold');
    doc.setFontSize(Math.max(effectiveFontSize - 0.5, 8));
    const noteBaseX = (cfg.particularsDescX + (cfg.monthYearX || (cfg.particularsDescX + 50))) / 2;
    const notesX = noteBaseX + (cfg.billingNotesXOffset || 0);
    const notesY = currentY + (cfg.billingNotesYOffset || 0);
    doc.text(inv.billingNotes.trim(), notesX + ox, notesY, { align: 'center' });
    doc.setFont(cfg.fontFamily || 'helvetica', cfg.fontBold ? 'bold' : 'normal');
    doc.setFontSize(effectiveFontSize);
    currentY += effectiveRowSpacing;
  }

  // 8. ( Total Amount Billed: )
  doc.setFontSize(cfg.totalAmountFontSize || Math.max(effectiveFontSize, 9.5));
  doc.setFont(cfg.fontFamily || 'helvetica', 'bold');
  const totalFormatted = `PHP ${totalAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  doc.text(totalFormatted, cfg.totalAmountX + ox, cfg.totalAmountY + oy, { align: 'right' });

  // 9. ( User name ) -> PREPARED BY :
  doc.setFontSize(cfg.preparedByFontSize || cfg.fontSizePt || 9);
  doc.setFont(cfg.fontFamily || 'helvetica', cfg.fontBold ? 'bold' : 'normal');
  doc.text(preparedBy, cfg.preparedByX + ox, cfg.preparedByY + oy);

  return doc;
}

/**
 * Generates an alignment test calibration grid sheet with 5mm / 10mm rulers
 * to allow accurate ruler measurement on physical stationery.
 */
export function createCalibrationTestGridDoc(config?: HardcopyPrintConfig): jsPDF {
  const cfg = config || getHardcopyPrintConfig();
  const doc = new jsPDF({
    orientation: cfg.orientation,
    unit: 'mm',
    format: cfg.paperSize === 'letter' ? [215.9, 279.4] : cfg.paperSize === 'half-letter' ? [139.7, 215.9] : 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);

  // Draw 10mm grid
  for (let x = 10; x < pageWidth; x += 10) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(x, 0, x, pageHeight);
    doc.text(`${x}`, x + 0.5, 4);
  }

  for (let y = 10; y < pageHeight; y += 10) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(0, y, pageWidth, y);
    doc.text(`${y}`, 1, y - 0.5);
  }

  // Draw calibrated coordinate markers
  const ox = cfg.globalOffsetX || 0;
  const oy = cfg.globalOffsetY || 0;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);

  const markers = [
    { name: 'Client Name', x: cfg.clientNameX + ox, y: cfg.clientNameY + oy },
    { name: 'Address', x: cfg.clientAddressX + ox, y: cfg.clientAddressY + oy },
    { name: 'CR No.', x: cfg.crNoX + ox, y: cfg.crNoY + oy },
    { name: 'Date', x: cfg.dateX + ox, y: cfg.dateY + oy },
    { name: 'Table Start', x: cfg.particularsDescX + ox, y: cfg.tableStartY + oy },
    { name: 'Month/Year Col', x: cfg.monthYearX + ox, y: cfg.tableStartY + oy },
    { name: 'Amount Col', x: cfg.amountX + ox, y: cfg.tableStartY + oy },
    { name: 'Total Amount', x: cfg.totalAmountX + ox, y: cfg.totalAmountY + oy },
    { name: 'Prepared By', x: cfg.preparedByX + ox, y: cfg.preparedByY + oy },
  ];

  markers.forEach(m => {
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.3);
    // Draw crosshair
    doc.line(m.x - 3, m.y, m.x + 3, m.y);
    doc.line(m.x, m.y - 3, m.x, m.y + 3);
    doc.text(`• ${m.name} (${m.x.toFixed(1)}, ${m.y.toFixed(1)})`, m.x + 2, m.y - 1.5);
  });

  return doc;
}

export function printCalibrationTestGridDirectly(config?: HardcopyPrintConfig): void {
  const doc = createCalibrationTestGridDoc(config);
  doc.autoPrint({ variant: 'non-conform' });
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '1px';
  printIframe.style.height = '1px';
  printIframe.style.opacity = '0.01';
  printIframe.style.border = '0';
  
  printIframe.src = blobUrl;
  document.body.appendChild(printIframe);
  
  printIframe.onload = () => {
    setTimeout(() => {
      try {
        if (printIframe.contentWindow) {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        }
      } catch {
        // In sandboxed/cross-origin iframes, autoPrint embedded in PDF handles printing automatically upon load
      }
    }, 400);
  };

  setTimeout(() => {
    try {
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 60000);
}

/**
 * Downloads the Hardcopy Collection Receipt PDF
 */
export function downloadHardcopyReceiptPDF(
  inv: InvoiceItem,
  options: GenerateReceiptPdfOptions
): void {
  const doc = createHardcopyReceiptDoc(inv, options);
  const crNo = (options.overrideCrNo || inv.collectionReceiptNumber || inv.officialReceiptNumber || inv.invoiceNumber || '35428').replace(/\D/g, '');
  const cleanClient = inv.clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const modeSuffix = options.mode === 'data-only' ? 'STATIONERY_DATA_ONLY' : 'FULL';
  
  doc.save(`FFCSI_Receipt_${crNo}_${cleanClient}_${modeSuffix}.pdf`);
}

/**
 * Opens direct browser print dialog for the generated PDF
 */
export function printHardcopyReceiptDirectly(
  inv: InvoiceItem,
  options: GenerateReceiptPdfOptions
): void {
  const doc = createHardcopyReceiptDoc(inv, options);
  doc.autoPrint({ variant: 'non-conform' });
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '1px';
  printIframe.style.height = '1px';
  printIframe.style.opacity = '0.01';
  printIframe.style.border = '0';
  
  printIframe.src = blobUrl;
  document.body.appendChild(printIframe);
  
  printIframe.onload = () => {
    setTimeout(() => {
      try {
        if (printIframe.contentWindow) {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        }
      } catch {
        // In sandboxed/cross-origin iframes, autoPrint embedded in PDF handles printing automatically upon load
      }
    }, 400);
  };

  setTimeout(() => {
    try {
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 60000);
}
