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
                        <th>SKU</th>
                        <th>Base Price</th>
                        <th>Selling Price</th>
                        <th>Type</th>
                        <th>Owner</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td data-label="Name">{p.name}</td>
                            <td data-label="SKU">
                                <span className={styles.mutedText}>{p.sku || '-'}</span>
                            </td>
                            <td data-label="Base Price">{formatUSD(p.base_price)}</td>
                            <td data-label="Selling Price">{formatUSD(p.selling_price)}</td>
                            <td data-label="Type">
                                <span className={`${styles.productTypeBadge} ${p.type === 'company' ? styles.productTypeBadgeCompany : styles.productTypeBadgeSelf
                                    }`}>
                                    {p.type === 'self_researched' ? 'Self-Research' : 'Company'}
                                </span>
                            </td>
                            <td data-label="Owner">
                                {p.type === 'self_researched' && p.owner_profile ? (
                                    <span>{p.owner_profile.full_name || p.owner_profile.email}</span>
                                ) : (
                                    <span className={styles.mutedText}>-</span>
                                )}
                            </td>
                            <td data-label="Actions">
                                <div className={styles.tableActions}>
                                    <Button
                                        variant="ghost"
                                        onClick={() => onEdit(p)}
                                        className={styles.buttonExtraSmall}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => onDelete(p.id)}
                                        className={`${styles.buttonExtraSmall} ${styles.buttonDeleteColor}`}
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
