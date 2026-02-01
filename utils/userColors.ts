/**
 * Generates a consistent color for a user based on their ID string.
 * This ensures the same user always gets the same color across the application.
 * 
 * @param userId - The user's unique ID string
 * @returns A hex color code from a predefined palette
 */
export const getUserColor = (userId: string): string => {
    if (!userId) return 'inherit';

    const colors = [
        '#f472b6', // pink-400
        '#22d3ee', // cyan-400
        '#818cf8', // indigo-400
        '#a78bfa', // violet-400
        '#34d399', // emerald-400
        '#fbbf24', // amber-400
        '#f87171', // red-400
        '#60a5fa', // blue-400
        '#c084fc', // purple-400
        '#db2777', // pink-600
        '#ea580c', // orange-600
        '#65a30d', // lime-600
        '#0891b2', // cyan-600
        '#7c3aed', // violet-600
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};
