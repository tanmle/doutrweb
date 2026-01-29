'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import { createUser, deleteUser, resetUserPassword } from '../actions';
import {
    UsersTab,
    UserModal,
    AdminTableStyles,
} from '../components';
import type { User, FormData } from '../utils/types';
import { useRealtime } from '@/hooks/useRealtime';
import styles from '../components/AdminComponents.module.css';

import { SendNotificationModal } from '@/components/admin/SendNotificationModal';

export default function AdminUsersPage() {
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [isSendNotificationOpen, setIsSendNotificationOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const supabase = createClient();
    const toast = useToast();
    const { canEditUser, isLoading: authLoading, currentUser, currentUserRole } = useAuth();

    const {
        loading: dataLoading,
        users,
        profiles,
    } = useUsers(refresh);

    const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const isLocalChange = React.useRef(false);

    // Real-time updates for user profiles, debounced
    useRealtime({
        table: 'profiles',
        onData: () => {
            if (isLocalChange.current) return;

            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            refreshTimeoutRef.current = setTimeout(() => {
                setRefresh(prev => prev + 1);
            }, 300);
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (['base_salary', 'price'].includes(name)) {
            const numericValue = value.replace(/\D/g, '');
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        isLocalChange.current = true; // Suppress realtime for own action
        const res = await createUser({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role || 'member',
            leader_id: (formData.role === 'member' || !formData.role) ? formData.leader_id : null,
            bank_name: formData.bank_name,
            bank_number: formData.bank_number,
            base_salary: parseFloat(formData.base_salary) || 0
        });

        if (res.error) {
            toast.error('Error: ' + res.error);
            isLocalChange.current = false;
        } else {
            toast.success('User created successfully');
            setIsUserModalOpen(false);
            setFormData({});
            setRefresh(prev => prev + 1);
            // Re-enable realtime after echoes settle
            setTimeout(() => { isLocalChange.current = false; }, 2000);
        }
        setLoading(false);
    };

    const handleUpdateUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setLoading(true);
        isLocalChange.current = true;
        // Updated logic: if removing leader_id (role change), ensure it's null
        const { error } = await supabase.from('profiles').update({
            full_name: formData.full_name,
            role: formData.role,
            leader_id: formData.role === 'member' ? (formData.leader_id || null) : null,
            bank_name: formData.bank_name || null,
            bank_number: formData.bank_number || null,
            base_salary: parseFloat(formData.base_salary) || 0
        }).eq('id', selectedUser.id);

        if (error) {
            toast.error(error.message);
            isLocalChange.current = false;
        } else {
            setIsEditUserModalOpen(false);
            setFormData({});
            setSelectedUser(null);
            setRefresh(prev => prev + 1);
            setTimeout(() => { isLocalChange.current = false; }, 2000);
        }
        setLoading(false);
    };

    const openEditUserModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            full_name: user.full_name || '',
            role: user.role,
            leader_id: user.leader_id || '',
            bank_name: user.bank_name || '',
            bank_number: user.bank_number || '',
            base_salary: user.base_salary || ''
        });
        setIsEditUserModalOpen(true);
    };

    const handleDeleteUser = async (id: string, email: string) => {
        if (!confirm(`Are you sure you want to delete user ${email}? This cannot be undone.`)) return;
        setLoading(true);
        isLocalChange.current = true;

        const result = await deleteUser(id);
        if (result.error) {
            toast.error(result.error);
            isLocalChange.current = false;
        } else {
            toast.success('User deleted successfully');
            setRefresh(prev => prev + 1);
            // Re-enable realtime listening after a delay to ignore the echo of our own delete
            setTimeout(() => { isLocalChange.current = false; }, 2000);
        }
        setLoading(false);
    };

    const handleResetPassword = async (id: string, email: string) => {
        const newPassword = prompt(`Enter new password for ${email}:`);
        if (!newPassword) return;
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const result = await resetUserPassword(id, newPassword);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Password reset successfully');
        }
        setLoading(false);
    };

    if (authLoading || dataLoading) {
        return <LoadingIndicator label="Loading users..." />;
    }

    return (
        <>
            <UsersTab
                users={users}
                profiles={profiles}
                canEditUser={canEditUser}
                onAddUser={() => setIsUserModalOpen(true)}
                onEditUser={openEditUserModal}
                onResetPassword={handleResetPassword}
                onDeleteUser={handleDeleteUser}
                onSendNotification={() => setIsSendNotificationOpen(true)}
            />

            <UserModal
                isOpen={isUserModalOpen}
                formData={formData}
                profiles={profiles}
                loading={loading}
                onClose={() => setIsUserModalOpen(false)}
                onSubmit={handleUserSubmit}
                onChange={handleInputChange}
            />

            <UserModal
                isOpen={isEditUserModalOpen}
                isEdit
                formData={formData}
                profiles={profiles}
                loading={loading}
                selectedUser={selectedUser}
                onClose={() => setIsEditUserModalOpen(false)}
                onSubmit={handleUpdateUserSubmit}
                onChange={handleInputChange}
            />

            <SendNotificationModal
                isOpen={isSendNotificationOpen}
                onClose={() => setIsSendNotificationOpen(false)}
                senderId={currentUser?.id || ''}
                senderRole={currentUserRole}
                users={users}
            />

            <AdminTableStyles />
        </>
    );
}
