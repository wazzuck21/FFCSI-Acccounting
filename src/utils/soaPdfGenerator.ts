import jsPDF from 'jspdf';
import { ClientProfile } from '../types';
import { SoaLedgerSummary, SoaLedgerEntry } from './soaCalculator';

export function generateClientStatementOfAccountPDF(
  client: ClientProfile | { companyName: string; tinNumber?: string; address?: string },
  ledger: SoaLedgerSummary,
  dateRangeLabel?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  let y = 16;

  // Header Firm Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('AFMS & CO. CERTIFIED PUBLIC ACCOUNTANTS', margin, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Tax Advisory, Audit & Accounting Services', margin, y + 4.5);
  doc.text('Suite 1400, Ortigas Financial Center, Pasig City • VAT Reg. TIN 008-112-445-000', margin, y + 8.5);

  // Document Title (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('STATEMENT OF ACCOUNT', pageWidth - margin, y, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Statement Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageWidth - margin, y + 4.5, { align: 'right' });
  if (dateRangeLabel) {
    doc.text(`Period: ${dateRangeLabel}`, pageWidth - margin, y + 8.5, { align: 'right' });
  }

  y += 15;

  // Divider line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;

  // Client Details & Financial Summary Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 24, 2, 2, 'D');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('BILLED TO CLIENT:', margin + 4, y + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(client.companyName, margin + 4, y + 10);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`TIN: ${client.tinNumber || 'N/A'} • Address: ${(client.address || 'N/A').slice(0, 45)}`, margin + 4, y + 15);

  // Financial Metrics Right Grid
  const metricX = pageWidth - margin - 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Opening Balance: PHP ${ledger.openingBalance.toLocaleString()}`, metricX, y + 5, { align: 'right' });
  doc.text(`Total Billed: PHP ${ledger.totalBilled.toLocaleString()} • Total Paid: PHP ${ledger.totalPaid.toLocaleString()}`, metricX, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`Closing Balance Due: PHP ${ledger.closingBalance.toLocaleString()}`, metricX, y + 16, { align: 'right' });

  y += 30;

  // Table Headers
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);

  doc.text('DATE', margin + 3, y + 4.8);
  doc.text('TX TYPE', margin + 22, y + 4.8);
  doc.text('REF / COLL #', margin + 44, y + 4.8);
  doc.text('SERVICES / PARTICULARS', margin + 70, y + 4.8);
  doc.text('BILLED (+)', margin + 128, y + 4.8, { align: 'right' });
  doc.text('PAID (-)', margin + 152, y + 4.8, { align: 'right' });
  doc.text('RUNNING BAL (PHP)', margin + 180, y + 4.8, { align: 'right' });

  y += 9;

  // Entries
  doc.setFontSize(7.5);

  ledger.entries.forEach((entry, idx) => {
    if (y > 255) {
      doc.addPage();
      y = 20;

      // Repeat Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('DATE', margin + 3, y + 4.8);
      doc.text('TX TYPE', margin + 22, y + 4.8);
      doc.text('REF / COLL #', margin + 44, y + 4.8);
      doc.text('SERVICES / PARTICULARS', margin + 70, y + 4.8);
      doc.text('BILLED (+)', margin + 128, y + 4.8, { align: 'right' });
      doc.text('PAID (-)', margin + 152, y + 4.8, { align: 'right' });
      doc.text('RUNNING BAL (PHP)', margin + 180, y + 4.8, { align: 'right' });
      y += 9;
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    doc.text(entry.date, margin + 3, y);

    // Color code Tx Type
    if (entry.type === 'Invoice') doc.setTextColor(30, 58, 138); // blue
    else if (entry.type === 'Payment') doc.setTextColor(4, 120, 87); // emerald
    else if (entry.type === 'Payment Reversal' || entry.type === 'Voided Invoice') doc.setTextColor(180, 83, 9); // amber

    doc.text(entry.type, margin + 22, y);

    doc.setTextColor(15, 23, 42);
    doc.text(`#${entry.collectionNo}`, margin + 44, y);

    const desc = entry.servicesDescription.length > 34
      ? entry.servicesDescription.substring(0, 32) + '...'
      : entry.servicesDescription;
    doc.text(desc, margin + 70, y);

    // Billed
    if (entry.billedAmount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(`PHP ${entry.billedAmount.toLocaleString()}`, margin + 128, y, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text('-', margin + 128, y, { align: 'right' });
    }

    // Paid
    if (entry.paidAmount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text(`PHP ${entry.paidAmount.toLocaleString()}`, margin + 152, y, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('-', margin + 152, y, { align: 'right' });
    }

    // Running Balance
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`PHP ${entry.runningBalance.toLocaleString()}`, margin + 180, y, { align: 'right' });

    // Underline
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.1);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);

    y += 6.5;
  });

  // Total Summary Footer
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  y += 4;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL OUTSTANDING STATEMENT BALANCE DUE:', margin + 3, y);
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text(`PHP ${ledger.closingBalance.toLocaleString()}`, margin + 180, y, { align: 'right' });

  // Bank Remittance Box
  y += 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'D');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('REMITTANCE & PAYMENT INSTRUCTIONS:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Please make cheques payable to: AFMS & CO. CPAs', margin + 4, y + 9.5);
  doc.text('Bank Transfer: BDO Unibank • Account Name: AFMS & CO. CPAs • Account No: 00412-8809-12', margin + 4, y + 14);

  // Signatory Box
  y += 26;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PREPARED BY:', margin + 4, y);

  doc.setLineWidth(0.3);
  doc.line(margin + 4, y + 12, margin + 65, y + 12);
  doc.setFontSize(8);
  doc.text('MARICRIS S. DE LA CRUZ', margin + 4, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Billing & Collection Officer', margin + 4, y + 20);

  const cleanName = client.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`AFMS_SOA_Statement_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
