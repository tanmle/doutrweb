'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { SellingFeeFilters } from './SellingFeeFilters';
import { SellingFeesTable } from './SellingFeesTable';
import type { SellingFee, FeeFilter, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';

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
