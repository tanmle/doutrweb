'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import type { User, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';

interface UsersTableProps {
    users: User[];
    profiles: Profile[];
    canEditUser: (role: string) => boolean;
    onEdit: (user: User) => void;
    onResetPassword: (id: string, email: string) => void;
    onDelete: (id: string, email: string) => void;
}

export function UsersTable({
    users,
    profiles,
    canEditUser,
    onEdit,
    onResetPassword,
    onDelete
}: UsersTableProps) {
    return (
        <div className={styles.tableContainer}>
            <table className={styles.adminTable}>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Full Name</th>
                        <th>Role</th>
                        <th>Leader</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td data-label="Email">{u.email}</td>
                            <td data-label="Full Name">{u.full_name || 'N/A'}</td>
                            <td data-label="Role">
                                <div className={styles.roleBadgeContainer}>
                                    <span className={`${styles.roleBadge} ${u.role === 'admin' ? styles.roleBadgeAdmin :
                                        u.role === 'leader' ? styles.roleBadgeLeader :
                                            styles.roleBadgeMember
                                        }`}>
                                        {u.role}
                                    </span>
                                    {u.role === 'leader' && (
                                        <span className={styles.leaderCount}>
                                            {users.filter(user => user.leader_id === u.id).length}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td data-label="Leader" className={styles.mutedText}>
                                {profiles.find(p => p.id === u.leader_id)?.full_name || '-'}
                            </td>
                            <td data-label="Actions">
                                {canEditUser(u.role) && (
                                    <div className={styles.tableActionsSmall}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => onEdit(u)}
                                            className={styles.buttonExtraSmall}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => onResetPassword(u.id, u.email)}
                                            className={`${styles.buttonExtraSmall} ${styles.buttonWarningColor}`}
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => onDelete(u.id, u.email)}
                                            className={`${styles.buttonExtraSmall} ${styles.buttonDeleteColor}`}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
