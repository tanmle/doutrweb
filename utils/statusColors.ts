/**
 * Status color utilities for consistent status badge styling
 */

export type StatusColorScheme = {
    background: string;
    color: string;
};

/**
 * Gets the color for a given status string.
 * Returns hex color code for use in styles.
 * 
 * @param status - Status string (case-insensitive)
 * @returns Hex color code
 */
export const getStatusColor = (status: string | null | undefined): string => {
    if (!status) return '#6b7280'; // gray-500

    const normalized = status.toLowerCase();

    // Success states
    if (normalized === 'paid' || normalized === 'completed' || normalized === 'approved') {
        return '#10b981'; // emerald-500
    }

    // Warning states
    if (normalized === 'pending') {
        return '#f59e0b'; // amber-500
    }

    // Error states
    if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'rejected') {
        return '#ef4444'; // red-500
    }

    // Default
    return '#6b7280'; // gray-500
};

/**
 * Gets a complete color scheme for status badges.
 * Includes background (with opacity) and text color.
 * 
 * @param status - Status string (case-insensitive)
 * @returns Object with background and color properties
 */
export const getStatusColorScheme = (status: string | null | undefined): StatusColorScheme => {
    const baseColor = getStatusColor(status);

    return {
        background: `${baseColor}20`, // 20% opacity
        color: baseColor,
    };
};

/**
 * Status badge style generator for inline styles.
 * 
 * @param status - Status string
 * @returns React CSSProperties object
 */
export const getStatusBadgeStyle = (status: string | null | undefined): React.CSSProperties => {
    const { background, color } = getStatusColorScheme(status);

    return {
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: background,
        color: color,
    };
};
