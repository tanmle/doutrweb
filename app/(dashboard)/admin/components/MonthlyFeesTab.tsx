'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonthlyFeeFilters } from './MonthlyFeeFilters';
import { MonthlyFeesTable } from './MonthlyFeesTable';
import type { MonthlyFee, FeeFilter, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';
import { cards } from '@/styles/modules';
import { formatVND } from '../utils/formatters';

interface MonthlyFeesTabProps {
    fees: MonthlyFee[];
    profiles: Profile[];
    feeFilter: FeeFilter;
    ownerFilter: string;
    dateRange: { start: string; end: string };
    totalFeePrice: number;
    onAddFee: () => void;
    onEditFee: (fee: MonthlyFee) => void;
    onDeleteFee: (id: string) => void;
    onFeeFilterChange: (filter: FeeFilter) => void;
    onOwnerFilterChange: (ownerId: string) => void;
    onDateRangeChange: (range: { start: string; end: string }) => void;
    title?: string;
}

export function MonthlyFeesTab({
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
    title = 'Monthly Fees'
}: MonthlyFeesTabProps) {
    const averageFee = fees.length > 0 ? totalFeePrice / fees.length : 0;

    return (
        <div>
            <div className={cards.cardGridThreeCol} style={{ marginBottom: '1.5rem' }}>
                <Card className={cards.statCard}>
                    <div className={cards.statLabel}>Total Fees Amount</div>
                    <div className={cards.statValue}>{formatVND(totalFeePrice)}</div>
                </Card>
                <Card className={cards.statCardSuccess}>
                    <div className={cards.statLabel}>Total Transaction Count</div>
                    <div className={cards.statValue}>{fees.length}</div>
                </Card>
                <Card className={cards.statCardWarning}>
                    <div className={cards.statLabel}>Average Fee</div>
                    <div className={cards.statValue}>{formatVND(averageFee)}</div>
                </Card>
            </div>

            <div className={styles.feeFiltersContainer}>
                <div className={styles.feeFiltersHeader}>
                    <div className={styles.feeFiltersSection}>
                        <h3 className={styles.feeFiltersTitle}>{title}</h3>
                        <MonthlyFeeFilters
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
                        + Add New Monthly Fee
                    </Button>
                </div>
            </div>
            <MonthlyFeesTable
                fees={fees}
                totalFeePrice={totalFeePrice}
                onEdit={onEditFee}
                onDelete={onDeleteFee}
            />
        </div>
    );
}
