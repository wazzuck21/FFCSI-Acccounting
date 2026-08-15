import { FullDatabaseBackup, BackupMetadata } from '../types';

export function computeDataChecksum(dataString: string): string {
  let hash = 0;
  if (dataString.length === 0) return '00000000';
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function generateFullDatabaseBackup(state: any, createdByName: string, createdById: string): FullDatabaseBackup {
  // Sanitize credentials: strip plaintext password, ensure encrypted representation
  const sanitizedCredentials = (state.credentials || []).map((cred: any) => {
    const { password, ...cleaned } = cred;
    return {
      ...cleaned,
      password: '••••••••', // Masked placeholder
      isEncrypted: cred.isEncrypted ?? true
    };
  });

  const appData = {
    clients: state.clients || [],
    clientServices: state.clientServices || [],
    dynamicSections: state.dynamicSections || [],
    payables: state.payables || [],
    complianceItems: state.complianceItems || [],
    tasks: state.tasks || [],
    invoices: state.invoices || [],
    documents: state.documents || [],
    credentials: sanitizedCredentials,
    auditLogs: state.auditLogs || [],
    masterChoices: state.masterChoices || {},
    employees: state.employees || [],
    leaveRecords: state.leaveRecords || [],
    valeRecords: state.valeRecords || [],
    payrollRuns: state.payrollRuns || [],
    companyExpenses: state.companyExpenses || [],
    payments: state.payments || [],
    collectionLogs: state.collectionLogs || [],
    usedCrNumbers: state.usedCrNumbers || []
  };

  const entityCounts: Record<string, number> = {
    Clients: appData.clients.length,
    ClientServices: appData.clientServices.length,
    Invoices: appData.invoices.length,
    Payments: appData.payments.length,
    ComplianceItems: appData.complianceItems.length,
    Tasks: appData.tasks.length,
    Documents: appData.documents.length,
    AuditLogs: appData.auditLogs.length,
    Employees: appData.employees.length,
    PayrollRuns: appData.payrollRuns.length,
    CompanyExpenses: appData.companyExpenses.length
  };

  const jsonStr = JSON.stringify(appData);
  const checksum = computeDataChecksum(jsonStr);

  const metadata: BackupMetadata = {
    version: '1.9.0',
    timestamp: new Date().toISOString(),
    backupType: 'FULL',
    checksum,
    createdByName,
    createdById,
    entityCounts
  };

  return {
    metadata,
    appData
  };
}

export function verifyBackupFile(jsonString: string): { 
  isValid: boolean; 
  error?: string; 
  backupObj?: FullDatabaseBackup; 
  summary?: Record<string, number> 
} {
  try {
    if (!jsonString || !jsonString.trim()) {
      return { isValid: false, error: 'Backup file is empty.' };
    }

    const parsed = JSON.parse(jsonString);

    // Support both raw JSON state and enveloped FullDatabaseBackup
    let appData = parsed.appData || parsed;
    let metadata = parsed.metadata;

    if (!appData.clients || !Array.isArray(appData.clients)) {
      return { isValid: false, error: 'Invalid AFMS backup structure: "clients" collection missing.' };
    }

    const entityCounts: Record<string, number> = {
      Clients: (appData.clients || []).length,
      ClientServices: (appData.clientServices || []).length,
      Invoices: (appData.invoices || []).length,
      Payments: (appData.payments || []).length,
      ComplianceItems: (appData.complianceItems || []).length,
      Tasks: (appData.tasks || []).length,
      Documents: (appData.documents || []).length,
      AuditLogs: (appData.auditLogs || []).length,
      Employees: (appData.employees || []).length,
      PayrollRuns: (appData.payrollRuns || []).length,
      CompanyExpenses: (appData.companyExpenses || []).length
    };

    const validatedBackup: FullDatabaseBackup = {
      metadata: metadata || {
        version: '1.9.0',
        timestamp: new Date().toISOString(),
        backupType: 'FULL',
        checksum: computeDataChecksum(JSON.stringify(appData)),
        createdByName: 'System Backup Import',
        createdById: 'system',
        entityCounts
      },
      appData
    };

    return {
      isValid: true,
      backupObj: validatedBackup,
      summary: entityCounts
    };
  } catch (err: any) {
    return { isValid: false, error: `Failed to parse backup JSON file: ${err.message || err}` };
  }
}

// Utility to export CSV reporting files for Excel
export function downloadCSVReport(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
