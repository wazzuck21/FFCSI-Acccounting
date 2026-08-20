import jsPDF from 'jspdf';
import { InvoiceItem, InvoiceServiceLine } from '../types';

export interface HardcopyPrintConfig {
  paperSize: 'letter' | 'a4' | 'half-letter';
  orientation: 'portrait';
  
  // Global printer alignment offsets (in mm)
  globalOffsetX: number; // -30mm to +30mm
  globalOffsetY: number; // -30mm to +30mm
  
  // Field positions (in mm)
  clientNameX: number;
  clientNameY: number;
  clientAddressX: number;
  clientAddressY: number;
  crNoX: number;
  crNoY: number;
  dateX: number;
  dateY: number;
  
  // Table area
  tableStartY: number;
  particularsDescX: number;
  monthYearX: number;
  amountX: number;
  rowSpacingMm: number; // default 7mm
  fontSizePt: number; // default 9.5pt
  fontFamily: 'courier' | 'helvetica' | 'times';
  fontBold: boolean;
  
  // Adaptable multi-service configuration
  autoFitRowSpacing: boolean;
  maxTableHeightMm: number; // default 55mm
  
  // Total & Footer
  totalAmountX: number;
  totalAmountY: number;
  preparedByX: number;
  preparedByY: number;
}

export const DEFAULT_HARDCOPY_CONFIG: HardcopyPrintConfig = {
  paperSize: 'a4',
  orientation: 'portrait',
  globalOffsetX: 0,
  globalOffsetY: 0,
  
  // Top fields
  clientNameX: 36,     // Next to "CLIENT :"
  clientNameY: 52,
  clientAddressX: 36,  // Next to "Address :"
  clientAddressY: 59,
  crNoX: 182,          // Next to "No. :" (Right aligned)
  crNoY: 52,
  dateX: 182,          // Next to "Date :" (Right aligned)
  dateY: 59,
  
  // Table dynamic area
  tableStartY: 82,     // First service row Y (below "Payment for the following:")
  particularsDescX: 20,
  monthYearX: 110,
  amountX: 188,        // Right aligned
  rowSpacingMm: 7,     // 7mm per row
  fontSizePt: 9.5,
  fontFamily: 'helvetica',
  fontBold: true,
  
  // Adaptability
  autoFitRowSpacing: true,
  maxTableHeightMm: 52,
  
  // Total & Preparer
  totalAmountX: 188,    // Right aligned next to "TOTAL ₱"
  totalAmountY: 142,
  preparedByX: 42,      // Next to "PREPARED BY :"
  preparedByY: 168,
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
  const crNo = options.overrideCrNo || inv.collectionReceiptNumber || inv.collectionNumber || inv.officialReceiptNumber || inv.invoiceNumber || '35428';
  const cleanCrNo = crNo.replace(/\D/g, '') || crNo;
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
    let y = 15;

    // FFCSI Red Logo Pill
    doc.setFillColor(185, 28, 28);
    doc.roundedRect(margin, y, 24, 12, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('FFCSI', margin + 12, y + 8, { align: 'center' });

    // Company Title (Red Serif / Italic)
    doc.setFont('times', 'italic');
    doc.setFontSize(18);
    doc.setTextColor(185, 28, 28);
    doc.text('Family Friends Consultancy Services Inc.', margin + 27, y + 8);

    // Address & Contact Information
    y += 15;
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

    // Top Right Number Ref
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanCrNo, rightX - 5, y - 5, { align: 'right' });

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
  doc.setFontSize(cfg.fontSizePt || 9.5);
  doc.text(inv.clientName, cfg.clientNameX + ox, cfg.clientNameY + oy);

  // 2. ( Client Address )
  const addrParts = clientAddress.split(',');
  const addrLine1 = addrParts[0] || clientAddress;
  doc.text(addrLine1.trim(), cfg.clientAddressX + ox, cfg.clientAddressY + oy);

  // 3. No. : ( CR / SOA Number )
  doc.setTextColor(220, 38, 38); // Red ink for receipt number
  doc.text(cleanCrNo, cfg.crNoX + ox, cfg.crNoY + oy, { align: 'left' });

  // 4. ( SOA Issue Date * )
  doc.setTextColor(15, 23, 42);
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
    const noteX = (cfg.particularsDescX + (cfg.monthYearX || (cfg.particularsDescX + 50))) / 2;
    doc.text(inv.billingNotes.trim(), noteX + ox, currentY, { align: 'center' });
    doc.setFont(cfg.fontFamily || 'helvetica', cfg.fontBold ? 'bold' : 'normal');
    doc.setFontSize(effectiveFontSize);
    currentY += effectiveRowSpacing;
  }

  // 8. ( Total Amount Billed: )
  doc.setFontSize(Math.max(effectiveFontSize, 9.5));
  doc.setFont(cfg.fontFamily || 'helvetica', 'bold');
  const totalFormatted = `PHP ${totalAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  doc.text(totalFormatted, cfg.totalAmountX + ox, cfg.totalAmountY + oy, { align: 'right' });

  // 9. ( User name ) -> PREPARED BY :
  doc.setFontSize(cfg.fontSizePt || 9);
  doc.setFont(cfg.fontFamily || 'helvetica', cfg.fontBold ? 'bold' : 'normal');
  doc.text(preparedBy, cfg.preparedByX + ox, cfg.preparedByY + oy);

  return doc;
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
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  
  printIframe.src = blobUrl;
  document.body.appendChild(printIframe);
  
  printIframe.onload = () => {
    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (e) {
        console.error('Direct print failed, fallback to new tab:', e);
        window.open(blobUrl, '_blank');
      }
    }, 400);
  };
}
