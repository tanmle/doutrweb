'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import type { CommissionRate } from '../utils/types';
import styles from './AdminComponents.module.css';

interface ConfigurationTabProps {
    commissionRates: CommissionRate[];
    baseKpi: number;
    loading: boolean;
    onCommissionChange: (id: string, field: string, value: string) => void;
    onBaseKpiChange: (value: number) => void;
    onSave: () => void;
}

export function ConfigurationTab({
    commissionRates,
    baseKpi,
    loading,
    onCommissionChange,
    onBaseKpiChange,
    onSave
}: ConfigurationTabProps) {
    const companyRates = commissionRates.filter(r => r.type === 'company');
    const selfResearchedRates = commissionRates.filter(r => r.type === 'self_researched');

    return (
        <div className={styles.configContainer}>
            <div className={styles.configHeader}>
                <h3 className={styles.configTitle}>Configuration</h3>
                <Button onClick={onSave} disabled={loading}>
                    {loading ? 'Saving…' : 'Save Configuration'}
                </Button>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', width: 'fit-content', minWidth: '300px', paddingRight: '3rem' }}>
                <h4 className={styles.configSectionTitle} style={{ marginBottom: '1rem' }}>General Settings</h4>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--foreground)' }}>Base KPI:</label>
                    <input
                        type="number"
                        value={baseKpi}
                        onChange={(e) => onBaseKpiChange(parseFloat(e.target.value) || 0)}
                        className={styles.configInput}
                        style={{ width: '120px' }}
                    />
                </div>
            </div>

            <h3 className={styles.configTitle} style={{ marginTop: '2rem', marginBottom: '1rem' }}>Commission Rates</h3>

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
