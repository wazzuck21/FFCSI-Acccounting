import * as XLSX from 'xlsx';
import { InvoiceItem, Payment, ClientProfile, CollectionLog } from '../types';
import { SoaLedgerSummary } from './soaCalculator';

/**
 * Export Client Statement of Account Ledger to formatted Excel Workbook (.xlsx)
 */
export function exportSOAExcel(client: ClientProfile | { companyName: string; tinNumber?: string; address?: string }, ledger: SoaLedgerSummary) {
  const wb = XLSX.utils.book_new();

  // Header info
  const wsData: any[][] = [
    ['AFMS & CO. CERTIFIED PUBLIC ACCOUNTANTS'],
    ['STATEMENT OF ACCOUNT LEDGER'],
    [`Client Name:`, client.companyName],
    [`TIN Number:`, client.tinNumber || 'N/A'],
    [`Address:`, client.address || 'N/A'],
    [`Report Date:`, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    [''],
    ['SUMMARY METRICS'],
    ['Opening Balance', 'Total Invoiced (PHP)', 'Total Payments (PHP)', 'Closing Outstanding Balance (PHP)', 'Total Overdue (PHP)'],
    [
      ledger.openingBalance,
      ledger.totalBilled,
      ledger.totalPaid,
      ledger.closingBalance,
      ledger.totalOverdue
    ],
    [''],
    ['TRANSACTION HISTORY LEDGER'],
    [
      'Date',
      'Tx Type',
      'Collection #',
      'Invoice / Ref #',
      'Billing Period',
      'Services / Particulars',
      'Due Date',
      'Billed Amount (PHP)',
      'Payment Received (PHP)',
      'C.R. / O.R. #',
      'Running Balance (PHP)',
      'Status',
      'Notes'
    ]
  ];

  ledger.entries.forEach(entry => {
    wsData.push([
      entry.date,
      entry.type,
      entry.collectionNo,
      entry.refNo,
      entry.billingPeriod,
      entry.servicesDescription,
      entry.dueDate || '-',
      entry.billedAmount,
      entry.paidAmount,
      entry.crNumber || '-',
      entry.runningBalance,
      entry.status,
      entry.notes || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 16 }, // Tx Type
    { wch: 14 }, // Collection #
    { wch: 18 }, // Invoice Ref
    { wch: 16 }, // Billing Period
    { wch: 40 }, // Services
    { wch: 12 }, // Due Date
    { wch: 18 }, // Billed Amount
    { wch: 20 }, // Payment Received
    { wch: 14 }, // C.R. #
    { wch: 22 }, // Running Balance
    { wch: 12 }, // Status
    { wch: 30 }  // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Statement of Account');
  
  const cleanName = client.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `SOA_Ledger_${cleanName}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/**
 * Export Accounts Receivable (AR) & Aging Report to Excel
 */
export function exportARAgingExcel(invoices: InvoiceItem[], payments: Payment[]) {
  const wb = XLSX.utils.book_new();

  const today = new Date();

  // Summary Metrics
  const totalInvoiced = invoices.filter(i => i.status !== 'Cancelled').reduce((a, b) => a + b.totalAmount, 0);
  const totalCollected = payments.filter(p => p.status === 'Active').reduce((a, b) => a + b.amount, 0);
  const outstandingAR = totalInvoiced - totalCollected;

  const rows: any[][] = [
    ['AFMS & CO. CERTIFIED PUBLIC ACCOUNTANTS'],
    ['ACCOUNTS RECEIVABLE & AGING ANALYSIS REPORT'],
    [`Generated Date:`, today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    [''],
    ['SUMMARY METRICS'],
    ['Total Billed (PHP)', 'Total Collected (PHP)', 'Outstanding AR (PHP)', 'Active Invoices Count'],
    [totalInvoiced, totalCollected, outstandingAR, invoices.filter(i => i.status !== 'Cancelled').length],
    [''],
    ['INVOICE-LEVEL AR AGING BREAKDOWN'],
    [
      'Collection #',
      'Invoice #',
      'Client Name',
      'Issue Date',
      'Due Date',
      'Age (Days)',
      'Aging Bucket',
      'Total Amount (PHP)',
      'Paid Amount (PHP)',
      'Outstanding Balance (PHP)',
      'Collection Status',
      'Next Follow-Up Date',
      'Follow-Up Notes'
    ]
  ];

  invoices.forEach(inv => {
    if (inv.status === 'Cancelled') return;

    const invPayments = payments.filter(p => p.invoiceId === inv.id && p.status === 'Active');
    const paid = invPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, inv.totalAmount - paid);

    const due = new Date(inv.dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

    let bucket = 'Current';
    if (balance > 0) {
      if (diffDays <= 0) bucket = 'Current (Not Due)';
      else if (diffDays <= 30) bucket = '1 - 30 Days Overdue';
      else if (diffDays <= 60) bucket = '31 - 60 Days Overdue';
      else if (diffDays <= 90) bucket = '61 - 90 Days Overdue';
      else bucket = '90+ Days Overdue';
    } else {
      bucket = 'Paid in Full';
    }

    rows.push([
      inv.collectionNumber || '1001',
      inv.invoiceNumber,
      inv.clientName,
      inv.issueDate,
      inv.dueDate,
      diffDays > 0 ? diffDays : 0,
      bucket,
      inv.totalAmount,
      paid,
      balance,
      inv.collectionStatus || inv.status,
      inv.nextFollowUpDate || '-',
      inv.collectionNotes || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 }, { wch: 18 }, { wch: 32 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
    { wch: 18 }, { wch: 18 }, { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'AR Aging Report');
  XLSX.writeFile(wb, `AR_Aging_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/**
 * Export Revenue Breakdown Report to Excel
 */
export function exportRevenueReportExcel(
  invoices: InvoiceItem[],
  payments: Payment[],
  revenueByServiceCategory: { category: string; billed: number; collected: number }[],
  revenueByClient: { clientName: string; billed: number; collected: number; balance: number }[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Revenue by Category
  const catRows: any[][] = [
    ['AFMS & CO. CERTIFIED PUBLIC ACCOUNTANTS'],
    ['REVENUE ANALYSIS BY SERVICE CATEGORY'],
    [`Report Date:`, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    [''],
    ['Service Category', 'Total Billed Amount (PHP)', 'Total Collected Amount (PHP)', 'Uncollected Balance (PHP)', 'Collection Rate %']
  ];

  revenueByServiceCategory.forEach(item => {
    const uncollected = Math.max(0, item.billed - item.collected);
    const rate = item.billed > 0 ? ((item.collected / item.billed) * 100).toFixed(1) + '%' : '0.0%';
    catRows.push([item.category, item.billed, item.collected, uncollected, rate]);
  });

  const wsCat = XLSX.utils.aoa_to_sheet(catRows);
  wsCat['!cols'] = [{ wch: 25 }, { wch: 22 }, { wch: 25 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Revenue By Service');

  // Sheet 2: Revenue by Client
  const clientRows: any[][] = [
    ['AFMS & CO. CERTIFIED PUBLIC ACCOUNTANTS'],
    ['REVENUE ANALYSIS BY CLIENT'],
    [`Report Date:`, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    [''],
    ['Client Name', 'Total Billed (PHP)', 'Total Collected (PHP)', 'Outstanding AR (PHP)', 'Collection Rate %']
  ];

  revenueByClient.forEach(item => {
    const rate = item.billed > 0 ? ((item.collected / item.billed) * 100).toFixed(1) + '%' : '0.0%';
    clientRows.push([item.clientName, item.billed, item.collected, item.balance, rate]);
  });

  const wsClient = XLSX.utils.aoa_to_sheet(clientRows);
  wsClient['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsClient, 'Revenue By Client');

  XLSX.writeFile(wb, `Revenue_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/**
 * Export Payment Ledger & Collections Report to Excel
 */
export function exportPaymentReportExcel(payments: Payment[], invoices: InvoiceItem[]) {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [
    ['AFMS & CO. CERTIFIED PUBLIC ACCOUNTANTS'],
    ['PAYMENT TRANSACTIONS & COLLECTION RECEIPT LEDGER'],
    [`Report Date:`, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    [''],
    ['Payment Date', 'C.R. / O.R. #', 'Invoice / Collection #', 'Client Name', 'Amount Paid (PHP)', 'Payment Method', 'Reference #', 'Received By Staff', 'Status', 'Cancellation Reason']
  ];

  payments.forEach(p => {
    const inv = invoices.find(i => i.id === p.invoiceId);
    rows.push([
      p.paymentDate,
      p.collectionReceiptNumber || p.officialReceiptNumber || '-',
      inv?.collectionNumber || inv?.invoiceNumber || '-',
      inv?.clientName || 'Client',
      p.amount,
      p.paymentMethod,
      p.referenceNumber || '-',
      p.receivedByName || 'System',
      p.status,
      p.cancellationReason || '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 32 }, { wch: 18 },
    { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Payment Ledger');
  XLSX.writeFile(wb, `Payment_Ledger_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/**
 * Export Collection Follow-Up Log History to Excel
 */
export function exportCollectionReportExcel(collectionLogs: CollectionLog[], invoices: InvoiceItem[]) {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [
    ['AFMS & CO. CERTIFIED PUBLIC ACCOUNTANTS'],
    ['AR COLLECTION FOLLOW-UP CONTACT LOGS REPORT'],
    [`Report Date:`, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    [''],
    ['Log Date/Time', 'Client Name', 'Collection #', 'Contact Person', 'Contact Method', 'Collection Status', 'Notes / Conversation Summary', 'Next Follow-Up Date', 'Logged By Staff']
  ];

  collectionLogs.forEach(log => {
    const inv = invoices.find(i => i.id === log.invoiceId);
    rows.push([
      log.logDate,
      inv?.clientName || 'Client',
      inv?.collectionNumber || '1001',
      log.contactPerson || '-',
      log.contactMethod || '-',
      log.status,
      log.notes,
      log.nextFollowUpDate || '-',
      log.loggedByName || 'Staff'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 32 }, { wch: 14 }, { wch: 22 }, { wch: 16 },
    { wch: 20 }, { wch: 45 }, { wch: 18 }, { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Collection Logs');
  XLSX.writeFile(wb, `Collection_Logs_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
}
