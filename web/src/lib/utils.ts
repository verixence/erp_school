import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Formats a number in Indian numbering system
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1,00,000.00")
 */
export function formatIndianCurrency(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0.00';

  // Split into integer and decimal parts
  const [integerPart, decimalPart] = num.toFixed(decimals).split('.');

  // Indian numbering: last 3 digits, then groups of 2
  let formatted = '';
  let remaining = integerPart;

  // Handle negative numbers
  const isNegative = remaining.startsWith('-');
  if (isNegative) {
    remaining = remaining.substring(1);
  }

  // Get last 3 digits
  if (remaining.length > 3) {
    formatted = ',' + remaining.slice(-3);
    remaining = remaining.slice(0, -3);

    // Add groups of 2 digits
    while (remaining.length > 2) {
      formatted = ',' + remaining.slice(-2) + formatted;
      remaining = remaining.slice(0, -2);
    }

    // Add remaining digits
    if (remaining.length > 0) {
      formatted = remaining + formatted;
    }
  } else {
    formatted = remaining;
  }

  // Add negative sign back if needed
  if (isNegative) {
    formatted = '-' + formatted;
  }

  // Add decimal part
  return decimals > 0 ? `${formatted}.${decimalPart}` : formatted;
}

/**
 * Formats a number as Indian Rupees with symbol
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with rupee symbol (e.g., "₹1,00,000.00")
 */
export function formatINR(value: number | string, decimals: number = 2): string {
  return '₹' + formatIndianCurrency(value, decimals);
} 