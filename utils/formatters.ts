import { APP_CONSTANTS } from '@/constants/app';

/**
 * Shared currency formatter instance
 * Reuse this instead of creating new formatters on every render
 */
export const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: APP_CONSTANTS.CURRENCY,
});

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
    return currencyFormatter.format(amount);
}

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date, locale: string = APP_CONSTANTS.DATE_FORMAT): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(locale);
}

/**
 * Format date key for chart data (YYYY-MM-DD)
 */
export function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse date key back to Date object
 */
export function parseDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
}
