/**
 * Application-wide constants
 */

export const APP_CONSTANTS = {
    // KPI and Performance
    DEFAULT_BASE_KPI: 500,

    // Pagination
    MAX_RECORDS_PER_PAGE: 50,

    // Formatting
    DATE_FORMAT: 'vi-VN',
    CURRENCY: 'USD',

    // API
    VIETQR_BANKS_API: 'https://api.vietqr.io/v2/banks',
} as const;

export const AREA_COLORS = [
    'var(--primary)',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
] as const;
