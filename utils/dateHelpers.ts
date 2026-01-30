/**
 * Date utility functions for consistent date handling across the application.
 * All functions work with local timezone to avoid UTC conversion issues.
 */

export type DateFilterType = 'today' | 'this_month' | 'last_month' | 'range';

export interface DateRange {
    start: string;
    end: string;
}

/**
 * Formats a Date object as YYYY-MM-DD in local timezone.
 * Avoids UTC conversion issues by using local date components.
 * 
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 * 
 * @example
 * getLocalYYYYMMDD(new Date()) // "2026-01-30"
 */
export const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Gets the date range for a given filter type.
 * All dates are in local timezone and formatted as YYYY-MM-DD.
 * 
 * @param type - The filter type
 * @returns Object with start and end date strings
 * 
 * @example
 * getDateRange('today') // { start: "2026-01-30", end: "2026-01-30" }
 * getDateRange('this_month') // { start: "2026-01-01", end: "2026-01-30" }
 */
export const getDateRange = (type: DateFilterType): DateRange => {
    const now = new Date();
    const today = getLocalYYYYMMDD(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = getLocalYYYYMMDD(startOfMonth);

    // Previous month calculation
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayLastMonth = new Date(firstDayCurrentMonth);
    lastDayLastMonth.setDate(0); // Go back one day to end of prev month
    const firstDayLastMonth = new Date(lastDayLastMonth.getFullYear(), lastDayLastMonth.getMonth(), 1);

    const prevMonthStart = getLocalYYYYMMDD(firstDayLastMonth);
    const prevMonthEnd = getLocalYYYYMMDD(lastDayLastMonth);

    switch (type) {
        case 'today':
            return { start: today, end: today };
        case 'this_month':
            return { start: startOfMonthStr, end: today };
        case 'last_month':
            return { start: prevMonthStart, end: prevMonthEnd };
        case 'range':
            return { start: startOfMonthStr, end: today }; // Default range
        default:
            return { start: startOfMonthStr, end: today };
    }
};

/**
 * Checks if a date string (YYYY-MM-DD) is within a given range.
 * Uses string comparison which works correctly for YYYY-MM-DD format.
 * 
 * @param dateStr - Date string to check (YYYY-MM-DD)
 * @param startStr - Range start date (YYYY-MM-DD)
 * @param endStr - Range end date (YYYY-MM-DD)
 * @returns True if date is within range (inclusive)
 * 
 * @example
 * isDateInRange("2026-01-15", "2026-01-01", "2026-01-31") // true
 * isDateInRange("2026-02-01", "2026-01-01", "2026-01-31") // false
 */
export const isDateInRange = (dateStr: string, startStr: string, endStr: string): boolean => {
    return dateStr >= startStr && dateStr <= endStr;
};

/**
 * Gets the start of the current week (Sunday) in local timezone.
 * 
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns Date string in YYYY-MM-DD format
 */
export const getStartOfWeek = (referenceDate: Date = new Date()): string => {
    const dayOfWeek = referenceDate.getDay(); // 0 (Sun) - 6 (Sat)
    const startOfWeek = new Date(referenceDate);
    startOfWeek.setDate(referenceDate.getDate() - dayOfWeek);
    return getLocalYYYYMMDD(startOfWeek);
};

/**
 * Gets the start date for fetching dashboard data.
 * Returns the earlier of: 30 days ago or start of current month.
 * 
 * @returns Date string in YYYY-MM-DD format
 */
export const getDashboardStartDate = (): string => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = thirtyDaysAgo < startOfMonth ? thirtyDaysAgo : startOfMonth;

    return getLocalYYYYMMDD(startDate);
};

/**
 * Formats a date string for display in the user's locale.
 * 
 * @param dateStr - Date string (YYYY-MM-DD or ISO format)
 * @param locale - Locale string (defaults to 'vi-VN')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDateForDisplay = (
    dateStr: string,
    locale: string = 'vi-VN',
    options?: Intl.DateTimeFormatOptions
): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, options);
};
