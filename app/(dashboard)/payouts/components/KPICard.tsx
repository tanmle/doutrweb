import React from 'react';
import { Card } from '@/components/ui/Card';
import styles from './KPICard.module.css';
import { formatCurrency } from '@/utils/currency';

export interface KPICardProps {
    currentKPI: number;
    targetKPI: number;
    monthlyProfit: number;
    currentLevel: number;
}

export function KPICard({
    currentKPI,
    targetKPI,
    monthlyProfit,
    currentLevel
}: KPICardProps) {
    const progress = Math.min((currentKPI / targetKPI) * 100, 100);
    const remaining = targetKPI - currentKPI;

    return (
        <Card className={styles.kpiCard}>
            <div className={styles.header}>
                <span className={styles.label}>Monthly KPI Progress</span>
                {currentLevel > 0 && (
                    <span className={styles.levelBadge}>
                        Level {currentLevel} Achieved! 🎉
                    </span>
                )}
            </div>

            <div className={styles.progressInfo}>
                <span className={styles.progressValue}>{progress.toFixed(1)}%</span>
                <span className={styles.targetText}>
                    Next target: {formatCurrency(targetKPI)}
                </span>
            </div>

            <div className={styles.progressBarContainer}>
                <div
                    className={styles.progressBarFill}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className={styles.footer}>
                <span>MTD Settlement: {formatCurrency(monthlyProfit)}</span>
                <span>
                    {progress >= 100 ? (
                        <span className={styles.congratulation}>Target Met!</span>
                    ) : (
                        `${formatCurrency(remaining)} to Next Level`
                    )}
                </span>
            </div>
        </Card>
    );
}
