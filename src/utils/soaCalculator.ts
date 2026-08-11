import { InvoiceItem, Payment, ClientProfile, CollectionLog } from '../types';

export interface SoaLedgerEntry {
  id: string;
  type: 'Invoice' | 'Payment' | 'Payment Reversal' | 'Adjustment' | 'Voided Invoice';
  date: string; // YYYY-MM-DD
  refNo: string; // Invoice # or Payment Ref #
  collectionNo: string; // Serial Collection Number (e.g. "1001")
  billingPeriod: string;
  dueDate?: string;
  servicesDescription: string;
  billedAmount: number;
  paidAmount: number;
  crNumber?: string;
  runningBalance: number;
  status: string;
  notes?: string;
  originalInvoiceId?: string;
  originalPaymentId?: string;
}

export interface SoaLedgerSummary {
  clientId: string;
  clientName: string;
  openingBalance: number;
  totalBilled: number;
  totalPaid: number;
  closingBalance: number;
  totalOverdue: number;
  totalInvoicesCount: number;
  totalPaymentsCount: number;
  entries: SoaLedgerEntry[];
}

export function buildClientSoaLedger(
  clientId: string,
  allInvoices: InvoiceItem[],
  allPayments: Payment[],
  options?: {
    fromDate?: string;
    toDate?: string;
    includeCancelled?: boolean;
  }
): SoaLedgerSummary {
  const fromDate = options?.fromDate || '';
  const toDate = options?.toDate || '';
  const includeCancelled = options?.includeCancelled ?? true;

  // Filter invoices for this client (works for active and archived clients)
  const clientInvoices = allInvoices.filter(i => i.clientId === clientId);

  // Raw unsorted transaction events
  interface RawTxEvent {
    id: string;
    timestamp: string; // ISO or YYYY-MM-DD
    date: string; // YYYY-MM-DD
    type: 'Invoice' | 'Payment' | 'Payment Reversal' | 'Adjustment' | 'Voided Invoice';
    refNo: string;
    collectionNo: string;
    billingPeriod: string;
    dueDate?: string;
    servicesDescription: string;
    billedAmount: number;
    paidAmount: number;
    crNumber?: string;
    status: string;
    notes?: string;
    originalInvoiceId?: string;
    originalPaymentId?: string;
  }

  const rawEvents: RawTxEvent[] = [];

  clientInvoices.forEach(inv => {
    // 1. Invoice Event
    if (inv.status !== 'Cancelled' || includeCancelled) {
      const servicesDesc = inv.services && inv.services.length > 0
        ? inv.services.map(s => s.description).join(' • ')
        : 'Professional Services Fee';

      rawEvents.push({
        id: `tx_inv_${inv.id}`,
        timestamp: `${inv.issueDate}T00:00:00`,
        date: inv.issueDate,
        type: inv.status === 'Cancelled' ? 'Voided Invoice' : 'Invoice',
        refNo: inv.invoiceNumber,
        collectionNo: inv.collectionNumber || '1001',
        billingPeriod: inv.billingPeriod || inv.issueDate,
        dueDate: inv.dueDate,
        servicesDescription: servicesDesc,
        billedAmount: inv.status === 'Cancelled' ? 0 : inv.totalAmount,
        paidAmount: 0,
        crNumber: '-',
        status: inv.status,
        notes: inv.cancellationReason || inv.collectionNotes,
        originalInvoiceId: inv.id
      });
    }

    // 2. Payments linked to invoice
    const invPayments = allPayments.filter(p => p.invoiceId === inv.id);
    invPayments.forEach(pmt => {
      if (pmt.status === 'Active') {
        const crNum = pmt.collectionReceiptNumber || pmt.officialReceiptNumber || pmt.referenceNumber || 'CR-###';
        rawEvents.push({
          id: `tx_pmt_${pmt.id}`,
          timestamp: pmt.createdAt || `${pmt.paymentDate}T12:00:00`,
          date: pmt.paymentDate,
          type: 'Payment',
          refNo: pmt.referenceNumber || `CR-${pmt.id.slice(-4)}`,
          collectionNo: inv.collectionNumber || '1001',
          billingPeriod: inv.billingPeriod || inv.issueDate,
          dueDate: '-',
          servicesDescription: `Payment received via ${pmt.paymentMethod}${pmt.referenceNumber ? ` (Ref: ${pmt.referenceNumber})` : ''}`,
          billedAmount: 0,
          paidAmount: pmt.amount,
          crNumber: crNum,
          status: 'Active',
          notes: pmt.notes,
          originalInvoiceId: inv.id,
          originalPaymentId: pmt.id
        });
      } else if (pmt.status === 'Cancelled' && includeCancelled) {
        // Reversal Event
        rawEvents.push({
          id: `tx_rev_${pmt.id}`,
          timestamp: pmt.cancelledAt || `${pmt.paymentDate}T23:59:59`,
          date: pmt.cancelledAt ? pmt.cancelledAt.slice(0, 10) : pmt.paymentDate,
          type: 'Payment Reversal',
          refNo: `REV-${pmt.id.slice(-4)}`,
          collectionNo: inv.collectionNumber || '1001',
          billingPeriod: inv.billingPeriod || inv.issueDate,
          dueDate: '-',
          servicesDescription: `Payment Reversal for ${pmt.paymentMethod} (Reason: ${pmt.cancellationReason || 'Cancelled'})`,
          billedAmount: pmt.amount, // Adds back to balance
          paidAmount: 0,
          crNumber: pmt.collectionReceiptNumber || pmt.officialReceiptNumber || 'CR-###',
          status: 'Cancelled',
          notes: pmt.cancellationReason,
          originalInvoiceId: inv.id,
          originalPaymentId: pmt.id
        });
      }
    });
  });

  // Sort raw events chronologically by date then timestamp
  rawEvents.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.timestamp.localeCompare(b.timestamp);
  });

  // Calculate opening balance and running balance
  let currentRunningBalance = 0;
  let openingBalance = 0;
  let totalBilled = 0;
  let totalPaid = 0;
  let totalOverdue = 0;
  const processedEntries: SoaLedgerEntry[] = [];

  const todayStr = new Date().toISOString().slice(0, 10);

  rawEvents.forEach(evt => {
    const isBeforeFromDate = fromDate && evt.date < fromDate;

    if (evt.type === 'Invoice') {
      currentRunningBalance += evt.billedAmount;
      totalBilled += evt.billedAmount;
    } else if (evt.type === 'Payment') {
      currentRunningBalance -= evt.paidAmount;
      totalPaid += evt.paidAmount;
    } else if (evt.type === 'Payment Reversal') {
      currentRunningBalance += evt.billedAmount;
    }

    if (isBeforeFromDate) {
      openingBalance = currentRunningBalance;
    } else {
      if (!toDate || evt.date <= toDate) {
        processedEntries.push({
          id: evt.id,
          type: evt.type,
          date: evt.date,
          refNo: evt.refNo,
          collectionNo: evt.collectionNo,
          billingPeriod: evt.billingPeriod,
          dueDate: evt.dueDate,
          servicesDescription: evt.servicesDescription,
          billedAmount: evt.billedAmount,
          paidAmount: evt.paidAmount,
          crNumber: evt.crNumber,
          runningBalance: currentRunningBalance,
          status: evt.status,
          notes: evt.notes,
          originalInvoiceId: evt.originalInvoiceId,
          originalPaymentId: evt.originalPaymentId
        });
      }
    }
  });

  // Calculate overdue balance from open invoices
  clientInvoices.forEach(inv => {
    if (inv.status !== 'Paid' && inv.status !== 'Cancelled') {
      if (inv.dueDate && inv.dueDate < todayStr) {
        const invPayments = allPayments.filter(p => p.invoiceId === inv.id && p.status === 'Active');
        const paid = invPayments.reduce((acc, p) => acc + p.amount, 0);
        const bal = Math.max(0, inv.totalAmount - paid);
        totalOverdue += bal;
      }
    }
  });

  const clientName = clientInvoices.length > 0 ? clientInvoices[0].clientName : 'Client';

  return {
    clientId,
    clientName,
    openingBalance,
    totalBilled,
    totalPaid,
    closingBalance: currentRunningBalance,
    totalOverdue,
    totalInvoicesCount: clientInvoices.filter(i => i.status !== 'Cancelled').length,
    totalPaymentsCount: allPayments.filter(p => p.clientId === clientId && p.status === 'Active').length,
    entries: processedEntries
  };
}
