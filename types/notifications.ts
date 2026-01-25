// Notification Types
export type NotificationType = 'manual' | 'achievement' | 'system';

export type Notification = {
    id: string;
    created_at: string;
    title: string;
    message: string;
    type: NotificationType;
    sender_id: string | null;
    metadata: Record<string, any>;
    expires_at: string;
};

export type NotificationRecipient = {
    id: string;
    notification_id: string;
    recipient_id: string;
    read_at: string | null;
    created_at: string;
    notification?: Notification;
};

export type NotificationWithStatus = Notification & {
    read_at: string | null;
    recipient_id: string;
};
