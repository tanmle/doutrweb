'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { formatUSD } from '../utils/formatters';
import type { Product } from '../utils/types';
import styles from './AdminComponents.module.css';

interface ProductsTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
}

export function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps) {
    return (
        <div className={styles.tableContainer}>
            <table className={styles.adminTable}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Base Price</th>
                        <th>Selling Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td data-label="Name">{p.name}</td>
                            <td data-label="Base Price">{formatUSD(p.base_price)}</td>
                            <td data-label="Selling Price">{formatUSD(p.selling_price)}</td>
                            <td data-label="Actions">
                                <div className={styles.tableActions}>
                                    <Button
                                        variant="ghost"
                                        onClick={() => onEdit(p)}
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => onDelete(p.id)}
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
