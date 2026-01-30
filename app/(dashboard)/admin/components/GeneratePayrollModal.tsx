import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { User, PayrollRecord, SalaryPeriod } from '../utils/types';
import { SalaryPeriodsEditor } from './SalaryPeriodsEditor';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { tables, forms } from '@/styles/modules';
import styles from './AdminComponents.module.css';

interface GeneratePayrollModalProps {
    isOpen: boolean;
    users: User[];
    existingRecords: PayrollRecord[];
    month: string;
    loading: boolean;
    onClose: () => void;
    onSubmit: (standardDays: number, userDays: Record<string, number>, userPeriods: Record<string, SalaryPeriod[]>) => void;
}

export function GeneratePayrollModal({
    isOpen,
    users,
    existingRecords,
    month,
    loading,
    onClose,
    onSubmit
}: GeneratePayrollModalProps) {
    const [standardDays, setStandardDays] = useState(26);
    const [userDays, setUserDays] = useState<Record<string, number>>({});
    const [userPeriods, setUserPeriods] = useState<Record<string, SalaryPeriod[]>>({});
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    // Initialize mapping when modal opens
    useEffect(() => {
        if (isOpen) {
            const initialDays: Record<string, number> = {};
            const initialPeriods: Record<string, SalaryPeriod[]> = {};

            users.forEach(user => {
                const existing = existingRecords.find(r => r.user_id === user.id);
                initialDays[user.id] = existing ? (existing.actual_work_days || 0) : standardDays;
                initialPeriods[user.id] = existing?.salary_periods || [];
            });

            setUserDays(initialDays);
            setUserPeriods(initialPeriods);
        }
    }, [isOpen, users, existingRecords, standardDays]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(standardDays, userDays, userPeriods);
    };

    const handleUserDayChange = (userId: string, value: string) => {
        setUserDays(prev => ({
            ...prev,
            [userId]: Number(value)
        }));
    };

    const handleUserPeriodsChange = (userId: string, periods: SalaryPeriod[]) => {
        setUserPeriods(prev => ({
            ...prev,
            [userId]: periods
        }));

        // Auto-update total days based on periods
        const totalDays = periods.reduce((sum, p) => sum + p.days, 0);
        setUserDays(prev => ({
            ...prev,
            [userId]: totalDays
        }));
    };

    const handleSetAll = () => {
        const updatedDays: Record<string, number> = {};
        users.forEach(user => {
            updatedDays[user.id] = standardDays;
        });
        setUserDays(updatedDays);
    };

    const toggleExpanded = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Generate Payroll: ${month}`}
        >
            <form onSubmit={handleSubmit} className={styles.modalFormLarge}>

                {/* Global Settings */}
                <div className={styles.generatePayrollHeader}>
                    <div className={styles.generatePayrollField}>
                        <Input
                            label="Standard Work Days for Month"
                            type="number"
                            min="1"
                            value={standardDays}
                            onChange={e => setStandardDays(Number(e.target.value))}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSetAll}
                        className={styles.generatePayrollButton}
                    >
                        Set All
                    </Button>
                </div>

                {/* User List */}
                <div className={styles.generatePayrollTable}>
                    <table className={tables.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th className={styles.tableHeaderNarrow}>Actual Days</th>
                                <th className={styles.tableHeaderNarrow}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <React.Fragment key={user.id}>
                                    <tr>
                                        <td data-label="User" className={styles.generatePayrollUserCell}>
                                            <div className={styles.generatePayrollUserName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {user.full_name}
                                                {user.role && <RoleBadge role={user.role} />}
                                            </div>
                                        </td>
                                        <td data-label="Actual Days">
                                            <input
                                                type="number"
                                                className={`${forms.formInput} ${styles.generatePayrollInput}`}
                                                value={userDays[user.id] ?? 0}
                                                onChange={(e) => handleUserDayChange(user.id, e.target.value)}
                                                min="0"
                                                step="0.5"
                                            />
                                        </td>
                                        <td data-label="Actions">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => toggleExpanded(user.id)}
                                                className={styles.buttonExtraSmall}
                                            >
                                                {expandedUser === user.id ? '▼ Hide' : '▶ Customize'}
                                            </Button>
                                        </td>
                                    </tr>
                                    {expandedUser === user.id && (
                                        <tr>
                                            <td colSpan={3}>
                                                <SalaryPeriodsEditor
                                                    periods={userPeriods[user.id] || []}
                                                    standardDays={standardDays}
                                                    baseSalary={user.base_salary || 0}
                                                    onChange={(periods) => handleUserPeriodsChange(user.id, periods)}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.modalButtonGroupEnd}>
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Generating...' : 'Confirm & Generate'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
