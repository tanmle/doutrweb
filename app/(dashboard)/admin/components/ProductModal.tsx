'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatInputVND } from '../utils/formatters';
import type { FormData } from '../utils/types';
import styles from './AdminComponents.module.css';

interface ProductModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    formData: FormData;
    loading: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function ProductModal({
    isOpen,
    isEdit = false,
    formData,
    loading,
    onClose,
    onSubmit,
    onChange
}: ProductModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Product' : 'Add New Product'}
        >
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                    label="Product Name"
                    name="name"
                    value={formData.name || ''}
                    onChange={onChange}
                    required
                />
                <Input
                    label="Base Price (USD)"
                    name="base_price"
                    value={formatInputVND(formData.base_price || '')}
                    onChange={onChange}
                    required
                />
                <Input
                    label="Selling Price (USD)"
                    name="selling_price"
                    value={formatInputVND(formData.selling_price || '')}
                    onChange={onChange}
                    required
                />
                <Button type="submit" disabled={loading}>
                    {loading ? (isEdit ? 'Updating…' : 'Saving...') : (isEdit ? 'Update Product' : 'Save Product')}
                </Button>
            </form>
        </Modal>
    );
}
