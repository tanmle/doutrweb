/**
 * Sales module constants
 */

// Pagination
export const ITEMS_PER_PAGE = 10;

// Order Status Options
export const ORDER_STATUSES = {
    ALL: 'all',
    COMPLETED: 'Completed',
    TO_SHIP: 'To ship',
    SHIPPED: 'Shipped',
    CANCELED: 'Canceled',
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

// Payout Status
export const PAYOUT_STATUSES = {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
} as const;

export type PayoutStatus = typeof PAYOUT_STATUSES[keyof typeof PAYOUT_STATUSES];

// CSV/XLSX Column Headers (lowercase for matching)
export const CSV_COLUMNS = {
    ORDER_ID: 'order id',
    ORDER_STATUS: 'order status',
    ORDER_SUBSTATUS: 'order substatus',
    SKU_ID: 'sku id',
    QUANTITY: 'quantity',
    ORDER_AMOUNT: 'order amount',
    SELLER_SKU: 'seller sku',
    CREATED_TIME: 'created time',
    TRACKING_ID: 'tracking id',
} as const;

// File Upload
export const ACCEPTED_FILE_TYPES = {
    CSV: '.csv',
    XLSX: '.xlsx',
    XLS: '.xls',
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Display
export const TRUNCATE_ID_LENGTH = 15;
export const TRUNCATE_ID_DISPLAY_LENGTH = 12;

// Error Messages
export const ERROR_MESSAGES = {
    NO_FILE_SELECTED: 'Please select a shop and a file',
    FILE_EMPTY: 'File is empty or invalid (insufficient rows for header, note, and data)',
    NO_VALID_RECORDS: 'No valid records found',
    COLUMN_NOT_FOUND: (column: string) => `Column "${column}" not found in file`,
    SKU_NOT_FOUND: (skus: string[], moreCount: number) =>
        `The following SKUs were not found in Products: ${skus.join(', ')}${moreCount > 0 ? ` and ${moreCount} more` : ''}. Import cancelled. Please add them to the Product list first.`,
    SHOP_MISMATCH: (errors: string[], hasMore: boolean) =>
        `Cannot move orders between shops. ${errors.join(', ')}${hasMore ? '...' : ''}`,
} as const;
