'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { UsersTable } from './UsersTable';
import type { User, Profile } from '../utils/types';
import styles from './AdminComponents.module.css';

interface UsersTabProps {
    users: User[];
    profiles: Profile[];
    canEditUser: (role: string) => boolean;
    onAddUser: () => void;
    onEditUser: (user: User) => void;
    onResetPassword: (id: string, email: string) => void;
    onDeleteUser: (id: string, email: string) => void;
}

export function UsersTab({
    users,
    profiles,
    canEditUser,
    onAddUser,
    onEditUser,
    onResetPassword,
    onDeleteUser
}: UsersTabProps) {
    return (
        <div>
            <div className={styles.tabHeader}>
                <h3 className={styles.tabTitle}>User List</h3>
                <Button onClick={onAddUser}>+ Add New User</Button>
            </div>
            <UsersTable
                users={users}
                profiles={profiles}
                canEditUser={canEditUser}
                onEdit={onEditUser}
                onResetPassword={onResetPassword}
                onDelete={onDeleteUser}
            />
        </div>
    );
}
