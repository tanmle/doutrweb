'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { formatInputVND } from '../utils/formatters';
import type { FormData, Profile, Product } from '../utils/types';
import styles from './AdminComponents.module.css';
import variationStyles from './Variations.module.css';

interface ProductModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    initialData?: Product | null;
    profiles: Profile[];
    loading: boolean;
    onClose: () => void;
    onSubmit: (data: FormData) => void;
}

export function ProductModal({
    isOpen,
    isEdit = false,
    initialData,
    profiles,
    loading,
    onClose,
    onSubmit,
}: ProductModalProps) {
    const [formData, setFormData] = useState<FormData>({});

    useEffect(() => {
        if (isOpen) {
            if (initialData && isEdit) {
                // Prepare initial data from product
                setFormData({
                    name: initialData.name,
                    sku: initialData.sku || '',
                    base_price: initialData.base_price.toString(),
                    selling_price: initialData.selling_price.toString(),
                    type: initialData.type || 'company',
                    owner_id: initialData.owner_id || '',
                    in_stock: initialData.in_stock,
                    stock_quantity: initialData.stock_quantity ? initialData.stock_quantity.toString() : '0',
                    hasVariations: (initialData.variations && initialData.variations.length > 0) || false,
                    variations: initialData.variations ? initialData.variations.map(v => ({
                        id: v.id,
                        variation_name: v.variation_name || '',
                        sku: v.sku || '',
                        stock_quantity: v.stock_quantity || 0
                    })) : [{ variation_name: '', sku: '', stock_quantity: 0 }]
                });
            } else {
                // Reset for new product
                setFormData({
                    type: 'company',
                    hasVariations: false,
                    variations: [{ variation_name: '', sku: '', stock_quantity: 0 }],
                    stock_quantity: '0'
                });
            }
        }
    }, [isOpen, initialData, isEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        if (['base_price', 'selling_price', 'stock_quantity'].includes(name)) {
            const numericValue = (finalValue as string).replace(/\D/g, '');
            setFormData(prev => ({ ...prev, [name]: numericValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: finalValue }));
        }
    };

    const handleVariationChange = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newVariations = [...(prev.variations || [])];
            newVariations[index] = { ...newVariations[index], [field]: value };
            return { ...prev, variations: newVariations };
        });
    };

    const handleAddVariation = () => {
        setFormData(prev => ({
            ...prev,
            variations: [...(prev.variations || []), { variation_name: '', sku: '', stock_quantity: 0 }]
        }));
    };

    const handleRemoveVariation = (index: number) => {
        setFormData(prev => ({
            ...prev,
            variations: (prev.variations || []).filter((_: any, i: number) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const isSelfResearched = formData.type === 'self_researched';
    const hasVariations = formData.hasVariations === true;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Product' : 'Add New Product'}
        >
            {loading ? (
                <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
                    <LoadingIndicator label={isEdit ? 'Updating product...' : 'Saving product...'} />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className={styles.modalFormCompact}>
                    {/* Product Name (Parent) */}
                    <Input
                        label="Product Name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleChange}
                        required
                    />

                    {/* Has Variations Toggle */}
                    <div className={styles.checkboxContainer} style={{ marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            name="hasVariations"
                            id="hasVariations"
                            checked={hasVariations}
                            onChange={handleChange}
                        />
                        <label htmlFor="hasVariations">Has Variations</label>
                    </div>

                    {!hasVariations ? (
                        <>
                            <Input
                                label="Product SKU"
                                name="sku"
                                value={formData.sku || ''}
                                onChange={handleChange}
                                placeholder="e.g. PROD-001"
                                required
                            />
                            <Input
                                label="Stock Quantity"
                                name="stock_quantity"
                                type="number"
                                min="0"
                                value={formData.stock_quantity || '0'}
                                onChange={handleChange}
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
                                            onChange={(e) => handleVariationChange(index, 'variation_name', e.target.value)}
                                            className={variationStyles.variationInput}
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="SKU Code"
                                            value={v.sku || ''}
                                            onChange={(e) => handleVariationChange(index, 'sku', e.target.value)}
                                            className={variationStyles.variationInput}
                                            required
                                        />
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={v.stock_quantity || 0}
                                            onChange={(e) => handleVariationChange(index, 'stock_quantity', e.target.value)}
                                            className={variationStyles.variationInput}
                                            style={{ textAlign: 'center' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveVariation(index)}
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
                                onClick={handleAddVariation}
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
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Selling Price (USD)"
                        name="selling_price"
                        value={formatInputVND(formData.selling_price || '')}
                        onChange={handleChange}
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
                            onChange={handleChange}
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
                                onChange={handleChange}
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
            )}
        </Modal >
    );
}
