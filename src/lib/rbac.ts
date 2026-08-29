/**
 * FFCSI AFMS - Centralized Role-Based Access Control (RBAC) & Authorization Engine
 * 
 * Enforces explicit security boundaries across all entities, actions, and client scopes.
 */

import { User, UserRole } from '../types';

export type AppResource = 
  | 'clients'
  | 'compliance'
  | 'tasks'
  | 'billing'
  | 'payments'
  | 'collections'
  | 'documents'
  | 'payroll'
  | 'expenses'
  | 'reports'
  | 'credentials'
  | 'userManagement'
  | 'masterTables'
  | 'auditLogs';

export type AppAction = 
  | 'read'
  | 'create'
  | 'update'
  | 'archive'
  | 'delete'
  | 'review'
  | 'approve'
  | 'void'
  | 'cancel'
  | 'export'
  | 'manage';

export interface AuthContextRule {
  clientId?: string;
  isHistorical?: boolean;
  documentCategory?: string;
  isSuperAdminAction?: boolean;
}

/**
 * Standard Role Hierarchy & Display Labels
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMINISTRATOR: 'Administrator',
  SENIOR_ACCOUNTANT: 'Senior Accountant',
  ACCOUNTANT: 'Accountant',
  STAFF: 'Staff',
  BILLING_STAFF: 'Billing Staff',
  // Legacy aliases
  BILLING: 'Billing Staff',
  ACCOUNTING: 'Accountant',
  BENEFITS: 'Senior Accountant'
};

/**
 * Normalizes legacy roles to standardized Phase 8 roles
 */
export function normalizeUserRole(role: UserRole): UserRole {
  if (role === 'BILLING') return 'BILLING_STAFF';
  if (role === 'ACCOUNTING') return 'ACCOUNTANT';
  if (role === 'BENEFITS') return 'SENIOR_ACCOUNTANT';
  return role;
}

/**
 * Centralized Permission Engine
 * 
 * Usage: `can(currentUser, 'void', 'billing', { clientId: 'client_001' })`
 */
export function can(
  user: User | null | undefined,
  action: AppAction,
  resource: AppResource,
  context?: AuthContextRule
): boolean {
  if (!user) return false;

  // 1. Account Status Enforcement
  if (user.status !== 'Active') return false;

  const normalizedRole = normalizeUserRole(user.role);

  // 2. Super Admin Override (Super Admins have full operational rights)
  if (normalizedRole === 'SUPER_ADMIN') {
    return true;
  }

  // 3. Client-Level Scope Enforcement
  if (context?.clientId && user.permissions.clientAccessList && user.permissions.clientAccessList.length > 0) {
    if (!user.permissions.clientAccessList.includes(context.clientId)) {
      // User is not assigned to this client
      if (normalizedRole !== 'ADMINISTRATOR') {
        return false;
      }
    }
  }

  // 4. Audit Log Protection Enforcement (Requirement 5)
  // Audit logs CANNOT be modified or deleted by normal users
  if (resource === 'auditLogs') {
    if (action === 'delete' || action === 'update' || action === 'archive') {
      return false; // Strictly immutable for all users
    }
    if (action === 'read' || action === 'export') {
      return user.permissions.reports || user.permissions.userManagement || normalizedRole === 'ADMINISTRATOR';
    }
  }

  // 5. High-Risk Financial Action Safeguards (Requirement 10)
  // Voiding invoices, cancelling payments, or altering historical compliance records
  if (action === 'void' || action === 'cancel' || action === 'delete') {
    if (resource === 'billing' || resource === 'payments' || resource === 'payroll') {
      const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'ADMINISTRATOR', 'SENIOR_ACCOUNTANT'];
      if (!allowedRoles.includes(normalizedRole)) {
        return false;
      }
    }
  }

  // 6. Sensitive Credentials Vault Safeguards (Requirement 4)
  if (resource === 'credentials') {
    if (action === 'manage' || action === 'update' || action === 'delete') {
      return normalizedRole === 'ADMINISTRATOR';
    }
    return user.permissions.settings || user.permissions.clients || normalizedRole === 'ADMINISTRATOR';
  }

  // 7. Sensitive Payroll Safeguards
  if (resource === 'payroll') {
    if (!user.permissions.payroll) return false;
    if (action === 'approve' || action === 'manage') {
      return ['SUPER_ADMIN', 'ADMINISTRATOR', 'SENIOR_ACCOUNTANT'].includes(normalizedRole);
    }
  }

  // 8. User Management Safeguards
  if (resource === 'userManagement') {
    return user.permissions.userManagement || normalizedRole === 'ADMINISTRATOR';
  }

  // 9. Resource-Specific Boolean Permissions Checks
  switch (resource) {
    case 'clients':
      return user.permissions.clients;
    case 'billing':
      return user.permissions.billing;
    case 'payments':
    case 'collections':
      return user.permissions.billing || user.permissions.payables || false;
    case 'compliance':
    case 'tasks':
      return user.permissions.compliance;
    case 'documents':
      return user.permissions.documents;
    case 'payroll':
      return user.permissions.payroll;
    case 'expenses':
      return user.permissions.companyExpenses || user.permissions.payables || false;
    case 'reports':
      return user.permissions.reports;
    case 'masterTables':
      return user.permissions.settings || user.permissions.dynamicFields;
    default:
      return true;
  }
}

/**
 * Checks whether a user has permission to access / file a specific BIR tax return for a client
 */
export function canAccessClientBIR(
  user: User | null | undefined,
  clientId: string,
  birCode: string
): boolean {
  if (!user) return false;
  const role = normalizeUserRole(user.role);
  if (role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR') return true;

  // 1. If user has company restrictions and this company is not assigned
  if (user.permissions.clientAccessList && user.permissions.clientAccessList.length > 0) {
    if (!user.permissions.clientAccessList.includes(clientId)) {
      return false;
    }
  }

  // 2. Check granular service permissions for this company
  const companyPerm = user.permissions.clientServicePermissions?.[clientId];
  if (companyPerm) {
    if (companyPerm.allowAllBIR) return true;
    const cleanCode = (birCode || '').trim().toUpperCase();
    return (companyPerm.allowedBIR || []).some(
      b => b.trim().toUpperCase() === cleanCode || cleanCode.includes(b.trim().toUpperCase())
    );
  }

  return true;
}

/**
 * Checks whether a user has permission to access / file a specific Statutory Benefit for a client
 */
export function canAccessClientBenefit(
  user: User | null | undefined,
  clientId: string,
  benefitName: string
): boolean {
  if (!user) return false;
  const role = normalizeUserRole(user.role);
  if (role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR') return true;

  // 1. If user has company restrictions and this company is not assigned
  if (user.permissions.clientAccessList && user.permissions.clientAccessList.length > 0) {
    if (!user.permissions.clientAccessList.includes(clientId)) {
      return false;
    }
  }

  // 2. Check granular service permissions for this company
  const companyPerm = user.permissions.clientServicePermissions?.[clientId];
  if (companyPerm) {
    if (companyPerm.allowAllBenefits) return true;
    const cleanName = (benefitName || '').trim().toLowerCase();
    return (companyPerm.allowedBenefits || []).some(
      b => b.trim().toLowerCase() === cleanName || cleanName.includes(b.trim().toLowerCase())
    );
  }

  return true;
}
