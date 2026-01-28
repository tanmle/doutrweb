'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/formatters';
import { tables, layouts, sales } from '@/styles/modules';
import type { Order } from '../types';

interface OrdersTableProps {
    orders: Order[];
    loading: boolean;
}

export function OrdersTable({ orders, loading }: OrdersTableProps) {
    if (loading) {
        return (
            <Card>
                <div className={tables.tableWrapper}>
                    <div className={`${layouts.textCenter} ${sales.emptyStateCell}`}>
                        <span className={layouts.textMuted}>Loading orders...</span>
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
                        <th>Order Status</th>
                        <th>Order Substatus</th>
                        <th>SKU ID</th>
                        <th>Quantity</th>
                        <th>Order Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan={6} className={`${layouts.textCenter} ${sales.emptyStateCell}`}>
                                <span className={layouts.textMuted}>No orders found.</span>
                            </td>
                        </tr>
                    ) : (
                        orders.map((order) => (
                            <tr key={order.order_id}>
                                <td data-label="Order ID">{order.order_id}</td>
                                <td data-label="Order Status">
                                    <span className={sales.statusBadge}>{order.order_status}</span>
                                </td>
                                <td data-label="Order Substatus">{order.order_substatus}</td>
                                <td data-label="SKU ID">{order.sku_id}</td>
                                <td data-label="Quantity">{order.quantity}</td>
                                <td data-label="Order Amount">{formatCurrency(order.order_amount)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
