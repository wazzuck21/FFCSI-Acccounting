import { ClientProfile } from '../types';

/**
 * Extracts the 9-digit Base TIN from any TIN string format.
 * Examples:
 *  "009-023-023-001" -> "009-023-023"
 *  "009-023-023-000" -> "009-023-023"
 *  "009023023001"    -> "009-023-023"
 *  "123456789"       -> "123-456-789"
 */
export function extractBaseTin(tinNumber: string | undefined): string {
  if (!tinNumber) return '000-000-000';
  
  // Extract all numeric digits
  const cleanDigits = String(tinNumber).replace(/\D/g, '');
  
  if (cleanDigits.length >= 9) {
    const d1 = cleanDigits.substring(0, 3);
    const d2 = cleanDigits.substring(3, 6);
    const d3 = cleanDigits.substring(6, 9);
    return `${d1}-${d2}-${d3}`;
  }
  
  return String(tinNumber).trim();
}

/**
 * Extracts the branch code suffix (e.g. "000" for Main, "001" for Branch 1)
 */
export function extractBranchCode(tinNumber: string | undefined, explicitBranchCode?: string): string {
  if (explicitBranchCode && String(explicitBranchCode).trim()) {
    return String(explicitBranchCode).trim().padStart(3, '0');
  }
  
  if (!tinNumber) return '000';
  
  const parts = String(tinNumber).split('-');
  if (parts.length >= 4) {
    return String(parts[3] || '').trim().padStart(3, '0');
  }
  
  const cleanDigits = String(tinNumber).replace(/\D/g, '');
  if (cleanDigits.length > 9) {
    return cleanDigits.substring(9).padStart(3, '0');
  }
  
  return '000';
}

/**
 * Formats full TIN with 9-digit base + 3 to 5 digit branch suffix.
 * Example: formatFullTin("009-023-023", "001") -> "009-023-023-001"
 */
export function formatFullTin(baseTin: string, branchCode: string = '000'): string {
  const cleanBase = extractBaseTin(baseTin);
  const cleanBranch = String(branchCode || '000').trim().padStart(3, '0');
  return `${cleanBase}-${cleanBranch}`;
}

export interface CorporateGroup {
  baseTin: string;
  headOffice?: ClientProfile;
  branches: ClientProfile[];
  allMembers: ClientProfile[];
  groupName: string;
}

/**
 * Groups clients into Corporate Groups by Base TIN (first 9 digits)
 */
export function getCorporateGroups(clients: ClientProfile[]): CorporateGroup[] {
  const groupMap: Record<string, ClientProfile[]> = {};

  clients.forEach(client => {
    const base = client.baseTin || extractBaseTin(client.tinNumber);
    if (!groupMap[base]) {
      groupMap[base] = [];
    }
    groupMap[base].push(client);
  });

  const groups: CorporateGroup[] = [];

  Object.entries(groupMap).forEach(([baseTin, members]) => {
    // Find head office: either explicitly marked isBranch === false / branchCode === '000' / parentClientId is missing
    const headOffice = members.find(m => !m.isBranch || m.branchCode === '000' || !m.parentClientId) || members[0];
    const branches = members.filter(m => m.id !== headOffice?.id);
    
    groups.push({
      baseTin,
      headOffice,
      branches,
      allMembers: members,
      groupName: headOffice ? headOffice.companyName : `Corporate Group (${baseTin})`
    });
  });

  return groups;
}
