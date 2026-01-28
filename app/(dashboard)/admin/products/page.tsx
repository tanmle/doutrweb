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
        const { error } = await supabase.from('products').insert({
            name: formData.name,
            sku: formData.sku || null,
            base_price: parseFloat(formData.base_price) || 0,
            selling_price: parseFloat(formData.selling_price) || 0,
            type: formData.type || 'company',
            owner_id: formData.type === 'self_researched' ? (formData.owner_id || null) : null,
            in_stock: formData.in_stock !== undefined ? formData.in_stock : true,
            stock_quantity: (formData.in_stock !== false) ? (parseInt(formData.stock_quantity) || 0) : 0,
        });
        if (error) toast.error(error.message);
        else {
            setIsProductModalOpen(false);
            setFormData({});
            setRefresh(prev => prev + 1);
        }
        setLoading(false);
    };

    const handleUpdateProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        setLoading(true);
        const { error } = await supabase.from('products').update({
            name: formData.name,
            sku: formData.sku || null,
            base_price: parseFloat(formData.base_price) || 0,
            selling_price: parseFloat(formData.selling_price) || 0,
            type: formData.type,
            owner_id: formData.type === 'self_researched' ? (formData.owner_id || null) : null,
            in_stock: formData.in_stock,
            stock_quantity: (formData.in_stock !== false) ? (parseInt(formData.stock_quantity) || 0) : 0,
        }).eq('id', selectedProduct.id);

        if (error) toast.error(error.message);
        else {
            setIsEditProductModalOpen(false);
            setFormData({});
            setSelectedProduct(null);
            setRefresh(prev => prev + 1);
        }
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
                onClose={() => setIsProductModalOpen(false)}
                onSubmit={handleProductSubmit}
                onChange={handleInputChange}
            />

            <ProductModal
                isOpen={isEditProductModalOpen}
                isEdit
                formData={formData}
                profiles={profiles}
                loading={loading}
                onClose={() => setIsEditProductModalOpen(false)}
                onSubmit={handleUpdateProductSubmit}
                onChange={handleInputChange}
            />

            <AdminTableStyles />
        </>
    );
}
