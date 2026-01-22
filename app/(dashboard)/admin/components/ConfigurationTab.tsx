'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import type { CommissionRate } from '../utils/types';
import styles from './AdminComponents.module.css';

interface ConfigurationTabProps {
    commissionRates: CommissionRate[];
    loading: boolean;
    onCommissionChange: (id: string, field: string, value: string) => void;
    onSave: () => void;
}

export function ConfigurationTab({
    commissionRates,
    loading,
    onCommissionChange,
    onSave
}: ConfigurationTabProps) {
    const companyRates = commissionRates.filter(r => r.type === 'company');
    const selfResearchedRates = commissionRates.filter(r => r.type === 'self_researched');

    return (
        <div className={styles.configContainer}>
            <div className={styles.configHeader}>
                <h3 className={styles.configTitle}>Commission Configuration</h3>
                <Button onClick={onSave} disabled={loading}>
                    {loading ? 'Saving…' : 'Save Configuration'}
                </Button>
            </div>

            <div className={styles.configGrid}>
                {/* Company Products Table */}
                <div>
                    <h4 className={`${styles.configSectionTitle} ${styles.configSectionTitleCompany}`}>
                        COMPANY PRODUCTS
                    </h4>
                    <CommissionTable rates={companyRates} onChange={onCommissionChange} />
                </div>

                {/* Self-Researched Products Table */}
                <div>
                    <h4 className={`${styles.configSectionTitle} ${styles.configSectionTitleSelf}`}>
                        SELF-RESEARCHED PRODUCT
                    </h4>
                    <CommissionTable rates={selfResearchedRates} onChange={onCommissionChange} />
                </div>
            </div>
        </div>
    );
}

interface CommissionTableProps {
    rates: CommissionRate[];
    onChange: (id: string, field: string, value: string) => void;
}

function CommissionTable({ rates, onChange }: CommissionTableProps) {
    return (
        <div className={styles.configTableContainer}>
            <table className={styles.configTable}>
                <thead>
                    <tr>
                        <th>Level</th>
                        <th>Profit per month ($)</th>
                        <th>% Commission</th>
                    </tr>
                </thead>
                <tbody>
                    {rates.map(r => (
                        <tr key={r.id}>
                            <td className={styles.configLevelCell}>Level {r.level}</td>
                            <td className={styles.configInputCell}>
                                <input
                                    type="number"
                                    value={r.profit_threshold}
                                    onChange={(e) => onChange(r.id, 'profit_threshold', e.target.value)}
                                    className={styles.configInput}
                                />
                            </td>
                            <td className={styles.configInputCell}>
                                <div className={styles.configPercentContainer}>
                                    <input
                                        type="number"
                                        value={r.commission_percent}
                                        onChange={(e) => onChange(r.id, 'commission_percent', e.target.value)}
                                        className={styles.configPercentInput}
                                    />
                                    <span>%</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
