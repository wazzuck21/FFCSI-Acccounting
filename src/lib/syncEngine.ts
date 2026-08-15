import { DataConflict, InvoiceItem, Payment } from '../types';

const SYNC_CHANNEL_NAME = 'afms_multi_tab_sync_v1';
const TAB_ID = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

export interface BroadcastMessage {
  type: 'STATE_CHANGED' | 'CONFLICT_DETECTED' | 'PING' | 'PONG';
  tabId: string;
  key?: string;
  timestamp: number;
  conflictData?: DataConflict;
}

let syncChannel: BroadcastChannel | null = null;

export function initMultiTabSync(onRemoteStateChanged: (key: string) => void, onConflictReceived: (conflict: DataConflict) => void) {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      syncChannel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        const msg = event.data;
        if (!msg || msg.tabId === TAB_ID) return; // Ignore own messages

        if (msg.type === 'STATE_CHANGED' && msg.key) {
          onRemoteStateChanged(msg.key);
        } else if (msg.type === 'CONFLICT_DETECTED' && msg.conflictData) {
          onConflictReceived(msg.conflictData);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel initialization warning:', e);
    }
  }
}

export function notifyTabStateChange(key: string) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({
        type: 'STATE_CHANGED',
        tabId: TAB_ID,
        key,
        timestamp: Date.now()
      });
    } catch (e) {
      // ignore
    }
  }
}

export function notifyTabConflict(conflict: DataConflict) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({
        type: 'CONFLICT_DETECTED',
        tabId: TAB_ID,
        conflictData: conflict,
        timestamp: Date.now()
      });
    } catch (e) {
      // ignore
    }
  }
}

// ==========================================
// UNIQUE SEQUENTIAL NUMBER CONTROL ⭐
// ==========================================

export function reserveNextInvoiceNumber(existingInvoices: InvoiceItem[], yearOverride?: number): string {
  const currentYear = yearOverride || new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  let maxSeq = 1000;
  existingInvoices.forEach(inv => {
    if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
      const seqStr = inv.invoiceNumber.replace(prefix, '').trim();
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    } else if (inv.invoiceNumber) {
      // Fallback numeric extraction
      const digits = inv.invoiceNumber.replace(/\D/g, '');
      if (digits.length >= 4) {
        const seq = parseInt(digits.slice(-4), 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

export function reserveNextCRNumber(existingInvoices: InvoiceItem[], usedCrNumbers: string[]): string {
  let maxNum = 1000;

  existingInvoices.forEach(inv => {
    if (inv.collectionReceiptNumber) {
      const num = parseInt(inv.collectionReceiptNumber.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  usedCrNumbers.forEach(cr => {
    const num = parseInt(cr.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });

  return (maxNum + 1).toString();
}

export function validateSerialNumber(num: string, existingNumbers: string[]): { isUnique: boolean; suggestedNext: string } {
  const clean = (num || '').trim().toUpperCase();
  if (!clean) return { isUnique: true, suggestedNext: '' };

  const isDuplicate = existingNumbers.some(existing => (existing || '').trim().toUpperCase() === clean);
  if (!isDuplicate) {
    return { isUnique: true, suggestedNext: clean };
  }

  // Generate suggested increment
  const digits = clean.replace(/\D/g, '');
  const prefix = clean.replace(/\d+$/, '');
  const numVal = parseInt(digits, 10) || 1000;
  const suggestedNext = `${prefix}${(numVal + 1).toString()}`;

  return { isUnique: false, suggestedNext };
}

// ==========================================
// CONFLICT DETECTION & RESOLUTION ⭐
// ==========================================

export function createFinancialConflict(
  entityType: DataConflict['entityType'],
  entityId: string,
  title: string,
  description: string,
  localData: any,
  incomingData: any
): DataConflict {
  return {
    id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    entityType,
    entityId,
    title,
    description,
    localData,
    incomingData,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    status: 'REVIEW_REQUIRED'
  };
}
