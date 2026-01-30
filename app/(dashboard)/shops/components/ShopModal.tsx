'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { forms } from '@/styles/modules';

interface Profile {
    id: string;
    full_name?: string;
    email: string;
}

interface FormData {
    [key: string]: any;
}

interface ShopModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    formData: FormData;
    profiles: Profile[];
    userRole: string;
    loading: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export function ShopModal({
    isOpen,
    isEdit = false,
    formData,
    profiles,
    userRole,
    loading,
    onClose,
    onSubmit,
    onChange
}: ShopModalProps) {
    const showOwnerSelect = ['admin', 'leader'].includes(userRole);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Shop' : 'New Shop'}
        >
            <form onSubmit={onSubmit} className={forms.form}>
                <Input
                    label="Shop Name"
                    name="name"
                    value={formData.name || ''}
                    onChange={onChange}
                    required
                />

                <div className={forms.formGrid}>
                    <div className={forms.formField}>
                        <label className={forms.formLabel}>Platform</label>
                        <select
                            name="platform"
                            className={forms.formSelect}
                            value={formData.platform || 'tiktok'}
                            onChange={onChange}
                        >
                            <option value="tiktok">TikTok Shop</option>
                            <option value="amazon">Amazon</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className={forms.formField}>
                        <label className={forms.formLabel}>Status</label>
                        <select
                            name="status"
                            className={forms.formSelect}
                            value={formData.status || 'active'}
                            onChange={onChange}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {showOwnerSelect && (
                    <div className={forms.formField}>
                        <label className={forms.formLabel}>Assign to Owner</label>
                        <select
                            name="owner_id"
                            className={forms.formSelect}
                            value={formData.owner_id || ''}
                            onChange={onChange}
                            required
                        >
                            {profiles.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.full_name || p.email} ({p.email})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className={forms.formField}>
                    <label className={forms.formLabel}>Note (Optional)</label>
                    <textarea
                        name="note"
                        className={forms.formTextarea}
                        placeholder="Add any notes about this shop..."
                        value={formData.note || ''}
                        onChange={onChange}
                        rows={3}
                    />
                </div>

                <div className={forms.formActionsFull}>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? (isEdit ? 'Updating…' : 'Creating…') : (isEdit ? 'Update Shop' : 'Create Shop')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
