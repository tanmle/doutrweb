'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { useProducts } from '../hooks/useProducts';
import {
    ProductsTab,
    ProductModal,
    AdminTableStyles,
} from '../components';
import type { Product, FormData } from '../utils/types';
import { useRealtime } from '@/hooks/useRealtime';
import styles from '../components/AdminComponents.module.css';

export default function AdminProductsPage() {
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);

    // Modal states
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Variation states
    const [variations, setVariations] = useState<any[]>([{ variation_name: '', sku: '', stock_quantity: 0 }]);

    const supabase = createClient();
    const toast = useToast();

    const {
        loading: dataLoading,
        products,
        profiles,
    } = useProducts(refresh);

    useRealtime({
        table: 'products',
        onData: () => setRefresh(prev => prev + 1)
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        if (['base_price', 'selling_price', 'stock_quantity'].includes(name)) {
            const numericValue = (finalValue as string).replace(/\D/g, '');
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: finalValue });
        }
    };

    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // 1. Insert Parent
        const { data: parentProduct, error: parentError } = await supabase.from('products').insert({
            name: formData.name,
            sku: formData.hasVariations ? null : formData.sku,
            base_price: parseFloat(formData.base_price) || 0,
            selling_price: parseFloat(formData.selling_price) || 0,
            type: formData.type || 'company',
            owner_id: formData.type === 'self_researched' ? (formData.owner_id || null) : null,
            in_stock: formData.in_stock !== undefined ? formData.in_stock : true,
            stock_quantity: (!formData.hasVariations && formData.in_stock !== false) ? (parseInt(formData.stock_quantity) || 0) : 0,
        }).select().single();

        if (parentError || !parentProduct) {
            toast.error(parentError?.message || 'Error creating product');
            setLoading(false);
            return;
        }

        // 2. Insert Variations if any
        if (formData.hasVariations && variations.length > 0) {
            const variationsToInsert = variations.map(v => ({
                name: parentProduct.name, // Inherit name? Or just use variation name in UI
                variation_name: v.variation_name,
                sku: v.sku,
                base_price: parentProduct.base_price, // Inherit price for now, or add per-variation price later
                selling_price: parentProduct.selling_price,
                type: parentProduct.type,
                owner_id: parentProduct.owner_id,
                in_stock: true,
                stock_quantity: parseInt(v.stock_quantity) || 0,
                parent_id: parentProduct.id
            }));

            const { error: varError } = await supabase.from('products').insert(variationsToInsert);
            if (varError) {
                toast.error('Product created but variations failed: ' + varError.message);
            }
        }

        setIsProductModalOpen(false);
        setFormData({});
        setVariations([{ variation_name: '', sku: '', stock_quantity: 0 }]);
        setRefresh(prev => prev + 1);
        setLoading(false);
    };

    // Helper for variation changes
    const handleVariationChange = (index: number, field: string, value: string) => {
        const newVariations = [...variations];
        newVariations[index] = { ...newVariations[index], [field]: value };
        setVariations(newVariations);
        setFormData({ ...formData, variations: newVariations });
    };

    const addVariation = () => {
        const newVars = [...variations, { variation_name: '', sku: '', stock_quantity: 0 }];
        setVariations(newVars);
        setFormData({ ...formData, variations: newVars });
    };

    const removeVariation = (index: number) => {
        const newVars = variations.filter((_, i) => i !== index);
        setVariations(newVars);
        setFormData({ ...formData, variations: newVars });
    };

    const handleUpdateProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        setLoading(true);

        // 1. Update Parent
        const { error: parentError } = await supabase.from('products').update({
            name: formData.name,
            sku: formData.hasVariations ? null : formData.sku,
            base_price: parseFloat(formData.base_price) || 0,
            selling_price: parseFloat(formData.selling_price) || 0,
            type: formData.type,
            owner_id: formData.type === 'self_researched' ? (formData.owner_id || null) : null,
            in_stock: formData.in_stock,
            stock_quantity: (!formData.hasVariations && formData.in_stock !== false) ? (parseInt(formData.stock_quantity) || 0) : 0,
        }).eq('id', selectedProduct.id);

        if (parentError) {
            toast.error(parentError.message);
            setLoading(false);
            return;
        }

        // 2. Handle Variations
        if (formData.hasVariations) {
            // A. Identify variations to delete
            // Original variations IDs
            const originalIds = selectedProduct.variations?.map(v => v.id) || [];
            // Current form variations IDs (filtering out new ones which don't have ID yet)
            const currentIds = variations.filter(v => v.id).map(v => v.id);
            // Delete IDs present in original but not in current
            const idsToDelete = originalIds.filter(id => !currentIds.includes(id));

            if (idsToDelete.length > 0) {
                await supabase.from('products').delete().in('id', idsToDelete);
            }

            // B. Upsert variations (Update existing, Insert new)
            // We can do this by mapping variations to upsert objects.
            // Note: For 'upsert', we need to check if we can pass ID. 
            // If we pass ID, it updates. If no ID, we must perform insert.
            // Supabase upsert works if we provide primary key.

            for (const v of variations) {
                const payload = {
                    name: formData.name, // Ensure child name matches parent
                    variation_name: v.variation_name,
                    sku: v.sku,
                    base_price: parseFloat(formData.base_price) || 0,
                    selling_price: parseFloat(formData.selling_price) || 0,
                    type: formData.type,
                    owner_id: formData.type === 'self_researched' ? (formData.owner_id || null) : null,
                    in_stock: true,
                    stock_quantity: parseInt(v.stock_quantity) || 0,
                    parent_id: selectedProduct.id
                };

                if (v.id) {
                    // Update existing
                    await supabase.from('products').update(payload).eq('id', v.id);
                } else {
                    // Insert new
                    await supabase.from('products').insert(payload);
                }
            }

        } else {
            // If switched to "No Variations", delete all children if any existed
            if (selectedProduct.variations && selectedProduct.variations.length > 0) {
                const idsToDelete = selectedProduct.variations.map(v => v.id);
                await supabase.from('products').delete().in('id', idsToDelete);
            }
        }

        setIsEditProductModalOpen(false);
        setFormData({});
        setVariations([]);
        setSelectedProduct(null);
        setRefresh(prev => prev + 1);
        setLoading(false);
    };

    const openEditProductModal = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku || '',
            base_price: product.base_price.toString(),
            selling_price: product.selling_price.toString(),
            type: product.type || 'company',
            owner_id: product.owner_id || '',
            in_stock: product.in_stock,
            stock_quantity: product.stock_quantity ? product.stock_quantity.toString() : '0',
        });
        // Logic to fetch child variations if any could go here, for now edit is just basic parent/self edit
        setVariations([]); // Reset or load if implementing full edit
        // If has variations, load them? This requires extra fetch. For MVP step 1 we focus on Create.
        // If editing a child directly? The table lists flattened or grouped?
        // User said "in grid, still show one product but Variation shows list of Variation name"
        // This implies we are editing the Parent.
        // fetch children?
        if (product.variations && product.variations.length > 0) {
            setFormData(prev => ({ ...prev, hasVariations: true, variations: product.variations }));
            setVariations(product.variations as any[]);
        } else {
            setFormData(prev => ({ ...prev, hasVariations: false }));
        }
        setIsEditProductModalOpen(true);
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        setLoading(true);
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) toast.error(error.message);
        else setRefresh(prev => prev + 1);
        setLoading(false);
    };

    const handleCloseModal = () => {
        setIsProductModalOpen(false);
        setIsEditProductModalOpen(false);
        setFormData({});
        setVariations([{ variation_name: '', sku: '', stock_quantity: 0 }]);
        setSelectedProduct(null);
    };

    if (dataLoading) {
        return <LoadingIndicator label="Loading products..." />;
    }

    return (
        <>
            <ProductsTab
                products={products}
                onAddProduct={() => setIsProductModalOpen(true)}
                onEditProduct={openEditProductModal}
                onDeleteProduct={handleDeleteProduct}
            />

            <ProductModal
                isOpen={isProductModalOpen}
                formData={formData}
                profiles={profiles}
                loading={loading}
                onClose={handleCloseModal}
                onSubmit={handleProductSubmit}
                onChange={handleInputChange}
                onVariationChange={handleVariationChange}
                onAddVariation={addVariation}
                onRemoveVariation={removeVariation}
            />

            <ProductModal
                isOpen={isEditProductModalOpen}
                isEdit
                formData={formData}
                profiles={profiles}
                loading={loading}
                onClose={handleCloseModal}
                onSubmit={handleUpdateProductSubmit}
                onChange={handleInputChange}
                onVariationChange={handleVariationChange}
                onAddVariation={addVariation}
                onRemoveVariation={removeVariation}
            />

            <AdminTableStyles />
        </>
    );
}
