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
    onFileChange: (file: File) => void;
    imagePreview: string | null;
}

export function ProductModal({
    isOpen,
    isEdit = false,
    formData,
    profiles,
    loading,
    onClose,
    onSubmit,
    onChange,
    onFileChange,
    imagePreview
}: ProductModalProps) {
    const isSelfResearched = formData.type === 'self_researched';
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileTrigger = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileChange(e.target.files[0]);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Product' : 'Add New Product'}
        >
            <form onSubmit={onSubmit} className={styles.modalFormCompact}>
                {/* Image Upload Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div
                        onClick={handleFileTrigger}
                        style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '8px',
                            border: '2px dashed #ccc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: '#f9f9f9'
                        }}
                    >
                        {imagePreview ? (
                            <img
                                src={imagePreview}
                                alt="Product Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ color: '#999', fontSize: '0.8rem', textAlign: 'center' }}>+ Image</span>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <small style={{ marginTop: '0.5rem', color: '#666' }}>Click to upload product image</small>
                </div>

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
                    required
                />
                <Input
                    label="Variation"
                    name="variation"
                    value={formData.variation || ''}
                    onChange={onChange}
                    placeholder="e.g. Red, Size M"
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
