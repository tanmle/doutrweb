'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { FeeFilters } from './FeeFilters';
import { FeesTable } from './FeesTable';
import type { Fee, FeeFilter, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';

interface FeesTabProps {
    fees: Fee[];
    profiles: Profile[];
    feeFilter: FeeFilter;
    ownerFilter: string;
    dateRange: { start: string; end: string };
    totalFeePrice: number;
    onAddFee: () => void;
    onEditFee: (fee: Fee) => void;
    onDeleteFee: (id: string) => void;
    onFeeFilterChange: (filter: FeeFilter) => void;
    onOwnerFilterChange: (ownerId: string) => void;
    onDateRangeChange: (range: { start: string; end: string }) => void;
}

export function FeesTab({
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
    onDateRangeChange
}: FeesTabProps) {
    return (
        <div>
            <div className={styles.feeFiltersContainer}>
                <div className={styles.feeFiltersHeader}>
                    <div className={styles.feeFiltersSection}>
                        <h3 className={styles.feeFiltersTitle}>Selling Fees</h3>
                        <FeeFilters
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
                        + Add New Fee
                    </Button>
                </div>
            </div>
            <FeesTable
                fees={fees}
                totalFeePrice={totalFeePrice}
                onEdit={onEditFee}
                onDelete={onDeleteFee}
            />
        </div>
    );
}
