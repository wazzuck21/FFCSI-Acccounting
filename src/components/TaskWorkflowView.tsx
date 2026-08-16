import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { TaskItem, TaskStatus, TaskWorkflowStage } from '../types';
import { MONTHS_LIST, MONTH_FULL_NAMES } from '../data/masterTables';
import { SearchableClientSelect } from './SearchableClientSelect';
import { TablePagination } from './TablePagination';
import { usePagination } from '../utils/usePagination';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Plus,
  X,
  Zap,
  Calendar,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  FileText,
  Building2,
  UserCheck,
  Send,
  MessageSquare,
  Sparkles,
  Edit3,
  Trash2,
  ArrowRight,
  Sliders
} from 'lucide-react';

export const TaskWorkflowView: React.FC<{ onNavigateToClient?: (clientId: string) => void }> = ({ onNavigateToClient }) => {
  const {
    tasks,
    clients,
    clientServices,
    masterChoices,
    addTask,
    updateTask,
    updateTaskStatus,
    submitTaskForReview,
    approveTask,
    returnTaskForCorrection,
    overrideTaskDeadline,
    reassignTask,
    deleteTask,
    generateRecurringComplianceTasks
  } = useData();

  const { currentUser, isSuperAdmin, allUsers } = useAuth();

  // Period Selector for Recurring Task Generation
  const [selectedMonth, setSelectedMonth] = useState<string>('Aug');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Active View Tab: 'KANBAN' | 'LIST' | 'MY_WORK' | 'REVIEW_QUEUE'
  const [viewTab, setViewTab] = useState<'KANBAN' | 'LIST' | 'MY_WORK' | 'REVIEW_QUEUE'>('LIST');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [rdoFilter, setRdoFilter] = useState('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Review / Approval Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'RETURN'>('APPROVE');
  const [targetTaskForReview, setTargetTaskForReview] = useState<TaskItem | null>(null);
  const [reviewNotesInput, setReviewNotesInput] = useState('');

  // Submit for Review Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [targetTaskForSubmit, setTargetTaskForSubmit] = useState<TaskItem | null>(null);
  const [preparerNotesInput, setPreparerNotesInput] = useState('');

  // Override Deadline Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [targetTaskForOverride, setTargetTaskForOverride] = useState<TaskItem | null>(null);
  const [newDueDateInput, setNewDueDateInput] = useState('');
  const [overrideReasonInput, setOverrideReasonInput] = useState('');

  // Reassign Staff Modal
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [targetTaskForReassign, setTargetTaskForReassign] = useState<TaskItem | null>(null);
  const [newStaffIdInput, setNewStaffIdInput] = useState('');

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Create Task Form State
  const [formClientId, setFormClientId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<TaskItem['category']>('BIR');
  const [formFormCode, setFormFormCode] = useState('');
  const [formTaxablePeriod, setFormTaxablePeriod] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState<TaskItem['priority']>('Medium');
  const [formAssignedStaffId, setFormAssignedStaffId] = useState(currentUser?.fullName || 'staff_1');
  const [formDescription, setFormDescription] = useState('');

  // Reset Create Form
  const resetCreateForm = () => {
    setFormClientId('');
    setFormTitle('');
    setFormCategory('BIR');
    setFormFormCode('');
    setFormTaxablePeriod('');
    setFormDueDate('');
    setFormPriority('Medium');
    setFormAssignedStaffId(currentUser?.fullName || 'staff_1');
    setFormDescription('');
    setEditingTask(null);
  };

  const openEditModal = (t: TaskItem) => {
    setEditingTask(t);
    setFormClientId(t.clientId || '');
    setFormTitle(t.title);
    setFormCategory(t.category);
    setFormFormCode(t.formCode || '');
    setFormTaxablePeriod(t.taxablePeriod || '');
    setFormDueDate(t.dueDate);
    setFormPriority(t.priority);
    setFormAssignedStaffId(t.assignedToId || t.assignedToName);
    setFormDescription(t.description || '');
    setShowCreateModal(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Task title is required.');
      return;
    }

    const selectedClient = clients.find(c => c.id === formClientId);
    const assignedUser = allUsers.find(u => u.id === formAssignedStaffId || u.fullName === formAssignedStaffId);
    const assignedName = assignedUser ? assignedUser.fullName : formAssignedStaffId;

    if (editingTask) {
      updateTask(editingTask.id, {
        clientId: formClientId || undefined,
        clientName: selectedClient?.companyName || editingTask.clientName,
        title: formTitle.trim(),
        category: formCategory,
        formCode: formFormCode || undefined,
        taxablePeriod: formTaxablePeriod || undefined,
        dueDate: formDueDate || editingTask.dueDate,
        priority: formPriority,
        assignedToId: assignedUser?.id || formAssignedStaffId,
        assignedToName: assignedName,
        description: formDescription,
        rdoNumber: selectedClient?.rdoNumber || editingTask.rdoNumber
      }, currentUser?.id, currentUser?.fullName);
      showToast(`Task "${formTitle}" updated!`);
    } else {
      addTask({
        clientId: formClientId || undefined,
        clientName: selectedClient?.companyName,
        title: formTitle.trim(),
        category: formCategory,
        formCode: formFormCode || undefined,
        taxablePeriod: formTaxablePeriod || undefined,
        dueDate: formDueDate || new Date().toISOString().substring(0, 10),
        priority: formPriority,
        status: 'Pending',
        workflowStage: 'Preparer',
        assignedToId: assignedUser?.id || formAssignedStaffId,
        assignedToName: assignedName,
        description: formDescription,
        rdoNumber: selectedClient?.rdoNumber
      });
      showToast(`New task "${formTitle}" created successfully!`);
    }

    setShowCreateModal(false);
    resetCreateForm();
  };

  // Generate Recurring Tasks Batch Handler
  const handleAutoGenerateTasks = () => {
    const res = generateRecurringComplianceTasks(selectedMonth, selectedYear, currentUser?.id, currentUser?.fullName);
    showToast(res.message);
  };

  // Metrics Calculations
  const todayStr = new Date().toISOString().substring(0, 10);
  const dueTodayCount = tasks.filter(t => t.dueDate === todayStr && t.status !== 'Completed').length;
  const overdueCount = tasks.filter(t => t.dueDate < todayStr && t.status !== 'Completed').length;
  const forReviewCount = tasks.filter(t => t.status === 'For Review' || t.workflowStage === 'Reviewer').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const pendingCount = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const totalTasks = tasks.length;

  // Filtered Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.formCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignedToName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClient = clientFilter === 'ALL' || t.clientId === clientFilter;
    const matchesStaff = staffFilter === 'ALL' || t.assignedToId === staffFilter || t.assignedToName === staffFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesRdo = rdoFilter === 'ALL' || t.rdoNumber === rdoFilter;

    // View tab overrides
    if (viewTab === 'MY_WORK') {
      const isMyTask = currentUser && (t.assignedToName === currentUser.fullName || t.assignedToId === currentUser.id);
      return matchesSearch && matchesClient && matchesCategory && matchesRdo && isMyTask;
    }

    if (viewTab === 'REVIEW_QUEUE') {
      const isForReview = t.status === 'For Review' || t.workflowStage === 'Reviewer';
      return matchesSearch && matchesClient && matchesStaff && matchesCategory && isForReview;
    }

    return matchesSearch && matchesClient && matchesStaff && matchesStatus && matchesCategory && matchesRdo;
  });

  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems: paginatedTasks,
    setCurrentPage,
    setPageSize,
    loadMore,
    hasMoreToLoad,
  } = usePagination(filteredTasks, {
    initialPageSize: 15,
    resetOnChange: `${viewTab}_${searchQuery}_${clientFilter}_${staffFilter}_${statusFilter}_${categoryFilter}_${rdoFilter}`,
  });

  // RDO Numbers list for filter
  const rdoList = Array.from(new Set(clients.map(c => c.rdoNumber).filter(Boolean)));

  return (
    <div className="space-y-6 text-xs">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-xs">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            Compliance Task & Workflow Engine
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 6 Active
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated recurring compliance generation, deadline engine, multi-stage review & approval controls.
          </p>
        </div>

        {/* Auto-Generation Controls */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Generate Tasks For:</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
          >
            {MONTHS_LIST.map(m => (
              <option key={m} value={m}>{MONTH_FULL_NAMES[m] || m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleAutoGenerateTasks}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" /> Run Auto-Generator
          </button>
          <button
            onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Custom Task
          </button>
        </div>
      </div>

      {/* Operational Dashboard KPIs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{totalTasks}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">All engagements</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex justify-between items-center text-amber-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending / In Progress</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{pendingCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Assigned to preparers</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex justify-between items-center text-purple-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">For Review</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-900">{forReviewCount}</div>
          <p className="text-[10px] text-purple-600 font-semibold mt-0.5">Awaiting Senior Approval</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex justify-between items-center text-rose-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Due Today</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700">{dueTodayCount}</div>
          <p className="text-[10px] text-rose-500 font-bold mt-0.5">{todayStr}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex justify-between items-center text-red-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-800">{overdueCount}</div>
          <p className="text-[10px] text-red-500 font-semibold mt-0.5">Action required</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex justify-between items-center text-emerald-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-800">{completedCount}</div>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Filed & Verified</p>
        </div>
      </div>

      {/* Navigation Tabs & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        
        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl font-bold text-xs">
            <button
              onClick={() => setViewTab('LIST')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === 'LIST' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" /> All Tasks Table
            </button>
            <button
              onClick={() => setViewTab('KANBAN')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === 'KANBAN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Kanban Stages
            </button>
            <button
              onClick={() => setViewTab('MY_WORK')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === 'MY_WORK' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" /> My Work Queue ({tasks.filter(t => currentUser && (t.assignedToName === currentUser.fullName || t.assignedToId === currentUser.id) && t.status !== 'Completed').length})
            </button>
            <button
              onClick={() => setViewTab('REVIEW_QUEUE')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === 'REVIEW_QUEUE' ? 'bg-white text-purple-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Review Queue ({forReviewCount})
            </button>
          </div>

          <div className="text-slate-500 font-medium text-[11px]">
            Showing <strong className="text-slate-900 font-bold">{filteredTasks.length}</strong> of {tasks.length} tasks
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, client, form code, staff..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
          >
            <option value="ALL">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>

          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
          >
            <option value="ALL">All Assigned Staff</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.fullName}>{u.fullName}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="For Review">For Review</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select
            value={rdoFilter}
            onChange={(e) => setRdoFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
          >
            <option value="ALL">All RDOs</option>
            {rdoList.map(rdo => (
              <option key={rdo} value={rdo}>RDO #{rdo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: ALL TASKS TABLE VIEW */}
      {viewTab === 'LIST' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Task / Engagement</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Form / Period</th>
                  <th className="py-3 px-3">Assigned Staff</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Stage / Status</th>
                  <th className="py-3 px-4 text-center">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedTasks.map(t => {
                    const isDueToday = t.dueDate === todayStr;
                    const isOverdue = t.dueDate < todayStr && t.status !== 'Completed';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Task Title */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {t.title}
                            {t.priority === 'Urgent' && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-extrabold uppercase">
                                Urgent
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
                          )}
                          {t.reviewNotes && (
                            <div className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded-md text-[10px] text-amber-900 flex items-start gap-1">
                              <MessageSquare className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                              <span><strong>Review Note:</strong> {t.reviewNotes}</span>
                            </div>
                          )}
                        </td>

                        {/* Client */}
                        <td className="py-3 px-3">
                          <button
                            onClick={() => t.clientId && onNavigateToClient && onNavigateToClient(t.clientId)}
                            className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 text-xs"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {t.clientName || 'General Task'}
                          </button>
                          {t.rdoNumber && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">RDO #{t.rdoNumber}</span>
                          )}
                        </td>

                        {/* Form / Period */}
                        <td className="py-3 px-3 font-mono">
                          {t.formCode ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold text-[10px]">
                              {t.formCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">{t.category}</span>
                          )}
                          {t.taxablePeriod && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">{t.taxablePeriod}</span>
                          )}
                        </td>

                        {/* Assigned Staff */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            {t.assignedToName}
                          </span>
                        </td>

                        {/* Due Date */}
                        <td className="py-3 px-3 font-mono">
                          <div className={`font-bold ${
                            isOverdue ? 'text-red-600' : isDueToday ? 'text-rose-600' : 'text-slate-700'
                          }`}>
                            {t.dueDate}
                          </div>
                          {t.isOverriddenDeadline && (
                            <span className="text-[9px] text-purple-700 font-semibold block" title={`Overridden: ${t.overrideReason}`}>
                              Extended (was {t.originalDueDate})
                            </span>
                          )}
                        </td>

                        {/* Stage / Status */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              t.status === 'For Review' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              t.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              isOverdue ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {t.status}
                            </span>
                            {t.workflowStage && (
                              <span className="text-[9px] text-slate-400 block font-semibold">
                                Stage: {t.workflowStage}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Workflow Action Controls */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            
                            {/* Submit for Review (Preparer Action) */}
                            {t.status !== 'Completed' && t.status !== 'For Review' && (
                              <button
                                onClick={() => { setTargetTaskForSubmit(t); setPreparerNotesInput(''); setShowSubmitModal(true); }}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Submit for Senior Review"
                              >
                                <Send className="w-3 h-3" /> Submit for Review
                              </button>
                            )}

                            {/* Reviewer Action Controls (Approve / Return) */}
                            {t.status === 'For Review' && (
                              <>
                                <button
                                  onClick={() => { setTargetTaskForReview(t); setReviewAction('APPROVE'); setReviewNotesInput('Approved & Verified.'); setShowReviewModal(true); }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <ShieldCheck className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => { setTargetTaskForReview(t); setReviewAction('RETURN'); setReviewNotesInput(''); setShowReviewModal(true); }}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" /> Return
                                </button>
                              </>
                            )}

                            {/* Direct Mark Complete toggle */}
                            {t.status !== 'Completed' && t.status !== 'For Review' && (
                              <button
                                onClick={() => { updateTaskStatus(t.id, 'Completed'); showToast(`Task "${t.title}" marked Completed!`); }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer"
                                title="Quick Complete"
                              >
                                Mark Complete
                              </button>
                            )}

                            {/* Override Deadline */}
                            <button
                              onClick={() => { setTargetTaskForOverride(t); setNewDueDateInput(t.dueDate); setOverrideReasonInput(''); setShowOverrideModal(true); }}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer"
                              title="Extend / Override Deadline"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            {/* Reassign Staff */}
                            <button
                              onClick={() => { setTargetTaskForReassign(t); setNewStaffIdInput(t.assignedToId || t.assignedToName); setShowReassignModal(true); }}
                              className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-md cursor-pointer"
                              title="Reassign Staff"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Task */}
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer"
                              title="Edit Task"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Task */}
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete task "${t.title}"?`)) {
                                  deleteTask(t.id, currentUser?.id, currentUser?.fullName);
                                  showToast('Task deleted.');
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onLoadMore={loadMore}
            hasMoreToLoad={hasMoreToLoad}
            itemLabel="tasks"
          />
        </div>
      )}

      {/* VIEW MODE 2: KANBAN STAGES VIEW */}
      {viewTab === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Stage 1: Pending / In Progress */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5 text-amber-700">
                <Clock className="w-4 h-4" /> Pending / In Progress
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px]">
                {filteredTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length}
              </span>
            </div>
            <div className="space-y-2.5">
              {filteredTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').map(t => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-slate-900 text-xs">{t.title}</h4>
                    {t.formCode && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold font-mono">
                        {t.formCode}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-700 font-semibold">{t.clientName}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Due: <strong className="font-mono text-slate-800">{t.dueDate}</strong></span>
                    <span>Assigned: <strong>{t.assignedToName}</strong></span>
                  </div>
                  <button
                    onClick={() => { setTargetTaskForSubmit(t); setPreparerNotesInput(''); setShowSubmitModal(true); }}
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3 h-3" /> Submit for Senior Review
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 2: For Review */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-purple-900 border-b border-purple-200 pb-2">
              <span className="flex items-center gap-1.5 text-purple-800">
                <ShieldCheck className="w-4 h-4" /> For Senior Review
              </span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-full text-[10px]">
                {filteredTasks.filter(t => t.status === 'For Review' || t.workflowStage === 'Reviewer').length}
              </span>
            </div>
            <div className="space-y-2.5">
              {filteredTasks.filter(t => t.status === 'For Review' || t.workflowStage === 'Reviewer').map(t => (
                <div key={t.id} className="bg-white border border-purple-200 rounded-xl p-3.5 shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">{t.title}</h4>
                  <p className="text-[11px] text-indigo-700 font-semibold">{t.clientName}</p>
                  <p className="text-[10px] text-slate-500">Preparer: {t.preparerName || t.assignedToName}</p>
                  <div className="flex items-center gap-1.5 pt-2">
                    <button
                      onClick={() => { setTargetTaskForReview(t); setReviewAction('APPROVE'); setReviewNotesInput('Approved & Verified.'); setShowReviewModal(true); }}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => { setTargetTaskForReview(t); setReviewAction('RETURN'); setReviewNotesInput(''); setShowReviewModal(true); }}
                      className="flex-1 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Return
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 3: Returned for Correction */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200 pb-2">
              <span className="flex items-center gap-1.5 text-amber-800">
                <RotateCcw className="w-4 h-4" /> Returned for Correction
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px]">
                {filteredTasks.filter(t => t.workflowStage === 'Returned').length}
              </span>
            </div>
            <div className="space-y-2.5">
              {filteredTasks.filter(t => t.workflowStage === 'Returned').map(t => (
                <div key={t.id} className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">{t.title}</h4>
                  <p className="text-[11px] text-indigo-700 font-semibold">{t.clientName}</p>
                  {t.reviewNotes && (
                    <p className="text-[10px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                      <strong>Reviewer Note:</strong> {t.reviewNotes}
                    </p>
                  )}
                  <button
                    onClick={() => { setTargetTaskForSubmit(t); setPreparerNotesInput(''); setShowSubmitModal(true); }}
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Re-submit for Review
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 4: Approved & Completed */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200 pb-2">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4" /> Completed & Verified
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px]">
                {filteredTasks.filter(t => t.status === 'Completed').length}
              </span>
            </div>
            <div className="space-y-2.5">
              {filteredTasks.filter(t => t.status === 'Completed').map(t => (
                <div key={t.id} className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs line-through text-slate-500">{t.title}</h4>
                  <p className="text-[11px] text-slate-600 font-semibold">{t.clientName}</p>
                  <p className="text-[10px] text-emerald-700 font-bold">Approved by: {t.completedByName || t.reviewerName || 'Senior Reviewer'}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* VIEW MODE 3: MY WORK QUEUE */}
      {viewTab === 'MY_WORK' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Staff Work Queue for {currentUser?.fullName || 'Current Staff'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Tasks directly assigned to your workload for filing and review preparation.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredTasks.map(t => (
              <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 hover:bg-white transition-all">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-xs">{t.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-indigo-700">{t.clientName}</p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p><strong>Form:</strong> {t.formCode || 'General Filing'}</p>
                  <p><strong>Due Date:</strong> <span className="font-mono font-bold text-rose-600">{t.dueDate}</span></p>
                </div>
                {t.status !== 'Completed' && (
                  <button
                    onClick={() => { setTargetTaskForSubmit(t); setPreparerNotesInput(''); setShowSubmitModal(true); }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit For Senior Review
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 4: REVIEW QUEUE */}
      {viewTab === 'REVIEW_QUEUE' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-purple-950 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Senior Reviewer Approval Queue
              </h3>
              <p className="text-xs text-purple-700 mt-0.5">Approve filings or return for corrections prior to BIR / eFPS final submission.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No tasks currently pending senior review.</p>
            ) : (
              filteredTasks.map(t => (
                <div key={t.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      {t.title}
                      {t.formCode && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-mono font-bold">{t.formCode}</span>}
                    </h4>
                    <p className="text-xs text-indigo-700 font-semibold mt-0.5">{t.clientName} • RDO #{t.rdoNumber}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Preparer: <strong className="text-slate-800">{t.preparerName || t.assignedToName}</strong> • Due: <strong className="font-mono text-rose-600">{t.dueDate}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setTargetTaskForReview(t); setReviewAction('APPROVE'); setReviewNotesInput('Approved & Verified.'); setShowReviewModal(true); }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" /> Approve Task
                    </button>
                    <button
                      onClick={() => { setTargetTaskForReview(t); setReviewAction('RETURN'); setReviewNotesInput(''); setShowReviewModal(true); }}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" /> Return to Preparer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                {editingTask ? 'Edit Engagement Task' : 'Create Custom Engagement Task'}
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="flex flex-col flex-1 min-h-0 space-y-3">
              <div className="overflow-y-auto flex-1 pr-1.5 space-y-3 my-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Select Client</label>
                <SearchableClientSelect
                  clients={clients}
                  selectedClientId={formClientId}
                  onSelectClient={(id) => setFormClientId(id || '')}
                  placeholder="Select Client..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle || ''}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 0619E Monthly Expanded Withholding Return"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Category</label>
                  <select
                    value={formCategory || 'BIR'}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="BIR">BIR Tax Filing</option>
                    <option value="Benefits">Government Benefits</option>
                    <option value="Bookkeeping">Bookkeeping</option>
                    <option value="Payroll">Payroll Processing</option>
                    <option value="Audit">Audit & Financials</option>
                    <option value="Compliance">General Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Form Code (Optional)</label>
                  <input
                    type="text"
                    value={formFormCode || ''}
                    onChange={(e) => setFormFormCode(e.target.value)}
                    placeholder="e.g. 1601C, 2550Q, SSS"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formDueDate || ''}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Priority</label>
                  <select
                    value={formPriority || 'Medium'}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Assigned Staff</label>
                <select
                  value={formAssignedStaffId || ''}
                  onChange={(e) => setFormAssignedStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.fullName}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description & Notes</label>
                <textarea
                  rows={2}
                  value={formDescription || ''}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Instructions for preparer..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white"
                />
              </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-2xs cursor-pointer"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT FOR REVIEW MODAL */}
      {showSubmitModal && targetTaskForSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                Submit Task for Senior Review
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs">
              <p className="font-bold text-purple-900">{targetTaskForSubmit.title}</p>
              <p className="text-purple-700 mt-0.5">{targetTaskForSubmit.clientName}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Preparer Notes / Summary</label>
              <textarea
                rows={3}
                value={preparerNotesInput || ''}
                onChange={(e) => setPreparerNotesInput(e.target.value)}
                placeholder="e.g. Return 0619E prepared with total tax withheld ₱12,500. Verified against ledger."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  const res = submitTaskForReview(targetTaskForSubmit.id, preparerNotesInput, currentUser?.id, currentUser?.fullName);
                  showToast(res.message);
                  setShowSubmitModal(false);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-2xs"
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REVIEW / APPROVE / RETURN MODAL */}
      {showReviewModal && targetTaskForReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {reviewAction === 'APPROVE' ? 'Approve & Verify Filing' : 'Return Task for Correction'}
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">{targetTaskForReview.title}</p>
              <p className="text-slate-600">{targetTaskForReview.clientName}</p>
              <p className="text-indigo-700 font-semibold mt-1">Preparer: {targetTaskForReview.preparerName || targetTaskForReview.assignedToName}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                {reviewAction === 'APPROVE' ? 'Approval Audit Notes' : 'Correction Instructions *'}
              </label>
              <textarea
                rows={3}
                value={reviewNotesInput || ''}
                onChange={(e) => setReviewNotesInput(e.target.value)}
                placeholder={reviewAction === 'APPROVE' ? 'Verified with eFPS/BIR payment confirmation...' : 'Please re-check schedule of expanded withholding tax line 3...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer">
                Cancel
              </button>
              {reviewAction === 'APPROVE' ? (
                <button
                  onClick={() => {
                    const res = approveTask(targetTaskForReview.id, reviewNotesInput, currentUser?.id, currentUser?.fullName);
                    showToast(res.message);
                    setShowReviewModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                >
                  Approve Task
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!reviewNotesInput.trim()) {
                      alert('Please provide correction notes for the preparer.');
                      return;
                    }
                    const res = returnTaskForCorrection(targetTaskForReview.id, reviewNotesInput, currentUser?.id, currentUser?.fullName);
                    showToast(res.message);
                    setShowReviewModal(false);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                >
                  Return to Preparer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: OVERRIDE DEADLINE MODAL */}
      {showOverrideModal && targetTaskForOverride && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Override / Extend Deadline
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Extend deadline for <strong className="text-slate-900">{targetTaskForOverride.title}</strong> ({targetTaskForOverride.clientName}).
            </p>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">New Due Date *</label>
              <input
                type="date"
                value={newDueDateInput || ''}
                onChange={(e) => setNewDueDateInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Reason for Extension / BIR Memorandum *</label>
              <textarea
                rows={2}
                value={overrideReasonInput || ''}
                onChange={(e) => setOverrideReasonInput(e.target.value)}
                placeholder="e.g. BIR RMC No. 12-2026 extension or client document delay..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={() => setShowOverrideModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!overrideReasonInput.trim()) {
                    alert('Reason for override is required for audit trail.');
                    return;
                  }
                  const res = overrideTaskDeadline(targetTaskForOverride.id, newDueDateInput, overrideReasonInput, currentUser?.id, currentUser?.fullName);
                  showToast(res.message);
                  setShowOverrideModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
              >
                Save Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: REASSIGN STAFF MODAL */}
      {showReassignModal && targetTaskForReassign && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                Reassign Task Staff
              </h3>
              <button onClick={() => setShowReassignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Currently assigned to: <strong className="text-slate-900">{targetTaskForReassign.assignedToName}</strong>
            </p>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">New Assigned Staff</label>
              <select
                value={newStaffIdInput}
                onChange={(e) => setNewStaffIdInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.fullName}>{u.fullName} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={() => setShowReassignModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  const assignedUser = allUsers.find(u => u.fullName === newStaffIdInput || u.id === newStaffIdInput);
                  const nameToSave = assignedUser ? assignedUser.fullName : newStaffIdInput;
                  const res = reassignTask(targetTaskForReassign.id, assignedUser?.id || newStaffIdInput, nameToSave, currentUser?.id, currentUser?.fullName);
                  showToast(res.message);
                  setShowReassignModal(false);
                }}
                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl shadow-2xs"
              >
                Confirm Reassign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
