import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DocumentItem, DocumentCategory, DocumentStatus } from '../types';
import { 
  FolderGit2, 
  FileText, 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Tag, 
  Calendar, 
  User as UserIcon, 
  History, 
  Eye, 
  Archive, 
  RefreshCw, 
  Plus, 
  X, 
  Link2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  FileImage, 
  FileArchive, 
  ExternalLink, 
  Lock, 
  File,
  Edit3,
  Trash2,
  Building2,
  CheckSquare,
  Receipt,
  CreditCard,
  Briefcase
} from 'lucide-react';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'BIR',
  'SEC',
  'Business Permits',
  'Financial Statements',
  'Contracts',
  'Government Forms',
  'Payroll',
  'Billing & Collections',
  'Other'
];

export const DOCUMENT_TYPES = [
  'BIR Return',
  'Tax Payment Confirmation',
  'SSS / PhilHealth / HDMF Document',
  'Financial Statement',
  'SEC Document',
  'DTI Document',
  'Payroll Document',
  'Invoice PDF',
  'Collection Receipt',
  'Contract',
  'Client-Provided Document',
  'Supporting Document',
  'Other'
];

interface DocumentLibraryViewProps {
  onNavigateToClient?: (clientId: string) => void;
}

export const DocumentLibraryView: React.FC<DocumentLibraryViewProps> = ({ onNavigateToClient }) => {
  const { 
    documents, 
    clients, 
    tasks, 
    invoices, 
    payments, 
    clientServices, 
    addDocument, 
    updateDocument, 
    uploadDocumentVersion, 
    archiveDocument, 
    restoreDocument, 
    deleteDocument,
    logDocumentAction
  } = useData();

  const { currentUser, isSuperAdmin, hasPermission } = useAuth();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('Active'); // Default 'Active'
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'client'>('newest');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Active Document Selection
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileDataUrl, setUploadFileDataUrl] = useState<string>('');
  const [uploadClientId, setUploadClientId] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('BIR');
  const [uploadDocumentType, setUploadDocumentType] = useState('BIR Return');
  const [uploadTaxablePeriod, setUploadTaxablePeriod] = useState('');
  const [uploadDocumentDate, setUploadDocumentDate] = useState(new Date().toISOString().substring(0, 10));
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadServiceId, setUploadServiceId] = useState('');
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [uploadInvoiceId, setUploadInvoiceId] = useState('');
  const [uploadPaymentId, setUploadPaymentId] = useState('');

  // New Version Form State
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionFileDataUrl, setVersionFileDataUrl] = useState<string>('');
  const [versionReason, setVersionReason] = useState('');
  const [versionNotes, setVersionNotes] = useState('');

  // Edit Metadata Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<DocumentCategory>('BIR');
  const [editDocumentType, setEditDocumentType] = useState('');
  const [editTaxablePeriod, setEditTaxablePeriod] = useState('');
  const [editDocumentDate, setEditDocumentDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editTaskId, setEditTaskId] = useState('');
  const [editInvoiceId, setEditInvoiceId] = useState('');
  const [editPaymentId, setEditPaymentId] = useState('');

  // Unique Taxable Periods for Filter
  const availablePeriods = useMemo(() => {
    const setP = new Set<string>();
    documents.forEach(d => {
      if (d.taxablePeriod) setP.add(d.taxablePeriod);
    });
    return Array.from(setP).sort();
  }, [documents]);

  // Client Access Control Verification
  const accessibleDocuments = useMemo(() => {
    if (isSuperAdmin) return documents;
    
    // Check RBAC
    const allowedClientIds = currentUser?.permissions?.clientAccessList;
    return documents.filter(doc => {
      // If user has specific client restrictions
      if (allowedClientIds && allowedClientIds.length > 0 && !allowedClientIds.includes(doc.clientId)) {
        return false;
      }
      // If staff has document access permission
      if (currentUser?.permissions?.documents === false) return false;
      return true;
    });
  }, [documents, currentUser, isSuperAdmin]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return accessibleDocuments.filter(doc => {
      // Search Term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(term);
        const matchesFile = doc.fileName.toLowerCase().includes(term);
        const matchesClient = doc.clientName.toLowerCase().includes(term);
        const matchesPeriod = doc.taxablePeriod?.toLowerCase().includes(term);
        const matchesTags = doc.tags?.some(t => t.toLowerCase().includes(term));
        const matchesNotes = doc.notes?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesFile && !matchesClient && !matchesPeriod && !matchesTags && !matchesNotes) {
          return false;
        }
      }

      // Category Filter
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }

      // Type Filter
      if (selectedType !== 'ALL' && doc.documentType !== selectedType) {
        return false;
      }

      // Client Filter
      if (selectedClientId !== 'ALL' && doc.clientId !== selectedClientId) {
        return false;
      }

      // Period Filter
      if (selectedPeriod !== 'ALL' && doc.taxablePeriod !== selectedPeriod) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'ALL') {
        const docStatus = doc.status || 'Active';
        if (docStatus !== selectedStatus) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.uploadedAt || b.uploadDate).getTime() - new Date(a.uploadedAt || a.uploadDate).getTime();
      if (sortBy === 'oldest') return new Date(a.uploadedAt || a.uploadDate).getTime() - new Date(b.uploadedAt || b.uploadDate).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'client') return a.clientName.localeCompare(b.clientName);
      return 0;
    });
  }, [accessibleDocuments, searchTerm, selectedCategory, selectedType, selectedClientId, selectedPeriod, selectedStatus, sortBy]);

  // Stats Counters
  const stats = useMemo(() => {
    const total = accessibleDocuments.length;
    const active = accessibleDocuments.filter(d => (d.status || 'Active') === 'Active').length;
    const archived = accessibleDocuments.filter(d => d.status === 'Archived').length;
    const taxDocs = accessibleDocuments.filter(d => d.category === 'BIR' || d.category === 'SEC' || d.category === 'Business Permits').length;
    const billingDocs = accessibleDocuments.filter(d => d.category === 'Billing & Collections' || !!d.invoiceId || !!d.paymentId).length;

    return { total, active, archived, taxDocs, billingDocs };
  }, [accessibleDocuments]);

  // File Upload Reader Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isVersion: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isVersion) {
      setVersionFile(file);
    } else {
      setUploadFile(file);
      if (!uploadTitle) {
        // Auto-fill title from filename
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        setUploadTitle(cleanName);
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (isVersion) {
        setVersionFileDataUrl(result);
      } else {
        setUploadFileDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Upload New Document
  const handleSaveNewDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadClientId) {
      alert('Please select a client.');
      return;
    }
    if (!uploadTitle.trim()) {
      alert('Please provide a document title.');
      return;
    }

    // Check if selected client is archived
    const targetClient = clients.find(c => c.id === uploadClientId);
    if (!targetClient) {
      alert('Client not found.');
      return;
    }

    if (targetClient.status === 'Archived') {
      alert(`Cannot upload documents to "${targetClient.companyName}" because this client is ARCHIVED. Please restore the client profile first if you need to upload new records.`);
      return;
    }

    const fileName = uploadFile ? uploadFile.name : `${uploadTitle.replace(/\s+/g, '_')}.pdf`;
    const fileSize = uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : '1.5 MB';
    const ext = fileName.split('.').pop()?.toUpperCase() || 'PDF';
    let fileType: DocumentItem['fileType'] = 'PDF';
    if (['XLS', 'XLSX', 'CSV'].includes(ext)) fileType = 'Excel';
    else if (['DOC', 'DOCX'].includes(ext)) fileType = 'Word';
    else if (['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext)) fileType = 'Image';
    else if (['ZIP', 'RAR', '7Z'].includes(ext)) fileType = 'ZIP';

    const tagsArray = uploadTags ? uploadTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const newDoc = addDocument({
      clientId: uploadClientId,
      clientName: targetClient.companyName,
      clientServiceId: uploadServiceId || undefined,
      taskId: uploadTaskId || undefined,
      invoiceId: uploadInvoiceId || undefined,
      paymentId: uploadPaymentId || undefined,
      documentType: uploadDocumentType,
      category: uploadCategory,
      title: uploadTitle.trim(),
      fileName,
      fileType,
      fileSize,
      documentDate: uploadDocumentDate,
      taxablePeriod: uploadTaxablePeriod || undefined,
      uploadedBy: currentUser?.fullName || 'System User',
      uploadedById: currentUser?.id,
      uploadedAt: new Date().toISOString(),
      version: '1.0',
      status: 'Active',
      notes: uploadNotes || undefined,
      tags: tagsArray,
      dataUrl: uploadFileDataUrl || undefined
    }, currentUser?.id, currentUser?.fullName);

    // Reset and Close
    setIsUploadModalOpen(false);
    resetUploadForm();
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadFileDataUrl('');
    setUploadClientId('');
    setUploadTitle('');
    setUploadCategory('BIR');
    setUploadDocumentType('BIR Return');
    setUploadTaxablePeriod('');
    setUploadDocumentDate(new Date().toISOString().substring(0, 10));
    setUploadNotes('');
    setUploadTags('');
    setUploadServiceId('');
    setUploadTaskId('');
    setUploadInvoiceId('');
    setUploadPaymentId('');
  };

  // Submit Upload New Version
  const handleSaveNewVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    if (!versionFile && !versionFileDataUrl) {
      alert('Please select a file for the new version.');
      return;
    }

    const fileName = versionFile ? versionFile.name : selectedDoc.fileName;
    const fileSize = versionFile ? `${(versionFile.size / (1024 * 1024)).toFixed(2)} MB` : selectedDoc.fileSize;

    uploadDocumentVersion(
      selectedDoc.id,
      {
        fileName,
        fileSize,
        dataUrl: versionFileDataUrl || selectedDoc.dataUrl,
        changeReason: versionReason.trim() || 'Updated version',
        notes: versionNotes.trim() || undefined
      },
      currentUser?.id,
      currentUser?.fullName
    );

    setIsVersionModalOpen(false);
    setSelectedDoc(null);
    setVersionFile(null);
    setVersionFileDataUrl('');
    setVersionReason('');
    setVersionNotes('');
  };

  // Submit Edit Metadata
  const handleSaveEditMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    const tagsArray = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    updateDocument(
      selectedDoc.id,
      {
        title: editTitle.trim(),
        category: editCategory,
        documentType: editDocumentType,
        taxablePeriod: editTaxablePeriod || undefined,
        documentDate: editDocumentDate || undefined,
        notes: editNotes || undefined,
        tags: tagsArray,
        taskId: editTaskId || undefined,
        invoiceId: editInvoiceId || undefined,
        paymentId: editPaymentId || undefined
      },
      currentUser?.id,
      currentUser?.fullName
    );

    setIsEditModalOpen(false);
    setSelectedDoc(null);
  };

  // Open Edit Modal Helper
  const openEditModal = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditDocumentType(doc.documentType || '');
    setEditTaxablePeriod(doc.taxablePeriod || '');
    setEditDocumentDate(doc.documentDate || '');
    setEditNotes(doc.notes || '');
    setEditTags(doc.tags ? doc.tags.join(', ') : '');
    setEditTaskId(doc.taskId || '');
    setEditInvoiceId(doc.invoiceId || '');
    setEditPaymentId(doc.paymentId || '');
    setIsEditModalOpen(true);
  };

  // File Download Handler
  const handleDownloadFile = (doc: DocumentItem, versionSnap?: any) => {
    const url = versionSnap?.dataUrl || doc.dataUrl;
    const filename = versionSnap?.fileName || doc.fileName;

    logDocumentAction(
      doc.id, 
      'Download Request', 
      `User downloaded file "${filename}" (Version ${versionSnap?.versionNumber || doc.version}).`,
      currentUser?.id,
      currentUser?.fullName
    );

    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Simulate dummy document download
      const content = `FFCSI AFMS Document Record Archive\nDocument ID: ${doc.id}\nTitle: ${doc.title}\nClient: ${doc.clientName}\nCategory: ${doc.category}\nVersion: ${versionSnap?.versionNumber || doc.version}\nDownloaded By: ${currentUser?.fullName || 'User'}\nTimestamp: ${new Date().toLocaleString()}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }
  };

  // File Type Icon Selector
  const renderFileTypeIcon = (type: string) => {
    switch (type) {
      case 'Excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'Image':
        return <FileImage className="w-5 h-5 text-purple-600" />;
      case 'ZIP':
        return <FileArchive className="w-5 h-5 text-amber-600" />;
      case 'Word':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'PDF':
      default:
        return <File className="w-5 h-5 text-rose-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Centralized Document Management & Records Archive</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Unified document repository linked across Clients, Services, Compliance Tasks, Invoices, and Payment Receipts.
          </p>
        </div>

        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-2 transition-all shrink-0"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Records</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Across all clients</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Active Docs</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.active}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Current & active versions</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Archived Docs</span>
          <div className="text-2xl font-bold text-slate-700 mt-1">{stats.archived}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Preserved historical logs</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Tax & Compliance</span>
          <div className="text-2xl font-bold text-blue-800 mt-1">{stats.taxDocs}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">BIR, SEC & Permits</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Billing & Receipts</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{stats.billingDocs}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Invoices & CR Proofs</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search title, client, file, tag, period..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Client Filter */}
          <select 
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Clients ({clients.length})</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.companyName} {c.status === 'Archived' ? '(Archived)' : ''}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select 
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Categories</option>
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Document Type Filter */}
          <select 
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Document Types</option>
            {DOCUMENT_TYPES.map(dt => (
              <option key={dt} value={dt}>{dt}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Taxable Period Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Period:</span>
              <select 
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Taxable Periods</option>
                {availablePeriods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select 
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Archived">Archived Only</option>
                <option value="Superseded">Superseded</option>
                <option value="Pending Review">Pending Review</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Sort:</span>
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
                <option value="client">Client A-Z</option>
              </select>
            </div>
          </div>

          <div className="text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredDocuments.length}</strong> of {accessibleDocuments.length} documents
          </div>
        </div>
      </div>

      {/* Main Documents Table List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <FolderGit2 className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-700">No documents match your filter query.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search terms or filter selection, or click "Upload Document" to add a new file.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Document Title & File</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Category / Type</th>
                  <th className="py-3 px-4">Taxable Period</th>
                  <th className="py-3 px-4">Related Records</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map(doc => {
                  const clientObj = clients.find(c => c.id === doc.clientId);
                  const isClientArchived = clientObj?.status === 'Archived';
                  const taskObj = doc.taskId ? tasks.find(t => t.id === doc.taskId) : null;
                  const invoiceObj = doc.invoiceId ? invoices.find(i => i.id === doc.invoiceId) : null;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Document Title & File */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                            {renderFileTypeIcon(doc.fileType)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1">{doc.title}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {doc.fileName} • <span className="text-slate-400">{doc.fileSize}</span>
                            </p>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {doc.tags.map((tag, idx) => (
                                  <span key={idx} className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-medium">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span 
                            onClick={() => onNavigateToClient && onNavigateToClient(doc.clientId)}
                            className="hover:text-blue-600 cursor-pointer underline-offset-2 hover:underline line-clamp-2"
                          >
                            {doc.clientName}
                          </span>
                          {isClientArchived && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-300 rounded text-[9px] font-bold shrink-0">
                              Archived
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category & Document Type */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold text-[10px] block w-fit">
                          {doc.category}
                        </span>
                        {doc.documentType && (
                          <span className="text-[10px] text-slate-500 block mt-1 font-medium">
                            {doc.documentType}
                          </span>
                        )}
                      </td>

                      {/* Taxable Period & Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <div>
                          {doc.taxablePeriod ? (
                            <span className="font-bold text-slate-800 block">{doc.taxablePeriod}</span>
                          ) : (
                            <span className="text-slate-400 block">—</span>
                          )}
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Uploaded: {doc.uploadDate}
                          </span>
                        </div>
                      </td>

                      {/* Related Records */}
                      <td className="py-3.5 px-4 space-y-1">
                        {taskObj && (
                          <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 w-fit">
                            <CheckSquare className="w-3 h-3 shrink-0" />
                            <span className="font-bold truncate max-w-[120px]">{taskObj.formCode || taskObj.title}</span>
                          </div>
                        )}

                        {invoiceObj && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                            <Receipt className="w-3 h-3 shrink-0" />
                            <span className="font-bold">{invoiceObj.invoiceNumber}</span>
                          </div>
                        )}

                        {doc.paymentId && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                            <CreditCard className="w-3 h-3 shrink-0" />
                            <span className="font-bold">CR / Payment Proof</span>
                          </div>
                        )}

                        {!taskObj && !invoiceObj && !doc.paymentId && (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Version */}
                      <td className="py-3.5 px-4">
                        <button 
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsHistoryModalOpen(true);
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md font-mono font-bold text-[10px] flex items-center gap-1 transition-all"
                          title="View Version History"
                        >
                          v{doc.version}
                          {doc.versionHistory && doc.versionHistory.length > 0 && (
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                          )}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (doc.status || 'Active') === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          doc.status === 'Archived' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                          doc.status === 'Superseded' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {doc.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview / View */}
                          <button 
                            onClick={() => {
                              setSelectedDoc(doc);
                              setIsPreviewModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-all"
                            title="Preview & Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download */}
                          <button 
                            onClick={() => handleDownloadFile(doc)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-all"
                            title="Download Document"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Upload New Version */}
                          <button 
                            onClick={() => {
                              if (isClientArchived) {
                                alert(`Cannot upload new versions for "${doc.clientName}" because this client is ARCHIVED.`);
                                return;
                              }
                              setSelectedDoc(doc);
                              setIsVersionModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-purple-600 rounded-lg transition-all"
                            title="Upload New Version"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* Edit Metadata */}
                          <button 
                            onClick={() => openEditModal(doc)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-all"
                            title="Edit Metadata"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Archive / Restore */}
                          {doc.status === 'Archived' ? (
                            <button 
                              onClick={() => restoreDocument(doc.id, currentUser?.id, currentUser?.fullName)}
                              className="p-1.5 hover:bg-slate-100 text-emerald-600 rounded-lg transition-all"
                              title="Restore Document"
                            >
                              <RotateCcwIcon className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => archiveDocument(doc.id, 'User request', currentUser?.id, currentUser?.fullName)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-amber-600 rounded-lg transition-all"
                              title="Archive Document"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: UPLOAD NEW DOCUMENT */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Upload Document to Central Repository</h3>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDocument} className="space-y-4 text-xs">
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50/50 hover:border-blue-400 transition-colors">
                <input 
                  type="file" 
                  id="file-upload-input" 
                  onChange={(e) => handleFileChange(e, false)} 
                  className="hidden" 
                />
                <label htmlFor="file-upload-input" className="cursor-pointer space-y-2 block">
                  <Upload className="w-8 h-8 text-blue-500 mx-auto" />
                  <p className="font-bold text-slate-800 text-xs">
                    {uploadFile ? uploadFile.name : 'Click to select or drag and drop document'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports PDF, Excel (.xlsx), Word (.docx), Images, ZIP archives (Max 25MB).
                  </p>
                </label>
              </div>

              {/* Client Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Client <span className="text-rose-500">*</span>
                </label>
                <select 
                  required
                  value={uploadClientId}
                  onChange={e => setUploadClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Client Profile --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id} disabled={c.status === 'Archived'}>
                      {c.companyName} {c.status === 'Archived' ? '(ARCHIVED - LOCKED)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Document Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Document Title <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. BIR 2550Q 2Q-2026 Filed Return" 
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Date</label>
                  <input 
                    type="date" 
                    value={uploadDocumentDate}
                    onChange={e => setUploadDocumentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Category & Document Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select 
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value as DocumentCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Type</label>
                  <select 
                    value={uploadDocumentType}
                    onChange={e => setUploadDocumentType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {DOCUMENT_TYPES.map(dt => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Taxable Period & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Taxable Period</label>
                  <input 
                    type="text" 
                    placeholder="e.g. August 2026, 3Q-2026, TY-2025" 
                    value={uploadTaxablePeriod}
                    onChange={e => setUploadTaxablePeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tags (Comma Separated)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. eFPS, Final, Audited, 2307" 
                    value={uploadTags}
                    onChange={e => setUploadTags(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Optional Linkages */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 text-[11px] block flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-blue-600" /> Optional Entity Linkages
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Link to Compliance Task</label>
                    <select 
                      value={uploadTaskId}
                      onChange={e => setUploadTaskId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                    >
                      <option value="">-- No Task Link --</option>
                      {tasks.filter(t => !uploadClientId || t.clientId === uploadClientId).map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.formCode || t.status})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Link to Billing Invoice</label>
                    <select 
                      value={uploadInvoiceId}
                      onChange={e => setUploadInvoiceId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                    >
                      <option value="">-- No Invoice Link --</option>
                      {invoices.filter(i => !uploadClientId || i.clientId === uploadClientId).map(i => (
                        <option key={i.id} value={i.id}>{i.invoiceNumber} (₱{i.totalAmount.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes & Remarks</label>
                <textarea 
                  rows={2}
                  placeholder="Additional document context, filing confirmation numbers, or review notes..."
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> Save & Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD NEW VERSION */}
      {isVersionModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">Upload New Document Version</h3>
              </div>
              <button onClick={() => setIsVersionModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
              <p className="font-bold">{selectedDoc.title}</p>
              <p className="text-[11px] text-purple-700">
                Current Version: <strong className="font-mono">v{selectedDoc.version}</strong> ({selectedDoc.fileName})
              </p>
            </div>

            <form onSubmit={handleSaveNewVersion} className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50">
                <input type="file" id="version-file-input" onChange={(e) => handleFileChange(e, true)} className="hidden" />
                <label htmlFor="version-file-input" className="cursor-pointer space-y-1 block">
                  <Upload className="w-6 h-6 text-purple-600 mx-auto" />
                  <p className="font-bold text-slate-800 text-xs">
                    {versionFile ? versionFile.name : 'Select replacement document file'}
                  </p>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Change Reason / Version Notes <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Amended return filed with updated BIR confirmation receipt"
                  value={versionReason}
                  onChange={e => setVersionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsVersionModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold shadow-sm">
                  Commit New Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VERSION HISTORY */}
      {isHistoryModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Version History Timeline</h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">{selectedDoc.title}</p>
              <p className="text-[11px] text-slate-500">{selectedDoc.clientName} • Category: {selectedDoc.category}</p>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
              {/* Current Version */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-bold font-mono text-[10px]">
                      v{selectedDoc.version} (CURRENT)
                    </span>
                    <span className="font-bold text-slate-900">{selectedDoc.fileName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Uploaded by <strong className="text-slate-800">{selectedDoc.uploadedBy}</strong> on {selectedDoc.uploadDate}
                  </p>
                  {selectedDoc.notes && <p className="text-[11px] text-slate-600 mt-1 italic">"{selectedDoc.notes}"</p>}
                </div>
                <button 
                  onClick={() => handleDownloadFile(selectedDoc)} 
                  className="p-1.5 bg-white text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Historical Versions */}
              {selectedDoc.versionHistory && selectedDoc.versionHistory.length > 0 ? (
                selectedDoc.versionHistory.map((vh, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold font-mono text-[10px]">
                          v{vh.versionNumber}
                        </span>
                        <span className="font-bold text-slate-800">{vh.fileName}</span>
                        <span className="text-[10px] text-slate-400">({vh.fileSize})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Uploaded by <strong className="text-slate-700">{vh.uploadedBy}</strong> on {vh.uploadedAt.substring(0, 10)}
                      </p>
                      {vh.changeReason && (
                        <p className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-200 w-fit">
                          Reason: {vh.changeReason}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDownloadFile(selectedDoc, vh)} 
                      className="p-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                      title="Download Historical Version"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-3 text-xs">No previous versions on file.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PREVIEW & DETAILS */}
      {isPreviewModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">{selectedDoc.title}</h3>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-medium block">Client Profile</span>
                <span className="font-bold text-slate-800">{selectedDoc.clientName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Category & Type</span>
                <span className="font-bold text-slate-800">{selectedDoc.category} • {selectedDoc.documentType || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Taxable Period</span>
                <span className="font-bold text-slate-800">{selectedDoc.taxablePeriod || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Version & Status</span>
                <span className="font-bold text-slate-800">v{selectedDoc.version} ({selectedDoc.status || 'Active'})</span>
              </div>
            </div>

            {selectedDoc.dataUrl && selectedDoc.fileType === 'Image' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 flex items-center justify-center bg-slate-900/5">
                <img src={selectedDoc.dataUrl} alt={selectedDoc.title} className="max-h-56 object-contain" />
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-8 text-center bg-slate-50 space-y-2">
                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-800 text-xs">{selectedDoc.fileName}</p>
                <p className="text-[11px] text-slate-500">File Size: {selectedDoc.fileSize} • Uploaded by {selectedDoc.uploadedBy}</p>
              </div>
            )}

            {selectedDoc.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <strong>Notes:</strong> {selectedDoc.notes}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button 
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  openEditModal(selectedDoc);
                }} 
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Edit Metadata
              </button>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPreviewModalOpen(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleDownloadFile(selectedDoc)} 
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT METADATA */}
      {isEditModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Edit Document Metadata & Linkages</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMetadata} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title</label>
                <input 
                  type="text" 
                  required 
                  value={editTitle || ''} 
                  onChange={e => setEditTitle(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select value={editCategory || 'BIR'} onChange={e => setEditCategory(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs">
                    {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Type</label>
                  <select value={editDocumentType || ''} onChange={e => setEditDocumentType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs">
                    {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Taxable Period</label>
                  <input type="text" value={editTaxablePeriod || ''} onChange={e => setEditTaxablePeriod(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tags (Comma Separated)</label>
                  <input type="text" value={editTags || ''} onChange={e => setEditTags(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea rows={2} value={editNotes || ''} onChange={e => setEditNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
