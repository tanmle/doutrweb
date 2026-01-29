'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatInputVND } from '../utils/formatters';
import type { FormData, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';
import variationStyles from './Variations.module.css';

interface ProductModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    formData: FormData;
    profiles: Profile[];
    loading: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    // For variations
    onVariationChange?: (index: number, field: string, value: string) => void;
    onAddVariation?: () => void;
    onRemoveVariation?: (index: number) => void;
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
    onVariationChange,
    onAddVariation,
    onRemoveVariation
}: ProductModalProps) {
    const isSelfResearched = formData.type === 'self_researched';
    const hasVariations = formData.hasVariations === true;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Product' : 'Add New Product'}
        >
            <form onSubmit={onSubmit} className={styles.modalFormCompact}>
                {/* Product Name (Parent) */}
                <Input
                    label="Product Name"
                    name="name"
                    value={formData.name || ''}
                    onChange={onChange}
                    required
                />

                {/* Has Variations Toggle */}
                <div className={styles.checkboxContainer} style={{ marginBottom: '1rem' }}>
                    <input
                        type="checkbox"
                        name="hasVariations"
                        id="hasVariations"
                        checked={hasVariations}
                        onChange={onChange}
                    />
                    <label htmlFor="hasVariations">Has Variations</label>
                </div>

                {!hasVariations ? (
                    <>
                        <Input
                            label="Product SKU"
                            name="sku"
                            value={formData.sku || ''}
                            onChange={onChange}
                            placeholder="e.g. PROD-001"
                            required
                        />
                        <Input
                            label="Stock Quantity"
                            name="stock_quantity"
                            type="number"
                            min="0"
                            value={formData.stock_quantity || '0'}
                            onChange={onChange}
                        />
                    </>
                ) : (

                    <div className={variationStyles.variationsContainer}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className={styles.formLabel} style={{ marginBottom: 0 }}>Variations</label>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                {formData.variations?.length || 0} items
                            </span>
                        </div>

                        <div className={variationStyles.variationHeader}>
                            <span className={variationStyles.variationHeaderLabel}>Name</span>
                            <span className={variationStyles.variationHeaderLabel}>SKU</span>
                            <span className={variationStyles.variationHeaderLabel}>Qty</span>
                            <span></span>
                        </div>

                        <div className={variationStyles.variationList}>
                            {formData.variations && formData.variations.map((v: any, index: number) => (
                                <div key={index} className={variationStyles.variationRow}>
                                    <input
                                        type="text"
                                        placeholder="Color, Size..."
                                        value={v.variation_name || ''}
                                        onChange={(e) => onVariationChange?.(index, 'variation_name', e.target.value)}
                                        className={variationStyles.variationInput}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="SKU Code"
                                        value={v.sku || ''}
                                        onChange={(e) => onVariationChange?.(index, 'sku', e.target.value)}
                                        className={variationStyles.variationInput}
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={v.stock_quantity || 0}
                                        onChange={(e) => onVariationChange?.(index, 'stock_quantity', e.target.value)}
                                        className={variationStyles.variationInput}
                                        style={{ textAlign: 'center' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onRemoveVariation?.(index)}
                                        className={variationStyles.removeVariationBtn}
                                        title="Remove Variation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onAddVariation}
                            className={variationStyles.addVariationBtn}
                        >
                            + Add Variation
                        </Button>
                    </div>
                )}
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
                {/* Remove stock quantity from here as it's moved above */}

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
        </Modal >
    );
}
