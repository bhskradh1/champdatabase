import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate the payable fees for the current year after promotion adjustments.
 *
 * Rules:
 * - previous_year_balance > 0 means unpaid fees (will be ADDED to current year)
 * - previous_year_balance < 0 means extra/advance payment (will be DEDUCTED from current year)
 *
 * @param previous_year_balance number (positive = unpaid, negative = extra paid)
 * @param current_year_fees number base fee for the current year
 * @returns total payable fees for the current year after adjustments (>= 0)
 */
export function calculatePromotionFees(previous_year_balance: number, current_year_fees: number): number {
  if (typeof previous_year_balance !== 'number' || typeof current_year_fees !== 'number') {
    throw new TypeError('Both previous_year_balance and current_year_fees must be numbers');
  }

  // previous_year_balance > 0 => unpaid -> add
  // previous_year_balance < 0 => extra paid -> subtract absolute value
  const adjusted = current_year_fees + previous_year_balance;

  // Ensure not negative; if negative, that means advance covers the whole fee (0 payable)
  return Math.max(0, Math.round(adjusted));
}
