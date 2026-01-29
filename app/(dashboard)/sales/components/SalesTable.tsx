'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RoleBadge } from '@/components/ui/RoleBadge';
import type { UserRole } from '@/components/ui/RoleBadge';
import { formatCurrency } from '@/utils/formatters';
import { tables, layouts, sales } from '@/styles/modules';
import type { SalesRecordWithRelations } from '../types';

interface SalesTableProps {
    records: SalesRecordWithRelations[];
    loading: boolean;
    onEdit: (record: SalesRecordWithRelations) => void;
    onDelete: (id: string) => void;
}

export function SalesTable({ records, loading, onDelete }: Omit<SalesTableProps, 'onEdit'>) {
    if (loading) {
        return (
            <Card>
                <div className={tables.tableWrapper}>
                    <div className={`${layouts.textCenter} ${sales.emptyStateCell}`}>
                        <span className={layouts.textMuted}>Loading...</span>
                    </div>
                </div>
            </Card>
        );
    }

    const getStatusColor = (status: string | null) => {
        if (!status) return '#6b7280'; // gray-500
        const s = status.toLowerCase();
        if (s === 'paid' || s === 'completed' || s === 'approved') return '#10b981'; // emerald-500
        if (s === 'pending') return '#f59e0b'; // amber-500
        if (s === 'failed' || s === 'cancelled' || s === 'rejected') return '#ef4444'; // red-500
        return '#6b7280';
    };

    return (
        <div className={tables.tableWrapper}>
            <table className={tables.table}>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Shop</th>
                        <th>Owner</th>
                        <th>Order Status</th>
                        <th>Payout Status</th>
                        <th>Order Substatus</th>
                        <th>SKU ID</th>
                        <th>Quantity</th>
                        <th>Order Amount</th>
                        <th>Created Date</th>
                        <th>Order Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {records.length === 0 ? (
                        <tr>
                            <td colSpan={12} className={`${layouts.textCenter} ${sales.emptyStateCell}`}>
                                <span className={layouts.textMuted}>No records found.</span>
                            </td>
                        </tr>
                    ) : (
                        records.map((r) => (
                            <tr key={r.id}>
                                <td data-label="Order ID">{r.order_id || 'manual-' + r.id.substring(0, 6)}</td>
                                <td data-label="Shop">{r.shop?.name || '-'}</td>
                                <td data-label="Owner">
                                    {(() => {
                                        const shopData = r.shop;
                                        // Handle single object or array return from Supabase
                                        const profile = Array.isArray(shopData?.profiles) ? shopData.profiles[0] : shopData?.profiles;

                                        if (profile) {
                                            return profile.full_name || profile.email || 'No Name';
                                        }
                                        return 'N/A';
                                    })()}
                                </td>
                                <td data-label="Order Status">
                                    <span className={sales.statusBadge}>{r.order_status || '-'}</span>
                                </td>
                                <td data-label="Payout Status">
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            backgroundColor: `${getStatusColor(r.status)}20`, // 20% opacity background
                                            color: getStatusColor(r.status)
                                        }}
                                    >
                                        {r.status || 'pending'}
                                    </span>
                                </td>
                                <td data-label="Order Substatus">{r.order_substatus || '-'}</td>
                                <td data-label="SKU ID">{r.sku_id || r.product?.sku || '-'}</td>
                                <td data-label="Quantity">{r.items_sold}</td>
                                <td data-label="Order Amount">{formatCurrency(r.revenue)}</td>
                                <td data-label="Created Date">
                                    {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '-'}
                                </td>
                                <td data-label="Order Date">{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                                <td data-label="Action">
                                    <Button
                                        variant="secondary"
                                        onClick={() => onDelete(r.id)}
                                        className="px-2 py-1 text-xs"
                                        style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }}
                                    >
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
