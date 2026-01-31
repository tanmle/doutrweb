'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatInputVND } from '../utils/formatters';
import type { FormData, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';

interface SellingFeeModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    formData: FormData;
    profiles: Profile[];
    loading: boolean;
    today: string;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function SellingFeeModal({
    isOpen,
    isEdit = false,
    formData,
    profiles,
    loading,
    today,
    onClose,
    onSubmit,
    onChange
}: SellingFeeModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Selling Fee' : 'Add New Selling Fee'}
        >
            <form onSubmit={onSubmit} className={styles.modalFormCompact}>
                <Input
                    label="Fee Name"
                    name="name"
                    value={formData.name || ''}
                    onChange={onChange}
                    required
                />
                <Input
                    label="Price (VND)"
                    name="price"
                    value={formatInputVND(formData.price || '')}
                    onChange={onChange}
                    required
                />

                <div>
                    <label className={styles.formLabel}>
                        Owner
                    </label>
                    <select
                        name="owner_id"
                        value={formData.owner_id || ''}
                        onChange={onChange}
                        className={styles.formSelect}
                    >
                        <option value="">Select User</option>
                        {profiles.filter(p => p.role === 'admin').map(p => (
                            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                        ))}
                    </select>
                </div>

                <Input
                    label="Date"
                    name="date"
                    type="date"
                    value={formData.date || today}
                    onChange={onChange}
                    required
                    placeholder="Select date"
                />

                <Input
                    label="Note"
                    name="note"
                    value={formData.note || ''}
                    onChange={onChange}
                    placeholder="Add any details about this fee..."
                />

                <Button type="submit" disabled={loading}>
                    {loading ? (isEdit ? 'Updating…' : 'Saving...') : (isEdit ? 'Update Fee' : 'Save Fee')}
                </Button>
            </form>
        </Modal>
    );
}
