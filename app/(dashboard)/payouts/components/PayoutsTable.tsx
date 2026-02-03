'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button'; // If needed for actions later, or just clean table
import { formatCurrency } from '@/utils/formatters';
import { tables, layouts, sales } from '@/styles/modules';
import { getUserColor } from '@/utils/userColors';
import { getStatusBadgeStyle } from '@/utils/statusColors';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { TRUNCATE_ID_LENGTH, TRUNCATE_ID_DISPLAY_LENGTH } from '@/constants/sales'; // Reuse constants

interface PayoutRecord {
    id: string;
    statement_date: string;
    created_at: string;
    status: string;
    order_id: string;
    sku_id: string;
    quantity: number;
    settlement_amount: number;
    shop_id: string;
    order_created_date?: string | null;
    shop?: {
        name: string;
        owner?: {
            id: string;
            full_name: string | null;
            email: string;
        }
    }
}

interface PayoutsTableProps {
    records: PayoutRecord[];
    loading: boolean;
}

/**
 * Renders a truncated ID with copy button (Reused from SalesTable logic)
 */
const IdCell = React.memo(({ id, onCopy }: { id: string | null | undefined; onCopy: (id: string) => void }) => {
    if (!id) return <>-</>;

    const displayId = id.length > TRUNCATE_ID_LENGTH
        ? id.substring(0, TRUNCATE_ID_DISPLAY_LENGTH) + '...'
        : id;

    return (
        <div className={sales.idCell} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span title={id}>{displayId}</span>
            <button
                onClick={() => onCopy(id)}
                className={sales.copyButton}
                title="Copy to clipboard"
                aria-label={`Copy ${id} to clipboard`}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: 1,
                    color: 'white',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        </div>
    );
});
IdCell.displayName = 'IdCell';

export function PayoutsTable({ records, loading }: PayoutsTableProps) {
    const { copyToClipboard } = useCopyToClipboard();

    const handleCopy = React.useCallback((text: string) => {
        copyToClipboard(text);
    }, [copyToClipboard]);
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
                        <th>Owner</th>
                        <th>Shop</th>
                        <th>Statement Date</th>
                        <th>Created Date</th>
                        <th>Order Date</th>
                        <th>Status</th>
                        <th>Order/Adj ID</th>
                        <th>SKU ID</th>
                        <th>Quantity</th>
                        <th>Settlement Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {records.length === 0 ? (
                        <tr>
                            <td colSpan={10} className={`${layouts.textCenter} ${sales.emptyStateCell}`}>
                                <span className={layouts.textMuted}>No payout records found.</span>
                            </td>
                        </tr>
                    ) : (
                        records.map((r) => (
                            <tr key={r.id || Math.random()}>
                                <td data-label="Owner">
                                    <span
                                        style={{
                                            color: getUserColor(r.shop?.owner?.['id'] || ''), // Assuming owner object might not have ID directly exposed in type yet, checking usage
                                            fontWeight: 600
                                        }}
                                    >
                                        {r.shop?.owner?.full_name || r.shop?.owner?.email || '-'}
                                    </span>
                                </td>
                                <td data-label="Shop">
                                    {r.shop?.name || '-'}
                                </td>
                                <td data-label="Statement Date">{r.statement_date}</td>
                                <td data-label="Created Date">
                                    {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '-'}
                                </td>
                                <td data-label="Order Date">
                                    {r.order_created_date ? new Date(r.order_created_date).toLocaleDateString('vi-VN') : '-'}
                                </td>
                                <td data-label="Status">
                                    <span style={getStatusBadgeStyle(r.status)}>
                                        {r.status === 'pending' ? 'Pending' : r.status}
                                    </span>
                                </td>
                                <td data-label="Order/Adj ID">
                                    <IdCell id={r.order_id} onCopy={handleCopy} />
                                </td>
                                <td data-label="SKU ID">
                                    <IdCell id={r.sku_id} onCopy={handleCopy} />
                                </td>
                                <td data-label="Quantity">{r.quantity}</td>
                                <td data-label="Settlement Amount" style={{ color: r.settlement_amount > 0 ? '#10b981' : (r.settlement_amount < 0 ? '#f87171' : 'inherit') }}>
                                    {formatCurrency(r.settlement_amount)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
