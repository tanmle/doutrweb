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
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    value={formatCurrency(formData.base_salary)}
                    onChange={(e) => {
                        const numericValue = parseCurrency(e.target.value);
                        // Start: Manually creating a synthetic event-like object or calling a custom handler if needed.
                        // However, UserModal expects a ChangeEvent.
                        // We can just update formData directly via a wrapper or assume onChange handles basic inputs.
                        // But onChange in props expects React.ChangeEvent.
                        // Let's modify the onChange behavior just for this input.
                        // We need to pass { target: { name, value } } to the parent on change.
                        // The parent `handleInputChange` in `page.tsx` handles typical inputs but expects raw values.
                        // If we pass the numeric value back, it should work if it's stored as number or string number.

                        // Actually, better to just let the parent handle it? 
                        // Issue is the passed `value` to Input is now formatted string. 
                        // `onChange` needs to send the *numeric* value (or stringified number) back to state.

                        const syntheticEvent = {
                            target: {
                                name: 'base_salary',
                                value: numericValue
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
