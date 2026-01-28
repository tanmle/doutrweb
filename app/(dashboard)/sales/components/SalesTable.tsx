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

export function SalesTable({ records, loading, onEdit, onDelete }: SalesTableProps) {
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

    return (
        <div className={tables.tableWrapper}>
            <table className={tables.table}>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Shop</th>
                        <th>Owner</th>
                        <th>Order Status</th>
                        <th>Order Substatus</th>
                        <th>SKU ID</th>
                        <th>Quantity</th>
                        <th>Order Amount</th>
                        <th>Created Date</th>
                        <th>Order Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {records.length === 0 ? (
                        <tr>
                            <td colSpan={11} className={`${layouts.textCenter} ${sales.emptyStateCell}`}>
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
                                    <span className={sales.statusBadge}>{r.order_status || r.status || '-'}</span>
                                </td>
                                <td data-label="Order Substatus">{r.order_substatus || '-'}</td>
                                <td data-label="SKU ID">{r.sku_id || r.product?.sku || '-'}</td>
                                <td data-label="Quantity">{r.items_sold}</td>
                                <td data-label="Order Amount">{formatCurrency(r.revenue)}</td>
                                <td data-label="Created Date">
                                    {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '-'}
                                </td>
                                <td data-label="Order Date">{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                                <td data-label="Actions">
                                    <div className={tables.tableActionsSmall}>
                                        <Button variant="ghost" onClick={() => onEdit(r)} className={sales.actionButtonSmall}>
                                            Edit
                                        </Button>
                                        <Button variant="ghost" onClick={() => onDelete(r.id)} className={sales.deleteButtonSmall}>
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
