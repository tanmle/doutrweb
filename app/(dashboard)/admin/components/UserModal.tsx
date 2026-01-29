'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency, parseCurrency } from '@/utils/currency';
import type { FormData, Profile, User } from '../utils/types';
import styles from './AdminComponents.module.css';

interface UserModalProps {
    isOpen: boolean;
    isEdit?: boolean;
    formData: FormData;
    profiles: Profile[];
    loading: boolean;
    selectedUser?: User | null;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function UserModal({
    isOpen,
    isEdit = false,
    formData,
    profiles,
    loading,
    selectedUser,
    onClose,
    onSubmit,
    onChange
}: UserModalProps) {
    const leaders = profiles.filter(p => p.role === 'leader');
    const showLeaderSelect = formData.role === 'member' || (!formData.role && !isEdit);
    const [banks, setBanks] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (isOpen) {
            fetch('https://api.vietqr.io/v2/banks')
                .then(res => res.json())
                .then(data => {
                    if (data.code === '00') {
                        setBanks(data.data);
                    }
                })
                .catch(err => console.error('Error fetching banks:', err));
        }
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit User' : 'Create New User'}
        >
            <form onSubmit={onSubmit} className={styles.modalFormCompact}>
                {isEdit && selectedUser && (
                    <div className={styles.userEditInfo}>
                        <p className={styles.userEditInfoText}>
                            Editing: <strong>{selectedUser.email}</strong>
                        </p>
                    </div>
                )}

                {!isEdit && (
                    <>
                        <Input
                            label="Email Address"
                            type="email"
                            name="email"
                            onChange={onChange}
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            name="password"
                            onChange={onChange}
                            required
                        />
                    </>
                )}


                <Input
                    label="Full Name"
                    name="full_name"
                    value={formData.full_name || ''}
                    onChange={onChange}
                    required
                />

                <Input
                    label="Base Salary (VND)"
                    name="base_salary"
                    value={formData.base_salary ? formatCurrency(formData.base_salary) : ''}
                    onChange={(e) => {
                        // User types into a formatted string (e.g. "1,000 ₫" -> "1,0005 ₫")
                        // We extract just the digits to get the raw number
                        const rawValue = e.target.value.replace(/\D/g, '');

                        // We send the RAW DIGIT STRING back to the parent.
                        // The parent (page.tsx) expects a string and cleans it again, which is fine.
                        const syntheticEvent = {
                            target: {
                                name: 'base_salary',
                                value: rawValue
                            }
                        } as any;
                        onChange(syntheticEvent);
                    }}
                />

                <div>
                    <label className={styles.formLabel}>
                        Role
                    </label>
                    <select
                        name="role"
                        value={formData.role || 'member'}
                        onChange={onChange}
                        className={styles.formSelect}
                    >
                        <option value="member">Member</option>
                        <option value="leader">Leader</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                {showLeaderSelect && (
                    <div>
                        <label className={styles.formLabel}>
                            Assign Leader
                        </label>
                        <select
                            name="leader_id"
                            value={formData.leader_id || ''}
                            onChange={onChange}
                            className={styles.formSelect}
                        >
                            <option value="">No Leader</option>
                            {leaders.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className={styles.formLabel}>
                        Bank Name
                    </label>
                    <select
                        name="bank_name"
                        value={formData.bank_name || ''}
                        onChange={onChange}
                        className={styles.formSelect}
                    >
                        <option value="">Select Bank</option>
                        {banks.map((bank: any) => (
                            <option key={bank.id} value={`${bank.shortName} - ${bank.name}`}>
                                {bank.shortName} - {bank.name}
                            </option>
                        ))}
                    </select>
                </div>

                <Input
                    label="Bank Number"
                    name="bank_number"
                    value={formData.bank_number || ''}
                    onChange={onChange}
                />

                {isEdit && (
                    <p className={styles.passwordNote}>
                        Note: Passwords cannot be changed here for security reasons.
                    </p>
                )}

                <Button type="submit" disabled={loading}>
                    {loading
                        ? (isEdit ? 'Updating…' : 'Creating User…')
                        : (isEdit ? 'Update User' : 'Create User')
                    }
                </Button>
            </form>
        </Modal>
    );
}
