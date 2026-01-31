'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatInputVND } from '../utils/formatters';
import type { FormData } from '../utils/types';
import styles from './AdminComponents.module.css';

interface IncomeModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    formData: FormData;
    loading: boolean;
    today: string;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function IncomeModal({
    isOpen,
    isEdit = false,
    formData,
    loading,
    today,
    onClose,
    onSubmit,
    onChange
}: IncomeModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Income Entry' : 'Add Income Entry'}
        >
            <form onSubmit={onSubmit} className={styles.modalFormCompact}>
                <Input
                    label="Source"
                    name="source"
                    value={formData.source || ''}
                    onChange={onChange}
                    required
                    placeholder="e.g., Investment Returns, Sales Revenue"
                />

                <Input
                    label="Amount (VND)"
                    name="amount"
                    value={formatInputVND(formData.amount || '')}
                    onChange={onChange}
                    required
                    placeholder="e.g., 5,000,000"
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
                        placeholder="Add any details about this income..."
                        rows={3}
                    />
                </div>

                <Button type="submit" disabled={loading}>
                    {loading ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update Income' : 'Add Income')}
                </Button>
            </form>
        </Modal>
    );
}
