import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CustomDeadlineRule, MonthlyDeadlineSchedule } from '../types';
import { DEFAULT_BIR_TAX_OPTIONS, DEFAULT_BENEFITS_OPTIONS, getRuleDeadlineForMonth, generateDefaultScheduleForFrequency } from '../data/masterTables';
import { 
  Settings, 
  Plus, 
  Calendar as CalendarIcon, 
  FileText, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Zap, 
  Check, 
  X, 
  Building2, 
  Database, 
  Download, 
  Upload, 
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  FileCheck,
  Grid,
  List,
  Ban
} from 'lucide-react';

const MONTHS_LIST: ('Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec')[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_FULL_NAMES: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
};

const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

export const MasterTablesView: React.FC = () => {
  const { 
    masterChoices, 
    clients,
    addMasterBirOption, 
    updateMasterBirOption, 
    deleteMasterBirOption,
    addMasterBenefitsOption, 
    updateMasterBenefitsOption, 
    deleteMasterBenefitsOption,
    applyMasterDeadlineRuleToAllClients,
    addMasterBusinessNature,
    deleteMasterBusinessNature,
    addMasterBank,
    deleteMasterBank,
    addFormLinkage,
    updateFormLinkage,
    deleteFormLinkage,
    exportBackupData,
    importBackupData,
    addTask,
    addAuditLog
  } = useData();

  const { currentUser, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'Matrix' | 'Hierarchy' | 'BIR' | 'Benefits' | 'FormLinkages' | 'BusinessNatures' | 'Banks' | 'Database'>('Matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [matrixFilterCategory, setMatrixFilterCategory] = useState<'ALL' | 'BIR' | 'Benefits'>('ALL');

  // Matrix Table View Year & Basis Selector State
  const [matrixYear, setMatrixYear] = useState<number>(2026);
  const [matrixYearType, setMatrixYearType] = useState<'Calendar' | 'Fiscal'>('Calendar');
  const [matrixFiscalMonth, setMatrixFiscalMonth] = useState<string>('June');
  const [showMorePreviousYears, setShowMorePreviousYears] = useState<boolean>(false);

  // Custom Confirmation Modal State
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  const defaultYears = [2023, 2024, 2025, 2026, 2027];
  const matrixYearsList = showMorePreviousYears ? [2018, 2019, 2020, 2021, 2022, ...defaultYears] : defaultYears;

  // Form Linkages Modal State
  const [showFormLinkageModal, setShowFormLinkageModal] = useState(false);
  const [editingLinkageId, setEditingLinkageId] = useState<string | null>(null);
  const [linkagePrimaryCode, setLinkagePrimaryCode] = useState('');
  const [linkageLinkedCodes, setLinkageLinkedCodes] = useState('');
  const [linkageDescription, setLinkageDescription] = useState('');

  const handleSaveFormLinkage = () => {
    if (!linkagePrimaryCode.trim() || !linkageLinkedCodes.trim()) {
      alert('Primary form code and linked forms are required.');
      return;
    }

    const linkedArr = linkageLinkedCodes
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    if (editingLinkageId) {
      updateFormLinkage(editingLinkageId, {
        primaryCode: linkagePrimaryCode.trim().toUpperCase(),
        linkedCodes: linkedArr,
        description: linkageDescription.trim()
      });
      showToast(`Updated form linkage for ${linkagePrimaryCode.toUpperCase()}`);
    } else {
      addFormLinkage({
        id: `link_${Date.now()}`,
        primaryCode: linkagePrimaryCode.trim().toUpperCase(),
        linkedCodes: linkedArr,
        description: linkageDescription.trim()
      });
      showToast(`Added new form linkage for ${linkagePrimaryCode.toUpperCase()}`);
    }

    setShowFormLinkageModal(false);
  };

  // Standard Rule Edit Modal State
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<'BIR' | 'Benefits'>('BIR');
  const [editingRule, setEditingRule] = useState<CustomDeadlineRule | null>(null);

  // Form Inputs for Rule Edit
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'Monthly' | 'Quarterly' | 'Annually' | 'Custom'>('Monthly');
  const [customMonths, setCustomMonths] = useState<('Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec')[]>(['Jan', 'Feb', 'Jun', 'Jul']);
  const [applicableYearType, setApplicableYearType] = useState<'Both' | 'Calendar' | 'Fiscal'>('Both');
  const [deadlineType, setDeadlineType] = useState<'day' | 'fixedDate' | 'specificDate'>('day');
  const [deadlineDay, setDeadlineDay] = useState<number>(10);
  const [fixedMonthDay, setFixedMonthDay] = useState('04-15');
  const [specificDate, setSpecificDate] = useState('2026-08-15');
  const [customDescription, setCustomDescription] = useState('');
  const [ruleParentCategory, setRuleParentCategory] = useState<string>('HDMF (Pag-IBIG Fund)');
  const [applyToAllOnSave, setApplyToAllOnSave] = useState(true);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Business Nature / Bank Inputs
  const [newNatureInput, setNewNatureInput] = useState('');
  const [newBankInput, setNewBankInput] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };



  // Helper: Get Dynamic Applicable Period Label based on Form Code, Frequency, Month & Year
  const getDynamicPeriodLabel = (ruleCode: string, freq: string, m: string, targetYear: number): string => {
    const shortYear = String(targetYear).slice(-2);
    const prevYear = targetYear - 1;

    if (freq === 'Monthly') {
      return `${m}-${shortYear}`;
    }

    if (freq === 'Quarterly') {
      if (m === 'Jan') return `4Q-${prevYear}`;
      if (['Apr', 'May'].includes(m)) return `1Q-${targetYear}`;
      if (['Jul', 'Aug'].includes(m)) return `2Q-${targetYear}`;
      if (['Oct', 'Nov'].includes(m)) return `3Q-${targetYear}`;
      return `Q-${targetYear}`;
    }

    if (freq === 'Annually') {
      if (ruleCode === 'ITR' || ruleCode.includes('1702') || ruleCode.includes('1701')) {
        return `TY-${prevYear}`;
      }
      return `TY-${targetYear}`;
    }

    return `${m}-${shortYear}`;
  };



  // Reset to PDF 2026 Schedule Defaults
  const handleLoadPdf2026Defaults = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Reload PDF Defaults?',
      message: 'Re-load 2026 BIR & SSS Calendar Schedule defaults analyzed from the uploaded PDF document? This will overwrite master rules and sync client compliance schedules.',
      confirmText: 'Reload Defaults',
      confirmVariant: 'warning',
      onConfirm: () => {
        DEFAULT_BIR_TAX_OPTIONS.forEach(rule => {
          updateMasterBirOption(rule.id, rule);
          applyMasterDeadlineRuleToAllClients(rule, currentUser?.id, currentUser?.fullName);
        });

        DEFAULT_BENEFITS_OPTIONS.forEach(rule => {
          updateMasterBenefitsOption(rule.id, rule);
          applyMasterDeadlineRuleToAllClients(rule, currentUser?.id, currentUser?.fullName);
        });

        showToast('Loaded analyzed PDF 2026 Calendar Schedule defaults for all BIR forms & statutory benefits!');
        setConfirmModalState(null);
      }
    });
  };

  // Modal Open Handlers for Standard Rule Add/Edit
  const handleOpenAddModal = (cat: 'BIR' | 'Benefits') => {
    setModalCategory(cat);
    setEditingRule(null);
    setCode('');
    setName('');
    setFrequency('Monthly');
    setCustomMonths(['Jan', 'Feb', 'Jun', 'Jul']);
    setApplicableYearType('Both');
    setDeadlineType('day');
    setDeadlineDay(10);
    setFixedMonthDay('04-15');
    setSpecificDate('2026-08-15');
    setCustomDescription('');
    setRuleParentCategory(cat === 'BIR' ? 'BIR Tax Services' : 'HDMF (Pag-IBIG Fund)');
    setApplyToAllOnSave(true);
    setShowRuleModal(true);
  };

  const handleOpenEditModal = (rule: CustomDeadlineRule) => {
    setModalCategory(rule.category === 'Benefits' ? 'Benefits' : 'BIR');
    setEditingRule(rule);
    setCode(rule.code);
    setName(rule.name);
    setFrequency(rule.frequency || 'Monthly');
    setCustomMonths(rule.applicableMonths && rule.applicableMonths.length > 0 ? rule.applicableMonths : ['Jan', 'Feb', 'Jun', 'Jul']);
    setApplicableYearType(rule.applicableYearType || 'Both');
    
    if (rule.specificDate) {
      setDeadlineType('specificDate');
      setSpecificDate(rule.specificDate);
    } else if (rule.fixedMonthDay) {
      setDeadlineType('fixedDate');
      setFixedMonthDay(rule.fixedMonthDay);
    } else {
      setDeadlineType('day');
      setDeadlineDay(rule.deadlineDay || 10);
    }

    setCustomDescription(rule.customDescription || '');
    setRuleParentCategory(rule.parentCategory || (rule.category === 'BIR' ? 'BIR Tax Services' : 'HDMF (Pag-IBIG Fund)'));
    setApplyToAllOnSave(true);
    setShowRuleModal(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert('Please enter both the Code/Form Number and the Name.');
      return;
    }

    const customSched: MonthlyDeadlineSchedule[] = generateDefaultScheduleForFrequency(
      frequency,
      deadlineType === 'day' ? Number(deadlineDay) : 15,
      code.trim(),
      customMonths
    );

    const ruleData: CustomDeadlineRule = {
      id: editingRule ? editingRule.id : `${modalCategory.toLowerCase()}_${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      category: modalCategory,
      parentCategory: ruleParentCategory,
      frequency,
      applicableMonths: frequency === 'Custom' ? customMonths : undefined,
      applicableYearType,
      deadlineDay: deadlineType === 'day' ? Number(deadlineDay) : 15,
      fixedMonthDay: deadlineType === 'fixedDate' ? fixedMonthDay : undefined,
      specificDate: deadlineType === 'specificDate' ? specificDate : undefined,
      customDescription: customDescription.trim() || `Every ${deadlineDay}th of applicable period`,
      monthlySchedule2026: customSched
    };

    if (modalCategory === 'BIR') {
      if (editingRule) {
        updateMasterBirOption(editingRule.id, ruleData);
      } else {
        addMasterBirOption(ruleData);
      }
    } else {
      if (editingRule) {
        updateMasterBenefitsOption(editingRule.id, ruleData);
      } else {
        addMasterBenefitsOption(ruleData);
      }
    }

    if (applyToAllOnSave) {
      applyMasterDeadlineRuleToAllClients(ruleData, currentUser?.id, currentUser?.fullName);
      showToast(`Master Deadline Rule for ${ruleData.code} saved & applied to all clients!`);
    } else {
      showToast(`Master Deadline Rule for ${ruleData.code} saved to Master Tables!`);
    }

    setShowRuleModal(false);
  };

  const handleDirectApplyToAll = (rule: CustomDeadlineRule) => {
    applyMasterDeadlineRuleToAllClients(rule, currentUser?.id, currentUser?.fullName);
    showToast(`Successfully synced ${rule.code} deadline dates to all matching client compliance schedules!`);
  };

  const handleDeleteRule = (rule: CustomDeadlineRule) => {
    setConfirmModalState({
      isOpen: true,
      title: `Delete ${rule.code}?`,
      message: `Are you sure you want to delete "${rule.code} - ${rule.name}" from Master Tables? This action will remove the rule definition.`,
      confirmText: 'Delete Rule',
      confirmVariant: 'danger',
      onConfirm: () => {
        if (rule.category === 'BIR') {
          deleteMasterBirOption(rule.id);
        } else {
          deleteMasterBenefitsOption(rule.id);
        }
        showToast(`Deleted ${rule.code} from Master Tables.`);
        setConfirmModalState(null);
      }
    });
  };

  const handleAddNature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNatureInput.trim()) return;
    addMasterBusinessNature(newNatureInput.trim());
    setNewNatureInput('');
    showToast('New Business Nature added to Master Table.');
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankInput.trim()) return;
    addMasterBank(newBankInput.trim());
    setNewBankInput('');
    showToast('New Bank added to Master Table.');
  };

  const handleDeleteNature = (nature: string) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Business Nature?',
      message: `Are you sure you want to delete "${nature}" from Master Business Natures?`,
      confirmText: 'Delete Business Nature',
      confirmVariant: 'danger',
      onConfirm: () => {
        deleteMasterBusinessNature(nature);
        showToast(`Deleted "${nature}" from Master Business Natures.`);
        setConfirmModalState(null);
      }
    });
  };

  const handleDeleteBank = (bankName: string) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Partner Bank?',
      message: `Are you sure you want to delete "${bankName}" from Master Partner Banks?`,
      confirmText: 'Delete Partner Bank',
      confirmVariant: 'danger',
      onConfirm: () => {
        deleteMasterBank(bankName);
        showToast(`Deleted "${bankName}" from Master Partner Banks.`);
        setConfirmModalState(null);
      }
    });
  };

  const handleExportBackup = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AFMS_MasterTables_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Backup JSON exported successfully!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importBackupData(content);
        if (ok) {
          showToast('Master Tables & System Data successfully imported!');
        } else {
          alert('Failed to import backup JSON. Invalid file format.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Compute how many clients have a specific BIR/Benefit assigned
  const getEnrolledClientCount = (codeToMatch: string, cat: 'BIR' | 'Benefits') => {
    return clients.filter(c => {
      if (cat === 'BIR') {
        return c.birTaxServices.some(s => s.toLowerCase() === codeToMatch.toLowerCase());
      } else {
        return c.benefitsServices.some(s => s.toLowerCase().includes(codeToMatch.toLowerCase()) || codeToMatch.toLowerCase().includes(s.toLowerCase()));
      }
    }).length;
  };

  // Combine rules for Matrix
  const allMatrixRules = [
    ...masterChoices.birTaxOptions,
    ...masterChoices.benefitsOptions
  ].filter(r => {
    if (matrixFilterCategory === 'BIR' && r.category !== 'BIR') return false;
    if (matrixFilterCategory === 'Benefits' && r.category !== 'Benefits') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
    }
    return true;
  });

  const birRules = masterChoices.birTaxOptions.filter(r => 
    r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const benRules = masterChoices.benefitsOptions.filter(r => 
    r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calendar Day Generator for Calendar Picker Modal
  const getDaysInMonth = (monthStr: string, year: number) => {
    const mIdx = MONTH_INDEX[monthStr];
    return new Date(year, mIdx + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (monthStr: string, year: number) => {
    const mIdx = MONTH_INDEX[monthStr];
    return new Date(year, mIdx, 1).getDay(); // 0 = Sun, 1 = Mon ...
  };

  return (
    <div className="space-y-6 antialiased">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            System & Master Tables Manager
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            2026 BIR Tax & Statutory Benefits Deadline Matrix. Configure global filing dates that sync across all client compliance schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadPdf2026Defaults}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Load BIR & SSS 2026 schedule dates analyzed from the uploaded PDF document"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" /> Load PDF 2026 Schedule Defaults
          </button>

          <button
            onClick={handleExportBackup}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" /> Backup JSON
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('Matrix')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'Matrix' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Master Deadline Schedule Matrix
          </button>

          <button
            onClick={() => setActiveTab('Hierarchy')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'Hierarchy' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-4 h-4" /> Parent vs Child Hierarchy Mapping
          </button>

          <button
            onClick={() => setActiveTab('BIR')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'BIR' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" /> BIR Tax Returns ({masterChoices.birTaxOptions.length})
          </button>

          <button
            onClick={() => setActiveTab('Benefits')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'Benefits' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Benefits & SSS ({masterChoices.benefitsOptions.length})
          </button>

          <button
            onClick={() => setActiveTab('FormLinkages')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'FormLinkages' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Form Linkages ({masterChoices.formLinkages?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('BusinessNatures')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'BusinessNatures' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" /> Business Natures ({masterChoices.businessNatures.length})
          </button>

          <button
            onClick={() => setActiveTab('Banks')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'Banks' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" /> Partner Banks ({masterChoices.banksList.length})
          </button>

          <button
            onClick={() => setActiveTab('Database')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'Database' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" /> Database & Sync
          </button>
        </div>

        {/* Search Bar for Matrix / BIR / Benefits */}
        {(activeTab === 'Matrix' || activeTab === 'BIR' || activeTab === 'Benefits') && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search form code or title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        )}
      </div>

      {/* TAB 1: 2026 INTERACTIVE DEADLINE PICKER MATRIX (ANALYZED PDF FORMAT) */}
      {activeTab === 'Matrix' && (
        <div className="space-y-4 text-xs">
          
          {/* Information & Quick Filter Card */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-indigo-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 font-mono text-[10px] font-bold text-indigo-200 rounded uppercase">
                  PDF & Multi-Year Calendar Analyzer
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {matrixYear} {matrixYearType === 'Fiscal' ? `Fiscal Year (Ended ${matrixFiscalMonth})` : 'Calendar Year'} BIR & Statutory Deadline Schedule Matrix
                </h3>
              </div>
              <p className="text-[11px] text-slate-300">
                Click on any deadline date cell in the matrix below to view deadlines based on <strong>{matrixYearType} Year ({matrixYearType === 'Fiscal' ? `FY Ends ${matrixFiscalMonth}` : 'Calendar'})</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Year Switcher */}
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Year:</label>
                <select
                  value={matrixYear}
                  onChange={e => setMatrixYear(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                >
                  {matrixYearsList.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                {!showMorePreviousYears && (
                  <button
                    type="button"
                    onClick={() => setShowMorePreviousYears(true)}
                    className="text-[10px] text-indigo-300 hover:text-white underline font-semibold px-1 cursor-pointer"
                    title="Load earlier previous years"
                  >
                    + Earlier
                  </button>
                )}
              </div>

              {/* Calendar vs Fiscal Year Option */}
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Basis:</label>
                <select
                  value={matrixYearType}
                  onChange={e => setMatrixYearType(e.target.value as 'Calendar' | 'Fiscal')}
                  className="bg-slate-900 border border-slate-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                >
                  <option value="Calendar">Calendar Year</option>
                  <option value="Fiscal">Fiscal Year</option>
                </select>

                {matrixYearType === 'Fiscal' && (
                  <select
                    value={matrixFiscalMonth}
                    onChange={e => setMatrixFiscalMonth(e.target.value)}
                    className="bg-slate-900 border border-slate-600 text-indigo-300 font-bold text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                    title="Fiscal Year End Month"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>Ends {m}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 flex items-center text-xs">
                <button
                  onClick={() => setMatrixFilterCategory('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    matrixFilterCategory === 'ALL' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  All Forms
                </button>
                <button
                  onClick={() => setMatrixFilterCategory('BIR')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    matrixFilterCategory === 'BIR' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  BIR Tax Only
                </button>
                <button
                  onClick={() => setMatrixFilterCategory('Benefits')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    matrixFilterCategory === 'Benefits' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Benefits & SSS
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-3 w-48 sticky left-0 bg-slate-100 z-10 border-r border-slate-200 shadow-2xs">
                      FORM / OBLIGATION
                    </th>
                    {MONTHS_LIST.map(m => (
                      <th key={m} className="p-2.5 text-center border-r border-slate-200/80 min-w-[85px]">
                        {m} {matrixYear}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium text-xs">
                  {allMatrixRules.map((rule) => {
                    const isBir = rule.category === 'BIR';
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors group">
                        
                        {/* Sticky Form Title Column */}
                        <td className="p-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 font-mono text-[11px] font-bold rounded ${
                              isBir ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}>
                              {rule.code}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{rule.frequency}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate max-w-[180px] mt-0.5" title={rule.name}>
                            {rule.name}
                          </p>
                        </td>

                        {/* Month Deadline Cells */}
                        {MONTHS_LIST.map(m => {
                          const deadlineInfo = getRuleDeadlineForMonth(
                            rule, 
                            m, 
                            matrixYear,
                            matrixYearType === 'Fiscal' ? { accountingPeriod: 'Fiscal', fiscalYearEndMonth: matrixFiscalMonth } : undefined
                          );
                          
                          if (!deadlineInfo) {
                            return (
                              <td key={m} className="p-1 text-center border-r border-slate-100">
                                <div className="w-full py-2 px-1 rounded-xl border border-dashed border-slate-200 text-slate-300 text-center">
                                  <span className="text-[10px] font-mono block">-</span>
                                </div>
                              </td>
                            );
                          }

                          const { dueDateStr, label, isNotRequired } = deadlineInfo;

                          if (isNotRequired || dueDateStr === 'N/A') {
                            return (
                              <td key={m} className="p-1.5 text-center border-r border-slate-100">
                                <div className="w-full p-1.5 rounded-xl border border-amber-200/60 bg-amber-50/50 text-amber-800 text-center space-y-0.5 shadow-2xs">
                                  <div className="text-[10px] font-mono font-bold text-amber-900 uppercase flex items-center justify-center gap-1">
                                    <Ban className="w-2.5 h-2.5 text-amber-600" /> N/A
                                  </div>
                                  <div className="text-[9px] font-bold text-amber-700">
                                    Not Required
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          const dateParts = dueDateStr.split('-');
                          const formattedShort = dateParts.length === 3 ? `${parseInt(dateParts[1], 10)}/${parseInt(dateParts[2], 10)}/${dateParts[0]}` : dueDateStr;

                          return (
                            <td key={m} className="p-1.5 text-center border-r border-slate-100">
                              <div className="w-full p-1.5 rounded-xl border border-slate-200 text-left space-y-0.5 shadow-2xs bg-slate-50">
                                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-900">
                                  <span>{formattedShort}</span>
                                </div>

                                {label && (
                                  <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100 inline-block">
                                    {label}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}



                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB: PARENT VS CHILD HIERARCHY MAPPING */}
      {activeTab === 'Hierarchy' && (
        <div className="space-y-5 text-xs">
          {/* Informational Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-purple-700/60 p-5 rounded-2xl text-white shadow-lg gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-purple-500/20 border border-purple-400/40 rounded-xl shrink-0">
                <Zap className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-purple-100 flex items-center gap-2">
                  Parent ➔ Child Hierarchy Mapping Engine
                </h3>
                <p className="text-xs text-purple-200/80 mt-1 max-w-2xl">
                  Manage master relationships between Parent Agencies (e.g. HDMF Pag-IBIG, SSS, PhilHealth, BIR Tax Services) and Child Sub-Loans / Items (e.g. HDMF Housing Loan #1 & #2, SSS Salary Loan, Voluntary Payments, 0619E, 1601C).
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal('Benefits')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Child Benefits Item / Loan
                </button>
              </div>
            )}
          </div>

          {/* Grouped Hierarchy Cards */}
          <div className="space-y-4">
            {(() => {
              // Group all BIR & Benefits options by parentCategory
              const allRules = [...masterChoices.birTaxOptions, ...masterChoices.benefitsOptions];
              const grouped: Record<string, CustomDeadlineRule[]> = {};

              allRules.forEach(rule => {
                let parentName = rule.parentCategory;
                if (!parentName) {
                  const c = rule.code.toUpperCase();
                  if (c.includes('HDMF') || c.includes('PAG-IBIG')) parentName = 'HDMF (Pag-IBIG Fund)';
                  else if (c.includes('SSS')) parentName = 'SSS (Social Security System)';
                  else if (c.includes('PHILHEALTH') || c.includes('PHIC')) parentName = 'PhilHealth (PHIC)';
                  else if (rule.category === 'BIR') parentName = 'BIR Tax Services';
                  else parentName = 'Other Statutory / Custom';
                }

                if (!grouped[parentName]) grouped[parentName] = [];
                grouped[parentName].push(rule);
              });

              return Object.entries(grouped).map(([parentGroup, childItems]) => {
                const totalClientsEnrolled = childItems.reduce((acc, ci) => acc + getEnrolledClientCount(ci.code, ci.category === 'BIR' ? 'BIR' : 'Benefits'), 0);

                return (
                  <div key={parentGroup} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    {/* Parent Category Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[10px] rounded-lg uppercase tracking-wider">
                          Parent Entity
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          {parentGroup}
                        </h4>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                          {childItems.length} Child Sub-Item(s)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>Enrolled Across Clients: <strong className="text-slate-900 font-bold">{totalClientsEnrolled}</strong> assignment(s)</span>
                      </div>
                    </div>

                    {/* Child Sub-Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <th className="py-2.5 px-3">Hierarchy Branch</th>
                            <th className="py-2.5 px-3">Sub-Item Code</th>
                            <th className="py-2.5 px-3">Full Title / Description</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Frequency</th>
                            <th className="py-2.5 px-3">Default Deadline</th>
                            <th className="py-2.5 px-3 text-center">Enrolled</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {childItems.map(child => {
                            const enrolledCount = getEnrolledClientCount(child.code, child.category === 'BIR' ? 'BIR' : 'Benefits');
                            return (
                              <tr key={child.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-purple-600 font-bold">
                                  ↳ Child
                                </td>
                                <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                                  {child.code}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  <div className="font-semibold text-slate-900">{child.name}</div>
                                  <div className="text-[10px] text-slate-400 line-clamp-1">{child.customDescription}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    child.category === 'BIR' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {child.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {child.frequency || 'Monthly'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 font-semibold">
                                  Day {child.deadlineDay || 10}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded-full text-[10px]">
                                    {enrolledCount}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">

                                    {isSuperAdmin && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditModal(child)}
                                          className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                          title="Edit Rule & Parent Assignment"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteRule(child)}
                                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                          title="Delete Child Item"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: BIR TAX RETURNS MASTER LIST */}
      {activeTab === 'BIR' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-200 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-700 shrink-0" />
              <div>
                <h3 className="font-bold text-indigo-900 text-xs">Master BIR Tax Return Deadline Rules</h3>
                <p className="text-[11px] text-slate-600">
                  Configure specific global tax deadlines for 0619E, 1601C, 1601EQ, 2550Q, 2551Q, 1701Q, 1702Q, and Annual ITR.
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => handleOpenAddModal('BIR')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 text-xs shrink-0"
              >
                <Plus className="w-4 h-4" /> Add BIR Tax Return Rule
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {birRules.map(rule => {
              const enrolledCount = getEnrolledClientCount(rule.code, 'BIR');
              return (
                <div key={rule.id} className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 font-mono font-bold text-indigo-800 rounded-lg text-xs">
                        BIR {rule.code}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded text-[10px] uppercase">
                        {rule.frequency}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{rule.name}</h4>

                    {/* Form Linkages & Attachments Connection */}
                    {(() => {
                      const linkedRule = (masterChoices.formLinkages || []).find(
                        l => l.primaryCode.toUpperCase() === rule.code.toUpperCase() || (l.linkedCodes || []).map(c => c.toUpperCase()).includes(rule.code.toUpperCase())
                      );
                      if (!linkedRule) return null;
                      return (
                        <div className="bg-indigo-50/90 border border-indigo-200/90 p-2.5 rounded-xl text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-950 flex items-center gap-1 text-[11px]">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Linked Forms & Attachments:
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('FormLinkages')}
                              className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer"
                            >
                              Manage Rules
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {(linkedRule.linkedCodes || []).map(code => (
                              <span key={code} className="px-1.5 py-0.5 bg-white border border-indigo-200 text-indigo-900 font-mono font-bold rounded text-[10px]">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Specific Deadline Display */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <CalendarIcon className="w-4 h-4 text-indigo-600" />
                        <span>
                          {rule.specificDate ? `Specific Date: ${rule.specificDate}` :
                           rule.fixedMonthDay ? `Fixed Date: ${rule.fixedMonthDay} (MM-DD)` :
                           `Every ${rule.deadlineDay}th Day of Applicable Period`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{rule.customDescription}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Enrolled Clients: <strong className="text-slate-800">{enrolledCount} client(s)</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">

                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(rule)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: STATUTORY BENEFITS (SSS, PHILHEALTH, PAG-IBIG) */}
      {activeTab === 'Benefits' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <h3 className="font-bold text-emerald-900 text-xs">Master Statutory Benefits Remittance Rules</h3>
                <p className="text-[11px] text-slate-600">
                  Configure specific deadlines for SSS Contribution & Loans, PhilHealth, and HDMF Pag-IBIG.
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => handleOpenAddModal('Benefits')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 text-xs shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Benefits Rule
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {benRules.map(rule => {
              const enrolledCount = getEnrolledClientCount(rule.code, 'Benefits');
              return (
                <div key={rule.id} className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 font-bold text-emerald-800 rounded-lg text-xs">
                        {rule.code}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded text-[10px] uppercase">
                        {rule.frequency}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{rule.name}</h4>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <CalendarIcon className="w-4 h-4 text-emerald-600" />
                        <span>
                          {rule.specificDate ? `Specific Date: ${rule.specificDate}` :
                           rule.fixedMonthDay ? `Fixed Date: ${rule.fixedMonthDay} (MM-DD)` :
                           `Every ${rule.deadlineDay}th Day of Month`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{rule.customDescription}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Enrolled Clients: <strong className="text-slate-800">{enrolledCount} client(s)</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">

                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(rule)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: FORM LINKAGES */}
      {activeTab === 'FormLinkages' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-700 shrink-0" />
              <div>
                <h3 className="font-bold text-indigo-900 text-xs">BIR Tax Services Multiple Linked Choices Settings</h3>
                <p className="text-[11px] text-slate-600">
                  Configure interlinked tax forms and recurring dependencies. When a primary tax return form is checked in New Client Registration, all linked choices are automatically selected together.
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => {
                  setEditingLinkageId(null);
                  setLinkagePrimaryCode('');
                  setLinkageLinkedCodes('');
                  setLinkageDescription('');
                  setShowFormLinkageModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 text-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add New Form Linkage Rule
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50">
                    <th className="py-2.5 px-3">Primary Form Code</th>
                    <th className="py-2.5 px-3">Linked Forms & Attachments</th>
                    <th className="py-2.5 px-3">Rule Description</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(masterChoices.formLinkages || []).map((link, idx) => (
                    <tr key={link.id || `fl_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 font-mono font-bold text-indigo-800 rounded-lg text-xs">
                          {link.primaryCode}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(link.linkedCodes || []).map(code => (
                            <span key={code} className="px-2 py-0.5 bg-slate-100 text-slate-800 font-mono font-bold rounded text-[11px]">
                              {code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {link.description || 'Interlinked tax forms rule'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery(link.primaryCode);
                              setActiveTab('BIR');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                            title="View rule in Recurring Deadlines"
                          >
                            <CalendarIcon className="w-3 h-3 text-indigo-600" /> View Deadlines
                          </button>

                          {isSuperAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLinkageId(link.id || link.primaryCode);
                                  setLinkagePrimaryCode(link.primaryCode);
                                  setLinkageLinkedCodes((link.linkedCodes || []).join(', '));
                                  setLinkageDescription(link.description || '');
                                  setShowFormLinkageModal(true);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Linkage"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmModalState({
                                    isOpen: true,
                                    title: 'Delete Form Linkage Rule?',
                                    message: `Are you sure you want to delete the form linkage rule for "${link.primaryCode}"?`,
                                    confirmText: 'Delete Linkage',
                                    confirmVariant: 'danger',
                                    onConfirm: () => {
                                      deleteFormLinkage(link.id || link.primaryCode);
                                      showToast(`Form linkage for ${link.primaryCode} deleted.`);
                                      setConfirmModalState(null);
                                    }
                                  });
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Linkage"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BUSINESS NATURES */}
      {activeTab === 'BusinessNatures' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" /> Master Business Natures
            </h3>
            
            <form onSubmit={handleAddNature} className="flex gap-2 max-w-md">
              <input
                type="text"
                required
                placeholder="e.g. E-Commerce & Online Retail"
                value={newNatureInput}
                onChange={e => setNewNatureInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-2xs"
              >
                Add Option
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {masterChoices.businessNatures.map((nat, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 flex items-center justify-between group">
                  <span className="truncate pr-2">{nat}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNature(nat)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title={`Delete ${nat}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PARTNER BANKS */}
      {activeTab === 'Banks' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-800" /> Master Partner Banks List
            </h3>

            <form onSubmit={handleAddBank} className="flex gap-2 max-w-md">
              <input
                type="text"
                required
                placeholder="e.g. Security Bank Corporation"
                value={newBankInput}
                onChange={e => setNewBankInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shadow-2xs"
              >
                Add Bank
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {masterChoices.banksList.map((bank, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 flex items-center justify-between group">
                  <span className="truncate pr-2">{bank}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(bank)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title={`Delete ${bank}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DATABASE & BACKUP */}
      {activeTab === 'Database' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" /> Offline IndexedDB & Master State Backup
            </h3>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Master BIR Tax Rules:</span>
                <span className="font-bold text-indigo-700">{masterChoices.birTaxOptions.length} rules</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Master Benefits Rules:</span>
                <span className="font-bold text-emerald-700">{masterChoices.benefitsOptions.length} rules</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Enrolled Client Workspaces:</span>
                <span className="font-bold text-slate-800">{clients.length} clients</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleExportBackup}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Export Complete System Backup (JSON)
              </button>

              <label className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" /> Import System Backup JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Permanent Administrative Security
            </h3>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900">
              <p className="font-bold">Master Table Governance & Audits</p>
              <p className="text-[11px] leading-relaxed">
                Changes to master deadline tables automatically update all matching client workspaces and log a permanent entry into the firm audit trail.
              </p>
            </div>
          </div>

        </div>
      )}



      {/* MODAL 2: STANDARD CREATE / EDIT DEADLINE RULE MODAL */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-5 text-xs shadow-2xl text-slate-800">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingRule ? `Edit ${modalCategory} Rule` : `Create Master ${modalCategory} Rule`}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure global filing frequency and deadline defaults.</p>
                </div>
              </div>

              <button
                onClick={() => setShowRuleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <select
                  value={modalCategory}
                  onChange={e => {
                    const newCat = e.target.value as any;
                    setModalCategory(newCat);
                    setRuleParentCategory(newCat === 'BIR' ? 'BIR Tax Services' : 'HDMF (Pag-IBIG Fund)');
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                >
                  <option value="BIR">BIR Tax Return</option>
                  <option value="Benefits">Statutory Benefit Remittance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Parent Agency / Parent Group *</label>
                <select
                  value={ruleParentCategory}
                  onChange={e => setRuleParentCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg font-bold text-purple-900"
                >
                  {modalCategory === 'BIR' ? (
                    <>
                      <option value="BIR Tax Services">BIR Tax Services (Main)</option>
                      <option value="BIR Withholding Taxes">BIR Withholding Taxes</option>
                      <option value="BIR Income Taxes">BIR Income Taxes</option>
                      <option value="BIR VAT & Percentage Taxes">BIR VAT & Percentage Taxes</option>
                    </>
                  ) : (
                    <>
                      <option value="HDMF (Pag-IBIG Fund)">HDMF (Pag-IBIG Fund)</option>
                      <option value="SSS (Social Security System)">SSS (Social Security System)</option>
                      <option value="PhilHealth (PHIC)">PhilHealth (PHIC)</option>
                      <option value="Other Statutory / Custom Benefits">Other Statutory / Custom Benefits</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Form Code / Short Name *</label>
                <input
                  type="text"
                  required
                  placeholder={modalCategory === 'BIR' ? 'e.g. 0619E or 1601EQ' : 'e.g. SSS Contribution or PhilHealth Cont.'}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Form / Remittance Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Remittance Return of Creditable Income Taxes Withheld"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Filing Frequency</label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold cursor-pointer"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annually">Annually</option>
                  <option value="Custom">Custom (Specific Selected Months)</option>
                </select>
              </div>

              {/* Custom Frequency Month Picker */}
              {frequency === 'Custom' && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-amber-950 font-bold text-xs uppercase tracking-wider">
                      Applicable Months for Custom Frequency *
                    </label>
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCustomMonths([...MONTHS_LIST])}
                        className="text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomMonths([])}
                        className="text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Select which specific months this custom rule applies to (e.g., January, Feb, June, July):
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                    {MONTHS_LIST.map(m => {
                      const isSelected = customMonths.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setCustomMonths(customMonths.filter(x => x !== m));
                            } else {
                              setCustomMonths([...customMonths, m]);
                            }
                          }}
                          className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Applicable Accounting Period Choice (Calendar vs Fiscal) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Applicable Client Accounting Period Basis *
                </label>
                <select
                  value={applicableYearType}
                  onChange={e => setApplicableYearType(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold cursor-pointer"
                >
                  <option value="Both">Both Calendar & Fiscal Year Clients</option>
                  <option value="Calendar">Calendar Year Clients Only</option>
                  <option value="Fiscal">Fiscal Year Clients Only</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Enforces or hides deadlines based on client accounting period (Calendar vs Fiscal) from client profile info.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                <label className="block text-indigo-900 font-bold text-xs uppercase tracking-wider">
                  Default Deadline Specification
                </label>

                <div className="flex flex-col gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="deadlineType"
                      checked={deadlineType === 'day'}
                      onChange={() => setDeadlineType('day')}
                      className="text-indigo-600"
                    />
                    Day of Month (Recurring e.g., 10th of every month)
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="deadlineType"
                      checked={deadlineType === 'fixedDate'}
                      onChange={() => setDeadlineType('fixedDate')}
                      className="text-indigo-600"
                    />
                    Fixed Annual Date (e.g. April 15 - "04-15")
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="deadlineType"
                      checked={deadlineType === 'specificDate'}
                      onChange={() => setDeadlineType('specificDate')}
                      className="text-indigo-600"
                    />
                    Specific Calendar Date (Override YYYY-MM-DD)
                  </label>
                </div>

                {deadlineType === 'day' && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Day of Month (1-31)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={deadlineDay}
                      onChange={e => setDeadlineDay(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                    />
                  </div>
                )}

                {deadlineType === 'fixedDate' && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Fixed Month & Day (MM-DD)</label>
                    <input
                      type="text"
                      placeholder="e.g. 04-15"
                      value={fixedMonthDay}
                      onChange={e => setFixedMonthDay(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                    />
                  </div>
                )}

                {deadlineType === 'specificDate' && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Specific Calendar Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={specificDate}
                      onChange={e => setSpecificDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rule Description / eFPS Extended Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Every 10th of the following month (eFPS: 11th - 15th)"
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-xs">
                  <input
                    type="checkbox"
                    checked={applyToAllOnSave}
                    onChange={e => setApplyToAllOnSave(e.target.checked)}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span>⚡ Automatically apply this deadline date to all matching client compliance schedules</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs"
                >
                  Save Master Rule
                </button>
              </div>

            </form>
          </div>
        </div>
      )}



      {/* Modal for adding/editing Form Linkage Rule */}
      {showFormLinkageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {editingLinkageId ? 'Edit Form Linkage Rule' : 'Add New Form Linkage Rule'}
              </h4>
              <button
                onClick={() => setShowFormLinkageModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Primary Form Code (e.g. 1701Q)</label>
                <input
                  type="text"
                  placeholder="e.g. 1701Q"
                  value={linkagePrimaryCode}
                  onChange={e => setLinkagePrimaryCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Linked Forms / Attachments (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. 1701, 1701A, 0605, 2307"
                  value={linkageLinkedCodes}
                  onChange={e => setLinkageLinkedCodes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Checking the primary form will automatically select all these forms in New Client Registration.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Rule Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Quarterly Income Tax interlinked with Annual ITR & 2307"
                  value={linkageDescription}
                  onChange={e => setLinkageDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowFormLinkageModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFormLinkage}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Save Linkage Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL CUSTOM CONFIRMATION MODAL */}
      {confirmModalState?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-xl shrink-0 ${
                confirmModalState.confirmVariant === 'warning' 
                  ? 'bg-amber-100 text-amber-600' 
                  : confirmModalState.confirmVariant === 'primary'
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-rose-100 text-rose-600'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModalState.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmModalState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalState(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModalState.onConfirm();
                }}
                className={`px-4 py-2 font-bold text-white rounded-xl text-xs shadow-md transition-colors cursor-pointer ${
                  confirmModalState.confirmVariant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : confirmModalState.confirmVariant === 'primary'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {confirmModalState.confirmText || 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
