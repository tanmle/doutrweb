import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { User, PayrollRecord } from '../utils/types';
import { tables, forms } from '@/styles/modules';

interface GeneratePayrollModalProps {
    isOpen: boolean;
    users: User[];
    existingRecords: PayrollRecord[];
    month: string;
    loading: boolean;
    onClose: () => void;
    onSubmit: (standardDays: number, userDays: Record<string, number>) => void;
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

    // Initialize mapping when modal opens
    useEffect(() => {
        if (isOpen) {
            const initialDays: Record<string, number> = {};
            users.forEach(user => {
                // If a record already exists, use its actual days. Otherwise default to standardDays (or 0? User asked to enter actual work day).
                // Usually default is 0 or standard. Let's default to standardDays assuming full attendance, or 0? 
                // User said "enter actual work day... don't edit one by one". 
                // Suggests they want to input. Defaulting to standard days is a good UX (most people work full month).
                const existing = existingRecords.find(r => r.user_id === user.id);
                initialDays[user.id] = existing ? (existing.actual_work_days || 0) : standardDays;
            });
            setUserDays(initialDays);
        }
    }, [isOpen, users, existingRecords, standardDays]); // Re-run if standardDays changes? Maybe not, don't overwrite user edits.

    // Update defaults if standardDays changes AND user hasn't edited? 
    // It's complex. Let's just init once on open.
    // Actually, let's keep it simple: Init on open.

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(standardDays, userDays);
    };

    const handleUserDayChange = (userId: string, value: string) => {
        setUserDays(prev => ({
            ...prev,
            [userId]: Number(value)
        }));
    };

    const handleSetAll = () => {
        const updatedDays: Record<string, number> = {};
        users.forEach(user => {
            updatedDays[user.id] = standardDays;
        });
        setUserDays(updatedDays);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Generate Payroll: ${month}`}
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Global Settings */}
                <div style={{
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    gap: '1rem'
                }}>
                    <div style={{ flex: '1 1 200px', maxWidth: '220px' }}>
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
                        style={{ marginBottom: '1rem', whiteSpace: 'nowrap' }}
                    >
                        Set All
                    </Button>
                </div>

                {/* User List */}
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <table className={tables.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th style={{ width: '120px' }}>Actual Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td data-label="User" style={{ padding: '0.75rem 0' }}>
                                        <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                                    </td>
                                    <td data-label="Actual Days">
                                        <input
                                            type="number"
                                            className={forms.formInput}
                                            style={{ width: '80px', padding: '0.25rem 0.5rem' }}
                                            value={userDays[user.id] ?? 0}
                                            onChange={(e) => handleUserDayChange(user.id, e.target.value)}
                                            min="0"
                                            step="0.5"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
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
