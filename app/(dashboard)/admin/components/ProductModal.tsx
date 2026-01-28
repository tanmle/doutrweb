'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatInputVND } from '../utils/formatters';
import type { FormData, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';

interface ProductModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    formData: FormData;
    profiles: Profile[];
    loading: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function ProductModal({
    isOpen,
    isEdit = false,
    formData,
    profiles,
    loading,
    onClose,
    onSubmit,
    onChange
}: ProductModalProps) {
    const isSelfResearched = formData.type === 'self_researched';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Product' : 'Add New Product'}
        >
            <form onSubmit={onSubmit} className={styles.modalFormCompact}>
                <Input
                    label="Product Name"
                    name="name"
                    value={formData.name || ''}
                    onChange={onChange}
                    required
                />
                <Input
                    label="Product SKU"
                    name="sku"
                    value={formData.sku || ''}
                    onChange={onChange}
                    placeholder="e.g. PROD-001"
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
                <div className={styles.checkboxContainer}>
                    <input
                        type="checkbox"
                        name="in_stock"
                        id="in_stock"
                        checked={formData.in_stock !== undefined ? formData.in_stock : true}
                        onChange={onChange}
                    />
                    <label htmlFor="in_stock">In Stock</label>
                </div>

                {(!formData.in_stock && formData.in_stock !== undefined) ? null : (
                    <Input
                        label="Stock Quantity"
                        name="stock_quantity"
                        type="number"
                        min="0"
                        value={formData.stock_quantity || '0'}
                        onChange={onChange}
                    />
                )}

                <div>
                    <label className={styles.formLabel}>
                        Product Type
                    </label>
                    <select
                        name="type"
                        value={formData.type || 'company'}
                        onChange={onChange}
                        className={styles.formSelect}
                    >
                        <option value="company">Company</option>
                        <option value="self_researched">Self-Research</option>
                    </select>
                </div>

                {isSelfResearched && (
                    <div>
                        <label className={styles.formLabel}>
                            Owner <span className={styles.requiredIndicator}>*</span>
                        </label>
                        <select
                            name="owner_id"
                            value={formData.owner_id || ''}
                            onChange={onChange}
                            className={styles.formSelect}
                            required
                        >
                            <option value="">Select Owner</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                            ))}
                        </select>
                    </div>
                )}

                <Button type="submit" disabled={loading}>
                    {loading ? (isEdit ? 'Updating…' : 'Saving...') : (isEdit ? 'Update Product' : 'Save Product')}
                </Button>
            </form>
        </Modal>
    );
}
