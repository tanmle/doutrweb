'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SellingFeeFilters } from './SellingFeeFilters';
import { SellingFeesTable } from './SellingFeesTable';
import type { SellingFee, FeeFilter, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';
import { cards } from '@/styles/modules';
import { formatVND } from '../utils/formatters';

interface SellingFeesTabProps {
    fees: SellingFee[];
    profiles: Profile[];
    feeFilter: FeeFilter;
    ownerFilter: string;
    dateRange: { start: string; end: string };
    totalFeePrice: number;
    onAddFee: () => void;
    onEditFee: (fee: SellingFee) => void;
    onDeleteFee: (id: string) => void;
    onFeeFilterChange: (filter: FeeFilter) => void;
    onOwnerFilterChange: (ownerId: string) => void;
    onDateRangeChange: (range: { start: string; end: string }) => void;
    title?: string;
}

export function SellingFeesTab({
    fees,
    profiles,
    feeFilter,
    ownerFilter,
    dateRange,
    totalFeePrice,
    onAddFee,
    onEditFee,
    onDeleteFee,
    onFeeFilterChange,
    onOwnerFilterChange,
    onDateRangeChange,
    title = 'Selling Fees'
}: SellingFeesTabProps) {
    return (
        <div>
            <div className={cards.cardGridThreeCol} style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <Card className={cards.statCard}>
                    <div className={cards.statLabel}>Total Fees Amount</div>
                    <div className={cards.statValue}>{formatVND(totalFeePrice)}</div>
                </Card>
                <Card className={cards.statCardSuccess}>
                    <div className={cards.statLabel}>Total Transaction Count</div>
                    <div className={cards.statValue}>{fees.length}</div>
                </Card>
            </div>

            <div className={styles.feeFiltersContainer}>
                <div className={styles.feeFiltersHeader}>
                    <div className={styles.feeFiltersSection}>
                        <h3 className={styles.feeFiltersTitle}>{title}</h3>
                        <SellingFeeFilters
                            feeFilter={feeFilter}
                            ownerFilter={ownerFilter}
                            dateRange={dateRange}
                            profiles={profiles}
                            onFeeFilterChange={onFeeFilterChange}
                            onOwnerFilterChange={onOwnerFilterChange}
                            onDateRangeChange={onDateRangeChange}
                        />
                    </div>
                    <Button onClick={onAddFee} className={styles.buttonNoWrap}>
                        + Add New Selling Fee
                    </Button>
                </div>
            </div>
            <SellingFeesTable
                fees={fees}
                totalFeePrice={totalFeePrice}
                onEdit={onEditFee}
                onDelete={onDeleteFee}
            />
        </div>
    );
}
