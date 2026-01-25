'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSupabase } from '@/contexts/SupabaseContext';
import { sendManualNotification } from '@/utils/notifications';
import { useToast } from '@/components/ui/ToastProvider';
import type { User } from '@/app/(dashboard)/admin/utils/types';
import styles from './SendNotificationModal.module.css';

type SendNotificationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    senderId: string;
    senderRole: string; // 'admin' | 'leader'
    users: User[]; // List of potential recipients
};

export function SendNotificationModal({
    isOpen,
    onClose,
    senderId,
    senderRole,
    users,
}: SendNotificationModalProps) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetGroup, setTargetGroup] = useState<'all' | 'team' | 'specific'>('all');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const toast = useToast();

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setMessage('');
            setTargetGroup(senderRole === 'admin' ? 'all' : 'team');
            setSelectedUsers([]);
        }
    }, [isOpen, senderRole]);

    // Filter eligible recipients based on role
    const eligibleRecipients = users.filter(user => {
        if (senderRole === 'admin') return true;
        if (senderRole === 'leader') return user.leader_id === senderId;
        return false;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            toast.error('Please enter a title and message');
            return;
        }

        setSending(true);

        try {
            let recipientIds: string[] = [];

            if (targetGroup === 'all' && senderRole === 'admin') {
                recipientIds = eligibleRecipients.map(u => u.id);
            } else if (targetGroup === 'team' && senderRole === 'leader') {
                recipientIds = eligibleRecipients.map(u => u.id);
            } else {
                // Specific users
                recipientIds = selectedUsers;
            }

            if (recipientIds.length === 0) {
                toast.error('No recipients selected');
                setSending(false);
                return;
            }

            const result = await sendManualNotification(senderId, title, message, recipientIds);

            if (result.success) {
                toast.success(`Notification sent to ${recipientIds.length} users`);
                onClose();
            } else {
                throw new Error('Failed to send');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Send Notification">
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>To</label>
                    <div className={styles.recipientOptions}>
                        {senderRole === 'admin' && (
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="target"
                                    checked={targetGroup === 'all'}
                                    onChange={() => setTargetGroup('all')}
                                />
                                All Users ({eligibleRecipients.length})
                            </label>
                        )}

                        {senderRole === 'leader' && (
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="target"
                                    checked={targetGroup === 'team'}
                                    onChange={() => setTargetGroup('team')}
                                />
                                My Team ({eligibleRecipients.length})
                            </label>
                        )}

                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="target"
                                checked={targetGroup === 'specific'}
                                onChange={() => setTargetGroup('specific')}
                            />
                            Specific Users
                        </label>
                    </div>
                </div>

                {targetGroup === 'specific' && (
                    <div className={styles.userSelect}>
                        <p className={styles.helperText}>Select recipients from the list:</p>
                        <div className={styles.userList}>
                            {eligibleRecipients.map(user => (
                                <label key={user.id} className={styles.userCheckbox}>
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedUsers([...selectedUsers, user.id]);
                                            } else {
                                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                            }
                                        }}
                                    />
                                    <span>{user.full_name || user.email}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <Input
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Important Update"
                    required
                />

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Message</label>
                    <textarea
                        className={styles.textarea}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here..."
                        required
                        rows={4}
                    />
                </div>

                <div className={styles.footer}>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={sending}>
                        {sending ? 'Sending...' : 'Send Notification'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
