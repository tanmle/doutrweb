'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatInputVND } from '../utils/formatters';
import type { FormData } from '../utils/types';
import styles from './AdminComponents.module.css';

interface CapitalModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    formData: FormData;
    loading: boolean;
    today: string;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function CapitalModal({
    isOpen,
    isEdit = false,
    formData,
    loading,
    today,
    onClose,
    onSubmit,
    onChange
}: CapitalModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Capital Entry' : 'Add Capital Entry'}
        >
            <form onSubmit={onSubmit} className={styles.modalFormCompact}>
                <Input
                    label="Amount (VND)"
                    name="amount"
                    value={formatInputVND(formData.amount || '')}
                    onChange={onChange}
                    required
                    placeholder="e.g., 10,000,000"
                />

                <Input
                    label="Date"
                    name="date"
                    type="date"
                    value={formData.date || today}
                    onChange={onChange}
                    required
                />

                <div>
                    <label className={styles.formLabel}>
                        Note (Optional)
                    </label>
                    <textarea
                        name="note"
                        value={formData.note || ''}
                        onChange={onChange}
                        className={styles.formTextarea}
                        placeholder="Add any details about this capital entry..."
                        rows={3}
                    />
                </div>

                <Button type="submit" disabled={loading}>
                    {loading ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update Capital' : 'Add Capital')}
                </Button>
            </form>
        </Modal>
    );
}
