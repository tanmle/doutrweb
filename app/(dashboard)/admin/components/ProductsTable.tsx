'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { formatUSD } from '../utils/formatters';
import type { Product } from '../utils/types';
import styles from './AdminComponents.module.css';
import { tables } from '@/styles/modules';

interface ProductsTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
}

export function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps) {
    return (
        <div className={tables.tableWrapper}>
            <table className={tables.table}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Variation</th>
                        <th>SKU</th>
                        <th>Base Price</th>
                        <th>Selling Price</th>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Owner</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.length === 0 ? (
                        <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                No product records found.
                            </td>
                        </tr>
                    ) : (
                        products.map(p => (
                            <tr key={p.id}>
                                <td data-label="Name">{p.name}</td>
                                <td data-label="Variation">
                                    {p.variations && p.variations.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {p.variations.slice(0, 3).map((v: any) => (
                                                <span
                                                    key={v.id}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                        color: 'var(--foreground)',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '4px',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        whiteSpace: 'nowrap',
                                                        width: 'fit-content'
                                                    }}
                                                >
                                                    {v.variation_name}
                                                </span>
                                            ))}
                                            {p.variations.length > 3 && (
                                                <span
                                                    title={p.variations.slice(3).map((v: any) => v.variation_name).join(', ')}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--muted-foreground)',
                                                        cursor: 'help',
                                                        paddingLeft: '0.2rem'
                                                    }}
                                                >
                                                    +{p.variations.length - 3} more...
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={styles.mutedText}>-</span>
                                    )}
                                </td>
                                <td data-label="SKU">
                                    {p.variations && p.variations.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {p.variations.slice(0, 3).map((v: any) => (
                                                <span
                                                    key={v.id}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--muted-foreground)',
                                                        padding: '0.15rem 0',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {v.sku}
                                                </span>
                                            ))}
                                            {p.variations.length > 3 && (
                                                <span
                                                    title={p.variations.slice(3).map((v: any) => v.sku).join(', ')}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--muted-foreground)',
                                                        cursor: 'help',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    ...
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={styles.mutedText}>{p.sku || '-'}</span>
                                    )}
                                </td>
                                <td data-label="Base Price">{formatUSD(p.base_price)}</td>
                                <td data-label="Selling Price">{formatUSD(p.selling_price)}</td>
                                <td data-label="Status">
                                    {(() => {
                                        const totalStock = p.variations && p.variations.length > 0
                                            ? p.variations.reduce((acc: number, v: any) => acc + (v.stock_quantity || 0), 0)
                                            : (p.stock_quantity || 0);
                                        const isInStock = totalStock > 0;

                                        return (
                                            <span className={`${styles.inStockBadge} ${isInStock ? styles.inStockTrue : styles.inStockFalse}`}>
                                                {isInStock ? `In Stock (${totalStock})` : 'Out of Stock'}
                                            </span>
                                        );
                                    })()}
                                </td>
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
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
