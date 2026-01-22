'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { ProductsTable } from './ProductsTable';
import type { Product } from '../utils/types';
import styles from './AdminComponents.module.css';

interface ProductsTabProps {
    products: Product[];
    onAddProduct: () => void;
    onEditProduct: (product: Product) => void;
    onDeleteProduct: (id: string) => void;
}

export function ProductsTab({
    products,
    onAddProduct,
    onEditProduct,
    onDeleteProduct
}: ProductsTabProps) {
    return (
        <div>
            <div className={styles.tabHeader}>
                <h3 className={styles.tabTitle}>Product List</h3>
                <Button onClick={onAddProduct}>+ Add New Product</Button>
            </div>
            <ProductsTable
                products={products}
                onEdit={onEditProduct}
                onDelete={onDeleteProduct}
            />
        </div>
    );
}
