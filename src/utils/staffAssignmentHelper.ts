import { User, ClientProfile, CompanyServicePermission } from '../types';
import { normalizeUserRole } from '../lib/rbac';

export interface UserClientServiceScope {
  hasClientAccess: boolean;
  hasBirAccess: boolean;
  allowAllBIR: boolean;
  allowedBIR: string[];
  hasBenefitsAccess: boolean;
  allowAllBenefits: boolean;
  allowedBenefits: string[];
}

/**
 * Returns detailed service permissions for a user on a given client
 */
export function getUserClientServiceScope(user: User | null | undefined, clientId: string): UserClientServiceScope {
  if (!user || user.status !== 'Active') {
    return {
      hasClientAccess: false,
      hasBirAccess: false,
      allowAllBIR: false,
      allowedBIR: [],
      hasBenefitsAccess: false,
      allowAllBenefits: false,
      allowedBenefits: []
    };
  }

  const clientList = user.permissions?.clientAccessList;
  const isClientInList = !clientList || clientList.length === 0 || clientList.includes(clientId);

  if (!isClientInList) {
    return {
      hasClientAccess: false,
      hasBirAccess: false,
      allowAllBIR: false,
      allowedBIR: [],
      hasBenefitsAccess: false,
      allowAllBenefits: false,
      allowedBenefits: []
    };
  }

  const cPerm = user.permissions?.clientServicePermissions?.[clientId];
  if (!cPerm) {
    // If client is in access list but no granular record exists, default to full assigned scope
    return {
      hasClientAccess: true,
      hasBirAccess: true,
      allowAllBIR: true,
      allowedBIR: [],
      hasBenefitsAccess: true,
      allowAllBenefits: true,
      allowedBenefits: []
    };
  }

  const allowAllBIR = Boolean(cPerm.allowAllBIR);
  const allowedBIR = Array.isArray(cPerm.allowedBIR) ? cPerm.allowedBIR : [];
  const hasBirAccess = allowAllBIR || allowedBIR.length > 0;

  const allowAllBenefits = Boolean(cPerm.allowAllBenefits);
  const allowedBenefits = Array.isArray(cPerm.allowedBenefits) ? cPerm.allowedBenefits : [];
  const hasBenefitsAccess = allowAllBenefits || allowedBenefits.length > 0;

  const hasClientAccess = hasBirAccess || hasBenefitsAccess;

  return {
    hasClientAccess,
    hasBirAccess,
    allowAllBIR,
    allowedBIR,
    hasBenefitsAccess,
    allowAllBenefits,
    allowedBenefits
  };
}

/**
 * Checks if a specific staff member is assigned to a client (and optionally a specific service category/code)
 */
export function isStaffAssignedToClient(
  user: User | null | undefined,
  client: ClientProfile | null | undefined,
  category?: 'BIR' | 'BENEFITS' | 'ALL',
  specificCode?: string
): boolean {
  if (!user || !client || user.status !== 'Active') return false;

  const scope = getUserClientServiceScope(user, client.id);
  if (!scope.hasClientAccess) return false;

  if (category === 'BIR') {
    if (!scope.hasBirAccess) return false;
    if (specificCode && !scope.allowAllBIR) {
      const codeUpper = specificCode.trim().toUpperCase();
      return scope.allowedBIR.some(b => b.trim().toUpperCase() === codeUpper || codeUpper.includes(b.trim().toUpperCase()));
    }
    return true;
  }

  if (category === 'BENEFITS') {
    if (!scope.hasBenefitsAccess) return false;
    if (specificCode && !scope.allowAllBenefits) {
      const nameLower = specificCode.trim().toLowerCase();
      return scope.allowedBenefits.some(b => b.trim().toLowerCase() === nameLower || nameLower.includes(b.trim().toLowerCase()));
    }
    return true;
  }

  // General assignment (either BIR or Benefits access)
  return scope.hasBirAccess || scope.hasBenefitsAccess;
}

/**
 * Returns list of assigned User objects for a client and category
 */
export function getAssignedUsersForClient(
  client: ClientProfile | null | undefined,
  allUsers: User[],
  category?: 'BIR' | 'BENEFITS' | 'ALL',
  specificCode?: string
): User[] {
  if (!client) return [];

  // Filter users from allUsers who explicitly have active access
  const activeStaff = allUsers.filter(u => {
    // Only consider operational roles (exclude super admins from cluttering standard staff lists unless explicitly assigned)
    if (u.status !== 'Active') return false;
    return isStaffAssignedToClient(u, client, category, specificCode);
  });

  return activeStaff;
}

/**
 * Formats assigned staff names as a clean comma-separated string, or returns "Not yet assigned"
 */
export function getFormattedStaffAssignment(
  client: ClientProfile | null | undefined,
  allUsers: User[],
  category?: 'BIR' | 'BENEFITS' | 'ALL',
  specificCode?: string
): string {
  if (!client) return 'Not yet assigned';

  const assignedUsers = getAssignedUsersForClient(client, allUsers, category, specificCode);
  if (assignedUsers.length > 0) {
    const names = Array.from(new Set(assignedUsers.map(u => u.fullName).filter(Boolean)));
    if (names.length > 0) {
      return names.join(', ');
    }
  }

  // Fallback check on client properties if allUsers is empty or initializing
  if (!allUsers || allUsers.length === 0) {
    if (category === 'BIR' && client.birAssignedStaffNames && client.birAssignedStaffNames.length > 0) {
      const valid = client.birAssignedStaffNames.filter(n => n && n !== 'Unassigned');
      if (valid.length > 0) return valid.join(', ');
    }
    if (category === 'BENEFITS' && client.benefitsAssignedStaffNames && client.benefitsAssignedStaffNames.length > 0) {
      const valid = client.benefitsAssignedStaffNames.filter(n => n && n !== 'Unassigned');
      if (valid.length > 0) return valid.join(', ');
    }
    if (client.assignedStaffName && client.assignedStaffName !== 'Unassigned' && client.assignedStaffName.trim() !== '') {
      return client.assignedStaffName;
    }
  }

  return 'Not yet assigned';
}
