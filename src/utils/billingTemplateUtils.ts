import { BillingTemplateConfig, TemplateSectionKey } from '../types';
import jsPDF from 'jspdf';
import { InvoiceItem } from '../types';

export const DEFAULT_BILLING_TEMPLATE_CONFIG: BillingTemplateConfig = {
  templateName: 'Standard CPA Statement of Account',
  isScratchTemplate: false,
  paperSize: 'a4',
  orientation: 'portrait',
  marginMm: 14,
  firmName: 'FFCSI — FAMILY FRIENDS CONSULTANCY SERVICES INC.',
  firmSubtitle: 'Management Consultancy, Tax Advisory & Accounting Services',
  firmAddress: 'Ortigas Financial Center, Pasig City',
  firmTIN: 'VAT Reg. TIN 008-112-445-000',
  accentColor: '#B91C1C', // Crimson Red
  logoUrl: '',
  showLogo: false,
  showRemittanceBox: true,
  remittanceText: 'Please settle checks payable to FFCSI or transfer via Bank Deposit / Online Transfer.',
  bankAccountDetails: 'BDO Account # 1200-4451-9981 | Metrobank # 007-882-19231',
  showSignatory: true,
  signatoryName: 'Atty. Roberto Cruz, CPA',
  signatoryTitle: 'Managing Partner, Finance & Tax',
  showFootnote: true,
  footnoteText: 'This statement serves as an official billing invoice for professional accounting services.',
  showVatBreakdown: true,
  sectionOrder: ['header', 'clientInfo', 'servicesTable', 'totals', 'remittance', 'signatory', 'footnote'],
  customBlocks: [
    {
      id: 'blk-1',
      type: 'heading',
      title: 'Custom Terms & Notice',
      content: 'All professional fee payments are due within 15 days upon receipt of this Statement of Account.',
      fontSize: 10,
      align: 'left',
      bold: true,
    }
  ],
  headerPosY: 20,
  clientInfoPosY: 37,
  tablePosY: 75,
  headerFontSize: 15,
  fontFamily: 'helvetica',
};

export const FFCSI_COLLECTION_RECEIPT_CONFIG: BillingTemplateConfig = {
  templateName: 'Family Friends Consultancy Services Inc. (FFCSI Collection Receipt)',
  isScratchTemplate: false,
  paperSize: 'a4',
  orientation: 'portrait',
  marginMm: 14,
  firmName: 'Family Friends Consultancy Services Inc.',
  firmSubtitle: '# 50-M Aguilar Street, Brgy. Bungad, Quezon City',
  firmAddress: 'Tel. No.: (632) 8713-1412 | Email: ffcsi2019.acctg@gmail.com; ffcsi2018@gmail.com',
  firmTIN: 'VAT Reg. TIN 000-000-000-000',
  accentColor: '#dc2626', // Red 600
  logoUrl: '',
  showLogo: true,
  showRemittanceBox: false,
  remittanceText: 'Payment for professional tax compliance & accounting consultancy fees.',
  bankAccountDetails: '',
  showSignatory: true,
  signatoryName: 'Maricris',
  signatoryTitle: 'PREPARED BY',
  showFootnote: false,
  footnoteText: '',
  showVatBreakdown: false,
  sectionOrder: ['header', 'clientInfo', 'servicesTable', 'totals', 'signatory'],
  customBlocks: [],
  headerPosY: 15,
  clientInfoPosY: 35,
  tablePosY: 65,
  headerFontSize: 18,
  fontFamily: 'times',
};

const STORAGE_KEY = 'afms_billing_template_config';

export function getBillingTemplateConfig(): BillingTemplateConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_BILLING_TEMPLATE_CONFIG,
        ...parsed,
        paperSize: parsed.paperSize || 'a4',
        orientation: parsed.orientation || 'portrait',
        marginMm: parsed.marginMm ?? 14,
        customBlocks: parsed.customBlocks || DEFAULT_BILLING_TEMPLATE_CONFIG.customBlocks,
        sectionOrder: parsed.sectionOrder || DEFAULT_BILLING_TEMPLATE_CONFIG.sectionOrder,
      };
    }
  } catch (e) {
    console.error('Failed to load billing template config:', e);
  }
  return DEFAULT_BILLING_TEMPLATE_CONFIG;
}

export function saveBillingTemplateConfig(config: BillingTemplateConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save billing template config:', e);
  }
}

export function resetBillingTemplateConfig(): BillingTemplateConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_BILLING_TEMPLATE_CONFIG;
}

// Convert Hex to RGB for jsPDF
export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [4, 120, 87];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Helper to replace dynamic variable tokens in text blocks
export function replaceTokens(text: string, inv: InvoiceItem, config: BillingTemplateConfig): string {
  if (!text) return '';
  const balance = inv.totalAmount - (inv.paidAmount || 0);
  return text
    .replace(/{firmName}/g, config.firmName || '')
    .replace(/{firmAddress}/g, config.firmAddress || '')
    .replace(/{firmTIN}/g, config.firmTIN || '')
    .replace(/{clientName}/g, inv.clientName || '')
    .replace(/{clientId}/g, inv.clientId || '')
    .replace(/{invoiceNumber}/g, inv.invoiceNumber || '')
    .replace(/{issueDate}/g, inv.issueDate || '')
    .replace(/{dueDate}/g, inv.dueDate || '')
    .replace(/{subtotal}/g, `₱${inv.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
    .replace(/{vatAmount}/g, `₱${inv.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
    .replace(/{totalAmount}/g, `₱${inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
    .replace(/{paidAmount}/g, `₱${(inv.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
    .replace(/{balanceDue}/g, `₱${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
    .replace(/{signatoryName}/g, config.signatoryName || '')
    .replace(/{signatoryTitle}/g, config.signatoryTitle || '');
}

// Custom Configured PDF Generator for Statement of Account
export function generateCustomizedInvoicePDF(inv: InvoiceItem, config: BillingTemplateConfig = getBillingTemplateConfig()) {
  const doc = new jsPDF({
    orientation: config.orientation || 'portrait',
    unit: 'mm',
    format: config.paperSize || 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = config.marginMm || 14;
  const contentWidth = pageWidth - (margin * 2);
  const rightX = pageWidth - margin;

  const [accentR, accentG, accentB] = hexToRgb(config.accentColor || '#047857');
  const font = config.fontFamily || 'helvetica';

  let currentY = margin + 5;

  // Render Sections in Custom Order!
  config.sectionOrder.forEach((section) => {
    switch (section) {
      case 'header': {
        const posY = Math.max(currentY, config.headerPosY || (margin + 5));
        
        // Firm Header
        doc.setFont(font, 'bold');
        doc.setFontSize(config.headerFontSize || 15);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(config.firmName, margin, posY);

        doc.setFont(font, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(config.firmSubtitle, margin, posY + 5);
        doc.text(`${config.firmAddress} • ${config.firmTIN}`, margin, posY + 9);

        // SOA Title & Number
        doc.setFont(font, 'bold');
        doc.setFontSize(13);
        doc.setTextColor(accentR, accentG, accentB);
        doc.text('STATEMENT OF ACCOUNT', rightX, posY, { align: 'right' });
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(inv.invoiceNumber, rightX, posY + 6, { align: 'right' });

        // Divider line
        doc.setDrawColor(accentR, accentG, accentB);
        doc.setLineWidth(0.8);
        doc.line(margin, posY + 13, rightX, posY + 13);

        currentY = posY + 18;
        break;
      }

      case 'clientInfo': {
        const posY = Math.max(currentY, config.clientInfoPosY || (margin + 20));

        // Client & Info Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, posY, contentWidth, 30, 2, 2, 'F');
        
        doc.setFontSize(8);
        doc.setFont(font, 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('BILLED TO CLIENT:', margin + 4, posY + 6);

        doc.setFontSize(11);
        doc.setFont(font, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(inv.clientName, margin + 4, posY + 12);

        doc.setFontSize(9);
        doc.setFont(font, 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Client ID: ${inv.clientId}`, margin + 4, posY + 18);

        // Right column info
        doc.text(`Issue Date: ${inv.issueDate}`, rightX - 4, posY + 6, { align: 'right' });
        doc.text(`Payment Due Date: ${inv.dueDate}`, rightX - 4, posY + 12, { align: 'right' });
        doc.setFont(font, 'bold');
        doc.setTextColor(accentR, accentG, accentB);
        doc.text(`Status: ${inv.status.toUpperCase()}`, rightX - 4, posY + 18, { align: 'right' });

        currentY = posY + 35;
        break;
      }

      case 'servicesTable': {
        const posY = Math.max(currentY, config.tablePosY || (margin + 55));

        doc.setFillColor(241, 245, 249);
        doc.rect(margin, posY, contentWidth, 8, 'F');
        
        doc.setFontSize(8);
        doc.setFont(font, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('ITEM / SERVICE DESCRIPTION', margin + 4, posY + 5.5);
        doc.text('MONTH & YEAR', margin + 105, posY + 5.5);
        doc.text('AMOUNT (PHP)', rightX - 4, posY + 5.5, { align: 'right' });

        let rowY = posY + 12;
        doc.setFontSize(9);
        doc.setFont(font, 'normal');
        doc.setTextColor(30, 41, 59);

        inv.services.forEach((s) => {
          doc.text(s.description, margin + 4, rowY);
          doc.text(s.monthYear || '', margin + 105, rowY);
          doc.setFont(font, 'bold');
          doc.text(`PHP ${s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, rightX - 4, rowY, { align: 'right' });
          doc.setFont(font, 'normal');
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(margin, rowY + 3, rightX, rowY + 3);

          rowY += 9;
        });

        currentY = rowY + 5;
        break;
      }

      case 'totals': {
        const posY = currentY;
        const balance = inv.totalAmount - (inv.paidAmount || 0);

        const totalsLeft = rightX - 65;

        doc.setFontSize(9);
        doc.setFont(font, 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Subtotal:', totalsLeft, posY);
        doc.text(`PHP ${inv.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, rightX, posY, { align: 'right' });

        let totalsY = posY;
        if (config.showVatBreakdown && inv.vatAmount > 0) {
          totalsY += 6;
          doc.text('12% Output VAT:', totalsLeft, totalsY);
          doc.text(`PHP ${inv.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, rightX, totalsY, { align: 'right' });
        }

        totalsY += 7;
        doc.setFont(font, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('Total Amount Billed:', totalsLeft, totalsY);
        doc.text(`PHP ${inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, rightX, totalsY, { align: 'right' });

        totalsY += 6;
        doc.setTextColor(accentR, accentG, accentB);
        doc.text('Less Payments Received:', totalsLeft, totalsY);
        doc.text(`PHP ${(inv.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, rightX, totalsY, { align: 'right' });

        totalsY += 8;
        doc.setFillColor(254, 243, 199); // amber-100
        doc.roundedRect(totalsLeft - 5, totalsY - 5, 70, 9, 1, 1, 'F');
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text('Balance Due:', totalsLeft, totalsY + 1);
        doc.text(`PHP ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, rightX, totalsY + 1, { align: 'right' });

        currentY = totalsY + 15;
        break;
      }

      case 'remittance': {
        if (!config.showRemittanceBox) break;
        const posY = currentY;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, posY, contentWidth, 22, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont(font, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('PAYMENT REMITTANCE INSTRUCTIONS:', margin + 4, posY + 6);
        doc.setFont(font, 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(config.remittanceText, margin + 4, posY + 11);
        doc.setFont(font, 'bold');
        doc.setTextColor(accentR, accentG, accentB);
        doc.text(config.bankAccountDetails, margin + 4, posY + 16);

        if (inv.officialReceiptNumber) {
          doc.setFont(font, 'bold');
          doc.setTextColor(4, 120, 87);
          doc.text(`Official Receipt Issued: ${inv.officialReceiptNumber} (${inv.paymentMethod || 'Bank Transfer'})`, margin + 4, posY + 20);
        }

        currentY = posY + 28;
        break;
      }

      case 'customText':
      case 'customNote': {
        if (!config.customBlocks || config.customBlocks.length === 0) break;
        let posY = currentY;

        config.customBlocks.forEach(blk => {
          const formattedText = replaceTokens(blk.content, inv, config);
          doc.setFont(font, blk.bold ? 'bold' : 'normal');
          doc.setFontSize(blk.fontSize || 9);
          doc.setTextColor(15, 23, 42);

          const align = blk.align || 'left';
          let xPos = margin;
          if (align === 'center') xPos = pageWidth / 2;
          if (align === 'right') xPos = rightX;

          if (blk.type === 'heading') {
            doc.text(blk.title ? `${blk.title}: ${formattedText}` : formattedText, xPos, posY, { align });
            posY += 7;
          } else if (blk.type === 'paragraph') {
            const splitLines = doc.splitTextToSize(formattedText, contentWidth);
            doc.text(splitLines, xPos, posY, { align });
            posY += (splitLines.length * 5) + 3;
          } else if (blk.type === 'divider') {
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.4);
            doc.line(margin, posY, rightX, posY);
            posY += 6;
          } else if (blk.type === 'keyvalue') {
            doc.setFont(font, 'bold');
            doc.text(blk.title || 'Note:', margin, posY);
            doc.setFont(font, 'normal');
            doc.text(formattedText, margin + 35, posY);
            posY += 6;
          }
        });

        currentY = posY + 4;
        break;
      }

      case 'signatory': {
        if (!config.showSignatory) break;
        const posY = currentY + 8;
        const sigX = rightX - 50;

        doc.setFont(font, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(config.signatoryName, sigX, posY);
        doc.setLineWidth(0.3);
        doc.line(sigX - 10, posY + 1, rightX, posY + 1);
        doc.setFont(font, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(config.signatoryTitle, sigX, posY + 5);

        currentY = posY + 12;
        break;
      }

      case 'footnote': {
        if (!config.showFootnote) break;
        const posY = Math.max(currentY, pageHeight - margin - 5);

        doc.setFontSize(8);
        doc.setFont(font, 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text(config.footnoteText, margin, posY);
        break;
      }
    }
  });

  const cleanClient = inv.clientName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${inv.invoiceNumber}_${cleanClient}_SOA.pdf`);
}

// Dedicated 1:1 PDF Generator for FFCSI Collection Receipt (Exact Image Replica)
export function generateFFCSICollectionReceiptPDF(
  inv: InvoiceItem, 
  customOptions?: { preparedBy?: string; checkNo?: string; checkDate?: string; clientAddress?: string }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const rightX = pageWidth - margin; // 196mm
  const contentWidth = pageWidth - (margin * 2); // 182mm

  const crNo = inv.collectionReceiptNumber || inv.collectionNumber || inv.officialReceiptNumber || inv.invoiceNumber || '35428';
  const cleanCrNo = crNo.replace(/\D/g, '') || crNo;
  const displayDate = inv.paymentDate || inv.issueDate || '05/08/2026';
  const preparedBy = customOptions?.preparedBy || 'Maricris';
  const clientAddress = customOptions?.clientAddress || (inv as any).clientAddress || 'Gen. Aguinaldo Hi-Way Panapaan V, Bacoor City';

  let y = 15;

  // 1. Red FFCSI Logo Pill Badge on top-left
  doc.setFillColor(185, 28, 28); // Red-700
  doc.roundedRect(margin, y, 24, 12, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('FFCSI', margin + 12, y + 8, { align: 'center' });

  // 2. Company Name: Family Friends Consultancy Services Inc. (Script/Serif Red Title)
  doc.setFont('times', 'italic');
  doc.setFontSize(18);
  doc.setTextColor(185, 28, 28); // Red-700
  doc.text('Family Friends Consultancy Services Inc.', margin + 27, y + 8);

  // Address & Contacts below header
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('# 50-M Aguilar Street, Brgy. Bungad, Quezon City', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Tel. No.: (632) 8713-1412', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Email Add: ffcsi2019.acctg@gmail.com; ffcsi2018@gmail.com', pageWidth / 2, y, { align: 'center' });

  // 3. Document Name: COLLECTION RECEIPT
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('COLLECTION RECEIPT', pageWidth / 2, y, { align: 'center' });

  // Top Right Reference Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanCrNo, rightX - 5, y - 5, { align: 'right' });

  // 4. Client Info Fields (Underlined layout like original image)
  y += 10;
  
  // Row 1: CLIENT : [Name]                    No. : [Red Number]
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CLIENT :', margin, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text(inv.clientName, margin + 22, y);
  // Underline for Client
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.line(margin + 20, y + 1, margin + 115, y + 1);

  // Right Side: No. : 35428
  doc.setFont('helvetica', 'bold');
  doc.text('No.', rightX - 42, y);
  doc.setTextColor(220, 38, 38); // Red
  doc.text(`: ${cleanCrNo}`, rightX - 32, y);

  // Row 2: Address : [Address Line 1]          Date : [05/08/2026]
  y += 7;
  doc.setTextColor(15, 23, 42);
  doc.text('Address :', margin, y);
  
  // Split client address if needed
  const addrParts = clientAddress.split(',');
  const addrLine1 = addrParts[0] || clientAddress;
  const addrLine2 = addrParts.slice(1).join(',').trim();

  doc.setFont('helvetica', 'bold');
  doc.text(addrLine1, margin + 22, y);
  doc.line(margin + 20, y + 1, margin + 115, y + 1);

  // Date on right side
  doc.setFont('helvetica', 'bold');
  doc.text('Date', rightX - 42, y);
  doc.text(`: ${displayDate}`, rightX - 32, y);

  // Row 3 (if Address has line 2)
  if (addrLine2) {
    y += 6;
    doc.text(addrLine2, margin + 22, y);
    doc.line(margin + 20, y + 1, margin + 115, y + 1);
  }

  // 5. Table Frame: PARTICULARS | AMOUNT
  y += 8;
  const tableStartY = y;
  const colDividerX = margin + 120; // 134mm

  // Table Header Box
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
  doc.line(margin, y, rightX, y); // Header Bottom border

  // Subtitle inside Particulars
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment for the following:', margin + 2, y);

  // Line items
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);

  let calculatedTotal = 0;
  if (inv.services && inv.services.length > 0) {
    inv.services.forEach((s) => {
      const lineLabel = s.monthYear ? `${s.description} — ${s.monthYear}` : s.description;
      doc.text(lineLabel, margin + 10, y);
      doc.text(s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), rightX - 8, y, { align: 'right' });
      calculatedTotal += s.amount;
      y += 7;
    });
  } else {
    doc.text(`Professional Accounting Retainer Fee`, margin + 10, y);
    doc.text((inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), rightX - 8, y, { align: 'right' });
    calculatedTotal = inv.totalAmount;
    y += 7;
  }

  // Ensure table body height
  const minTableBottomY = tableStartY + 75;
  if (y < minTableBottomY) {
    y = minTableBottomY;
  }

  // Vertical Divider line between PARTICULARS and AMOUNT
  doc.setLineWidth(0.5);
  doc.line(colDividerX, tableStartY, colDividerX, y + 8);
  // Left border
  doc.line(margin, tableStartY, margin, y + 8);
  // Right border
  doc.line(rightX, tableStartY, rightX, y + 8);

  // Table Bottom Line
  doc.line(margin, y + 8, rightX, y + 8);

  // TOTAL Row
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL   ₱', colDividerX - 12, y, { align: 'right' });

  const finalTotal = calculatedTotal || inv.totalAmount || 0;
  doc.text(`PHP ${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, rightX - 8, y, { align: 'right' });

  // 6. Footer Signatures Section (3 Columns)
  y += 10;
  const footerStartY = y;
  doc.line(margin, y, rightX, y); // Top footer border

  y += 6;
  doc.setFontSize(8.5);
  
  // Left Column: CHECK, DATE, PREPARED BY
  doc.setFont('helvetica', 'bold');
  doc.text('CHECK   :', margin + 2, y);
  doc.line(margin + 20, y + 0.5, margin + 55, y + 0.5);

  y += 5;
  doc.text('DATE      :', margin + 2, y);
  doc.line(margin + 20, y + 0.5, margin + 55, y + 0.5);

  y += 5;
  doc.text('PREPARED BY :', margin + 2, y);
  doc.text(preparedBy, margin + 28, y);
  doc.line(margin + 26, y + 0.5, margin + 55, y + 0.5);

  // Middle Column: BILLING RECEIVED BY
  let midX = margin + 65;
  doc.text('BILLING RECEIVED BY', midX, footerStartY + 6);
  doc.line(midX, footerStartY + 16, midX + 50, footerStartY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Signature over Printed Name', midX + 6, footerStartY + 20);

  // Right Column: PAYMENT RECEIVED BY:
  let rightColX = margin + 125;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PAYMENT RECEIVED BY:', rightColX, footerStartY + 6);
  doc.line(rightColX, footerStartY + 16, rightColX + 50, footerStartY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Signature over Printed Name', rightColX + 6, footerStartY + 20);

  // Bottom outer box
  doc.setLineWidth(0.5);
  doc.rect(margin, footerStartY, contentWidth, 24);

  const cleanClient = inv.clientName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`FFCSI_Collection_Receipt_${cleanCrNo}_${cleanClient}.pdf`);
}
