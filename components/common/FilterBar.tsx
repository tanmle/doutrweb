import React from 'react';
import styles from './FilterBar.module.css';
import { Button } from '../ui/Button';

export interface FilterConfig {
    key: string;
    label: string;
    type: 'select' | 'date' | 'text';
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    hidden?: boolean;
}

export interface FilterBarProps {
    filters: FilterConfig[];
    values: Record<string, any>;
    onChange: (key: string, value: any) => void;
    onReset?: () => void;
    className?: string;
}

export function FilterBar({
    filters,
    values,
    onChange,
    onReset,
    className = ''
}: FilterBarProps) {
    return (
        <div className={`${styles.filterBar} ${className}`}>
            <div className={styles.filterControls}>
                {filters.filter(f => !f.hidden).map((filter) => (
                    <div key={filter.key} className={styles.filterField}>
                        <label className={styles.filterLabel}>{filter.label}</label>

                        {filter.type === 'select' && (
                            <select
                                aria-label={`Filter by ${filter.label}`}
                                value={values[filter.key] || ''}
                                onChange={(e) => onChange(filter.key, e.target.value)}
                                className={styles.filterSelect}
                            >
                                {filter.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        {filter.type === 'date' && (
                            <input
                                aria-label={`Filter by ${filter.label}`}
                                type="date"
                                value={values[filter.key] || ''}
                                onChange={(e) => onChange(filter.key, e.target.value)}
                                onClick={(e) => e.currentTarget.showPicker()}
                                className={styles.filterInput}
                            />
                        )}

                        {filter.type === 'text' && (
                            <input
                                aria-label={`Filter by ${filter.label}`}
                                type="text"
                                value={values[filter.key] || ''}
                                onChange={(e) => onChange(filter.key, e.target.value)}
                                placeholder={filter.placeholder}
                                className={styles.filterInput}
                            />
                        )}
                    </div>
                ))}
            </div>

            {onReset && (
                <Button variant="ghost" onClick={onReset} className={styles.resetButton}>
                    Reset Filters
                </Button>
            )}
        </div>
    );
}
