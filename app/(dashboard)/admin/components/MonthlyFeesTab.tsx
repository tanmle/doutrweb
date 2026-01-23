'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { MonthlyFeeFilters } from './MonthlyFeeFilters';
import { MonthlyFeesTable } from './MonthlyFeesTable';
import type { MonthlyFee, FeeFilter, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';

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
    return (
        <div>
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
