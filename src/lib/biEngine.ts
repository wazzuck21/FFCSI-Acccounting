import { 
  ClientProfile, 
  ClientService, 
  InvoiceItem, 
  Payment, 
  ComplianceItem, 
  TaskItem, 
  DocumentItem, 
  PayableRecord, 
  CollectionLog, 
  CompanyExpense, 
  CompanyEmployee, 
  DataConflict, 
  DataHealthReport 
} from '../types';

export type DatePreset = 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'LAST_30_DAYS' | 'ALL' | 'CUSTOM';
export type TrendGranularity = 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface BiFilterContext {
  datePreset: DatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  clientId: string;  // 'ALL' or ID
  staffId: string;   // 'ALL' or staff ID
  serviceCategory: string; // 'ALL' or category
  serviceCode: string; // 'ALL' or code/name
  rdoCode: string;   // 'ALL' or RDO code
  status: string;    // 'ALL', 'Active', 'Inactive', 'For Compliance', 'Archived'
}

export interface ClientAnalyticsData {
  totalClients: number;
  activeCount: number;
  forComplianceCount: number;
  inactiveCount: number;
  archivedCount: number;
  newClientsCount: number;
  clientsByStaff: { staffId: string; staffName: string; clientCount: number }[];
  clientsByService: { serviceCode: string; serviceName: string; category: string; clientCount: number }[];
  clientsByRdo: { rdoCode: string; clientCount: number }[];
}

export interface RevenueAnalyticsData {
  monthlyRevenue: number;
  quarterlyRevenue: number;
  annualRevenue: number;
  periodRevenue: number;
  previousPeriodRevenue: number;
  growthRatePercentage: number;
  recurringRevenue: number;
  recurringPercentage: number;
  oneTimeRevenue: number;
  oneTimePercentage: number;
  revenueByService: { serviceName: string; category: string; revenue: number; percentage: number }[];
  revenueByClient: { clientId: string; clientName: string; revenue: number; percentage: number }[];
  revenueByCategory: { category: string; revenue: number; percentage: number }[];
}

export interface ArAgingData {
  totalOutstanding: number;
  current: number;       // 0 days overdue
  days1to30: number;     // 1-30 days
  days31to60: number;    // 31-60 days
  days61to90: number;    // 61-90 days
  over90: number;        // >90 days
  collectionRatePercentage: number;
  overdueAccountsCount: number;
  topOutstandingClients: { 
    clientId: string; 
    clientName: string; 
    totalOutstanding: number; 
    overdueInvoicesCount: number;
    oldestDueDate: string;
    daysOverdue: number;
  }[];
}

export interface CollectionsAnalyticsData {
  paymentsThisMonth: number;
  paymentsThisYear: number;
  totalCollectedInPeriod: number;
  paymentMethodsBreakdown: { method: string; amount: number; percentage: number; count: number }[];
  collectionFollowUpsCount: number;
  promiseToPayCount: number;
  disputedAccountsCount: number;
  recentCollectionLogs: CollectionLog[];
}

export interface CompliancePerformanceData {
  tasksDueToday: number;
  tasksDueThisWeek: number;
  tasksOverdue: number;
  tasksForReview: number;
  tasksCompleted: number;
  tasksReturned: number;
  completionRatePercentage: number;
  complianceByStaff: { 
    staffId: string; 
    staffName: string; 
    assignedTasks: number; 
    completedTasks: number; 
    overdueTasks: number;
    rate: number;
  }[];
  complianceByForm: { 
    formCode: string; 
    category: string; 
    totalTasks: number; 
    completedTasks: number; 
    overdueTasks: number;
    completionRate: number;
  }[];
}

export interface StaffProductivityData {
  staffList: {
    staffId: string;
    staffName: string;
    assignedClientsCount: number;
    assignedTasksCount: number;
    completedTasksCount: number;
    overdueTasksCount: number;
    forReviewTasksCount: number;
    completionRate: number;
    workloadLevel: 'Normal' | 'Moderate' | 'Heavy';
  }[];
}

export interface ServiceProfitabilityData {
  totalRevenueByService: { serviceCode: string; serviceName: string; category: string; totalRevenue: number; averageFee: number; clientCount: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  totalClientServicesCount: number;
  averageServiceFee: number;
  monthlyRecurringRevenue: number;
  highestRevenueServices: { serviceName: string; revenue: number }[];
  lowestRevenueServices: { serviceName: string; revenue: number }[];
}

export interface TrendDatapoint {
  label: string; // e.g. "Aug 01", "2026-Q3", "2026-08"
  periodKey: string;
  revenue: number;
  collections: number;
  ar: number;
  newClients: number;
  completedTasks: number;
}

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'ATTENTION' | 'HEALTHY';

export interface ManagementAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  metricValue?: string | number;
  category: 'AR' | 'COMPLIANCE' | 'STAFF' | 'SYNC' | 'INTEGRITY' | 'CONFLICT' | 'SERVICES' | 'BILLING';
  targetTab?: string;
  clientId?: string;
  clientName?: string;
}

export interface Client360Summary {
  client: ClientProfile;
  services: ClientService[];
  complianceItems: ComplianceItem[];
  tasks: TaskItem[];
  documents: DocumentItem[];
  invoices: InvoiceItem[];
  payments: Payment[];
  collectionLogs: CollectionLog[];
  metrics: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstandingAr: number;
    overdueArCount: number;
    complianceScorePercentage: number;
    activeServicesCount: number;
    pendingTasksCount: number;
    onTimePaymentScore: number;
  };
}

export interface BiFullState {
  clients: ClientProfile[];
  clientServices: ClientService[];
  invoices: InvoiceItem[];
  payments: Payment[];
  complianceItems: ComplianceItem[];
  tasks: TaskItem[];
  documents: DocumentItem[];
  payables: PayableRecord[];
  collectionLogs: CollectionLog[];
  companyExpenses: CompanyExpense[];
  employees: CompanyEmployee[];
  syncConflicts?: DataConflict[];
  syncStatus?: string;
}

// Helper: Calculate default date range based on preset
export function getDateRangeForPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  
  const formatDate = (d: Date) => d.toISOString().substring(0, 10);

  if (preset === 'THIS_MONTH') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }
  
  if (preset === 'THIS_QUARTER') {
    const q = Math.floor(month / 3);
    const start = new Date(year, q * 3, 1);
    const end = new Date(year, (q + 1) * 3, 0);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }

  if (preset === 'THIS_YEAR') {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }

  if (preset === 'LAST_30_DAYS') {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }

  // ALL or CUSTOM default
  return { startDate: '2020-01-01', endDate: '2030-12-31' };
}

// Main BI Engine Processor
export function calculateBiMetrics(state: BiFullState, filters: BiFilterContext) {
  const { startDate, endDate, clientId, staffId, serviceCategory, serviceCode, rdoCode, status } = filters;

  // 1. Filter Clients
  const filteredClients = state.clients.filter(c => {
    if (clientId !== 'ALL' && c.id !== clientId) return false;
    if (staffId !== 'ALL' && c.assignedStaffId !== staffId && c.assignedStaffName !== staffId) return false;
    if (rdoCode !== 'ALL' && c.rdoNumber !== rdoCode) return false;
    if (status !== 'ALL' && c.status !== status) return false;
    return true;
  });

  const filteredClientIds = new Set(filteredClients.map(c => c.id));

  // 2. Filter Services
  const filteredServices = state.clientServices.filter(s => {
    if (!filteredClientIds.has(s.clientId)) return false;
    if (serviceCategory !== 'ALL' && s.category !== serviceCategory) return false;
    if (serviceCode !== 'ALL' && s.serviceCode !== serviceCode && s.serviceName !== serviceCode) return false;
    if (staffId !== 'ALL' && s.assignedStaffId !== staffId) return false;
    return true;
  });

  // 3. Filter Invoices
  const filteredInvoices = state.invoices.filter(i => {
    if (!filteredClientIds.has(i.clientId)) return false;
    if (i.status === 'Cancelled') return false;
    if (startDate && i.issueDate < startDate) return false;
    if (endDate && i.issueDate > endDate) return false;
    return true;
  });

  // 4. Filter Payments
  const filteredPayments = state.payments.filter(p => {
    if (p.status === 'Cancelled') return false;
    if (!filteredClientIds.has(p.clientId)) return false;
    const paymentDateStr = p.paymentDate ? p.paymentDate.substring(0, 10) : '';
    if (startDate && paymentDateStr < startDate) return false;
    if (endDate && paymentDateStr > endDate) return false;
    return true;
  });

  // 5. Filter Tasks
  const filteredTasks = state.tasks.filter(t => {
    if (t.clientId && !filteredClientIds.has(t.clientId)) return false;
    if (staffId !== 'ALL' && t.assignedToId !== staffId && t.assignedToName !== staffId) return false;
    if (serviceCategory !== 'ALL' && t.category !== serviceCategory) return false;
    return true;
  });

  // --- COMPUTE CLIENT ANALYTICS ---
  const activeClients = filteredClients.filter(c => c.status === 'Active');
  const forComplianceClients = filteredClients.filter(c => c.status === 'For Compliance' || c.status === 'Compliance');
  const inactiveClients = filteredClients.filter(c => c.status === 'Inactive');
  const archivedClients = filteredClients.filter(c => c.status === 'Archived');

  const newClientsCount = filteredClients.filter(c => {
    const created = c.createdAt ? c.createdAt.substring(0, 10) : '';
    return created >= startDate && created <= endDate;
  }).length;

  // Clients by Staff
  const staffClientMap = new Map<string, { staffId: string; staffName: string; clientCount: number }>();
  filteredClients.forEach(c => {
    const sName = c.assignedStaffName || 'Unassigned';
    const sId = c.assignedStaffId || 'unassigned';
    if (!staffClientMap.has(sName)) {
      staffClientMap.set(sName, { staffId: sId, staffName: sName, clientCount: 0 });
    }
    staffClientMap.get(sName)!.clientCount += 1;
  });
  const clientsByStaff = Array.from(staffClientMap.values()).sort((a, b) => b.clientCount - a.clientCount);

  // Clients by Service
  const serviceClientMap = new Map<string, { serviceCode: string; serviceName: string; category: string; set: Set<string> }>();
  filteredServices.forEach(s => {
    if (s.status === 'Active') {
      const key = s.serviceName;
      if (!serviceClientMap.has(key)) {
        serviceClientMap.set(key, { serviceCode: s.serviceCode, serviceName: s.serviceName, category: s.category, set: new Set() });
      }
      serviceClientMap.get(key)!.set.add(s.clientId);
    }
  });
  const clientsByService = Array.from(serviceClientMap.values()).map(item => ({
    serviceCode: item.serviceCode,
    serviceName: item.serviceName,
    category: item.category,
    clientCount: item.set.size
  })).sort((a, b) => b.clientCount - a.clientCount);

  // Clients by RDO
  const rdoMap = new Map<string, number>();
  filteredClients.forEach(c => {
    const rdo = c.rdoNumber || 'RDO Unassigned';
    rdoMap.set(rdo, (rdoMap.get(rdo) || 0) + 1);
  });
  const clientsByRdo = Array.from(rdoMap.entries()).map(([rdoCode, clientCount]) => ({ rdoCode, clientCount })).sort((a, b) => b.clientCount - a.clientCount);

  const clientAnalytics: ClientAnalyticsData = {
    totalClients: filteredClients.length,
    activeCount: activeClients.length,
    forComplianceCount: forComplianceClients.length,
    inactiveCount: inactiveClients.length,
    archivedCount: archivedClients.length,
    newClientsCount,
    clientsByStaff,
    clientsByService,
    clientsByRdo
  };

  // --- COMPUTE REVENUE ANALYTICS ---
  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const currentYearStr = todayStr.substring(0, 4);  // YYYY

  // Monthly Revenue (all active payments in current month)
  const monthlyRevenue = state.payments
    .filter(p => p.status === 'Active' && p.paymentDate && p.paymentDate.startsWith(currentMonthStr))
    .reduce((sum, p) => sum + p.amount, 0);

  // Quarterly Revenue (current quarter)
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  const quarterlyRevenue = state.payments
    .filter(p => {
      if (p.status !== 'Active' || !p.paymentDate) return false;
      const pDate = new Date(p.paymentDate);
      return pDate.getFullYear() === Number(currentYearStr) && Math.floor(pDate.getMonth() / 3) === currentQuarter;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  // Annual Revenue
  const annualRevenue = state.payments
    .filter(p => p.status === 'Active' && p.paymentDate && p.paymentDate.startsWith(currentYearStr))
    .reduce((sum, p) => sum + p.amount, 0);

  // Filtered Period Revenue
  const periodRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // Previous Period Revenue for Growth % calculation
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const durationMs = Math.max(endD.getTime() - startD.getTime(), 86400000);
  const prevStartD = new Date(startD.getTime() - durationMs);
  const prevEndD = new Date(endD.getTime() - durationMs);
  const prevStartStr = prevStartD.toISOString().substring(0, 10);
  const prevEndStr = prevEndD.toISOString().substring(0, 10);

  const previousPeriodRevenue = state.payments
    .filter(p => {
      if (p.status === 'Active') {
        const pStr = p.paymentDate ? p.paymentDate.substring(0, 10) : '';
        return pStr >= prevStartStr && pStr <= prevEndStr;
      }
      return false;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const growthRatePercentage = previousPeriodRevenue > 0 
    ? Math.round(((periodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100)
    : (periodRevenue > 0 ? 100 : 0);

  // Revenue by Service and Recurring vs One-time
  let recurringRevenue = 0;
  let oneTimeRevenue = 0;
  const revByServiceMap = new Map<string, { serviceName: string; category: string; revenue: number }>();
  const revByClientMap = new Map<string, { clientId: string; clientName: string; revenue: number }>();
  const revByCategoryMap = new Map<string, number>();

  filteredInvoices.forEach(inv => {
    const invPaid = inv.paidAmount || 0;
    if (invPaid > 0) {
      const lineItems = inv.services || [];
      const totalLineAmt = lineItems.reduce((s, l) => s + (l.amount || 0), 1);

      lineItems.forEach(line => {
        const prop = (line.amount || 0) / totalLineAmt;
        const linePaid = invPaid * prop;
        const sName = line.description || line.serviceCode || 'General Billing';
        const sCat = line.serviceCategory || 'Accounting';

        if (line.itemType === 'One-Time') {
          oneTimeRevenue += linePaid;
        } else {
          recurringRevenue += linePaid;
        }

        if (!revByServiceMap.has(sName)) {
          revByServiceMap.set(sName, { serviceName: sName, category: sCat, revenue: 0 });
        }
        revByServiceMap.get(sName)!.revenue += linePaid;

        revByCategoryMap.set(sCat, (revByCategoryMap.get(sCat) || 0) + linePaid);
      });

      if (!revByClientMap.has(inv.clientId)) {
        revByClientMap.set(inv.clientId, { clientId: inv.clientId, clientName: inv.clientName, revenue: 0 });
      }
      revByClientMap.get(inv.clientId)!.revenue += invPaid;
    }
  });

  const totRev = Math.max(periodRevenue, 1);
  const revenueByService = Array.from(revByServiceMap.values())
    .map(r => ({ ...r, percentage: Math.round((r.revenue / totRev) * 100) }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueByClient = Array.from(revByClientMap.values())
    .map(c => ({ ...c, percentage: Math.round((c.revenue / totRev) * 100) }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueByCategory = Array.from(revByCategoryMap.entries())
    .map(([category, revenue]) => ({ category, revenue, percentage: Math.round((revenue / totRev) * 100) }))
    .sort((a, b) => b.revenue - a.revenue);

  const recurringPercentage = Math.round((recurringRevenue / totRev) * 100);
  const oneTimePercentage = 100 - recurringPercentage;

  const revenueAnalytics: RevenueAnalyticsData = {
    monthlyRevenue,
    quarterlyRevenue,
    annualRevenue,
    periodRevenue,
    previousPeriodRevenue,
    growthRatePercentage,
    recurringRevenue,
    recurringPercentage,
    oneTimeRevenue,
    oneTimePercentage,
    revenueByService,
    revenueByClient,
    revenueByCategory
  };

  // --- COMPUTE ACCOUNTS RECEIVABLE & AGING ---
  const allUnpaidInvoices = state.invoices.filter(i => {
    if (i.status === 'Cancelled' || i.status === 'Draft' || i.status === 'Paid') return false;
    if (!filteredClientIds.has(i.clientId)) return false;
    const balance = i.totalAmount - (i.paidAmount || 0);
    return balance > 0;
  });

  let totalOutstanding = 0;
  let arCurrent = 0;
  let ar1to30 = 0;
  let ar31to60 = 0;
  let ar61to90 = 0;
  let arOver90 = 0;

  const clientArMap = new Map<string, { 
    clientId: string; 
    clientName: string; 
    totalOutstanding: number; 
    overdueInvoicesCount: number;
    oldestDueDate: string;
    daysOverdue: number;
  }>();

  allUnpaidInvoices.forEach(inv => {
    const balance = inv.totalAmount - (inv.paidAmount || 0);
    totalOutstanding += balance;

    const dueTime = new Date(inv.dueDate).getTime();
    const nowTime = new Date(todayStr).getTime();
    const diffDays = Math.floor((nowTime - dueTime) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      arCurrent += balance;
    } else if (diffDays <= 30) {
      ar1to30 += balance;
    } else if (diffDays <= 60) {
      ar31to60 += balance;
    } else if (diffDays <= 90) {
      ar61to90 += balance;
    } else {
      arOver90 += balance;
    }

    if (!clientArMap.has(inv.clientId)) {
      clientArMap.set(inv.clientId, {
        clientId: inv.clientId,
        clientName: inv.clientName,
        totalOutstanding: 0,
        overdueInvoicesCount: 0,
        oldestDueDate: inv.dueDate,
        daysOverdue: Math.max(diffDays, 0)
      });
    }

    const cAr = clientArMap.get(inv.clientId)!;
    cAr.totalOutstanding += balance;
    if (diffDays > 0) {
      cAr.overdueInvoicesCount += 1;
      if (inv.dueDate < cAr.oldestDueDate) {
        cAr.oldestDueDate = inv.dueDate;
        cAr.daysOverdue = diffDays;
      }
    }
  });

  const totalBilledInPeriod = filteredInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaidInPeriod = filteredInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const collectionRatePercentage = totalBilledInPeriod > 0 ? Math.round((totalPaidInPeriod / totalBilledInPeriod) * 100) : 100;

  const topOutstandingClients = Array.from(clientArMap.values())
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  const arAging: ArAgingData = {
    totalOutstanding,
    current: arCurrent,
    days1to30: ar1to30,
    days31to60: ar31to60,
    days61to90: ar61to90,
    over90: arOver90,
    collectionRatePercentage,
    overdueAccountsCount: topOutstandingClients.filter(c => c.overdueInvoicesCount > 0).length,
    topOutstandingClients
  };

  // --- COMPUTE COLLECTIONS ANALYTICS ---
  const paymentMethodsMap = new Map<string, { amount: number; count: number }>();
  filteredPayments.forEach(p => {
    const method = p.paymentMethod || 'Cash';
    if (!paymentMethodsMap.has(method)) {
      paymentMethodsMap.set(method, { amount: 0, count: 0 });
    }
    const item = paymentMethodsMap.get(method)!;
    item.amount += p.amount;
    item.count += 1;
  });

  const totColl = Math.max(periodRevenue, 1);
  const paymentMethodsBreakdown = Array.from(paymentMethodsMap.entries())
    .map(([method, val]) => ({
      method,
      amount: val.amount,
      count: val.count,
      percentage: Math.round((val.amount / totColl) * 100)
    }))
    .sort((a, b) => b.amount - a.amount);

  const filteredLogs = state.collectionLogs.filter(l => filteredClientIds.has(l.clientId));
  const promiseToPayCount = filteredLogs.filter(l => l.status === 'Promise to Pay').length;
  const disputedAccountsCount = filteredLogs.filter(l => l.status === 'Disputed').length;

  const collectionsAnalytics: CollectionsAnalyticsData = {
    paymentsThisMonth: monthlyRevenue,
    paymentsThisYear: annualRevenue,
    totalCollectedInPeriod: periodRevenue,
    paymentMethodsBreakdown,
    collectionFollowUpsCount: filteredLogs.length,
    promiseToPayCount,
    disputedAccountsCount,
    recentCollectionLogs: filteredLogs.slice(0, 10)
  };

  // --- COMPUTE COMPLIANCE PERFORMANCE ---
  const tasksDueToday = filteredTasks.filter(t => t.dueDate === todayStr && t.status !== 'Completed').length;
  
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const weekFromNowStr = weekFromNow.toISOString().substring(0, 10);
  const tasksDueThisWeek = filteredTasks.filter(t => t.dueDate >= todayStr && t.dueDate <= weekFromNowStr && t.status !== 'Completed').length;

  const tasksOverdue = filteredTasks.filter(t => (t.dueDate < todayStr && t.status !== 'Completed') || t.status === 'Overdue').length;
  const tasksForReview = filteredTasks.filter(t => t.status === 'For Review' || t.workflowStage === 'Reviewer').length;
  const tasksCompleted = filteredTasks.filter(t => t.status === 'Completed').length;
  const tasksReturned = filteredTasks.filter(t => t.workflowStage === 'Returned').length;
  const totalTasks = filteredTasks.length;
  const completionRatePercentage = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 100;

  // Compliance by Staff
  const staffComplianceMap = new Map<string, { staffId: string; staffName: string; total: number; completed: number; overdue: number }>();
  filteredTasks.forEach(t => {
    const sName = t.assignedToName || 'Unassigned';
    const sId = t.assignedToId || 'unassigned';
    if (!staffComplianceMap.has(sName)) {
      staffComplianceMap.set(sName, { staffId: sId, staffName: sName, total: 0, completed: 0, overdue: 0 });
    }
    const item = staffComplianceMap.get(sName)!;
    item.total += 1;
    if (t.status === 'Completed') item.completed += 1;
    if (t.dueDate < todayStr && t.status !== 'Completed') item.overdue += 1;
  });

  const complianceByStaff = Array.from(staffComplianceMap.values())
    .map(item => ({
      staffId: item.staffId,
      staffName: item.staffName,
      assignedTasks: item.total,
      completedTasks: item.completed,
      overdueTasks: item.overdue,
      rate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 100
    }))
    .sort((a, b) => b.assignedTasks - a.assignedTasks);

  // Compliance by Form / Statutory Agency
  const formMap = new Map<string, { formCode: string; category: string; total: number; completed: number; overdue: number }>();
  filteredTasks.forEach(t => {
    const code = t.formCode || t.title || 'General Compliance';
    const cat = t.category || 'BIR';
    if (!formMap.has(code)) {
      formMap.set(code, { formCode: code, category: cat, total: 0, completed: 0, overdue: 0 });
    }
    const item = formMap.get(code)!;
    item.total += 1;
    if (t.status === 'Completed') item.completed += 1;
    if (t.dueDate < todayStr && t.status !== 'Completed') item.overdue += 1;
  });

  const complianceByForm = Array.from(formMap.values())
    .map(item => ({
      formCode: item.formCode,
      category: item.category,
      totalTasks: item.total,
      completedTasks: item.completed,
      overdueTasks: item.overdue,
      completionRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 100
    }))
    .sort((a, b) => b.totalTasks - a.totalTasks);

  const compliancePerformance: CompliancePerformanceData = {
    tasksDueToday,
    tasksDueThisWeek,
    tasksOverdue,
    tasksForReview,
    tasksCompleted,
    tasksReturned,
    completionRatePercentage,
    complianceByStaff,
    complianceByForm
  };

  // --- COMPUTE STAFF PRODUCTIVITY ---
  const allStaffIds = new Set<string>();
  state.employees.forEach(e => allStaffIds.add(e.fullName));
  state.clients.forEach(c => { if (c.assignedStaffName) allStaffIds.add(c.assignedStaffName); });
  state.tasks.forEach(t => { if (t.assignedToName) allStaffIds.add(t.assignedToName); });

  const staffList = Array.from(allStaffIds).map(staffName => {
    const assignedClients = state.clients.filter(c => c.assignedStaffName === staffName && c.status !== 'Archived').length;
    const staffTasks = state.tasks.filter(t => t.assignedToName === staffName);
    const assignedTasksCount = staffTasks.length;
    const completedTasksCount = staffTasks.filter(t => t.status === 'Completed').length;
    const overdueTasksCount = staffTasks.filter(t => t.dueDate < todayStr && t.status !== 'Completed').length;
    const forReviewTasksCount = staffTasks.filter(t => t.status === 'For Review').length;
    const completionRate = assignedTasksCount > 0 ? Math.round((completedTasksCount / assignedTasksCount) * 100) : 100;

    let workloadLevel: 'Normal' | 'Moderate' | 'Heavy' = 'Normal';
    const activeTasks = assignedTasksCount - completedTasksCount;
    if (activeTasks > 15) workloadLevel = 'Heavy';
    else if (activeTasks > 8) workloadLevel = 'Moderate';

    return {
      staffId: staffName,
      staffName,
      assignedClientsCount: assignedClients,
      assignedTasksCount,
      completedTasksCount,
      overdueTasksCount,
      forReviewTasksCount,
      completionRate,
      workloadLevel
    };
  }).sort((a, b) => b.assignedTasksCount - a.assignedTasksCount);

  const staffProductivity: StaffProductivityData = { staffList };

  // --- COMPUTE SERVICE PROFITABILITY & MRR ---
  const serviceMap = new Map<string, { serviceCode: string; serviceName: string; category: string; totalRevenue: number; clientSet: Set<string> }>();

  state.clientServices.forEach(s => {
    if (s.status === 'Active') {
      const key = s.serviceName;
      if (!serviceMap.has(key)) {
        serviceMap.set(key, { serviceCode: s.serviceCode, serviceName: s.serviceName, category: s.category, totalRevenue: 0, clientSet: new Set() });
      }
      serviceMap.get(key)!.clientSet.add(s.clientId);
    }
  });

  // Attach revenue from invoices
  revenueByService.forEach(r => {
    if (serviceMap.has(r.serviceName)) {
      serviceMap.get(r.serviceName)!.totalRevenue += r.revenue;
    }
  });

  const totalRevenueByService = Array.from(serviceMap.values()).map(item => {
    const clientCount = item.clientSet.size;
    const averageFee = clientCount > 0 ? Math.round(item.totalRevenue / clientCount) : 0;
    return {
      serviceCode: item.serviceCode,
      serviceName: item.serviceName,
      category: item.category,
      totalRevenue: item.totalRevenue,
      averageFee,
      clientCount
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Calculate MRR (Monthly Recurring Revenue)
  let monthlyRecurringRevenue = 0;
  state.clientServices.forEach(s => {
    if (s.status === 'Active' && s.billable && s.billingFrequency === 'Monthly' && s.fee) {
      monthlyRecurringRevenue += s.fee;
    }
  });
  // Add active client retainers
  state.clients.forEach(c => {
    if (c.status === 'Active' && c.retainersFee) {
      monthlyRecurringRevenue += c.retainersFee;
    }
  });

  const highestRevenueServices = totalRevenueByService.slice(0, 3).map(s => ({ serviceName: s.serviceName, revenue: s.totalRevenue }));
  const lowestRevenueServices = totalRevenueByService.slice(-3).reverse().map(s => ({ serviceName: s.serviceName, revenue: s.totalRevenue }));

  const serviceProfitability: ServiceProfitabilityData = {
    totalRevenueByService,
    revenueByCategory,
    totalClientServicesCount: state.clientServices.filter(s => s.status === 'Active').length,
    averageServiceFee: totalRevenueByService.length > 0 ? Math.round(monthlyRecurringRevenue / Math.max(totalRevenueByService.length, 1)) : 0,
    monthlyRecurringRevenue,
    highestRevenueServices,
    lowestRevenueServices
  };

  return {
    clientAnalytics,
    revenueAnalytics,
    arAging,
    collectionsAnalytics,
    compliancePerformance,
    staffProductivity,
    serviceProfitability
  };
}

// --- GENERATE TIME SERIES FINANCIAL & OPERATIONAL TRENDS ---
export function generateTrendData(state: BiFullState, filters: BiFilterContext, granularity: TrendGranularity): TrendDatapoint[] {
  const { startDate, endDate } = filters;
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  
  const datapointsMap = new Map<string, TrendDatapoint>();

  // Function to get bucket key
  const getBucketKey = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (granularity === 'DAILY') {
      return dateStr.substring(0, 10);
    }
    if (granularity === 'MONTHLY') {
      return dateStr.substring(0, 7); // YYYY-MM
    }
    if (granularity === 'QUARTERLY') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `${d.getFullYear()}-Q${q}`;
    }
    if (granularity === 'ANNUAL') {
      return `${d.getFullYear()}`;
    }
    return dateStr.substring(0, 7);
  };

  // Populate payments (Revenue & Collections)
  state.payments.forEach(p => {
    if (p.status === 'Active' && p.paymentDate) {
      const pStr = p.paymentDate.substring(0, 10);
      if (pStr >= startDate && pStr <= endDate) {
        const key = getBucketKey(pStr);
        if (!datapointsMap.has(key)) {
          datapointsMap.set(key, { label: key, periodKey: key, revenue: 0, collections: 0, ar: 0, newClients: 0, completedTasks: 0 });
        }
        const item = datapointsMap.get(key)!;
        item.revenue += p.amount;
        item.collections += p.amount;
      }
    }
  });

  // Populate new clients
  state.clients.forEach(c => {
    if (c.createdAt) {
      const cStr = c.createdAt.substring(0, 10);
      if (cStr >= startDate && cStr <= endDate) {
        const key = getBucketKey(cStr);
        if (!datapointsMap.has(key)) {
          datapointsMap.set(key, { label: key, periodKey: key, revenue: 0, collections: 0, ar: 0, newClients: 0, completedTasks: 0 });
        }
        datapointsMap.get(key)!.newClients += 1;
      }
    }
  });

  // Populate completed compliance tasks
  state.tasks.forEach(t => {
    if (t.status === 'Completed' && t.completedAt) {
      const tStr = t.completedAt.substring(0, 10);
      if (tStr >= startDate && tStr <= endDate) {
        const key = getBucketKey(tStr);
        if (!datapointsMap.has(key)) {
          datapointsMap.set(key, { label: key, periodKey: key, revenue: 0, collections: 0, ar: 0, newClients: 0, completedTasks: 0 });
        }
        datapointsMap.get(key)!.completedTasks += 1;
      }
    }
  });

  // Sort chronologically
  return Array.from(datapointsMap.values()).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

// --- INTELLIGENT MANAGEMENT ALERTS ENGINE ---
export function generateManagementAlerts(state: BiFullState, metrics: ReturnType<typeof calculateBiMetrics>): ManagementAlert[] {
  const alerts: ManagementAlert[] = [];

  // 1. Critical Level (🔴)
  // Severely Overdue AR (>90 days)
  if (metrics.arAging.over90 > 0) {
    alerts.push({
      id: 'alert_ar_over_90',
      severity: 'CRITICAL',
      category: 'AR',
      title: 'Severely Overdue Accounts Receivable (>90 Days)',
      description: `₱${metrics.arAging.over90.toLocaleString()} in client billings are past 90 days overdue and require immediate legal or executive collection intervention.`,
      metricValue: `₱${metrics.arAging.over90.toLocaleString()}`,
      targetTab: 'billing'
    });
  }

  // Overdue Compliance Deadlines
  if (metrics.compliancePerformance.tasksOverdue > 0) {
    alerts.push({
      id: 'alert_compliance_overdue',
      severity: 'CRITICAL',
      category: 'COMPLIANCE',
      title: 'Overdue Tax & Statutory Compliance Deadlines',
      description: `${metrics.compliancePerformance.tasksOverdue} compliance filings have passed their statutory due date. Risk of BIR/LGU surcharge penalties.`,
      metricValue: `${metrics.compliancePerformance.tasksOverdue} Overdue`,
      targetTab: 'compliance'
    });
  }

  // Database Integrity Problems
  if (state.syncConflicts && state.syncConflicts.filter(c => c.status === 'REVIEW_REQUIRED').length > 0) {
    const unres = state.syncConflicts.filter(c => c.status === 'REVIEW_REQUIRED').length;
    alerts.push({
      id: 'alert_sync_conflicts',
      severity: 'CRITICAL',
      category: 'CONFLICT',
      title: 'Unresolved Financial Multi-Tab Sync Conflicts',
      description: `${unres} concurrent edits detected across active browser tabs. Review required to prevent overwriting payment ledgers.`,
      metricValue: `${unres} Conflicts`,
      targetTab: 'system-integrity'
    });
  }

  // 2. Warning Level (🟠)
  // High Staff Workload
  const heavyStaff = metrics.staffProductivity.staffList.filter(s => s.workloadLevel === 'Heavy');
  if (heavyStaff.length > 0) {
    alerts.push({
      id: 'alert_heavy_workload',
      severity: 'WARNING',
      category: 'STAFF',
      title: 'High Staff Workload & Capacity Strain',
      description: `${heavyStaff.map(s => s.staffName).join(', ')} currently manage over 15 active compliance tasks each. Consider reassigning tasks.`,
      metricValue: `${heavyStaff.length} Staff Strained`,
      targetTab: 'tasks'
    });
  }

  // Tasks Pending Review
  if (metrics.compliancePerformance.tasksForReview > 0) {
    alerts.push({
      id: 'alert_tasks_review',
      severity: 'WARNING',
      category: 'COMPLIANCE',
      title: 'Tasks Awaiting Senior Reviewer Approval',
      description: `${metrics.compliancePerformance.tasksForReview} prepared tax returns and filings are waiting for Senior Accountant / Admin review.`,
      metricValue: `${metrics.compliancePerformance.tasksForReview} Pending`,
      targetTab: 'tasks'
    });
  }

  // 3. Attention Level (🟡)
  // Active Clients with No Services Subscribed
  const clientsWithNoServices = state.clients.filter(c => {
    if (c.status !== 'Active') return false;
    const hasService = state.clientServices.some(s => s.clientId === c.id && s.status === 'Active');
    return !hasService;
  });

  if (clientsWithNoServices.length > 0) {
    alerts.push({
      id: 'alert_clients_no_services',
      severity: 'ATTENTION',
      category: 'SERVICES',
      title: 'Active Clients Without Active Engagement Services',
      description: `${clientsWithNoServices.length} active clients have no active service engagements configured in their workspace.`,
      metricValue: `${clientsWithNoServices.length} Clients`,
      targetTab: 'clients'
    });
  }

  // Unbilled Active Services
  const activeBillableServices = state.clientServices.filter(s => s.status === 'Active' && s.billable);
  const unbilledCount = Math.max(activeBillableServices.length - state.invoices.length, 0);
  if (unbilledCount > 0) {
    alerts.push({
      id: 'alert_unbilled_services',
      severity: 'ATTENTION',
      category: 'BILLING',
      title: 'Unbilled Active Engagements Ready for Invoicing',
      description: `Multiple billable client services do not have generated invoices for the active period. Run auto-billing engine.`,
      metricValue: `Action Suggested`,
      targetTab: 'billing'
    });
  }

  // 4. Healthy Level (🟢)
  if (metrics.arAging.collectionRatePercentage >= 80) {
    alerts.push({
      id: 'alert_healthy_collections',
      severity: 'HEALTHY',
      category: 'AR',
      title: 'Excellent Collection Rate Performance',
      description: `Accounts Receivable collection rate is currently at ${metrics.arAging.collectionRatePercentage}%, maintaining strong cash flow performance.`,
      metricValue: `${metrics.arAging.collectionRatePercentage}% Rate`,
      targetTab: 'billing'
    });
  }

  return alerts;
}

// --- CLIENT 360 MANAGEMENT SUMMARY GENERATOR ---
export function generateClient360Summary(state: BiFullState, clientId: string): Client360Summary | null {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return null;

  const services = state.clientServices.filter(s => s.clientId === clientId);
  const complianceItems = state.complianceItems.filter(c => c.clientId === clientId);
  const tasks = state.tasks.filter(t => t.clientId === clientId);
  const documents = state.documents.filter(d => d.clientId === clientId);
  const invoices = state.invoices.filter(i => i.clientId === clientId && i.status !== 'Cancelled');
  const payments = state.payments.filter(p => p.clientId === clientId && p.status === 'Active');
  const collectionLogs = state.collectionLogs.filter(l => l.clientId === clientId);

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstandingAr = Math.max(totalInvoiced - totalPaid, 0);

  const todayStr = new Date().toISOString().substring(0, 10);
  const overdueArCount = invoices.filter(i => i.dueDate < todayStr && (i.totalAmount - (i.paidAmount || 0)) > 0).length;

  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const complianceScorePercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 100;
  const pendingTasksCount = tasks.filter(t => t.status !== 'Completed').length;

  const onTimePayments = payments.filter(p => {
    const inv = invoices.find(i => i.id === p.invoiceId);
    if (!inv) return true;
    return p.paymentDate <= inv.dueDate;
  }).length;
  const onTimePaymentScore = payments.length > 0 ? Math.round((onTimePayments / payments.length) * 100) : 100;

  return {
    client,
    services,
    complianceItems,
    tasks,
    documents,
    invoices,
    payments,
    collectionLogs,
    metrics: {
      totalInvoiced,
      totalPaid,
      totalOutstandingAr,
      overdueArCount,
      complianceScorePercentage,
      activeServicesCount: services.filter(s => s.status === 'Active').length,
      pendingTasksCount,
      onTimePaymentScore
    }
  };
}
