'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import type { FeeFilter, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';

interface FeeFiltersProps {
    feeFilter: FeeFilter;
    ownerFilter: string;
    dateRange: { start: string; end: string };
    profiles: Profile[];
    onFeeFilterChange: (filter: FeeFilter) => void;
    onOwnerFilterChange: (ownerId: string) => void;
    onDateRangeChange: (range: { start: string; end: string }) => void;
}

export function FeeFilters({
    feeFilter,
    ownerFilter,
    dateRange,
    profiles,
    onFeeFilterChange,
    onOwnerFilterChange,
    onDateRangeChange,
}: FeeFiltersProps) {
    return (
        <>
            <div className={styles.filterButtons}>
                <Button
                    variant={feeFilter === 'all' ? 'primary' : 'secondary'}
                    onClick={() => onFeeFilterChange('all')}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                >
                    All
                </Button>
                <Button
                    variant={feeFilter === 'today' ? 'primary' : 'secondary'}
                    onClick={() => onFeeFilterChange('today')}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                >
                    Today
                </Button>
                <Button
                    variant={feeFilter === 'this_month' ? 'primary' : 'secondary'}
                    onClick={() => onFeeFilterChange('this_month')}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                >
                    This Month
                </Button>
                <Button
                    variant={feeFilter === 'last_month' ? 'primary' : 'secondary'}
                    onClick={() => onFeeFilterChange('last_month')}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                >
                    Last Month
                </Button>
                <Button
                    variant={feeFilter === 'range' ? 'primary' : 'secondary'}
                    onClick={() => onFeeFilterChange('range')}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                >
                    Date Range
                </Button>
            </div>

            <div className={styles.filterControls}>
                <div className={styles.filterField}>
                    <label className={styles.filterLabel}>
                        Filter by Owner
                    </label>
                    <select
                        aria-label="Filter by owner"
                        value={ownerFilter}
                        onChange={(e) => onOwnerFilterChange(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">All Owners</option>
                        {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                        ))}
                    </select>
                </div>

                {feeFilter === 'range' && (
                    <>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>
                                Start Date
                            </label>
                            <input
                                aria-label="Start date"
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                                onClick={(e) => e.currentTarget.showPicker()}
                                className={styles.filterDateInput}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <label className={styles.filterLabel}>
                                End Date
                            </label>
                            <input
                                aria-label="End date"
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                                onClick={(e) => e.currentTarget.showPicker()}
                                className={styles.filterDateInput}
                            />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
