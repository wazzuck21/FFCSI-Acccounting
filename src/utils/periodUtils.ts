// Multi-Month & Period Coverage Parser & Revenue Breakdown Engine ⭐
import { InvoiceServiceLine } from '../types';

export const ALL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAME_TO_INDEX: { [key: string]: number } = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11
};

/**
 * Parses any billing period string into an array of discrete standardized months ("Month Year", e.g., "July 2026").
 * Handles:
 * - Single Month: "July 2026", "Jul 2026"
 * - Month Range: "July – September 2026", "July - September 2026 (3 Mos)", "Nov 2025 – Feb 2026"
 * - Quarter: "2Q 2026", "2Q-2026", "Q2 2026", "1Q – 3Q 2026"
 * - Discrete Months: "Jan, Mar, Nov 2026 (3 Mos)", "January, March 2026"
 * - Annual / Multi-Year: "Annual 2026", "2024 – 2026 (3 Yrs)"
 */
export function parsePeriodToMonths(periodStr?: string | null): string[] {
  if (!periodStr) return [];
  const raw = periodStr.trim();
  if (!raw) return [];

  // 1. Check for Annual / Year patterns
  const annualSingleMatch = raw.match(/^(?:annual\s*)?(\d{4})$/i);
  if (annualSingleMatch) {
    const year = parseInt(annualSingleMatch[1], 10);
    if (year >= 2000 && year <= 2099) {
      return ALL_MONTH_NAMES.map(m => `${m} ${year}`);
    }
  }

  const annualRangeMatch = raw.match(/^(?:annual\s*)?(\d{4})\s*(?:–|-|to)\s*(\d{4})/i);
  if (annualRangeMatch) {
    const startYear = parseInt(annualRangeMatch[1], 10);
    const endYear = parseInt(annualRangeMatch[2], 10);
    const result: string[] = [];
    for (let y = startYear; y <= endYear; y++) {
      for (const m of ALL_MONTH_NAMES) {
        result.push(`${m} ${y}`);
      }
    }
    return result;
  }

  // 2. Check for Quarterly patterns (e.g. "1Q 2026", "2Q-2026", "1Q – 3Q 2026", "Q1 2026", "1Q, 2Q 2026")
  const quarterRangeMatch = raw.match(/([1-4])\s*Q\s*(?:–|-|to)\s*([1-4])\s*Q\s*(\d{4})/i);
  if (quarterRangeMatch) {
    const startQ = parseInt(quarterRangeMatch[1], 10);
    const endQ = parseInt(quarterRangeMatch[2], 10);
    const year = parseInt(quarterRangeMatch[3], 10);
    const result: string[] = [];
    const qMonths: Record<number, number[]> = {
      1: [0, 1, 2],
      2: [3, 4, 5],
      3: [6, 7, 8],
      4: [9, 10, 11]
    };
    for (let q = startQ; q <= endQ; q++) {
      if (qMonths[q]) {
        for (const mIdx of qMonths[q]) {
          result.push(`${ALL_MONTH_NAMES[mIdx]} ${year}`);
        }
      }
    }
    return result;
  }

  const singleQuarterMatch = raw.match(/(?:([1-4])\s*Q|Q\s*([1-4]))\s*[-–]?\s*(\d{4})/i);
  if (singleQuarterMatch) {
    const q = parseInt(singleQuarterMatch[1] || singleQuarterMatch[2], 10);
    const year = parseInt(singleQuarterMatch[3], 10);
    const qMonths: Record<number, number[]> = {
      1: [0, 1, 2],
      2: [3, 4, 5],
      3: [6, 7, 8],
      4: [9, 10, 11]
    };
    if (qMonths[q]) {
      return qMonths[q].map(mIdx => `${ALL_MONTH_NAMES[mIdx]} ${year}`);
    }
  }

  // 3. Check for Month Range across different years (e.g., "November 2025 – February 2026")
  const multiYearRangeMatch = raw.match(/([A-Za-z]+)\s*(\d{4})\s*(?:–|-|to)\s*([A-Za-z]+)\s*(\d{4})/i);
  if (multiYearRangeMatch) {
    const mStartKey = multiYearRangeMatch[1].toLowerCase();
    const yStart = parseInt(multiYearRangeMatch[2], 10);
    const mEndKey = multiYearRangeMatch[3].toLowerCase();
    const yEnd = parseInt(multiYearRangeMatch[4], 10);

    if (MONTH_NAME_TO_INDEX[mStartKey] !== undefined && MONTH_NAME_TO_INDEX[mEndKey] !== undefined) {
      let currY = yStart;
      let currM = MONTH_NAME_TO_INDEX[mStartKey];
      const targetM = MONTH_NAME_TO_INDEX[mEndKey];
      const result: string[] = [];

      while (currY < yEnd || (currY === yEnd && currM <= targetM)) {
        result.push(`${ALL_MONTH_NAMES[currM]} ${currY}`);
        currM++;
        if (currM > 11) {
          currM = 0;
          currY++;
        }
      }
      return result;
    }
  }

  // 4. Check for Month Range in the same year (e.g., "July – September 2026 (3 Mos)", "May-July 2026")
  const sameYearRangeMatch = raw.match(/([A-Za-z]+)\s*(?:–|-|to)\s*([A-Za-z]+)\s*(\d{4})/i);
  if (sameYearRangeMatch) {
    const mStartKey = sameYearRangeMatch[1].toLowerCase();
    const mEndKey = sameYearRangeMatch[2].toLowerCase();
    const year = parseInt(sameYearRangeMatch[3], 10);

    if (MONTH_NAME_TO_INDEX[mStartKey] !== undefined && MONTH_NAME_TO_INDEX[mEndKey] !== undefined) {
      const startIdx = MONTH_NAME_TO_INDEX[mStartKey];
      const endIdx = MONTH_NAME_TO_INDEX[mEndKey];
      const result: string[] = [];
      if (startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
          result.push(`${ALL_MONTH_NAMES[i]} ${year}`);
        }
      } else {
        // Wrap around year if any
        for (let i = startIdx; i < 12; i++) result.push(`${ALL_MONTH_NAMES[i]} ${year}`);
        for (let i = 0; i <= endIdx; i++) result.push(`${ALL_MONTH_NAMES[i]} ${year + 1}`);
      }
      return result;
    }
  }

  // 5. Check for Discrete Comma-Separated Months (e.g., "Jan, Mar, Nov 2026 (3 Mos)")
  const commaMatch = raw.match(/((?:[A-Za-z]+(?:\s*,\s*|\s+and\s+)?)+)\s*(\d{4})/i);
  if (commaMatch && commaMatch[1].includes(',')) {
    const monthTokens = commaMatch[1].split(/,|\band\b/i).map(t => t.trim().toLowerCase()).filter(Boolean);
    const year = parseInt(commaMatch[2], 10);
    const result: string[] = [];
    for (const token of monthTokens) {
      if (MONTH_NAME_TO_INDEX[token] !== undefined) {
        result.push(`${ALL_MONTH_NAMES[MONTH_NAME_TO_INDEX[token]]} ${year}`);
      }
    }
    if (result.length > 0) return result;
  }

  // 6. Standard Single Month (e.g., "August 2026", "Aug 2026")
  const singleMonthMatch = raw.match(/([A-Za-z]+)\s*(\d{4})/i);
  if (singleMonthMatch) {
    const token = singleMonthMatch[1].toLowerCase();
    const year = parseInt(singleMonthMatch[2], 10);
    if (MONTH_NAME_TO_INDEX[token] !== undefined) {
      return [`${ALL_MONTH_NAMES[MONTH_NAME_TO_INDEX[token]]} ${year}`];
    }
  }

  // Fallback: return raw string trimmed
  return [raw];
}

/**
 * Retrieves the normalized covered months for any invoice line item.
 * Prioritizes `line.coveredMonths` if populated, or falls back to parsing `line.monthYear`.
 */
export function getLineCoveredMonths(line: { monthYear?: string; coveredMonths?: string[] }): string[] {
  if (line.coveredMonths && Array.isArray(line.coveredMonths) && line.coveredMonths.length > 0) {
    return line.coveredMonths;
  }
  return parsePeriodToMonths(line.monthYear);
}

/**
 * Calculates per-month record breakdown for a billing line item.
 * E.g., Retainers Fee for July – September 2026 (₱3,000) will yield:
 * - July 2026 = ₱1,000.00
 * - August 2026 = ₱1,000.00
 * - September 2026 = ₱1,000.00
 */
export function getMonthlyBreakdown(line: InvoiceServiceLine): Array<{ month: string; amount: number; description: string }> {
  const months = getLineCoveredMonths(line);
  const totalAmount = Number(line.amount) || 0;
  if (months.length <= 1) {
    return [{
      month: months[0] || line.monthYear || 'Current Period',
      amount: totalAmount,
      description: line.description
    }];
  }

  // Distribute equally with precise 2-decimal rounding
  const basePerMonth = Math.floor((totalAmount / months.length) * 100) / 100;
  let remaining = Math.round((totalAmount - basePerMonth * months.length) * 100) / 100;

  return months.map((m, idx) => {
    // Add cent adjustments to the last month if any
    const amt = idx === months.length - 1 ? basePerMonth + remaining : basePerMonth;
    return {
      month: m,
      amount: amt,
      description: line.description
    };
  });
}

/**
 * Checks if two period strings / line items overlap for duplicate detection.
 */
export function checkMonthPeriodOverlap(
  periodA: string,
  periodB: string,
  coveredMonthsA?: string[],
  coveredMonthsB?: string[]
): { hasOverlap: boolean; overlappingMonths: string[] } {
  const monthsA = (coveredMonthsA && coveredMonthsA.length > 0) ? coveredMonthsA : parsePeriodToMonths(periodA);
  const monthsB = (coveredMonthsB && coveredMonthsB.length > 0) ? coveredMonthsB : parsePeriodToMonths(periodB);

  const normalize = (m: string) => m.trim().toLowerCase();
  const setA = new Set(monthsA.map(normalize));
  const overlaps: string[] = [];

  for (const mb of monthsB) {
    if (setA.has(normalize(mb))) {
      overlaps.push(mb);
    }
  }

  return {
    hasOverlap: overlaps.length > 0,
    overlappingMonths: overlaps
  };
}
