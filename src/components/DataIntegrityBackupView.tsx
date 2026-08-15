import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DataHealthReport, DataConflict, IntegrityIssue } from '../types';
import { downloadCSVReport } from '../lib/backupRestoreEngine';
import { 
  Database, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Download, 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  FileText, 
  Clock, 
  Server, 
  HardDrive, 
  Sliders, 
  Key, 
  Sparkles, 
  HelpCircle,
  Activity,
  Zap,
  ArrowRight
} from 'lucide-react';

export const DataIntegrityBackupView: React.FC = () => {
  const { 
    clients, 
    invoices, 
    payments, 
    complianceItems, 
    auditLogs, 
    syncStatus, 
    syncConflicts, 
    resolveConflict, 
    runIntegrityScan, 
    autoRepairIntegrity, 
    autoBackupSchedule, 
    updateAutoBackupSchedule, 
    runAutoBackupNow, 
    safeRestoreDatabase 
  } = useData();

  const { currentUser, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'Health' | 'Conflicts' | 'Backup' | 'Restore' | 'AutoBackup'>('Health');
  
  // Health Scanner State
  const [healthReport, setHealthReport] = useState<DataHealthReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [repairLog, setRepairLog] = useState<string[] | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  // Restore State
  const [restoreFileJson, setRestoreFileJson] = useState<string>('');
  const [restoreFileName, setRestoreFileName] = useState<string>('');
  const [restoreAdminPassword, setRestoreAdminPassword] = useState<string>('');
  const [restoreConfirmText, setRestoreConfirmText] = useState<string>('');
  const [restorePreviewSummary, setRestorePreviewSummary] = useState<Record<string, number> | null>(null);
  const [restoreErrorMessage, setRestoreErrorMessage] = useState<string>('');
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string>('');

  // Initial scan on view mount
  useEffect(() => {
    const report = runIntegrityScan();
    setHealthReport(report);
  }, []);

  const handleRunScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const report = runIntegrityScan();
      setHealthReport(report);
      setIsScanning(false);
    }, 400);
  };

  const handleAutoRepair = () => {
    setIsRepairing(true);
    setTimeout(() => {
      const res = autoRepairIntegrity();
      setRepairLog(res.reportLog);
      const updatedReport = runIntegrityScan();
      setHealthReport(updatedReport);
      setIsRepairing(false);
    }, 500);
  };

  const handleDownloadFullBackup = () => {
    const jsonStr = runAutoBackupNow(currentUser?.fullName || 'Admin User', currentUser?.id || 'admin');
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AFMS_Full_Database_Backup_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUploadForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    setRestoreErrorMessage('');
    setRestoreSuccessMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreFileJson(content);
      try {
        const parsed = JSON.parse(content);
        const appData = parsed.appData || parsed;
        if (appData.clients) {
          setRestorePreviewSummary({
            Clients: (appData.clients || []).length,
            Invoices: (appData.invoices || []).length,
            Payments: (appData.payments || []).length,
            Compliance: (appData.complianceItems || []).length,
            Tasks: (appData.tasks || []).length,
            Documents: (appData.documents || []).length,
          });
        } else {
          setRestoreErrorMessage('Invalid backup format: missing clients object.');
        }
      } catch (err) {
        setRestoreErrorMessage('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    setRestoreErrorMessage('');
    setRestoreSuccessMessage('');

    if (!isSuperAdmin) {
      setRestoreErrorMessage('Only Super Administrators are authorized to perform database restores.');
      return;
    }

    if (restoreConfirmText.trim() !== 'RESTORE') {
      setRestoreErrorMessage('Please type "RESTORE" in capital letters to confirm.');
      return;
    }

    const res = safeRestoreDatabase(
      restoreFileJson,
      currentUser?.id || 'admin',
      currentUser?.fullName || 'Super Admin'
    );

    if (res.success) {
      setRestoreSuccessMessage('Database successfully restored! Pre-restore safety snapshot created in IndexedDB.');
      setRestoreConfirmText('');
      setRestoreFileJson('');
      setRestoreFileName('');
      setRestorePreviewSummary(null);
      // Refresh scan
      setHealthReport(runIntegrityScan());
    } else {
      setRestoreErrorMessage(res.message);
    }
  };

  // CSV Report Generators
  const handleExportClientsCSV = () => {
    const headers = ['Client ID', 'Company Name', 'Trade Name', 'TIN', 'Tax Category', 'RDO', 'Contact Person', 'Email', 'Phone', 'Status'];
    const rows = clients.map(c => [
      c.id, c.companyName, c.tradeName || '', c.tinNumber, c.taxCategory, c.rdoCode || '', c.contactPerson, c.email, c.phone, c.status
    ]);
    downloadCSVReport('AFMS_Client_Directory', headers, rows);
  };

  const handleExportInvoicesCSV = () => {
    const headers = ['Invoice Number', 'Client Name', 'Issue Date', 'Due Date', 'Total Amount', 'Paid Amount', 'Balance', 'Status', 'CR Number'];
    const rows = invoices.map(i => [
      i.invoiceNumber, i.clientName, i.issueDate, i.dueDate, i.totalAmount, i.paidAmount || 0, i.balanceAmount, i.status, i.collectionReceiptNumber || ''
    ]);
    downloadCSVReport('AFMS_Invoices_Ledger', headers, rows);
  };

  const handleExportPaymentsCSV = () => {
    const headers = ['Payment Ref', 'Invoice #', 'Client Name', 'Payment Date', 'Amount', 'Payment Method', 'Official Receipt #', 'CR Number', 'Recorded By'];
    const rows = payments.map(p => [
      p.paymentReferenceNumber, p.invoiceNumber, p.clientName, p.paymentDate, p.amount, p.paymentMethod, p.officialReceiptNumber || '', p.collectionReceiptNumber || '', p.recordedByName
    ]);
    downloadCSVReport('AFMS_Payments_Register', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / System Health Executive Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
                <Database className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Data Integrity, Sync & Disaster Recovery Hub</h1>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Enterprise-grade data health verification, multi-tab sync, non-destructive financial conflict resolution, and Super Admin database backup & restore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Health Badge */}
            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 rounded-xl px-3.5 py-2 flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Database Health</p>
                <p className="text-sm font-bold font-mono text-emerald-400">{healthReport?.score ?? 100}% {healthReport?.status}</p>
              </div>
            </div>

            {/* Sync Badge */}
            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 rounded-xl px-3.5 py-2 flex items-center gap-3">
              <Server className={`w-4 h-4 ${syncStatus === 'Online' ? 'text-blue-400' : 'text-amber-400'}`} />
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Sync Engine</p>
                <p className="text-xs font-semibold text-white">{syncStatus} (Multi-Tab Active)</p>
              </div>
            </div>

            {/* Backup Button */}
            <button
              onClick={handleDownloadFullBackup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-xl p-1.5 shadow-2xs">
        <button
          onClick={() => setActiveTab('Health')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Health' ? 'bg-blue-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Data Health Scan</span>
          {healthReport && healthReport.issues.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-900 font-bold rounded-full text-[10px]">
              {healthReport.issues.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('Conflicts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Conflicts' ? 'bg-blue-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Financial Conflicts</span>
          {syncConflicts.filter(c => c.status === 'REVIEW_REQUIRED').length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white font-bold rounded-full text-[10px]">
              {syncConflicts.filter(c => c.status === 'REVIEW_REQUIRED').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('Backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Backup' ? 'bg-blue-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Backup & Excel Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('Restore')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Restore' ? 'bg-blue-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Safe Restore & Disaster Recovery</span>
        </button>

        <button
          onClick={() => setActiveTab('AutoBackup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'AutoBackup' ? 'bg-blue-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Auto-Backup Schedule</span>
        </button>
      </div>

      {/* TAB 1: DATA HEALTH SCANNER */}
      {activeTab === 'Health' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Database Relationship & Integrity Auditor
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audits all entity relationships (Clients → Services → Compliance → Tasks → Invoices → Payments).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunScan}
                  disabled={isScanning}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Run Scan</span>
                </button>

                {healthReport && healthReport.issues.length > 0 && (
                  <button
                    onClick={handleAutoRepair}
                    disabled={isRepairing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Auto-Repair Orphaned Records</span>
                  </button>
                )}
              </div>
            </div>

            {/* Repair Report Notice */}
            {repairLog && repairLog.length > 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Auto-Repair Completed Successfully ({repairLog.length} changes applied)</span>
                </div>
                <ul className="text-[11px] text-emerald-700 space-y-0.5 font-mono list-disc list-inside pl-2">
                  {repairLog.map((log, idx) => (
                    <li key={idx}>{log}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Issues List */}
            {healthReport ? (
              healthReport.issues.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">100% Optimal Data Integrity</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    All client entities, invoices, payment ledgers, compliance schedules, tasks, and documents have perfect relational integrity with zero orphaned or duplicated records.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Detected Integrity Issues ({healthReport.issues.length})
                  </p>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {healthReport.issues.map((issue) => (
                      <div key={issue.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-start gap-3">
                          {issue.severity === 'CRITICAL' ? (
                            <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{issue.title}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                issue.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {issue.severity}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">[{issue.category}]</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{issue.description}</p>
                          </div>
                        </div>

                        {issue.canAutoFix && (
                          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                            Auto-Fixable
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 2: FINANCIAL CONFLICT RESOLVER */}
      {activeTab === 'Conflicts' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Non-Destructive Financial Conflict Resolution Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial changes (Invoices, Payments, Collection Receipts, Payroll) edited concurrently or offline are flagged for explicit authorized review. No silent overwrites occur.
            </p>
          </div>

          {syncConflicts.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-blue-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No Unresolved Financial Conflicts</p>
              <p className="text-xs text-slate-500">
                All concurrent multi-user edits and offline state syncs are fully reconciled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {syncConflicts.map((c) => (
                <div key={c.id} className="border border-amber-200 bg-amber-50/40 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{c.title}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{c.description}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{c.timestamp}</span>
                  </div>

                  {c.status === 'REVIEW_REQUIRED' && (
                    <div className="flex items-center gap-3 pt-3 border-t border-amber-200/60">
                      <button
                        onClick={() => resolveConflict(c.id, 'KEEP_LOCAL', currentUser?.id || 'admin', currentUser?.fullName || 'Admin User')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        Keep Local Version
                      </button>
                      <button
                        onClick={() => resolveConflict(c.id, 'APPLY_INCOMING', currentUser?.id || 'admin', currentUser?.fullName || 'Admin User')}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        Apply Incoming Version
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BACKUP & EXCEL REPORTS */}
      {activeTab === 'Backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Full Database JSON Backup</h2>
                <p className="text-xs text-slate-500">Includes complete entity state & SHA-256 integrity checksum.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Clients Registered:</span>
                <span className="font-bold font-mono">{clients.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Invoices & Billing:</span>
                <span className="font-bold font-mono">{invoices.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment Records:</span>
                <span className="font-bold font-mono">{payments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audit Log Entries:</span>
                <span className="font-bold font-mono">{auditLogs.length}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-medium">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Vault portal credentials are exported in encrypted format. Plaintext keys are never written to backup files.</span>
            </div>

            <button
              onClick={handleDownloadFullBackup}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Complete Backup JSON</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Excel / CSV Reporting Exports</h2>
                <p className="text-xs text-slate-500">Download formatted CSV reports for external auditing.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleExportClientsCSV}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-800 font-semibold transition-all cursor-pointer"
              >
                <span>Export Client Directory CSV</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={handleExportInvoicesCSV}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-800 font-semibold transition-all cursor-pointer"
              >
                <span>Export Invoices & AR Ledger CSV</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={handleExportPaymentsCSV}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-800 font-semibold transition-all cursor-pointer"
              >
                <span>Export Payments & Collections Register CSV</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SAFE RESTORE & DISASTER RECOVERY */}
      {activeTab === 'Restore' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Super Admin Safe Restore & Disaster Recovery Workflow
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Restoring a backup creates an automatic pre-restore safety snapshot in IndexedDB prior to applying changes.
            </p>
          </div>

          {!isSuperAdmin ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-800">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Restoring database snapshots requires Super Administrator authorization. Please request a Super Admin account to proceed.</span>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              {/* File Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select AFMS Backup File (.json)</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUploadForRestore}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {restorePreviewSummary && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-blue-900">Backup Preview Summary ({restoreFileName}):</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-blue-800 font-mono">
                    <div>Clients: {restorePreviewSummary.Clients}</div>
                    <div>Invoices: {restorePreviewSummary.Invoices}</div>
                    <div>Payments: {restorePreviewSummary.Payments}</div>
                    <div>Compliance: {restorePreviewSummary.Compliance}</div>
                    <div>Tasks: {restorePreviewSummary.Tasks}</div>
                    <div>Documents: {restorePreviewSummary.Documents}</div>
                  </div>
                </div>
              )}

              {restoreErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{restoreErrorMessage}</span>
                </div>
              )}

              {restoreSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{restoreSuccessMessage}</span>
                </div>
              )}

              {/* Confirm Text */}
              {restorePreviewSummary && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Type "RESTORE" to authorize data replacement</label>
                    <input
                      type="text"
                      value={restoreConfirmText}
                      onChange={(e) => setRestoreConfirmText(e.target.value)}
                      placeholder="RESTORE"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <button
                    onClick={handleExecuteRestore}
                    disabled={restoreConfirmText.trim() !== 'RESTORE'}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Execute Safe Restore</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUTO BACKUP SCHEDULE */}
      {activeTab === 'AutoBackup' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4 max-w-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Automated Backup Settings</h2>
              <p className="text-xs text-slate-500">Configure background backup snapshots.</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg">Active</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Backup Frequency</span>
              <select
                value={autoBackupSchedule.frequency}
                onChange={(e) => updateAutoBackupSchedule({ frequency: e.target.value as any })}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="DAILY">Daily Snapshot</option>
                <option value="WEEKLY">Weekly Snapshot</option>
                <option value="LOGOUT">On Logout</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Last Backup Run</span>
              <span className="text-xs font-mono font-bold text-slate-900">{autoBackupSchedule.lastBackupTimestamp || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
