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
        <Card>
            <div className={tables.tableWrapper}>
                <table className={tables.table}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Shop</th>
                            <th>Owner</th>
                            <th>Product</th>
                            <th>QTY</th>
                            <th>Revenue</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan={7} className={`${layouts.textCenter} ${sales.emptyStateCell}`}>
                                    <span className={layouts.textMuted}>No records found.</span>
                                </td>
                            </tr>
                        ) : (
                            records.map((r) => (
                                <tr key={r.id}>
                                    <td data-label="Date">{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                                    <td data-label="Shop">{r.shop?.name}</td>
                                    <td data-label="Owner">
                                        {(() => {
                                            const shopData = r.shop;
                                            const profile = Array.isArray(shopData?.profiles) ? shopData.profiles[0] : shopData?.profiles;

                                            if (profile) {
                                                return (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span>{profile.full_name || profile.email || 'No Name'}</span>
                                                        {profile.role && <RoleBadge role={profile.role as UserRole} />}
                                                    </div>
                                                );
                                            }
                                            return shopData?.owner_id ? `ID: ${shopData.owner_id.substring(0, 8)}...` : 'N/A';
                                        })()}
                                    </td>
                                    <td data-label="Product">{r.product?.name}</td>
                                    <td data-label="QTY">{r.items_sold}</td>
                                    <td data-label="Revenue">{formatCurrency(r.revenue)}</td>
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
        </Card>
    );
}
