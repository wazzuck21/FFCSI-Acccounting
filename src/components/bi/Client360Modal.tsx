import React from 'react';
import { BiFullState, generateClient360Summary } from '../../lib/biEngine';
import { 
  Building2, 
  X, 
  Briefcase, 
  ShieldCheck, 
  CheckSquare, 
  FolderGit2, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  PhoneCall, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  AlertTriangle,
  Award
} from 'lucide-react';

interface Client360ModalProps {
  clientId: string;
  state: BiFullState;
  onClose: () => void;
}

export const Client360Modal: React.FC<Client360ModalProps> = ({ clientId, state, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'OVERVIEW' | 'SERVICES' | 'COMPLIANCE' | 'TASKS' | 'DOCUMENTS' | 'BILLING' | 'PAYMENTS' | 'COLLECTIONS'>('OVERVIEW');

  const summary = React.useMemo(() => {
    return generateClient360Summary(state, clientId);
  }, [state, clientId]);

  if (!summary) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-xl">
          <p className="text-sm font-bold text-slate-800">Client profile not found.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const { client, services, complianceItems, tasks, documents, invoices, payments, collectionLogs, metrics } = summary;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm">
              {client.companyName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">{client.companyName}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  client.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {client.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                <span>TIN: <strong className="text-white">{client.tinNumber || 'N/A'}</strong></span>
                <span>•</span>
                <span>RDO: <strong className="text-white">{client.rdoNumber}</strong></span>
                <span>•</span>
                <span>Officer: <strong className="text-white">{client.assignedStaffName}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors self-end md:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial & Operational KPI Header Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border-b border-slate-200 p-4 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Billed</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">₱{metrics.totalInvoiced.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Payments</p>
            <p className="text-base font-extrabold text-emerald-600 mt-0.5">₱{metrics.totalPaid.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Outstanding AR</p>
            <p className="text-base font-extrabold text-rose-600 mt-0.5">₱{metrics.totalOutstandingAr.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Compliance Score</p>
            <p className="text-base font-extrabold text-indigo-600 mt-0.5">{metrics.complianceScorePercentage}%</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white px-6 py-2 border-b border-slate-200 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-2 rounded-xl transition-all ${
              activeTab === 'OVERVIEW' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            360 Summary
          </button>
          <button
            onClick={() => setActiveTab('SERVICES')}
            className={`px-3 py-2 rounded-xl transition-all ${
              activeTab === 'SERVICES' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Services ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`px-3 py-2 rounded-xl transition-all ${
              activeTab === 'COMPLIANCE' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Compliance ({complianceItems.length})
          </button>
          <button
            onClick={() => setActiveTab('TASKS')}
            className={`px-3 py-2 rounded-xl transition-all ${
              activeTab === 'TASKS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-3 py-2 rounded-xl transition-all ${
              activeTab === 'DOCUMENTS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('BILLING')}
            className={`px-3 py-2 rounded-xl transition-all ${
              activeTab === 'BILLING' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-3 py-2 rounded-xl transition-all ${
              activeTab === 'PAYMENTS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Payments ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('COLLECTIONS')}
            className={`px-3 py-2 rounded-xl transition-all ${
              activeTab === 'COLLECTIONS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Follow-Ups ({collectionLogs.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
          
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Profile Contact & Registration Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Client Profile Details
                </h3>
                <div className="space-y-2 text-xs">
                  <div><span className="text-slate-400">Address:</span> <p className="font-semibold text-slate-800">{client.address}</p></div>
                  <div><span className="text-slate-400">Contact Person:</span> <p className="font-semibold text-slate-800">{client.contactPerson} ({client.mobileNumber})</p></div>
                  <div><span className="text-slate-400">Email:</span> <p className="font-semibold text-slate-800">{client.emailAddress}</p></div>
                  <div><span className="text-slate-400">Entity Type:</span> <p className="font-semibold text-slate-800">{client.entityType}</p></div>
                  <div><span className="text-slate-400">Retainer Fee:</span> <p className="font-semibold text-emerald-600 font-mono">₱{(client.retainersFee || 0).toLocaleString()} / month</p></div>
                </div>
              </div>

              {/* Quick Operational Status */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" /> Operational & Engagement Summary
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-white rounded-xl border border-slate-200">
                    <span>Active Services:</span>
                    <span className="font-bold text-slate-900">{metrics.activeServicesCount} Subscribed</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-xl border border-slate-200">
                    <span>Pending Tasks:</span>
                    <span className="font-bold text-slate-900">{metrics.pendingTasksCount} Workflow Items</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-xl border border-slate-200">
                    <span>Overdue Invoices:</span>
                    <span className="font-bold text-rose-600">{metrics.overdueArCount} Accounts</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-xl border border-slate-200">
                    <span>On-Time Payment Rating:</span>
                    <span className="font-bold text-emerald-600">{metrics.onTimePaymentScore}%</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'SERVICES' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Subscribed Services ({services.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{s.serviceName}</span>
                      <span className="text-emerald-600 font-mono">₱{(s.fee || 0).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{s.category} • {s.billingFrequency || 'Monthly'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'BILLING' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Invoices Ledger ({invoices.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-2">Invoice #</th>
                      <th className="p-2">Issue Date</th>
                      <th className="p-2">Due Date</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Paid</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="p-2 font-bold">{inv.invoiceNumber}</td>
                        <td className="p-2">{inv.issueDate}</td>
                        <td className="p-2">{inv.dueDate}</td>
                        <td className="p-2 text-right font-mono">₱{inv.totalAmount.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono text-emerald-600">₱{(inv.paidAmount || 0).toLocaleString()}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'PAYMENTS' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Payment Transactions ({payments.length})</h3>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">₱{p.amount.toLocaleString()} ({p.paymentMethod})</p>
                      <p className="text-[11px] text-slate-500">Ref: {p.referenceNumber || 'N/A'} • Receipt: {p.officialReceiptNumber || p.collectionReceiptNumber || 'N/A'}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600">{p.paymentDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
