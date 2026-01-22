import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { PayrollRecord, User } from '../utils/types';
import { forms, cards, tables, filters, layouts } from '@/styles/modules';
import { formatCurrency } from '@/utils/currency';

interface PayrollTabProps {
    payrollRecords: PayrollRecord[];
    users: User[];
    loading: boolean;
    month: string;
    onMonthChange: (month: string) => void;
    onGenerate: () => void;
    onEdit: (record: PayrollRecord) => void;
}

export function PayrollTab({
    payrollRecords,
    users,
    loading,
    month,
    onMonthChange,
    onGenerate,
    onEdit
}: PayrollTabProps) {
    if (loading) {
        return <LoadingIndicator label="Loading payroll data..." />;
    }

    const totalSalary = payrollRecords.reduce((sum, r) => sum + (r.total_salary || 0), 0);
    const totalPaid = payrollRecords
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.total_salary || 0), 0);
    const pendingCount = payrollRecords.filter(r => r.status === 'pending').length;

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'paid': return tables.tableBadgeSuccess;
            case 'pending': return tables.tableBadgeWarning;
            default: return tables.tableBadgeDefault;
        }
    };

    return (
        <div className={layouts.flexColumn}>
            {/* Summary Cards */}
            <div className={cards.cardGridThreeCol}>
                <Card className={cards.statCard}>
                    <div className={cards.statLabel}>Total Payroll</div>
                    <div className={cards.statValue}>{formatCurrency(totalSalary)}</div>
                </Card>
                <Card className={cards.statCardSuccess}>
                    <div className={cards.statLabel}>Total Paid</div>
                    <div className={cards.statValue}>{formatCurrency(totalPaid)}</div>
                </Card>
                <Card className={cards.statCardWarning}>
                    <div className={cards.statLabel}>Pending Users</div>
                    <div className={cards.statValue}>{pendingCount}</div>
                </Card>
            </div>

            <Card>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', justifyContent: 'center', padding: '0.5rem' }}>
                    <div className={filters.filterGroup} style={{ flex: '1 1 200px', maxWidth: '300px' }}>
                        <label className={filters.filterLabel}>Select Month</label>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => onMonthChange(e.target.value)}
                            className={filters.filterInput}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ flex: '0 1 auto' }}>
                        <Button onClick={onGenerate} variant="primary" style={{ whiteSpace: 'nowrap' }}>
                            Generate Payroll for {month}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card>
                <div className={tables.tableWrapper}>
                    <table className={tables.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Base Salary</th>
                                <th>Work Days (Std/Act)</th>
                                <th>Bonus</th>
                                <th>Total Salary</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={layouts.textCenter} style={{ padding: '3rem' }}>
                                        <div className={layouts.flexColumn} style={{ alignItems: 'center', gap: '1rem' }}>
                                            <span className={layouts.textMuted}>No records found for {month}</span>
                                            <Button variant="secondary" onClick={onGenerate}>
                                                Generate Now
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                payrollRecords.map(record => (
                                    <tr key={record.id}>
                                        <td data-label="User">
                                            <div className={tables.userCell}>
                                                <span className={tables.userName}>{record.user?.full_name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td data-label="Role">
                                            <span style={{ textTransform: 'capitalize' }}>{record.user?.role || 'N/A'}</span>
                                        </td>
                                        <td data-label="Base Salary">
                                            {formatCurrency(record.user?.base_salary || 0)}
                                        </td>
                                        <td data-label="Work Days">
                                            {record.standard_work_days} / <strong>{record.actual_work_days}</strong>
                                        </td>
                                        <td data-label="Bonus">
                                            {formatCurrency(record.bonus || 0)}
                                        </td>
                                        <td data-label="Total Salary">
                                            <strong>{formatCurrency(record.total_salary || 0)}</strong>
                                        </td>
                                        <td data-label="Status">
                                            <span className={`${tables.tableBadge} ${getStatusClass(record.status)}`}>
                                                {record.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td data-label="Actions">
                                            <div className={tables.tableActionsSmall}>
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => onEdit(record)}
                                                    fullWidth
                                                >
                                                    Edit / Pay
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
