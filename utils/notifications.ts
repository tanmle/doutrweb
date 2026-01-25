// Notification utility functions
import { createClient } from '@/utils/supabase/client';

/**
 * Send achievement notification when user crosses a commission threshold
 * This function is designed to be easily updated by modifying the template in app_settings
 */
export async function sendAchievementNotification(
    userId: string,
    level: number,
    profit: number,
    threshold: number
) {
    const supabase = createClient();

    try {
        // Get achievement notification settings
        const { data: settingsData } = await supabase
            .from('app_settings')
            .select('key, value')
            .in('key', ['achievement_notification_enabled', 'achievement_notification_template']);

        const enabled = settingsData?.find(s => s.key === 'achievement_notification_enabled')?.value;
        const templateStr = settingsData?.find(s => s.key === 'achievement_notification_template')?.value;

        // Check if notifications are enabled
        if (enabled !== 'true') {
            return { success: false, message: 'Achievement notifications are disabled' };
        }

        // Parse template
        const template = templateStr ? JSON.parse(templateStr) : {
            title: '🎉 Achievement Unlocked!',
            message: 'Congratulations! You\'ve reached Level {level} with ${profit} profit this month!'
        };

        // Replace placeholders
        const title = template.title;
        const message = template.message
            .replace('{level}', level.toString())
            .replace('{profit}', profit.toFixed(2))
            .replace('{threshold}', threshold.toFixed(2));

        // Send notification using the database function
        const { data, error } = await supabase.rpc('send_notification', {
            p_sender_id: null, // System notification
            p_title: title,
            p_message: message,
            p_type: 'achievement',
            p_recipient_ids: [userId],
            p_metadata: {
                level,
                profit,
                threshold,
                timestamp: new Date().toISOString()
            }
        });

        if (error) throw error;

        return { success: true, notificationId: data };
    } catch (error) {
        console.error('Error sending achievement notification:', error);
        return { success: false, error };
    }
}

/**
 * Send manual notification (for Admin/Leader)
 */
export async function sendManualNotification(
    senderId: string,
    title: string,
    message: string,
    recipientIds: string[]
) {
    const supabase = createClient();

    try {
        const { data, error } = await supabase.rpc('send_notification', {
            p_sender_id: senderId,
            p_title: title,
            p_message: message,
            p_type: 'manual',
            p_recipient_ids: recipientIds,
            p_metadata: {
                timestamp: new Date().toISOString()
            }
        });

        if (error) throw error;

        return { success: true, notificationId: data };
    } catch (error) {
        console.error('Error sending manual notification:', error);
        return { success: false, error };
    }
}

/**
 * Check if user crossed a commission threshold
 * Returns the new level if threshold was crossed, null otherwise
 */
export function checkThresholdCrossed(
    previousProfit: number,
    currentProfit: number,
    thresholds: Array<{ level: number; profit_threshold: number }>
): { level: number; threshold: number } | null {
    // Find the highest threshold crossed by current profit
    let currentLevel = 0;
    let currentThreshold = 0;

    for (const t of thresholds) {
        if (currentProfit >= t.profit_threshold) {
            currentLevel = t.level;
            currentThreshold = t.profit_threshold;
        }
    }

    // Find the highest threshold crossed by previous profit
    let previousLevel = 0;

    for (const t of thresholds) {
        if (previousProfit >= t.profit_threshold) {
            previousLevel = t.level;
        }
    }

    // If current level is higher, threshold was crossed
    if (currentLevel > previousLevel) {
        return { level: currentLevel, threshold: currentThreshold };
    }

    return null;
}
