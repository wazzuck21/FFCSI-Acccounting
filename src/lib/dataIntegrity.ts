import { 
  ClientProfile, 
  ClientService, 
  InvoiceItem, 
  Payment, 
  ComplianceItem, 
  TaskItem, 
  DocumentItem, 
  PayableRecord, 
  CoreCredential,
  DataHealthReport,
  IntegrityIssue 
} from '../types';

export interface FullAppState {
  clients: ClientProfile[];
  clientServices: ClientService[];
  invoices: InvoiceItem[];
  payments: Payment[];
  complianceItems: ComplianceItem[];
  tasks: TaskItem[];
  documents: DocumentItem[];
  payables: PayableRecord[];
  credentials: CoreCredential[];
}

export function runDataHealthCheck(state: FullAppState): DataHealthReport {
  const issues: IntegrityIssue[] = [];
  const clientMap = new Map<string, ClientProfile>();
  state.clients.forEach(c => clientMap.set(c.id, c));

  let totalEntities = 
    state.clients.length + 
    state.clientServices.length + 
    state.invoices.length + 
    state.payments.length + 
    state.complianceItems.length + 
    state.tasks.length + 
    state.documents.length + 
    state.payables.length + 
    state.credentials.length;

  // 1. Audit Client References across all sub-entities
  state.clientServices.forEach(s => {
    if (!clientMap.has(s.clientId)) {
      issues.push({
        id: `issue_srv_${s.id}`,
        severity: 'WARNING',
        category: 'ORPHANED_REFERENCE',
        title: 'Orphaned Client Service Record',
        description: `Service "${s.serviceName}" references non-existent client ID "${s.clientId}".`,
        affectedEntityType: 'ClientService',
        affectedEntityId: s.id,
        canAutoFix: true,
        fixActionName: 'Remove Orphaned Service'
      });
    }
  });

  state.invoices.forEach(inv => {
    if (!clientMap.has(inv.clientId)) {
      issues.push({
        id: `issue_inv_${inv.id}`,
        severity: 'CRITICAL',
        category: 'ORPHANED_REFERENCE',
        title: 'Orphaned Invoice Record',
        description: `Invoice ${inv.invoiceNumber || inv.id} references non-existent client ID "${inv.clientId}".`,
        affectedEntityType: 'Invoice',
        affectedEntityId: inv.id,
        canAutoFix: false,
        fixActionName: 'Manual Review Required'
      });
    }
  });

  state.payments.forEach(p => {
    if (!clientMap.has(p.clientId)) {
      issues.push({
        id: `issue_pay_${p.id}`,
        severity: 'CRITICAL',
        category: 'ORPHANED_REFERENCE',
        title: 'Orphaned Payment Record',
        description: `Payment ${p.referenceNumber || p.id} of ₱${p.amount.toLocaleString()} references non-existent client ID "${p.clientId}".`,
        affectedEntityType: 'Payment',
        affectedEntityId: p.id,
        canAutoFix: false
      });
    }
  });

  state.complianceItems.forEach(comp => {
    if (!clientMap.has(comp.clientId)) {
      issues.push({
        id: `issue_comp_${comp.id}`,
        severity: 'WARNING',
        category: 'ORPHANED_REFERENCE',
        title: 'Orphaned Compliance Item',
        description: `Compliance item "${comp.title}" references non-existent client ID "${comp.clientId}".`,
        affectedEntityType: 'ComplianceItem',
        affectedEntityId: comp.id,
        canAutoFix: true,
        fixActionName: 'Cleanup Orphaned Compliance'
      });
    }
  });

  state.tasks.forEach(t => {
    if (t.clientId && !clientMap.has(t.clientId)) {
      issues.push({
        id: `issue_task_${t.id}`,
        severity: 'INFO',
        category: 'ORPHANED_REFERENCE',
        title: 'Orphaned Task Item',
        description: `Task "${t.title}" references non-existent client ID "${t.clientId}".`,
        affectedEntityType: 'TaskItem',
        affectedEntityId: t.id,
        canAutoFix: true,
        fixActionName: 'Remove Orphaned Task'
      });
    }
  });

  state.documents.forEach(doc => {
    if (!clientMap.has(doc.clientId)) {
      issues.push({
        id: `issue_doc_${doc.id}`,
        severity: 'INFO',
        category: 'ORPHANED_REFERENCE',
        title: 'Orphaned Document Reference',
        description: `Document "${doc.fileName}" references non-existent client ID "${doc.clientId}".`,
        affectedEntityType: 'DocumentItem',
        affectedEntityId: doc.id,
        canAutoFix: true
      });
    }
  });

  // 2. Audit Serial Numbers & Duplicates
  const invoiceNumCounts = new Map<string, string[]>();
  state.invoices.forEach(i => {
    if (i.invoiceNumber) {
      const clean = i.invoiceNumber.trim().toUpperCase();
      const list = invoiceNumCounts.get(clean) || [];
      list.push(i.id);
      invoiceNumCounts.set(clean, list);
    }
  });
  invoiceNumCounts.forEach((ids, invNum) => {
    if (ids.length > 1) {
      issues.push({
        id: `issue_dup_inv_${invNum}`,
        severity: 'CRITICAL',
        category: 'DUPLICATE_RECORD',
        title: 'Duplicate Invoice Number',
        description: `Invoice number "${invNum}" is assigned to ${ids.length} different invoice records.`,
        affectedEntityType: 'Invoice',
        affectedEntityId: ids[0],
        canAutoFix: true,
        fixActionName: 'Auto-Reassign Sequential Invoice Number'
      });
    }
  });

  const crNumCounts = new Map<string, string[]>();
  state.invoices.forEach(i => {
    if (i.collectionReceiptNumber) {
      const clean = i.collectionReceiptNumber.trim().toUpperCase();
      const list = crNumCounts.get(clean) || [];
      list.push(i.id);
      crNumCounts.set(clean, list);
    }
  });
  crNumCounts.forEach((ids, crNum) => {
    if (ids.length > 1) {
      issues.push({
        id: `issue_dup_cr_${crNum}`,
        severity: 'CRITICAL',
        category: 'DUPLICATE_RECORD',
        title: 'Duplicate Collection Receipt Number',
        description: `Collection Receipt Number "${crNum}" is used by ${ids.length} invoices.`,
        affectedEntityType: 'Invoice',
        affectedEntityId: ids[0],
        canAutoFix: false
      });
    }
  });

  // 3. Financial Balance Discrepancy Reconciliation
  state.invoices.forEach(inv => {
    const linkedPayments = state.payments.filter(p => p.invoiceId === inv.id && p.status === 'Active');
    const actualSumPaid = linkedPayments.reduce((sum, p) => sum + p.amount, 0);
    const expectedPaid = inv.paidAmount || 0;

    if (Math.abs(actualSumPaid - expectedPaid) > 0.01) {
      issues.push({
        id: `issue_bal_${inv.id}`,
        severity: 'CRITICAL',
        category: 'BALANCE_MISMATCH',
        title: 'Invoice Payment Ledger Mismatch',
        description: `Invoice ${inv.invoiceNumber} recorded paid amount (₱${expectedPaid.toLocaleString()}) does not match payment ledger total (₱${actualSumPaid.toLocaleString()}).`,
        affectedEntityType: 'Invoice',
        affectedEntityId: inv.id,
        canAutoFix: true,
        fixActionName: 'Sync Invoice Balance to Payment Ledger'
      });
    }
  });

  // Calculate Health Score (100 - weighted deducts)
  let penalty = 0;
  issues.forEach(iss => {
    if (iss.severity === 'CRITICAL') penalty += 15;
    else if (iss.severity === 'WARNING') penalty += 5;
    else penalty += 2;
  });

  const score = Math.max(0, Math.min(100, 100 - penalty));
  let status: DataHealthReport['status'] = 'OPTIMAL';
  if (score < 70) status = 'CRITICAL';
  else if (score < 90) status = 'WARNING';

  return {
    score,
    status,
    scanTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    totalEntitiesCount: totalEntities,
    issues
  };
}

export function autoRepairState(state: FullAppState): { newState: FullAppState; repairedCount: number; reportLog: string[] } {
  const reportLog: string[] = [];
  let repairedCount = 0;

  const validClientIds = new Set(state.clients.map(c => c.id));

  // 1. Remove orphaned client services
  const cleanedServices = state.clientServices.filter(s => {
    if (!validClientIds.has(s.clientId)) {
      repairedCount++;
      reportLog.push(`Removed orphaned service "${s.serviceName}" (ID: ${s.id})`);
      return false;
    }
    return true;
  });

  // 2. Remove orphaned compliance items
  const cleanedCompliance = state.complianceItems.filter(c => {
    if (!validClientIds.has(c.clientId)) {
      repairedCount++;
      reportLog.push(`Removed orphaned compliance item "${c.title}" (ID: ${c.id})`);
      return false;
    }
    return true;
  });

  // 3. Remove orphaned tasks
  const cleanedTasks = state.tasks.filter(t => {
    if (t.clientId && !validClientIds.has(t.clientId)) {
      repairedCount++;
      reportLog.push(`Removed orphaned task "${t.title}" (ID: ${t.id})`);
      return false;
    }
    return true;
  });

  // 4. Re-synchronize invoice balance to payment ledger
  const updatedInvoices = state.invoices.map(inv => {
    const linkedPayments = state.payments.filter(p => p.invoiceId === inv.id && p.status === 'Active');
    const actualSumPaid = linkedPayments.reduce((sum, p) => sum + p.amount, 0);
    const expectedPaid = inv.paidAmount || 0;

    if (Math.abs(actualSumPaid - expectedPaid) > 0.01) {
      repairedCount++;
      const newPaid = actualSumPaid;
      const newBalance = Math.max(0, inv.totalAmount - newPaid);
      let newStatus = inv.status;
      if (newBalance <= 0) newStatus = 'Paid';
      else if (newPaid > 0) newStatus = 'Partially Paid';

      const prevBalance = inv.totalAmount - (inv.paidAmount || 0);
      reportLog.push(`Reconciled Invoice ${inv.invoiceNumber} balance from ₱${prevBalance} to ₱${newBalance}`);
      return {
        ...inv,
        paidAmount: newPaid,
        status: newStatus
      };
    }
    return inv;
  });

  return {
    newState: {
      ...state,
      clientServices: cleanedServices,
      complianceItems: cleanedCompliance,
      tasks: cleanedTasks,
      invoices: updatedInvoices
    },
    repairedCount,
    reportLog
  };
}
