'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
