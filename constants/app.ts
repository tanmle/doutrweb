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
    '#6366f1', // Indigo 500
    '#a855f7', // Purple 500
    '#ec4899', // Pink 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#3b82f6', // Blue 500
    '#14b8a6', // Teal 500
] as const;
