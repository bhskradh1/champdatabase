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

/**
 * New explicit promotion/fee helpers per requirements:
 * - previous_year_balance: positive = unpaid, negative = extra/advance
 * - current_year_fees: base fee for the new academic year
 * - fee_paid_current_year: payments made in the current year ONLY
 *
 * total_due = current_year_fees + previous_year_balance - fee_paid_current_year
 */
export function totalDue(previous_year_balance: number, current_year_fees: number, fee_paid_current_year: number): number {
  if ([previous_year_balance, current_year_fees, fee_paid_current_year].some(v => typeof v !== 'number')) {
    throw new TypeError('All arguments must be numbers');
  }

  const raw = current_year_fees + previous_year_balance - fee_paid_current_year;
  // Round to nearest integer (assumes currency is integer rupees in this codebase, adjust if decimals are needed)
  return Math.round(raw);
}

export function displayFeePaid(fee_paid_current_year: number): number {
  if (typeof fee_paid_current_year !== 'number') throw new TypeError('fee_paid_current_year must be a number');
  return Math.max(0, Math.round(fee_paid_current_year));
}

export function displayOutstanding(previous_year_balance: number, current_year_fees: number, fee_paid_current_year: number) {
  const due = totalDue(previous_year_balance, current_year_fees, fee_paid_current_year);
  if (due > 0) return { outstanding: due, extra_paid: 0 };
  if (due < 0) return { outstanding: 0, extra_paid: Math.abs(due) };
  return { outstanding: 0, extra_paid: 0 };
}
