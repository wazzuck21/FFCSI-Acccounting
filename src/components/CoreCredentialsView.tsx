import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CoreCredential, CredentialAmendment } from '../types';
import { SearchableClientSelect } from './SearchableClientSelect';
import { credentialVault, VAULT_REQUIRE_UNLOCK } from '../lib/credentialVaultService';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import { 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Building2, 
  Globe, 
  ShieldCheck, 
  X, 
  AlertTriangle,
  History,
  Unlock
} from 'lucide-react';

export const CoreCredentialsView: React.FC = () => {
  const { credentials, clients, addCredential, updateCredential, deleteCredential, addAuditLog } = useData();
  const { currentUser, isSuperAdmin, can } = useAuth();

  // Vault Unlock State - Default to Unlocked in Dev mode ⭐
  const [isUnlocked, setIsUnlocked] = useState(credentialVault.isUnlocked());
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [portalFilter, setPortalFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCred, setEditingCred] = useState<CoreCredential | null>(null);
  const [selectedHistoryCred, setSelectedHistoryCred] = useState<CoreCredential | null>(null);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [portalType, setPortalType] = useState<CoreCredential['portalType']>('eFPS');
  const [portalName, setPortalName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState('');
  const [governmentIdNumber, setGovernmentIdNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [notes, setNotes] = useState('');

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setTinNumber(client.tinNumber || '');
    }
  };

  // Masking & decrypted secret state per credential ID
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Handle Secure Vault Unlock with Hash Verification
  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (VAULT_REQUIRE_UNLOCK && !vaultPassword) {
      setVaultError('Please enter user password to unlock confidential vault.');
      return;
    }

    setIsVerifying(true);
    const isValid = await credentialVault.unlock(
      vaultPassword,
      currentUser?.passwordHash,
      currentUser?.salt,
      currentUser?.password
    );

    setIsVerifying(false);

    if (isValid) {
      setIsUnlocked(true);
      setVaultError('');
      setVaultPassword('');
      addAuditLog(
        'Confidential Credentials Vault Unlocked',
        `User ${currentUser?.fullName} (${currentUser?.role}) unlocked the Core Portal Credentials Vault.`,
        currentUser?.id || 'system',
        currentUser?.fullName || 'System Admin',
        'CredentialVault',
        'VAULT_UNLOCK',
        undefined,
        'Vault Unlocked'
      );
    } else {
      setVaultError('Invalid password! Access denied to confidential credentials.');
    }
  };

  const togglePasswordVisibility = async (cred: CoreCredential) => {
    const isCurrentlyVisible = visiblePasswords[cred.id];
    if (!isCurrentlyVisible) {
      // Decrypt if encrypted
      let plaintextPass = cred.password || '';
      if (cred.isEncrypted && cred.encryptedPassword && cred.iv && cred.salt) {
        plaintextPass = await credentialVault.decryptSecret(cred.encryptedPassword, cred.iv, cred.salt);
      }
      setDecryptedMap(prev => ({ ...prev, [cred.id]: plaintextPass }));
      addAuditLog(
        'Credential Password Unmasked',
        `User ${currentUser?.fullName} unmasked ${cred.portalType} password for ${cred.clientName}.`,
        currentUser?.id || 'system',
        currentUser?.fullName || 'User',
        'Credential',
        cred.id,
        cred.clientId,
        'Vault Inspection'
      );
    }
    setVisiblePasswords(prev => ({ ...prev, [cred.id]: !prev[cred.id] }));
  };

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open Form Modal
  const handleOpenAdd = () => {
    setEditingCred(null);
    const firstClient = clients[0];
    setSelectedClientId(firstClient?.id || '');
    setPortalType('eFPS');
    setPortalName('');
    setUsername('');
    setPassword('');
    setPinCode('');
    setSecurityQuestions('');
    setGovernmentIdNumber('');
    setTinNumber(firstClient?.tinNumber || '');
    setNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = async (cred: CoreCredential) => {
    setEditingCred(cred);
    setSelectedClientId(cred.clientId);
    setPortalType(cred.portalType);
    setPortalName(cred.portalName || '');
    setUsername(cred.username);

    let plainPass = cred.password || '';
    if (cred.isEncrypted && cred.encryptedPassword && cred.iv && cred.salt) {
      plainPass = await credentialVault.decryptSecret(cred.encryptedPassword, cred.iv, cred.salt);
    }
    setPassword(plainPass);
    setPinCode(cred.pinCode || '');
    setSecurityQuestions(cred.securityQuestions || '');
    setGovernmentIdNumber(cred.governmentIdNumber || '');
    const client = clients.find(c => c.id === cred.clientId);
    setTinNumber(cred.tinNumber || client?.tinNumber || '');
    setNotes(cred.notes || '');
    setShowAddModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Please select a client.');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // AES-GCM encrypt the password secret
    const encryptedResult = await credentialVault.encryptSecret(password);

    if (editingCred) {
      const changesList: string[] = [];
      if (editingCred.username !== username) changesList.push(`Username: "${editingCred.username}" ➔ "${username}"`);
      if (editingCred.password !== password) changesList.push(`Password changed`);
      if ((editingCred.pinCode || '') !== pinCode) changesList.push(`PIN Code updated`);
      if ((editingCred.portalName || '') !== portalName) changesList.push(`Portal Name: "${editingCred.portalName || ''}" ➔ "${portalName}"`);
      if ((editingCred.governmentIdNumber || '') !== governmentIdNumber) changesList.push(`Gov ID updated`);
      if ((editingCred.tinNumber || '') !== tinNumber) changesList.push(`TIN updated`);
      if ((editingCred.notes || '') !== notes) changesList.push(`Notes updated`);

      const amendment: CredentialAmendment = {
        date: nowStr,
        modifiedBy: currentUser?.fullName || 'Admin',
        fieldChanged: changesList.length > 0 ? changesList.join('; ') : 'Profile information updated',
        details: changesList.length > 0 ? changesList.join(', ') : 'Re-saved credential parameters',
      };

      const prevHistory = editingCred.amendedHistory || [];

      updateCredential(editingCred.id, {
        clientId: client.id,
        clientName: client.companyName,
        portalType,
        portalName: portalName || `${portalType} Portal`,
        username,
        encryptedPassword: encryptedResult.ciphertext,
        iv: encryptedResult.iv,
        salt: encryptedResult.salt,
        isEncrypted: true,
        password: '••••••••', // Masked placeholder in state
        pinCode,
        securityQuestions,
        governmentIdNumber,
        tinNumber,
        notes,
        updatedBy: currentUser?.fullName || 'Admin',
        updatedAt: nowStr,
        amendedHistory: [amendment, ...prevHistory],
      });
      addAuditLog(
        'Credential Updated',
        `Updated ${portalType} credential for ${client.companyName}. Changes: ${amendment.fieldChanged}`,
        currentUser?.id || 'system',
        currentUser?.fullName || 'Admin',
        'Credential',
        editingCred.id,
        client.id
      );
    } else {
      addCredential({
        clientId: client.id,
        clientName: client.companyName,
        portalType,
        portalName: portalName || `${portalType} Portal`,
        username,
        encryptedPassword: encryptedResult.ciphertext,
        iv: encryptedResult.iv,
        salt: encryptedResult.salt,
        isEncrypted: true,
        password: '••••••••',
        pinCode,
        securityQuestions,
        governmentIdNumber,
        tinNumber,
        notes,
        updatedBy: currentUser?.fullName || 'Admin',
        updatedAt: nowStr,
        amendedHistory: [{
          date: nowStr,
          modifiedBy: currentUser?.fullName || 'Admin',
          fieldChanged: 'Initial Credential Creation',
          details: `Created credential record for ${client.companyName}`
        }]
      });
      addAuditLog(
        'Credential Created',
        `Added new ${portalType} portal credential for ${client.companyName}.`,
        currentUser?.id || 'system',
        currentUser?.fullName || 'Admin',
        'Credential',
        undefined,
        client.id
      );
    }

    setShowAddModal(false);
  };

  const handleDeleteCred = (cred: CoreCredential) => {
    if (confirm(`Are you sure you want to delete the ${cred.portalType} credential for ${cred.clientName}?`)) {
      deleteCredential(cred.id);
      addAuditLog(
        'Credential Deleted',
        `Deleted ${cred.portalType} credential for ${cred.clientName}.`,
        currentUser?.id || 'system',
        currentUser?.fullName || 'Admin'
      );
    }
  };

  // Filtered List
  const filteredCredentials = credentials.filter(cred => {
    const matchesSearch = cred.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cred.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (cred.portalName && cred.portalName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPortal = portalFilter === 'ALL' || cred.portalType === portalFilter;
    const matchesClient = clientFilter === 'ALL' || cred.clientId === clientFilter;
    return matchesSearch && matchesPortal && matchesClient;
  });

  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems: paginatedCredentials,
    setCurrentPage,
    setPageSize,
    loadMore,
    hasMoreToLoad,
  } = usePagination(filteredCredentials, {
    initialPageSize: 15,
    resetOnChange: `${searchQuery}_${portalFilter}_${clientFilter}`,
  });

  // Locked View Gate
  if (!isUnlocked) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600 shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Confidential Core Credentials Vault</h2>
            <p className="text-xs text-slate-500 mt-2">
              This area contains sensitive government portal logins (eFPS, Banks, HDMF, PHIC, SSS). Authenticate your session password to proceed.
            </p>
          </div>

          <form onSubmit={handleUnlockVault} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Your Login / Admin Password *
              </label>
              <input
                type="password"
                required
                placeholder="Enter password..."
                value={vaultPassword}
                onChange={e => setVaultPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-rose-200 focus:outline-none"
              />
            </div>

            {vaultError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{vaultError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Unlock Credentials Vault
            </button>
          </form>

          <p className="text-[11px] text-slate-400 italic">
            🔒 All credential views and decrypt attempts are logged in audit security logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              Confidential Core Credentials Manager
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Vault Status: Unlocked
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Store and manage secure credentials for client BIR eFPS, Bank Portals, HDMF (Pag-IBIG), PHIC (PhilHealth), and SSS.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              credentialVault.lock();
              setIsUnlocked(false);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" /> Lock Vault
          </button>
          {isSuperAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Core Credential
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search client, portal, or username..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Searchable Client Filter */}
          <div className="w-56">
            <SearchableClientSelect
              clients={clients}
              selectedClientId={clientFilter}
              onSelectClient={setClientFilter}
              showAllOption
              allOptionLabel="-- All Clients --"
            />
          </div>

          {/* Portal Type Filter */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {['ALL', 'eFPS', 'Bank', 'HDMF', 'PHIC', 'SSS', 'BIR', 'Other'].map(type => (
              <button
                key={type}
                onClick={() => setPortalFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  portalFilter === type
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Credentials Table View */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Portal Type & Name</th>
                <th className="py-3 px-4">Username ID</th>
                <th className="py-3 px-4">Password / Security PIN</th>
                <th className="py-3 px-4">Notes & Last Updated</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredCredentials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No confidential credentials match your search query or filter.
                  </td>
                </tr>
              ) : (
                paginatedCredentials.map(cred => {
                  const isPassVisible = visiblePasswords[cred.id] || false;

                  return (
                    <tr key={cred.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cred.clientName}</span>
                        </div>
                        {(cred.tinNumber || cred.governmentIdNumber) && (
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                            {cred.tinNumber && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">TIN: {cred.tinNumber}</span>}
                            {cred.governmentIdNumber && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Gov ID: {cred.governmentIdNumber}</span>}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cred.portalType === 'eFPS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            cred.portalType === 'Bank' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            cred.portalType === 'HDMF' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            cred.portalType === 'PHIC' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                            cred.portalType === 'SSS' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {cred.portalType}
                          </span>
                          <span className="text-slate-700">{cred.portalName || cred.portalType}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{cred.username}</span>
                          <button
                            onClick={() => handleCopyText(cred.username, `user_${cred.id}`)}
                            title="Copy Username"
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          >
                            {copiedField === `user_${cred.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-800">
                            {isPassVisible ? (decryptedMap[cred.id] || cred.password || '••••••••') : '••••••••••••'}
                          </span>

                          <button
                            onClick={() => togglePasswordVisibility(cred)}
                            title={isPassVisible ? 'Hide Password' : 'Show Password'}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          >
                            {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleCopyText(cred.password, `pass_${cred.id}`)}
                            title="Copy Password"
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          >
                            {copiedField === `pass_${cred.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {cred.pinCode && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                              PIN: {cred.pinCode}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div>{cred.notes || 'No special notes'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">By {cred.updatedBy} ({cred.updatedAt})</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedHistoryCred(cred)}
                            title="View Amendment History"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative"
                          >
                            <History className="w-4 h-4" />
                            {cred.amendedHistory && cred.amendedHistory.length > 0 && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                {cred.amendedHistory.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cred)}
                            title="Edit Credential"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteCred(cred)}
                              title="Delete Credential"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredCredentials.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onLoadMore={loadMore}
            hasMoreToLoad={hasMoreToLoad}
            itemLabel="credentials"
          />
        )}
      </div>

      {/* MODAL: Add/Edit Credential */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                {editingCred ? 'Edit Core Portal Credential' : 'Add New Core Portal Credential'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3">
              <div>
                <SearchableClientSelect
                  clients={clients}
                  selectedClientId={selectedClientId}
                  onSelectClient={handleClientSelect}
                  label="Select Client Company"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Number (SSS, PHIC, Pag-IBIG)</label>
                  <input
                    type="text"
                    placeholder="e.g. SSS / PHIC / Pag-IBIG #"
                    value={governmentIdNumber || ''}
                    onChange={e => setGovernmentIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">TIN Number (000-000-000-000)</label>
                  <input
                    type="text"
                    placeholder="000-000-000-000"
                    value={tinNumber || ''}
                    onChange={e => setTinNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Portal Category *</label>
                  <select
                    value={portalType || 'eFPS'}
                    onChange={e => setPortalType(e.target.value as CoreCredential['portalType'])}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-100 font-semibold"
                  >
                    <option value="eFPS">BIR eFPS Portal</option>
                    <option value="Bank">Bank Online Banking</option>
                    <option value="HDMF">HDMF (Pag-IBIG)</option>
                    <option value="PHIC">PhilHealth (PHIC)</option>
                    <option value="SSS">SSS My.SSS</option>
                    <option value="BIR">Other BIR System</option>
                    <option value="Other">Other Custom Portal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Portal Name / Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Landbank iAccess, eFPS BIR"
                    value={portalName || ''}
                    onChange={e => setPortalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Username / User ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Portal Username"
                    value={username || ''}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Portal Password"
                    value={password || ''}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">PIN Code / Passcode (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1234"
                    value={pinCode || ''}
                    onChange={e => setPinCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Security Q&A (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Pet Name: Max"
                    value={securityQuestions || ''}
                    onChange={e => setSecurityQuestions(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Notes & Usage Context</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes for staff..."
                  value={notes || ''}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xs"
                >
                  {editingCred ? 'Save Changes' : 'Create Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Amendment History */}
      {selectedHistoryCred && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Credential Amendment History
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {selectedHistoryCred.clientName} - {selectedHistoryCred.portalName || selectedHistoryCred.portalType}
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryCred(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(!selectedHistoryCred.amendedHistory || selectedHistoryCred.amendedHistory.length === 0) ? (
                <div className="p-6 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No previous amendments logged for this credential record.
                </div>
              ) : (
                selectedHistoryCred.amendedHistory.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                      <span className="text-indigo-600">{item.fieldChanged}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{item.date}</span>
                    </div>
                    <div className="text-slate-600 text-[11px] font-medium">{item.details}</div>
                    <div className="text-[10px] text-slate-400">Modified by: <strong>{item.modifiedBy}</strong></div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setSelectedHistoryCred(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
